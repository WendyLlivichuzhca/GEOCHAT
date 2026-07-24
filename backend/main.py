import html
import csv
import io
import json
import os
import re
import secrets
import socket
import string
import subprocess
import sys
import time
import uuid
from datetime import datetime, timedelta
from queue import Empty, Full, Queue
from urllib.parse import quote

try:
    from dotenv import load_dotenv
except ImportError:
    load_dotenv = None

from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
import bcrypt
import mysql.connector
from flask import Flask, Response, jsonify, redirect, request, stream_with_context, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename
from werkzeug.middleware.proxy_fix import ProxyFix


from flask_cors import CORS
from werkzeug.security import check_password_hash
import logging
import requests

# Configurar logging para ver errores en consola
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if load_dotenv:
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
MEDIA_FOLDER = os.path.join(BASE_DIR, 'media')

# Configuración de Flask para el diseño (static) y fotos (media)
app = Flask(__name__, static_folder='static', static_url_path='')
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
app.config['MEDIA_FOLDER'] = MEDIA_FOLDER

app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "geochat-secret-key-12345")
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(days=30)

jwt = JWTManager(app)

CORS(app, resources={r"/*": {"origins": "*"}}, 
     supports_credentials=True, 
     allow_headers=["Authorization", "Content-Type"],
     expose_headers=["Authorization"])
whatsapp_event_subscribers = []

# =====================================================================
# SERVICIO DE ARCHIVOS ESTÁTICOS (IMÁGENES/MULTIMEDIA)
# =====================================================================
app.config['UPLOAD_FOLDER'] = MEDIA_FOLDER
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
ALLOWED_IMAGE_EXTENSIONS = {"png", "jpg", "jpeg", "webp", "gif"}
ALLOWED_MEDIA_EXTENSIONS = {
    "png", "jpg", "jpeg", "webp", "gif", 
    "mp4", "avi", "mov", "mpeg", 
    "mp3", "ogg", "wav", "m4a", 
    "pdf", "docx", "xlsx", "pptx", "txt", "zip", "rar"
}

def allowed_file(filename, allowed_set):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in allowed_set

# 1. RUTA PARA EL FRONTEND (Esta es la que hace que tu amigo vea la página)
@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')

# 2. RUTA PARA LAS FOTOS
@app.route('/media/<path:filename>')
def serve_media(filename):
    local_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if not os.path.exists(local_path):
        public_url = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
        if public_url:
            clean_filename = filename.replace("\\", "/")
            return redirect(f"{public_url}/{clean_filename}", code=302)
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# 3. EVITAR ERRORES 404 AL RECARGAR LA PÁGINA
@app.errorhandler(404)
def page_not_found(e):
    if not request.path.startswith('/api/') and not request.path.startswith('/media/'):
        return app.send_static_file('index.html')
    return jsonify({"error": "Not found"}), 404
# =====================================================================

# =====================================================================
# CICLO DE VIDA AUTOMÁTICO DEL BRIDGE DE WHATSAPP
# =====================================================================
BRIDGE_DIR = os.path.join(BASE_DIR, 'whatsapp-bridge')

def get_or_create_device(user_id):
    """Busca el dispositivo del usuario. Si no tiene, lo crea automáticamente."""
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT id FROM dispositivos WHERE usuario_id = %s ORDER BY id ASC LIMIT 1",
            (user_id,)
        )
        device = cursor.fetchone()
        if device:
            return device['id']

        # No tiene dispositivo → crear uno automáticamente
        unique_session_id = f"session_{uuid.uuid4().hex[:8]}"
        cursor.execute(
            """
            INSERT INTO dispositivos (usuario_id, dispositivo_id, nombre, estado, creado_en)
            VALUES (%s, %s, 'Mi WhatsApp', 'desconectado', NOW())
            """,
            (user_id, unique_session_id)
        )
        conn.commit()
        new_id = cursor.lastrowid
        logger.info(f'Dispositivo auto-creado: id={new_id}, session={unique_session_id} para usuario_id={user_id}')
        return new_id
    finally:
        cursor.close()
        conn.close()


def kill_process_on_port(port):
    """Mata cualquier proceso que esté escuchando en el puerto TCP especificado."""
    import subprocess
    import sys
    try:
        if sys.platform == 'win32':
            output = subprocess.check_output(f'netstat -ano | findstr :{port}', shell=True).decode()
            pids = set()
            for line in output.strip().split('\n'):
                if not line.strip(): continue
                parts = line.strip().split()
                if len(parts) >= 5 and f':{port}' in parts[1]:
                    pids.add(parts[-1])
            for pid in pids:
                logger.info(f"Matando proceso Windows con PID {pid} en puerto {port}")
                subprocess.run(['taskkill', '/F', '/PID', pid], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        else:
            logger.info(f"Matando procesos en puerto {port} en Linux/Unix")
            subprocess.run(f'fuser -k -n tcp {port}', shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        logger.warning(f"No se pudo matar el proceso en el puerto {port}: {e}")


# Mapeo de device_id -> subprocess.Popen de procesos bridge que esta instancia de Flask ha lanzado.
# Permite detectar y limpiar procesos huérfanos/zombies de ejecuciones anteriores al reiniciar el backend.
launched_bridge_processes = {}

def is_locally_launched_and_running(device_id):
    """Verifica si el bridge para el device_id fue lanzado por esta instancia y sigue activo."""
    proc = launched_bridge_processes.get(device_id)
    if proc is None:
        return False
    return proc.poll() is None


def is_bridge_running(device_id):
    """Verifica si el bridge de Node.js está corriendo para el device_id dado."""
    bridge_port = 5000 + (device_id % 1000)
    port_open = False
    try:
        with socket.create_connection(("127.0.0.1", bridge_port), timeout=1):
            port_open = True
    except OSError:
        pass

    lock_path = os.path.join(BRIDGE_DIR, f'.bridge.device{device_id}.lock')

    if port_open:
        # Si el puerto está abierto, pero el lockfile no existe, hay un proceso huérfano.
        # Lo matamos y retornamos False para que se lance uno nuevo con el código limpio.
        if not os.path.exists(lock_path):
            logger.warning(f"Puerto {bridge_port} ocupado pero sin lockfile para device_id={device_id}. Matando proceso huérfano...")
            kill_process_on_port(bridge_port)
            return False
        return True

    # Si el puerto no está abierto, el proceso no está corriendo.
    # Si existe el lockfile, es un residuo huérfano y lo limpiamos.
    if os.path.exists(lock_path):
        try:
            os.remove(lock_path)
        except OSError:
            pass
    return False


def start_whatsapp_bridge(user_id, device_id):
    """Lanza el bridge de WhatsApp en segundo plano sin bloquear Flask."""
    # Los dispositivos de WhatsApp Cloud API NO necesitan bridge local de Node.js
    conn = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT color FROM dispositivos WHERE id = %s LIMIT 1", (device_id,))
        device = cursor.fetchone()
        if device and device.get("color") == "cloud":
            logger.info(f"Dispositivo id={device_id} es de tipo Cloud API. No se inicia bridge local.")
            return
    except Exception as e:
        logger.error(f"Error comprobando tipo de dispositivo en start_whatsapp_bridge: {e}")
    finally:
        if conn:
            conn.close()

    # Si ya lo lanzamos localmente en esta ejecución de Flask y sigue activo, no hacemos nada
    if is_locally_launched_and_running(device_id):
        logger.info(f'Bridge ya corriendo localmente y rastreado para device_id={device_id}. No se lanza duplicado.')
        return

    # Si NO está en nuestro rastreo local pero el puerto/lockfile indica que está activo,
    # es un residuo de una ejecución anterior de Flask (con código viejo). Lo detenemos obligatoriamente.
    if is_bridge_running(device_id):
        logger.warning(f"Se detectó un proceso bridge huérfano/zombie para device_id={device_id}. Reiniciándolo con código nuevo...")
        stop_whatsapp_bridge(device_id)

    log_path = os.path.join(BRIDGE_DIR, f'bridge_device{device_id}.log')
    log_file = open(log_path, 'a', encoding='utf-8')

    node_cmd = 'node'
    cmd = [node_cmd, 'bridge.js', f'--user-id={user_id}', f'--device-id={device_id}']

    # Pasar variables de entorno configurando el webhook local si no está definido
    env = os.environ.copy()
    if 'WHATSAPP_WEBHOOK_URL' not in env:
        flask_port = os.getenv("PORT", "5000")
        env['WHATSAPP_WEBHOOK_URL'] = f"http://127.0.0.1:{flask_port}/webhook/whatsapp"
        logger.info(f"Asignando webhook url local para el bridge: {env['WHATSAPP_WEBHOOK_URL']}")

    proc = subprocess.Popen(
        cmd,
        cwd=BRIDGE_DIR,
        stdout=log_file,
        stderr=log_file,
        env=env,
        # En Windows, crear el proceso en un grupo nuevo para que no muera con Flask
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0,
    )
    launched_bridge_processes[device_id] = proc
    logger.info(f'Bridge lanzado y registrado: PID={proc.pid}, device_id={device_id}, log={log_path}')


def stop_whatsapp_bridge(device_id):
    """Detiene el bridge de Node.js correspondiente al device_id y elimina el lockfile."""
    # Remover del rastreo local
    launched_bridge_processes.pop(device_id, None)

    lock_path = os.path.join(BRIDGE_DIR, f'.bridge.device{device_id}.lock')
    if os.path.exists(lock_path):
        try:
            with open(lock_path, 'r') as f:
                pid = int(f.read().strip())
            logger.info(f"Deteniendo bridge para device_id={device_id} con PID={pid}")
            if sys.platform == 'win32':
                import subprocess
                subprocess.run(['taskkill', '/F', '/PID', str(pid)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            else:
                os.kill(pid, 9)
        except Exception as e:
            logger.warning(f"Error al detener proceso bridge para device_id={device_id}: {e}")
        finally:
            try:
                os.remove(lock_path)
            except OSError:
                pass

    # Asegurar matando cualquier proceso huérfano en el puerto del bridge
    bridge_port = 5000 + (device_id % 1000)
    kill_process_on_port(bridge_port)


def wait_for_bridge_port(device_id, timeout_seconds=12):
    """Espera a que el bridge del dispositivo abra su puerto HTTP local."""
    bridge_port = 5000 + (device_id % 1000)
    deadline = time.time() + max(timeout_seconds, 1)

    while time.time() < deadline:
        try:
            with socket.create_connection(("127.0.0.1", bridge_port), timeout=1):
                return True
        except OSError:
            time.sleep(0.4)

    return False


def fetch_bridge_json(device_id, path, query_params=None, timeout=20, user_id=None):
    try:
        device_id_int = int(device_id)
    except (TypeError, ValueError):
        return {"success": False, "error": "device_id invalido"}

    if not is_bridge_running(device_id_int) and user_id:
        start_whatsapp_bridge(user_id, device_id_int)

    if not wait_for_bridge_port(device_id_int, timeout_seconds=12):
        return {"success": False, "error": f"El bridge del dispositivo {device_id_int} no termino de iniciar."}

    bridge_port = 5000 + (device_id_int % 1000)
    try:
        response = requests.get(
            f"http://127.0.0.1:{bridge_port}{path}",
            params=query_params or {},
            timeout=timeout,
        )
        data = response.json()
        if response.status_code >= 400:
            return {"success": False, "error": data.get("error") or data.get("message") or "Error consultando el bridge"}
        return data if isinstance(data, dict) else {"success": True, "data": data}
    except Exception as error:
        logger.error("Error consultando bridge en puerto %s (%s): %s", bridge_port, path, error)
        return {"success": False, "error": str(error)}


def post_bridge_json(device_id, path, payload=None, timeout=35, user_id=None):
    try:
        device_id_int = int(device_id)
    except (TypeError, ValueError):
        return {"success": False, "error": "device_id invalido"}

    if not is_bridge_running(device_id_int) and user_id:
        start_whatsapp_bridge(user_id, device_id_int)

    if not wait_for_bridge_port(device_id_int, timeout_seconds=12):
        return {"success": False, "error": f"El bridge del dispositivo {device_id_int} no termino de iniciar."}

    bridge_port = 5000 + (device_id_int % 1000)
    try:
        response = requests.post(
            f"http://127.0.0.1:{bridge_port}{path}",
            json=payload or {},
            timeout=timeout,
        )
        data = response.json()
        if response.status_code >= 400:
            return {"success": False, "error": data.get("error") or data.get("message") or "Error consultando el bridge"}
        return data if isinstance(data, dict) else {"success": True, "data": data}
    except Exception as error:
        logger.error("Error enviando al bridge en puerto %s (%s): %s", bridge_port, path, error)
        return {"success": False, "error": str(error)}


db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "funnelchat_dev"),
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
}


PUBLIC_USER_FIELDS = (
    "id",
    "nombre",
    "correo",
    "foto_perfil",
    "whatsapp_personal",
    "zona_horaria",
    "rol",
    "activo",
    "creado_en",
    "ultimo_acceso",
    "parent_id",
)


def get_connection():
    return mysql.connector.connect(**db_config)


def sync_local_media_to_r2():
    use_r2 = os.getenv("USE_R2") == "true"
    if not use_r2:
        return

    bucket_name = os.getenv("R2_BUCKET_NAME")
    public_url = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
    if not bucket_name or not public_url:
        return

    import boto3
    from botocore.config import Config

    r2_client = boto3.client(
        's3',
        endpoint_url=os.getenv('R2_ENDPOINT_URL'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        region_name='auto',
        config=Config(signature_version='s3v4')
    )

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Sync messages media
        cursor.execute("""
            SELECT id, url_media, mime_media FROM mensajes 
            WHERE url_media LIKE '/media/%' 
            LIMIT 50
        """)
        msg_rows = cursor.fetchall()
        for row in msg_rows:
            local_path_rel = row['url_media'].replace('/media/', '', 1)
            local_path = os.path.join(MEDIA_FOLDER, *local_path_rel.split('/'))
            if os.path.isfile(local_path):
                content_type = row['mime_media'] or 'application/octet-stream'
                r2_key = local_path_rel
                r2_client.upload_file(
                    local_path, 
                    bucket_name, 
                    r2_key,
                    ExtraArgs={'ContentType': content_type}
                )
                try:
                    os.remove(local_path)
                except Exception as delete_err:
                    logger.warning(f"R2 Sync: Error deleting local file {local_path}: {delete_err}")
                logger.info(f"R2 Sync: Uploaded message media {r2_key}")
            
            new_url = f"{public_url}/{local_path_rel}"
            cursor.execute("UPDATE mensajes SET url_media = %s WHERE id = %s", (new_url, row['id']))
            conn.commit()

        # 2. Sync contactos profile photos
        cursor.execute("""
            SELECT id, foto_perfil FROM contactos 
            WHERE foto_perfil LIKE '/media/%' 
            LIMIT 50
        """)
        contact_rows = cursor.fetchall()
        for row in contact_rows:
            local_path_rel = row['foto_perfil'].replace('/media/', '', 1)
            local_path = os.path.join(MEDIA_FOLDER, *local_path_rel.split('/'))
            if os.path.isfile(local_path):
                r2_key = local_path_rel
                r2_client.upload_file(
                    local_path, 
                    bucket_name, 
                    r2_key,
                    ExtraArgs={'ContentType': 'image/jpeg'}
                )
                try:
                    os.remove(local_path)
                except Exception as delete_err:
                    logger.warning(f"R2 Sync: Error deleting local file {local_path}: {delete_err}")
                logger.info(f"R2 Sync: Uploaded contact photo {r2_key}")
            
            new_url = f"{public_url}/{local_path_rel}"
            cursor.execute("UPDATE contactos SET foto_perfil = %s WHERE id = %s", (new_url, row['id']))
            conn.commit()

        # 3. Sync dispositivos profile photos
        cursor.execute("""
            SELECT id, foto_perfil FROM dispositivos 
            WHERE foto_perfil LIKE '/media/%' 
            LIMIT 50
        """)
        dev_rows = cursor.fetchall()
        for row in dev_rows:
            local_path_rel = row['foto_perfil'].replace('/media/', '', 1)
            local_path = os.path.join(MEDIA_FOLDER, *local_path_rel.split('/'))
            if os.path.isfile(local_path):
                r2_key = local_path_rel
                r2_client.upload_file(
                    local_path, 
                    bucket_name, 
                    r2_key,
                    ExtraArgs={'ContentType': 'image/jpeg'}
                )
                try:
                    os.remove(local_path)
                except Exception as delete_err:
                    logger.warning(f"R2 Sync: Error deleting local file {local_path}: {delete_err}")
                logger.info(f"R2 Sync: Uploaded device photo {r2_key}")
            
            new_url = f"{public_url}/{local_path_rel}"
            cursor.execute("UPDATE dispositivos SET foto_perfil = %s WHERE id = %s", (new_url, row['id']))
            conn.commit()

        # 4. Sync usuarios profile photos
        cursor.execute("""
            SELECT id, foto_perfil FROM usuarios 
            WHERE foto_perfil LIKE '/media/%' 
            LIMIT 50
        """)
        user_rows = cursor.fetchall()
        for row in user_rows:
            local_path_rel = row['foto_perfil'].replace('/media/', '', 1)
            local_path = os.path.join(MEDIA_FOLDER, *local_path_rel.split('/'))
            if os.path.isfile(local_path):
                r2_key = local_path_rel
                r2_client.upload_file(
                    local_path, 
                    bucket_name, 
                    r2_key,
                    ExtraArgs={'ContentType': 'image/jpeg'}
                )
                try:
                    os.remove(local_path)
                except Exception as delete_err:
                    logger.warning(f"R2 Sync: Error deleting local file {local_path}: {delete_err}")
                logger.info(f"R2 Sync: Uploaded user photo {r2_key}")
            
            new_url = f"{public_url}/{local_path_rel}"
            cursor.execute("UPDATE usuarios SET foto_perfil = %s WHERE id = %s", (new_url, row['id']))
            conn.commit()

        # 5. Sync campanas image_url and url_media
        cursor.execute("""
            SELECT id, imagen_url, url_media FROM campanas 
            WHERE imagen_url LIKE '/media/%' OR url_media LIKE '/media/%'
            LIMIT 50
        """)
        campana_rows = cursor.fetchall()
        for row in campana_rows:
            img_url = row['imagen_url']
            url_med = row['url_media']
            
            if img_url and img_url.startswith('/media/'):
                local_path_rel = img_url.replace('/media/', '', 1)
                local_path = os.path.join(MEDIA_FOLDER, *local_path_rel.split('/'))
                if os.path.isfile(local_path):
                    r2_client.upload_file(local_path, bucket_name, local_path_rel, ExtraArgs={'ContentType': 'image/jpeg'})
                    try:
                        os.remove(local_path)
                    except Exception as delete_err:
                        logger.warning(f"R2 Sync: Error deleting local file {local_path}: {delete_err}")
                img_url = f"{public_url}/{local_path_rel}"

            if url_med and url_med.startswith('/media/'):
                local_path_rel = url_med.replace('/media/', '', 1)
                local_path = os.path.join(MEDIA_FOLDER, *local_path_rel.split('/'))
                if os.path.isfile(local_path):
                    ct = 'video/mp4' if local_path_rel.lower().endswith('.mp4') else 'image/jpeg'
                    r2_client.upload_file(local_path, bucket_name, local_path_rel, ExtraArgs={'ContentType': ct})
                    try:
                        os.remove(local_path)
                    except Exception as delete_err:
                        logger.warning(f"R2 Sync: Error deleting local file {local_path}: {delete_err}")
                url_med = f"{public_url}/{local_path_rel}"

            cursor.execute("UPDATE campanas SET imagen_url = %s, url_media = %s WHERE id = %s", (img_url, url_med, row['id']))
            conn.commit()

        # 6. Clean temp directory (e.g. from whisper/gemini transcriptions)
        temp_dir = os.path.join(MEDIA_FOLDER, "temp")
        if os.path.isdir(temp_dir):
            for f in os.listdir(temp_dir):
                fp = os.path.join(temp_dir, f)
                try:
                    if os.path.isfile(fp):
                        if time.time() - os.path.getmtime(fp) > 3600:
                            os.remove(fp)
                except Exception as clean_err:
                    logger.debug(f"Error cleaning temp file {f}: {clean_err}")

    except Exception as e:
        logger.error(f"Error executing R2 sync: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def sync_local_directory_to_r2():
    use_r2 = os.getenv("USE_R2") == "true"
    if not use_r2:
        return

    bucket_name = os.getenv("R2_BUCKET_NAME")
    public_url = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
    if not bucket_name or not public_url:
        return

    import boto3
    from botocore.config import Config

    r2_client = boto3.client(
        's3',
        endpoint_url=os.getenv('R2_ENDPOINT_URL'),
        aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
        region_name='auto',
        config=Config(signature_version='s3v4')
    )

    try:
        # Walk through the media folder recursively
        for root, dirs, files in os.walk(MEDIA_FOLDER):
            # Skip the temp folder
            if "temp" in root.split(os.sep):
                continue
                
            for file in files:
                local_path = os.path.join(root, file)
                
                # Check if file has been fully written (not modified in last 60s)
                try:
                    mtime = os.path.getmtime(local_path)
                    if time.time() - mtime < 60:
                        continue # skip if active
                    
                    # Get relative path for R2 key
                    rel_path = os.path.relpath(local_path, MEDIA_FOLDER).replace("\\", "/")
                    
                    # MIME detection based on file extension
                    ext = file.rsplit(".", 1)[-1].lower() if "." in file else ""
                    content_type = "application/octet-stream"
                    if ext in ["jpg", "jpeg"]: content_type = "image/jpeg"
                    elif ext == "png": content_type = "image/png"
                    elif ext == "webp": content_type = "image/webp"
                    elif ext == "gif": content_type = "image/gif"
                    elif ext == "mp4": content_type = "video/mp4"
                    elif ext in ["ogg", "oga"]: content_type = "audio/ogg"
                    elif ext == "mp3": content_type = "audio/mp3"
                    elif ext == "pdf": content_type = "application/pdf"
                    
                    # Upload
                    r2_client.upload_file(
                        local_path,
                        bucket_name,
                        rel_path,
                        ExtraArgs={'ContentType': content_type}
                    )
                    
                    # Retain local copy for automations and perfiles so Nginx static route serves them without 404
                    parts_split = root.replace("\\", "/").split("/")
                    if "automations" not in parts_split and "perfiles" not in parts_split:
                        try:
                            os.remove(local_path)
                            logger.info(f"R2 Folder Sync: Uploaded and cleared {rel_path}")
                        except Exception as delete_err:
                            logger.warning(f"R2 Sync: Error deleting local file {local_path}: {delete_err}")
                    else:
                        logger.info(f"R2 Folder Sync: Uploaded to R2 and retained local copy {rel_path}")
                    
                except Exception as file_err:
                    logger.error(f"Error syncing local file {file}: {file_err}")
    except Exception as scan_err:
        logger.error(f"Error scanning media folder: {scan_err}")


def run_r2_sync_scheduler():
    logger.info("R2 Sync Scheduler thread started.")
    last_dir_sync = 0
    while True:
        try:
            sync_local_media_to_r2()
            
            # Run directory sync every 60 seconds
            now = time.time()
            if now - last_dir_sync > 60:
                sync_local_directory_to_r2()
                last_dir_sync = now
        except Exception as e:
            logger.error(f"Error in R2 Sync Loop: {e}")
        time.sleep(5)




def run_db_migrations():
    logger.info("Ejecutando migraciones automáticas seguras de inicio...")
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 0. Migrar automatizaciones.tipo_disparador de ENUM a VARCHAR(50)
        try:
            cursor.execute("SHOW COLUMNS FROM automatizaciones LIKE 'tipo_disparador'")
            col_info = cursor.fetchone()
            if col_info:
                col_type = str(col_info.get('Type') or col_info.get('type') or '').lower()
                if 'enum' in col_type or 'varchar' not in col_type:
                    logger.info("Migrando columna automatizaciones.tipo_disparador a VARCHAR(50)...")
                    cursor.execute("ALTER TABLE automatizaciones MODIFY COLUMN tipo_disparador VARCHAR(50) NOT NULL DEFAULT 'palabra_clave'")
                    conn.commit()
                    logger.info("Columna automatizaciones.tipo_disparador migrada con éxito.")
        except Exception as auto_col_err:
            logger.warning(f"No se pudo migrar la columna tipo_disparador en automatizaciones: {auto_col_err}")
        
        # 1. Columnas en la tabla dispositivos
        cursor.execute("SHOW COLUMNS FROM dispositivos LIKE 'foto_perfil'")
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE dispositivos ADD COLUMN foto_perfil TEXT COLLATE utf8mb4_unicode_ci NULL"
            )
            conn.commit()
            
        cursor.execute("SHOW COLUMNS FROM dispositivos LIKE 'color'")
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE dispositivos ADD COLUMN color VARCHAR(50) DEFAULT NULL"
            )
            conn.commit()
            
        cursor.execute("SHOW COLUMNS FROM dispositivos LIKE 'meta_access_token'")
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE dispositivos ADD COLUMN meta_access_token TEXT NULL"
            )
            conn.commit()

        cursor.execute("SHOW COLUMNS FROM dispositivos LIKE 'meta_phone_number_id'")
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE dispositivos ADD COLUMN meta_phone_number_id VARCHAR(100) NULL"
            )
            conn.commit()

        cursor.execute("SHOW COLUMNS FROM dispositivos LIKE 'meta_waba_id'")
        if not cursor.fetchone():
            cursor.execute(
                "ALTER TABLE dispositivos ADD COLUMN meta_waba_id VARCHAR(100) NULL"
            )
            conn.commit()
            
        # 2. ENUM en dispositivos.estado
        cursor.execute("SHOW COLUMNS FROM dispositivos LIKE 'estado'")
        col_res = cursor.fetchone()
        if col_res and 'tipo_incorrecto' not in str(col_res.get('Type') or col_res.get('type') or ''):
            cursor.execute(
                "ALTER TABLE dispositivos MODIFY COLUMN estado ENUM('conectado', 'desconectado', 'conectando', 'tipo_incorrecto') DEFAULT 'desconectado'"
            )
            conn.commit()
            logger.info("Columna dispositivos.estado migrada para incluir 'tipo_incorrecto'")
            
        # 3. Eliminar clave foránea agente_asignado_id -> usuarios de la tabla contactos si existe
        cursor.execute(
            """
            SELECT CONSTRAINT_NAME 
            FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE 
            WHERE TABLE_SCHEMA = DATABASE() 
              AND TABLE_NAME = 'contactos' 
              AND COLUMN_NAME = 'agente_asignado_id' 
              AND REFERENCED_TABLE_NAME = 'usuarios'
            LIMIT 1
            """
        )
        fk_res = cursor.fetchone()
        if fk_res:
            fk_name = fk_res.get('CONSTRAINT_NAME') or fk_res.get('constraint_name')
            logger.info(f"Eliminando clave foránea existente {fk_name} de la tabla contactos...")
            cursor.execute(f"ALTER TABLE contactos DROP FOREIGN KEY {fk_name}")
            conn.commit()
            logger.info(f"Clave foránea {fk_name} eliminada con éxito.")
            
        # 3.5 Limpiar asignaciones viejas de contactos que apunten a dispositivos (u otros IDs que no correspondan a usuarios)
        try:
            cursor.execute(
                """
                UPDATE contactos 
                SET agente_asignado_id = NULL 
                WHERE agente_asignado_id IS NOT NULL 
                  AND agente_asignado_id NOT IN (SELECT id FROM usuarios)
                """
            )
            conn.commit()
            logger.info("Migración: Valores de agente_asignado_id inválidos (dispositivos) limpiados a NULL en contactos.")
        except Exception as mig_err:
            logger.warning(f"No se pudo limpiar agente_asignado_id huérfanos: {mig_err}")
            
        # 4. Crear tabla agentes_ia si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agentes_ia (
              id int(11) NOT NULL AUTO_INCREMENT,
              usuario_id int(11) NOT NULL,
              dispositivo_id int(11) NOT NULL,
              nombre varchar(150) NOT NULL,
              modelo varchar(100) DEFAULT 'gpt-4',
              instrucciones text DEFAULT NULL,
              personalidad text DEFAULT NULL,
              activo tinyint(1) DEFAULT 0,
              creado_en datetime DEFAULT current_timestamp(),
              actualizado_en datetime DEFAULT current_timestamp() ON UPDATE current_timestamp(),
              PRIMARY KEY (id),
              KEY usuario_id (usuario_id),
              KEY dispositivo_id (dispositivo_id),
              CONSTRAINT agentes_ia_ibfk_1 FOREIGN KEY (usuario_id) REFERENCES usuarios (id) ON DELETE CASCADE,
              CONSTRAINT agentes_ia_ibfk_2 FOREIGN KEY (dispositivo_id) REFERENCES dispositivos (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        conn.commit()

        # Añadir nuevas columnas a agentes_ia si no existen
        cursor.execute("SHOW COLUMNS FROM agentes_ia LIKE 'descripcion_negocio'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE agentes_ia ADD COLUMN descripcion_negocio TEXT DEFAULT NULL")
            conn.commit()
            logger.info("Columna agentes_ia.descripcion_negocio añadida con éxito.")

        cursor.execute("SHOW COLUMNS FROM agentes_ia LIKE 'industria'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE agentes_ia ADD COLUMN industria VARCHAR(100) DEFAULT NULL")
            conn.commit()
            logger.info("Columna agentes_ia.industria añadida con éxito.")

        cursor.execute("SHOW COLUMNS FROM agentes_ia LIKE 'objetivo'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE agentes_ia ADD COLUMN objetivo VARCHAR(100) DEFAULT NULL")
            conn.commit()
            logger.info("Columna agentes_ia.objetivo añadida con éxito.")

        cursor.execute("SHOW COLUMNS FROM agentes_ia LIKE 'pasos_captura'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE agentes_ia ADD COLUMN pasos_captura TEXT DEFAULT NULL")
            conn.commit()
            logger.info("Columna agentes_ia.pasos_captura añadida con éxito.")

        cursor.execute("SHOW COLUMNS FROM agentes_ia LIKE 'skip_existing_data'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE agentes_ia ADD COLUMN skip_existing_data TINYINT(1) DEFAULT 0")
            conn.commit()
            logger.info("Columna agentes_ia.skip_existing_data añadida con éxito.")

        cursor.execute("SHOW COLUMNS FROM agentes_ia LIKE 'seguimientos'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE agentes_ia ADD COLUMN seguimientos TEXT DEFAULT NULL")
            conn.commit()
            logger.info("Columna agentes_ia.seguimientos añadida con éxito.")

        cursor.execute("SHOW COLUMNS FROM agentes_ia LIKE 'reglas_transferencia'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE agentes_ia ADD COLUMN reglas_transferencia TEXT DEFAULT NULL")
            conn.commit()
            logger.info("Columna agentes_ia.reglas_transferencia añadida con éxito.")

        cursor.execute("SHOW COLUMNS FROM agentes_ia LIKE 'reglas_etiquetado'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE agentes_ia ADD COLUMN reglas_etiquetado TEXT DEFAULT NULL")
            conn.commit()
            logger.info("Columna agentes_ia.reglas_etiquetado añadida con éxito.")

        cursor.execute("SHOW COLUMNS FROM agentes_ia LIKE 'config_comportamiento'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE agentes_ia ADD COLUMN config_comportamiento TEXT DEFAULT NULL")
            conn.commit()
            logger.info("Columna agentes_ia.config_comportamiento añadida con éxito.")

        # 5. Crear tabla agente_contactos si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agente_contactos (
              id int(11) NOT NULL AUTO_INCREMENT,
              agente_id int(11) NOT NULL,
              contacto_jid varchar(100) NOT NULL,
              activo tinyint(1) DEFAULT 1,
              PRIMARY KEY (id),
              UNIQUE KEY agente_contacto_unico (agente_id, contacto_jid),
              CONSTRAINT agente_contactos_ibfk_1 FOREIGN KEY (agente_id) REFERENCES agentes_ia (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        conn.commit()

        # 6. Añadir onboarding_json a usuarios si no existe
        cursor.execute("SHOW COLUMNS FROM usuarios LIKE 'onboarding_json'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE usuarios ADD COLUMN onboarding_json TEXT DEFAULT NULL")
            conn.commit()
            logger.info("Columna usuarios.onboarding_json añadida con éxito.")

        # 7. Crear tabla agente_recursos si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agente_recursos (
              id int(11) NOT NULL AUTO_INCREMENT,
              agente_id int(11) NOT NULL,
              tipo enum('Imagen', 'Audio', 'Video') NOT NULL,
              archivo_url varchar(500) NOT NULL,
              nombre_archivo varchar(255) NOT NULL,
              descripcion text DEFAULT NULL,
              notas_uso text DEFAULT NULL,
              creado_en datetime DEFAULT current_timestamp(),
              PRIMARY KEY (id),
              CONSTRAINT fk_agente_recursos_agente FOREIGN KEY (agente_id) REFERENCES agentes_ia (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        conn.commit()
        logger.info("Tabla agente_recursos verificada/creada con éxito.")

        # 8. Crear tabla agente_conocimiento si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS agente_conocimiento (
              id int(11) NOT NULL AUTO_INCREMENT,
              agente_id int(11) NOT NULL,
              tipo varchar(50) NOT NULL,
              titulo varchar(255) NOT NULL,
              contenido longtext DEFAULT NULL,
              url varchar(500) DEFAULT NULL,
              creado_en datetime DEFAULT current_timestamp(),
              PRIMARY KEY (id),
              CONSTRAINT fk_agente_conocimiento_agente FOREIGN KEY (agente_id) REFERENCES agentes_ia (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        conn.commit()
        # 9. Añadir nuevas columnas a planes si no existen
        nuevas_columnas_planes = {
            "max_accesos_multiagente": "INT DEFAULT 1",
            "permite_cloud_api": "TINYINT DEFAULT 0",
            "permite_todos_objetivos_ia": "TINYINT DEFAULT 0",
            "permite_ia_grupos": "TINYINT DEFAULT 0",
            "incluye_sesion_inicial": "TINYINT DEFAULT 0",
            "permite_soporte_chat": "TINYINT DEFAULT 0",
            "permite_reuniones": "TINYINT DEFAULT 0",
            "permite_grupo_soporte": "TINYINT DEFAULT 0",
            "permite_key_account": "TINYINT DEFAULT 0",
            "max_sesiones_personalizadas": "INT DEFAULT 0"
        }
        for col_name, col_def in nuevas_columnas_planes.items():
            cursor.execute(f"SHOW COLUMNS FROM planes LIKE '{col_name}'")
            if not cursor.fetchone():
                cursor.execute(f"ALTER TABLE planes ADD COLUMN {col_name} {col_def}")
                conn.commit()
                logger.info(f"Columna planes.{col_name} añadida con éxito.")

        # Actualizar/sembrar valores de límites por defecto para planes existentes
        cursor.execute("""
            UPDATE planes SET
                max_accesos_multiagente = 1,
                permite_cloud_api = 1,
                permite_ia = 1,
                permite_todos_objetivos_ia = 0,
                permite_ia_grupos = 0,
                incluye_sesion_inicial = 1,
                permite_soporte_chat = 1,
                permite_reuniones = 1,
                permite_grupo_soporte = 0,
                permite_key_account = 0,
                max_sesiones_personalizadas = 0
            WHERE nombre LIKE '%Starter%' OR id = 2
        """)
        cursor.execute("""
            UPDATE planes SET
                max_accesos_multiagente = 3,
                permite_cloud_api = 1,
                permite_ia = 1,
                permite_todos_objetivos_ia = 0,
                permite_ia_grupos = 0,
                incluye_sesion_inicial = 1,
                permite_soporte_chat = 1,
                permite_reuniones = 1,
                permite_grupo_soporte = 0,
                permite_key_account = 0,
                max_sesiones_personalizadas = 0
            WHERE nombre LIKE '%Growth%' OR id = 3
        """)
        cursor.execute("""
            UPDATE planes SET
                max_accesos_multiagente = 5,
                permite_cloud_api = 1,
                permite_ia = 1,
                permite_todos_objetivos_ia = 1,
                permite_ia_grupos = 1,
                incluye_sesion_inicial = 1,
                permite_soporte_chat = 1,
                permite_reuniones = 1,
                permite_grupo_soporte = 1,
                permite_key_account = 1,
                max_sesiones_personalizadas = 3
            WHERE nombre LIKE '%Advanced%' OR id = 4
        """)
        conn.commit()
        logger.info("Migración y siembra de la tabla planes completada con éxito.")

        # 10. Crear tabla registros_automatizacion si no existe
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS registros_automatizacion (
              id INT AUTO_INCREMENT PRIMARY KEY,
              automatizacion_id INT NOT NULL,
              contacto_jid VARCHAR(100) NULL,
              dispositivo_id INT NULL,
              ejecutado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
              KEY automatizacion_id (automatizacion_id),
              CONSTRAINT fk_reg_auto FOREIGN KEY (automatizacion_id) REFERENCES automatizaciones (id) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        """)
        conn.commit()
        logger.info("Tabla registros_automatizacion verificada/creada con éxito.")

        logger.info("Verificación de tablas finalizada con éxito.")
            
    except Exception as e:
        logger.error(f"Error al ejecutar migraciones en inicio: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# Ejecutar las migraciones una vez al iniciar el servidor
try:
    run_db_migrations()
except Exception as e:
    logger.error(f"Error al iniciar migraciones de la base de datos: {e}")


def publish_whatsapp_event(event):
    stale_subscribers = []

    for subscriber in list(whatsapp_event_subscribers):
        if subscriber["user_id"] != event.get("user_id"):
            continue

        try:
            subscriber["queue"].put_nowait(event)
        except Full:
            stale_subscribers.append(subscriber)

    for subscriber in stale_subscribers:
        if subscriber in whatsapp_event_subscribers:
            whatsapp_event_subscribers.remove(subscriber)


def as_json_value(value):
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    return value


def public_user(user_row):
    return {field: as_json_value(user_row.get(field)) for field in PUBLIC_USER_FIELDS}


def resolve_real_user_id():
    """Obtiene el ID del usuario autenticado real (sin parent_id)"""
    try:
        identity = get_jwt_identity()
        if identity:
            return int(identity)
    except Exception:
        pass
    payload = request.get_json(silent=True) or {}
    val = (
        request.args.get("user_id")
        or request.form.get("user_id")
        or payload.get("user_id")
    )
    try:
        return int(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def resolve_request_user_id():
    """Obtiene el usuario desde JWT o desde el payload/qs.
    Si el usuario tiene un parent_id (es colaborador), se retorna el parent_id (el dueño).
    """
    from flask import g

    # 1. Si ya lo resolvimos en este request, usar el valor en cache
    if hasattr(g, 'resolved_owner_user_id') and g.resolved_owner_user_id is not None:
        return g.resolved_owner_user_id

    candidate = None
    try:
        identity = get_jwt_identity()
        if identity:
            candidate = int(identity)
    except Exception:
        pass

    if candidate is None:
        payload = request.get_json(silent=True) or {}
        val = (
            request.args.get("user_id")
            or request.form.get("user_id")
            or payload.get("user_id")
        )
        try:
            if val is not None:
                candidate = int(val)
        except (TypeError, ValueError):
            pass

    if candidate is None:
        return None

    # 2. Consultar si este candidato tiene parent_id en la base de datos
    owner_id = candidate
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT parent_id FROM usuarios WHERE id = %s LIMIT 1", (candidate,))
        row = cursor.fetchone()
        if row and row.get("parent_id") is not None:
            owner_id = int(row["parent_id"])
    except Exception as e:
        logger.error(f"Error resolviendo parent_id para usuario {candidate}: {e}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

    # Guardar en cache del request y retornar
    g.resolved_owner_user_id = owner_id
    return owner_id


def resolve_owner_by_id(user_id):
    """Retorna el parent_id si el usuario es colaborador, o el propio user_id si es admin/dueño."""
    if not user_id:
        return user_id
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT parent_id FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
        row = cursor.fetchone()
        if row and row.get("parent_id") is not None:
            return int(row["parent_id"])
    except Exception as e:
        logger.error(f"Error resolviendo parent_id por id {user_id}: {e}")
    finally:
        if 'cursor' in locals() and cursor:
            cursor.close()
        if 'conn' in locals() and conn:
            conn.close()
    return user_id


def fetch_count(cursor, query, params):
    cursor.execute(query, params)
    row = cursor.fetchone() or {}
    return int(row.get("total") or 0)


def require_admin_role():
    """Verifica que el usuario autenticado tenga rol admin/superadmin.
    Si es agente o visor, retorna una respuesta 403. Retorna None si todo OK.
    """
    try:
        real_id = None
        try:
            identity = get_jwt_identity()
            if identity:
                real_id = int(identity)
        except Exception:
            pass

        if not real_id:
            return jsonify({"success": False, "message": "No autenticado"}), 401

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (real_id,))
        row = cursor.fetchone()
        cursor.close()
        conn.close()

        if row and row.get("rol") in ("agente", "visor"):
            return jsonify({"success": False, "message": "No tienes permisos para realizar esta acción (acceso restringido a administradores)"}), 403
    except Exception as e:
        logger.error(f"Error en require_admin_role: {e}")
    return None


def verify_password(plain_password, stored_password):
    if plain_password is None or not stored_password:
        return False

    plain_password = str(plain_password)
    stored_password = str(stored_password)

    # Hashes generados por werkzeug: pbkdf2:..., scrypt:...
    try:
        if stored_password.startswith(("pbkdf2:", "scrypt:")):
            return check_password_hash(stored_password, plain_password)
    except Exception:
        pass

    # Hashes bcrypt usados por el proyecto anterior con passlib/bcrypt.
    try:
        if stored_password.startswith(("$2a$", "$2b$", "$2y$")):
            normalized_hash = stored_password.replace("$2y$", "$2b$", 1)
            return bcrypt.checkpw(
                plain_password.encode("utf-8"),
                normalized_hash.encode("utf-8"),
            )
    except Exception:
        pass

    return False


def hash_password(plain_password):
    return bcrypt.hashpw(str(plain_password).encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def digits_only(value):
    return "".join(char for char in str(value or "") if char.isdigit())


def clean_text(value):
    text = str(value or "").strip()
    return text or None


def normalize_message_type(value):
    text = clean_text(value) or "texto"
    return text if text in {"texto", "imagen", "video", "audio", "documento", "sticker"} else "texto"


def normalize_jid(value):
    return str(value or "").strip()


def is_group_jid(jid):
    return normalize_jid(jid).endswith("@g.us")


def is_newsletter_jid(jid):
    return normalize_jid(jid).lower().endswith("@newsletter")


def normalize_group_module_type(value, jid=None, metadata=None):
    text = str(value or "").strip().lower()
    if text in {"grupo", "comunidad", "canal"}:
        return text

    normalized_jid = normalize_jid(jid).lower()
    metadata = metadata or {}
    if normalized_jid.endswith("@newsletter") or metadata.get("isNewsletter") or metadata.get("isChannel") or metadata.get("newsletter"):
        return "canal"

    if (
        metadata.get("isCommunity")
        or metadata.get("isCommunityAnnounce")
    ):
        return "comunidad"

    return "grupo"


def is_user_jid(jid):
    return normalize_jid(jid).endswith("@s.whatsapp.net")


# JIDs de cuentas del sistema de WhatsApp que nunca deben aparecer en la lista de chats
BLOCKED_SYSTEM_JIDS = {
    "0@s.whatsapp.net",          # Meta AI cuenta oficial
    "status@broadcast",           # WhatsApp status broadcast
    "announcement@broadcast",     # WhatsApp announcements
}

# Nombres de contactos bloqueados (sistema/bots) — nunca deben aparecer en la lista de chats
BLOCKED_CONTACT_NAMES = {
    "meta ai",
    "meta ai verified",
}


def is_blocked_contact_name(name):
    """Retorna True si el nombre corresponde a un contacto del sistema bloqueado."""
    if not name:
        return False
    normalized = str(name).strip().lower()
    if normalized in BLOCKED_CONTACT_NAMES:
        return True
    if normalized.startswith("meta ai"):
        return True
    return False


def is_status_broadcast_jid(jid):
    return normalize_jid(jid).lower() == "status@broadcast"


def is_technical_jid(jid):
    normalized = normalize_jid(jid).lower()
    if normalized in BLOCKED_SYSTEM_JIDS:
        return True
    return is_status_broadcast_jid(normalized) or "@broadcast" in normalized


def is_supported_chat_jid(jid):
    normalized = normalize_jid(jid)
    if normalized.lower() in BLOCKED_SYSTEM_JIDS:
        return False
    if is_status_broadcast_jid(normalized):
        return False
    # Permissive: allow user, group, channel and lid formats
    return bool(normalized and not is_technical_jid(normalized) and (is_user_jid(normalized) or is_group_jid(normalized) or is_newsletter_jid(normalized) or "@lid" in normalized.lower()))


def clean_related_jid(value):
    normalized = normalize_jid(value)
    return normalized if is_supported_chat_jid(normalized) else None


def phone_from_jid(jid):
    normalized = normalize_jid(jid)
    user = normalized.split("@")[0].split(":")[0]
    digits = normalize_phone_digits(user)
    return digits or user or "sin_numero"


def parse_webhook_datetime(value):
    from datetime import timedelta
    ecuador_now = datetime.utcnow() - timedelta(hours=5)

    if not value:
        return ecuador_now

    if isinstance(value, datetime):
        return value

    try:
        if isinstance(value, (int, float)):
            # Si el timestamp viene de bridge.js, ya le restamos 5 horas allá 
            # o es un timestamp Unix puro. Si es Unix puro, fromtimestamp usa hora local.
            # Para ser consistentes:
            return datetime.utcfromtimestamp(value) - timedelta(hours=5)

        text = str(value).strip().replace("Z", "")
        dt = datetime.fromisoformat(text.replace(" ", "T"))
        # Si ya tiene una fecha, asumimos que es la que queremos o la ajustamos si viene en ISO UTC
        return dt
    except (TypeError, ValueError):
        return ecuador_now


def to_mysql_datetime(value):
    return parse_webhook_datetime(value).strftime("%Y-%m-%d %H:%M:%S")


def unix_seconds(value):
    return int(parse_webhook_datetime(value).timestamp())


def parse_bool(value):
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return value != 0
    if isinstance(value, str):
        return value.strip().lower() in {"1", "true", "yes", "si", "sí"}
    return False


def looks_like_phone_alias(value, row):
    text = str(value or "").strip()
    if not text:
        return True

    jid = str(row.get("jid") or "")
    phone = str(row.get("telefono") or "")
    jid_user = jid.split("@")[0].split(":")[0] if jid else ""
    lowered = text.lower()

    if (
        "@lid" in lowered
        or "@broadcast" in lowered
        or lowered.endswith("@s.whatsapp.net")
        or lowered.endswith("@g.us")
    ):
        return True

    if text in {jid, jid_user, phone}:
        return True

    text_digits = digits_only(text)
    phone_digits = digits_only(phone) or digits_only(jid_user)

    return bool(text_digits and phone_digits and text_digits == phone_digits and len(text_digits) >= 6)


def first_display_candidate(row, fields):
    for field in fields:
        value = str(row.get(field) or "").strip()
        if value and not looks_like_phone_alias(value, row):
            return value
    return None


def clean_name_value(value, jid):
    text = clean_text(value)
    if not text:
        return None

    # Si es un grupo, aceptamos el nombre tal cual (siempre que no sea el JID mismo)
    if is_group_jid(jid):
        return None if text == jid else text

    row = {
        "jid": jid,
        "telefono": phone_from_jid(jid),
    }
    return None if looks_like_phone_alias(text, row) else text


def contact_display_name(row):
    return (
        first_display_candidate(row, ("nombre", "push_name", "verified_name", "notify_name"))
        or row.get("telefono")
        or "Contacto de WhatsApp"
    )


def public_media_url(value):
    media_path = str(value or "").strip()
    if not media_path:
        return None

    if media_path.startswith(("http://", "https://")):
        return media_path

    clean_file = (
        media_path.replace("\\", "/")
        .replace("media/", "")
        .replace("uploads/", "")
        .lstrip("/")
    )

    try:
        base_url = request.host_url.rstrip("/")
        # Forzar HTTPS si el host no es localhost (ej: ngrok, producción)
        if "localhost" not in base_url and "127.0.0.1" not in base_url:
            base_url = base_url.replace("http://", "https://")
    except RuntimeError:
        base_url = "http://localhost:5000"

    return f"{base_url}/media/{clean_file}"


def local_media_file_size(value):
    media_path = str(value or "").strip()
    if not media_path or media_path.startswith(("http://", "https://")):
        return None

    clean_file = (
        media_path.replace("\\", "/")
        .replace("media/", "")
        .replace("uploads/", "")
        .lstrip("/")
    )
    local_path = os.path.join(MEDIA_FOLDER, *clean_file.split("/"))

    try:
        return os.path.getsize(local_path) if os.path.isfile(local_path) else None
    except OSError:
        return None


def resolve_media_local_path(value):
    path = str(value or "").strip()
    if not path:
        return None
    if path.startswith(("http://", "https://")):
        if "/media/" in path:
            filename = path.split("/media/")[-1]
            local_path = os.path.join(MEDIA_FOLDER, *filename.split("/"))
            if os.path.exists(local_path):
                return local_path
        # Descargar si es una URL externa
        try:
            import requests
            import uuid
            temp_dir = os.path.join(MEDIA_FOLDER, "temp")
            os.makedirs(temp_dir, exist_ok=True)
            temp_path = os.path.join(temp_dir, f"{uuid.uuid4().hex}.ogg")
            r = requests.get(path, timeout=15)
            if r.status_code == 200:
                with open(temp_path, 'wb') as f:
                    f.write(r.content)
                return temp_path
        except Exception as e:
            logger.error(f"Error descargando media externo: {e}")
            return None
    else:
        clean_file = path.replace("\\", "/").replace("media/", "").replace("uploads/", "").lstrip("/")
        local_path = os.path.join(MEDIA_FOLDER, *clean_file.split("/"))
        if os.path.exists(local_path):
            return local_path
    return None


def transcribe_audio_with_gemini(local_path, gemini_key):
    import base64
    import requests
    try:
        mime_type = "audio/ogg"
        if local_path.endswith(".mp3"): mime_type = "audio/mp3"
        elif local_path.endswith(".wav"): mime_type = "audio/wav"
        elif local_path.endswith(".m4a"): mime_type = "audio/m4a"
        
        with open(local_path, "rb") as f:
            audio_data = base64.b64encode(f.read()).decode("utf-8")
            
        payload = {
            "contents": [
                {
                    "parts": [
                        {
                            "inlineData": {
                                "mimeType": mime_type,
                                "data": audio_data
                            }
                        },
                        {
                            "text": "Transcribe este audio en español. Devuelve únicamente el texto transcrito, sin explicaciones ni puntuaciones adicionales."
                        }
                    ]
                }
            ]
        }
        api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
        r = requests.post(api_url, json=payload, timeout=30)
        if r.status_code == 200:
            res_json = r.json()
            parts = res_json.get('candidates', [{}])[0].get('content', {}).get('parts', [{}])
            transcription = parts[0].get('text', '')
            return transcription.strip()
        else:
            logger.error(f"Error llamando a Gemini para transcribir: {r.status_code} - {r.text}")
    except Exception as e:
        logger.error(f"Error transcribiendo audio con Gemini: {e}")
    return None


def transcribe_audio_with_whisper(local_path, openai_key):
    import requests
    try:
        url = "https://api.openai.com/v1/audio/transcriptions"
        headers = {"Authorization": f"Bearer {openai_key}"}
        with open(local_path, "rb") as f:
            files = {"file": f}
            data = {"model": "whisper-1", "language": "es"}
            r = requests.post(url, headers=headers, files=files, data=data, timeout=30)
            if r.status_code == 200:
                return r.json().get("text", "").strip()
            else:
                logger.error(f"Error llamando a Whisper: {r.status_code} - {r.text}")
    except Exception as e:
        logger.error(f"Error transcribiendo audio con Whisper: {e}")
    return None




def webhook_display_name(data, jid):
    is_group = "@g.us" in str(jid)
    
    # Si es un grupo, SOLO aceptamos campos de grupo
    if is_group:
        for key in ("subject", "groupName", "group_subject"):
            value = clean_name_value(data.get(key), jid)
            if value: return value
        return None

    # Si es contacto personal, seguimos el orden normal
    for key in ("nombre", "verified_name", "display_name", "push_name", "notify_name"):
        value = clean_name_value(data.get(key), jid)
        if value: return value
        
    return None

def ensure_tags_tables(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            descripcion TEXT,
            color VARCHAR(20) DEFAULT '#10b981',
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contactos_tags (
            id INT AUTO_INCREMENT PRIMARY KEY,
            contacto_id INT NOT NULL,
            tag_id INT NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE KEY idx_contact_tag (contacto_id, tag_id),
            INDEX idx_tag (tag_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

def ensure_contact_custom_tables(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS campos_customizados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            tipo VARCHAR(50) NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS contacto_campos_customizados (
            id INT AUTO_INCREMENT PRIMARY KEY,
            contacto_id INT NOT NULL,
            campo_id INT NOT NULL,
            valor TEXT,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            UNIQUE KEY idx_contact_field (contacto_id, campo_id),
            INDEX idx_field (campo_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

def ensure_metrics_tables(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS metricas_dashboard (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            config_json LONGTEXT NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_user (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

@app.route('/api/agents', methods=['GET'])
@jwt_required()
def list_agents():
    """Devuelve la lista de usuarios del equipo (admin + colaboradores) como agentes de asignación."""
    conn = None
    cursor = None
    try:
        user_id = int(get_jwt_identity())
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Obtener el admin_id (si el usuario actual es un colaborador, buscamos su parent_id)
        cursor.execute("SELECT id, parent_id FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
        user_row = cursor.fetchone()
        admin_id = user_row["parent_id"] if (user_row and user_row.get("parent_id")) else user_id
        
        # Obtener todos los usuarios del equipo (el administrador y todos sus colaboradores)
        cursor.execute(
            """
            SELECT id, nombre, correo, rol, foto_perfil
            FROM usuarios
            WHERE id = %s OR parent_id = %s
            ORDER BY id ASC
            """,
            (admin_id, admin_id)
        )
        users = cursor.fetchall()
        agents = []
        for u in users:
            name = u["nombre"] + " (Yo)" if u["id"] == user_id else u["nombre"]
            agents.append({
                "id": u["id"],
                "nombre": name,
                "correo": u["correo"],
                "rol": u["rol"],
                "foto_perfil": public_media_url(u.get("foto_perfil"))
            })
        return jsonify({"success": True, "agents": agents})
    except Exception as e:
        logger.error(f"Error listing human agents: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/tags', methods=['GET'])
@jwt_required()
def list_tags():
    user_id = get_jwt_identity()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_tags_tables(cursor)
        # Optimizamos la consulta para contar contactos únicos y filtrar por usuario
        cursor.execute("""
            SELECT t.*, COUNT(DISTINCT ct.contacto_id) as total_contactos
            FROM tags t
            LEFT JOIN contactos_tags ct ON ct.tag_id = t.id
            WHERE t.usuario_id = %s
            GROUP BY t.id
            ORDER BY t.creado_en DESC
        """, (user_id,))
        tags = cursor.fetchall()
        logger.info(f"TAGS: Listados {len(tags)} tags para usuario {user_id}")
        return jsonify({"success": True, "tags": tags})
    except Exception as e:
        logger.error(f"ERROR LIST TAGS: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/metrics/entities', methods=['GET'])
@jwt_required()
def get_metrics_entities():
    user_id = get_jwt_identity()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        # Fetch Tags
        ensure_tags_tables(cursor)
        cursor.execute("SELECT id, nombre FROM tags WHERE usuario_id = %s", (user_id,))
        tags = cursor.fetchall()
        
        # Fetch Groups
        cursor.execute("""
            SELECT g.id, g.nombre 
            FROM grupos g 
            JOIN dispositivos d ON g.dispositivo_id = d.id 
            WHERE d.usuario_id = %s
        """, (user_id,))
        groups = cursor.fetchall()
        
        return jsonify({
            "success": True,
            "tags": tags,
            "groups": groups
        })
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/metrics/dashboard', methods=['GET'])
@jwt_required()
def get_metrics_dashboard():
    user_id = get_jwt_identity()
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_metrics_tables(cursor)
        cursor.execute("SELECT config_json FROM metricas_dashboard WHERE usuario_id = %s", (user_id,))
        row = cursor.fetchone()
        if row:
            return jsonify({"success": True, "cards": json.loads(row['config_json'])})
        return jsonify({"success": True, "cards": []})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/metrics/dashboard', methods=['POST'])
@jwt_required()
def save_metrics_dashboard():
    user_id = get_jwt_identity()
    data = request.json
    cards = data.get('cards', [])
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        ensure_metrics_tables(cursor)
        config_json = json.dumps(cards)
        
        # Upsert
        cursor.execute("SELECT id FROM metricas_dashboard WHERE usuario_id = %s", (user_id,))
        if cursor.fetchone():
            cursor.execute(
                "UPDATE metricas_dashboard SET config_json = %s WHERE usuario_id = %s",
                (config_json, user_id)
            )
        else:
            cursor.execute(
                "INSERT INTO metricas_dashboard (usuario_id, config_json) VALUES (%s, %s)",
                (user_id, config_json)
            )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/metrics/stats', methods=['POST'])
@jwt_required()
def get_metrics_stats():
    user_id = get_jwt_identity()
    card_config = request.json
    
    category = card_config.get('category')
    period = card_config.get('period', '7d')
    tags = card_config.get('tags', [])
    participants = card_config.get('participants', []) # For communities
    
    # Calculate date range
    days = 7
    if period == '24h': days = 1
    elif period == '30d': days = 30
    elif period == '90d': days = 90
    
    end_date = datetime.now()
    start_date = end_date - timedelta(days=days)
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    
    try:
        data = []
        total = 0
        
        if category == 'contactos_nuevos':
            query = """
                SELECT DATE(c.creado_en) as date, COUNT(*) as value
                FROM contactos c
                JOIN dispositivos d ON c.dispositivo_id = d.id
                WHERE d.usuario_id = %s AND c.creado_en >= %s
            """
            params = [user_id, start_date]
            
            if tags:
                query += " AND id IN (SELECT contacto_id FROM contactos_tags WHERE tag_id IN (%s))" % ",".join(["%s"] * len(tags))
                params.extend(tags)
                
            query += " GROUP BY DATE(creado_en) ORDER BY DATE(creado_en) ASC"
            cursor.execute(query, params)
            data = cursor.fetchall()
            total = sum(d['value'] for d in data)
            
        elif category == 'mensajes_recibidos':
            # Note: The 'mensajes' table needs to be linked to user through device
            query = """
                SELECT DATE(fecha_mensaje) as date, COUNT(*) as value
                FROM mensajes m
                JOIN dispositivos d ON m.dispositivo_id = d.id
                WHERE d.usuario_id = %s AND m.es_mio = 0 AND m.fecha_mensaje >= %s
            """
            params = [user_id, start_date]
            query += " GROUP BY DATE(fecha_mensaje) ORDER BY DATE(fecha_mensaje) ASC"
            cursor.execute(query, params)
            data = cursor.fetchall()
            total = sum(d['value'] for d in data)
            
        elif category == 'cantidad_participantes':
            # Logic: Total unique participants in user's groups
            query = """
                SELECT DATE(pg.creado_en) as date, COUNT(DISTINCT pg.contacto_id) as value
                FROM participantes_grupo pg
                JOIN grupos g ON pg.grupo_id = g.id
                JOIN dispositivos d ON g.dispositivo_id = d.id
                WHERE d.usuario_id = %s AND pg.creado_en >= %s
            """
            params = [user_id, start_date]
            if participants: # If filtered by specific group
                query += " AND g.id IN (%s)" % ",".join(["%s"] * len(participants))
                params.extend(participants)
            
            query += " GROUP BY DATE(pg.creado_en) ORDER BY DATE(pg.creado_en) ASC"
            cursor.execute(query, params)
            data = cursor.fetchall()
            total = cursor.rowcount # Or just current count
            # For "cantidad_participantes", we might just want the current total if no period is relevant for "total"
            cursor.execute("SELECT COUNT(DISTINCT pg.contacto_id) as total FROM participantes_grupo pg JOIN grupos g ON pg.grupo_id = g.id JOIN dispositivos d ON g.dispositivo_id = d.id WHERE d.usuario_id = %s", (user_id,))
            total = cursor.fetchone()['total']

        elif category == 'contactos_tag':
            # Distribution of contacts by tag
            query = """
                SELECT t.nombre as label, COUNT(ct.contacto_id) as value
                FROM tags t
                LEFT JOIN contactos_tags ct ON t.id = ct.tag_id
                WHERE t.usuario_id = %s
            """
            params = [user_id]
            if tags:
                query += " AND t.id IN (%s)" % ",".join(["%s"] * len(tags))
                params.extend(tags)
            query += " GROUP BY t.id"
            cursor.execute(query, params)
            data = cursor.fetchall()
            total = sum(d['value'] for d in data)
            return jsonify({"success": True, "total": total, "data": data})

        elif category == 'contactos_pais':
            # Distribution by country (assuming 'pais' field exists or can be derived from phone)
            # For now, let's group by the first 3 digits of the phone as a proxy if 'pais' is missing
            query = """
                SELECT 
                    CASE 
                        WHEN telefono LIKE '593%' THEN 'Ecuador'
                        WHEN telefono LIKE '57%' THEN 'Colombia'
                        WHEN telefono LIKE '51%' THEN 'Perú'
                        WHEN telefono LIKE '52%' THEN 'México'
                        WHEN telefono LIKE '1%' THEN 'USA/Canada'
                        ELSE 'Otros'
                    END as label,
                    COUNT(*) as value
                FROM contactos c
                JOIN dispositivos d ON c.dispositivo_id = d.id
                WHERE d.usuario_id = %s
                GROUP BY label
            """
            cursor.execute(query, [user_id])
            data = cursor.fetchall()
            total = sum(d['value'] for d in data)
            return jsonify({"success": True, "total": total, "data": data})

        elif category in ['clics_en_enlaces', 'cantidad_clics']:
            query = """
                SELECT DATE(clicked_at) as date, COUNT(*) as value
                FROM whalink_clicks
                WHERE whalink_id IN (SELECT id FROM whalinks WHERE user_id = %s)
                AND clicked_at >= %s
                GROUP BY DATE(clicked_at) ORDER BY DATE(clicked_at) ASC
            """
            cursor.execute(query, [user_id, start_date])
            data = cursor.fetchall()
            total = sum(d['value'] for d in data)

        elif category == 'cantidad_grupos':
            cursor.execute("""
                SELECT DATE(g.creado_en) as date, COUNT(*) as value
                FROM grupos g
                JOIN dispositivos d ON g.dispositivo_id = d.id
                WHERE d.usuario_id = %s AND g.creado_en >= %s
                GROUP BY DATE(g.creado_en) ORDER BY DATE(g.creado_en) ASC
            """, (user_id, start_date))
            data = cursor.fetchall()
            cursor.execute("""
                SELECT COUNT(*) as total FROM grupos g
                JOIN dispositivos d ON g.dispositivo_id = d.id
                WHERE d.usuario_id = %s
            """, (user_id,))
            total = cursor.fetchone()['total'] or 0

        elif category == 'cantidad_ingresos_salidas':
            # Events linked to groups or participants
            cursor.execute("""
                SELECT DATE(creado_en) as date, COUNT(*) as value
                FROM participantes_grupo pg
                JOIN grupos g ON pg.grupo_id = g.id
                JOIN dispositivos d ON g.dispositivo_id = d.id
                WHERE d.usuario_id = %s AND pg.creado_en >= %s
                GROUP BY DATE(creado_en) ORDER BY DATE(creado_en) ASC
            """, (user_id, start_date))
            data = cursor.fetchall()
            total = sum(d['value'] for d in data)

        elif category == 'insights_ia':
            cursor.execute("""
                SELECT 
                    SUM(CASE WHEN m.texto LIKE '%gracias%' OR m.texto LIKE '%bueno%' OR m.texto LIKE '%quiero%' OR m.texto LIKE '%comprar%' THEN 1 ELSE 0 END) as positivo,
                    SUM(CASE WHEN m.texto LIKE '%error%' OR m.texto LIKE '%problema%' OR m.texto LIKE '%mal%' OR m.texto LIKE '%no sirve%' THEN 1 ELSE 0 END) as negativo,
                    COUNT(*) as total
                FROM mensajes m
                JOIN dispositivos d ON m.dispositivo_id = d.id
                WHERE d.usuario_id = %s AND m.fecha_mensaje >= %s
            """, (user_id, start_date))
            res = cursor.fetchone()
            total = res['total'] or 0
            pos = res['positivo'] or 0
            neg = res['negativo'] or 0
            neu = max(0, total - pos - neg)
            
            data = [
                {"label": "Positivo", "value": pos},
                {"label": "Neutro", "value": neu},
                {"label": "Negativo", "value": neg}
            ]
            return jsonify({"success": True, "total": total, "data": data})

        elif category == 'heatmap_actividad':
            cursor.execute("""
                SELECT WEEKDAY(m.fecha_mensaje) as day, HOUR(m.fecha_mensaje) as hour, COUNT(*) as value
                FROM mensajes m
                JOIN dispositivos d ON m.dispositivo_id = d.id
                WHERE d.usuario_id = %s AND m.fecha_mensaje >= %s
                GROUP BY day, hour
            """, (user_id, start_date))
            data = cursor.fetchall()
            total = sum(d['value'] for d in data)
            return jsonify({"success": True, "total": total, "data": data})

        elif category == 'monitor_pulse':
            cursor.execute("""
                SELECT COUNT(*) as messages
                FROM mensajes m
                JOIN dispositivos d ON m.dispositivo_id = d.id
                WHERE d.usuario_id = %s AND m.fecha_mensaje >= NOW() - INTERVAL 1 DAY
            """, (user_id,))
            msg_count = cursor.fetchone()['messages']
            data = [{"label": "Live", "value": msg_count}]
            return jsonify({"success": True, "total": msg_count, "data": data})

        elif category == 'ranking_agentes':
            cursor.execute("""
                SELECT a.nombre as label, COUNT(m.id) as value
                FROM agentes_ia a
                LEFT JOIN mensajes m ON m.dispositivo_id = a.dispositivo_id AND m.es_mio = 1
                WHERE a.usuario_id = %s
                GROUP BY a.id
                ORDER BY value DESC
            """, (user_id,))
            data = cursor.fetchall()
            total = sum(d['value'] for d in data)
            return jsonify({"success": True, "total": total, "data": data})

        elif category == 'conversiones_leads':
            query = """
                SELECT DATE(creado_en) as date, COUNT(*) as value
                FROM whalink_leads wl
                JOIN whalinks w ON wl.whalink_id = w.id
                WHERE w.user_id = %s AND wl.creado_en >= %s
                GROUP BY DATE(creado_en) ORDER BY DATE(creado_en) ASC
            """
            cursor.execute(query, [user_id, start_date])
            data = cursor.fetchall()
            total = sum(d['value'] for d in data)

        # Format data for charts
        chart_data = []
        # Fill missing dates to make the chart smooth
        curr = start_date
        data_map = {str(d['date']): d['value'] for d in data}
        while curr <= end_date:
            d_str = curr.strftime('%Y-%m-%d')
            chart_data.append({
                "date": d_str,
                "value": data_map.get(d_str, 0)
            })
            curr += timedelta(days=1)

        return jsonify({
            "success": True, 
            "total": total,
            "data": chart_data
        })
    except Exception as e:
        logger.error(f"Error in metrics stats: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/tags', methods=['POST'])
@jwt_required()
def create_tag():
    role_err = require_admin_role()
    if role_err:
        return role_err
    user_id = get_jwt_identity()
    data = request.json
    nombre = data.get('nombre')
    descripcion = data.get('descripcion')
    color = data.get('color', '#10b981')
    
    if not nombre:
        return jsonify({"success": False, "message": "Nombre es obligatorio"}), 400
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        ensure_tags_tables(cursor)
        cursor.execute(
            "INSERT INTO tags (usuario_id, nombre, descripcion, color) VALUES (%s, %s, %s, %s)",
            (user_id, nombre, descripcion, color)
        )
        conn.commit()
        return jsonify({"success": True, "tag_id": cursor.lastrowid})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/tags/<int:id>', methods=['PUT'])
@jwt_required()
def update_tag(id):
    role_err = require_admin_role()
    if role_err:
        return role_err
    user_id = get_jwt_identity()
    data = request.json
    nombre = data.get('nombre')
    descripcion = data.get('descripcion')
    color = data.get('color')
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE tags SET nombre = %s, descripcion = %s, color = %s WHERE id = %s AND usuario_id = %s",
            (nombre, descripcion, color, id, user_id)
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/tags/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_tag(id):
    role_err = require_admin_role()
    if role_err:
        return role_err
    user_id = get_jwt_identity()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM tags WHERE id = %s AND usuario_id = %s", (id, user_id))
        cursor.execute("DELETE FROM contactos_tags WHERE tag_id = %s", (id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def serialize_contact(row):
    return {
        "id": row["id"],
        "dispositivo_id": row.get("dispositivo_id"),
        "dispositivo_nombre": row.get("dispositivo_nombre"),
        "dispositivo_estado": row.get("dispositivo_estado"),
        "jid": row.get("jid"),
        "lid": row.get("lid"),
        "telefono": row.get("telefono"),
        "nombre": row.get("nombre"),
        "display_name": contact_display_name(row),
        "foto_perfil": public_media_url(row.get("foto_perfil")),
        "correo": row.get("correo"),
        "empresa": row.get("empresa"),
        "estado_lead": row.get("estado_lead") or "nuevo",
        "agente_asignado_id": row.get("agente_asignado_id"),
        "agente_asignado_nombre": row.get("agente_asignado_nombre"),
        "mensajes_sin_leer": int(row.get("mensajes_sin_leer") or 0),
        "ultimo_mensaje": row.get("ultimo_mensaje"),
        "ultima_vez_visto": as_json_value(row.get("ultima_vez_visto")),
        "creado_en": as_json_value(row.get("creado_en")),
        "actualizado_en": as_json_value(row.get("actualizado_en")),
        "push_name": row.get("push_name"),
        "verified_name": row.get("verified_name"),
        "notify_name": row.get("notify_name"),
        "last_timestamp": row.get("last_timestamp"),
        "last_media_type": row.get("last_media_type"),
        "is_group": str(row.get("jid") or "").endswith("@g.us"),
        "tags": parse_raw_tags(row.get("tags_raw")),
        "fields": parse_raw_fields(row.get("fields_raw")),
        "es_mio": bool(row.get("ultimo_mensaje_es_mio") or False),
        "estado": int(row.get("ultimo_mensaje_estado") or 0),
    }

def parse_raw_tags(raw_str):
    if not raw_str:
        return []
    tags = []
    try:
        # Formato: id|nombre|color;;id|nombre|color
        for item in raw_str.split(';;'):
            if not item: continue
            parts = item.split('|')
            if len(parts) >= 3:
                tags.append({
                    "id": int(parts[0]),
                    "nombre": parts[1],
                    "color": parts[2]
                })
    except:
        pass
    return tags

def parse_raw_fields(raw_str):
    if not raw_str:
        return []
    fields = []
    try:
        # Formato: id|nombre|valor;;id|nombre|valor
        for item in raw_str.split(';;'):
            if not item: continue
            parts = item.split('|')
            if len(parts) >= 3:
                fields.append({
                    "id": int(parts[0]),
                    "nombre": parts[1],
                    "valor": parts[2]
                })
    except:
        pass
    return fields


def serialize_group_chat(row):
    last_date = row.get("ultimo_mensaje_fecha") or row.get("actualizado_en") or row.get("creado_en")
    display_name = row.get("nombre") or "Grupo de WhatsApp"

    return {
        "id": f"grupo-{row['id']}",
        "grupo_id": row["id"],
        "dispositivo_id": row.get("dispositivo_id"),
        "dispositivo_nombre": row.get("dispositivo_nombre"),
        "dispositivo_estado": row.get("dispositivo_estado"),
        "jid": row.get("jid"),
        "telefono": None,
        "nombre": row.get("nombre"),
        "display_name": display_name,
        "foto_perfil": public_media_url(row.get("foto_perfil")),
        "correo": None,
        "empresa": row.get("descripcion"),
        "estado_lead": "nuevo",
        "agente_asignado_id": None,
        "mensajes_sin_leer": int(row.get("mensajes_sin_leer") or 0),
        "ultimo_mensaje": row.get("ultimo_mensaje"),
        "ultimo_mensaje_fecha": as_json_value(last_date),
        "ultima_vez_visto": as_json_value(last_date),
        "creado_en": as_json_value(row.get("creado_en")),
        "actualizado_en": as_json_value(row.get("actualizado_en")),
        "push_name": None,
        "verified_name": None,
        "notify_name": None,
        "participants_json": None,
        "last_timestamp": row.get("last_timestamp") or row.get("sort_timestamp"),
        "last_media_type": row.get("last_media_type") or "texto",
        "is_group": True,
        "sort_timestamp": row.get("sort_timestamp") or row.get("last_timestamp") or 0,
        "es_mio": bool(row.get("ultimo_mensaje_es_mio") or False),
        "estado": int(row.get("ultimo_mensaje_estado") or 0),
    }


def chat_sort_score(chat):
    if chat.get("ultimo_mensaje_fecha"):
        try:
            return parse_webhook_datetime(chat.get("ultimo_mensaje_fecha")).timestamp()
        except (TypeError, ValueError):
            pass

    try:
        return int(chat.get("sort_timestamp") or chat.get("last_timestamp") or 0)
    except (TypeError, ValueError):
        return 0


def dedupe_chats_by_jid(chats):
    unique = {}
    aliases = {}

    for chat in sorted(chats, key=chat_sort_score, reverse=True):
        jid = normalize_jid(chat.get("jid"))
        dev_id = chat.get("dispositivo_id") or "unknown"
        key = f"{dev_id}_{jid}"

        if not jid or key in unique:
            continue

        is_lid = "@lid" in jid.lower()
        alias = None
        display_name = contact_display_name(chat)
        if display_name and not looks_like_phone_alias(display_name, chat):
            alias = display_name.strip().lower()

        alias_key = f"{dev_id}_{alias}" if alias else None

        if alias_key and alias_key in aliases and (is_lid or aliases[alias_key]):
            continue

        chat["jid"] = jid
        unique[key] = chat
        if alias_key and (is_lid or alias_key not in aliases):
            aliases[alias_key] = is_lid

    return list(unique.values())


def serialize_message(row):
    return {
        "id": row["id"],
        "mensaje_id": row.get("mensaje_id"),
        "dispositivo_id": row.get("dispositivo_id"),
        "chat_jid": row.get("chat_jid"),
        "de_jid": row.get("de_jid"),
        "es_mio": bool(row.get("es_mio") or False),
        "es_grupo": bool(row.get("es_grupo") or False),
        "texto": row.get("texto"),
        "tipo": row.get("tipo") or "texto",
        "url_media": public_media_url(row.get("url_media")),
        "media_size": local_media_file_size(row.get("url_media")),
        "mime_media": row.get("mime_media"),
        "nombre_archivo": row.get("nombre_archivo"),
        "estado": int(row.get("estado") or 0),
        "fecha_mensaje": as_json_value(row.get("fecha_mensaje")),
        "creado_en": as_json_value(row.get("creado_en")),
        "participant_jid": row.get("participant_jid"),
        "push_name": row.get("push_name"),
        "reaccion": row.get("reaccion"),
        "quoted_message_id": row.get("quoted_message_id"),
        "quoted_text": row.get("quoted_text"),
        "fijado": bool(row.get("fijado") or False),
        "destacado": bool(row.get("destacado") or False),
        "agente_nombre": row.get("agente_nombre"),
    }


def ensure_chats_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS chats (
            id int(11) NOT NULL AUTO_INCREMENT,
            dispositivo_id int(11) NOT NULL,
            jid varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
            tipo enum('contacto','grupo') COLLATE utf8mb4_unicode_ci DEFAULT 'contacto',
            nombre varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            mensajes_sin_leer int(11) DEFAULT '0',
            ultimo_mensaje text COLLATE utf8mb4_unicode_ci,
            ultimo_mensaje_fecha datetime DEFAULT NULL,
            last_timestamp int(11) DEFAULT NULL,
            last_media_type varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            creado_en datetime DEFAULT CURRENT_TIMESTAMP,
            actualizado_en datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY chat_unico (dispositivo_id, jid),
            KEY idx_chats_orden (dispositivo_id, last_timestamp),
            CONSTRAINT chats_ibfk_1 FOREIGN KEY (dispositivo_id) REFERENCES dispositivos (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    # Migración automática rápida para agente_nombre en mensajes
    try:
        cursor.execute("SHOW COLUMNS FROM mensajes LIKE 'agente_nombre'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE mensajes ADD COLUMN agente_nombre VARCHAR(100) DEFAULT NULL")
    except Exception as e:
        logger.warning(f"No se pudo verificar/agregar columna agente_nombre: {e}")

    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'chats'
          AND COLUMN_NAME = 'nombre'
        """
    )
    row = cursor.fetchone()
    total = row.get("total") if isinstance(row, dict) else row[0]
    if int(total or 0) > 0:
        return

    cursor.execute(
        """
        ALTER TABLE chats
        ADD COLUMN nombre varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL
        AFTER tipo
        """
    )


def get_table_columns(cursor, table_name):
    cursor.execute(
        """
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = %s
        """,
        (table_name,),
    )
    return {
        row.get("COLUMN_NAME") if isinstance(row, dict) else row[0]
        for row in cursor.fetchall()
    }


def ensure_tableros_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS tableros (
            id int(11) NOT NULL AUTO_INCREMENT,
            usuario_id int(11) NOT NULL,
            nombre varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
            creado_en datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_tableros_user (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )

def ensure_etapas_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS etapas (
            id int(11) NOT NULL AUTO_INCREMENT,
            tablero_id int(11) DEFAULT NULL,
            user_id int(11) NOT NULL,
            nombre varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
            orden int(11) DEFAULT '0',
            creado_en datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_etapas_tablero (tablero_id),
            KEY idx_etapas_user (user_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    # Verificar si falta tablero_id (migración)
    cursor.execute("SHOW COLUMNS FROM etapas LIKE 'tablero_id'")
    if not cursor.fetchone():
        cursor.execute("ALTER TABLE etapas ADD COLUMN tablero_id int(11) DEFAULT NULL AFTER id")


def ensure_automation_folders_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS automatizacion_carpetas (
            id int(11) NOT NULL AUTO_INCREMENT,
            usuario_id int(11) NOT NULL,
            nombre varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
            parent_id int(11) DEFAULT NULL,
            creado_en datetime DEFAULT CURRENT_TIMESTAMP,
            actualizado_en datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_automatizacion_carpetas_usuario (usuario_id),
            KEY idx_automatizacion_carpetas_parent (parent_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def ensure_automatizaciones_folder_column(cursor):
    columns = get_table_columns(cursor, "automatizaciones")

    if "carpeta_id" not in columns:
        cursor.execute(
            """
            ALTER TABLE automatizaciones
            ADD COLUMN carpeta_id int(11) DEFAULT NULL
            AFTER dispositivo_id
            """
        )

    if not table_has_index(cursor, "automatizaciones", "idx_automatizaciones_carpeta"):
        cursor.execute(
            """
            ALTER TABLE automatizaciones
            ADD KEY idx_automatizaciones_carpeta (carpeta_id)
            """
        )


def ensure_rotator_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS registros_rotador (
            automation_id INT NOT NULL,
            node_id VARCHAR(100) NOT NULL,
            last_index INT NOT NULL DEFAULT 0,
            PRIMARY KEY (automation_id, node_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def ensure_automation_schema(cursor):
    ensure_automation_folders_table(cursor)
    ensure_automatizaciones_folder_column(cursor)
    ensure_rotator_table(cursor)


def table_has_index(cursor, table_name, index_name):
    cursor.execute(
        """
        SELECT 1
        FROM INFORMATION_SCHEMA.STATISTICS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = %s
          AND INDEX_NAME = %s
        LIMIT 1
        """,
        (table_name, index_name),
    )
    return bool(cursor.fetchone())


def ensure_whalinks_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS whalinks (
            id int(11) NOT NULL AUTO_INCREMENT,
            user_id int(11) NOT NULL,
            device_id int(11) NOT NULL,
            nombre varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
            mensaje text COLLATE utf8mb4_unicode_ci NOT NULL,
            url_generada varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
            short_code varchar(12) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            imagen_url longtext COLLATE utf8mb4_unicode_ci,
            descripcion text COLLATE utf8mb4_unicode_ci,
            clave_nombre varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            clave_correo varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            pixel_tracking text COLLATE utf8mb4_unicode_ci,
            total_clics int(11) DEFAULT '0',
            fecha_creacion datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            UNIQUE KEY short_code_unico (short_code),
            KEY idx_whalinks_user_device (user_id, device_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )

    columns = get_table_columns(cursor, "whalinks")
    missing_columns = {
        "user_id": "ADD COLUMN user_id int(11) NULL AFTER id",
        "device_id": "ADD COLUMN device_id int(11) NULL AFTER user_id",
        "nombre": "ADD COLUMN nombre varchar(150) COLLATE utf8mb4_unicode_ci NULL AFTER device_id",
        "mensaje": "ADD COLUMN mensaje text COLLATE utf8mb4_unicode_ci NULL AFTER nombre",
        "url_generada": "ADD COLUMN url_generada varchar(500) COLLATE utf8mb4_unicode_ci NULL AFTER mensaje",
        "short_code": "ADD COLUMN short_code varchar(12) COLLATE utf8mb4_unicode_ci NULL AFTER url_generada",
        "imagen_url": "ADD COLUMN imagen_url longtext COLLATE utf8mb4_unicode_ci NULL AFTER short_code",
        "descripcion": "ADD COLUMN descripcion text COLLATE utf8mb4_unicode_ci NULL AFTER imagen_url",
        "clave_nombre": "ADD COLUMN clave_nombre varchar(100) COLLATE utf8mb4_unicode_ci NULL AFTER descripcion",
        "clave_correo": "ADD COLUMN clave_correo varchar(100) COLLATE utf8mb4_unicode_ci NULL AFTER clave_nombre",
        "pixel_tracking": "ADD COLUMN pixel_tracking text COLLATE utf8mb4_unicode_ci NULL AFTER clave_correo",
        "total_clics": "ADD COLUMN total_clics int(11) DEFAULT '0' AFTER pixel_tracking",
        "fecha_creacion": "ADD COLUMN fecha_creacion datetime DEFAULT CURRENT_TIMESTAMP AFTER url_generada",
    }

    for column_name, alter_sql in missing_columns.items():
        if column_name not in columns:
            cursor.execute(f"ALTER TABLE whalinks {alter_sql}")

    if not table_has_index(cursor, "whalinks", "short_code_unico"):
        cursor.execute("ALTER TABLE whalinks ADD UNIQUE KEY short_code_unico (short_code)")


def ensure_plantillas_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS plantillas (
            id int(11) NOT NULL AUTO_INCREMENT,
            usuario_id int(11) NOT NULL,
            dispositivo_id int(11) NOT NULL,
            dispositivo_nombre varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            nombre varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
            categoria varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Marketing',
            cabecera varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Ninguna',
            cabecera_texto text COLLATE utf8mb4_unicode_ci,
            cabecera_archivo longtext COLLATE utf8mb4_unicode_ci,
            cuerpo longtext COLLATE utf8mb4_unicode_ci NOT NULL,
            pie text COLLATE utf8mb4_unicode_ci,
            botones longtext COLLATE utf8mb4_unicode_ci,
            tipo varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Texto',
            estado varchar(100) COLLATE utf8mb4_unicode_ci DEFAULT 'Borrador',
            fecha_creacion datetime DEFAULT CURRENT_TIMESTAMP,
            actualizado_en datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_plantillas_usuario (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def ensure_whalink_clicks_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS whalink_clicks (
            id int(11) NOT NULL AUTO_INCREMENT,
            whalink_id int(11) NOT NULL,
            short_code varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
            ip_address varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            user_agent text COLLATE utf8mb4_unicode_ci,
            device_type enum('movil','pc') COLLATE utf8mb4_unicode_ci DEFAULT 'pc',
            clicked_at datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_whalink_clicks_link_date (whalink_id, clicked_at),
            KEY idx_whalink_clicks_short_code (short_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def ensure_whalink_leads_table(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS whalink_leads (
            id int(11) NOT NULL AUTO_INCREMENT,
            whalink_id int(11) NOT NULL,
            short_code varchar(12) COLLATE utf8mb4_unicode_ci NOT NULL,
            nombre varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            correo varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            ip_address varchar(45) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
            user_agent text COLLATE utf8mb4_unicode_ci,
            creado_en datetime DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (id),
            KEY idx_whalink_leads_link_date (whalink_id, creado_en),
            KEY idx_whalink_leads_short_code (short_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )


def allowed_image_file(filename):
    return "." in str(filename or "") and filename.rsplit(".", 1)[1].lower() in ALLOWED_IMAGE_EXTENSIONS


def whalink_short_code_exists(cursor, short_code):
    columns = get_table_columns(cursor, "whalinks")
    where_parts = []
    params = []

    if "short_code" in columns:
        where_parts.append("short_code = %s")
        params.append(short_code)

    if "slug" in columns:
        where_parts.append("slug = %s")
        params.append(short_code)

    if not where_parts:
        return False

    cursor.execute(
        f"SELECT id FROM whalinks WHERE {' OR '.join(where_parts)} LIMIT 1",
        tuple(params),
    )
    return bool(cursor.fetchone())


def generate_whalink_short_code(cursor, length=6):
    alphabet = string.ascii_letters + string.digits

    for _ in range(25):
        short_code = "".join(secrets.choice(alphabet) for _ in range(length))
        if not whalink_short_code_exists(cursor, short_code):
            return short_code

    return "".join(secrets.choice(alphabet) for _ in range(8))


def build_whatsapp_url(phone_number, message):
    clean_number = "".join(ch for ch in str(phone_number or "") if ch.isdigit())
    if not clean_number:
        return None

    encoded_message = quote(str(message or ""), safe="")
    if encoded_message:
        return f"https://wa.me/{clean_number}?text={encoded_message}"
    return f"https://wa.me/{clean_number}"


def public_base_url():
    return os.getenv("PUBLIC_BASE_URL", request.host_url.rstrip("/")).rstrip("/")


def build_short_url(short_code):
    return f"{public_base_url()}/l/{short_code}"


def detect_client_device_type(user_agent):
    agent = str(user_agent or "").lower()
    mobile_markers = ("android", "iphone", "ipad", "ipod", "mobile", "windows phone")
    return "movil" if any(marker in agent for marker in mobile_markers) else "pc"


def build_whalink_insert(
    cursor,
    user_id,
    device_id,
    nombre,
    mensaje,
    url_generada,
    short_code,
    imagen_url=None,
    descripcion=None,
    clave_nombre=None,
    clave_correo=None,
    pixel_tracking=None,
):
    columns = get_table_columns(cursor, "whalinks")
    insert_data = {}

    canonical_values = {
        "user_id": user_id,
        "device_id": device_id,
        "nombre": nombre,
        "mensaje": mensaje,
        "url_generada": url_generada,
        "short_code": short_code,
        "imagen_url": imagen_url,
        "descripcion": descripcion,
        "clave_nombre": clave_nombre,
        "clave_correo": clave_correo,
        "pixel_tracking": pixel_tracking,
        "total_clics": 0,
        "fecha_creacion": datetime.now(),
    }

    for column_name, value in canonical_values.items():
        if column_name in columns:
            insert_data[column_name] = value

    legacy_values = {
        "usuario_id": user_id,
        "dispositivo_id": device_id,
        "mensaje_bienvenida": mensaje,
        "url_redireccion": url_generada,
        "activo": 1,
        "creado_en": datetime.now(),
    }

    for column_name, value in legacy_values.items():
        if column_name in columns:
            insert_data[column_name] = value

    if "slug" in columns:
        insert_data["slug"] = short_code

    return insert_data


def whalink_row_to_json(row):
    short_code = row.get("short_code") or row.get("slug")
    return {
        "id": row.get("id"),
        "user_id": row.get("user_id") or row.get("usuario_id"),
        "device_id": row.get("device_id") or row.get("dispositivo_id"),
        "nombre": row.get("nombre"),
        "mensaje": row.get("mensaje") or row.get("mensaje_bienvenida"),
        "mensaje_predeterminado": row.get("mensaje") or row.get("mensaje_bienvenida"),
        "url_generada": row.get("url_generada") or row.get("url_redireccion"),
        "short_code": short_code,
        "short_url": build_short_url(short_code) if short_code else None,
        "imagen_url": row.get("imagen_url"),
        "descripcion": row.get("descripcion"),
        "clave_nombre": row.get("clave_nombre"),
        "clave_correo": row.get("clave_correo"),
        "pixel_tracking": row.get("pixel_tracking"),
        "total_clics": int(row.get("clicks_totales") if row.get("clicks_totales") is not None else (row.get("total_clics") or 0)),
        "clicks_unicos": int(row.get("clicks_unicos") or 0),
        "dispositivo_nombre": row.get("dispositivo_nombre") or "Sin dispositivo",
        "numero_telefono": row.get("numero_telefono"),
        "fecha_creacion": as_json_value(row.get("fecha_creacion") or row.get("creado_en") or row.get("created_at")),
        "created_at": as_json_value(row.get("created_at") or row.get("fecha_creacion") or row.get("creado_en")),
    }


def fetch_whalink_for_user(cursor, whalink_id, user_id):
    ensure_whalinks_table(cursor)
    columns = get_table_columns(cursor, "whalinks")
    user_where, user_params = whalink_user_where(columns, user_id)
    device_expr = whalink_device_expr(columns)

    cursor.execute(
        f"""
        SELECT
            w.*,
            d.nombre AS dispositivo_nombre,
            d.numero_telefono
        FROM whalinks w
        LEFT JOIN dispositivos d ON d.id = {device_expr}
        WHERE w.id = %s AND {user_where}
        LIMIT 1
        """,
        tuple([whalink_id] + user_params),
    )
    return cursor.fetchone()


def build_whalink_update(cursor, data):
    columns = get_table_columns(cursor, "whalinks")
    canonical_values = {
        "user_id": data.get("user_id"),
        "device_id": data.get("device_id"),
        "nombre": data.get("nombre"),
        "mensaje": data.get("mensaje"),
        "url_generada": data.get("url_generada"),
        "imagen_url": data.get("imagen_url"),
        "descripcion": data.get("descripcion"),
        "clave_nombre": data.get("clave_nombre"),
        "clave_correo": data.get("clave_correo"),
        "pixel_tracking": data.get("pixel_tracking"),
    }
    legacy_values = {
        "usuario_id": data.get("user_id"),
        "dispositivo_id": data.get("device_id"),
        "mensaje_bienvenida": data.get("mensaje"),
        "url_redireccion": data.get("url_generada"),
    }
    update_data = {}

    for column_name, value in canonical_values.items():
        if column_name in columns:
            update_data[column_name] = value

    for column_name, value in legacy_values.items():
        if column_name in columns:
            update_data[column_name] = value

    return update_data


def whalink_select_fields(columns):
    select_fields = [
        "w.id",
        "w.device_id",
        "w.nombre",
        "w.mensaje",
        "w.url_generada",
        "w.short_code",
        "w.imagen_url",
        "w.descripcion",
        "w.clave_nombre",
        "w.clave_correo",
        "w.pixel_tracking",
        "w.total_clics",
        "d.numero_telefono",
    ]

    for column_name in ("slug", "mensaje_bienvenida", "url_redireccion", "dispositivo_id"):
        if column_name in columns:
            select_fields.append(f"w.{column_name}")

    return select_fields


def render_whalink_landing(short_code, whalink, whatsapp_url):
    title = html.escape(str(whalink.get("nombre") or "GEOCHAT"))
    description = html.escape(str(whalink.get("descripcion") or "Completa tus datos para continuar a WhatsApp."))
    image_url = html.escape(str(whalink.get("imagen_url") or ""))
    name_key = str(whalink.get("clave_nombre") or "").strip()
    email_key = str(whalink.get("clave_correo") or "").strip()
    pixel_tracking = str(whalink.get("pixel_tracking") or "")
    continue_url = f"/l/{html.escape(short_code)}?continue=1"
    escaped_whatsapp_url = html.escape(whatsapp_url, quote=True)

    fields_html = ""
    if name_key:
        fields_html += f"""
            <label>
                <span>Nombre</span>
                <input name="{html.escape(name_key, quote=True)}" type="text" autocomplete="name" placeholder="Tu nombre">
            </label>
        """

    if email_key:
        fields_html += f"""
            <label>
                <span>Correo</span>
                <input name="{html.escape(email_key, quote=True)}" type="email" autocomplete="email" placeholder="tu@email.com">
            </label>
        """

    image_html = f'<img class="hero-image" src="{image_url}" alt="{title}">' if image_url else ""

    if not fields_html:
        meta_refresh = f'<meta http-equiv="refresh" content="8;url={escaped_whatsapp_url}">'
        form_html = f"""
            <p class="helper">Te estamos llevando a WhatsApp...</p>
            <a class="button" href="{continue_url}">Continuar ahora</a>
            <script>
                setTimeout(function () {{
                    window.location.href = "{escaped_whatsapp_url}";
                }}, 3000);
            </script>
        """
    else:
        meta_refresh = ""
        form_html = f"""
            <form method="GET" action="/l/{html.escape(short_code)}">
                <input type="hidden" name="continue" value="1">
                {fields_html}
                <button class="button" type="submit">Continuar a WhatsApp</button>
            </form>
        """

    page = f"""<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  {meta_refresh}
  <title>{title} | GEOCHAT</title>
  <style>
    :root {{ color-scheme: light; }}
    body {{
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #f6f7fb;
      color: #111827;
      font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }}
    main {{
      width: min(92vw, 440px);
      background: #fff;
      border: 1px solid #e5e7eb;
      border-radius: 18px;
      padding: 28px;
      box-shadow: 0 18px 50px rgba(15, 23, 42, 0.12);
    }}
    .brand {{
      display: flex;
      align-items: center;
      gap: 10px;
      margin-bottom: 22px;
      font-weight: 900;
      letter-spacing: .02em;
    }}
    .mark {{
      width: 28px;
      height: 18px;
      border-radius: 999px;
      background: #69d318;
      box-shadow: -10px 8px 0 #69d318;
      transform: skewX(-18deg);
    }}
    .hero-image {{
      width: 72px;
      height: 72px;
      border-radius: 18px;
      object-fit: cover;
      margin-bottom: 18px;
    }}
    h1 {{ margin: 0; font-size: 26px; line-height: 1.15; }}
    p {{ color: #64748b; line-height: 1.55; margin: 10px 0 22px; }}
    label {{ display: block; margin-bottom: 14px; }}
    span {{ display: block; margin-bottom: 6px; font-size: 13px; font-weight: 800; color: #334155; }}
    input {{
      width: 100%;
      box-sizing: border-box;
      height: 44px;
      border: 1px solid #dbe3ef;
      border-radius: 10px;
      padding: 0 13px;
      font-size: 15px;
      outline: none;
    }}
    input:focus {{ border-color: #5d5fef; box-shadow: 0 0 0 4px rgba(93, 95, 239, .12); }}
    .button {{
      display: inline-flex;
      width: 100%;
      height: 46px;
      align-items: center;
      justify-content: center;
      border: 0;
      border-radius: 10px;
      background: #5d5fef;
      color: white;
      font-size: 15px;
      font-weight: 900;
      text-decoration: none;
      cursor: pointer;
    }}
    .helper {{ text-align: center; }}
  </style>
</head>
<body>
  {pixel_tracking}
  <main>
    <div class="brand"><div class="mark"></div><div>GEOCHAT</div></div>
    {image_html}
    <h1>{title}</h1>
    <p>{description}</p>
    {form_html}
  </main>
</body>
</html>"""
    return Response(page, mimetype="text/html")


def whalink_user_where(columns, user_id):
    filters = ["w.user_id = %s"]
    params = [user_id]

    if "usuario_id" in columns:
        filters.append("w.usuario_id = %s")
        params.append(user_id)

    return f"({' OR '.join(filters)})", params


def whalink_device_expr(columns):
    if "dispositivo_id" in columns:
        return "COALESCE(w.device_id, w.dispositivo_id)"
    return "w.device_id"


def whalink_date_expr(columns):
    if "creado_en" in columns:
        return "COALESCE(w.fecha_creacion, w.creado_en)"
    return "w.fecha_creacion"


def validate_webhook_device(cursor, user_id, device_id):
    cursor.execute(
        """
        SELECT id
        FROM dispositivos
        WHERE id = %s AND usuario_id = %s
        LIMIT 1
        """,
        (device_id, user_id),
    )
    return cursor.fetchone()


def upsert_webhook_chat(cursor, device_id, jid, kind, name, preview=None, sent_at=None, message_type=None, increment_unread=0):
    jid = normalize_jid(jid)
    if is_status_broadcast_jid(jid):
        return

    if not is_supported_chat_jid(jid):
        return

    safe_name = clean_name_value(name, jid)
    has_message_state = preview is not None or sent_at is not None or message_type is not None
    safe_type = normalize_message_type(message_type) if has_message_state else None
    safe_preview = clean_text(preview) if has_message_state else None
    if has_message_state and not safe_preview:
        safe_preview = f"[{safe_type}]"
    safe_sent_at = (sent_at or datetime.now()) if has_message_state else None
    message_date = to_mysql_datetime(safe_sent_at) if safe_sent_at else None
    message_timestamp = unix_seconds(safe_sent_at) if safe_sent_at else None

    # Buscar si el chat ya existe
    cursor.execute(
        "SELECT id, nombre, ultimo_mensaje, ultimo_mensaje_fecha, last_timestamp, last_media_type, mensajes_sin_leer FROM chats WHERE dispositivo_id = %s AND jid = %s LIMIT 1",
        (device_id, jid)
    )
    existing = cursor.fetchone()

    if existing:
        db_id = existing["id"]
        db_nombre = clean_text(existing.get("nombre"))
        db_unread = existing.get("mensajes_sin_leer") or 0
        db_timestamp = existing.get("last_timestamp") or 0

        # Priorizar el nombre de la DB si ya tiene uno
        final_name = db_nombre if db_nombre else safe_name

        # Manejo del estado de los mensajes
        if has_message_state:
            # Solo actualizar el preview si el mensaje nuevo tiene un timestamp igual o superior al que ya tenemos
            if message_timestamp >= db_timestamp:
                final_preview = safe_preview or '[Mensaje]'
                final_date = message_date
                final_mtype = safe_type or 'texto'
            else:
                final_preview = existing.get("ultimo_mensaje")
                final_date = existing.get("ultimo_mensaje_fecha")
                final_mtype = existing.get("last_media_type") or 'texto'
            
            final_timestamp = max(db_timestamp, message_timestamp)
        else:
            final_preview = existing.get("ultimo_mensaje")
            final_date = existing.get("ultimo_mensaje_fecha")
            final_timestamp = db_timestamp
            final_mtype = existing.get("last_media_type") or 'texto'

        cursor.execute(
            """
            UPDATE chats 
            SET tipo = %s, nombre = %s, mensajes_sin_leer = %s,
                ultimo_mensaje = %s, ultimo_mensaje_fecha = %s, last_timestamp = %s, last_media_type = %s,
                actualizado_en = NOW()
            WHERE id = %s
            """,
            (
                kind,
                final_name,
                db_unread + increment_unread,
                final_preview,
                final_date,
                final_timestamp,
                final_mtype,
                db_id
            )
        )
    else:
        cursor.execute(
            """
            INSERT INTO chats (
                dispositivo_id, jid, tipo, nombre, mensajes_sin_leer,
                ultimo_mensaje, ultimo_mensaje_fecha, last_timestamp, last_media_type, creado_en, actualizado_en
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (
                device_id,
                jid,
                kind,
                safe_name,
                increment_unread,
                safe_preview or '[Mensaje]',
                message_date,
                message_timestamp or 0,
                safe_type or 'texto'
            )
        )


def check_mac_limit_exceeded(cursor, device_id):
    """Retorna True si el usuario ha superado el límite de contactos (MAC) de su plan en el mes corriente."""
    try:
        # 1. Obtener usuario_id y max_contactos del plan
        cursor.execute(
            """
            SELECT d.usuario_id, p.max_contactos
            FROM dispositivos d
            LEFT JOIN suscripciones s ON s.usuario_id = d.usuario_id
            LEFT JOIN planes p ON p.id = s.plan_id
            WHERE d.id = %s
            ORDER BY FIELD(s.estado, 'activa', 'prueba', 'vencida', 'cancelada'), s.fecha_vencimiento DESC, s.id DESC
            LIMIT 1
            """,
            (device_id,)
        )
        res = cursor.fetchone()
        if not res:
            return False
        user_id = res["usuario_id"]
        max_contacts = res["max_contactos"]
        if max_contacts is None or max_contacts <= 0:
            return False

        # 2. Contar contactos creados este mes
        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE d.usuario_id = %s
              AND c.creado_en >= DATE_FORMAT(NOW(), '%Y-%m-01 00:00:00')
            """,
            (user_id,)
        )
        count_res = cursor.fetchone()
        current_count = count_res["total"] if count_res else 0

        return current_count >= max_contacts
    except Exception as e:
        logger.error(f"Error en check_mac_limit_exceeded: {e}")
        return False


def upsert_webhook_contact(cursor, device_id, data, update_name=True):
    jid = normalize_jid(data.get("jid") or data.get("chat_jid"))
    if not is_supported_chat_jid(jid) or is_group_jid(jid):
        return None

    phone = clean_text(data.get("telefono")) or phone_from_jid(jid)
    name = webhook_display_name(data, jid) if update_name else None
    push_name = (clean_name_value(data.get("push_name"), jid) or clean_name_value(data.get("nombre"), jid)) if update_name else None
    verified_name = clean_name_value(data.get("verified_name"), jid) if update_name else None
    notify_name = clean_name_value(data.get("notify_name"), jid) if update_name else None
    foto_perfil = data.get("foto_perfil") or data.get("imgUrl") or data.get("profilePictureUrl")

    # Buscar si el contacto ya existe
    cursor.execute(
        "SELECT id, nombre, push_name, verified_name, notify_name, foto_perfil FROM contactos WHERE dispositivo_id = %s AND jid = %s LIMIT 1",
        (device_id, jid)
    )
    existing = cursor.fetchone()

    if existing:
        db_id = existing["id"]
        db_nombre = clean_text(existing.get("nombre"))
        db_push = clean_text(existing.get("push_name"))
        db_verified = clean_text(existing.get("verified_name"))
        db_notify = clean_text(existing.get("notify_name"))
        db_foto = clean_text(existing.get("foto_perfil"))

        # Si ya tiene un nombre en la base de datos, lo priorizamos. Si no, usamos el nuevo
        final_nombre = db_nombre if db_nombre else name
        final_push = push_name if push_name else db_push
        final_verified = verified_name if verified_name else db_verified
        final_notify = notify_name if notify_name else db_notify
        final_foto = foto_perfil if foto_perfil else db_foto

        if update_name:
            cursor.execute(
                """
                UPDATE contactos 
                SET telefono = %s, nombre = %s, push_name = %s, verified_name = %s, notify_name = %s, foto_perfil = %s, actualizado_en = NOW()
                WHERE id = %s
                """,
                (phone, final_nombre, final_push, final_verified, final_notify, final_foto, db_id)
            )
        else:
            cursor.execute(
                """
                UPDATE contactos 
                SET telefono = %s, foto_perfil = %s, actualizado_en = NOW()
                WHERE id = %s
                """,
                (phone, final_foto, db_id)
            )
        final_name = final_nombre or final_push or final_verified or final_notify
    else:
        # Si no existe, lo insertamos nuevo validando límite de MAC
        if check_mac_limit_exceeded(cursor, device_id):
            logger.warning(f"Límite de MAC excedido para el dispositivo {device_id}. No se creará el contacto {jid}.")
            return None
        cursor.execute(
            """
            INSERT INTO contactos (
                dispositivo_id, jid, telefono, nombre, push_name, verified_name, notify_name, foto_perfil, creado_en, actualizado_en
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, NOW(), NOW())
            """,
            (device_id, jid, phone, name, push_name, verified_name, notify_name, foto_perfil)
        )
        final_name = name or push_name or verified_name or notify_name

    # Sincronizar con la tabla chats
    if final_name:
        cursor.execute(
            """
            UPDATE chats
            SET nombre = %s, actualizado_en = NOW()
            WHERE dispositivo_id = %s AND jid = %s
            """,
            (final_name, device_id, jid)
        )

    return {"jid": jid, "telefono": phone, "nombre": final_name}


def upsert_webhook_group(cursor, device_id, jid, name, update_name=True):
    if not is_supported_chat_jid(jid) or (not is_group_jid(jid) and not is_newsletter_jid(jid)):
        return

    safe_name = clean_name_value(name, jid)
    if update_name:
        update_sql = """
            nombre = COALESCE(NULLIF(VALUES(nombre), ''), nombre),
            actualizado_en = NOW()
        """
    else:
        update_sql = "actualizado_en = NOW()"

    cursor.execute(
        f"""
        INSERT INTO grupos (dispositivo_id, jid, nombre)
        VALUES (%s, %s, %s)
        ON DUPLICATE KEY UPDATE
            {update_sql}
        """,
        (device_id, jid, safe_name),
    )
    if safe_name:
        cursor.execute(
            """
            UPDATE chats
            SET nombre = %s,
                actualizado_en = NOW()
            WHERE dispositivo_id = %s AND jid = %s
            """,
            (safe_name, device_id, jid),
        )


def persist_group_subject(cursor, device_id, jid, subject):
    normalized_jid = normalize_jid(jid)
    safe_subject = clean_name_value(subject, normalized_jid)

    if not safe_subject or not is_group_jid(normalized_jid):
        return None

    upsert_webhook_group(cursor, device_id, normalized_jid, safe_subject, update_name=True)
    upsert_webhook_chat(
        cursor,
        device_id,
        normalized_jid,
        "grupo",
        safe_subject,
        increment_unread=0,
    )
    return safe_subject


def persist_webhook_message(cursor, user_id, device_id, data):
    message = data.get("message") or data
    jid = normalize_jid(message.get("remoteJid") or message.get("chat_jid") or message.get("jid"))
    if not jid:
        raise ValueError("remoteJid/chat_jid es obligatorio")
    if not is_supported_chat_jid(jid):
        raise ValueError("JID de WhatsApp no soportado")

    is_group = bool(message.get("es_grupo")) or is_group_jid(jid)
    message_type = normalize_message_type(message.get("tipo"))
    sent_at = message.get("fecha_mensaje") or message.get("sent_at")
    sent_at_mysql = to_mysql_datetime(sent_at)
    sent_at_timestamp = int(message.get("last_timestamp") or unix_seconds(sent_at))
    text = clean_text(message.get("texto"))
    preview = text or f"[{message_type}]"
    from_me_bool = parse_bool(message.get("fromMe")) or parse_bool(message.get("es_mio"))
    update_name = False if from_me_bool else True
    from_me = 1 if from_me_bool else 0
    message_id = clean_text(message.get("mensaje_id"))

    if not message_id:
        raise ValueError("mensaje_id es obligatorio")

    cursor.execute(
        """
        SELECT id
        FROM mensajes
        WHERE dispositivo_id = %s AND mensaje_id = %s
        LIMIT 1
        """,
        (device_id, message_id),
    )
    message_already_saved = bool(message_id and cursor.fetchone())
    increment_unread = 0 if from_me or message_already_saved else 1
    name = webhook_display_name(message, jid)
    
    # Búsqueda agresiva de nombre para grupos
    # IMPORTANTE: Para grupos, NO queremos usar el 'pushName' de quien escribe como nombre del grupo
    group_title = None
    if is_group:
        # Solo campos que representen al grupo, no al remitente
        # Eliminamos 'nombre' de aquí porque suele ser el remitente en el bridge
        group_candidates = [
            message.get("subject"), 
            message.get("groupName"), 
            message.get("group_subject")
        ]
        for cand in group_candidates:
            if cand and str(cand).strip():
                group_title = clean_name_value(cand, jid)
                if group_title: break
    
    de_jid = clean_related_jid(message.get("de_jid")) or jid
    participant_jid = clean_related_jid(message.get("participant_jid"))

    if is_group:
        # Solo actualizamos el nombre del grupo SI encontramos un título de grupo real
        upsert_webhook_group(cursor, device_id, jid, group_title, update_name=bool(group_title))
        
        # SI EL NOMBRE SIGUE SIENDO NULO, LANZAMOS UNA PETICIÓN AL BRIDGE PARA OBTENER INFO DEL GRUPO
        if not name or name == jid:
            try:
                # Importamos aquí para evitar circulares si las hubiera
                import threading
                def fetch_group_metadata():
                    conn = None
                    thread_cursor = None
                    try:
                        conn = get_connection()
                        thread_cursor = conn.cursor(dictionary=True)
                        # Simulamos una llamada al bridge para pedir metadata del grupo
                        # Esto disparará un webhook de vuelta con el 'subject' del grupo
                        payload = {
                            "jid": jid,
                            "type": "group_metadata"
                        }
                        # Usamos la función existente para enviar comandos al bridge
                        # (Ajustar según el nombre real de tu función de comandos al bridge)
                        bridge_info = send_bridge_message(device_id, jid, "/getgroupinfo", is_command=True) or {}
                        bridge_subject = (
                            bridge_info.get("subject")
                            or bridge_info.get("name")
                            or bridge_info.get("group_subject")
                        )
                        persisted_group_name = persist_group_subject(thread_cursor, device_id, jid, bridge_subject)
                        conn.commit()
                        if persisted_group_name:
                            pass
                    except Exception as e:
                        logger.warning(f"Error in fetch_group_metadata thread: {e}")
                    finally:
                        if thread_cursor:
                            thread_cursor.close()
                        if conn:
                            conn.close()
                
            except Exception as e:
                logger.warning(f"Error al iniciar el hilo fetch_group_metadata: {e}")
    else:
        contact_res = upsert_webhook_contact(
            cursor,
            device_id,
            {
                "jid": jid,
                "telefono": message.get("telefono"),
                "nombre": name,
                "push_name": message.get("push_name"),
                "verified_name": message.get("verified_name"),
                "notify_name": message.get("notify_name"),
            },
            update_name=update_name,
        )
        if contact_res and contact_res.get("nombre"):
            name = contact_res["nombre"]

    # El nombre que enviamos a la tabla de chats debe ser el título del grupo si es un grupo
    if is_group:
        if group_title:
            chat_display_name = group_title
        else:
            # Si no recibimos el título en este mensaje, intentamos mantener el que ya existe en DB
            cursor.execute("SELECT nombre FROM grupos WHERE jid = %s AND dispositivo_id = %s", (jid, device_id))
            row_g = cursor.fetchone()
            if row_g and row_g.get("nombre") and not str(row_g["nombre"]).startswith("12036"):
                chat_display_name = row_g["nombre"]
            else:
                chat_display_name = "Grupo de WhatsApp"
    else:
        chat_display_name = name

    upsert_webhook_chat(
        cursor,
        device_id,
        jid,
        "grupo" if is_group else "contacto",
        chat_display_name,
        preview,
        sent_at_mysql,
        message_type,
        increment_unread,
    )

    if not is_group:
        cursor.execute(
            """
            UPDATE contactos
            SET ultimo_mensaje = CASE
                    WHEN COALESCE(last_timestamp, 0) <= %s THEN %s
                    ELSE ultimo_mensaje
                END,
                ultima_vez_visto = CASE
                    WHEN COALESCE(last_timestamp, 0) <= %s THEN %s
                    ELSE ultima_vez_visto
                END,
                last_media_type = CASE
                    WHEN COALESCE(last_timestamp, 0) <= %s THEN %s
                    ELSE last_media_type
                END,
                mensajes_sin_leer = COALESCE(mensajes_sin_leer, 0) + %s,
                last_timestamp = GREATEST(COALESCE(last_timestamp, 0), %s),
                actualizado_en = NOW()
            WHERE dispositivo_id = %s AND jid = %s
            """,
            (
                sent_at_timestamp,
                preview,
                sent_at_timestamp,
                sent_at_mysql,
                sent_at_timestamp,
                message_type,
                increment_unread,
                sent_at_timestamp,
                device_id,
                jid,
            ),
        )

    cursor.execute(
        """
        INSERT INTO mensajes (
            mensaje_id, dispositivo_id, chat_jid, de_jid, es_mio, es_grupo,
            texto, tipo, url_media, mime_media, nombre_archivo, estado,
            fecha_mensaje, participant_jid, push_name
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            estado = VALUES(estado),
            texto = COALESCE(VALUES(texto), texto),
            tipo = VALUES(tipo),
            mime_media = COALESCE(VALUES(mime_media), mime_media),
            nombre_archivo = COALESCE(VALUES(nombre_archivo), nombre_archivo),
            push_name = COALESCE(VALUES(push_name), push_name)
        """,
        (
            message_id,
            device_id,
            jid,
            de_jid,
            from_me,
            1 if is_group else 0,
            text,
            message_type,
            clean_text(message.get("url_media")),
            clean_text(message.get("mime_media")),
            clean_text(message.get("nombre_archivo")),
            int(message.get("estado") or (1 if from_me else 0)),
            sent_at_mysql,
            participant_jid,
            None if from_me_bool else clean_text(message.get("push_name")),
        ),
    )

    return {
        "chat_jid": jid,
        "message_id": message_id,
        "preview": preview,
        # Campos extra que necesita el frontend para actualizar la lista de chats
        # en tiempo real sin hacer un fetch completo.
        "texto": text,                        # texto del mensaje (puede ser None para media)
        "tipo": message_type,                 # tipo: texto, imagen, video, audio, documento
        "es_mio": bool(from_me_bool),         # True si el mensaje lo envié yo
        "sent_at": sent_at_mysql,
        "last_timestamp": sent_at_timestamp,
        "name": name,
        "user_id": user_id,
        "device_id": device_id,
    }

@app.errorhandler(Exception)
def handle_exception(e):
    # Dejar que los errores HTTP (404, 405, etc.) pasen con su código correcto
    from werkzeug.exceptions import HTTPException
    if isinstance(e, HTTPException):
        return jsonify({"success": False, "message": e.description}), e.code
    logger.error(f"Error no capturado: {e}", exc_info=True)
    return jsonify({"success": False, "message": str(e)}), 500


@app.route("/", methods=["GET"])
def root():
    return jsonify({"success": True, "message": "GEOCHAT API activa", "docs": "/api/health"})


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"success": True, "message": "GEOCHAT API activa"})


def ensure_scheduled_messages_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS mensajes_programados (
            id BIGINT NOT NULL PRIMARY KEY,
            usuario_id INT NOT NULL,
            dispositivo_id INT DEFAULT NULL,
            tipo_envio ENUM('campana', 'grupo') NOT NULL DEFAULT 'campana',
            target_id VARCHAR(80) DEFAULT NULL,
            target_nombre VARCHAR(180) DEFAULT NULL,
            nombre VARCHAR(150) NOT NULL,
            campana VARCHAR(180) DEFAULT NULL,
            velocidad VARCHAR(20) DEFAULT NULL,
            opcion_envio VARCHAR(20) DEFAULT NULL,
            fecha_programada DATETIME DEFAULT NULL,
            fecha_texto VARCHAR(20) DEFAULT NULL,
            hora_texto VARCHAR(10) DEFAULT NULL,
            repetir TINYINT(1) DEFAULT 0,
            frecuencia VARCHAR(50) DEFAULT NULL,
            dias_seleccionados TEXT DEFAULT NULL,
            repetir_cada INT DEFAULT NULL,
            finalizar_op VARCHAR(20) DEFAULT NULL,
            repeticiones INT DEFAULT NULL,
            finalizar_fecha DATETIME DEFAULT NULL,
            solo_nuevos TINYINT(1) DEFAULT 0,
            solo_llenos TINYINT(1) DEFAULT 0,
            status VARCHAR(30) DEFAULT 'Borrador',
            payload_json LONGTEXT NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            INDEX idx_mensajes_programados_usuario (usuario_id),
            INDEX idx_mensajes_programados_dispositivo (dispositivo_id),
            INDEX idx_mensajes_programados_fecha (fecha_programada)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    columns = get_table_columns(cursor, "mensajes_programados")
    if "enviado_en" not in columns:
        cursor.execute("ALTER TABLE mensajes_programados ADD COLUMN enviado_en DATETIME DEFAULT NULL AFTER actualizado_en")
    if "ultimo_error" not in columns:
        cursor.execute("ALTER TABLE mensajes_programados ADD COLUMN ultimo_error VARCHAR(500) DEFAULT NULL AFTER enviado_en")
    if "total_enviados" not in columns:
        cursor.execute("ALTER TABLE mensajes_programados ADD COLUMN total_enviados INT NOT NULL DEFAULT 0 AFTER ultimo_error")
    if "total_fallidos" not in columns:
        cursor.execute("ALTER TABLE mensajes_programados ADD COLUMN total_fallidos INT NOT NULL DEFAULT 0 AFTER total_enviados")


def ensure_groups_module_tables(cursor):
    device_columns = get_table_columns(cursor, "dispositivos")
    if "foto_perfil" not in device_columns:
        cursor.execute(
            """
            ALTER TABLE dispositivos
            ADD COLUMN foto_perfil TEXT COLLATE utf8mb4_unicode_ci NULL
            AFTER numero_telefono
            """
        )
    if "color" not in device_columns:
        cursor.execute(
            """
            ALTER TABLE dispositivos
            ADD COLUMN color VARCHAR(50) DEFAULT NULL
            AFTER foto_perfil
            """
        )

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS grupos_modulo (
            id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            dispositivo_id INT NOT NULL,
            grupo_origen_id INT DEFAULT NULL,
            jid VARCHAR(100) NOT NULL,
            nombre VARCHAR(180) NOT NULL,
            tipo ENUM('grupo', 'comunidad', 'canal') NOT NULL DEFAULT 'grupo',
            origen VARCHAR(40) NOT NULL DEFAULT 'WhatsApp',
            clicks INT NOT NULL DEFAULT 0,
            admins_count INT NOT NULL DEFAULT 0,
            participantes_count INT NOT NULL DEFAULT 0,
            mensajes_programados_count INT NOT NULL DEFAULT 0,
            lleno TINYINT(1) NOT NULL DEFAULT 0,
            estado_sync ENUM('activo', 'sin_admin', 'error', 'pendiente_sync', 'sincronizando') NOT NULL DEFAULT 'pendiente_sync',
            invite_link VARCHAR(500) DEFAULT NULL,
            ia_activo TINYINT(1) NOT NULL DEFAULT 0,
            ia_instrucciones TEXT DEFAULT NULL,
            ia_personalidad TEXT DEFAULT NULL,
            moderacion_activa TINYINT(1) NOT NULL DEFAULT 0,
            anti_bloqueo TINYINT(1) NOT NULL DEFAULT 0,
            sincronizado_en DATETIME DEFAULT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            actualizado_en DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            eliminado_en DATETIME DEFAULT NULL,
            UNIQUE KEY unique_user_group_module (usuario_id, dispositivo_id, jid),
            INDEX idx_grupos_modulo_usuario (usuario_id),
            INDEX idx_grupos_modulo_dispositivo (dispositivo_id),
            INDEX idx_grupos_modulo_estado (estado_sync)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    # Agregar columnas de IA si la tabla ya existía
    group_columns = get_table_columns(cursor, "grupos_modulo")
    if "ia_activo" not in group_columns:
        cursor.execute("ALTER TABLE grupos_modulo ADD COLUMN ia_activo TINYINT(1) NOT NULL DEFAULT 0 AFTER invite_link")
    if "ia_instrucciones" not in group_columns:
        cursor.execute("ALTER TABLE grupos_modulo ADD COLUMN ia_instrucciones TEXT DEFAULT NULL AFTER ia_activo")
    if "ia_personalidad" not in group_columns:
        cursor.execute("ALTER TABLE grupos_modulo ADD COLUMN ia_personalidad TEXT DEFAULT NULL AFTER ia_instrucciones")
    if "moderacion_activa" not in group_columns:
        cursor.execute("ALTER TABLE grupos_modulo ADD COLUMN moderacion_activa TINYINT(1) NOT NULL DEFAULT 0 AFTER ia_personalidad")
    if "anti_bloqueo" not in group_columns:
        cursor.execute("ALTER TABLE grupos_modulo ADD COLUMN anti_bloqueo TINYINT(1) NOT NULL DEFAULT 0 AFTER moderacion_activa")

    cursor.execute("""
        CREATE TABLE IF NOT EXISTS grupos_modulo_historial (
            id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            grupo_modulo_id BIGINT NOT NULL,
            accion VARCHAR(80) NOT NULL,
            detalle TEXT DEFAULT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_grupos_modulo_historial_grupo (grupo_modulo_id),
            CONSTRAINT fk_grupos_modulo_historial_grupo
                FOREIGN KEY (grupo_modulo_id) REFERENCES grupos_modulo (id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

    participant_columns = get_table_columns(cursor, "participantes_grupo")
    if "estado" not in participant_columns:
        cursor.execute(
            """
            ALTER TABLE participantes_grupo
            ADD COLUMN estado VARCHAR(20) NOT NULL DEFAULT 'activo' AFTER rol
            """
        )
    if "fecha_ingreso" not in participant_columns:
        cursor.execute(
            """
            ALTER TABLE participantes_grupo
            ADD COLUMN fecha_ingreso DATETIME NULL DEFAULT NULL AFTER estado
            """
        )
    if "fecha_salida" not in participant_columns:
        cursor.execute(
            """
            ALTER TABLE participantes_grupo
            ADD COLUMN fecha_salida DATETIME NULL DEFAULT NULL AFTER fecha_ingreso
            """
        )
    if "actualizado_en" not in participant_columns:
        cursor.execute(
            """
            ALTER TABLE participantes_grupo
            ADD COLUMN actualizado_en DATETIME NULL DEFAULT NULL AFTER fecha_salida
            """
        )

    cursor.execute(
        """
        UPDATE participantes_grupo
        SET estado = COALESCE(NULLIF(estado, ''), 'activo'),
            fecha_ingreso = COALESCE(fecha_ingreso, NOW()),
            actualizado_en = COALESCE(actualizado_en, NOW())
        """
    )


def parse_ddmmyyyy_to_mysql(value):
    if not value:
        return None

    try:
        parsed = datetime.strptime(value, "%d/%m/%Y")
        return parsed.strftime("%Y-%m-%d")
    except (TypeError, ValueError):
        return None


def build_programmed_datetime(fecha_texto, hora_texto):
    mysql_date = parse_ddmmyyyy_to_mysql(fecha_texto)
    if not mysql_date:
        return None

    safe_time = (hora_texto or "00:00").strip()
    if len(safe_time) == 5:
        safe_time = f"{safe_time}:00"

    try:
        parsed = datetime.strptime(f"{mysql_date} {safe_time}", "%Y-%m-%d %H:%M:%S")
        return parsed.strftime("%Y-%m-%d %H:%M:%S")
    except ValueError:
        return None


def parse_target_reference(target_id):
    if target_id is None:
        return None, None

    raw = str(target_id).strip()
    if not raw:
        return None, None

    if raw.startswith("campana:"):
        return "campana", raw.split(":", 1)[1]

    if raw.startswith("envio_masivo:"):
        return "envio_masivo", raw.split(":", 1)[1]

    return "grupo", raw


def resolve_scheduled_message_target(cursor, user_id, payload):
    tipo_envio = (payload.get("tipoEnvio") or "campana").strip().lower()
    target_id = payload.get("targetId")
    target_name = (payload.get("targetName") or payload.get("campana") or "").strip() or None
    dispositivo_id = payload.get("dispositivoId")

    if tipo_envio == "grupo":
        _, target_value = parse_target_reference(target_id)
        if not target_value:
            return dispositivo_id, target_id, target_name

        if str(target_value).isdigit():
            cursor.execute(
                """
                SELECT g.id, g.nombre, g.dispositivo_id
                FROM grupos g
                INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                WHERE g.id = %s AND d.usuario_id = %s
                LIMIT 1
                """,
                (int(target_value), user_id),
            )
        else:
            cursor.execute(
                """
                SELECT g.id, g.nombre, g.dispositivo_id
                FROM grupos g
                INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                WHERE g.jid = %s AND d.usuario_id = %s
                LIMIT 1
                """,
                (target_value, user_id),
            )

        group_row = cursor.fetchone()
        if group_row:
            return (
                int(group_row.get("dispositivo_id")) if group_row.get("dispositivo_id") is not None else None,
                str(group_row.get("id")),
                group_row.get("nombre") or target_name,
            )

        return dispositivo_id, target_id, target_name

    target_kind, target_value = parse_target_reference(target_id)
    if not target_kind or not target_value:
        return dispositivo_id, target_id, target_name

    if target_kind == "campana" and str(target_value).isdigit():
        cursor.execute(
            """
            SELECT id, nombre, dispositivo_id
            FROM campanas
            WHERE id = %s AND usuario_id = %s
            LIMIT 1
            """,
            (int(target_value), user_id),
        )
        campaign_row = cursor.fetchone()
        if campaign_row:
            return (
                int(campaign_row.get("dispositivo_id")) if campaign_row.get("dispositivo_id") is not None else None,
                f"campana:{campaign_row.get('id')}",
                campaign_row.get("nombre") or target_name,
            )

    if target_kind == "envio_masivo" and str(target_value).isdigit():
        cursor.execute(
            """
            SELECT id, nombre, dispositivo_id
            FROM envios_masivos
            WHERE id = %s AND usuario_id = %s
            LIMIT 1
            """,
            (int(target_value), user_id),
        )
        batch_row = cursor.fetchone()
        if batch_row:
            return (
                int(batch_row.get("dispositivo_id")) if batch_row.get("dispositivo_id") is not None else None,
                f"envio_masivo:{batch_row.get('id')}",
                batch_row.get("nombre") or target_name,
            )

    return dispositivo_id, target_id, target_name


def serialize_scheduled_message_row(row):
    payload = {}
    raw_payload = row.get("payload_json")

    if raw_payload:
        try:
            payload = json.loads(raw_payload)
        except (TypeError, ValueError, json.JSONDecodeError):
            payload = {}

    payload.update(
        {
            "id": row.get("id"),
            "usuario_id": row.get("usuario_id"),
            "dispositivoId": row.get("dispositivo_id"),
            "tipoEnvio": row.get("tipo_envio") or payload.get("tipoEnvio") or "campana",
            "targetId": row.get("target_id") or payload.get("targetId"),
            "targetName": row.get("target_nombre") or payload.get("targetName") or payload.get("campana"),
            "nombre": row.get("nombre") or payload.get("nombre"),
            "campana": row.get("campana") or payload.get("campana"),
            "velocidad": row.get("velocidad") or payload.get("velocidad"),
            "opcionEnvio": row.get("opcion_envio") or payload.get("opcionEnvio"),
            "fecha": row.get("fecha_texto") or payload.get("fecha"),
            "hora": row.get("hora_texto") or payload.get("hora"),
            "repetir": bool(row.get("repetir")) if row.get("repetir") is not None else bool(payload.get("repetir")),
            "frecuencia": row.get("frecuencia") or payload.get("frecuencia"),
            "diasSeleccionados": payload.get("diasSeleccionados") or [],
            "repetirCada": row.get("repetir_cada") if row.get("repetir_cada") is not None else payload.get("repetirCada"),
            "finalizarOp": row.get("finalizar_op") or payload.get("finalizarOp"),
            "repeticiones": row.get("repeticiones") if row.get("repeticiones") is not None else payload.get("repeticiones"),
            "finalizarFecha": as_json_value(row.get("finalizar_fecha")) or payload.get("finalizarFecha"),
            "soloNuevos": bool(row.get("solo_nuevos")) if row.get("solo_nuevos") is not None else bool(payload.get("soloNuevos")),
            "soloLlenos": bool(row.get("solo_llenos")) if row.get("solo_llenos") is not None else bool(payload.get("soloLlenos")),
            "status": row.get("status") or payload.get("status") or "Borrador",
            "messageBlocks": payload.get("messageBlocks") or [],
            "createdAt": as_json_value(row.get("creado_en")) or payload.get("createdAt"),
            "updatedAt": as_json_value(row.get("actualizado_en")) or payload.get("updatedAt"),
            "fechaProgramada": as_json_value(row.get("fecha_programada")),
            "enviadoEn": as_json_value(row.get("enviado_en")) or payload.get("enviadoEn"),
            "ultimoError": row.get("ultimo_error") or payload.get("ultimoError"),
            "totalEnviados": row.get("total_enviados") if row.get("total_enviados") is not None else payload.get("totalEnviados", 0),
            "totalFallidos": row.get("total_fallidos") if row.get("total_fallidos") is not None else payload.get("totalFallidos", 0),
        }
    )

    return payload


SCHEDULED_MEDIA_RULES = {
    "Audio": {
        "extensions": {"mp3", "ogg", "wav", "webm"},
        "max_size": 80 * 1024 * 1024,
        "media_type": "audio",
    },
    "Documento": {
        "extensions": {"pdf"},
        "max_size": 16 * 1024 * 1024,
        "media_type": "document",
    },
    "Imagen/Video": {
        "extensions": {"png", "jpg", "jpeg", "webp", "mp4"},
        "max_image_size": 8 * 1024 * 1024,
        "max_video_size": 80 * 1024 * 1024,
        "media_type": "media",
    },
}


def scheduled_media_type_from_filename(filename, fallback_type=None):
    ext = (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""
    mime = (fallback_type or "").lower()
    if ext in {"mp3", "ogg", "wav", "m4a", "webm"} or mime.startswith("audio/"):
        return "audio"
    if ext in {"mp4", "mov", "m4v"} or mime.startswith("video/"):
        return "video"
    if ext == "pdf" or mime == "application/pdf":
        return "document"
    return "image"


def scheduled_audio_mimetype(filename, fallback_type=None):
    ext = (filename or "").rsplit(".", 1)[-1].lower() if "." in (filename or "") else ""
    extension_mime = {
        "mp3": "audio/mp4",
        "m4a": "audio/mp4",
        "ogg": "audio/ogg",
        "wav": "audio/wav",
        "webm": "audio/webm",
    }.get(ext)
    if extension_mime:
        return extension_mime

    mime = (fallback_type or "").strip().lower()
    if mime.startswith("audio/"):
        return mime
    return "audio/mp4"


def scheduled_media_local_path(block):
    media_path = block.get("mediaPath") or block.get("urlPath")
    media_url = block.get("mediaUrl") or block.get("url") or block.get("filePreview")

    if media_path:
        clean_path = str(media_path).replace("\\", "/").replace("/media/", "", 1).replace("media/", "", 1).lstrip("/")
        return os.path.join(app.config["UPLOAD_FOLDER"], *clean_path.split("/"))

    if media_url and isinstance(media_url, str):
        if "/media/" in media_url:
            clean_path = media_url.split("/media/", 1)[1].lstrip("/")
            return os.path.join(app.config["UPLOAD_FOLDER"], *clean_path.split("/"))
        if media_url.startswith("/media/") or media_url.startswith("media/"):
            clean_path = media_url.replace("/media/", "", 1).replace("media/", "", 1).lstrip("/")
            return os.path.join(app.config["UPLOAD_FOLDER"], *clean_path.split("/"))
        if os.path.exists(media_url):
            return media_url

    return media_url


def normalize_scheduled_text(value):
    return str(value or "").strip()


def scheduled_block_text(block):
    block_type = block.get("type")

    if block_type == "Mensaje":
        return normalize_scheduled_text(block.get("content"))

    if block_type == "Link":
        parts = [
            normalize_scheduled_text(block.get("message")),
            normalize_scheduled_text(block.get("title")),
            normalize_scheduled_text(block.get("description")),
            normalize_scheduled_text(block.get("link")),
        ]
        return "\n".join([part for part in parts if part])

    if block_type == "Encuesta":
        question = normalize_scheduled_text(block.get("question"))
        options = [normalize_scheduled_text(option) for option in (block.get("options") or []) if normalize_scheduled_text(option)]
        option_text = "\n".join([f"{index + 1}. {option}" for index, option in enumerate(options)])
        return "\n\n".join([part for part in [question, option_text] if part])

    if block_type == "Evento":
        parts = [
            normalize_scheduled_text(block.get("title")),
            normalize_scheduled_text(block.get("description")),
            f"Fecha y hora: {normalize_scheduled_text(block.get('eventDate'))}" if block.get("eventDate") else "",
            f"Ubicacion: {normalize_scheduled_text(block.get('location'))}" if block.get("location") else "",
        ]
        return "\n".join([part for part in parts if part])

    return normalize_scheduled_text(block.get("content") or block.get("caption"))


def scheduled_block_to_bridge_payload(jid, block):
    block_type = block.get("type")
    text = scheduled_block_text(block)
    
    payload = {}

    if block_type in {"Mensaje", "Link", "Encuesta", "Evento"}:
        payload = {"jid": jid, "text": text}
    elif block_type == "Contacto":
        payload = {
            "jid": jid,
            "type": "contact",
            "contactName": normalize_scheduled_text(block.get("name")) or "Contacto",
            "contactPhone": normalize_scheduled_text(block.get("phone")),
        }
    elif block_type in {"Audio", "Documento", "Imagen/Video"}:
        media_path = scheduled_media_local_path(block)
        filename = block.get("fileName") or "archivo"
        media_type = block.get("mediaType") or scheduled_media_type_from_filename(filename, block.get("fileType"))
        payload = {
            "jid": jid,
            "type": media_type,
            "url": media_path,
            "caption": normalize_scheduled_text(block.get("caption") or block.get("content")),
            "text": normalize_scheduled_text(block.get("caption") or block.get("content")),
            "filename": filename,
            "mimetype": block.get("fileType") or None,
        }
        if block_type == "Documento":
            payload["type"] = "document"
            payload["mimetype"] = payload["mimetype"] or "application/pdf"
        elif block_type == "Audio":
            payload["type"] = "audio"
            payload["mimetype"] = scheduled_audio_mimetype(filename, payload["mimetype"])
            payload["ptt"] = False
    else:
        payload = {"jid": jid, "text": text}

    if "mentionAll" in block:
        payload["mentionAll"] = bool(block["mentionAll"])
    if "pin" in block:
        payload["pin"] = bool(block["pin"])

    return payload


def post_bridge_payload(device_id, payload):
    bridge_port = 5000 + (int(device_id) % 1000)
    response = requests.post(f"http://127.0.0.1:{bridge_port}/send", json=payload, timeout=30)
    try:
        data = response.json()
    except ValueError:
        data = {"error": response.text}
    if response.status_code >= 400 or data.get("error"):
        raise RuntimeError(data.get("error") or f"Bridge HTTP {response.status_code}")
    return data


def resolve_scheduled_group_recipients(cursor, row, payload):
    tipo_envio = (row.get("tipo_envio") or payload.get("tipoEnvio") or "campana").lower()
    target_kind, target_value = parse_target_reference(row.get("target_id") or payload.get("targetId"))
    user_id = row.get("usuario_id")
    solo_llenos = bool(row.get("solo_llenos") or payload.get("soloLlenos"))

    if tipo_envio == "grupo":
        if not target_value:
            return []
        if "@s.whatsapp.net" in str(target_value) or "@g.us" in str(target_value):
            device_id = row.get("dispositivo_id") or payload.get("dispositivoId")
            cursor.execute(
                "SELECT jid, nombre, dispositivo_id FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1",
                (target_value, device_id)
            )
            contact = cursor.fetchone()
            if contact:
                return [contact]
            else:
                return [{"jid": target_value, "nombre": row.get("target_nombre") or "Cliente", "dispositivo_id": device_id}]
        if str(target_value).isdigit():
            cursor.execute(
                """
                SELECT g.jid, g.nombre, g.dispositivo_id
                FROM grupos g
                INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                WHERE g.id = %s AND d.usuario_id = %s
                LIMIT 1
                """,
                (int(target_value), user_id),
            )
        else:
            cursor.execute(
                """
                SELECT g.jid, g.nombre, g.dispositivo_id
                FROM grupos g
                INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                WHERE g.jid = %s AND d.usuario_id = %s
                LIMIT 1
                """,
                (target_value, user_id),
            )
        group = cursor.fetchone()
        return [group] if group and group.get("jid") else []

    if target_kind == "campana" and str(target_value or "").isdigit():
        query = """
            SELECT DISTINCT g.jid, g.nombre, COALESCE(c.dispositivo_id, g.dispositivo_id) AS dispositivo_id
            FROM campana_grupos cg
            INNER JOIN campanas c ON c.id = cg.campana_id
            INNER JOIN grupos g ON g.id = cg.grupo_id
            LEFT JOIN grupos_modulo gm ON gm.grupo_origen_id = g.id AND gm.usuario_id = c.usuario_id
            WHERE c.id = %s AND c.usuario_id = %s AND g.jid IS NOT NULL
        """
        params = [int(target_value), user_id]
        if solo_llenos:
            query += " AND COALESCE(gm.lleno, 0) = 1"
        cursor.execute(query, tuple(params))
        return cursor.fetchall()

    if target_kind == "envio_masivo" and str(target_value or "").isdigit():
        cursor.execute(
            """
            SELECT DISTINCT c.jid, COALESCE(c.nombre, c.telefono, c.jid) AS nombre, em.dispositivo_id
            FROM destinatarios_envio de
            INNER JOIN envios_masivos em ON em.id = de.envio_id
            INNER JOIN contactos c ON c.id = de.contacto_id
            WHERE em.id = %s AND em.usuario_id = %s AND c.jid IS NOT NULL
            """,
            (int(target_value), user_id),
        )
        return cursor.fetchall()

    return []


def add_months(value, months):
    month = value.month - 1 + max(int(months or 1), 1)
    year = value.year + month // 12
    month = month % 12 + 1
    day = min(value.day, [31, 29 if year % 4 == 0 and (year % 100 != 0 or year % 400 == 0) else 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1])
    return value.replace(year=year, month=month, day=day)


def compute_next_scheduled_run(payload, current_dt):
    if not payload.get("repetir"):
        return None

    frequency = payload.get("frecuencia") or "Semanal"
    repeat_every = max(int(payload.get("repetirCada") or 1), 1)
    selected_days = payload.get("diasSeleccionados") or []
    weekday_map = {"D": 6, "L": 0, "M": 1, "X": 2, "J": 3, "V": 4, "S": 5}

    if frequency == "Diario":
        return current_dt + timedelta(days=repeat_every)

    if frequency == "Mensual":
        return add_months(current_dt, repeat_every)

    allowed_weekdays = [weekday_map[day] for day in selected_days if day in weekday_map]
    if not allowed_weekdays:
        return current_dt + timedelta(weeks=repeat_every)

    probe = current_dt + timedelta(days=1)
    guard = 0
    while guard < 370:
        weeks_from_current = (probe.date() - current_dt.date()).days // 7
        if probe.weekday() in allowed_weekdays and weeks_from_current % repeat_every == 0:
            return probe
        probe += timedelta(days=1)
        guard += 1

    return current_dt + timedelta(weeks=repeat_every)


def process_scheduled_message(message_id, user_id):
    logger.info(f"[Mensajes Programados] Procesando mensaje ID: {message_id}")
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_scheduled_messages_table(cursor)
        cursor.execute(
            "SELECT * FROM mensajes_programados WHERE id = %s AND usuario_id = %s LIMIT 1",
            (message_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return

        if (row.get("status") or "").lower() in {"completado", "enviando"}:
            return

        payload = serialize_scheduled_message_row(row)
        blocks = payload.get("messageBlocks") or []
        if not blocks:
            cursor.execute(
                "UPDATE mensajes_programados SET status = 'Fallido', ultimo_error = %s WHERE id = %s",
                ("No hay bloques de mensaje para enviar", message_id),
            )
            conn.commit()
            return

        recipients = resolve_scheduled_group_recipients(cursor, row, payload)
        if not recipients:
            cursor.execute(
                "UPDATE mensajes_programados SET status = 'Fallido', ultimo_error = %s WHERE id = %s",
                ("No se encontraron destinatarios para este mensaje", message_id),
            )
            conn.commit()
            return

        cursor.execute(
            "UPDATE mensajes_programados SET status = 'Enviando', ultimo_error = NULL WHERE id = %s",
            (message_id,),
        )
        conn.commit()

        import random

        sent = 0
        failed = 0
        last_error = None
        delay_min, delay_max = (10, 15) if (payload.get("velocidad") == "lento") else (3, 3)

        for recipient in recipients:
            jid = recipient.get("jid")
            device_id = recipient.get("dispositivo_id") or row.get("dispositivo_id") or payload.get("dispositivoId")
            if not jid or not device_id:
                failed += 1
                last_error = "Destinatario sin JID o dispositivo"
                continue

            for block in blocks:
                try:
                    bridge_payload = scheduled_block_to_bridge_payload(jid, block)
                    post_bridge_payload(device_id, bridge_payload)
                    sent += 1
                except Exception as send_error:
                    failed += 1
                    last_error = str(send_error)[:500]
                    logger.error(f"[Mensajes Programados] Error enviando bloque a {jid}: {send_error}")

                time.sleep(random.randint(delay_min, delay_max))

        now = datetime.now()
        payload["lastRunAt"] = now.isoformat(sep=" ")
        payload["totalEnviados"] = int(payload.get("totalEnviados") or 0) + sent
        payload["totalFallidos"] = int(payload.get("totalFallidos") or 0) + failed
        payload["sentOccurrences"] = int(payload.get("sentOccurrences") or 0) + 1

        next_run = compute_next_scheduled_run(payload, row.get("fecha_programada") or now)
        final_status = "Completado" if sent > 0 else "Fallido"

        if next_run:
            finalize_op = payload.get("finalizarOp") or "despues"
            repetitions = int(payload.get("repeticiones") or 1)
            end_date_raw = payload.get("finalizarFecha")
            end_date = None
            if end_date_raw:
                try:
                    end_date = datetime.strptime(str(end_date_raw)[:10], "%Y-%m-%d")
                except ValueError:
                    try:
                        end_date = datetime.strptime(str(end_date_raw), "%d/%m/%Y")
                    except ValueError:
                        end_date = None

            can_continue = True
            if finalize_op == "despues" and payload["sentOccurrences"] >= repetitions:
                can_continue = False
            if finalize_op == "fecha" and end_date and next_run.date() > end_date.date():
                can_continue = False

            if can_continue and sent > 0:
                final_status = "Programado"
                payload["nextRunAt"] = next_run.isoformat(sep=" ")

        if final_status == "Programado":
            cursor.execute(
                """
                UPDATE mensajes_programados
                SET status = %s, fecha_programada = %s, fecha_texto = %s, hora_texto = %s,
                    payload_json = %s, enviado_en = %s, ultimo_error = %s,
                    total_enviados = %s, total_fallidos = %s
                WHERE id = %s
                """,
                (
                    final_status,
                    next_run.strftime("%Y-%m-%d %H:%M:%S"),
                    next_run.strftime("%d/%m/%Y"),
                    next_run.strftime("%H:%M"),
                    json.dumps(payload, ensure_ascii=False),
                    now.strftime("%Y-%m-%d %H:%M:%S"),
                    last_error,
                    payload["totalEnviados"],
                    payload["totalFallidos"],
                    message_id,
                ),
            )
        else:
            cursor.execute(
                """
                UPDATE mensajes_programados
                SET status = %s, payload_json = %s, enviado_en = %s, ultimo_error = %s,
                    total_enviados = %s, total_fallidos = %s
                WHERE id = %s
                """,
                (
                    final_status,
                    json.dumps(payload, ensure_ascii=False),
                    now.strftime("%Y-%m-%d %H:%M:%S"),
                    last_error,
                    payload["totalEnviados"],
                    payload["totalFallidos"],
                    message_id,
                ),
            )
        conn.commit()
        
        # Verificar si era un seguimiento secuencial y programar el siguiente paso si corresponde
        if sent > 0:
            name_str = str(row.get("nombre") or "")
            if name_str.startswith("Seguimiento secuencial") and " - Paso " in name_str:
                try:
                    parts = name_str.split(" - Paso ")
                    step_num = int(parts[-1])
                    next_step = step_num + 1
                    target_jid = row.get("target_id")
                    device_id = row.get("dispositivo_id")
                    contact_name = row.get("target_nombre") or "Cliente"
                    
                    # Buscar el agente asignado a este contacto
                    cursor.execute("""
                        SELECT a.seguimientos 
                        FROM contactos c
                        JOIN agentes_ia a ON c.agente_asignado_id = a.id
                        WHERE c.jid = %s AND c.dispositivo_id = %s LIMIT 1
                    """, (target_jid, device_id))
                    agent_row = cursor.fetchone()
                    if agent_row and agent_row.get("seguimientos"):
                        import json
                        seq_list = json.loads(agent_row["seguimientos"])
                        if isinstance(seq_list, list) and len(seq_list) >= next_step:
                            next_seq = seq_list[next_step - 1]
                            seq_text = next_seq.get("text")
                            seq_time = next_seq.get("time") or 30
                            seq_unit = next_seq.get("unit") or "min"
                            
                            delay_hours = 0.5
                            try:
                                val = float(seq_time)
                                if seq_unit == "min":
                                    delay_hours = val / 60.0
                                elif seq_unit == "hours" or seq_unit == "hr" or seq_unit == "hora" or seq_unit == "horas":
                                    delay_hours = val
                                elif seq_unit == "days" or seq_unit == "dia" or seq_unit == "días":
                                    delay_hours = val * 24.0
                            except ValueError:
                                pass
                                
                            if seq_text:
                                from datetime import datetime, timedelta
                                scheduled_dt = datetime.now() + timedelta(hours=delay_hours)
                                
                                import random
                                import time
                                unique_id = int(time.time() * 1000) + random.randint(100, 999)
                                
                                next_name = f"Seguimiento secuencial - {contact_name} - Paso {next_step}"
                                
                                msg_payload = {
                                    "id": unique_id,
                                    "usuario_id": user_id,
                                    "dispositivoId": device_id,
                                    "tipoEnvio": "grupo",
                                    "targetId": target_jid,
                                    "targetName": contact_name,
                                    "nombre": next_name,
                                    "campana": next_name,
                                    "velocidad": "rapido",
                                    "opcionEnvio": "ahora",
                                    "fecha": scheduled_dt.strftime("%Y-%m-%d"),
                                    "hora": scheduled_dt.strftime("%H:%M"),
                                    "repetir": False,
                                    "frecuencia": "Semanal",
                                    "diasSeleccionados": [],
                                    "repetirCada": 1,
                                    "finalizarOp": "nunca",
                                    "repeticiones": 1,
                                    "finalizarFecha": None,
                                    "soloNuevos": False,
                                    "soloLlenos": False,
                                    "messageBlocks": [
                                        {
                                            "id": int(time.time() * 1000) + 1,
                                            "type": "texto",
                                            "text": seq_text
                                        }
                                    ]
                                }
                                
                                cursor.execute("""
                                    INSERT INTO mensajes_programados (
                                        id, usuario_id, dispositivo_id, tipo_envio, target_id, target_nombre,
                                        nombre, campana, velocidad, opcion_envio, fecha_programada, fecha_texto,
                                        hora_texto, repetir, status, payload_json, creado_en, actualizado_en
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 'Programado', %s, NOW(), NOW())
                                """, (
                                    unique_id, user_id, device_id, 'grupo', target_jid, contact_name,
                                    next_name, next_name,
                                    'rapido', 'ahora', scheduled_dt, scheduled_dt.strftime("%Y-%m-%d"), scheduled_dt.strftime("%H:%M"),
                                    json.dumps(msg_payload)
                                ))
                                conn.commit()
                                logger.info(f"Siguiente paso de seguimiento ({next_name}) programado para {target_jid}.")
                except Exception as seq_err:
                    logger.error(f"Error programando siguiente paso de seguimiento secuencial: {seq_err}")
    except Exception as error:
        logger.error(f"[Mensajes Programados] Error critico procesando {message_id}: {error}", exc_info=True)
        try:
            if cursor:
                cursor.execute(
                    "UPDATE mensajes_programados SET status = 'Fallido', ultimo_error = %s WHERE id = %s",
                    (str(error)[:500], message_id),
                )
                conn.commit()
        except Exception:
            pass
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def normalize_phone_digits(value):
    raw = str(value or "").strip()
    if not raw:
        return ""

    if "@" in raw:
        raw = raw.split("@", 1)[0]
    if ":" in raw:
        raw = raw.split(":", 1)[0]

    return re.sub(r"\D+", "", raw)


def build_phone_digit_variants(phone_digits):
    variants = []
    digits = normalize_phone_digits(phone_digits)
    if not digits:
        return variants

    if digits not in variants:
        variants.append(digits)

    stripped_leading_zero = digits.lstrip("0")
    if stripped_leading_zero and stripped_leading_zero not in variants:
        variants.append(stripped_leading_zero)

    if digits.startswith("593"):
        local_digits = digits[3:]
        if local_digits and local_digits not in variants:
            variants.append(local_digits)
        local_zero = f"0{local_digits}"
        if local_digits and local_zero not in variants:
            variants.append(local_zero)
    elif stripped_leading_zero and len(stripped_leading_zero) >= 9:
        international = f"593{stripped_leading_zero[-9:]}"
        if international not in variants:
            variants.append(international)

    return variants


def is_probable_phone_digits(phone_digits):
    digits = normalize_phone_digits(phone_digits)
    return 7 <= len(digits) <= 15


def is_lid_jid(jid):
    return "@lid" in normalize_jid(jid).lower()


def should_derive_phone_from_jid(jid):
    normalized = normalize_jid(jid)
    return bool(normalized and is_user_jid(normalized) and not is_lid_jid(normalized))


def sanitize_participant_phone(value, jid=None):
    digits = normalize_phone_digits(value)
    if digits and is_probable_phone_digits(digits):
        return digits

    if jid and should_derive_phone_from_jid(jid):
        fallback_digits = normalize_phone_digits(phone_from_jid(jid))
        if is_probable_phone_digits(fallback_digits):
            return fallback_digits

    return ""


def sanitize_participant_name(value, jid=None, phone=None):
    text = clean_text(value)
    if not text:
        return ""

    row = {
        "jid": normalize_jid(jid),
        "telefono": normalize_phone_digits(phone),
    }
    return "" if looks_like_phone_alias(text, row) else text


def resolve_contact_display_name(record):
    if not record:
        return ""

    for key in ("nombre", "push_name", "verified_name", "notify_name"):
        value = str(record.get(key) or "").strip()
        if not value:
            continue
        if value.isdigit():
            continue
        if "@" in value:
            continue
        return value

    return ""


def build_group_participant_contact_maps(cursor, device_id, participant_rows):
    by_jid = {}
    by_phone = {}

    if not device_id or not participant_rows:
        return by_jid, by_phone

    participant_jids = []
    participant_phones = []
    for row in participant_rows:
        jid = normalize_jid(row.get("jid"))
        if jid:
            participant_jids.append(jid)
        phone = normalize_phone_digits(row.get("telefono") or row.get("jid"))
        if phone:
            participant_phones.extend(build_phone_digit_variants(phone))

    participant_jids = list(dict.fromkeys(participant_jids))
    participant_phones = list(dict.fromkeys(participant_phones))

    where_parts = []
    params = [device_id]

    if participant_jids:
        jid_placeholders = ", ".join(["%s"] * len(participant_jids))
        where_parts.append(f"(jid IN ({jid_placeholders}) OR lid IN ({jid_placeholders}))")
        params.extend(participant_jids)
        params.extend(participant_jids)

    if participant_phones:
        phone_placeholders = ", ".join(["%s"] * len(participant_phones))
        where_parts.append(f"telefono IN ({phone_placeholders})")
        params.extend(participant_phones)

    if not where_parts:
        return by_jid, by_phone

    cursor.execute(
        f"""
        SELECT jid, lid, telefono, nombre, push_name, verified_name, notify_name
        FROM contactos
        WHERE dispositivo_id = %s AND ({' OR '.join(where_parts)})
        """,
        tuple(params),
    )

    for contact in cursor.fetchall():
        display_name = resolve_contact_display_name(contact)
        if contact.get("jid"):
            by_jid[normalize_jid(contact.get("jid"))] = contact
        if contact.get("lid"):
            by_jid[normalize_jid(contact.get("lid"))] = contact
        phone_digits = normalize_phone_digits(contact.get("telefono"))
        if phone_digits:
            for variant in build_phone_digit_variants(phone_digits):
                by_phone[variant] = contact
        if display_name:
            contact["_resolved_display_name"] = display_name

    return by_jid, by_phone


def serialize_group_participant_row(row, contacts_by_jid, contacts_by_phone):
    raw_jid = normalize_jid(row.get("jid"))
    raw_phone = sanitize_participant_phone(row.get("telefono"), raw_jid)

    contact = (
        contacts_by_jid.get(raw_jid)
        or contacts_by_phone.get(raw_phone)
    )

    contact_name = resolve_contact_display_name(contact)
    stored_name = sanitize_participant_name(row.get("nombre"), raw_jid, raw_phone)

    display_name = contact_name or stored_name

    contact_phone = normalize_phone_digits((contact or {}).get("telefono"))
    display_phone = contact_phone or (raw_phone if is_probable_phone_digits(raw_phone) else "")
    has_trusted_identity = bool(contact_name or stored_name or contact_phone)
    if not has_trusted_identity and display_phone and len(display_phone) >= 14:
        display_phone = ""
    if not display_name:
        display_name = display_phone or "Sin nombre"

    participant_status = str(row.get("estado") or "activo").strip().lower()
    if participant_status not in {"activo", "salio"}:
        participant_status = "activo"

    return {
        "telefono": display_phone,
        "nombre": display_name,
        "origen": "WhatsApp",
        "fechaIngreso": as_json_value(row.get("fecha_ingreso")),
        "fechaSalida": as_json_value(row.get("fecha_salida")),
        "estado": participant_status,
        "rol": row.get("rol") or "miembro",
        "_searchable": f"{display_phone} {display_name}".lower(),
    }


def build_group_status_badge(status_value):
    mapping = {
        "activo": "Activo",
        "sin_admin": "Sin admin",
        "error": "Error",
        "pendiente_sync": "Pendiente de sincronización",
        "sincronizando": "Sincronizando",
    }
    return mapping.get(status_value or "", "Pendiente de sincronización")


def build_group_type_badge(type_value):
    mapping = {
        "grupo": "Grupo",
        "comunidad": "Comunidad",
        "canal": "Canal",
    }
    return mapping.get(type_value or "", "Grupo")



def group_is_sync_pending(row):
    return (row.get("estado_sync") or "") in {"pendiente_sync", "sincronizando"}


def log_group_module_action(cursor, group_module_id, action, detail=None):
    cursor.execute(
        """
        INSERT INTO grupos_modulo_historial (grupo_modulo_id, accion, detalle)
        VALUES (%s, %s, %s)
        """,
        (group_module_id, action, detail),
    )


def get_group_admin_connection_status(device_state):
    return "Conectado" if (device_state or "").lower() == "conectado" else "Desconectado"


def resolve_group_admin_verification(cursor, source_group_id, device_phone):
    phone_digits = normalize_phone_digits(device_phone)
    if not source_group_id or not phone_digits:
        return False, 0, 0

    phone_variants = build_phone_digit_variants(phone_digits)
    if not phone_variants:
        return False, 0, 0

    placeholders = ", ".join(["%s"] * len(phone_variants))
    params = tuple(phone_variants + phone_variants + [source_group_id])

    cursor.execute(
        f"""
        SELECT
            COUNT(*) AS total,
            SUM(CASE WHEN rol IN ('admin', 'superadmin') THEN 1 ELSE 0 END) AS admins_total,
            SUM(
                CASE
                    WHEN rol IN ('admin', 'superadmin')
                        AND (
                            REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(telefono, ''), '+', ''), '-', ''), ' ', ''), '(', ''), ')', '') IN ({placeholders})
                            OR SUBSTRING_INDEX(SUBSTRING_INDEX(COALESCE(jid, ''), '@', 1), ':', 1) IN ({placeholders})
                        )
                    THEN 1
                    ELSE 0
                END
            ) AS current_device_is_admin
        FROM participantes_grupo
        WHERE grupo_id = %s
        """,
        params,
    )
    row = cursor.fetchone() or {}
    current_device_is_admin = int(row.get("current_device_is_admin") or 0) > 0
    total = int(row.get("total") or 0)
    admins_total = int(row.get("admins_total") or 0)
    return current_device_is_admin, total, admins_total


def extract_group_metadata_subject(bridge_response, fallback_jid=None):
    subject = clean_name_value(
        bridge_response.get("subject")
        or bridge_response.get("name")
        or bridge_response.get("title"),
        fallback_jid or bridge_response.get("jid") or "",
    )
    return subject


def extract_group_metadata_invite_link(bridge_response):
    direct_link = bridge_response.get("inviteLink") or bridge_response.get("invite_link")
    if isinstance(direct_link, str) and direct_link.strip():
        return direct_link.strip()

    for container_key in ("metadata", "groupMetadata", "data", "group"):
        container = bridge_response.get(container_key)
        if not isinstance(container, dict):
            continue

        candidate = container.get("inviteLink") or container.get("invite_link")
        if isinstance(candidate, str) and candidate.strip():
            return candidate.strip()

        invite_code = container.get("inviteCode") or container.get("invite_code")
        if isinstance(invite_code, str) and invite_code.strip():
            return f"https://chat.whatsapp.com/{invite_code.strip()}"

    return None


def extract_group_metadata_participants(bridge_response):
    candidates = []

    if isinstance(bridge_response.get("participants"), list):
        candidates = bridge_response.get("participants") or []
    else:
        for container_key in ("metadata", "groupMetadata", "data", "group"):
            container = bridge_response.get(container_key)
            if isinstance(container, dict) and isinstance(container.get("participants"), list):
                candidates = container.get("participants") or []
                break

    participants = []
    seen_jids = set()

    for raw_participant in candidates:
        if isinstance(raw_participant, str):
            participant_jid = normalize_jid(raw_participant)
            participant_phone = sanitize_participant_phone(None, participant_jid)
            participant_name = None
            admin_value = ""
        elif isinstance(raw_participant, dict):
            participant_jid = normalize_jid(
                raw_participant.get("resolvedJid")
                or raw_participant.get("resolved_jid")
                or raw_participant.get("id")
                or raw_participant.get("jid")
                or raw_participant.get("participant")
                or raw_participant.get("userJid")
            )
            participant_phone = sanitize_participant_phone(
                raw_participant.get("telefono")
                or raw_participant.get("phone")
                or raw_participant.get("telefono_resuelto"),
                participant_jid,
            )
            participant_name = (
                raw_participant.get("nombre")
                or raw_participant.get("name")
                or raw_participant.get("pushName")
                or raw_participant.get("push_name")
                or raw_participant.get("notifyName")
                or raw_participant.get("notify_name")
                or raw_participant.get("verifiedName")
                or raw_participant.get("verified_name")
            )
            admin_value = str(
                raw_participant.get("admin")
                or raw_participant.get("role")
                or ""
            ).strip().lower()
        else:
            continue

        if not participant_jid or participant_jid in seen_jids:
            continue

        seen_jids.add(participant_jid)
        role = "miembro"
        if admin_value in {"superadmin", "owner", "creator"}:
            role = "superadmin"
        elif admin_value in {"admin", "super_admin"}:
            role = "admin"

        participants.append(
            {
                "jid": participant_jid,
                "telefono": participant_phone,
                "nombre": participant_name,
                "rol": role,
            }
        )

    return participants


def resolve_group_identity_payload(row, contacts_by_jid, contacts_by_phone):
    raw_jid = normalize_jid(row.get("jid"))
    raw_phone = sanitize_participant_phone(row.get("telefono"), raw_jid)
    contact = contacts_by_jid.get(raw_jid) or contacts_by_phone.get(raw_phone)

    contact_name = resolve_contact_display_name(contact)
    stored_name = sanitize_participant_name(row.get("nombre"), raw_jid, raw_phone)
    display_name = contact_name or stored_name

    contact_phone = normalize_phone_digits((contact or {}).get("telefono"))
    display_phone = contact_phone or (raw_phone if is_probable_phone_digits(raw_phone) else "")
    if not display_name:
        display_name = display_phone or "Sin nombre"

    return {
        "jid": raw_jid,
        "telefono": display_phone,
        "nombre": display_name,
    }


def replace_group_source_participants(cursor, source_group_id, device_id, bridge_response):
    if not source_group_id:
        return 0

    participants = extract_group_metadata_participants(bridge_response)
    if not participants:
        return 0

    contact_name_map = {}
    participant_jids = [item["jid"] for item in participants if item.get("jid")]
    participant_phones = []
    for item in participants:
        item_phone = item.get("telefono")
        if not item_phone:
            continue
        for phone_variant in build_phone_digit_variants(item_phone):
            if phone_variant and phone_variant not in participant_phones:
                participant_phones.append(phone_variant)

    jid_placeholders = ", ".join(["%s"] * len(participant_jids)) if participant_jids else ""
    phone_placeholders = ", ".join(["%s"] * len(participant_phones)) if participant_phones else ""

    where_clauses = []
    params = [device_id]

    if participant_jids:
        where_clauses.append(f"jid IN ({jid_placeholders})")
        params.extend(participant_jids)
    if participant_phones:
        where_clauses.append(f"telefono IN ({phone_placeholders})")
        params.extend(participant_phones)

    if where_clauses:
        cursor.execute(
            f"""
            SELECT jid, telefono, nombre, push_name, verified_name, notify_name
            FROM contactos
            WHERE dispositivo_id = %s AND ({' OR '.join(where_clauses)})
            """,
            tuple(params),
        )
        for contact in cursor.fetchall():
            resolved_name = (
                contact.get("nombre")
                or contact.get("push_name")
                or contact.get("verified_name")
                or contact.get("notify_name")
                or normalize_phone_digits(contact.get("telefono") or contact.get("jid"))
            )
            if contact.get("jid"):
                contact_name_map[normalize_jid(contact.get("jid"))] = resolved_name
            if contact.get("telefono"):
                contact_name_map[normalize_phone_digits(contact.get("telefono"))] = resolved_name

    cursor.execute(
        """
        SELECT id, jid, telefono, nombre, rol, estado, fecha_ingreso, fecha_salida
        FROM participantes_grupo
        WHERE grupo_id = %s
        """,
        (source_group_id,),
    )
    existing_rows = cursor.fetchall()
    existing_by_jid = {
        normalize_jid(item.get("jid")): item
        for item in existing_rows
        if normalize_jid(item.get("jid"))
    }

    active_jids = set()
    for participant in participants:
        participant_jid = normalize_jid(participant.get("jid"))
        if not participant_jid:
            continue

        active_jids.add(participant_jid)
        participant_phone = sanitize_participant_phone(participant.get("telefono"), participant_jid)
        fallback_name = (
            participant.get("nombre")
            or participant_phone
        )
        resolved_name = sanitize_participant_name(
            contact_name_map.get(participant_jid)
            or contact_name_map.get(participant_phone)
            or participant.get("nombre")
            or fallback_name,
            participant_jid,
            participant_phone,
        )
        existing_row = existing_by_jid.get(participant_jid)
        if existing_row:
            cursor.execute(
                """
                UPDATE participantes_grupo
                SET telefono = %s,
                    nombre = %s,
                    rol = %s,
                    estado = 'activo',
                    fecha_ingreso = COALESCE(fecha_ingreso, NOW()),
                    fecha_salida = NULL,
                    actualizado_en = NOW()
                WHERE id = %s
                """,
                (
                    participant_phone or None,
                    resolved_name or None,
                    participant.get("rol") or "miembro",
                    existing_row.get("id"),
                ),
            )
        else:
            cursor.execute(
                """
                INSERT INTO participantes_grupo (
                    grupo_id, jid, telefono, nombre, rol, estado, fecha_ingreso, fecha_salida, actualizado_en
                )
                VALUES (%s, %s, %s, %s, %s, 'activo', NOW(), NULL, NOW())
                """,
                (
                    source_group_id,
                    participant_jid,
                    participant_phone or None,
                    resolved_name or None,
                    participant.get("rol") or "miembro",
                ),
            )

    for existing_row in existing_rows:
        existing_jid = normalize_jid(existing_row.get("jid"))
        if not existing_jid or existing_jid in active_jids:
            continue
        cursor.execute(
            """
            UPDATE participantes_grupo
            SET estado = 'salio',
                fecha_salida = COALESCE(fecha_salida, NOW()),
                actualizado_en = NOW()
            WHERE id = %s
            """,
            (existing_row.get("id"),),
        )

    return len(active_jids)


def merge_bridge_groups_with_local(cursor, user_id, devices):
    cursor.execute(
        """
        SELECT
            g.id,
            g.dispositivo_id,
            g.jid,
            g.nombre,
            gm.tipo AS modulo_tipo,
            d.nombre AS dispositivo_nombre,
            d.numero_telefono,
            d.estado AS dispositivo_estado,
            (
                SELECT COUNT(*)
                FROM participantes_grupo pg
                WHERE pg.grupo_id = g.id
            ) AS participantes_total,
            (
                SELECT SUM(CASE WHEN pg.rol IN ('admin', 'superadmin') THEN 1 ELSE 0 END)
                FROM participantes_grupo pg
                WHERE pg.grupo_id = g.id
            ) AS admins_total
        FROM grupos g
        INNER JOIN dispositivos d ON d.id = g.dispositivo_id
        LEFT JOIN grupos_modulo gm
            ON gm.usuario_id = d.usuario_id
            AND gm.dispositivo_id = g.dispositivo_id
            AND gm.jid = g.jid
            AND gm.eliminado_en IS NULL
        WHERE d.usuario_id = %s
        UNION ALL
        SELECT
            NULL AS id,
            gm.dispositivo_id,
            gm.jid,
            gm.nombre,
            gm.tipo AS modulo_tipo,
            d.nombre AS dispositivo_nombre,
            d.numero_telefono,
            d.estado AS dispositivo_estado,
            gm.participantes_count AS participantes_total,
            gm.admins_count AS admins_total
        FROM grupos_modulo gm
        INNER JOIN dispositivos d ON d.id = gm.dispositivo_id
        WHERE gm.usuario_id = %s
          AND gm.eliminado_en IS NULL
          AND NOT EXISTS (
              SELECT 1
              FROM grupos g2
              WHERE g2.dispositivo_id = gm.dispositivo_id
                AND g2.jid = gm.jid
          )
        """,
        (user_id, user_id),
    )
    local_rows = cursor.fetchall()
    local_map = {
        (int(row.get("dispositivo_id")), normalize_jid(row.get("jid"))): row
        for row in local_rows
        if row.get("dispositivo_id") and row.get("jid")
    }

    groups_map = {}
    warnings = []

    for row in local_rows:
        normalized_jid = normalize_jid(row.get("jid"))
        row_type = normalize_group_module_type(row.get("modulo_tipo"), normalized_jid)
        if row_type == "canal":
            admins_total = int(row.get("admins_total") or 0)
            is_admin = bool(admins_total > 0)
            participants_total = int(row.get("participantes_total") or 0)
        else:
            is_admin, participants_total, admins_total = resolve_group_admin_verification(
                cursor,
                row.get("id"),
                row.get("numero_telefono"),
            )
        participants_total = participants_total or int(row.get("participantes_total") or 0)
        admins_total = admins_total or int(row.get("admins_total") or 0)
        if not normalized_jid:
            continue

        groups_map[(int(row.get("dispositivo_id")), normalized_jid)] = {
            "id": normalized_jid,
            "sourceGroupId": row.get("id"),
            "dispositivoId": row.get("dispositivo_id"),
            "jid": normalized_jid,
            "nombre": row.get("nombre") or "Grupo sin nombre",
            "tipo": row_type,
            "dispositivoNombre": row.get("dispositivo_nombre") or "Mi WhatsApp",
            "dispositivoEstado": row.get("dispositivo_estado") or "desconectado",
            "participantes": participants_total,
            "admins": admins_total,
            "canImport": bool(is_admin or (row_type != "canal" and participants_total == 0)),
            "requiresAdmin": bool((row_type != "canal" and participants_total > 0) or (row_type == "canal" and not is_admin)),
            "isAdmin": bool(is_admin),
        }

    devices_with_bridge_groups = set()
    bridge_jids = set()

    for device in devices:
        bridge_payload = fetch_bridge_json(device.get("id"), "/groups", user_id=user_id)
        if not bridge_payload or bridge_payload.get("success") is False or bridge_payload.get("error"):
            device_name = device.get("nombre") or f"Dispositivo {device.get('id')}"
            bridge_error = (
                (bridge_payload or {}).get("message")
                or (bridge_payload or {}).get("error")
                or "No se pudo consultar WhatsApp"
            )
            warnings.append(
                f"No se pudieron cargar todos los grupos en tiempo real para {device_name}: {bridge_error}."
            )
            continue

        devices_with_bridge_groups.add(int(device.get("id")))
        bridge_groups = bridge_payload.get("groups") or []
        if not bridge_groups:
            device_name = device.get("nombre") or f"Dispositivo {device.get('id')}"
            warnings.append(
                f"WhatsApp no devolvió grupos en tiempo real para {device_name}. Se muestran solo los grupos ya detectados localmente."
            )

        for bridge_group in bridge_groups:
            normalized_jid = normalize_jid(bridge_group.get("jid"))
            if not normalized_jid:
                continue

            bridge_jids.add((int(device.get("id")), normalized_jid))
            local_row = local_map.get((int(device.get("id")), normalized_jid))
            existing_group = groups_map.get((int(device.get("id")), normalized_jid)) or {}
            bridge_participants = int(bridge_group.get("participantes") or 0)
            bridge_admins = int(bridge_group.get("admins") or 0)
            groups_map[(int(device.get("id")), normalized_jid)] = {
                "id": normalized_jid,
                "sourceGroupId": local_row.get("id") if local_row else None,
                "dispositivoId": device.get("id"),
                "jid": normalized_jid,
                "nombre": bridge_group.get("nombre") or (local_row.get("nombre") if local_row else None) or "Grupo sin nombre",
                "tipo": normalize_group_module_type(
                    bridge_group.get("tipo") or (local_row.get("modulo_tipo") if local_row else None),
                    normalized_jid,
                    bridge_group,
                ),
                "dispositivoNombre": device.get("nombre") or "Mi WhatsApp",
                "dispositivoEstado": device.get("estado") or "desconectado",
                "participantes": bridge_participants or int(existing_group.get("participantes") or 0) or int((local_row or {}).get("participantes_total") or 0),
                "admins": bridge_admins or int(existing_group.get("admins") or 0) or int((local_row or {}).get("admins_total") or 0),
                "canImport": bool(bridge_group.get("canImport") or existing_group.get("canImport")),
                "requiresAdmin": bool(bridge_group.get("requiresAdmin") or existing_group.get("requiresAdmin") or bridge_participants > 0),
                "isAdmin": bool(bridge_group.get("isAdmin") or existing_group.get("isAdmin")),
            }

    groups = []
    for key, item in groups_map.items():
        dev_id, jid = key
        if dev_id in devices_with_bridge_groups:
            if key not in bridge_jids:
                # Si el bridge de este dispositivo está activo y no devolvió este JID, lo descartamos (ej. comunidad padre, grupo del que salió, etc.)
                continue
        groups.append(item)

    groups.sort(key=lambda item: (str(item.get("nombre") or "").lower(), str(item.get("jid") or "").lower()))
    return {"groups": groups, "warnings": warnings}


def serialize_group_module_row(row):
    return {
        "id": row.get("id"),
        "usuarioId": row.get("usuario_id"),
        "dispositivoId": row.get("dispositivo_id"),
        "grupoOrigenId": row.get("grupo_origen_id"),
        "jid": row.get("jid"),
        "nombre": row.get("nombre") or "Grupo sin nombre",
        "origen": row.get("origen") or "WhatsApp",
        "clicks": int(row.get("clicks") or 0),
        "admins": int(row.get("admins_count") or 0),
        "participantes": int(row.get("participantes_count") or 0),
        "mensajesProgramados": int(row.get("mensajes_programados_count") or 0),
        "tipo": row.get("tipo") or "grupo",
        "tipoLabel": build_group_type_badge(row.get("tipo")),
        "lleno": bool(row.get("lleno") or False),
        "estado": row.get("estado_sync") or "pendiente_sync",
        "estadoLabel": build_group_status_badge(row.get("estado_sync")),
        "capacidadLabel": "Lleno" if bool(row.get("lleno") or False) else "Disponible",
        "inviteLink": row.get("invite_link"),
        "creadoEn": as_json_value(row.get("creado_en")),
        "actualizadoEn": as_json_value(row.get("actualizado_en")),
        "sincronizadoEn": as_json_value(row.get("sincronizado_en")),
        "ultimaSincronizacion": as_json_value(row.get("sincronizado_en")) or "Nunca sincronizado",
        "dispositivoNombre": row.get("dispositivo_nombre") or "Mi WhatsApp",
        "dispositivoEstado": row.get("dispositivo_estado") or "desconectado",
        "hasPendingSync": group_is_sync_pending(row),
    }


def sync_group_module_counts(cursor, group_module_id):
    cursor.execute(
        """
        SELECT gm.id, gm.grupo_origen_id, gm.estado_sync, gm.tipo, d.numero_telefono
        FROM grupos_modulo gm
        INNER JOIN dispositivos d ON d.id = gm.dispositivo_id
        WHERE gm.id = %s
        LIMIT 1
        """,
        (group_module_id,),
    )
    module_row = cursor.fetchone()
    if not module_row:
        return

    source_group_id = module_row.get("grupo_origen_id")
    if source_group_id:
        cursor.execute(
            """
            SELECT
                COUNT(*) AS total,
                SUM(CASE WHEN rol IN ('admin', 'superadmin') THEN 1 ELSE 0 END) AS admins_total
            FROM participantes_grupo
            WHERE grupo_id = %s
            """,
            (source_group_id,),
        )
        participant_row = cursor.fetchone() or {}
        total = int(participant_row.get("total") or 0)
        admins_total = int(participant_row.get("admins_total") or 0)

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM campana_grupos cg
            INNER JOIN campanas c ON c.id = cg.campana_id
            WHERE cg.grupo_id = %s
            """,
            (source_group_id,),
        )
        campaign_row = cursor.fetchone() or {}
        scheduled_total = int(campaign_row.get("total") or 0)
    else:
        total = 0
        admins_total = 0
        scheduled_total = 0

    is_admin, _, _ = resolve_group_admin_verification(cursor, source_group_id, module_row.get("numero_telefono"))
    current_state = (module_row.get("estado_sync") or "").strip().lower()

    if current_state == "sincronizando":
        state_value = "sincronizando"
    elif current_state == "error" and total == 0:
        state_value = "error"
    elif module_row.get("tipo") == "canal":
        state_value = current_state if current_state in ("activo", "sin_admin") else "activo"
    elif current_state == "pendiente_sync" and total == 0:
        state_value = "pendiente_sync"
    elif total == 0 and not is_admin:
        state_value = "pendiente_sync"
    else:
        state_value = "activo" if is_admin else "sin_admin"

    cursor.execute(
        """
        UPDATE grupos_modulo
        SET participantes_count = %s,
            admins_count = %s,
            mensajes_programados_count = %s,
            estado_sync = %s,
            actualizado_en = NOW()
        WHERE id = %s
        """,
        (total, admins_total, scheduled_total, state_value, group_module_id),
    )


@app.route("/api/scheduled_messages", methods=["GET"])
def get_scheduled_messages():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_scheduled_messages_table(cursor)
        cursor.execute(
            """
            SELECT *
            FROM mensajes_programados
            WHERE usuario_id = %s
            ORDER BY actualizado_en DESC, id DESC
            """,
            (user_id,),
        )
        rows = cursor.fetchall()
        return jsonify({"success": True, "data": [serialize_scheduled_message_row(row) for row in rows]})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/scheduled_messages/options", methods=["GET"])
def get_scheduled_message_options():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_campanas_tables(cursor)

        cursor.execute(
            """
            SELECT id, nombre, dispositivo_id, numero_telefono, estado
            FROM dispositivos
            WHERE usuario_id = %s
            ORDER BY id ASC
            """,
            (user_id,),
        )
        devices = cursor.fetchall()

        cursor.execute(
            """
            SELECT g.id, g.nombre, g.jid, g.dispositivo_id, d.nombre AS dispositivo_nombre
            FROM grupos g
            INNER JOIN dispositivos d ON d.id = g.dispositivo_id
            INNER JOIN grupos_modulo gm
                ON gm.usuario_id = d.usuario_id
                AND gm.dispositivo_id = g.dispositivo_id
                AND gm.jid = g.jid
            WHERE d.usuario_id = %s AND gm.eliminado_en IS NULL
            ORDER BY g.nombre ASC, g.id ASC
            """,
            (user_id,),
        )
        groups = cursor.fetchall()

        cursor.execute(
            """
            SELECT id, nombre, dispositivo_id, estado, programado_para, creado_en
            FROM campanas
            WHERE usuario_id = %s
            ORDER BY creado_en DESC, id DESC
            """,
            (user_id,),
        )
        campaign_rows = cursor.fetchall()

        campaigns = [
            {
                "target_id": f"campana:{row['id']}",
                "id": row["id"],
                "nombre": row.get("nombre"),
                "dispositivo_id": row.get("dispositivo_id"),
                "estado": row.get("estado"),
                "programado_para": as_json_value(row.get("programado_para")),
                "source": "campana",
            }
            for row in campaign_rows
        ]

        return jsonify(
            {
                "success": True,
                "data": {
                    "devices": devices,
                    "groups": groups,
                    "campaigns": campaigns,
                },
            }
        )
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/scheduled_messages/upload-media", methods=["POST"])
def upload_scheduled_message_media():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario requerido"}), 401

    file = request.files.get("file")
    block_type = request.form.get("type") or request.args.get("type") or ""
    if not file or not file.filename:
        return jsonify({"success": False, "message": "Archivo requerido"}), 400

    rules = SCHEDULED_MEDIA_RULES.get(block_type)
    if not rules:
        return jsonify({"success": False, "message": "Tipo de archivo no permitido"}), 400

    original_name = secure_filename(file.filename)
    ext = original_name.rsplit(".", 1)[-1].lower() if "." in original_name else ""
    if ext not in rules["extensions"]:
        return jsonify({"success": False, "message": "Formato de archivo no permitido"}), 400

    file.seek(0, os.SEEK_END)
    file_size = file.tell()
    file.seek(0)

    max_size = rules.get("max_size")
    if block_type == "Imagen/Video":
        max_size = rules["max_video_size"] if ext == "mp4" else rules["max_image_size"]
    if file_size > max_size:
        return jsonify({"success": False, "message": "El archivo supera el tamano maximo permitido"}), 400

    try:
        upload_dir = os.path.join(app.config["UPLOAD_FOLDER"], "mensajes_programados", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        unique_name = f"{uuid.uuid4().hex}_{original_name}"
        absolute_path = os.path.join(upload_dir, unique_name)
        file.save(absolute_path)

        media_path = f"mensajes_programados/{user_id}/{unique_name}"
        media_url = f"{request.host_url.rstrip('/')}/media/{media_path}"
        media_type = scheduled_media_type_from_filename(original_name, file.mimetype)

        return jsonify(
            {
                "success": True,
                "data": {
                    "url": media_url,
                    "mediaUrl": media_url,
                    "mediaPath": media_path,
                    "filename": original_name,
                    "fileName": original_name,
                    "fileType": file.mimetype,
                    "fileSize": file_size,
                    "mediaType": media_type,
                },
            }
        )
    except Exception as error:
        logger.exception("Error subiendo media de mensaje programado")
        return jsonify({"success": False, "message": str(error)}), 500


@app.route("/api/scheduled_messages", methods=["POST"])
@jwt_required()
def create_scheduled_message():
    # Solo admins/superadmins pueden crear mensajes programados
    role_err = require_admin_role()
    if role_err:
        return role_err

    payload = request.get_json(silent=True)
    if not payload:
        return jsonify({"success": False, "message": "Payload inválido"}), 400

    user_id = resolve_request_user_id()
    if not user_id:
        user_id = payload.get("usuario_id")

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    requested_status = payload.get("status") or "Borrador"
    if requested_status == "Enviar ahora":
        payload["status"] = "Programado"
        payload["opcionEnvio"] = "ahora"
        payload["fecha"] = datetime.now().strftime("%d/%m/%Y")
        payload["hora"] = datetime.now().strftime("%H:%M")
        payload["repetir"] = False
        payload["diasSeleccionados"] = []
        payload["repetirCada"] = 1
        payload["finalizarOp"] = "nunca"
        payload["repeticiones"] = 1
        payload["finalizarFecha"] = None
        payload["soloNuevos"] = False
        payload["soloLlenos"] = False

    payload_id = payload.get("id") or int(time.time() * 1000)
    payload["id"] = int(payload_id)
    payload["usuario_id"] = user_id

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_scheduled_messages_table(cursor)

        dispositivo_id, resolved_target_id, resolved_target_name = resolve_scheduled_message_target(cursor, user_id, payload)

        payload["targetId"] = resolved_target_id
        payload["targetName"] = resolved_target_name
        payload["dispositivoId"] = dispositivo_id

        fecha_programada = build_programmed_datetime(payload.get("fecha"), payload.get("hora"))
        finalizar_fecha = build_programmed_datetime(payload.get("finalizarFecha"), "00:00") if payload.get("finalizarFecha") else None

        cursor.execute(
            """
            INSERT INTO mensajes_programados (
                id, usuario_id, dispositivo_id, tipo_envio, target_id, target_nombre,
                nombre, campana, velocidad, opcion_envio, fecha_programada, fecha_texto,
                hora_texto, repetir, frecuencia, dias_seleccionados, repetir_cada,
                finalizar_op, repeticiones, finalizar_fecha, solo_nuevos, solo_llenos,
                status, payload_json, creado_en, actualizado_en
            ) VALUES (
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, %s, %s, %s,
                %s, %s, NOW(), NOW()
            )
            ON DUPLICATE KEY UPDATE
                dispositivo_id = VALUES(dispositivo_id),
                tipo_envio = VALUES(tipo_envio),
                target_id = VALUES(target_id),
                target_nombre = VALUES(target_nombre),
                nombre = VALUES(nombre),
                campana = VALUES(campana),
                velocidad = VALUES(velocidad),
                opcion_envio = VALUES(opcion_envio),
                fecha_programada = VALUES(fecha_programada),
                fecha_texto = VALUES(fecha_texto),
                hora_texto = VALUES(hora_texto),
                repetir = VALUES(repetir),
                frecuencia = VALUES(frecuencia),
                dias_seleccionados = VALUES(dias_seleccionados),
                repetir_cada = VALUES(repetir_cada),
                finalizar_op = VALUES(finalizar_op),
                repeticiones = VALUES(repeticiones),
                finalizar_fecha = VALUES(finalizar_fecha),
                solo_nuevos = VALUES(solo_nuevos),
                solo_llenos = VALUES(solo_llenos),
                status = VALUES(status),
                payload_json = VALUES(payload_json),
                actualizado_en = NOW()
            """,
            (
                payload["id"],
                user_id,
                dispositivo_id,
                (payload.get("tipoEnvio") or "campana"),
                resolved_target_id,
                resolved_target_name,
                payload.get("nombre"),
                payload.get("campana"),
                payload.get("velocidad"),
                payload.get("opcionEnvio"),
                fecha_programada,
                payload.get("fecha"),
                payload.get("hora"),
                1 if payload.get("repetir") else 0,
                payload.get("frecuencia"),
                json.dumps(payload.get("diasSeleccionados") or [], ensure_ascii=False),
                payload.get("repetirCada"),
                payload.get("finalizarOp"),
                payload.get("repeticiones"),
                finalizar_fecha,
                1 if payload.get("soloNuevos") else 0,
                1 if payload.get("soloLlenos") else 0,
                payload.get("status") or "Borrador",
                json.dumps(payload, ensure_ascii=False),
            ),
        )
        conn.commit()

        cursor.execute("SELECT * FROM mensajes_programados WHERE id = %s AND usuario_id = %s", (payload["id"], user_id))
        saved_row = cursor.fetchone()

        serialized = serialize_scheduled_message_row(saved_row)

        if requested_status == "Enviar ahora":
            import threading

            t = threading.Thread(target=process_scheduled_message, args=(payload["id"], user_id))
            t.daemon = True
            t.start()
            serialized["status"] = "Enviando"

        return jsonify({"success": True, "data": serialized}), 201
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/scheduled_messages/<int:message_id>", methods=["DELETE"])
def delete_scheduled_message(message_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    # Verificar rol del usuario
    try:
        conn_r = get_connection()
        cur_r = conn_r.cursor(dictionary=True)
        cur_r.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (int(user_id),))
        u_row = cur_r.fetchone()
        cur_r.close(); conn_r.close()
        if u_row and u_row.get("rol") in ("agente", "visor"):
            return jsonify({"success": False, "message": "Acción no permitida para colaboradores"}), 403
    except Exception as e:
        logger.error(f"Error verificando rol en delete_scheduled_message: {e}")

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor()
        ensure_scheduled_messages_table(cursor)
        cursor.execute("DELETE FROM mensajes_programados WHERE id = %s AND usuario_id = %s", (message_id, user_id))
        conn.commit()
        return jsonify({"success": True, "deleted": cursor.rowcount > 0})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups/import-options", methods=["GET"])
def get_groups_import_options():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)

        device_columns = get_table_columns(cursor, "dispositivos")
        device_photo_field = next(
            (
                column_name
                for column_name in ("foto_perfil", "profile_picture_url", "avatar_url", "imagen_url")
                if column_name in device_columns
            ),
            None,
        )
        device_select_fields = ["id", "nombre", "numero_telefono", "estado"]
        if device_photo_field:
            device_select_fields.append(f"{device_photo_field} AS foto_perfil")

        cursor.execute(
            f"""
            SELECT {', '.join(device_select_fields)}
            FROM dispositivos
            WHERE usuario_id = %s
            ORDER BY id ASC
            """,
            (user_id,),
        )
        devices = cursor.fetchall()
        for device in devices:
            profile_picture = public_media_url(device.get("foto_perfil"))
            device["foto_perfil"] = profile_picture
            device["fotoPerfil"] = profile_picture
            device_id = device.get("id")
            device_state = str(device.get("estado") or "").strip().lower()
            if not device_id or device_state != "conectado":
                continue
            if not is_bridge_running(device_id):
                start_whatsapp_bridge(user_id, device_id)
            wait_for_bridge_port(device_id, timeout_seconds=12)
            if not device.get("foto_perfil") or not device.get("nombre") or device.get("nombre") in ("Mi WhatsApp", "Terminal WhatsApp", "Terminal", "Sin asignar"):
                bridge_me = fetch_bridge_json(device_id, "/me", timeout=8, user_id=user_id)
                bridge_photo = public_media_url(
                    bridge_me.get("profilePhoto")
                    or bridge_me.get("foto_perfil")
                    or bridge_me.get("photo")
                )
                bridge_name = (
                    bridge_me.get("name")
                    or bridge_me.get("pushname")
                    or bridge_me.get("pushName")
                )
                if bridge_photo and not device.get("foto_perfil"):
                    cursor.execute(
                        """
                        UPDATE dispositivos
                        SET foto_perfil = %s
                        WHERE id = %s AND usuario_id = %s
                        """,
                        (bridge_photo, device_id, user_id),
                    )
                    conn.commit()
                    device["foto_perfil"] = bridge_photo
                    device["fotoPerfil"] = bridge_photo

                if bridge_name and (not device.get("nombre") or device.get("nombre") in ("Mi WhatsApp", "Terminal WhatsApp", "Terminal", "Sin asignar")):
                    cursor.execute(
                        """
                        UPDATE dispositivos
                        SET nombre = %s
                        WHERE id = %s AND usuario_id = %s
                        """,
                        (bridge_name, device_id, user_id),
                    )
                    conn.commit()
                    device["nombre"] = bridge_name

        merged = merge_bridge_groups_with_local(cursor, user_id, devices)

        return jsonify(
            {
                "success": True,
                "data": {
                    "devices": devices,
                    "groups": merged.get("groups") or [],
                    "warnings": merged.get("warnings") or [],
                },
            }
        )
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups", methods=["GET"])
def get_groups_module():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    search = (request.args.get("q") or "").strip()
    filter_type = (request.args.get("tipo") or "todos").strip().lower()
    filter_status = (request.args.get("estado") or "todos").strip().lower()
    filter_device = (request.args.get("dispositivo_id") or "").strip()

    where_parts = ["gm.usuario_id = %s", "gm.eliminado_en IS NULL"]
    params = [user_id]

    if search:
        like_search = f"%{search}%"
        where_parts.append("(gm.nombre LIKE %s OR gm.jid LIKE %s OR d.nombre LIKE %s)")
        params.extend([like_search, like_search, like_search])

    if filter_type and filter_type != "todos":
        where_parts.append("gm.tipo = %s")
        params.append(filter_type)

    status_map = {
        "activo": "activo",
        "sin admin": "sin_admin",
        "sin_admin": "sin_admin",
        "error": "error",
        "pendiente de sincronización": "pendiente_sync",
        "pendiente de sincronizacion": "pendiente_sync",
        "pendiente_sync": "pendiente_sync",
        "sincronizando": "sincronizando",
        "todos los estados": None,
        "todos": None,
    }
    resolved_status = status_map.get(filter_status, filter_status if filter_status not in {"", "todos"} else None)
    if resolved_status:
        where_parts.append("gm.estado_sync = %s")
        params.append(resolved_status)

    if filter_device and filter_device not in {"todos", "todos los dispositivos"}:
        where_parts.append("gm.dispositivo_id = %s")
        params.append(int(filter_device))

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)

        cursor.execute(
            """
            SELECT id, nombre, numero_telefono, estado
            FROM dispositivos
            WHERE usuario_id = %s
            ORDER BY id ASC
            """,
            (user_id,),
        )
        devices = cursor.fetchall()

        where_sql = " AND ".join(where_parts)
        cursor.execute(
            f"""
            SELECT
                gm.*,
                d.nombre AS dispositivo_nombre,
                d.estado AS dispositivo_estado
            FROM grupos_modulo gm
            INNER JOIN dispositivos d ON d.id = gm.dispositivo_id
            WHERE {where_sql}
            ORDER BY gm.creado_en DESC, gm.id DESC
            """,
            tuple(params),
        )
        rows = cursor.fetchall()

        for row in rows:
            sync_group_module_counts(cursor, row["id"])

        conn.commit()

        cursor.execute(
            f"""
            SELECT
                gm.*,
                d.nombre AS dispositivo_nombre,
                d.estado AS dispositivo_estado
            FROM grupos_modulo gm
            INNER JOIN dispositivos d ON d.id = gm.dispositivo_id
            WHERE {where_sql}
            ORDER BY gm.creado_en DESC, gm.id DESC
            """,
            tuple(params),
        )
        refreshed_rows = cursor.fetchall()

        items = [serialize_group_module_row(row) for row in refreshed_rows]
        pending_sync = [item for item in items if item.get("hasPendingSync")]

        return jsonify(
            {
                "success": True,
                "data": {
                    "items": items,
                    "devices": devices,
                    "pendingSync": pending_sync,
                },
            }
        )
    except (mysql.connector.Error, ValueError) as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups/import", methods=["POST"])
def import_groups_module():
    payload = request.get_json(silent=True) or {}
    user_id = resolve_request_user_id() or payload.get("user_id")
    selected_ids = payload.get("group_ids") or []
    selected_type = (payload.get("tipo") or "grupo").strip().lower()
    selected_type = normalize_group_module_type(selected_type)
    selected_device_id = payload.get("device_id")

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    if not isinstance(selected_ids, list) or not selected_ids:
        return jsonify({"success": False, "message": "Debes seleccionar al menos un grupo"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)

        results = []
        imported_items = []
        live_groups_by_jid = {}

        if selected_device_id:
            bridge_payload = fetch_bridge_json(selected_device_id, "/groups", user_id=user_id)
            if bridge_payload and bridge_payload.get("success") and not bridge_payload.get("error"):
                live_groups_by_jid = {
                    normalize_jid(item.get("jid")): item
                    for item in (bridge_payload.get("groups") or [])
                    if item.get("jid")
                }

        for raw_group_id in selected_ids:
            source_row = None
            original_group_id = raw_group_id
            bridge_group = None
            normalized_group_jid = normalize_jid(raw_group_id) if isinstance(raw_group_id, str) else None

            try:
                local_group_id = int(raw_group_id)
            except (TypeError, ValueError):
                local_group_id = None

            if local_group_id is not None:
                cursor.execute(
                    """
                    SELECT
                        g.id,
                        g.dispositivo_id,
                        g.jid,
                        g.nombre,
                        gm.tipo AS modulo_tipo,
                        d.usuario_id,
                        d.nombre AS dispositivo_nombre,
                        d.numero_telefono,
                        d.estado AS dispositivo_estado
                    FROM grupos g
                    INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                    LEFT JOIN grupos_modulo gm
                        ON gm.usuario_id = d.usuario_id
                        AND gm.dispositivo_id = g.dispositivo_id
                        AND gm.jid = g.jid
                        AND gm.eliminado_en IS NULL
                    WHERE g.id = %s AND d.usuario_id = %s
                    LIMIT 1
                    """,
                    (local_group_id, user_id),
                )
                source_row = cursor.fetchone()
                normalized_group_jid = normalize_jid(source_row.get("jid")) if source_row else normalized_group_jid
            elif normalized_group_jid:
                if selected_device_id:
                    cursor.execute(
                        """
                        SELECT
                            g.id,
                            g.dispositivo_id,
                            g.jid,
                            g.nombre,
                            gm.tipo AS modulo_tipo,
                            d.usuario_id,
                            d.nombre AS dispositivo_nombre,
                            d.numero_telefono,
                            d.estado AS dispositivo_estado
                        FROM grupos g
                        INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                        LEFT JOIN grupos_modulo gm
                            ON gm.usuario_id = d.usuario_id
                            AND gm.dispositivo_id = g.dispositivo_id
                            AND gm.jid = g.jid
                            AND gm.eliminado_en IS NULL
                        WHERE g.jid = %s AND g.dispositivo_id = %s AND d.usuario_id = %s
                        LIMIT 1
                        """,
                        (normalized_group_jid, selected_device_id, user_id),
                    )
                else:
                    cursor.execute(
                        """
                        SELECT
                            g.id,
                            g.dispositivo_id,
                            g.jid,
                            g.nombre,
                            gm.tipo AS modulo_tipo,
                            d.usuario_id,
                            d.nombre AS dispositivo_nombre,
                            d.numero_telefono,
                            d.estado AS dispositivo_estado
                        FROM grupos g
                        INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                        LEFT JOIN grupos_modulo gm
                            ON gm.usuario_id = d.usuario_id
                            AND gm.dispositivo_id = g.dispositivo_id
                            AND gm.jid = g.jid
                            AND gm.eliminado_en IS NULL
                        WHERE g.jid = %s AND d.usuario_id = %s
                        LIMIT 1
                        """,
                        (normalized_group_jid, user_id),
                    )
                source_row = cursor.fetchone()

            if normalized_group_jid:
                bridge_group = live_groups_by_jid.get(normalized_group_jid)

            if not source_row and normalized_group_jid and selected_device_id:
                cursor.execute(
                    """
                    SELECT
                        d.id AS dispositivo_id,
                        d.usuario_id,
                        d.nombre AS dispositivo_nombre,
                        d.numero_telefono,
                        d.estado AS dispositivo_estado
                    FROM dispositivos d
                    WHERE d.id = %s AND d.usuario_id = %s
                    LIMIT 1
                    """,
                    (selected_device_id, user_id),
                )
                device_row = cursor.fetchone()
                if device_row and bridge_group:
                    source_group_id = upsert_webhook_group(
                        cursor,
                        device_row.get("dispositivo_id"),
                        normalized_group_jid,
                        bridge_group.get("nombre"),
                        update_name=True,
                    )
                    conn.commit()
                    cursor.execute(
                        """
                        SELECT
                            g.id,
                            g.dispositivo_id,
                            g.jid,
                            g.nombre,
                            gm.tipo AS modulo_tipo,
                            d.usuario_id,
                            d.nombre AS dispositivo_nombre,
                            d.numero_telefono,
                            d.estado AS dispositivo_estado
                        FROM grupos g
                        INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                        LEFT JOIN grupos_modulo gm
                            ON gm.usuario_id = d.usuario_id
                            AND gm.dispositivo_id = g.dispositivo_id
                            AND gm.jid = g.jid
                            AND gm.eliminado_en IS NULL
                        WHERE g.id = %s AND d.usuario_id = %s
                        LIMIT 1
                        """,
                        (source_group_id, user_id),
                    )
                    source_row = cursor.fetchone()

            if not source_row:
                results.append({"groupId": original_group_id, "success": False, "message": "Grupo no encontrado"})
                continue

            if selected_device_id and int(source_row.get("dispositivo_id")) != int(selected_device_id):
                results.append(
                    {
                        "groupId": original_group_id,
                        "success": False,
                        "message": "El grupo no pertenece al dispositivo seleccionado",
                    }
                )
                continue

            actual_type = normalize_group_module_type(
                bridge_group.get("tipo") if bridge_group else source_row.get("modulo_tipo"),
                source_row.get("jid"),
                bridge_group,
            )
            if actual_type != selected_type:
                results.append(
                    {
                        "groupId": original_group_id,
                        "success": False,
                        "message": (
                            f'"{source_row.get("nombre") or "Grupo sin nombre"}" es de tipo '
                            f'{build_group_type_badge(actual_type).lower()}, no {build_group_type_badge(selected_type).lower()}.'
                        ),
                    }
                )
                continue

            is_admin = bool(bridge_group.get("isAdmin")) if bridge_group else False
            participants_total = int(bridge_group.get("participantes") or 0) if bridge_group else 0
            admins_total = int(bridge_group.get("admins") or 0) if bridge_group else 0

            if actual_type != "canal" and not bridge_group:
                is_admin, participants_total, admins_total = resolve_group_admin_verification(
                    cursor,
                    source_row.get("id"),
                    source_row.get("numero_telefono"),
                )

            if not is_admin:
                # El caché puede estar vacío o desactualizado (isAdmin=False). 
                # Forzamos una consulta en tiempo real al puente para estar 100% seguros antes de rechazar.
                try:
                    live_payload = fetch_bridge_json(selected_device_id, f"/group/{normalized_group_jid}", user_id=user_id)
                    if live_payload and not live_payload.get("error"):
                        is_admin = bool(live_payload.get("isAdmin"))
                        participants_total = len(live_payload.get("participants", []))
                except Exception as e:
                    pass

            if not is_admin:
                results.append(
                    {
                        "groupId": original_group_id,
                        "success": False,
                        "message": f'No sos admin de "{source_row.get("nombre") or "Grupo sin nombre"}". No se puede importar.',
                    }
                )
                continue

            estado_sync = "activo" if actual_type == "canal" else ("pendiente_sync" if participants_total == 0 else "activo")
            cursor.execute(
                """
                INSERT INTO grupos_modulo (
                    usuario_id, dispositivo_id, grupo_origen_id, jid, nombre, tipo, origen,
                    clicks, admins_count, participantes_count, mensajes_programados_count,
                    lleno, estado_sync, invite_link, sincronizado_en
                )
                VALUES (%s, %s, %s, %s, %s, %s, 'WhatsApp', 0, %s, %s, 0, 0, %s, NULL, NULL)
                ON DUPLICATE KEY UPDATE
                    grupo_origen_id = VALUES(grupo_origen_id),
                    nombre = VALUES(nombre),
                    tipo = VALUES(tipo),
                    admins_count = VALUES(admins_count),
                    participantes_count = VALUES(participantes_count),
                    estado_sync = VALUES(estado_sync),
                    actualizado_en = NOW(),
                    eliminado_en = NULL
                """,
                (
                    user_id,
                    source_row.get("dispositivo_id"),
                    source_row.get("id"),
                    source_row.get("jid"),
                    source_row.get("nombre") or "Grupo sin nombre",
                    actual_type,
                    admins_total,
                    participants_total,
                    estado_sync,
                ),
            )
            group_module_id = cursor.lastrowid
            if not group_module_id:
                cursor.execute(
                    """
                    SELECT id
                    FROM grupos_modulo
                    WHERE usuario_id = %s AND dispositivo_id = %s AND jid = %s
                    LIMIT 1
                    """,
                    (user_id, source_row.get("dispositivo_id"), source_row.get("jid")),
                )
                existing_row = cursor.fetchone() or {}
                group_module_id = existing_row.get("id")

            if group_module_id and actual_type == "canal":
                cursor.execute(
                    """
                    UPDATE grupos_modulo
                    SET estado_sync = 'activo',
                        sincronizado_en = NOW(),
                        actualizado_en = NOW()
                    WHERE id = %s
                    """,
                    (group_module_id,),
                )
            elif group_module_id:
                bridge_response = send_bridge_message(
                    source_row.get("dispositivo_id"),
                    source_row.get("jid"),
                    "/getgroupinfo",
                    is_command=True,
                ) or {}

                if not bridge_response.get("error"):
                    synced_subject = extract_group_metadata_subject(bridge_response, source_row.get("jid"))
                    synced_invite_link = extract_group_metadata_invite_link(bridge_response)
                    synced_participants_total = replace_group_source_participants(
                        cursor,
                        source_row.get("id"),
                        source_row.get("dispositivo_id"),
                        bridge_response,
                    )

                    if synced_subject:
                        cursor.execute(
                            """
                            UPDATE grupos
                            SET nombre = %s, actualizado_en = NOW()
                            WHERE id = %s
                            """,
                            (synced_subject, source_row.get("id")),
                        )

                    cursor.execute(
                        """
                        UPDATE grupos_modulo
                        SET nombre = %s,
                            invite_link = COALESCE(%s, invite_link),
                            estado_sync = %s,
                            sincronizado_en = NOW(),
                            actualizado_en = NOW()
                        WHERE id = %s
                        """,
                        (
                            synced_subject or source_row.get("nombre") or "Grupo sin nombre",
                            synced_invite_link,
                            "activo" if synced_participants_total > 0 else "pendiente_sync",
                            group_module_id,
                        ),
                    )
                    sync_group_module_counts(cursor, group_module_id)

                type_label = build_group_type_badge(actual_type)
                log_group_module_action(
                    cursor,
                    group_module_id,
                    "importado",
                    f"{type_label} importado desde {source_row.get('dispositivo_nombre') or 'WhatsApp'}",
                )
                cursor.execute(
                    """
                    SELECT gm.*, d.nombre AS dispositivo_nombre, d.estado AS dispositivo_estado
                    FROM grupos_modulo gm
                    INNER JOIN dispositivos d ON d.id = gm.dispositivo_id
                    WHERE gm.id = %s
                    LIMIT 1
                    """,
                    (group_module_id,),
                )
                imported_row = cursor.fetchone()
                if imported_row:
                    imported_items.append(serialize_group_module_row(imported_row))

            msg_map = {
                "grupo": "Grupo importado correctamente",
                "comunidad": "Comunidad importada correctamente",
                "canal": "Canal importado correctamente",
            }
            results.append(
                {
                    "groupId": original_group_id,
                    "success": True,
                    "message": msg_map.get(actual_type, "Grupo importado correctamente"),
                }
            )

        conn.commit()
        return jsonify({"success": True, "data": {"results": results, "items": imported_items}})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups/<int:group_id>", methods=["GET"])
def get_group_module_detail(group_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)

        cursor.execute(
            """
            SELECT
                gm.*,
                d.nombre AS dispositivo_nombre,
                d.estado AS dispositivo_estado,
                d.numero_telefono
            FROM grupos_modulo gm
            INNER JOIN dispositivos d ON d.id = gm.dispositivo_id
            WHERE gm.id = %s AND gm.usuario_id = %s AND gm.eliminado_en IS NULL
            LIMIT 1
            """,
            (group_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Grupo no encontrado"}), 404

        sync_group_module_counts(cursor, group_id)
        conn.commit()

        cursor.execute(
            """
            SELECT
                gm.*,
                d.nombre AS dispositivo_nombre,
                d.estado AS dispositivo_estado
            FROM grupos_modulo gm
            INNER JOIN dispositivos d ON d.id = gm.dispositivo_id
            WHERE gm.id = %s
            LIMIT 1
            """,
            (group_id,),
        )
        row = cursor.fetchone()

        cursor.execute(
            """
            SELECT nombre, telefono, jid, rol
            FROM participantes_grupo
            WHERE grupo_id = %s AND rol IN ('admin', 'superadmin')
            ORDER BY nombre ASC, id ASC
            """,
            (row.get("grupo_origen_id"),),
        )
        admins_rows = cursor.fetchall()
        admin_contacts_by_jid, admin_contacts_by_phone = build_group_participant_contact_maps(
            cursor,
            row.get("dispositivo_id"),
            admins_rows,
        )
        admins = [
            {
                "nombre": resolve_group_identity_payload(admin, admin_contacts_by_jid, admin_contacts_by_phone).get("nombre"),
                "telefono": resolve_group_identity_payload(admin, admin_contacts_by_jid, admin_contacts_by_phone).get("telefono"),
                "rol": admin.get("rol") or "admin",
                "estado": get_group_admin_connection_status(row.get("dispositivo_estado")),
            }
            for admin in admins_rows
        ]

        cursor.execute(
            """
            SELECT accion, detalle, creado_en
            FROM grupos_modulo_historial
            WHERE grupo_modulo_id = %s
            ORDER BY creado_en DESC, id DESC
            LIMIT 20
            """,
            (group_id,),
        )
        history_rows = cursor.fetchall()

        return jsonify(
            {
                "success": True,
                "data": {
                    "group": serialize_group_module_row(row),
                    "admins": admins,
                    "history": [
                        {
                            "accion": item.get("accion"),
                            "detalle": item.get("detalle"),
                            "creadoEn": as_json_value(item.get("creado_en")),
                        }
                        for item in history_rows
                    ],
                },
            }
        )
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups/<int:group_id>/participants", methods=["GET"])
def get_group_module_participants(group_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    search = (request.args.get("q") or "").strip().lower()
    status = (request.args.get("estado") or "todos").strip().lower()
    date_filter = (request.args.get("date_filter") or "ambas").strip().lower()
    date_from = (request.args.get("from") or "").strip()
    date_to = (request.args.get("to") or "").strip()

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)

        cursor.execute(
            """
            SELECT id, grupo_origen_id, nombre
            FROM grupos_modulo
            WHERE id = %s AND usuario_id = %s AND eliminado_en IS NULL
            LIMIT 1
            """,
            (group_id, user_id),
        )
        module_row = cursor.fetchone()
        if not module_row:
            return jsonify({"success": False, "message": "Grupo no encontrado"}), 404

        cursor.execute(
            """
            SELECT
                pg.nombre,
                pg.telefono,
                pg.jid,
                pg.rol,
                pg.estado,
                pg.fecha_ingreso,
                pg.fecha_salida,
                pg.actualizado_en,
                gm.dispositivo_id
            FROM participantes_grupo pg
            INNER JOIN grupos_modulo gm ON gm.grupo_origen_id = pg.grupo_id
            WHERE pg.grupo_id = %s AND gm.id = %s
            ORDER BY
                CASE WHEN pg.estado = 'activo' THEN 0 ELSE 1 END,
                COALESCE(pg.nombre, '') ASC,
                pg.id ASC
            """,
            (module_row.get("grupo_origen_id"), group_id),
        )
        rows = cursor.fetchall()
        contacts_by_jid, contacts_by_phone = build_group_participant_contact_maps(
            cursor,
            rows[0].get("dispositivo_id") if rows else None,
            rows,
        )

        participants = []
        for row in rows:
            item = serialize_group_participant_row(row, contacts_by_jid, contacts_by_phone)
            searchable = item.pop("_searchable", "").lower()
            if search and search not in searchable:
                continue
            if status in {"activos", "activo"} and item["estado"] != "activo":
                continue
            if status in {"salieron", "salido"} and item["estado"] != "salio":
                continue

            comparable_dates = []
            if date_filter in {"ambas", "both", ""}:
                comparable_dates = [item.get("fechaIngreso"), item.get("fechaSalida")]
            elif date_filter in {"ingreso", "fecha_ingreso", "solo ingreso"}:
                comparable_dates = [item.get("fechaIngreso")]
            elif date_filter in {"salida", "fecha_salida", "solo salida"}:
                comparable_dates = [item.get("fechaSalida")]

            comparable_dates = [value[:10] for value in comparable_dates if value]
            if date_from or date_to:
                matches_date = False
                for comparable_date in comparable_dates:
                    if date_from and comparable_date < date_from:
                        continue
                    if date_to and comparable_date > date_to:
                        continue
                    matches_date = True
                    break

                if not comparable_dates or not matches_date:
                    continue

            participants.append(item)

        total = len(participants)
        active_total = len([item for item in participants if item["estado"] == "activo"])
        exited_total = len([item for item in participants if item["estado"] == "salio"])

        return jsonify(
            {
                "success": True,
                "data": {
                    "groupName": module_row.get("nombre") or "Grupo sin nombre",
                    "summary": {
                        "total": total,
                        "activos": active_total,
                        "salieron": exited_total,
                    },
                    "participants": participants,
                },
            }
        )
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups/<int:group_id>/sync", methods=["POST"])
def sync_group_module(group_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)

        cursor.execute(
            """
            SELECT gm.*, d.estado AS dispositivo_estado
            FROM grupos_modulo gm
            INNER JOIN dispositivos d ON d.id = gm.dispositivo_id
            WHERE gm.id = %s AND gm.usuario_id = %s AND gm.eliminado_en IS NULL
            LIMIT 1
            """,
            (group_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Grupo no encontrado"}), 404

        device_id = row.get("dispositivo_id")
        if not is_bridge_running(device_id):
            start_whatsapp_bridge(user_id, device_id)

        if not wait_for_bridge_port(device_id, timeout_seconds=12):
            return jsonify({"success": False, "message": f"El bridge del dispositivo {device_id} no terminó de iniciar."}), 503

        bridge_response = send_bridge_message(device_id, row.get("jid"), "/getgroupinfo", is_command=True) or {}
        if bridge_response.get("error"):
            cursor.execute(
                "UPDATE grupos_modulo SET estado_sync = 'error', actualizado_en = NOW() WHERE id = %s",
                (group_id,),
            )
            log_group_module_action(cursor, group_id, "sync_error", bridge_response.get("error"))
            conn.commit()
            return jsonify({"success": False, "message": bridge_response.get("error")}), 400

        synced_subject = extract_group_metadata_subject(bridge_response, row.get("jid"))
        synced_invite_link = extract_group_metadata_invite_link(bridge_response)
        
        is_admin_from_bridge = bridge_response.get("isAdmin", False)

        synced_participants_total = replace_group_source_participants(
            cursor,
            row.get("grupo_origen_id"),
            row.get("dispositivo_id"),
            bridge_response,
        )

        if synced_subject and row.get("grupo_origen_id"):
            cursor.execute(
                """
                UPDATE grupos
                SET nombre = %s, actualizado_en = NOW()
                WHERE id = %s
                """,
                (synced_subject, row.get("grupo_origen_id")),
            )

        new_state = "activo" if is_admin_from_bridge or synced_participants_total > 0 else "pendiente_sync"

        if synced_subject:
            cursor.execute(
                """
                UPDATE grupos_modulo
                SET nombre = %s,
                    invite_link = COALESCE(%s, invite_link),
                    estado_sync = %s,
                    sincronizado_en = NOW(),
                    actualizado_en = NOW()
                WHERE id = %s
                """,
                (synced_subject, synced_invite_link, new_state, group_id),
            )
        else:
            cursor.execute(
                """
                UPDATE grupos_modulo
                SET invite_link = COALESCE(%s, invite_link),
                    estado_sync = %s,
                    sincronizado_en = NOW(),
                    actualizado_en = NOW()
                WHERE id = %s
                """,
                (synced_invite_link, new_state, group_id),
            )
        sync_group_module_counts(cursor, group_id)
        log_group_module_action(cursor, group_id, "sincronizado", "Sincronización ejecutada manualmente")
        conn.commit()

        cursor.execute(
            """
            SELECT gm.*, d.nombre AS dispositivo_nombre, d.estado AS dispositivo_estado
            FROM grupos_modulo gm
            INNER JOIN dispositivos d ON d.id = gm.dispositivo_id
            WHERE gm.id = %s
            LIMIT 1
            """,
            (group_id,),
        )
        updated_row = cursor.fetchone()
        return jsonify({"success": True, "data": serialize_group_module_row(updated_row)})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups/<int:group_id>/capacity", methods=["POST"])
def update_group_module_capacity(group_id):
    payload = request.get_json(silent=True) or {}
    user_id = resolve_request_user_id() or payload.get("user_id")

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    lleno = bool(payload.get("lleno"))
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)
        cursor.execute(
            """
            UPDATE grupos_modulo
            SET lleno = %s, actualizado_en = NOW()
            WHERE id = %s AND usuario_id = %s AND eliminado_en IS NULL
            """,
            (1 if lleno else 0, group_id, user_id),
        )
        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Grupo no encontrado"}), 404

        log_group_module_action(cursor, group_id, "capacidad", "Grupo marcado como lleno" if lleno else "Grupo desmarcado como lleno")
        conn.commit()
        return jsonify({"success": True, "data": {"lleno": lleno}})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups/<int:group_id>/refresh-invite", methods=["POST"])
def refresh_group_module_invite(group_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)
        cursor.execute(
            """
            SELECT id, invite_link, jid, dispositivo_id
            FROM grupos_modulo
            WHERE id = %s AND usuario_id = %s AND eliminado_en IS NULL
            LIMIT 1
            """,
            (group_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Grupo no encontrado"}), 404

        device_id = row.get("dispositivo_id")
        if not is_bridge_running(device_id):
            start_whatsapp_bridge(user_id, device_id)

        if not wait_for_bridge_port(device_id, timeout_seconds=12):
            return jsonify({"success": False, "message": f"El bridge del dispositivo {device_id} no terminó de iniciar."}), 503

        bridge_response = send_bridge_message(device_id, row.get("jid"), "/getgroupinfo", is_command=True) or {}
        if bridge_response.get("error"):
            log_group_module_action(cursor, group_id, "link_error", bridge_response.get("error"))
            conn.commit()
            return jsonify({"success": False, "message": bridge_response.get("error")}), 400

        invite_link = extract_group_metadata_invite_link(bridge_response)
        if not invite_link:
            return jsonify({"success": False, "message": "WhatsApp no devolvió un link de invitación para este grupo"}), 400

        cursor.execute(
            """
            UPDATE grupos_modulo
            SET invite_link = %s,
                actualizado_en = NOW()
            WHERE id = %s
            """,
            (invite_link, group_id),
        )

        log_group_module_action(cursor, group_id, "link_actualizado", "Se actualizó el link de invitación")
        conn.commit()
        return jsonify({"success": True, "data": {"inviteLink": invite_link}})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups/<int:group_id>/export", methods=["GET"])
def export_group_module_participants(group_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    scope = (request.args.get("scope") or "all").strip().lower()
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)
        cursor.execute(
            """
            SELECT id, grupo_origen_id, nombre
            FROM grupos_modulo
            WHERE id = %s AND usuario_id = %s AND eliminado_en IS NULL
            LIMIT 1
            """,
            (group_id, user_id),
        )
        module_row = cursor.fetchone()
        if not module_row:
            return jsonify({"success": False, "message": "Grupo no encontrado"}), 404

        cursor.execute(
            """
            SELECT
                pg.nombre,
                pg.telefono,
                pg.jid,
                pg.rol,
                pg.estado,
                pg.fecha_ingreso,
                pg.fecha_salida,
                pg.actualizado_en,
                gm.dispositivo_id
            FROM participantes_grupo pg
            INNER JOIN grupos_modulo gm ON gm.grupo_origen_id = pg.grupo_id
            WHERE pg.grupo_id = %s AND gm.id = %s
            ORDER BY
                CASE WHEN pg.estado = 'activo' THEN 0 ELSE 1 END,
                COALESCE(pg.nombre, '') ASC,
                pg.id ASC
            """,
            (module_row.get("grupo_origen_id"), group_id),
        )
        participant_rows = cursor.fetchall()
        contacts_by_jid, contacts_by_phone = build_group_participant_contact_maps(
            cursor,
            participant_rows[0].get("dispositivo_id") if participant_rows else None,
            participant_rows,
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["Participante", "Teléfono", "Origen", "FechaIngreso", "FechaSalida", "Estado", "Rol"])
        exported_count = 0

        for row in participant_rows:
            serialized = serialize_group_participant_row(row, contacts_by_jid, contacts_by_phone)
            estado = "Activo" if serialized.get("estado") == "activo" else "Salió"
            if scope == "active" and serialized.get("estado") != "activo":
                continue
            writer.writerow(
                [
                    serialized.get("nombre") or "",
                    serialized.get("telefono") or "",
                    serialized.get("origen") or "WhatsApp",
                    serialized.get("fechaIngreso") or "",
                    serialized.get("fechaSalida") or "",
                    estado,
                    serialized.get("rol") or "miembro",
                ]
            )
            exported_count += 1

        log_group_module_action(
            cursor,
            group_id,
            "exportado",
            f"Exportación de participantes ({'solo activos' if scope == 'active' else 'todos'})",
        )
        conn.commit()

        csv_content = output.getvalue()
        safe_name = secure_filename(module_row.get("nombre") or f"grupo-{group_id}")
        return Response(
            csv_content,
            mimetype="text/csv",
            headers={
                "Content-Disposition": f"attachment; filename={safe_name}-participantes.csv",
                "X-Export-Count": str(exported_count),
            },
        )
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/groups/<int:group_id>", methods=["DELETE"])
def delete_group_module(group_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)
        cursor.execute(
            """
            UPDATE grupos_modulo
            SET eliminado_en = NOW(), actualizado_en = NOW()
            WHERE id = %s AND usuario_id = %s AND eliminado_en IS NULL
            """,
            (group_id, user_id),
        )
        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Grupo no encontrado"}), 404
        conn.commit()
        return jsonify({"success": True})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
@app.route("/api/groups/<int:group_id>/ia", methods=["PUT"])
def update_group_ia_settings(group_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    data = request.json or {}
    ia_activo = int(bool(data.get("ia_activo", False)))
    ia_instrucciones = data.get("ia_instrucciones")
    ia_personalidad = data.get("ia_personalidad")
    moderacion_activa = int(bool(data.get("moderacion_activa", False)))
    anti_bloqueo = int(bool(data.get("anti_bloqueo", False)))

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_groups_module_tables(cursor)

        # Validar plan del usuario
        cursor.execute(
            """
            SELECT p.permite_ia_grupos
            FROM suscripciones s
            INNER JOIN planes p ON p.id = s.plan_id
            WHERE s.usuario_id = %s
            ORDER BY FIELD(s.estado, 'activa', 'prueba', 'vencida', 'cancelada'), s.fecha_vencimiento DESC, s.id DESC
            LIMIT 1
            """,
            (user_id,),
        )
        plan = cursor.fetchone()
        if not plan or not plan.get("permite_ia_grupos"):
            return jsonify({"success": False, "message": "Tu plan no incluye Inteligencia Artificial para grupos"}), 403

        cursor.execute(
            """
            UPDATE grupos_modulo
            SET ia_activo = %s,
                ia_instrucciones = %s,
                ia_personalidad = %s,
                moderacion_activa = %s,
                anti_bloqueo = %s,
                actualizado_en = NOW()
            WHERE id = %s AND usuario_id = %s AND eliminado_en IS NULL
            """,
            (ia_activo, ia_instrucciones, ia_personalidad, moderacion_activa, anti_bloqueo, group_id, user_id),
        )
        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Grupo no encontrado"}), 404
        
        # Registrar en el historial del grupo
        cursor.execute(
            """
            INSERT INTO grupos_modulo_historial (grupo_modulo_id, accion, detalle)
            VALUES (%s, 'Configuración de IA', 'Se actualizó la configuración de IA y moderación del grupo')
            """,
            (group_id,),
        )
        conn.commit()
        return jsonify({"success": True})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/realtime/whatsapp", methods=["GET"])
def whatsapp_realtime_events():
    requested_user_id = request.args.get("user_id")

    try:
        user_id = int(requested_user_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id es obligatorio"}), 400

    def generate_events():
        event_queue = Queue(maxsize=100)
        subscriber = {"user_id": user_id, "queue": event_queue}
        whatsapp_event_subscribers.append(subscriber)

        try:
            yield ": connected\n\n"

            while True:
                try:
                    event = event_queue.get(timeout=25)
                    try:
                        json_str = json.dumps(event, default=str)
                        yield f"data: {json_str}\n\n"
                    except Exception as json_err:
                        logger.error(f"Error serializando evento: {json_err}")
                except Empty:
                    yield f": ping {int(time.time())}\n\n"
                except Exception as e:
                    logger.error(f"Error en bucle de eventos: {e}")
                    break
        finally:
            if subscriber in whatsapp_event_subscribers:
                whatsapp_event_subscribers.remove(subscriber)
                logger.info(f"Subscriptor removido para user_id {user_id}")

    return Response(
        stream_with_context(generate_events()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


def download_meta_media(media_id, meta_token):
    """Descarga archivos multimedia enviados por el cliente desde los servidores de Meta y los guarda localmente."""
    try:
        import urllib.request as _urllib_req
        import urllib.error as _urllib_err
        
        # 1. Obtener URL de descarga desde Meta API
        url = f"https://graph.facebook.com/v18.0/{media_id}"
        headers = {"Authorization": f"Bearer {meta_token}"}
        req = _urllib_req.Request(url, headers=headers)
        with _urllib_req.urlopen(req, timeout=10) as res:
            res_data = json.loads(res.read().decode() or "{}")
            download_url = res_data.get("url")
            mime_type = res_data.get("mime_type") or ""
            
        if not download_url:
            return None, None
            
        # 2. Descargar el archivo binario
        req_dl = _urllib_req.Request(download_url, headers=headers)
        with _urllib_req.urlopen(req_dl, timeout=15) as res_dl:
            file_bytes = res_dl.read()
            
        # 3. Guardar en la carpeta local de media
        subfolder = "documentos"
        if mime_type.startswith('image/'): subfolder = "imagenes"
        elif mime_type.startswith('video/'): subfolder = "videos"
        elif mime_type.startswith('audio/'): subfolder = "audios"
        
        upload_path = os.path.join(app.config['UPLOAD_FOLDER'], subfolder)
        os.makedirs(upload_path, exist_ok=True)
        
        ext = mime_type.split('/')[-1].split(';')[0] if '/' in mime_type else 'bin'
        if ext == 'jpeg': ext = 'jpg'
        
        filename = f"{uuid.uuid4().hex}.{ext}"
        file_url = f"/media/{subfolder}/{filename}"
        
        with open(os.path.join(upload_path, filename), "wb") as f:
            f.write(file_bytes)
            
        return file_url, mime_type
    except Exception as e:
        logger.error(f"Error descargando archivo de Meta: {e}")
        return None, None


@app.route("/webhook/meta", methods=["GET", "POST"])
def meta_webhook():
    """Endpoint oficial receptor de Webhooks de Meta Cloud API."""
    if request.method == "GET":
        mode = request.args.get("hub.mode")
        token = request.args.get("hub.verify_token")
        challenge = request.args.get("hub.challenge")
        
        verify_token = os.getenv("META_VERIFY_TOKEN", "geochat_meta_token")
        
        if mode == "subscribe" and token == verify_token:
            logger.info("Webhook de Meta verificado con éxito (GET).")
            return challenge, 200
        else:
            logger.warning("Fallo en la verificación del token del Webhook de Meta.")
            return "Fallo de verificación de token", 403

    # POST method
    payload = request.get_json(silent=True) or {}
    
    entry = payload.get("entry", [])
    if not entry:
        return jsonify({"success": True}), 200
        
    changes = entry[0].get("changes", [])
    if not changes:
        return jsonify({"success": True}), 200
        
    value = changes[0].get("value", {})
    metadata = value.get("metadata", {})
    phone_id = metadata.get("phone_number_id")
    
    if not phone_id:
        return jsonify({"success": True}), 200

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Buscar el dispositivo asociado a este Phone ID de Meta
        cursor.execute(
            "SELECT id, usuario_id, meta_access_token FROM dispositivos WHERE meta_phone_number_id = %s LIMIT 1",
            (phone_id,)
        )
        dev_row = cursor.fetchone()
        if not dev_row:
            return jsonify({"success": True}), 200
            
        device_id = dev_row["id"]
        user_id = dev_row["usuario_id"]
        meta_token = dev_row["meta_access_token"]
        
        # A: Actualizaciones de Estado (sent, delivered, read)
        if "statuses" in value:
            for status_obj in value["statuses"]:
                msg_id = status_obj.get("id")
                status_str = status_obj.get("status")
                recipient_id = status_obj.get("recipient_id")
                
                status_code = 0
                if status_str == "sent": status_code = 1
                elif status_str == "delivered": status_code = 2
                elif status_str == "read": status_code = 3
                
                if status_code > 0 and msg_id:
                    recipient_jid = f"{recipient_id}@s.whatsapp.net"
                    cursor.execute(
                        "UPDATE mensajes SET estado = %s WHERE mensaje_id = %s AND dispositivo_id = %s AND (estado IS NULL OR estado < %s)",
                        (status_code, msg_id, device_id, status_code)
                    )
                    if cursor.rowcount > 0:
                        conn.commit()
                        
                        # Notificar al frontend vía SSE
                        event = {
                            "event_type": "chat-update",
                            "user_id": user_id,
                            "device_id": device_id,
                            "data": {
                                "jid": recipient_jid,
                                "source": "message-status-update",
                                "messageId": msg_id,
                                "status": status_code
                            }
                        }
                        publish_whatsapp_event(event)
                    else:
                        conn.commit()
            return jsonify({"success": True}), 200
            
        # B: Mensajes Entrantes
        if "messages" in value:
            for message in value["messages"]:
                msg_from = message.get("from")
                msg_id = message.get("id")
                msg_timestamp = message.get("timestamp")
                msg_type = message.get("type", "text")
                
                recipient_jid = f"{msg_from}@s.whatsapp.net"
                
                text_body = ""
                file_url = None
                
                if msg_type == "text":
                    text_body = message.get("text", {}).get("body", "")
                elif msg_type == "interactive":
                    text_body = message.get("interactive", {}).get("button_reply", {}).get("title", "")
                    if not text_body:
                        text_body = message.get("interactive", {}).get("list_reply", {}).get("title", "")
                elif msg_type == "button":
                    text_body = message.get("button", {}).get("text", "")
                elif msg_type in ("image", "video", "audio", "document"):
                    media_obj = message.get(msg_type, {})
                    media_id = media_obj.get("id")
                    if media_id and meta_token:
                        file_url, mime_type = download_meta_media(media_id, meta_token)
                        caption = media_obj.get("caption") or ""
                        text_body = caption
                
                # Obtener o registrar contacto
                cursor.execute(
                    "SELECT id, nombre FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1",
                    (recipient_jid, device_id)
                )
                contact_row = cursor.fetchone()
                
                profile_name = value.get("contacts", [{}])[0].get("profile", {}).get("name") or f"+{msg_from}"
                if not contact_row:
                    if check_mac_limit_exceeded(cursor, device_id):
                        logger.warning(f"Límite MAC alcanzado para dispositivo {device_id}. Mensaje oficial omitido.")
                        return jsonify({"success": True}), 200
                        
                    cursor.execute(
                        "INSERT INTO contactos (dispositivo_id, jid, telefono, nombre, creado_en, actualizado_en) VALUES (%s, %s, %s, %s, NOW(), NOW())",
                        (device_id, recipient_jid, msg_from, profile_name)
                    )
                    conn.commit()
                
                # Construir evento compatible para base de datos e interfaz
                event_data = {
                    "message": {
                        "remoteJid": recipient_jid,
                        "chat_jid": recipient_jid,
                        "jid": recipient_jid,
                        "tipo": msg_type,
                        "fecha_mensaje": datetime.fromtimestamp(int(msg_timestamp)).strftime("%Y-%m-%d %H:%M:%S"),
                        "texto": text_body,
                        "url_media": file_url,
                        "fromMe": False,
                        "es_mio": False,
                        "mensaje_id": msg_id,
                        "nombre": profile_name,
                        "last_timestamp": msg_timestamp
                    }
                }
                
                # Publicar por SSE
                publish_whatsapp_event({
                    "event_type": "upsert-message",
                    "user_id": user_id,
                    "device_id": device_id,
                    "data": event_data
                })
                
                # Guardar en base de datos local
                persist_webhook_message(cursor, user_id, device_id, event_data)
                conn.commit()
                
                # OBTENER NOMBRE REAL PARA AUTOMATIZACIONES
                nombre_contacto = "amigo"
                cursor.execute("SELECT nombre FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (recipient_jid, device_id))
                c_db = cursor.fetchone()
                if c_db and c_db.get("nombre"):
                    nombre_contacto = c_db["nombre"]
                
                # DISPARAR AUTOMATIZACIONES Y SECUENCIAS
                # Cancelar seguimientos anteriores
                try:
                    cursor.execute("""
                        DELETE FROM mensajes_programados 
                        WHERE usuario_id = %s AND dispositivo_id = %s AND target_id = %s 
                          AND (nombre LIKE 'Seguimiento inteligente%' OR nombre LIKE 'Seguimiento secuencial%')
                    """, (user_id, device_id, recipient_jid))
                    conn.commit()
                except Exception as cancel_err:
                    logger.error(f"Error cancelando seguimientos programados: {cancel_err}")

                # 1. Keywords
                cursor.execute(
                    "SELECT * FROM automatizaciones WHERE usuario_id = %s AND (dispositivo_id = %s OR dispositivo_id IS NULL) AND activo = 1",
                    (user_id, device_id)
                )
                autos = cursor.fetchall()
                keyword_triggered = False
                texto_recibido = text_body.strip().lower()
                
                for auto in autos:
                    is_todos_messages = False
                    try:
                        nodos_list = json.loads(auto.get("nodos") or "[]")
                        for node in nodos_list:
                            if node.get("type") == "triggerNode":
                                config = (node.get("data") or {}).get("config") or {}
                                if config.get("coincidencia") == "Todos los mensajes":
                                    is_todos_messages = True
                                    break
                    except Exception:
                        pass

                    disparador = (auto.get("palabra_clave") or "").strip().lower()
                    if not disparador and not is_todos_messages:
                        continue
                        
                    is_smart = get_automation_smart_trigger(auto)
                    matched = False
                    
                    if is_todos_messages:
                        cursor.execute("SELECT 1 FROM automatizacion_esperas WHERE contacto_jid = %s AND usuario_id = %s LIMIT 1", (recipient_jid, user_id))
                        if not cursor.fetchone():
                            matched = True
                    elif is_smart:
                        matched = match_smart_trigger_ai(disparador, text_body, user_id)
                    else:
                        matched = (disparador == texto_recibido or disparador in texto_recibido)
                        
                    if matched:
                        cursor.execute("DELETE FROM automatizacion_esperas WHERE contacto_jid = %s AND usuario_id = %s", (recipient_jid, user_id))
                        conn.commit()
                        auto_mark_message_read(cursor, conn, user_id, device_id, recipient_jid, msg_id)
                        trigger_automation_async(user_id, device_id, auto, recipient_jid, nombre_contacto)
                        keyword_triggered = True
                        break

                if keyword_triggered:
                    return jsonify({"success": True}), 200

                # 2. Esperas activas (Chatbots / AI Nodes)
                cursor.execute("""
                    SELECT * FROM automatizacion_esperas 
                    WHERE contacto_jid = %s AND usuario_id = %s
                    LIMIT 1
                """, (recipient_jid, user_id))
                espera = cursor.fetchone()
                
                if espera:
                    if espera.get("tipo_pregunta") == 'assignAiNode':
                        auto_mark_message_read(cursor, conn, user_id, device_id, recipient_jid, msg_id)
                        opts_json = {}
                        try:
                            opts_json = json.loads(espera.get("opciones_json") or "{}")
                        except:
                            pass
                        agent_id = opts_json.get("agent_id")
                        cursor.execute("SELECT * FROM agentes_ia WHERE id = %s LIMIT 1", (agent_id,))
                        agent = cursor.fetchone()
                        if agent:
                            cursor.execute("SELECT id FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (recipient_jid, device_id))
                            c_row = cursor.fetchone()
                            contact_id = c_row["id"] if c_row else None
                            trigger_agent_response_async(user_id, device_id, agent, recipient_jid, text_body, nombre_contacto, contact_id)
                            return jsonify({"success": True}), 200
                        else:
                            cursor.execute("DELETE FROM automatizacion_esperas WHERE id = %s", (espera['id'],))
                            conn.commit()
                            
                    # Guardar respuesta en campos customizados
                    campo_destino = espera.get("campo_destino")
                    if campo_destino:
                        if campo_destino.lower() in ["correo", "email"]:
                            import re
                            match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text_body)
                            if not match:
                                send_bridge_message(device_id, recipient_jid, "⚠️ El correo ingresado no es valido. Por favor, escribe tu correo electronico correctamente (ejemplo: usuario@correo.com):")
                                return jsonify({"success": True}), 200
                            else:
                                text_body = match.group(0)

                        cursor.execute("SELECT id FROM campos_customizados WHERE nombre = %s AND usuario_id = %s", (campo_destino, user_id))
                        campo_row = cursor.fetchone()
                        if campo_row:
                            cursor.execute("SELECT id FROM contactos WHERE jid = %s AND dispositivo_id = %s", (recipient_jid, device_id))
                            contacto_row = cursor.fetchone()
                            if contacto_row:
                                cursor.execute("""
                                    INSERT INTO contacto_valores_custom (contacto_id, campo_id, valor)
                                    VALUES (%s, %s, %s)
                                    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
                                """, (contacto_row['id'], campo_row['id'], text_body))
                                conn.commit()
                    
                    cursor.execute("DELETE FROM automatizacion_esperas WHERE id = %s", (espera['id'],))
                    conn.commit()
                    auto_mark_message_read(cursor, conn, user_id, device_id, recipient_jid, msg_id)
                    
                    # Reanudar el flujo desde el nodo de la pregunta
                    auto_id = espera.get("automatizacion_id")
                    cursor.execute("SELECT * FROM automatizaciones WHERE id = %s", (auto_id,))
                    auto = cursor.fetchone()
                    if auto:
                        trigger_automation_async(user_id, device_id, auto, recipient_jid, contact_name=nombre_contacto, start_node_id=espera.get("nodo_espera_id"), response_text=text_body)
                    return jsonify({"success": True}), 200
                    
                # 3. Asignación directa a Agentes de IA
                cursor.execute("SELECT * FROM agentes_ia WHERE dispositivo_id = %s AND activo = 1 LIMIT 1", (device_id,))
                agent = cursor.fetchone()
                if agent:
                    cursor.execute("SELECT id, agente_asignado_id FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (recipient_jid, device_id))
                    contact_db = cursor.fetchone()
                    
                    contact_id = None
                    agente_asignado_id = None
                    if contact_db:
                        contact_id = contact_db["id"]
                        agente_asignado_id = contact_db["agente_asignado_id"]
                    
                    is_assigned_to_human = False
                    if agente_asignado_id is not None and agente_asignado_id != device_id and agente_asignado_id != agent["id"]:
                        is_assigned_to_human = True
                        
                    if not is_assigned_to_human:
                        auto_mark_message_read(cursor, conn, user_id, device_id, recipient_jid, msg_id)
                        trigger_agent_response_async(user_id, device_id, agent, recipient_jid, text_body, nombre_contacto, contact_id)
                    
    except Exception as e:
        logger.error(f"Error en webhook oficial de Meta: {e}", exc_info=True)
    finally:
        if cursor: cursor.close()
        if conn: conn.close()
        
    return jsonify({"success": True}), 200


@app.route("/webhook/whatsapp", methods=["POST"])
def whatsapp_webhook():
    payload = request.get_json(silent=True) or {}


    event_type = clean_text(payload.get("event_type")).replace(".", "-")
    data = payload.get("data") or {}

    try:
        user_id = int(payload.get("user_id") or data.get("user_id"))
        device_id = int(payload.get("device_id") or data.get("device_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id y device_id son obligatorios"}), 400

    if event_type not in {"upsert-message", "update-contact", "chat-update", "groups-upsert", "groups-update"}:
        return jsonify({"success": False, "message": f"event_type invalido: {event_type}"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT usuario_id FROM dispositivos WHERE id = %s LIMIT 1", (device_id,))
        dev_row = cursor.fetchone()
        if not dev_row:
            return jsonify({"success": False, "message": "Dispositivo no encontrado"}), 404
        user_id = dev_row["usuario_id"]

        if event_type in {"groups-upsert", "groups-update"}:
            groups = data if isinstance(data, list) else [data]
            for g in groups:
                g_jid = clean_related_jid(g.get("id") or g.get("jid"))
                g_subject = g.get("subject") or g.get("name")
                if g_jid and g_subject:
                    # Guardamos en la tabla de grupos
                    upsert_webhook_group(cursor, device_id, g_jid, g_subject, update_name=True)
                    # Sincronizamos con la tabla de chats para el sidebar
                    upsert_webhook_chat(
                        cursor, device_id, g_jid, "grupo", g_subject, 
                        None, None, None, 0
                    )
            conn.commit()
            return jsonify({"success": True, "message": "Grupos actualizados"}), 200

        if event_type == "upsert-message":
            event_data = data if data.get("message") else {"message": data}
        elif event_type == "update-contact":
            event_data = data if data.get("contact") else {"contact": data}
        else:
            event_data = data

        # Resolver LID → JID real para eventos de presencia
        # WhatsApp envía presencia con JID en formato @lid, pero el frontend
        # usa el JID normal (@s.whatsapp.net). Debemos resolver antes de publicar.
        if event_type == "chat-update" and event_data.get("source") == "presence-update":
            raw_jid = event_data.get("jid", "")
            if raw_jid and "@lid" in raw_jid:
                try:
                    cursor.execute(
                        "SELECT jid FROM contactos WHERE dispositivo_id = %s AND lid = %s LIMIT 1",
                        (device_id, raw_jid)
                    )
                    lid_row = cursor.fetchone()
                    if lid_row and lid_row.get("jid"):
                        event_data = dict(event_data)
                        event_data["jid"] = lid_row["jid"]
                        logger.info(f"Presencia LID resuelta: {raw_jid} → {lid_row['jid']}")
                except Exception as lid_err:
                    logger.warning(f"No se pudo resolver LID {raw_jid}: {lid_err}")

        event = {
            "event_type": event_type,
            "user_id": user_id,
            "device_id": device_id,
            "data": event_data,
        }
        publish_whatsapp_event(event)

        # GUARDAR EN BASE DE DATOS (CHATS, GRUPOS, MENSAJES)
        try:
            if event_type == "upsert-message":
                persist_webhook_message(cursor, user_id, device_id, event_data)
                conn.commit()
            elif event_type == "chat-update":
                if event_data.get("source") not in {"message-status-update", "message-reaction-update", "presence-update", "message-delete-update"}:
                    jid = normalize_jid(event_data.get("jid"))
                    if jid and is_supported_chat_jid(jid):
                        is_group = is_group_jid(jid)
                        name = event_data.get("name") or event_data.get("nombre")
                        preview = event_data.get("last_message")
                        sent_at = event_data.get("last_time")
                        message_type = event_data.get("last_type")
                        
                        upsert_webhook_chat(
                            cursor,
                            device_id,
                            jid,
                            "grupo" if is_group else "contacto",
                            name,
                            preview,
                            sent_at,
                            message_type,
                            0
                        )
                        conn.commit()
            elif event_type == "update-contact":
                contact = event_data.get("contact") or event_data
                jid = normalize_jid(contact.get("jid"))
                if jid and is_supported_chat_jid(jid):
                    upsert_webhook_contact(cursor, device_id, contact, update_name=True)
                    conn.commit()
        except Exception as db_err:
            logger.error(f"Error al persistir webhook: {db_err}")
            # Continuamos aunque falle el guardado para no bloquear automatizaciones

        # TRIGGER DE AUTOMATIZACIONES
        if event_type == "upsert-message":
            msg = event_data.get("message") or {}
            # Solo disparar si el mensaje NO es mio
            es_mio = msg.get("fromMe") or msg.get("es_mio")
            if not es_mio:
                # Interceptar si el mensaje es de audio y transcribirlo
                message_type = normalize_message_type(msg.get("tipo"))
                if message_type == "audio" and not msg.get("texto"):
                    url_media = msg.get("url_media") or msg.get("mediaUrl") or msg.get("url")
                    if url_media:
                        local_audio_path = resolve_media_local_path(url_media)
                        if local_audio_path:
                            transcription = None
                            gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
                            openai_key = os.getenv("OPENAI_API_KEY")
                            if gemini_key:
                                logger.info(f"Intentando transcribir audio con Gemini para {chat_jid if 'chat_jid' in locals() else msg.get('chat_jid')}...")
                                transcription = transcribe_audio_with_gemini(local_audio_path, gemini_key)
                            if not transcription and openai_key:
                                logger.info(f"Intentando transcribir audio con Whisper para {chat_jid if 'chat_jid' in locals() else msg.get('chat_jid')}...")
                                transcription = transcribe_audio_with_whisper(local_audio_path, openai_key)
                            
                            if transcription:
                                logger.info(f"Transcripcion exitosa de audio: {transcription}")
                                msg["texto"] = transcription
                                try:
                                    cursor.execute(
                                        "UPDATE mensajes SET texto = %s WHERE dispositivo_id = %s AND mensaje_id = %s",
                                        (transcription, device_id, msg.get("mensaje_id"))
                                    )
                                    conn.commit()
                                except Exception as update_err:
                                    logger.error(f"Error actualizando texto del audio en DB: {update_err}")

                texto_original = (
                    msg.get("texto") or 
                    msg.get("text") or 
                    msg.get("body") or 
                    msg.get("conversation") or 
                    msg.get("caption") or 
                    ""
                ).strip()
                texto_recibido = texto_original.lower()
                chat_jid = msg.get("chat_jid") or msg.get("remoteJid") or msg.get("jid") or msg.get("from")
                
                if texto_recibido and chat_jid:
                    # Cancelar cualquier seguimiento programado (secuencial o inteligente) al recibir un mensaje del cliente
                    try:
                        cursor.execute("""
                            DELETE FROM mensajes_programados 
                            WHERE usuario_id = %s AND dispositivo_id = %s AND target_id = %s 
                              AND (nombre LIKE 'Seguimiento inteligente%%' OR nombre LIKE 'Seguimiento secuencial%%')
                        """, (user_id, device_id, chat_jid))
                        conn.commit()
                    except Exception as cancel_err:
                        logger.error(f"Error cancelando seguimientos programados al recibir mensaje: {cancel_err}")

                    # OBTENER NOMBRE REAL DEL CONTACTO O GRUPO
                    nombre_contacto = "amigo"
                    is_group = chat_jid.endswith("@g.us")
                    
                    try:
                        if is_group:
                            # Para grupos, priorizamos el 'subject' que envía el bridge
                            nombre_contacto = msg.get("subject") or "Grupo de WhatsApp"
                        else:
                            # Para individuos, buscamos en DB > WhatsApp PushName > amigo
                            cursor.execute("SELECT nombre FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (chat_jid, device_id))
                            contacto_db = cursor.fetchone()
                            if contacto_db and contacto_db.get("nombre"):
                                nombre_contacto = contacto_db["nombre"]
                            else:
                                nombre_contacto = msg.get("pushName") or msg.get("notifyName") or msg.get("verifiedName") or "amigo"
                    except Exception as db_err:
                        logger.error(f"Error al obtener el nombre del contacto/grupo: {db_err}")


                    # LÓGICA DE INTELIGENCIA ARTIFICIAL EN GRUPOS (MÓDULO 2)
                    if is_group:
                        # Verificar si el plan incluye IA de grupos
                        cursor.execute(
                            """
                            SELECT p.permite_ia_grupos
                            FROM suscripciones s
                            INNER JOIN planes p ON p.id = s.plan_id
                            WHERE s.usuario_id = %s
                            ORDER BY FIELD(s.estado, 'activa', 'prueba', 'vencida', 'cancelada'), s.fecha_vencimiento DESC, s.id DESC
                            LIMIT 1
                            """,
                            (user_id,),
                        )
                        user_plan = cursor.fetchone()
                        if user_plan and user_plan.get("permite_ia_grupos"):
                            try:
                                cursor.execute(
                                    """
                                    SELECT * FROM grupos_modulo 
                                    WHERE jid = %s AND dispositivo_id = %s AND eliminado_en IS NULL 
                                    LIMIT 1
                                    """,
                                    (chat_jid, device_id)
                                )
                                grupo_db = cursor.fetchone()
                                if grupo_db:
                                    # A. Moderación Automática (Spam y Links)
                                    if grupo_db.get("moderacion_activa") == 1:
                                        import re
                                        # Buscar enlaces o menciones wa.me
                                        has_link = bool(re.search(r'(https?://[^\s]+|www\.[^\s]+|wa\.me/[^\s]+)', texto_original))
                                        if has_link:
                                            # Registrar infracción en el historial
                                            detalle_inf = f"Mensaje de {msg.get('push_name') or 'Participante'} ({msg.get('participant_jid') or 'desconocido'}) moderado por contener enlaces no permitidos."
                                            cursor.execute(
                                                """
                                                INSERT INTO grupos_modulo_historial (grupo_modulo_id, accion, detalle)
                                                VALUES (%s, 'Mensaje moderado', %s)
                                                """,
                                                (grupo_db["id"], detalle_inf)
                                            )
                                            conn.commit()
                                            
                                            # Enviar advertencia
                                            send_bridge_message(
                                                device_id, 
                                                chat_jid, 
                                                f"⚠️ @{msg.get('push_name') or 'usuario'}, los enlaces y el spam no están permitidos en este grupo."
                                            )
                                            logger.info(f"Mensaje moderado en grupo {chat_jid} por contener enlaces.")
                                            return jsonify({"success": True, "message": "Mensaje de grupo moderado"})

                                    # B. Asistente de IA (Respuesta a Menciones)
                                    if grupo_db.get("ia_activo") == 1:
                                        # Determinar si mencionan al bot
                                        # Obtener número de forma segura desde BD
                                        cursor.execute("SELECT numero_telefono FROM dispositivos WHERE id = %s LIMIT 1", (device_id,))
                                        dev_row = cursor.fetchone()
                                        bot_number = (dev_row.get("numero_telefono") or "").replace("+", "").strip() if dev_row else ""
                                        
                                        mentioned = False
                                        lower_text = texto_original.lower()
                                        if "@bot" in lower_text or "@asistente" in lower_text:
                                            mentioned = True
                                        elif bot_number and bot_number in lower_text:
                                            mentioned = True
                                        
                                        if mentioned:
                                            # Auto-marcar como leído
                                            auto_mark_message_read(cursor, conn, user_id, device_id, chat_jid, msg.get("mensaje_id"))
                                            
                                            trigger_group_agent_response_async(
                                                user_id, 
                                                device_id, 
                                                grupo_db, 
                                                chat_jid, 
                                                texto_original, 
                                                msg.get("push_name") or "participante"
                                            )
                                            return jsonify({"success": True, "message": "Procesando IA en grupo"})
                            except Exception as group_ia_err:
                                logger.error(f"Error procesando IA de grupos en webhook: {group_ia_err}")
                        
                        # Detener el procesamiento de flujos estándar y agentes individuales para grupos
                        return jsonify({"success": True, "message": "Mensaje de grupo procesado sin disparador de IA activo"})

                    # 1. VERIFICAR DISPARADORES DE PALABRAS CLAVE (PRIORIDAD ALTA)
                    cursor.execute(
                        """
                        SELECT * FROM automatizaciones 
                        WHERE usuario_id = %s AND activo = 1
                        """,
                        (user_id,)
                    )
                    autos = cursor.fetchall()
                    keyword_triggered = False
                    
                    def strip_accents(text):
                        if not text: return ""
                        import unicodedata
                        return "".join(c for c in unicodedata.normalize('NFD', str(text).lower()) if unicodedata.category(c) != 'Mn').strip()

                    for auto in autos:
                        # Verificar pertenencia de dispositivo (si auto_dev está especificado y no es 0/NULL ni el actual, verificar si el nodo dice 'todos')
                        auto_dev = auto.get("dispositivo_id")
                        if auto_dev and auto_dev != 0 and auto_dev != device_id:
                            pass_dev = False
                            try:
                                nodos_list = json.loads(auto.get("nodos") or "[]")
                                for node in nodos_list:
                                    if node.get("type") == "triggerNode":
                                        cfg = (node.get("data") or {}).get("config") or {}
                                        dev_cfg = str(cfg.get("dispositivo") or "").lower()
                                        if not dev_cfg or any(term in dev_cfg for term in ["all", "todo", "todos"]):
                                            pass_dev = True
                                            break
                            except Exception:
                                pass
                            if not pass_dev:
                                continue

                        is_todos_messages = False
                        disparador_from_node = ""
                        try:
                            nodos_list = json.loads(auto.get("nodos") or "[]")
                            for node in nodos_list:
                                if node.get("type") == "triggerNode":
                                    config = (node.get("data") or {}).get("config") or {}
                                    if config.get("coincidencia") == "Todos los mensajes":
                                        is_todos_messages = True
                                        break
                                    kw_val = config.get("palabra_clave") or config.get("keywords") or config.get("palabraClave") or config.get("palabras") or config.get("frase")
                                    if kw_val and not disparador_from_node:
                                        disparador_from_node = str(kw_val).strip().lower()
                        except Exception:
                            pass

                        disparador = (auto.get("palabra_clave") or disparador_from_node or "").strip().lower()
                        if not disparador and not is_todos_messages:
                            continue
                            
                        # Determinar si el disparador es inteligente
                        is_smart = get_automation_smart_trigger(auto)
                        
                        matched = False
                        if is_todos_messages:
                            # Evitar reiniciar el flujo si el contacto ya está esperando respuesta en un nodo (espera activa)
                            cursor.execute("SELECT 1 FROM automatizacion_esperas WHERE contacto_jid = %s AND usuario_id = %s LIMIT 1", (chat_jid, user_id))
                            if cursor.fetchone():
                                matched = False
                            else:
                                matched = True
                        elif is_smart:
                            # Disparador Inteligente usa IA sobre el texto original
                            matched = match_smart_trigger_ai(disparador, texto_original, user_id)
                        else:
                            # Coincidencia tradicional (exacto o contiene con tolerancia a tildes/mayúsculas)
                            disp_norm = strip_accents(disparador)
                            text_norm = strip_accents(texto_recibido or texto_original or "")
                            matched = (disp_norm == text_norm or disp_norm in text_norm or disparador in (texto_recibido or ""))
                            
                        if matched:
                            # LIMPIAR CUALQUIER ESPERA PREVIA (REINICIAR FLUJO)
                            cursor.execute("DELETE FROM automatizacion_esperas WHERE contacto_jid = %s AND usuario_id = %s", (chat_jid, user_id))
                            conn.commit()
                            
                            # Auto-marcar como leído (envía visto gris/azul)
                            auto_mark_message_read(cursor, conn, user_id, device_id, chat_jid, msg.get("mensaje_id"))
                            
                            trigger_automation_async(user_id, device_id, auto, chat_jid, nombre_contacto)
                            keyword_triggered = True
                            break # Solo un flujo por palabra clave

                    if keyword_triggered:
                        return jsonify({"success": True, "message": "Flujo reiniciado por palabra clave"})

                    # 2. SI NO ES PALABRA CLAVE, VERIFICAR SI ESTAMOS ESPERANDO RESPUESTA
                    cursor.execute("""
                        SELECT * FROM automatizacion_esperas 
                        WHERE contacto_jid = %s AND usuario_id = %s
                        LIMIT 1
                    """, (chat_jid, user_id))
                    espera = cursor.fetchone()
                    
                    if espera:
                        if espera.get("tipo_pregunta") == 'assignAiNode':
                            auto_mark_message_read(cursor, conn, user_id, device_id, chat_jid, msg.get("mensaje_id"))
                            opts_json = {}
                            try:
                                opts_json = json.loads(espera.get("opciones_json") or "{}")
                            except:
                                pass
                            agent_id = opts_json.get("agent_id")
                            cursor.execute("SELECT * FROM agentes_ia WHERE id = %s LIMIT 1", (agent_id,))
                            agent = cursor.fetchone()
                            if agent:
                                # Obtener el id del contacto
                                cursor.execute("SELECT id FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (chat_jid, device_id))
                                c_row = cursor.fetchone()
                                contact_id = c_row["id"] if c_row else None

                                trigger_agent_response_async(user_id, device_id, agent, chat_jid, texto_original, nombre_contacto, contact_id)
                                return jsonify({"success": True, "message": "Procesando respuesta del Agente de IA (Flow)"})
                            else:
                                cursor.execute("DELETE FROM automatizacion_esperas WHERE id = %s", (espera['id'],))
                                conn.commit()
                                return jsonify({"success": True, "message": "Espera de agente invalida eliminada"})
                        
                        # Guardar respuesta en el campo custom
                        campo_destino = espera.get("campo_destino")
                        if campo_destino:
                            # --- VALIDACION Y EXTRACCION DE CORREO/EMAIL ---
                            if campo_destino.lower() in ["correo", "email"]:
                                import re
                                match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', texto_original)
                                if not match:
                                    # Correo invalido: enviar mensaje y mantener la espera
                                    send_bridge_message(device_id, chat_jid, "⚠️ El correo ingresado no es valido. Por favor, escribe tu correo electronico correctamente (ejemplo: usuario@correo.com):")
                                    return jsonify({"success": True, "message": "Correo invalido, reintentando"})
                                else:
                                    # Extraer solo el correo limpio
                                    texto_original = match.group(0)

                            cursor.execute("SELECT id FROM campos_customizados WHERE nombre = %s AND usuario_id = %s", (campo_destino, user_id))
                            campo_row = cursor.fetchone()
                            if campo_row:
                                cursor.execute("SELECT id FROM contactos WHERE jid = %s AND dispositivo_id = %s", (chat_jid, device_id))
                                contacto_row = cursor.fetchone()
                                if contacto_row:
                                    cursor.execute("""
                                        INSERT INTO contacto_valores_custom (contacto_id, campo_id, valor)
                                        VALUES (%s, %s, %s)
                                        ON DUPLICATE KEY UPDATE valor = VALUES(valor)
                                    """, (contacto_row['id'], campo_row['id'], texto_original))
                                    conn.commit()
                        
                        # Eliminar la espera
                        cursor.execute("DELETE FROM automatizacion_esperas WHERE id = %s", (espera['id'],))
                        conn.commit()
                        
                        # Auto-marcar como leído (envía visto gris/azul)
                        auto_mark_message_read(cursor, conn, user_id, device_id, chat_jid, msg.get("mensaje_id"))
                        
                        # Reanudar el flujo desde el nodo de la pregunta
                        auto_id = espera.get("automatizacion_id")
                        cursor.execute("SELECT * FROM automatizaciones WHERE id = %s", (auto_id,))
                        auto = cursor.fetchone()
                        if auto:
                            trigger_automation_async(user_id, device_id, auto, chat_jid, contact_name=nombre_contacto, start_node_id=espera.get("nodo_espera_id"), response_text=texto_original)
                        
                        return jsonify({"success": True, "message": "Respuesta capturada"})

                    # 3. SI NO ES PALABRA CLAVE NI ESPERA, VERIFICAR AGENTE DE IA ACTIVO
                    if not is_group:
                        cursor.execute("SELECT * FROM agentes_ia WHERE dispositivo_id = %s AND activo = 1 LIMIT 1", (device_id,))
                        agent = cursor.fetchone()
                        if agent:
                            cursor.execute("SELECT id, agente_asignado_id FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (chat_jid, device_id))
                            contact_db = cursor.fetchone()
                            
                            contact_id = None
                            agente_asignado_id = None
                            if contact_db:
                                contact_id = contact_db["id"]
                                agente_asignado_id = contact_db["agente_asignado_id"]
                            
                            is_assigned_to_human = False
                            if agente_asignado_id is not None and agente_asignado_id != device_id and agente_asignado_id != agent["id"]:
                                is_assigned_to_human = True
                                
                            if not is_assigned_to_human:
                                # Auto-marcar como leído para el bot
                                auto_mark_message_read(cursor, conn, user_id, device_id, chat_jid, msg.get("mensaje_id"))
                                
                                trigger_agent_response_async(user_id, device_id, agent, chat_jid, texto_original, nombre_contacto, contact_id)
                                return jsonify({"success": True, "message": "Procesando respuesta del Agente de IA"})

        return jsonify({"success": True, "event": event})

    except ValueError as error:
        logger.exception("ValueError en webhook de whatsapp")
        return jsonify({"success": False, "message": str(error)}), 400
    except mysql.connector.Error as error:
        logger.exception("Error de base de datos en webhook de whatsapp")
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    except Exception as error:
        logger.exception("Error inesperado en webhook de whatsapp")
        return jsonify({"success": False, "message": f"Error inesperado: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/login", methods=["POST"])
def login():
    data = request.get_json(silent=True) or {}
    correo = (data.get("correo") or data.get("email") or "").strip().lower()
    password = data.get("password") or data.get("contrasena") or data.get("contrasena_hash")

    if not correo or not password:
        return jsonify({"success": False, "message": "Correo y contrasena son obligatorios"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT
                id, nombre, correo, contrasena_hash, foto_perfil,
                whatsapp_personal, zona_horaria, rol, activo,
                creado_en, ultimo_acceso
            FROM usuarios
            WHERE correo = %s
            LIMIT 1
            """,
            (correo,),
        )
        user = cursor.fetchone()

        if not user or not verify_password(password, user.get("contrasena_hash")):
            return jsonify({"success": False, "message": "Credenciales invalidas"}), 401

        if int(user.get("activo") or 0) != 1:
            return jsonify({"success": False, "message": "Usuario inactivo"}), 403

        cursor.execute("UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = %s", (user["id"],))
        conn.commit()
        user["ultimo_acceso"] = datetime.now()

        # Generar token de seguridad
        access_token = create_access_token(identity=str(user["id"]))
        
        response_user = public_user(user)
        response_user["token"] = access_token

        return jsonify({"success": True, "user": response_user})

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    except Exception as error:
        return jsonify({"success": False, "message": f"Error inesperado: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/profile/<int:user_id>", methods=["GET"])
@jwt_required()
def get_profile(user_id):
    current_user_id = get_jwt_identity()
    if str(current_user_id) != str(user_id):
        return jsonify({"success": False, "message": "Acceso no autorizado"}), 403

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            f"SELECT {', '.join(PUBLIC_USER_FIELDS)} FROM usuarios WHERE id = %s LIMIT 1",
            (user_id,),
        )
        user = cursor.fetchone()

        if not user:
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        return jsonify({"success": True, "user": public_user(user)})

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/miembros", methods=["GET"])
@jwt_required()
def get_miembros():
    user_id = resolve_real_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no identificado"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            f"SELECT {', '.join(PUBLIC_USER_FIELDS)} FROM usuarios WHERE parent_id = %s ORDER BY creado_en DESC",
            (user_id,)
        )
        miembros = cursor.fetchall()
        return jsonify({"success": True, "miembros": [public_user(m) for m in miembros]})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/miembros", methods=["POST"])
@jwt_required()
def add_miembro():
    user_id = resolve_real_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no identificado"}), 400

    data = request.get_json(silent=True) or {}
    nombre = data.get("nombre", "").strip()
    correo = data.get("correo", "").strip().lower()
    contrasena = data.get("password") or data.get("contrasena") or ""
    rol = data.get("rol", "agente").strip().lower()

    if not nombre or not correo or not contrasena:
        return jsonify({"success": False, "message": "Nombre, Correo y Contraseña son requeridos"}), 400

    if rol not in ["agente", "visor"]:
        return jsonify({"success": False, "message": "Rol inválido. Debe ser 'agente' o 'visor'"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Validar límites de plan del administrador
        cursor.execute(
            """
            SELECT p.max_accesos_multiagente
            FROM suscripciones s
            INNER JOIN planes p ON p.id = s.plan_id
            WHERE s.usuario_id = %s
            ORDER BY FIELD(s.estado, 'activa', 'prueba', 'vencida', 'cancelada'), s.fecha_vencimiento DESC, s.id DESC
            LIMIT 1
            """,
            (user_id,)
        )
        plan_row = cursor.fetchone()
        max_accesos = plan_row["max_accesos_multiagente"] if plan_row else 1
        colaboradores_permitidos = max_accesos - 1

        # 2. Contar colaboradores actuales
        cursor.execute("SELECT COUNT(*) AS total FROM usuarios WHERE parent_id = %s", (user_id,))
        count_row = cursor.fetchone()
        current_colab_count = count_row["total"] if count_row else 0

        if current_colab_count >= colaboradores_permitidos:
            return jsonify({
                "success": False,
                "message": f"Has alcanzado el límite de {colaboradores_permitidos} colaboradores de tu plan actual. Mejora tu plan para añadir más accesos."
            }), 400

        # 3. Validar correo no duplicado
        cursor.execute("SELECT id FROM usuarios WHERE correo = %s LIMIT 1", (correo,))
        if cursor.fetchone():
            return jsonify({"success": False, "message": "El correo ya está registrado en el sistema"}), 400

        # 4. Crear colaborador
        from werkzeug.security import generate_password_hash
        pass_hash = generate_password_hash(contrasena)
        cursor.execute(
            """
            INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo, parent_id, creado_en)
            VALUES (%s, %s, %s, %s, 1, %s, NOW())
            """,
            (nombre, correo, pass_hash, rol, user_id)
        )
        conn.commit()
        new_id = cursor.lastrowid

        return jsonify({
            "success": True,
            "message": "Colaborador añadido exitosamente",
            "miembro": {
                "id": new_id,
                "nombre": nombre,
                "correo": correo,
                "rol": rol,
                "parent_id": user_id
            }
        })
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/miembros/<int:miembro_id>", methods=["DELETE"])
@jwt_required()
def delete_miembro(miembro_id):
    user_id = resolve_real_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no identificado"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Verificar propiedad del miembro
        cursor.execute("SELECT id FROM usuarios WHERE id = %s AND parent_id = %s LIMIT 1", (miembro_id, user_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Colaborador no encontrado o no autorizado"}), 404

        # Eliminar
        cursor.execute("DELETE FROM usuarios WHERE id = %s", (miembro_id,))
        conn.commit()

        return jsonify({"success": True, "message": "Colaborador eliminado exitosamente"})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/dashboard/<int:user_id>", methods=["GET"])
def get_dashboard(user_id):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # (Las migraciones seguras ahora se ejecutan una sola vez al arrancar la aplicación)

        cursor.execute("SELECT id, nombre, correo, rol, parent_id FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        # Determinar el usuario dueño (si es colaborador, usar el parent_id para consultar datos de negocio y límites)
        owner_user_id = user_id
        if user.get("parent_id") is not None:
            owner_user_id = int(user["parent_id"])

        # Obtener configuración de negocio
        cursor.execute("SELECT nombre_negocio FROM configuracion WHERE usuario_id = %s LIMIT 1", (owner_user_id,))
        config_data = cursor.fetchone()
        nombre_negocio = config_data["nombre_negocio"] if config_data else ""

        # Obtener whatsapp_personal y onboarding_json del usuario
        cursor.execute("SELECT whatsapp_personal, onboarding_json FROM usuarios WHERE id = %s LIMIT 1", (owner_user_id,))
        user_data = cursor.fetchone()
        whatsapp_personal = user_data["whatsapp_personal"] if user_data else None
        onboarding_json_str = user_data["onboarding_json"] if user_data else None

        import json
        onboarding_json = None
        if onboarding_json_str:
            try:
                onboarding_json = json.loads(onboarding_json_str)
            except Exception:
                pass

        cursor.execute(
            """
            SELECT
                s.id AS suscripcion_id,
                s.estado,
                s.periodo,
                s.fecha_inicio,
                s.fecha_vencimiento,
                s.renovacion_auto,
                p.id AS plan_id,
                p.nombre AS plan_nombre,
                p.descripcion AS plan_descripcion,
                p.precio_mensual,
                p.precio_anual,
                p.max_dispositivos,
                p.max_agentes,
                p.max_contactos,
                p.max_envios_masivos,
                p.max_automatizaciones,
                p.permite_ia,
                p.permite_whalink,
                p.permite_grupos,
                p.permite_campanas,
                p.max_accesos_multiagente,
                p.permite_cloud_api,
                p.permite_todos_objetivos_ia,
                p.permite_ia_grupos,
                p.incluye_sesion_inicial,
                p.permite_soporte_chat,
                p.permite_reuniones,
                p.permite_grupo_soporte,
                p.permite_key_account,
                p.max_sesiones_personalizadas
            FROM suscripciones s
            INNER JOIN planes p ON p.id = s.plan_id
            WHERE s.usuario_id = %s
            ORDER BY
                FIELD(s.estado, 'activa', 'prueba', 'vencida', 'cancelada'),
                s.fecha_vencimiento DESC,
                s.id DESC
            LIMIT 1
            """,
            (owner_user_id,),
        )
        plan = cursor.fetchone()

        if not plan:
            cursor.execute(
                """
                SELECT
                    NULL AS suscripcion_id,
                    'sin_suscripcion' AS estado,
                    'mensual' AS periodo,
                    NULL AS fecha_inicio,
                    NULL AS fecha_vencimiento,
                    0 AS renovacion_auto,
                    id AS plan_id,
                    nombre AS plan_nombre,
                    descripcion AS plan_descripcion,
                    precio_mensual,
                    precio_anual,
                    max_dispositivos,
                    max_agentes,
                    max_contactos,
                    max_envios_masivos,
                    max_automatizaciones,
                    permite_ia,
                    permite_whalink,
                    permite_grupos,
                    permite_campanas,
                    max_accesos_multiagente,
                    permite_cloud_api,
                    permite_todos_objetivos_ia,
                    permite_ia_grupos,
                    incluye_sesion_inicial,
                    permite_soporte_chat,
                    permite_reuniones,
                    permite_grupo_soporte,
                    permite_key_account,
                    max_sesiones_personalizadas
                FROM planes
                WHERE nombre = 'Gratis' OR id = 1
                ORDER BY id
                LIMIT 1
                """
            )
            plan = cursor.fetchone() or {
                "estado": "sin_suscripcion",
                "periodo": "mensual",
                "plan_nombre": "Sin plan",
                "max_dispositivos": 0,
                "max_agentes": 0,
                "max_contactos": 0,
                "max_envios_masivos": 0,
                "max_automatizaciones": 0,
                "max_accesos_multiagente": 1,
                "permite_cloud_api": 0,
                "permite_todos_objetivos_ia": 0,
                "permite_ia_grupos": 0,
                "incluye_sesion_inicial": 0,
                "permite_soporte_chat": 0,
                "permite_reuniones": 0,
                "permite_grupo_soporte": 0,
                "permite_key_account": 0,
                "max_sesiones_personalizadas": 0,
            }

        contacts_count = fetch_count(
            cursor,
            """
            SELECT COUNT(*) AS total
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE d.usuario_id = %s
            """,
            (owner_user_id,),
        )
        devices_count = fetch_count(
            cursor,
            "SELECT COUNT(*) AS total FROM dispositivos WHERE usuario_id = %s",
            (owner_user_id,),
        )
        connected_devices_count = fetch_count(
            cursor,
            "SELECT COUNT(*) AS total FROM dispositivos WHERE usuario_id = %s AND estado = 'conectado'",
            (owner_user_id,),
        )
        agents_count = fetch_count(
            cursor,
            "SELECT COUNT(*) AS total FROM usuarios WHERE parent_id = %s",
            (owner_user_id,),
        ) + 1

        cursor.execute(
            """
            SELECT id, dispositivo_id, nombre, numero_telefono, estado, conectado_en, creado_en, color, foto_perfil, meta_phone_number_id, meta_waba_id
            FROM dispositivos
            WHERE usuario_id = %s
            ORDER BY id ASC
            """,
            (owner_user_id,),
        )
        devices = [
            {
                "id": row["id"],
                "dispositivo_id": row.get("dispositivo_id"),
                "nombre": row.get("nombre") or "Mi WhatsApp",
                "numero_telefono": row.get("numero_telefono"),
                "estado": row.get("estado") or "desconectado",
                "conectado_en": as_json_value(row.get("conectado_en")),
                "creado_en": as_json_value(row.get("creado_en")),
                "color": row.get("color"),
                "foto_perfil": public_media_url(row.get("foto_perfil")),
                "meta_phone_number_id": row.get("meta_phone_number_id"),
                "meta_waba_id": row.get("meta_waba_id"),
            }
            for row in cursor.fetchall()
        ]

        dashboard = {
            "plan": {
                "suscripcion_id": plan.get("suscripcion_id"),
                "id": plan.get("plan_id"),
                "nombre": plan.get("plan_nombre"),
                "descripcion": plan.get("plan_descripcion"),
                "estado": plan.get("estado"),
                "periodo": plan.get("periodo"),
                "fecha_inicio": as_json_value(plan.get("fecha_inicio")),
                "fecha_vencimiento": as_json_value(plan.get("fecha_vencimiento")),
                "renovacion_auto": bool(plan.get("renovacion_auto") or False),
                "precio_mensual": str(plan.get("precio_mensual") or "0.00"),
                "precio_anual": str(plan.get("precio_anual") or "0.00"),
                "limits": {
                    "dispositivos": int(plan.get("max_dispositivos") or 0),
                    "agentes": int(plan.get("max_accesos_multiagente") or 1),
                    "contactos": int(plan.get("max_contactos") or 0),
                    "envios_masivos": int(plan.get("max_envios_masivos") or 0),
                    "automatizaciones": int(plan.get("max_automatizaciones") or 0),
                    "accesos_multiagente": int(plan.get("max_accesos_multiagente") or 1),
                    "sesiones_personalizadas": int(plan.get("max_sesiones_personalizadas") or 0),
                },
                "features": {
                    "ia": bool(plan.get("permite_ia") or False),
                    "whalink": bool(plan.get("permite_whalink") or False),
                    "grupos": bool(plan.get("permite_grupos") or False),
                    "campanas": bool(plan.get("permite_campanas") or False),
                    "cloud_api": bool(plan.get("permite_cloud_api") or False),
                    "todos_objetivos_ia": bool(plan.get("permite_todos_objetivos_ia") or False),
                    "ia_grupos": bool(plan.get("permite_ia_grupos") or False),
                    "sesion_inicial": bool(plan.get("incluye_sesion_inicial") or False),
                    "soporte_chat": bool(plan.get("permite_soporte_chat") or False),
                    "reuniones": bool(plan.get("permite_reuniones") or False),
                    "grupo_soporte": bool(plan.get("permite_grupo_soporte") or False),
                    "key_account": bool(plan.get("permite_key_account") or False),
                },
            },
            "usage": {
                "contactos": contacts_count,
                "dispositivos": devices_count,
                "dispositivos_conectados": connected_devices_count,
                "agentes": agents_count,
            },
            "devices": devices,
            "dispositivos": devices,
            "nombre_negocio": nombre_negocio,
            "whatsapp_personal": whatsapp_personal,
            "onboarding_json": onboarding_json,
        }

        return jsonify({"success": True, "dashboard": dashboard})

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/plantillas', methods=['GET'])
def list_plantillas():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id es obligatorio"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_plantillas_table(cursor)
        cursor.execute(
            "SELECT * FROM plantillas WHERE usuario_id = %s ORDER BY fecha_creacion DESC",
            (user_id,),
        )
        templates = []
        for row in cursor.fetchall():
            try:
                botones = json.loads(row.get("botones") or "[]")
            except Exception:
                botones = []
            try:
                cabecera_archivo = json.loads(row.get("cabecera_archivo") or "null")
            except Exception:
                cabecera_archivo = None
            templates.append({
                "id": row.get("id"),
                "usuario_id": row.get("usuario_id"),
                "dispositivo_id": row.get("dispositivo_id"),
                "dispositivo_nombre": row.get("dispositivo_nombre"),
                "nombre": row.get("nombre"),
                "categoria": row.get("categoria"),
                "cabecera": row.get("cabecera"),
                "cabecera_texto": row.get("cabecera_texto"),
                "cabecera_archivo": cabecera_archivo,
                "cuerpo": row.get("cuerpo"),
                "pie": row.get("pie"),
                "botones": botones,
                "tipo": row.get("tipo"),
                "estado": row.get("estado"),
                "fecha_creacion": as_json_value(row.get("fecha_creacion")),
                "actualizado_en": as_json_value(row.get("actualizado_en")),
            })

        return jsonify({"success": True, "plantillas": templates})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/plantillas/<int:plantilla_id>', methods=['GET'])
def get_plantilla(plantilla_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id es obligatorio"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_plantillas_table(cursor)
        cursor.execute(
            "SELECT * FROM plantillas WHERE id = %s AND usuario_id = %s LIMIT 1",
            (plantilla_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Plantilla no encontrada"}), 404

        try:
            botones = json.loads(row.get("botones") or "[]")
        except Exception:
            botones = []
        try:
            cabecera_archivo = json.loads(row.get("cabecera_archivo") or "null")
        except Exception:
            cabecera_archivo = None

        plantilla = {
            "id": row.get("id"),
            "usuario_id": row.get("usuario_id"),
            "dispositivo_id": row.get("dispositivo_id"),
            "dispositivo_nombre": row.get("dispositivo_nombre"),
            "nombre": row.get("nombre"),
            "categoria": row.get("categoria"),
            "cabecera": row.get("cabecera"),
            "cabecera_texto": row.get("cabecera_texto"),
            "cabecera_archivo": cabecera_archivo,
            "cuerpo": row.get("cuerpo"),
            "pie": row.get("pie"),
            "botones": botones,
            "tipo": row.get("tipo"),
            "estado": row.get("estado"),
            "fecha_creacion": as_json_value(row.get("fecha_creacion")),
            "actualizado_en": as_json_value(row.get("actualizado_en")),
        }

        return jsonify({"success": True, "plantilla": plantilla})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/plantillas', methods=['POST'])
def create_plantilla():
    payload = request.get_json(silent=True) or {}
    user_id = resolve_request_user_id()
    if not user_id:
        user_id = payload.get('user_id')
    if not user_id:
        return jsonify({"success": False, "message": "user_id es obligatorio"}), 400

    # Verificar rol del usuario
    try:
        conn_r = get_connection()
        cur_r = conn_r.cursor(dictionary=True)
        cur_r.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (int(user_id),))
        u_row = cur_r.fetchone()
        cur_r.close(); conn_r.close()
        if u_row and u_row.get("rol") in ("agente", "visor"):
            return jsonify({"success": False, "message": "Acción no permitida para colaboradores"}), 403
    except Exception as e:
        logger.error(f"Error verificando rol en create_plantilla: {e}")

    nombre = payload.get('nombre', '').strip()
    cuerpo = payload.get('cuerpo', '').strip()
    dispositivo_id = payload.get('dispositivoId') or payload.get('dispositivo_id')

    if not nombre or not cuerpo or not dispositivo_id:
        return jsonify({"success": False, "message": "Nombre, cuerpo y dispositivo son obligatorios"}), 400

    try:
        dispositivo_id = int(dispositivo_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "dispositivoId inválido"}), 400

    try:
        botones = payload.get('botones') or []
        botones_json = json.dumps(botones)
    except Exception:
        botones_json = '[]'

    try:
        cabecera_archivo_json = json.dumps(payload.get('cabeceraArchivo')) if payload.get('cabeceraArchivo') else None
    except Exception:
        cabecera_archivo_json = None

    conn = None
    cursor = None
    try:
        created_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        if payload.get('fechaCreacion'):
            try:
                created_at = to_mysql_datetime(payload.get('fechaCreacion'))
            except Exception:
                created_at = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_plantillas_table(cursor)
        cursor.execute(
            """
            INSERT INTO plantillas (
                usuario_id, dispositivo_id, dispositivo_nombre, nombre, categoria, cabecera,
                cabecera_texto, cabecera_archivo, cuerpo, pie, botones, tipo, estado, fecha_creacion
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                int(user_id),
                dispositivo_id,
                payload.get('dispositivo_nombre'),
                nombre,
                payload.get('categoria', 'Marketing'),
                payload.get('cabecera', 'Ninguna'),
                payload.get('cabeceraTexto'),
                cabecera_archivo_json,
                cuerpo,
                payload.get('pie'),
                botones_json,
                payload.get('tipo', 'Texto'),
                payload.get('estado', 'Borrador'),
                created_at,
            ),
        )
        conn.commit()
        plantilla_id = cursor.lastrowid
        cursor.execute(
            "SELECT * FROM plantillas WHERE id = %s LIMIT 1",
            (plantilla_id,)
        )
        row = cursor.fetchone()
        plantilla = None
        if row:
            try:
                botones = json.loads(row.get("botones") or "[]")
            except Exception:
                botones = []
            try:
                cabecera_archivo = json.loads(row.get("cabecera_archivo") or "null")
            except Exception:
                cabecera_archivo = None
            plantilla = {
                "id": row.get("id"),
                "usuario_id": row.get("usuario_id"),
                "dispositivo_id": row.get("dispositivo_id"),
                "dispositivo_nombre": row.get("dispositivo_nombre"),
                "nombre": row.get("nombre"),
                "categoria": row.get("categoria"),
                "cabecera": row.get("cabecera"),
                "cabecera_texto": row.get("cabecera_texto"),
                "cabecera_archivo": cabecera_archivo,
                "cuerpo": row.get("cuerpo"),
                "pie": row.get("pie"),
                "botones": botones,
                "tipo": row.get("tipo"),
                "estado": row.get("estado"),
                "fecha_creacion": as_json_value(row.get("fecha_creacion")),
                "actualizado_en": as_json_value(row.get("actualizado_en")),
            }
        return jsonify({"success": True, "plantilla_id": plantilla_id, "plantilla": plantilla})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/plantillas/<int:plantilla_id>', methods=['PUT'])
def update_plantilla(plantilla_id):
    payload = request.get_json(silent=True) or {}
    user_id = resolve_request_user_id()
    if not user_id:
        user_id = payload.get('user_id')
    if not user_id:
        return jsonify({"success": False, "message": "user_id es obligatorio"}), 400

    # Verificar rol del usuario
    try:
        conn_r = get_connection()
        cur_r = conn_r.cursor(dictionary=True)
        cur_r.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (int(user_id),))
        u_row = cur_r.fetchone()
        cur_r.close(); conn_r.close()
        if u_row and u_row.get("rol") in ("agente", "visor"):
            return jsonify({"success": False, "message": "Acción no permitida para colaboradores"}), 403
    except Exception as e:
        logger.error(f"Error verificando rol en update_plantilla: {e}")

    nombre = payload.get('nombre', '').strip()
    cuerpo = payload.get('cuerpo', '').strip()
    dispositivo_id = payload.get('dispositivoId') or payload.get('dispositivo_id')

    if not nombre or not cuerpo or not dispositivo_id:
        return jsonify({"success": False, "message": "Nombre, cuerpo y dispositivo son obligatorios"}), 400

    try:
        dispositivo_id = int(dispositivo_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "dispositivoId inválido"}), 400

    try:
        botones = payload.get('botones') or []
        botones_json = json.dumps(botones)
    except Exception:
        botones_json = '[]'

    try:
        cabecera_archivo_json = json.dumps(payload.get('cabeceraArchivo')) if payload.get('cabeceraArchivo') else None
    except Exception:
        cabecera_archivo_json = None

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_plantillas_table(cursor)
        cursor.execute(
            """
            UPDATE plantillas SET
                dispositivo_id = %s,
                dispositivo_nombre = %s,
                nombre = %s,
                categoria = %s,
                cabecera = %s,
                cabecera_texto = %s,
                cabecera_archivo = %s,
                cuerpo = %s,
                pie = %s,
                botones = %s,
                tipo = %s,
                estado = %s
            WHERE id = %s AND usuario_id = %s
            """,
            (
                dispositivo_id,
                payload.get('dispositivo_nombre'),
                nombre,
                payload.get('categoria', 'Marketing'),
                payload.get('cabecera', 'Ninguna'),
                payload.get('cabeceraTexto'),
                cabecera_archivo_json,
                cuerpo,
                payload.get('pie'),
                botones_json,
                payload.get('tipo', 'Texto'),
                payload.get('estado', 'Borrador'),
                plantilla_id,
                int(user_id),
            ),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Plantilla no encontrada o no pertenece al usuario"}), 404

        cursor.execute(
            "SELECT * FROM plantillas WHERE id = %s AND usuario_id = %s LIMIT 1",
            (plantilla_id, int(user_id))
        )
        row = cursor.fetchone()
        plantilla = None
        if row:
            try:
                botones = json.loads(row.get("botones") or "[]")
            except Exception:
                botones = []
            try:
                cabecera_archivo = json.loads(row.get("cabecera_archivo") or "null")
            except Exception:
                cabecera_archivo = None
            plantilla = {
                "id": row.get("id"),
                "usuario_id": row.get("usuario_id"),
                "dispositivo_id": row.get("dispositivo_id"),
                "dispositivo_nombre": row.get("dispositivo_nombre"),
                "nombre": row.get("nombre"),
                "categoria": row.get("categoria"),
                "cabecera": row.get("cabecera"),
                "cabecera_texto": row.get("cabecera_texto"),
                "cabecera_archivo": cabecera_archivo,
                "cuerpo": row.get("cuerpo"),
                "pie": row.get("pie"),
                "botones": botones,
                "tipo": row.get("tipo"),
                "estado": row.get("estado"),
                "fecha_creacion": as_json_value(row.get("fecha_creacion")),
                "actualizado_en": as_json_value(row.get("actualizado_en")),
            }
        return jsonify({"success": True, "plantilla": plantilla})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/plantillas/<int:plantilla_id>', methods=['DELETE'])
def delete_plantilla(plantilla_id):
    payload = request.get_json(silent=True) or {}
    user_id = resolve_request_user_id()
    if not user_id:
        user_id = payload.get('user_id')
    if not user_id:
        return jsonify({"success": False, "message": "user_id es obligatorio"}), 400

    # Verificar rol del usuario
    try:
        conn_r = get_connection()
        cur_r = conn_r.cursor(dictionary=True)
        cur_r.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (int(user_id),))
        u_row = cur_r.fetchone()
        cur_r.close(); conn_r.close()
        if u_row and u_row.get("rol") in ("agente", "visor"):
            return jsonify({"success": False, "message": "Acción no permitida para colaboradores"}), 403
    except Exception as e:
        logger.error(f"Error verificando rol en delete_plantilla: {e}")

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        ensure_plantillas_table(cursor)
        cursor.execute(
            "DELETE FROM plantillas WHERE id = %s AND usuario_id = %s",
            (plantilla_id, int(user_id)),
        )
        conn.commit()
        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Plantilla no encontrada o no pertenece al usuario"}), 404
        return jsonify({"success": True})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/plantillas/sync', methods=['POST'])
def sync_plantillas():
    payload = request.get_json(silent=True) or {}
    user_id = resolve_request_user_id()
    if not user_id:
        user_id = payload.get('user_id')
    if not user_id:
        return jsonify({"success": False, "message": "user_id es obligatorio"}), 400

    # Verificar rol del usuario
    try:
        conn_r = get_connection()
        cur_r = conn_r.cursor(dictionary=True)
        cur_r.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (int(user_id),))
        u_row = cur_r.fetchone()
        cur_r.close(); conn_r.close()
        if u_row and u_row.get("rol") in ("agente", "visor"):
            return jsonify({"success": False, "message": "Acción no permitida para colaboradores"}), 403
    except Exception as e:
        logger.error(f"Error verificando rol en sync_plantillas: {e}")

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        ensure_plantillas_table(cursor)
        cursor.execute(
            "UPDATE plantillas SET estado = %s WHERE usuario_id = %s",
            ("Sincronizado", int(user_id)),
        )
        conn.commit()
        return jsonify({"success": True, "updated": cursor.rowcount})
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/whalink/list", methods=["GET"])
def list_whalinks():
    try:
        user_id = int(request.args.get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_whalinks_table(cursor)
        ensure_whalink_clicks_table(cursor)

        columns = get_table_columns(cursor, "whalinks")
        user_where, user_params = whalink_user_where(columns, user_id)
        device_expr = whalink_device_expr(columns)
        date_expr = whalink_date_expr(columns)

        cursor.execute(
            f"""
            SELECT
                w.*,
                d.nombre AS dispositivo_nombre,
                d.numero_telefono,
                COALESCE(cs.clicks_totales, 0) AS clicks_totales,
                COALESCE(cs.clicks_unicos, 0) AS clicks_unicos
            FROM whalinks w
            LEFT JOIN dispositivos d ON d.id = {device_expr}
            LEFT JOIN (
                SELECT
                    whalink_id,
                    COUNT(*) AS clicks_totales,
                    COUNT(DISTINCT CONCAT(COALESCE(ip_address, ''), '|', LEFT(COALESCE(user_agent, ''), 255))) AS clicks_unicos
                FROM whalink_clicks
                GROUP BY whalink_id
            ) cs ON cs.whalink_id = w.id
            WHERE {user_where}
            ORDER BY {date_expr} DESC, w.id DESC
            """,
            tuple(user_params),
        )

        links = [whalink_row_to_json(row) for row in cursor.fetchall()]
        return jsonify({"success": True, "links": links})

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/whalink/upload-image", methods=["POST"])
def upload_whalink_image():
    try:
        user_id = request.form.get("user_id") or request.args.get("user_id")
        if not user_id:
            return jsonify({"success": False, "message": "Usuario requerido"}), 401
            
        file = request.files.get("image")
        if not file or not file.filename:
            return jsonify({"success": False, "message": "Archivo requerido"}), 400
            
        if not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
            return jsonify({"success": False, "message": "Formato de imagen no permitido"}), 400
            
        upload_dir = os.path.join(app.config["UPLOAD_FOLDER"], "whalinks", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        file.save(os.path.join(upload_dir, unique_name))
        
        media_path = f"whalinks/{user_id}/{unique_name}"
        media_url = f"{request.host_url.rstrip('/')}/media/{media_path}"
        
        return jsonify({
            "success": True, 
            "imagen_url": media_url
        })
    except Exception as e:
        logger.exception("Error subiendo imagen de whalink")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/automatizaciones/upload-media", methods=["POST"])
def upload_automation_media():
    try:
        user_id = resolve_request_user_id()
        if not user_id:
            return jsonify({"success": False, "message": "Usuario requerido"}), 401
            
        file = request.files.get("file")
        if not file or not file.filename:
            return jsonify({"success": False, "message": "Archivo requerido"}), 400
            
        if not allowed_file(file.filename, ALLOWED_MEDIA_EXTENSIONS):
            return jsonify({"success": False, "message": "Formato de archivo no permitido"}), 400
            
        upload_dir = os.path.join(app.config["UPLOAD_FOLDER"], "automations", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        local_filepath = os.path.join(upload_dir, unique_name)
        file.save(local_filepath)
        
        media_path = f"automations/{user_id}/{unique_name}"
        
        # Subir inmediatamente a Cloudflare R2 si está configurado
        public_url = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
        use_r2 = os.getenv("USE_R2", "true") == "true"
        
        if use_r2 and public_url:
            try:
                import boto3
                from botocore.config import Config
                r2_client = boto3.client(
                    's3',
                    endpoint_url=os.getenv('R2_ENDPOINT_URL'),
                    aws_access_key_id=os.getenv('R2_ACCESS_KEY_ID'),
                    aws_secret_access_key=os.getenv('R2_SECRET_ACCESS_KEY'),
                    region_name='auto',
                    config=Config(signature_version='s3v4')
                )
                bucket_name = os.getenv("R2_BUCKET_NAME")
                ext = filename.rsplit(".", 1)[-1].lower() if "." in filename else ""
                content_type = "application/octet-stream"
                if ext in ["jpg", "jpeg"]: content_type = "image/jpeg"
                elif ext == "png": content_type = "image/png"
                elif ext == "webp": content_type = "image/webp"
                elif ext == "gif": content_type = "image/gif"
                elif ext == "mp4": content_type = "video/mp4"
                
                r2_client.upload_file(
                    local_filepath,
                    bucket_name,
                    media_path,
                    ExtraArgs={'ContentType': content_type}
                )
                media_url = f"{public_url}/{media_path}"
                logger.info(f"Media de automatización subida exitosamente a Cloudflare R2: {media_url}")
            except Exception as r2_err:
                logger.error(f"Error subiendo a R2 en upload_automation_media: {r2_err}")
                media_url = f"{request.host_url.rstrip('/')}/media/{media_path}"
        else:
            media_url = f"{request.host_url.rstrip('/')}/media/{media_path}"
        
        return jsonify({
            "success": True, 
            "url": media_url,
            "filename": filename
        })
    except Exception as e:
        logger.exception("Error subiendo media de automatizacion")
        return jsonify({"success": False, "message": str(e)}), 500


@app.route("/api/whalink/<int:whalink_id>", methods=["GET"])
def get_whalink(whalink_id):
    try:
        user_id = int(request.args.get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        link = fetch_whalink_for_user(cursor, whalink_id, user_id)

        if not link:
            return jsonify({"success": False, "message": "Whalink no encontrado"}), 404

        return jsonify({"success": True, "link": whalink_row_to_json(link)})

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/whalink/<int:whalink_id>", methods=["PUT"])
def update_whalink(whalink_id):
    data = request.get_json(silent=True) or {}

    try:
        user_id = int(data.get("user_id"))
        device_id = int(data.get("deviceId") or data.get("device_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario y dispositivo requeridos"}), 400

    nombre = str(data.get("nombre") or "").strip()
    mensaje = str(data.get("mensaje") or "").strip()
    url_generada = str(data.get("url_generada") or "").strip()
    imagen_url = str(data.get("imagen_url") or "").strip() or None
    descripcion = str(data.get("descripcion") or "").strip() or None
    clave_nombre = str(data.get("clave_nombre") or "").strip() or None
    clave_correo = str(data.get("clave_correo") or "").strip() or None
    pixel_tracking = str(data.get("pixel_tracking") or "").strip() or None

    if not nombre or not mensaje or not url_generada:
        return jsonify({"success": False, "message": "Nombre, mensaje y enlace generado son requeridos"}), 400

    if not url_generada.startswith("https://wa.me/"):
        return jsonify({"success": False, "message": "El enlace generado no es un Whalink valido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_whalinks_table(cursor)

        cursor.execute(
            """
            SELECT id
            FROM dispositivos
            WHERE id = %s AND usuario_id = %s
            LIMIT 1
            """,
            (device_id, user_id),
        )
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "El dispositivo no pertenece a este usuario"}), 404

        if not fetch_whalink_for_user(cursor, whalink_id, user_id):
            return jsonify({"success": False, "message": "Whalink no encontrado"}), 404

        update_data = build_whalink_update(cursor, {
            "user_id": user_id,
            "device_id": device_id,
            "nombre": nombre,
            "mensaje": mensaje,
            "url_generada": url_generada,
            "imagen_url": imagen_url,
            "descripcion": descripcion,
            "clave_nombre": clave_nombre,
            "clave_correo": clave_correo,
            "pixel_tracking": pixel_tracking,
        })

        assignments = ", ".join(f"`{column}` = %s" for column in update_data)
        values = [update_data[column] for column in update_data]
        cursor.execute(
            f"UPDATE whalinks SET {assignments} WHERE id = %s",
            values + [whalink_id],
        )
        conn.commit()

        updated_link = fetch_whalink_for_user(cursor, whalink_id, user_id)
        return jsonify({
            "success": True,
            "message": "Whalink actualizado correctamente",
            "link": whalink_row_to_json(updated_link),
            "short_url": whalink_row_to_json(updated_link).get("short_url"),
        })

    except mysql.connector.Error as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/whalink/<int:whalink_id>", methods=["DELETE"])
def delete_whalink(whalink_id):
    try:
        user_id = int(request.args.get("user_id") or (request.get_json(silent=True) or {}).get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_whalinks_table(cursor)
        ensure_whalink_clicks_table(cursor)
        ensure_whalink_leads_table(cursor)

        if not fetch_whalink_for_user(cursor, whalink_id, user_id):
            return jsonify({"success": False, "message": "Whalink no encontrado"}), 404

        cursor.execute("DELETE FROM whalink_clicks WHERE whalink_id = %s", (whalink_id,))
        cursor.execute("DELETE FROM whalink_leads WHERE whalink_id = %s", (whalink_id,))
        cursor.execute("DELETE FROM whalinks WHERE id = %s", (whalink_id,))
        conn.commit()

        return jsonify({"success": True, "message": "Whalink eliminado correctamente"})

    except mysql.connector.Error as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/whalink/import", methods=["POST"])
def import_whalinks():
    data = request.get_json(silent=True) or {}

    try:
        user_id = int(data.get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario requerido"}), 400

    rows = data.get("rows")
    if not isinstance(rows, list):
        return jsonify({"success": False, "message": "Lista de links requerida"}), 400

    conn = None
    cursor = None
    imported = 0
    skipped = 0

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_whalinks_table(cursor)
        ensure_whalink_clicks_table(cursor)

        cursor.execute(
            """
            SELECT id, numero_telefono
            FROM dispositivos
            WHERE usuario_id = %s
            ORDER BY id ASC
            """,
            (user_id,),
        )
        devices = cursor.fetchall()
        device_by_id = {int(device["id"]): device for device in devices}
        default_device = devices[0] if devices else None

        if not default_device:
            return jsonify({"success": False, "message": "No hay dispositivos para importar links"}), 404

        for row in rows:
            if not isinstance(row, dict):
                skipped += 1
                continue

            try:
                raw_device_id = row.get("device_id") or row.get("deviceId") or row.get("dispositivo_id")
                device_id = int(raw_device_id) if raw_device_id else int(default_device["id"])
            except (TypeError, ValueError):
                device_id = int(default_device["id"])

            device = device_by_id.get(device_id) or default_device
            nombre = str(row.get("nombre") or row.get("name") or row.get("titulo") or "").strip()
            mensaje = str(row.get("mensaje") or row.get("message") or "").strip()
            phone = row.get("telefono") or row.get("numero") or row.get("phone") or device.get("numero_telefono")
            url_generada = str(row.get("url_generada") or row.get("url") or "").strip() or build_whatsapp_url(phone, mensaje)

            if not nombre or not mensaje or not url_generada:
                skipped += 1
                continue

            short_code = generate_whalink_short_code(cursor)
            insert_data = build_whalink_insert(
                cursor,
                user_id,
                int(device["id"]),
                nombre,
                mensaje,
                url_generada,
                short_code,
                imagen_url=str(row.get("imagen_url") or "").strip() or None,
                descripcion=str(row.get("descripcion") or row.get("description") or "").strip() or None,
                clave_nombre=str(row.get("clave_nombre") or "").strip() or None,
                clave_correo=str(row.get("clave_correo") or "").strip() or None,
                pixel_tracking=str(row.get("pixel_tracking") or "").strip() or None,
            )

            column_names = list(insert_data.keys())
            placeholders = ", ".join(["%s"] * len(column_names))
            escaped_columns = ", ".join(f"`{column}`" for column in column_names)
            values = [insert_data[column] for column in column_names]
            cursor.execute(
                f"INSERT INTO whalinks ({escaped_columns}) VALUES ({placeholders})",
                values,
            )
            imported += 1

        conn.commit()
        return jsonify({
            "success": True,
            "message": f"Importacion completada: {imported} creados, {skipped} omitidos",
            "imported": imported,
            "skipped": skipped,
        })

    except mysql.connector.Error as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/whalink/<int:whalink_id>/stats", methods=["GET"])
def whalink_stats(whalink_id):
    try:
        user_id = int(request.args.get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario requerido"}), 400

    selected_range = (request.args.get("range") or "week").lower()
    days = 30 if selected_range == "month" else 7

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_whalinks_table(cursor)
        ensure_whalink_clicks_table(cursor)

        columns = get_table_columns(cursor, "whalinks")
        user_where, user_params = whalink_user_where(columns, user_id)
        device_expr = whalink_device_expr(columns)

        cursor.execute(
            f"""
            SELECT
                w.*,
                d.nombre AS dispositivo_nombre,
                d.numero_telefono
            FROM whalinks w
            LEFT JOIN dispositivos d ON d.id = {device_expr}
            WHERE w.id = %s AND {user_where}
            LIMIT 1
            """,
            tuple([whalink_id] + user_params),
        )
        link = cursor.fetchone()

        if not link:
            return jsonify({"success": False, "message": "Whalink no encontrado"}), 404

        cursor.execute(
            f"""
            SELECT
                COUNT(*) AS clicks_totales,
                COUNT(DISTINCT CONCAT(COALESCE(ip_address, ''), '|', LEFT(COALESCE(user_agent, ''), 255))) AS clicks_unicos,
                SUM(CASE WHEN device_type = 'movil' THEN 1 ELSE 0 END) AS clicks_movil,
                SUM(CASE WHEN device_type = 'pc' THEN 1 ELSE 0 END) AS clicks_pc
            FROM whalink_clicks
            WHERE whalink_id = %s
              AND clicked_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
            """,
            (whalink_id,),
        )
        totals = cursor.fetchone() or {}

        cursor.execute(
            f"""
            SELECT
                DATE(clicked_at) AS fecha,
                COUNT(*) AS clicks
            FROM whalink_clicks
            WHERE whalink_id = %s
              AND clicked_at >= DATE_SUB(NOW(), INTERVAL {days} DAY)
            GROUP BY DATE(clicked_at)
            ORDER BY fecha ASC
            """,
            (whalink_id,),
        )
        timeline = [
            {"fecha": as_json_value(row.get("fecha")), "clicks": int(row.get("clicks") or 0)}
            for row in cursor.fetchall()
        ]

        return jsonify({
            "success": True,
            "range": selected_range,
            "link": whalink_row_to_json(link),
            "stats": {
                "clicks_totales": int(totals.get("clicks_totales") or 0),
                "clicks_unicos": int(totals.get("clicks_unicos") or 0),
                "clicks_movil": int(totals.get("clicks_movil") or 0),
                "clicks_pc": int(totals.get("clicks_pc") or 0),
                "timeline": timeline,
            },
        })

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/whalink/<int:whalink_id>/leads", methods=["GET"])
def whalink_leads_list(whalink_id):
    try:
        user_id = int(request.args.get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario requerido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_whalinks_table(cursor)
        ensure_whalink_leads_table(cursor)
        
        # Verificar que el whalink pertenece al usuario
        columns = get_table_columns(cursor, "whalinks")
        user_where, user_params = whalink_user_where(columns, user_id)
        
        cursor.execute(
            f"SELECT w.id FROM whalinks w WHERE w.id = %s AND {user_where} LIMIT 1",
            tuple([whalink_id] + user_params),
        )
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Whalink no encontrado"}), 404

        # Obtener los leads
        cursor.execute(
            """
            SELECT nombre, correo, ip_address, creado_en
            FROM whalink_leads
            WHERE whalink_id = %s
            ORDER BY creado_en DESC
            """,
            (whalink_id,),
        )
        rows = cursor.fetchall()
        leads = [
            {
                "nombre": row.get("nombre"),
                "correo": row.get("correo"),
                "ip_address": row.get("ip_address"),
                "creado_en": as_json_value(row.get("creado_en")),
            }
            for row in rows
        ]
        return jsonify({"success": True, "leads": leads})
    except Exception as e:
        logger.error(f"Error listando leads del whalink: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/whalink/save", methods=["POST"])
def save_whalink():
    data = request.get_json(silent=True) or {}

    try:
        user_id = int(data.get("user_id"))
        device_id = int(data.get("deviceId") or data.get("device_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario y dispositivo requeridos"}), 400

    # Verificar que el usuario no sea agente/visor (sin requerir JWT header)
    try:
        conn_r = get_connection()
        cur_r = conn_r.cursor(dictionary=True)
        cur_r.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
        u_row = cur_r.fetchone()
        cur_r.close(); conn_r.close()
        if u_row and u_row.get("rol") in ("agente", "visor"):
            return jsonify({"success": False, "message": "No tienes permisos para realizar esta acción"}), 403
    except Exception as e:
        logger.error(f"Error verificando rol en save_whalink: {e}")

    nombre = str(data.get("nombre") or "").strip()
    mensaje = str(data.get("mensaje") or "").strip()
    url_generada = str(data.get("url_generada") or "").strip()
    imagen_url = str(data.get("imagen_url") or "").strip() or None
    descripcion = str(data.get("descripcion") or "").strip() or None
    clave_nombre = str(data.get("clave_nombre") or "").strip() or None
    clave_correo = str(data.get("clave_correo") or "").strip() or None
    pixel_tracking = str(data.get("pixel_tracking") or "").strip() or None

    if not nombre or not mensaje or not url_generada:
        return jsonify({"success": False, "message": "Nombre, mensaje y enlace generado son requeridos"}), 400

    if not url_generada.startswith("https://wa.me/"):
        return jsonify({"success": False, "message": "El enlace generado no es un Whalink valido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
            SELECT id
            FROM dispositivos
            WHERE id = %s AND usuario_id = %s
            LIMIT 1
            """,
            (device_id, user_id),
        )
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "El dispositivo no pertenece a este usuario"}), 404

        ensure_whalinks_table(cursor)
        ensure_whalink_clicks_table(cursor)
        short_code = generate_whalink_short_code(cursor)
        insert_data = build_whalink_insert(
            cursor,
            user_id,
            device_id,
            nombre,
            mensaje,
            url_generada,
            short_code,
            imagen_url=imagen_url,
            descripcion=descripcion,
            clave_nombre=clave_nombre,
            clave_correo=clave_correo,
            pixel_tracking=pixel_tracking,
        )

        if not insert_data:
            return jsonify({"success": False, "message": "No se pudo preparar el registro Whalink"}), 500

        column_names = list(insert_data.keys())
        placeholders = ", ".join(["%s"] * len(column_names))
        escaped_columns = ", ".join(f"`{column}`" for column in column_names)
        values = [insert_data[column] for column in column_names]

        cursor.execute(
            f"INSERT INTO whalinks ({escaped_columns}) VALUES ({placeholders})",
            values,
        )
        conn.commit()
        short_url = build_short_url(short_code)

        return jsonify({
            "success": True,
            "message": "Whalink guardado correctamente",
            "whalink_id": cursor.lastrowid,
            "short_code": short_code,
            "short_url": short_url,
            "url_generada": url_generada,
        })

    except mysql.connector.Error as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/l/<short_code>", methods=["GET"])
def redirect_short_whalink(short_code):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_whalinks_table(cursor)
        ensure_whalink_clicks_table(cursor)
        ensure_whalink_leads_table(cursor)
        columns = get_table_columns(cursor, "whalinks")
        device_expr = whalink_device_expr(columns)

        select_fields = whalink_select_fields(columns)
        where_parts = ["w.short_code = %s"]
        params = [short_code]

        if "slug" in columns:
            where_parts.append("w.slug = %s")
            params.append(short_code)

        cursor.execute(
            f"""
            SELECT {', '.join(select_fields)}
            FROM whalinks w
            LEFT JOIN dispositivos d ON d.id = {device_expr}
            WHERE {' OR '.join(where_parts)}
            LIMIT 1
            """,
            tuple(params),
        )
        whalink = cursor.fetchone()

        if not whalink:
            return jsonify({"success": False, "message": "Link corto no encontrado"}), 404

        # Priorizar el mensaje de la automatización si existe
        link_message = whalink.get("mensaje") or whalink.get("mensaje_bienvenida") or ""
        if link_message.lower() == "hola":
            link_message = "" # Limpiar si es el genérico
            
        whatsapp_url = (
            whalink.get("url_generada")
            or build_whatsapp_url(
                whalink.get("numero_telefono"),
                link_message,
            )
        )

        if not whatsapp_url:
            return jsonify({"success": False, "message": "El link corto no tiene destino configurado"}), 404

        user_agent = request.headers.get("User-Agent", "")
        ip_address = (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip()
        client_type = detect_client_device_type(user_agent)
        stored_short_code = whalink.get("short_code") or whalink.get("slug") or short_code

        if request.args.get("continue") == "1":
            name_key = str(whalink.get("clave_nombre") or "").strip()
            email_key = str(whalink.get("clave_correo") or "").strip()
            lead_name = str(request.args.get(name_key) or "").strip() if name_key else None
            lead_email = str(request.args.get(email_key) or "").strip() if email_key else None

            if lead_name or lead_email:
                should_insert = True
                if lead_email:
                    cursor.execute(
                        "SELECT id FROM whalink_leads WHERE whalink_id = %s AND correo = %s LIMIT 1",
                        (whalink.get("id"), lead_email),
                    )
                    if cursor.fetchone():
                        should_insert = False

                if should_insert:
                    cursor.execute(
                        """
                        INSERT INTO whalink_leads (
                            whalink_id, short_code, nombre, correo, ip_address, user_agent, creado_en
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, NOW())
                        """,
                        (
                            whalink.get("id"),
                            stored_short_code,
                            lead_name or None,
                            lead_email or None,
                            ip_address,
                            user_agent,
                        ),
                    )
                    conn.commit()

            return redirect(whatsapp_url)

        cursor.execute(
            """
            INSERT INTO whalink_clicks (
                whalink_id, short_code, ip_address, user_agent, device_type, clicked_at
            )
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (
                whalink.get("id"),
                stored_short_code,
                ip_address,
                user_agent,
                client_type,
            ),
        )

        if "total_clics" in columns:
            cursor.execute(
                """
                UPDATE whalinks
                SET total_clics = COALESCE(total_clics, 0) + 1
                WHERE id = %s
                """,
                (whalink.get("id"),),
            )

        conn.commit()

        has_landing = bool(
            str(whalink.get("pixel_tracking") or "").strip()
            or str(whalink.get("clave_nombre") or "").strip()
            or str(whalink.get("clave_correo") or "").strip()
        )

        if has_landing:
            return render_whalink_landing(stored_short_code, whalink, whatsapp_url)

        return redirect(whatsapp_url)

    except mysql.connector.Error as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@app.route("/api/dispositivos/cleanup", methods=["POST"])
def cleanup_devices():
    """Elimina los dispositivos 'fantasma' (desconectados, sin número de teléfono) que sobran
    para dejar solo los conectados + 1 slot disponible limpio."""
    data = request.get_json(silent=True) or {}
    try:
        user_id = int(data.get("user_id") or request.args.get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Borrar todos los dispositivos desconectados sin número de teléfono
        # (son los "fantasma" que se crean al hacer clic sin completar el QR)
        cursor.execute(
            """
            DELETE FROM dispositivos
            WHERE usuario_id = %s
              AND (estado != 'conectado' OR estado IS NULL)
              AND (numero_telefono IS NULL OR numero_telefono = '')
              AND (color IS NULL OR color != 'cloud')
            """,
            (user_id,)
        )
        deleted = cursor.rowcount
        conn.commit()

        logger.info(f"Cleanup: eliminados {deleted} dispositivos fantasma del usuario {user_id}")
        return jsonify({"success": True, "deleted": deleted})
    except Exception as e:
        logger.error(f"Error en cleanup_devices: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/dispositivos/ensure", methods=["POST"])
def ensure_device():
    """Auto-crea o asigna una terminal al usuario de acuerdo con los límites de su plan y arranca el bridge."""
    data = request.get_json(silent=True) or {}
    try:
        user_id = int(data.get("user_id") or request.args.get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    tipo = str(data.get("tipo") or "").strip().lower()

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Obtener límite de dispositivos del plan del usuario y si permite Cloud API
        cursor.execute(
            """
            SELECT p.max_dispositivos, p.permite_cloud_api
            FROM suscripciones s
            INNER JOIN planes p ON p.id = s.plan_id
            WHERE s.usuario_id = %s
            ORDER BY FIELD(s.estado, 'activa', 'prueba', 'vencida', 'cancelada'), s.fecha_vencimiento DESC, s.id DESC
            LIMIT 1
            """,
            (user_id,),
        )
        plan_res = cursor.fetchone()
        max_devices = int(plan_res["max_dispositivos"]) if (plan_res and plan_res.get("max_dispositivos") is not None) else 1
        permite_cloud = bool(plan_res["permite_cloud_api"]) if (plan_res and plan_res.get("permite_cloud_api") is not None) else False

        create_new = data.get("create") or request.args.get("create")
        create_new = str(create_new).lower() in ("true", "1", "yes")

        device_id = None

        if tipo == 'cloud':
            # Validación de canal Cloud API
            if not permite_cloud:
                return jsonify({"success": False, "message": "Tu plan no incluye WhatsApp Cloud API. Mejora tu plan para habilitarlo."}), 400

            # Contar dispositivos Cloud API existentes (color == 'cloud')
            cursor.execute(
                "SELECT COUNT(*) AS total FROM dispositivos WHERE usuario_id = %s AND color = 'cloud'",
                (user_id,)
            )
            cloud_count = cursor.fetchone()["total"]

            if cloud_count >= 1:
                # Si ya tiene una, no se permite crear otra, pero si no se pide crear, devolvemos la existente.
                if create_new:
                    return jsonify({"success": False, "message": "Límite de líneas Cloud API alcanzado (Máximo 1)."}), 400
                cursor.execute(
                    "SELECT id FROM dispositivos WHERE usuario_id = %s AND color = 'cloud' LIMIT 1",
                    (user_id,)
                )
                existing = cursor.fetchone()
                if existing:
                    device_id = existing["id"]
            else:
                if create_new:
                    unique_session_id = f"session_{uuid.uuid4().hex[:8]}"
                    cursor.execute(
                        """
                        INSERT INTO dispositivos (usuario_id, dispositivo_id, nombre, estado, creado_en, color)
                        VALUES (%s, %s, 'WhatsApp Cloud API', 'desconectado', NOW(), 'cloud')
                        """,
                        (user_id, unique_session_id)
                    )
                    conn.commit()
                    device_id = cursor.lastrowid
                    logger.info(f"Creado nuevo dispositivo Cloud API id={device_id} para usuario {user_id}")
                else:
                    return jsonify({"success": False, "message": "No hay dispositivos Cloud API registrados."}), 400
        else:
            # Validación de canales QR (Messenger, Business, qr)
            cursor.execute(
                "SELECT COUNT(*) AS total FROM dispositivos WHERE usuario_id = %s AND (color IS NULL OR color != 'cloud')",
                (user_id,)
            )
            qr_count = cursor.fetchone()["total"]

            if qr_count < max_devices:
                if create_new:
                    unique_session_id = f"session_{uuid.uuid4().hex[:8]}"
                    default_color = tipo if tipo in ('messenger', 'business', 'qr') else 'qr'
                    terminal_name = f"Terminal WhatsApp {qr_count + 1}"
                    cursor.execute(
                        """
                        INSERT INTO dispositivos (usuario_id, dispositivo_id, nombre, estado, creado_en, color)
                        VALUES (%s, %s, %s, 'desconectado', NOW(), %s)
                        """,
                        (user_id, unique_session_id, terminal_name, default_color)
                    )
                    conn.commit()
                    device_id = cursor.lastrowid
                    logger.info(f"Creado nuevo dispositivo QR id={device_id} para usuario {user_id} (Slot {qr_count + 1}/{max_devices})")
                else:
                    cursor.execute(
                        "SELECT id FROM dispositivos WHERE usuario_id = %s AND (color IS NULL OR color != 'cloud') ORDER BY estado != 'conectado' DESC, id ASC LIMIT 1",
                        (user_id,)
                    )
                    existing = cursor.fetchone()
                    if existing:
                        device_id = existing["id"]
            else:
                if create_new:
                    return jsonify({"success": False, "message": "Límite de dispositivos QR alcanzado para tu plan actual."}), 400
                cursor.execute(
                    "SELECT id FROM dispositivos WHERE usuario_id = %s AND (color IS NULL OR color != 'cloud') ORDER BY estado != 'conectado' DESC, id ASC LIMIT 1",
                    (user_id,)
                )
                existing = cursor.fetchone()
                if existing:
                    device_id = existing["id"]

        if not device_id:
            if not create_new:
                return jsonify({
                    "success": True,
                    "device_id": None,
                    "bridge_running": False,
                    "message": "No hay dispositivos registrados para iniciar."
                })
            return jsonify({"success": False, "message": "No se pudo obtener ni crear un dispositivo."}), 400

        # Si el dispositivo está en estado 'tipo_incorrecto', resetearlo a 'desconectado'
        # ya que el usuario está iniciando un nuevo proceso de vinculación.
        cursor.execute("SELECT estado FROM dispositivos WHERE id = %s LIMIT 1", (device_id,))
        dev_status = cursor.fetchone()
        if dev_status and dev_status.get("estado") == "tipo_incorrecto":
            cursor.execute(
                "UPDATE dispositivos SET estado = 'desconectado', codigo_qr = NULL, session_auth = NULL WHERE id = %s",
                (device_id,)
            )
            conn.commit()

        # Los dispositivos de WhatsApp Cloud API NO necesitan bridge local
        if tipo == 'cloud':
            return jsonify({
                "success": True,
                "device_id": device_id,
                "bridge_running": False,
            })

        # Arrancar bridge para esta terminal si no está corriendo
        bridge_running = is_bridge_running(device_id)
        if not bridge_running:
            start_whatsapp_bridge(user_id, device_id)
            bridge_running = True

        return jsonify({
            "success": True,
            "device_id": device_id,
            "bridge_running": bridge_running,
        })
    except Exception as e:
        logger.error(f"Error en ensure_device: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/dispositivos/<int:device_id>/qr", methods=["GET"])
def get_device_qr(device_id):
    requested_user_id = request.args.get("user_id") or request.headers.get("X-User-Id")

    try:
        user_id = int(requested_user_id)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario requerido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT id, usuario_id, nombre, numero_telefono, estado, codigo_qr, color, conectado_en, creado_en FROM dispositivos WHERE id = %s AND usuario_id = %s LIMIT 1",
            (device_id, user_id),
        )
        device = cursor.fetchone()

        if not device:
            return jsonify({"success": False, "message": "Dispositivo no encontrado"}), 404

        # Si ya está conectado, retornar estado directamente
        # Si es un dispositivo de WhatsApp Cloud API, siempre está conectado
        if device.get("color") == "cloud":
            if device.get("estado") != "conectado":
                cursor.execute("UPDATE dispositivos SET estado = 'conectado' WHERE id = %s", (device_id,))
                conn.commit()
            return jsonify({
                "success": True,
                "device": {
                    "id": device["id"],
                    "nombre": device.get("nombre") or "WhatsApp Cloud API",
                    "numero_telefono": device.get("numero_telefono"),
                    "estado": "conectado",
                    "codigo_qr": None,
                    "color": "cloud",
                    "conectado_en": as_json_value(device.get("conectado_en")),
                    "creado_en": as_json_value(device.get("creado_en")),
                },
            })

        if device.get("estado") == "conectado":
            return jsonify({
                "success": True,
                "device": {
                    "id": device["id"],
                    "nombre": device.get("nombre") or "Mi WhatsApp",
                    "numero_telefono": device.get("numero_telefono"),
                    "estado": "conectado",
                    "codigo_qr": None,
                    "color": device.get("color") or "qr",
                    "conectado_en": as_json_value(device.get("conectado_en")),
                    "creado_en": as_json_value(device.get("creado_en")),
                },
            })

        # Si el bridge no está corriendo, arrancarlo (excepto si el estado es tipo_incorrecto)
        if device.get("estado") != "tipo_incorrecto" and not is_bridge_running(device_id):
            start_whatsapp_bridge(user_id, device_id)

        # Retornar el estado actual inmediatamente (el frontend tiene su propio polling cada 3s)
        # El loop de espera bloqueante fue eliminado porque causaba retrasos de hasta 30 segundos
        return jsonify({
            "success": True,
            "device": {
                "id": device["id"],
                "nombre": device.get("nombre") or "Mi WhatsApp",
                "numero_telefono": device.get("numero_telefono"),
                "estado": device.get("estado") or "desconectado",
                "codigo_qr": device.get("codigo_qr"),
                "color": device.get("color") or "qr",
                "conectado_en": as_json_value(device.get("conectado_en")),
                "creado_en": as_json_value(device.get("creado_en")),
            },
        })

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/dispositivos/<int:device_id>/disconnect", methods=["POST"])
def disconnect_device(device_id):
    """Detiene el bridge de Node.js, limpia credenciales y pone el estado en desconectado."""
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id") or request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "user_id es requerido"}), 400

    conn = None
    cursor = None
    try:
        # 1. Matar el proceso del bridge
        stop_whatsapp_bridge(device_id)

        # 2. Limpiar sesión en la base de datos
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            """
            UPDATE dispositivos
            SET session_auth = NULL, codigo_qr = NULL, estado = 'desconectado'
            WHERE id = %s AND usuario_id = %s
            """,
            (device_id, user_id)
        )
        conn.commit()

        logger.info(f"Dispositivo id={device_id} desconectado y bridge apagado por usuario={user_id}")
        return jsonify({"success": True, "message": "Dispositivo desconectado correctamente."})
    except Exception as e:
        logger.error(f"Error al desconectar dispositivo {device_id}: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/dispositivos/<int:device_id>", methods=["PUT", "POST"])
def update_device(device_id):
    """Actualiza el nombre, color y credenciales de Meta de un dispositivo."""
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id") or request.args.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "user_id es requerido"}), 400

    nombre = data.get("nombre")
    color = data.get("color")
    meta_access_token = data.get("meta_access_token")
    meta_phone_number_id = data.get("meta_phone_number_id")
    meta_waba_id = data.get("meta_waba_id")

    display_phone = None
    if color == 'cloud' and meta_phone_number_id and meta_access_token:
        try:
            import urllib.request as _urllib_req
            import json
            meta_url = f"https://graph.facebook.com/v18.0/{meta_phone_number_id}"
            headers = {"Authorization": f"Bearer {meta_access_token}"}
            req = _urllib_req.Request(meta_url, headers=headers)
            with _urllib_req.urlopen(req, timeout=10) as res:
                res_data = json.loads(res.read().decode())
                display_phone = res_data.get("display_phone_number")
                if display_phone:
                    display_phone = display_phone.replace("+", "").replace(" ", "").replace("-", "")
        except Exception as meta_err:
            logger.error(f"Error obteniendo display_phone_number de Meta: {meta_err}")

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()

        # Primero verificar que el dispositivo pertenezca al usuario y obtener su color y credenciales actuales
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, color, meta_phone_number_id FROM dispositivos WHERE id = %s AND usuario_id = %s LIMIT 1", (device_id, user_id))
        dev_row = cursor.fetchone()
        if not dev_row:
            return jsonify({"success": False, "message": "Dispositivo no encontrado o no pertenece a este usuario."}), 404

        # Determinar si es un dispositivo de tipo Cloud API
        is_cloud = False
        if dev_row.get("color") == "cloud" or dev_row.get("meta_phone_number_id") is not None or color == "cloud" or meta_phone_number_id:
            is_cloud = True

        final_color = "cloud" if is_cloud else color
        
        # Volver a crear cursor estándar para la escritura
        cursor.close()
        cursor = conn.cursor()

        cursor.execute(
            """
            UPDATE dispositivos
            SET nombre = COALESCE(%s, nombre), 
                color = %s,
                meta_access_token = COALESCE(%s, meta_access_token),
                meta_phone_number_id = COALESCE(%s, meta_phone_number_id),
                meta_waba_id = COALESCE(%s, meta_waba_id),
                estado = CASE WHEN %s = 'cloud' THEN 'conectado' ELSE estado END,
                numero_telefono = COALESCE(%s, numero_telefono)
            WHERE id = %s AND usuario_id = %s
            """,
            (nombre, final_color, meta_access_token, meta_phone_number_id, meta_waba_id, final_color, display_phone, device_id, user_id)
        )
        conn.commit()
        logger.info(f"Dispositivo id={device_id} actualizado con credenciales de Meta por usuario={user_id}")
        return jsonify({"success": True, "message": "Dispositivo actualizado correctamente."})
    except Exception as e:
        logger.error(f"Error al actualizar dispositivo {device_id}: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/dispositivos/<int:device_id>", methods=["DELETE"])
def delete_device(device_id):
    """Detiene el bridge de Node.js, elimina el dispositivo de la base de datos y libera la ranura."""
    user_id = request.args.get("user_id") or request.get_json(silent=True) or {}
    if isinstance(user_id, dict):
        user_id = user_id.get("user_id")

    if not user_id:
        return jsonify({"success": False, "message": "user_id es requerido"}), 400

    conn = None
    cursor = None
    try:
        # 1. Detener el proceso del bridge por seguridad
        try:
            stop_whatsapp_bridge(device_id)
        except Exception as e:
            logger.warning(f"No se pudo detener el bridge para dispositivo {device_id}: {e}")

        # 2. Eliminar el registro físico
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute(
            "DELETE FROM dispositivos WHERE id = %s AND usuario_id = %s",
            (device_id, user_id)
        )
        conn.commit()

        logger.info(f"Dispositivo id={device_id} eliminado de la base de datos por usuario={user_id}")
        return jsonify({"success": True, "message": "Dispositivo eliminado y ranura liberada correctamente."})
    except Exception as e:
        logger.error(f"Error al eliminar dispositivo {device_id}: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/contacts/import/template", methods=["GET"])
def get_contacts_import_template():
    output = io.StringIO()
    output.write("sep=,\n")
    writer = csv.writer(output)
    writer.writerow(["Nombre", "Telefono", "Correo", "Empresa"])
    writer.writerow(["Juan Perez", "593900000001", "juan@ejemplo.com", "Empresa ABC"])
    writer.writerow(["Maria Lopez", "593900000002", "maria@ejemplo.com", "Servicios XYZ"])
    
    response = Response(output.getvalue().encode("utf-8-sig"), mimetype="text/csv")
    response.headers["Content-Disposition"] = "attachment; filename=plantilla_contactos.csv"
    return response


@app.route("/api/contacts/<int:user_id>/import", methods=["POST"])
def import_contacts(user_id):
    user_id = resolve_owner_by_id(user_id)
    device_id = request.form.get("device_id") or request.args.get("device_id")
    if not device_id:
        return jsonify({"success": False, "message": "Dispositivo (device_id) requerido"}), 400
        
    try:
        device_id_int = int(device_id)
    except ValueError:
        return jsonify({"success": False, "message": "device_id inválido"}), 400

    if "file" not in request.files:
        return jsonify({"success": False, "message": "No se subió ningún archivo"}), 400
        
    file = request.files["file"]
    if file.filename == "":
        return jsonify({"success": False, "message": "Nombre de archivo vacío"}), 400

    tag_ids_raw = request.form.get("tag_ids") or ""
    tag_ids = []
    if tag_ids_raw:
        try:
            tag_ids = [int(t) for t in tag_ids_raw.split(",") if t.strip()]
        except ValueError:
            pass

    try:
        stream = io.StringIO(file.stream.read().decode("utf-8-sig"), newline=None)
        csv_reader = csv.reader(stream)
    except Exception as e:
        return jsonify({"success": False, "message": f"Error al leer archivo: {e}"}), 400

    try:
        headers = next(csv_reader)
        if len(headers) == 1 and headers[0].strip().lower().startswith("sep="):
            headers = next(csv_reader)
    except StopIteration:
        return jsonify({"success": False, "message": "El archivo CSV está vacío"}), 400

    headers_clean = [h.strip().lower() for h in headers]
    
    phone_idx = -1
    name_idx = -1
    email_idx = -1
    company_idx = -1

    for idx, h in enumerate(headers_clean):
        if any(term in h for term in ["tel", "phone", "num"]):
            phone_idx = idx
        elif any(term in h for term in ["nom", "name"]):
            name_idx = idx
        elif any(term in h for term in ["corr", "email", "mail"]):
            email_idx = idx
        elif any(term in h for term in ["emp", "comp"]):
            company_idx = idx

    if phone_idx == -1:
        return jsonify({
            "success": False, 
            "message": "No se encontró la columna de teléfono. Asegúrate de incluir una cabecera con la palabra 'Teléfono' o 'Phone'."
        }), 400

    conn = None
    cursor = None
    imported_count = 0
    updated_count = 0
    errors = []

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM dispositivos WHERE id = %s AND usuario_id = %s LIMIT 1", (device_id_int, user_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "El dispositivo no pertenece a este usuario o no existe"}), 403

        select_query = "SELECT id FROM contactos WHERE dispositivo_id = %s AND jid = %s LIMIT 1"
        
        insert_query = """
            INSERT INTO contactos (
                dispositivo_id, jid, telefono, nombre, correo, empresa, creado_en, actualizado_en
            )
            VALUES (%s, %s, %s, %s, %s, %s, NOW(), NOW())
        """
        
        update_query = """
            UPDATE contactos
            SET telefono = %s, nombre = COALESCE(%s, nombre), correo = COALESCE(%s, correo), empresa = COALESCE(%s, empresa), actualizado_en = NOW()
            WHERE id = %s
        """

        insert_tag_query = """
            INSERT IGNORE INTO contactos_tags (contacto_id, tag_id)
            VALUES (%s, %s)
        """

        row_num = 1
        for row in csv_reader:
            row_num += 1
            if not row or all(not val.strip() for val in row):
                continue

            phone_raw = row[phone_idx] if len(row) > phone_idx else ""
            phone = normalize_phone_digits(phone_raw)
            if not phone:
                errors.append(f"Fila {row_num}: Teléfono vacío o inválido ('{phone_raw}')")
                continue
        
            if len(phone) == 9 and not phone.startswith("593"):
                phone = f"593{phone}"
            elif phone.startswith("0") and len(phone) == 10:
                phone = f"593{phone[1:]}"

            if len(phone) < 8 or len(phone) > 15:
                errors.append(f"Fila {row_num}: El número '{phone_raw}' no es un número de WhatsApp válido (debe tener entre 8 y 15 dígitos).")
                continue

            jid = f"{phone}@s.whatsapp.net"
            name = (row[name_idx].strip() if (name_idx != -1 and len(row) > name_idx) else None) or None
            email = (row[email_idx].strip() if (email_idx != -1 and len(row) > email_idx) else None) or None
            company = (row[company_idx].strip() if (company_idx != -1 and len(row) > company_idx) else None) or None

            cursor.execute(select_query, (device_id_int, jid))
            existing_contact = cursor.fetchone()

            contact_id = None
            if existing_contact:
                contact_id = existing_contact["id"]
                cursor.execute(update_query, (phone, name, email, company, contact_id))
                updated_count += 1
            else:
                if check_mac_limit_exceeded(cursor, device_id_int):
                    errors.append(f"Fila {row_num}: Límite de MAC alcanzado en tu plan. No se pueden registrar más contactos nuevos.")
                    continue
                cursor.execute(insert_query, (device_id_int, jid, phone, name, email, company))
                contact_id = cursor.lastrowid
                imported_count += 1

            chat_name = name or phone
            cursor.execute(
                """
                INSERT INTO chats (dispositivo_id, jid, tipo, nombre, mensajes_sin_leer, ultimo_mensaje, ultimo_mensaje_fecha, last_timestamp, last_media_type, creado_en, actualizado_en)
                VALUES (%s, %s, 'contacto', %s, 0, '[Contacto Importado]', NOW(), UNIX_TIMESTAMP(NOW()), 'texto', NOW(), NOW())
                ON DUPLICATE KEY UPDATE
                    nombre = COALESCE(VALUES(nombre), nombre),
                    actualizado_en = NOW()
                """,
                (device_id_int, jid, chat_name)
            )

            if contact_id and tag_ids:
                for tag_id in tag_ids:
                    cursor.execute(insert_tag_query, (contact_id, tag_id))

        conn.commit()
        return jsonify({
            "success": True,
            "message": f"Importación completada. Creados: {imported_count}, Actualizados: {updated_count}",
            "imported": imported_count,
            "updated": updated_count,
            "errors": errors
        })

    except mysql.connector.Error as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    except Exception as e:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/contacts/<int:user_id>", methods=["GET"])
def get_contacts(user_id):
    user_id = resolve_owner_by_id(user_id)
    search = (request.args.get("q") or "").strip()
    estado = (request.args.get("estado") or "").strip()
    dispositivo_id = (request.args.get("dispositivo_id") or "").strip()
    
    # Nuevos parámetros de filtrado avanzado
    tag_ids_raw = (request.args.get("tag_ids") or "").strip()
    tag_op = (request.args.get("tag_op") or "any").strip().lower()
    country = (request.args.get("country") or "").strip()
    field_id = (request.args.get("field_id") or "").strip()
    field_value = (request.args.get("field_value") or "").strip()
    date_range = (request.args.get("date_range") or "").strip().lower()
    date_start = (request.args.get("date_start") or "").strip()
    date_end = (request.args.get("date_end") or "").strip()

    try:
        page = max(int(request.args.get("page", 1) or 1), 1)
        limit = min(max(int(request.args.get("limit", 25) or 25), 1), 100)
    except ValueError:
        return jsonify({"success": False, "message": "Parametros de paginacion invalidos"}), 400
    offset = (page - 1) * limit

    where_parts = [
        "d.usuario_id = %s",
        "c.jid NOT LIKE '%%@lid'",   # excluir duplicados LID de WhatsApp multi-device
    ]
    params = [user_id]

    if search:
        like_search = f"%{search}%"
        where_parts.append(
            """
            (
                c.nombre LIKE %s OR c.telefono LIKE %s OR c.correo LIKE %s OR
                c.empresa LIKE %s OR c.jid LIKE %s OR c.push_name LIKE %s OR
                c.verified_name LIKE %s OR c.notify_name LIKE %s OR c.ultimo_mensaje LIKE %s
            )
            """
        )
        params.extend([like_search] * 9)

    if estado and estado != "todos":
        where_parts.append("c.estado_lead = %s")
        params.append(estado)

    if dispositivo_id:
        where_parts.append("c.dispositivo_id = %s")
        params.append(dispositivo_id)

    # Filtrar por Tags (Etiquetas)
    if tag_ids_raw:
        try:
            tag_ids = [int(tid) for tid in tag_ids_raw.split(",") if tid.strip()]
            if tag_ids:
                placeholders = ",".join(["%s"] * len(tag_ids))
                if tag_op == "all":
                    where_parts.append(f"""
                        c.id IN (
                            SELECT contacto_id FROM contactos_tags 
                            WHERE tag_id IN ({placeholders})
                            GROUP BY contacto_id
                            HAVING COUNT(DISTINCT tag_id) = %s
                        )
                    """)
                    params.extend(tag_ids)
                    params.append(len(tag_ids))
                elif tag_op == "none":
                    where_parts.append(f"c.id NOT IN (SELECT contacto_id FROM contactos_tags WHERE tag_id IN ({placeholders}))")
                    params.extend(tag_ids)
                else: # any
                    where_parts.append(f"c.id IN (SELECT contacto_id FROM contactos_tags WHERE tag_id IN ({placeholders}))")
                    params.extend(tag_ids)
        except ValueError:
            pass

    # Filtrar por País (Prefijo telefónico)
    if country:
        where_parts.append("c.telefono LIKE %s")
        params.append(f"{country}%")

    # Filtrar por Campos Personalizados
    if field_id and field_value:
        try:
            fid = int(field_id)
            where_parts.append("""
                c.id IN (
                    SELECT contacto_id FROM contacto_campos_customizados 
                    WHERE campo_id = %s AND valor LIKE %s
                )
            """)
            params.extend([fid, f"%{field_value}%"])
        except ValueError:
            pass

    # Filtrar por Fecha de Creación
    if date_range:
        if date_range == "hoy":
            where_parts.append("c.creado_en >= CURDATE()")
        elif date_range == "3_dias":
            where_parts.append("c.creado_en >= NOW() - INTERVAL 3 DAY")
        elif date_range == "7_dias":
            where_parts.append("c.creado_en >= NOW() - INTERVAL 7 DAY")
        elif date_range == "14_dias":
            where_parts.append("c.creado_en >= NOW() - INTERVAL 14 DAY")
        elif date_range == "30_dias":
            where_parts.append("c.creado_en >= NOW() - INTERVAL 30 DAY")
        elif date_range == "custom" and date_start and date_end:
            where_parts.append("c.creado_en >= %s AND c.creado_en <= %s")
            params.extend([f"{date_start} 00:00:00", f"{date_end} 23:59:59"])

    where_sql = " AND ".join(where_parts)
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        cursor.execute(
            f"""
            SELECT COUNT(*) AS total
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE {where_sql}
            """,
            tuple(params),
        )
        total = int((cursor.fetchone() or {}).get("total") or 0)

        cursor.execute(
            f"""
            SELECT
                c.id,
                c.dispositivo_id,
                d.nombre AS dispositivo_nombre,
                d.estado AS dispositivo_estado,
                c.jid,
                c.telefono,
                c.nombre,
                c.foto_perfil,
                c.correo,
                c.empresa,
                c.estado_lead,
                c.agente_asignado_id,
                da.nombre AS agente_asignado_nombre,
                c.mensajes_sin_leer,
                c.ultimo_mensaje,
                c.ultima_vez_visto,
                c.creado_en,
                c.actualizado_en,
                c.push_name,
                c.verified_name,
                c.notify_name,
                c.last_timestamp,
                c.last_media_type,
                (
                    SELECT GROUP_CONCAT(CONCAT(t.id, '|', t.nombre, '|', t.color) SEPARATOR ';;')
                    FROM tags t
                    JOIN contactos_tags ct ON ct.tag_id = t.id
                    WHERE ct.contacto_id = c.id
                ) AS tags_raw,
                (
                    SELECT GROUP_CONCAT(CONCAT(f.id, '|', f.nombre, '|', COALESCE(v.valor, '')) SEPARATOR ';;')
                    FROM campos_customizados f
                    JOIN contacto_campos_customizados v ON v.campo_id = f.id
                    WHERE v.contacto_id = c.id
                ) AS fields_raw
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            LEFT JOIN usuarios da ON da.id = c.agente_asignado_id
            WHERE {where_sql}
            ORDER BY
                COALESCE(c.last_timestamp, 0) DESC,
                c.actualizado_en DESC,
                c.id DESC
            LIMIT %s OFFSET %s
            """,
            tuple(params + [limit, offset]),
        )

        contacts = [serialize_contact(row) for row in cursor.fetchall()]

        return jsonify(
            {
                "success": True,
                "contacts": contacts,
                "pagination": {
                    "page": page,
                    "limit": limit,
                    "total": total,
                    "total_pages": max((total + limit - 1) // limit, 1) if limit else 1,
                },
            }
        )

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/contacts/<int:contact_id>", methods=["DELETE"])
def delete_contact(contact_id):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute("SELECT id FROM contactos WHERE id = %s", (contact_id,))
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "message": "El contacto no existe"}), 404
            
        cursor.execute("DELETE FROM contactos_tags WHERE contacto_id = %s", (contact_id,))
        cursor.execute("DELETE FROM contacto_campos_customizados WHERE contacto_id = %s", (contact_id,))
        cursor.execute("DELETE FROM notas WHERE contacto_id = %s", (contact_id,))
        cursor.execute("DELETE FROM participantes_grupo WHERE contacto_id = %s", (contact_id,))
        cursor.execute("DELETE FROM contactos WHERE id = %s", (contact_id,))
        
        conn.commit()
        return jsonify({"success": True, "message": "Contacto eliminado con éxito"}), 200
        
    except Exception as e:
        if conn:
            conn.rollback()
        logger.error(f"Error al eliminar contacto {contact_id}: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/contacts/<int:user_id>/export", methods=["POST"])
@jwt_required(optional=True)
def export_contacts_data(user_id):
    user_id = resolve_owner_by_id(user_id)
    req_body = request.get_json(silent=True) or {}
    selected_fields = req_body.get("fields", [])

    search = (request.args.get("q") or "").strip()
    estado = (request.args.get("estado") or "").strip()
    dispositivo_id = (request.args.get("dispositivo_id") or "").strip()
    
    tag_ids_raw = (request.args.get("tag_ids") or "").strip()
    tag_op = (request.args.get("tag_op") or "any").strip().lower()
    country = (request.args.get("country") or "").strip()
    field_id = (request.args.get("field_id") or "").strip()
    field_value = (request.args.get("field_value") or "").strip()
    date_range = (request.args.get("date_range") or "").strip().lower()
    date_start = (request.args.get("date_start") or "").strip()
    date_end = (request.args.get("date_end") or "").strip()

    where_parts = [
        "d.usuario_id = %s",
        "c.jid NOT LIKE '%%@lid'",
    ]
    params = [user_id]

    if search:
        like_search = f"%{search}%"
        where_parts.append(
            """
            (
                c.nombre LIKE %s OR c.telefono LIKE %s OR c.correo LIKE %s OR
                c.empresa LIKE %s OR c.jid LIKE %s OR c.push_name LIKE %s OR
                c.verified_name LIKE %s OR c.notify_name LIKE %s OR c.ultimo_mensaje LIKE %s
            )
            """
        )
        params.extend([like_search] * 9)

    if estado and estado != "todos":
        where_parts.append("c.estado_lead = %s")
        params.append(estado)

    if dispositivo_id:
        where_parts.append("c.dispositivo_id = %s")
        params.append(dispositivo_id)

    if tag_ids_raw:
        try:
            tag_ids = [int(tid) for tid in tag_ids_raw.split(",") if tid.strip()]
            if tag_ids:
                placeholders = ",".join(["%s"] * len(tag_ids))
                if tag_op == "all":
                    where_parts.append(f"""
                        c.id IN (
                            SELECT contacto_id FROM contactos_tags 
                            WHERE tag_id IN ({placeholders})
                            GROUP BY contacto_id
                            HAVING COUNT(DISTINCT tag_id) = %s
                        )
                    """)
                    params.extend(tag_ids)
                    params.append(len(tag_ids))
                elif tag_op == "none":
                    where_parts.append(f"c.id NOT IN (SELECT contacto_id FROM contactos_tags WHERE tag_id IN ({placeholders}))")
                    params.extend(tag_ids)
                else:
                    where_parts.append(f"c.id IN (SELECT contacto_id FROM contactos_tags WHERE tag_id IN ({placeholders}))")
                    params.extend(tag_ids)
        except ValueError:
            pass

    if country:
        where_parts.append("c.telefono LIKE %s")
        params.append(f"{country}%")

    if field_id and field_value:
        try:
            fid = int(field_id)
            where_parts.append("""
                c.id IN (
                    SELECT contacto_id FROM contacto_campos_customizados 
                    WHERE campo_id = %s AND valor LIKE %s
                )
            """)
            params.extend([fid, f"%{field_value}%"])
        except ValueError:
            pass

    if date_range:
        if date_range == "hoy":
            where_parts.append("c.creado_en >= CURDATE()")
        elif date_range == "3_dias":
            where_parts.append("c.creado_en >= NOW() - INTERVAL 3 DAY")
        elif date_range == "7_dias":
            where_parts.append("c.creado_en >= NOW() - INTERVAL 7 DAY")
        elif date_range == "14_dias":
            where_parts.append("c.creado_en >= NOW() - INTERVAL 14 DAY")
        elif date_range == "30_dias":
            where_parts.append("c.creado_en >= NOW() - INTERVAL 30 DAY")
        elif date_range == "custom" and date_start and date_end:
            where_parts.append("c.creado_en >= %s AND c.creado_en <= %s")
            params.extend([f"{date_start} 00:00:00", f"{date_end} 23:59:59"])

    where_sql = " AND ".join(where_parts)

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        custom_fields = []
        if "campos" in selected_fields:
            cursor.execute("SELECT id, nombre FROM campos_customizados WHERE usuario_id = %s ORDER BY id ASC", (user_id,))
            custom_fields = cursor.fetchall()

        cursor.execute(
            f"""
            SELECT
                c.id,
                c.nombre,
                c.telefono,
                c.correo,
                c.creado_en,
                (
                    SELECT GROUP_CONCAT(t.nombre SEPARATOR ', ')
                    FROM tags t
                    JOIN contactos_tags ct ON ct.tag_id = t.id
                    WHERE ct.contacto_id = c.id
                ) AS tags_str,
                (
                    SELECT GROUP_CONCAT(CONCAT(v.campo_id, ':', v.valor) SEPARATOR ';;')
                    FROM contacto_campos_customizados v
                    WHERE v.contacto_id = c.id
                ) AS fields_raw
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE {where_sql}
            ORDER BY c.nombre ASC, c.id DESC
            """,
            tuple(params)
        )
        rows = cursor.fetchall()

        import csv
        import io
        
        output = io.StringIO()
        output.write('\ufeff')
        
        writer = csv.writer(output, delimiter=';', quotechar='"', quoting=csv.QUOTE_MINIMAL)

        headers = []
        if "nombre" in selected_fields: headers.append("Nombre")
        if "telefono" in selected_fields: headers.append("Telefono")
        if "correo" in selected_fields: headers.append("Correo electronico")
        if "pais" in selected_fields: headers.append("Codigo de pais")
        if "creacion" in selected_fields: headers.append("Fecha de creacion")
        if "tags" in selected_fields: headers.append("Tags")
        
        for cf in custom_fields:
            headers.append(cf["nombre"])
        
        writer.writerow(headers)

        for row in rows:
            line_row = []
            
            if "nombre" in selected_fields:
                line_row.append(row["nombre"] or "Sin nombre")
                
            if "telefono" in selected_fields:
                line_row.append(f"+{row['telefono']}" if row["telefono"] else "")
                
            if "correo" in selected_fields:
                line_row.append(row["correo"] or "")
                
            if "pais" in selected_fields:
                tel = row["telefono"] or ""
                prefix = ""
                if tel:
                    if tel.startswith("593"): prefix = "593 (Ecuador)"
                    elif tel.startswith("57"): prefix = "57 (Colombia)"
                    elif tel.startswith("52"): prefix = "52 (México)"
                    elif tel.startswith("34"): prefix = "34 (España)"
                    elif tel.startswith("51"): prefix = "51 (Perú)"
                    elif tel.startswith("54"): prefix = "54 (Argentina)"
                    elif tel.startswith("56"): prefix = "56 (Chile)"
                    elif tel.startswith("58"): prefix = "58 (Venezuela)"
                    elif tel.startswith("502"): prefix = "502 (Guatemala)"
                    elif tel.startswith("503"): prefix = "503 (El Salvador)"
                    elif tel.startswith("504"): prefix = "504 (Honduras)"
                    elif tel.startswith("505"): prefix = "505 (Nicaragua)"
                    elif tel.startswith("506"): prefix = "506 (Costa Rica)"
                    elif tel.startswith("507"): prefix = "507 (Panamá)"
                    elif tel.startswith("591"): prefix = "591 (Bolivia)"
                    elif tel.startswith("595"): prefix = "595 (Paraguay)"
                    elif tel.startswith("598"): prefix = "598 (Uruguay)"
                    elif tel.startswith("1"): prefix = "1 (USA/Canada)"
                    else: prefix = tel[:3]
                line_row.append(prefix)

            if "creacion" in selected_fields:
                val_dt = row.get("creado_en")
                if val_dt:
                    if hasattr(val_dt, "strftime"):
                        line_row.append(val_dt.strftime("%Y-%m-%d %H:%M:%S"))
                    else:
                        line_row.append(str(val_dt))
                else:
                    line_row.append("")
                
            if "tags" in selected_fields:
                line_row.append(row["tags_str"] or "")

            if custom_fields:
                fields_dict = {}
                f_raw = row["fields_raw"] or ""
                if f_raw:
                    for item in f_raw.split(";;"):
                        if ":" in item:
                            parts = item.split(":", 1)
                            fields_dict[parts[0]] = parts[1]
                
                for cf in custom_fields:
                    val = fields_dict.get(str(cf["id"]), "")
                    line_row.append(val)

            writer.writerow(line_row)

        output.seek(0)
        from flask import Response
        return Response(
            output.getvalue(),
            mimetype="text/csv",
            headers={"Content-disposition": "attachment; filename=reporte_contactos.csv"}
        )

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# --- ACTUALIZAR CONTACTO ---
@app.route('/api/contacts/<int:user_id>/<int:contact_id>', methods=['PUT'])
def update_contact_basic(user_id, contact_id):
    user_id = resolve_owner_by_id(user_id)
    data = request.json
    nombre = data.get('nombre')
    correo = data.get('correo')
    empresa = data.get('empresa')
    estado_lead = data.get('estado_lead', 'nuevo')
    agente_asignado_id = data.get('agente_asignado_id')
    if not agente_asignado_id or agente_asignado_id == 'null' or str(agente_asignado_id).strip() == '':
        agente_asignado_id = None
    else:
        try:
            agente_asignado_id = int(agente_asignado_id)
        except ValueError:
            agente_asignado_id = None

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE contactos 
            SET nombre = %s, correo = %s, empresa = %s, estado_lead = %s, agente_asignado_id = %s, actualizado_en = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (nombre, correo, empresa, estado_lead, agente_asignado_id, contact_id))
        conn.commit()
        return jsonify({"success": True, "message": "Contacto actualizado correctamente"})
    except Exception as e:
        logger.error(f"Error actualizando contacto: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

# --- RUTAS DETALLE CONTACTO (TAGS Y CAMPOS) ---

@app.route('/api/contacts/<int:contact_id>/details', methods=['GET'])
def get_contact_details(contact_id):
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_contact_custom_tables(cursor)
        ensure_tags_tables(cursor)
        
        # Obtener tags del contacto
        cursor.execute("""
            SELECT t.* 
            FROM tags t
            JOIN contactos_tags ct ON ct.tag_id = t.id
            WHERE ct.contacto_id = %s
        """, (contact_id,))
        contact_tags = cursor.fetchall()
        
        # Obtener valores de campos customizados
        cursor.execute("""
            SELECT f.id, f.nombre, f.tipo, v.valor
            FROM campos_customizados f
            LEFT JOIN contacto_campos_customizados v ON v.campo_id = f.id AND v.contacto_id = %s
            WHERE f.usuario_id = (SELECT d.usuario_id FROM contactos c JOIN dispositivos d ON d.id = c.dispositivo_id WHERE c.id = %s)
        """, (contact_id, contact_id))
        custom_fields = cursor.fetchall()
        
        return jsonify({
            "success": True,
            "tags": contact_tags,
            "fields": custom_fields
        })
    except Exception as e:
        logger.error(f"Error obteniendo detalles del contacto: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@app.route('/api/contacts/<int:contact_id>/notes', methods=['GET'])
def get_contact_notes(contact_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("""
            SELECT id, contacto_id, usuario_id, contenido, creado_en
            FROM notas
            WHERE contacto_id = %s AND usuario_id = %s
            ORDER BY creado_en DESC, id DESC
        """, (contact_id, user_id))
        notes = cursor.fetchall()
        return jsonify({
            "success": True,
            "notes": notes,
        })
    except Exception as e:
        logger.error(f"Error obteniendo notas del contacto: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route('/api/contacts/<int:contact_id>/notes', methods=['POST'])
def create_contact_note(contact_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    data = request.get_json(silent=True) or {}
    contenido = (data.get('contenido') or '').strip()

    if not contenido:
        return jsonify({"success": False, "message": "La nota no puede estar vacia"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            INSERT INTO notas (contacto_id, usuario_id, contenido, creado_en)
            VALUES (%s, %s, %s, NOW())
            """,
            (contact_id, user_id, contenido)
        )
        conn.commit()

        note_id = cursor.lastrowid
        cursor.execute("""
            SELECT id, contacto_id, usuario_id, contenido, creado_en
            FROM notas
            WHERE id = %s
        """, (note_id,))
        note = cursor.fetchone()

        return jsonify({
            "success": True,
            "message": "Nota interna guardada",
            "note": note,
        })
    except Exception as e:
        conn.rollback()
        logger.error(f"Error creando nota del contacto: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/tags', methods=['POST'])
@jwt_required()
def create_new_tag():
    user_id = get_jwt_identity()
    data = request.json
    nombre = data.get('nombre')
    color = data.get('color', '#5d5fef')

    if not nombre:
        return jsonify({"success": False, "message": "Nombre requerido"}), 400
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        ensure_tags_tables(cursor)
        cursor.execute(
            "INSERT INTO tags (usuario_id, nombre, color) VALUES (%s, %s, %s)",
            (user_id, nombre, color)
        )
        conn.commit()
        return jsonify({"success": True, "tag_id": cursor.lastrowid})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/campos-customizados', methods=['POST'])
@jwt_required()
def create_new_custom_field():
    role_err = require_admin_role()
    if role_err:
        return role_err
    user_id = get_jwt_identity()
    data = request.json
    nombre = data.get('nombre')
    tipo = data.get('tipo', 'texto')

    if not nombre:
        return jsonify({"success": False, "message": "Nombre requerido"}), 400
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        ensure_contact_custom_tables(cursor)
        cursor.execute(
            "INSERT INTO campos_customizados (usuario_id, nombre, tipo) VALUES (%s, %s, %s)",
            (user_id, nombre, tipo)
        )
        conn.commit()
        return jsonify({"success": True, "campo_id": cursor.lastrowid})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/contacts/<int:contact_id>/tags', methods=['POST'])
def add_contact_tag(contact_id):
    data = request.json
    tag_id = data.get('tag_id')
    if not tag_id:
        return jsonify({"success": False, "message": "tag_id requerido"}), 400
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        ensure_tags_tables(cursor)
        cursor.execute(
            "INSERT IGNORE INTO contactos_tags (contacto_id, tag_id) VALUES (%s, %s)",
            (contact_id, tag_id)
        )
        conn.commit()

        # Obtener el user_id del contacto para disparar automatizaciones
        cursor.execute("""
            SELECT d.usuario_id 
            FROM contactos c 
            JOIN dispositivos d ON c.dispositivo_id = d.id 
            WHERE c.id = %s 
            LIMIT 1
        """, (contact_id,))
        contact_user_row = cursor.fetchone()
        if contact_user_row:
            contact_user_id = contact_user_row[0]
            # Ejecutar el trigger de automatizaciones de etiquetas
            trigger_tag_automations(contact_user_id, contact_id, tag_id)

        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/contacts/<int:contact_id>/tags/<int:tag_id>', methods=['DELETE'])
def remove_contact_tag(contact_id, tag_id):
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM contactos_tags WHERE contacto_id = %s AND tag_id = %s",
            (contact_id, tag_id)
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/contacts/<int:contact_id>/fields', methods=['POST'])
def update_contact_field(contact_id):
    data = request.json
    campo_id = data.get('campo_id')
    valor = data.get('valor')
    
    if not campo_id:
        return jsonify({"success": False, "message": "campo_id requerido"}), 400
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        ensure_contact_custom_tables(cursor)
        cursor.execute("""
            INSERT INTO contacto_campos_customizados (contacto_id, campo_id, valor)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE valor = VALUES(valor)
        """, (contact_id, campo_id, valor))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        conn.close()


@app.route("/api/chats/<jid>/sync", methods=["POST"])
def sync_chat_data(jid):
    import urllib.request as _urllib_req

    user_id = request.args.get("user_id")
    device_id = request.args.get("device_id")

    if not user_id or not device_id:
        return jsonify({"error": "Missing user_id or device_id"}), 400

    try:
        device_id_int = int(device_id)
    except (TypeError, ValueError):
        return jsonify({"error": "device_id inválido"}), 400

    # Evitar lanzar o esperar el bridge si es una línea de WhatsApp Cloud API
    conn_chk = None
    cursor_chk = None
    try:
        conn_chk = get_connection()
        cursor_chk = conn_chk.cursor(dictionary=True)
        cursor_chk.execute("SELECT color FROM dispositivos WHERE id = %s LIMIT 1", (device_id_int,))
        dev_row = cursor_chk.fetchone()
        if dev_row and dev_row.get("color") == "cloud":
            return jsonify({"success": True, "message": "WhatsApp Cloud API no requiere sincronización de bridge"}), 200
    except Exception as db_err:
        logger.error(f"Error checking device color in sync_chat_data: {db_err}")
    finally:
        if cursor_chk: cursor_chk.close()
        if conn_chk: conn_chk.close()

    # El bridge.js levanta un servidor HTTP en 5000 + (deviceId % 1000)
    # Nota: este puerto es DISTINTO al 5000 de Flask.
    bridge_port = 5000 + (device_id_int % 1000)
    bridge_url = f"http://127.0.0.1:{bridge_port}/sync?jid={jid}"

    if not is_bridge_running(device_id_int):
        start_whatsapp_bridge(int(user_id), device_id_int)

    if not wait_for_bridge_port(device_id_int, timeout_seconds=12):
        return jsonify({
            "error": f"El bridge del dispositivo {device_id_int} no termino de iniciar en el puerto {bridge_port}."
        }), 503

    try:
        # Usar GET (el bridge solo comprueba pathname + query, no el método)
        req = _urllib_req.Request(bridge_url, method="GET")
        with _urllib_req.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())
            if is_group_jid(jid):
                bridge_subject = (
                    data.get("subject")
                    or data.get("name")
                    or data.get("group_subject")
                )
                if bridge_subject:
                    conn = get_connection()
                    cursor = conn.cursor()
                    try:
                        ensure_chats_table(cursor)
                        persisted_group_name = persist_group_subject(cursor, device_id_int, jid, bridge_subject)
                        if persisted_group_name:
                            conn.commit()
                            data["subject"] = persisted_group_name
                            data["name"] = persisted_group_name
                    finally:
                        cursor.close()
                        conn.close()
            return jsonify(data), response.status
    except OSError as e:
        # WinError 10061 / ECONNREFUSED: bridge.js no está corriendo
        err_str = str(e)
        if "10061" in err_str or "Connection refused" in err_str or "denegó" in err_str:
            return jsonify({
                "error": (
                    f"El Bridge de WhatsApp no está corriendo en el puerto {bridge_port}. "
                    f"Inícialo con: node bridge.js --user-id={user_id} --device-id={device_id}"
                )
            }), 503
        return jsonify({"error": err_str}), 500
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route("/api/chats/mark-all-read", methods=["POST"])
def mark_all_read():
    data = request.get_json(silent=True) or {}
    user_id = data.get("user_id")
    if not user_id:
        return jsonify({"success": False, "message": "user_id es obligatorio"}), 400
    
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        # Marcar todos los contactos del usuario como leídos
        cursor.execute("""
            UPDATE contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            SET c.mensajes_sin_leer = 0
            WHERE d.usuario_id = %s
        """, (user_id,))
        
        # También en la tabla de chats (sidebar)
        cursor.execute("""
            UPDATE chats ch
            INNER JOIN dispositivos d ON d.id = ch.dispositivo_id
            SET ch.mensajes_sin_leer = 0
            WHERE d.usuario_id = %s
        """, (user_id,))
        
        # También grupos
        cursor.execute("""
            UPDATE grupos g
            INNER JOIN dispositivos d ON d.id = g.dispositivo_id
            SET g.mensajes_sin_leer = 0
            WHERE d.usuario_id = %s
        """, (user_id,))
        
        conn.commit()
        return jsonify({"success": True, "message": "Todos los chats marcados como leidos"})
    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/chats/rename", methods=["POST"])
def rename_chat():
    data = request.get_json(silent=True) or {}
    jid = data.get("jid")
    device_id = data.get("device_id")
    nombre = data.get("nombre")
    
    if not jid or not device_id or not nombre:
        return jsonify({"success": False, "message": "jid, device_id y nombre son obligatorios"}), 400
        
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # 1. Si es un grupo, actualizamos en la tabla de grupos
        if is_group_jid(jid):
            cursor.execute("""
                UPDATE grupos 
                SET nombre = %s, actualizado_en = NOW() 
                WHERE jid = %s AND dispositivo_id = %s
            """, (nombre, jid, device_id))
        else:
            # 2. Si es un contacto, actualizamos en la tabla de contactos
            cursor.execute("""
                UPDATE contactos 
                SET nombre = %s, actualizado_en = NOW() 
                WHERE jid = %s AND dispositivo_id = %s
            """, (nombre, jid, device_id))
            
        # 3. También actualizamos en la tabla de chats para el sidebar
        cursor.execute("""
            UPDATE chats 
            SET nombre = %s, actualizado_en = NOW() 
            WHERE jid = %s AND dispositivo_id = %s
        """, (nombre, jid, device_id))
        
        conn.commit()
        return jsonify({"success": True, "message": "Chat renombrado exitosamente"})
    except Exception as e:
        if conn: conn.rollback()
        logger.error(f"Error al renombrar chat: {e}", exc_info=True)
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route("/api/chats/recent-media", methods=["GET"])
def get_recent_media():
    try:
        media_folder = app.config['UPLOAD_FOLDER']
        files_data = []
        seen_urls = set()
        
        # 1. Escaneo del sistema de archivos
        allowed_subfolders = ['imagenes', 'documentos', 'videos', 'audios']
        if os.path.exists(media_folder):
            for subfolder in allowed_subfolders:
                folder_path = os.path.join(media_folder, subfolder)
                if not os.path.exists(folder_path): continue
                
                for root, dirs, files in os.walk(folder_path):
                    # EXCLUIR carpeta de perfiles estrictamente
                    if 'perfiles' in root:
                        continue
                        
                    for filename in files:
                        if filename.startswith('.') or filename.lower() == 'placeholder.txt': continue
                        
                        filepath = os.path.join(root, filename)
                        # Relativo a MEDIA_FOLDER para la URL
                        rel_path = os.path.relpath(filepath, media_folder).replace('\\', '/')
                        # URL absoluta para evitar problemas de base path
                        url = f"/media/{rel_path}"
                        
                        file_type = "document"
                        if filename.lower().endswith(('.png', '.jpg', '.jpeg', '.webp', '.gif')):
                            file_type = "image"
                        elif filename.lower().endswith(('.mp4', '.avi', '.mov')):
                            file_type = "video"
                        elif filename.lower().endswith(('.mp3', '.ogg', '.wav')):
                            file_type = "audio"
                        
                        files_data.append({
                            "name": filename,
                            "url": url,
                            "type": file_type,
                            "timestamp": os.path.getmtime(filepath)
                        })
                        seen_urls.add(url)
        
        # 2. Búsqueda en la base de datos de mensajes
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            cursor.execute("""
                SELECT texto, url_media, tipo, fecha_mensaje 
                FROM mensajes 
                WHERE url_media IS NOT NULL AND url_media != '' 
                ORDER BY fecha_mensaje DESC LIMIT 40
            """)
            for row in cursor.fetchall():
                raw_url = row['url_media']
                full_url = raw_url if raw_url.startswith('http') else f"{request.host_url.rstrip('/')}/media/{raw_url.lstrip('/')}"
                
                if full_url not in seen_urls:
                    files_data.append({
                        "name": row['texto'] or os.path.basename(full_url) or "Archivo",
                        "url": full_url,
                        "type": "image" if row['tipo'] == 'imagen' else "document",
                        "timestamp": row['fecha_mensaje'].timestamp() if hasattr(row['fecha_mensaje'], 'timestamp') else 0
                    })
                    seen_urls.add(full_url)
        except Exception as db_err:
            logger.error(f"Error consultando DB para media reciente: {db_err}")
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
        
        # Ordenar por más recientes y limitar
        files_data.sort(key=lambda x: x['timestamp'], reverse=True)
        return jsonify({"success": True, "files": files_data[:40]})
    except Exception as e:
        logger.exception("Error en get_recent_media")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route("/api/chats", methods=["GET"])
def get_active_chats():
    requested_user_id = request.args.get("user_id")
    requested_device_id = request.args.get("dispositivo_id")
    search = (request.args.get("q") or "").strip()

    try:
        user_id = resolve_owner_by_id(int(requested_user_id))
        limit = min(max(int(request.args.get("limit", 250) or 250), 1), 500)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id es requerido y limit debe ser entero"}), 400

    dispositivo_id = None
    if requested_device_id and requested_device_id != "all":
        try:
            dispositivo_id = int(requested_device_id)
        except ValueError:
            return jsonify({"success": False, "message": "dispositivo_id debe ser un entero o 'all'"}), 400

    contact_where_parts = [
        "d.usuario_id = %s",
        "(c.jid LIKE '%%@s.whatsapp.net' OR c.jid LIKE '%%@lid')",
        "c.jid NOT LIKE '%%@broadcast'",
        "c.jid NOT LIKE '%%@newsletter'",
        "c.jid NOT IN ('0@s.whatsapp.net', 'status@broadcast', 'announcement@broadcast')",
    ]
    contact_params = [user_id]

    if dispositivo_id is not None:
        contact_where_parts.append("c.dispositivo_id = %s")
        contact_params.append(dispositivo_id)

    # Filtrar chats para agentes/visores: Ver sólo los asignados o sin asignar
    try:
        conn_check = get_connection()
        cur_check = conn_check.cursor(dictionary=True)
        cur_check.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (int(requested_user_id),))
        user_row = cur_check.fetchone()
        cur_check.close(); conn_check.close()
        
        if user_row and user_row.get("rol") in ("agente", "visor"):
            contact_where_parts.append("(c.agente_asignado_id = %s OR c.agente_asignado_id IS NULL)")
            contact_params.append(int(requested_user_id))
    except Exception as e:
        logger.error(f"Error al verificar rol del agente en get_active_chats: {e}")

    contact_where_parts.extend([
        """
        (
            c.jid NOT LIKE '%%@lid'
            OR (
                NULLIF(TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)), '') IS NOT NULL
                AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT REGEXP '^[0-9]+$'
                AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT LIKE '%%@%%'
            )
        )
        """,
        """
        c.id = (
            SELECT c2.id
            FROM contactos c2
            WHERE c2.dispositivo_id = c.dispositivo_id
                AND c2.jid = c.jid
            ORDER BY
                COALESCE(c2.last_timestamp, UNIX_TIMESTAMP(c2.actualizado_en), UNIX_TIMESTAMP(c2.creado_en), 0) DESC,
                c2.id DESC
            LIMIT 1
        )
        """,
        """
        (
            (
                NULLIF(TRIM(COALESCE(
                    NULLIF((
                        SELECT mx.texto
                        FROM mensajes mx
                        WHERE mx.dispositivo_id = c.dispositivo_id
                            AND mx.chat_jid = c.jid
                        ORDER BY mx.fecha_mensaje DESC, mx.id DESC
                        LIMIT 1
                    ), ''),
                    NULLIF((
                        SELECT ch.ultimo_mensaje
                        FROM chats ch
                        WHERE ch.dispositivo_id = c.dispositivo_id
                            AND ch.jid = c.jid
                        LIMIT 1
                    ), ''),
                    NULLIF(c.ultimo_mensaje, '')
                )), '') IS NOT NULL
                AND TRIM(COALESCE(
                    NULLIF((
                        SELECT mx.texto
                        FROM mensajes mx
                        WHERE mx.dispositivo_id = c.dispositivo_id
                            AND mx.chat_jid = c.jid
                        ORDER BY mx.fecha_mensaje DESC, mx.id DESC
                        LIMIT 1
                    ), ''),
                    NULLIF((
                        SELECT ch.ultimo_mensaje
                        FROM chats ch
                        WHERE ch.dispositivo_id = c.dispositivo_id
                            AND ch.jid = c.jid
                        LIMIT 1
                    ), ''),
                    NULLIF(c.ultimo_mensaje, '')
                )) <> 'Mensaje guardado'
            )
            OR COALESCE(
                (
                    SELECT UNIX_TIMESTAMP(mx.fecha_mensaje)
                    FROM mensajes mx
                    WHERE mx.dispositivo_id = c.dispositivo_id
                        AND mx.chat_jid = c.jid
                    ORDER BY mx.fecha_mensaje DESC, mx.id DESC
                    LIMIT 1
                ),
                (
                    SELECT ch.last_timestamp
                    FROM chats ch
                    WHERE ch.dispositivo_id = c.dispositivo_id
                        AND ch.jid = c.jid
                    LIMIT 1
                ),
                c.last_timestamp,
                0
            ) > 0
        )
        """,
    ])

    group_where_parts = [
        "d.usuario_id = %s",
        "g.jid LIKE '%%@g.us'",
        """
        g.id = (
            SELECT g2.id
            FROM grupos g2
            WHERE g2.dispositivo_id = g.dispositivo_id
                AND g2.jid = g.jid
            ORDER BY
                UNIX_TIMESTAMP(g2.actualizado_en) DESC,
                g2.id DESC
            LIMIT 1
        )
        """,
        """
        (
            (
                NULLIF(TRIM(COALESCE(
                    NULLIF((
                        SELECT mx.texto
                        FROM mensajes mx
                        WHERE mx.dispositivo_id = g.dispositivo_id
                            AND mx.chat_jid = g.jid
                        ORDER BY mx.fecha_mensaje DESC, mx.id DESC
                        LIMIT 1
                    ), ''),
                    NULLIF((
                        SELECT ch.ultimo_mensaje
                        FROM chats ch
                        WHERE ch.dispositivo_id = g.dispositivo_id
                            AND ch.jid = g.jid
                        LIMIT 1
                    ), ''),
                    NULLIF(g.ultimo_mensaje, '')
                )), '') IS NOT NULL
                AND TRIM(COALESCE(
                    NULLIF((
                        SELECT mx.texto
                        FROM mensajes mx
                        WHERE mx.dispositivo_id = g.dispositivo_id
                            AND mx.chat_jid = g.jid
                        ORDER BY mx.fecha_mensaje DESC, mx.id DESC
                        LIMIT 1
                    ), ''),
                    NULLIF((
                        SELECT ch.ultimo_mensaje
                        FROM chats ch
                        WHERE ch.dispositivo_id = g.dispositivo_id
                            AND ch.jid = g.jid
                        LIMIT 1
                    ), ''),
                    NULLIF(g.ultimo_mensaje, '')
                )) <> 'Mensaje guardado'
            )
            OR COALESCE(
                (
                    SELECT UNIX_TIMESTAMP(mx.fecha_mensaje)
                    FROM mensajes mx
                    WHERE mx.dispositivo_id = g.dispositivo_id
                        AND mx.chat_jid = g.jid
                    ORDER BY mx.fecha_mensaje DESC, mx.id DESC
                    LIMIT 1
                ),
                (
                    SELECT ch.last_timestamp
                    FROM chats ch
                    WHERE ch.dispositivo_id = g.dispositivo_id
                        AND ch.jid = g.jid
                    LIMIT 1
                ),
                0
            ) > 0
        )
        """,
    ]
    group_params = [user_id]

    if dispositivo_id is not None:
        group_where_parts.insert(1, "g.dispositivo_id = %s")
        group_params.append(dispositivo_id)

    if search:
        like_search = f"%{search}%"
        contact_where_parts.append(
            """
            (
                c.nombre LIKE %s OR c.telefono LIKE %s OR c.correo LIKE %s OR
                c.empresa LIKE %s OR c.jid LIKE %s OR c.push_name LIKE %s OR
                c.verified_name LIKE %s OR c.notify_name LIKE %s OR c.ultimo_mensaje LIKE %s
            )
            """
        )
        contact_params.extend([like_search] * 9)
        group_where_parts.append(
            """
            (
                g.nombre LIKE %s OR g.jid LIKE %s OR g.descripcion LIKE %s OR
                g.ultimo_mensaje LIKE %s OR EXISTS (
                    SELECT 1
                    FROM mensajes ms
                    WHERE ms.dispositivo_id = g.dispositivo_id
                        AND ms.chat_jid = g.jid
                        AND ms.texto LIKE %s
                    LIMIT 1
                )
            )
            """
        )
        group_params.extend([like_search] * 5)

    contact_where_sql = " AND ".join(contact_where_parts)
    group_where_sql = " AND ".join(group_where_parts)
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_chats_table(cursor)

        if dispositivo_id is None:
            device = {"id": "all", "nombre": "Todos los dispositivos", "estado": "conectado"}
        else:
            cursor.execute(
                """
                SELECT id, nombre, estado
                FROM dispositivos
                WHERE id = %s AND usuario_id = %s
                LIMIT 1
                """,
                (dispositivo_id, user_id),
            )
            device = cursor.fetchone()

        if not device:
            return jsonify({"success": False, "message": "Dispositivo no encontrado"}), 404

        cursor.execute(
            f"""
            SELECT
                c.id,
                c.dispositivo_id,
                d.nombre AS dispositivo_nombre,
                d.estado AS dispositivo_estado,
                c.jid,
                c.telefono,
                c.nombre,
                c.foto_perfil,
                c.estado,
                c.correo,
                c.empresa,
                c.estado_lead,
                c.agente_asignado_id,
                da.nombre AS agente_asignado_nombre,
                c.mensajes_sin_leer,
                COALESCE(
                    (
                        SELECT m.es_mio
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ),
                    0
                ) AS ultimo_mensaje_es_mio,
                COALESCE(
                    (
                        SELECT m.estado
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ),
                    0
                ) AS ultimo_mensaje_estado,
                COALESCE(
                    NULLIF((
                        SELECT m.texto
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ), ''),
                    c.ultimo_mensaje,
                    (
                        SELECT ch.ultimo_mensaje
                        FROM chats ch
                        WHERE ch.dispositivo_id = c.dispositivo_id
                            AND ch.jid = c.jid
                        LIMIT 1
                    ),
                    c.ultimo_mensaje
                ) AS ultimo_mensaje,
                COALESCE(
                    (
                    SELECT m.fecha_mensaje
                    FROM mensajes m
                    WHERE m.dispositivo_id = c.dispositivo_id
                        AND m.chat_jid = c.jid
                    ORDER BY m.fecha_mensaje DESC, m.id DESC
                    LIMIT 1
                    ),
                    c.ultima_vez_visto,
                    (
                        SELECT ch.ultimo_mensaje_fecha
                        FROM chats ch
                        WHERE ch.dispositivo_id = c.dispositivo_id
                            AND ch.jid = c.jid
                        LIMIT 1
                    ),
                    c.actualizado_en
                ) AS ultimo_mensaje_fecha,
                c.ultima_vez_visto,
                c.creado_en,
                c.actualizado_en,
                c.push_name,
                c.verified_name,
                c.notify_name,
                c.participants_json,
                c.last_timestamp,
                COALESCE(
                    (
                        SELECT m.tipo
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ),
                    c.last_media_type,
                    (
                        SELECT ch.last_media_type
                        FROM chats ch
                        WHERE ch.dispositivo_id = c.dispositivo_id
                            AND ch.jid = c.jid
                        LIMIT 1
                    ),
                    'texto'
                ) AS last_media_type,
                COALESCE(
                    (
                        SELECT UNIX_TIMESTAMP(m.fecha_mensaje)
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ),
                    c.last_timestamp,
                    (
                        SELECT ch.last_timestamp
                        FROM chats ch
                        WHERE ch.dispositivo_id = c.dispositivo_id
                            AND ch.jid = c.jid
                        LIMIT 1
                    ),
                    UNIX_TIMESTAMP(c.ultima_vez_visto),
                    UNIX_TIMESTAMP(c.actualizado_en),
                    0
                ) AS sort_timestamp,
                (
                    SELECT GROUP_CONCAT(CONCAT(t.id, '|', t.nombre, '|', t.color) SEPARATOR ';;')
                    FROM tags t
                    JOIN contactos_tags ct ON ct.tag_id = t.id
                    WHERE ct.contacto_id = c.id
                ) AS tags_raw
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            LEFT JOIN usuarios da ON da.id = c.agente_asignado_id
            LEFT JOIN chats ch_current
                ON ch_current.dispositivo_id = c.dispositivo_id
                AND ch_current.jid = c.jid
            WHERE {contact_where_sql}
            GROUP BY c.dispositivo_id, c.jid
            ORDER BY
                ultimo_mensaje_fecha DESC,
                sort_timestamp DESC,
                c.actualizado_en DESC,
                c.id DESC
            LIMIT %s
            """,
            tuple(contact_params + [limit]),
        )
        contact_rows = cursor.fetchall()

        group_rows = []

        chats = []
        for row in contact_rows:
            chat = serialize_contact(row)
            chat["ultimo_mensaje_fecha"] = as_json_value(row.get("ultimo_mensaje_fecha"))
            chat["participants_json"] = row.get("participants_json")
            chat["sort_timestamp"] = row.get("sort_timestamp")
            chats.append(chat)

        for row in group_rows:
            chats.append(serialize_group_chat(row))

        chats = dedupe_chats_by_jid(chats)
        chats.sort(key=chat_sort_score, reverse=True)
        chats = chats[:limit]

        return jsonify(
            {
                "success": True,
                "device": {
                    "id": device["id"],
                    "nombre": device.get("nombre") or "Mi WhatsApp",
                    "estado": device.get("estado") or "desconectado",
                },
                "chats": chats,
                "total": len(chats),
            }
        )

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/chats/<int:user_id>", methods=["GET"])
def get_chats(user_id):
    owner_user_id = resolve_owner_by_id(user_id)
    search = (request.args.get("q") or "").strip()
    try:
        limit = min(max(int(request.args.get("limit", 60) or 60), 1), 120)
    except ValueError:
        return jsonify({"success": False, "message": "Limite invalido"}), 400

    where_parts = [
        "d.usuario_id = %s",
        "(c.jid LIKE '%%@s.whatsapp.net' OR c.jid LIKE '%%@lid')",
        "c.jid NOT LIKE '%%@broadcast'",
        "c.jid NOT LIKE '%%@newsletter'",
        "c.jid NOT IN ('0@s.whatsapp.net', 'status@broadcast', 'announcement@broadcast')",
        """
        (
            c.jid NOT LIKE '%%@lid'
            OR (
                NULLIF(TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)), '') IS NOT NULL
                AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT REGEXP '^[0-9]+$'
                AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT LIKE '%%@%%'
            )
        )
        """,
        """
        c.id = (
            SELECT c2.id
            FROM contactos c2
            WHERE c2.dispositivo_id = c.dispositivo_id
                AND c2.jid = c.jid
            ORDER BY
                COALESCE(c2.last_timestamp, UNIX_TIMESTAMP(c2.actualizado_en), UNIX_TIMESTAMP(c2.creado_en), 0) DESC,
                c2.id DESC
            LIMIT 1
        )
        """,
        """
        (
            (
                NULLIF(TRIM(COALESCE(
                    NULLIF((
                        SELECT mx.texto
                        FROM mensajes mx
                        WHERE mx.dispositivo_id = c.dispositivo_id
                            AND mx.chat_jid = c.jid
                        ORDER BY mx.fecha_mensaje DESC, mx.id DESC
                        LIMIT 1
                    ), ''),
                    NULLIF(c.ultimo_mensaje, '')
                )), '') IS NOT NULL
                AND TRIM(COALESCE(
                    NULLIF((
                        SELECT mx.texto
                        FROM mensajes mx
                        WHERE mx.dispositivo_id = c.dispositivo_id
                            AND mx.chat_jid = c.jid
                        ORDER BY mx.fecha_mensaje DESC, mx.id DESC
                        LIMIT 1
                    ), ''),
                    NULLIF(c.ultimo_mensaje, '')
                )) <> 'Mensaje guardado'
            )
            OR COALESCE(
                (
                    SELECT UNIX_TIMESTAMP(mx.fecha_mensaje)
                    FROM mensajes mx
                    WHERE mx.dispositivo_id = c.dispositivo_id
                        AND mx.chat_jid = c.jid
                    ORDER BY mx.fecha_mensaje DESC, mx.id DESC
                    LIMIT 1
                ),
                c.last_timestamp,
                0
            ) > 0
        )
        """,
    ]
    params = [owner_user_id]

    if search:
        like_search = f"%{search}%"
        where_parts.append(
            """
            (
                c.nombre LIKE %s OR c.telefono LIKE %s OR c.correo LIKE %s OR
                c.empresa LIKE %s OR c.jid LIKE %s OR c.push_name LIKE %s OR
                c.verified_name LIKE %s OR c.notify_name LIKE %s OR c.ultimo_mensaje LIKE %s
            )
            """
        )
        params.extend([like_search] * 9)

    where_sql = " AND ".join(where_parts)
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        cursor.execute(
            f"""
            SELECT
                c.id,
                c.dispositivo_id,
                d.nombre AS dispositivo_nombre,
                d.estado AS dispositivo_estado,
                c.jid,
                c.telefono,
                COALESCE(NULLIF(c.nombre, ''), NULLIF(ch_current.nombre, '')) AS nombre,
                c.foto_perfil,
                c.correo,
                c.empresa,
                c.estado_lead,
                c.agente_asignado_id,
                da.nombre AS agente_asignado_nombre,
                c.mensajes_sin_leer,
                COALESCE(
                    (
                        SELECT m.es_mio
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ),
                    0
                ) AS ultimo_mensaje_es_mio,
                COALESCE(
                    (
                        SELECT m.estado
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ),
                    0
                ) AS ultimo_mensaje_estado,
                COALESCE(
                    NULLIF((
                        SELECT m.texto
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ), ''),
                    c.ultimo_mensaje
                ) AS ultimo_mensaje,
                COALESCE(
                    (
                        SELECT m.fecha_mensaje
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ),
                    c.ultima_vez_visto,
                    c.actualizado_en
                ) AS ultimo_mensaje_fecha,
                c.ultima_vez_visto,
                c.creado_en,
                c.actualizado_en,
                c.push_name,
                c.verified_name,
                c.notify_name,
                c.participants_json,
                c.last_timestamp,
                COALESCE(
                    (
                        SELECT m.tipo
                        FROM mensajes m
                        WHERE m.dispositivo_id = c.dispositivo_id
                            AND m.chat_jid = c.jid
                        ORDER BY m.fecha_mensaje DESC, m.id DESC
                        LIMIT 1
                    ),
                    c.last_media_type,
                    'texto'
                ) AS last_media_type,
                (
                    SELECT GROUP_CONCAT(CONCAT(t.id, '|', t.nombre, '|', t.color) SEPARATOR ';;')
                    FROM tags t
                    JOIN contactos_tags ct ON ct.tag_id = t.id
                    WHERE ct.contacto_id = c.id
                ) AS tags_raw
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            LEFT JOIN usuarios da ON da.id = c.agente_asignado_id
            LEFT JOIN chats ch_current
                ON ch_current.dispositivo_id = c.dispositivo_id
                AND ch_current.jid = c.jid
            WHERE {where_sql}
            GROUP BY c.dispositivo_id, c.jid
            ORDER BY
                ultimo_mensaje_fecha DESC,
                COALESCE(c.last_timestamp, UNIX_TIMESTAMP(c.actualizado_en), 0) DESC,
                c.actualizado_en DESC,
                c.id DESC
            LIMIT %s
            """,
            tuple(params + [limit]),
        )

        chats = []
        for row in cursor.fetchall():
            chat = serialize_contact(row)
            chat["ultimo_mensaje_fecha"] = as_json_value(row.get("ultimo_mensaje_fecha"))
            chat["participants_json"] = row.get("participants_json")
            chats.append(chat)

        chats = dedupe_chats_by_jid(chats)
        chats.sort(key=chat_sort_score, reverse=True)

        return jsonify({"success": True, "chats": chats})

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/chats/<int:user_id>/<chat_key>/messages", methods=["GET"])
def get_chat_messages(user_id, chat_key):
    user_id = resolve_owner_by_id(user_id)
    try:
        limit = min(max(int(request.args.get("limit", 80) or 80), 1), 500)
    except ValueError:
        return jsonify({"success": False, "message": "Limite invalido"}), 400

    before_id = request.args.get("before_id")
    before_id_value = None
    if before_id:
        try:
            before_id_value = int(before_id)
        except ValueError:
            return jsonify({"success": False, "message": "before_id invalido"}), 400

    raw_chat_key = str(chat_key or "").strip()
    is_jid_lookup = "@" in raw_chat_key
    is_group_chat = raw_chat_key.startswith("grupo-") or raw_chat_key.endswith("@g.us")

    if is_jid_lookup:
        lookup_id = normalize_jid(raw_chat_key)
        if not is_supported_chat_jid(lookup_id):
            return jsonify({"success": False, "message": "Chat invalido"}), 400
    else:
        try:
            lookup_id = int(raw_chat_key.replace("grupo-", "", 1) if is_group_chat else raw_chat_key)
        except ValueError:
            return jsonify({"success": False, "message": "Chat invalido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        device_id_arg = request.args.get("device_id")
        device_id_filter = None
        if device_id_arg:
            try:
                device_id_filter = int(device_id_arg)
            except ValueError:
                pass

        if is_group_chat:
            group_lookup_where = "g.jid = %s" if is_jid_lookup else "g.id = %s"
            group_params = [lookup_id]
            if device_id_filter:
                group_lookup_where += " AND g.dispositivo_id = %s"
                group_params.append(device_id_filter)
            group_params.append(user_id)

            cursor.execute(
                f"""
                SELECT
                    g.id,
                    g.dispositivo_id,
                    d.nombre AS dispositivo_nombre,
                    d.estado AS dispositivo_estado,
                    g.jid,
                    g.nombre,
                    g.foto_perfil,
                    g.descripcion,
                    g.mensajes_sin_leer,
                    COALESCE(
                        NULLIF((
                            SELECT m.texto
                            FROM mensajes m
                            WHERE m.dispositivo_id = g.dispositivo_id
                                AND m.chat_jid = g.jid
                            ORDER BY m.fecha_mensaje DESC, m.id DESC
                            LIMIT 1
                        ), ''),
                        g.ultimo_mensaje,
                        '[texto]'
                    ) AS ultimo_mensaje,
                    COALESCE(
                        (
                            SELECT m.fecha_mensaje
                            FROM mensajes m
                            WHERE m.dispositivo_id = g.dispositivo_id
                                AND m.chat_jid = g.jid
                            ORDER BY m.fecha_mensaje DESC, m.id DESC
                            LIMIT 1
                        ),
                        g.actualizado_en,
                        g.creado_en
                    ) AS ultimo_mensaje_fecha,
                    g.creado_en,
                    g.actualizado_en,
                    COALESCE(
                        (
                            SELECT m.tipo
                            FROM mensajes m
                            WHERE m.dispositivo_id = g.dispositivo_id
                                AND m.chat_jid = g.jid
                            ORDER BY m.fecha_mensaje DESC, m.id DESC
                            LIMIT 1
                        ),
                        'texto'
                    ) AS last_media_type,
                    COALESCE(
                        (
                            SELECT UNIX_TIMESTAMP(m.fecha_mensaje)
                            FROM mensajes m
                            WHERE m.dispositivo_id = g.dispositivo_id
                                AND m.chat_jid = g.jid
                            ORDER BY m.fecha_mensaje DESC, m.id DESC
                            LIMIT 1
                        ),
                        UNIX_TIMESTAMP(g.actualizado_en),
                        UNIX_TIMESTAMP(g.creado_en),
                        0
                    ) AS last_timestamp,
                    COALESCE(
                        (
                            SELECT UNIX_TIMESTAMP(m.fecha_mensaje)
                            FROM mensajes m
                            WHERE m.dispositivo_id = g.dispositivo_id
                                AND m.chat_jid = g.jid
                            ORDER BY m.fecha_mensaje DESC, m.id DESC
                            LIMIT 1
                        ),
                        UNIX_TIMESTAMP(g.actualizado_en),
                        UNIX_TIMESTAMP(g.creado_en),
                        0
                    ) AS sort_timestamp
                FROM grupos g
                INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                WHERE {group_lookup_where} AND d.usuario_id = %s
                LIMIT 1
                """,
                tuple(group_params),
            )
            contact = cursor.fetchone()
            serialize_chat = serialize_group_chat
        else:
            contact_lookup_where = "c.jid = %s" if is_jid_lookup else "c.id = %s"
            contact_params = [lookup_id]
            if device_id_filter:
                contact_lookup_where += " AND c.dispositivo_id = %s"
                contact_params.append(device_id_filter)
            contact_params.append(user_id)

            cursor.execute(
                f"""
                SELECT
                    c.id,
                    c.dispositivo_id,
                    d.nombre AS dispositivo_nombre,
                    d.estado AS dispositivo_estado,
                    c.jid,
                    c.telefono,
                    c.nombre,
                    c.foto_perfil,
                    c.correo,
                    c.empresa,
                    c.estado_lead,
                    c.agente_asignado_id,
                    da.nombre AS agente_asignado_nombre,
                    c.mensajes_sin_leer,
                    c.ultimo_mensaje,
                    c.ultima_vez_visto,
                    c.creado_en,
                    c.actualizado_en,
                    c.push_name,
                    c.verified_name,
                    c.notify_name,
                    c.lid,
                    c.participants_json,
                    c.last_timestamp,
                    c.last_media_type
                FROM contactos c
                INNER JOIN dispositivos d ON d.id = c.dispositivo_id
                LEFT JOIN usuarios da ON da.id = c.agente_asignado_id
                WHERE {contact_lookup_where} AND d.usuario_id = %s
                LIMIT 1
                """,
                tuple(contact_params),
            )
            contact = cursor.fetchone()
            serialize_chat = serialize_contact

        if not contact:
            if is_jid_lookup:
                # Si es una búsqueda por JID y no se encuentra en contactos, significa que es un chat
                # virtual nuevo que aún no está persistido. Retornar éxito con lista vacía de mensajes
                # en lugar de 404 para evitar errores en el frontend.
                return jsonify({
                    "success": True,
                    "messages": [],
                    "unread_count": 0,
                    "contact": None
                }), 200
            return jsonify({"success": False, "message": "Chat no encontrado"}), 404

        where_parts = ["m.dispositivo_id = %s", "(m.chat_jid = %s OR (m.chat_jid = %s AND %s IS NOT NULL))"]
        params = [contact["dispositivo_id"], contact["jid"], contact.get("lid"), contact.get("lid")]

        if before_id_value:
            where_parts.append("m.id < %s")
            params.append(before_id_value)

        where_sql = " AND ".join(where_parts)
        cursor.execute(
            f"""
            SELECT
                m.id,
                m.mensaje_id,
                m.dispositivo_id,
                m.chat_jid,
                m.de_jid,
                m.es_mio,
                m.es_grupo,
                m.texto,
                m.tipo,
                m.url_media,
                m.mime_media,
                m.nombre_archivo,
                m.estado,
                m.fecha_mensaje,
                m.creado_en,
                m.participant_jid,
                m.push_name,
                m.reaccion,
                m.quoted_message_id,
                m.quoted_text,
                m.fijado,
                m.destacado,
                m.agente_nombre
            FROM mensajes m
            WHERE {where_sql}
            ORDER BY m.fecha_mensaje DESC, m.id DESC
            LIMIT %s
            """,
            tuple(params + [limit]),
        )
        messages = [serialize_message(row) for row in cursor.fetchall()]
        messages.reverse()

        return jsonify(
            {
                "success": True,
                "contact": serialize_chat(contact),
                "messages": messages,
                "pagination": {
                    "limit": limit,
                    "has_more": len(messages) == limit,
                    "before_id": messages[0]["id"] if messages else None,
                },
            }
        )

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/chats/<int:user_id>/<chat_key>/read", methods=["POST"])
def mark_chat_read(user_id, chat_key):
    user_id = resolve_owner_by_id(user_id)
    raw_chat_key = str(chat_key or "").strip()
    is_jid_lookup = "@" in raw_chat_key
    is_group_chat = raw_chat_key.startswith("grupo-") or raw_chat_key.endswith("@g.us")

    if is_jid_lookup:
        chat_jid = normalize_jid(raw_chat_key)
    else:
        chat_jid = None

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # 1. Obtener la fila del chat/contacto y resolver su JID y dispositivo_id
        device_id = None
        chat_row = None
        if not chat_jid:
            if is_group_chat:
                group_id = int(raw_chat_key.replace("grupo-", "", 1))
                cursor.execute("SELECT * FROM grupos WHERE id = %s LIMIT 1", (group_id,))
                chat_row = cursor.fetchone()
                if chat_row:
                    chat_jid = chat_row["jid"]
                    device_id = chat_row["dispositivo_id"]
            else:
                contact_id = int(raw_chat_key)
                cursor.execute("SELECT * FROM contactos WHERE id = %s LIMIT 1", (contact_id,))
                chat_row = cursor.fetchone()
                if chat_row:
                    chat_jid = chat_row["jid"]
                    device_id = chat_row["dispositivo_id"]
        else:
            # Si se pasó el JID, buscamos la fila en contactos o grupos
            device_id_arg = request.args.get("device_id")
            if device_id_arg:
                cursor.execute("SELECT * FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (chat_jid, int(device_id_arg)))
                chat_row = cursor.fetchone()
                if chat_row:
                    device_id = chat_row["dispositivo_id"]
                else:
                    cursor.execute("SELECT * FROM grupos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (chat_jid, int(device_id_arg)))
                    chat_row = cursor.fetchone()
                    if chat_row:
                        device_id = chat_row["dispositivo_id"]
            else:
                cursor.execute("SELECT * FROM contactos WHERE jid = %s LIMIT 1", (chat_jid,))
                chat_row = cursor.fetchone()
                if chat_row:
                    device_id = chat_row["dispositivo_id"]
                else:
                    cursor.execute("SELECT * FROM grupos WHERE jid = %s LIMIT 1", (chat_jid,))
                    chat_row = cursor.fetchone()
                    if chat_row:
                        device_id = chat_row["dispositivo_id"]

        if not chat_jid or not device_id:
            return jsonify({"success": False, "message": "Chat no encontrado"}), 404

        # 2. Poner los mensajes sin leer a 0 en la base de datos
        cursor.execute(
            "UPDATE contactos SET mensajes_sin_leer = 0, actualizado_en = NOW() WHERE jid = %s AND dispositivo_id = %s",
            (chat_jid, device_id)
        )
        cursor.execute(
            "UPDATE chats SET mensajes_sin_leer = 0, actualizado_en = NOW() WHERE jid = %s AND dispositivo_id = %s",
            (chat_jid, device_id)
        )
        cursor.execute(
            "UPDATE grupos SET mensajes_sin_leer = 0, actualizado_en = NOW() WHERE jid = %s AND dispositivo_id = %s",
            (chat_jid, device_id)
        )
        conn.commit()

        # 3. Buscar el último mensaje recibido de la otra persona (es_mio = 0) para enviarlo al bridge
        cursor.execute(
            """
            SELECT mensaje_id FROM mensajes 
            WHERE chat_jid = %s AND dispositivo_id = %s AND es_mio = 0
            ORDER BY fecha_mensaje DESC, id DESC LIMIT 1
            """,
            (chat_jid, device_id)
        )
        msg_row = cursor.fetchone()
        
        bridge_sent = False
        if msg_row and msg_row["mensaje_id"]:
            # Enviar petición al bridge local
            payload = {
                "jid": chat_jid,
                "messageId": msg_row["mensaje_id"]
            }
            res_data = post_bridge_json(device_id, "/read", payload, timeout=10, user_id=user_id)
            bridge_sent = res_data.get("success", False)

        # 4. Notificar al frontend via SSE que el chat/contact fue marcado como leído
        event = {
            "event_type": "chat-update",
            "user_id": user_id,
            "device_id": device_id,
            "data": {
                "jid": chat_jid,
                "unread_count": 0,
                "source": "mark-read"
            }
        }
        publish_whatsapp_event(event)

        return jsonify({
            "success": True, 
            "message": "Chat marcado como leido",
            "read_receipt_sent": bridge_sent
        })

    except Exception as e:
        if conn: conn.rollback()
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/chats/<int:user_id>/<chat_key>/messages", methods=["POST"])
@jwt_required(optional=True)
def send_chat_message(user_id, chat_key):
    user_id = resolve_owner_by_id(user_id)
    # Validar que el rol del usuario real no sea 'visor' (Solo Lectura)
    real_user_id = resolve_real_user_id()
    logger.info(f"[DEBUG SEND] Headers: {dict(request.headers)}")
    logger.info(f"[DEBUG SEND] real_user_id resolved: {real_user_id}")
    if real_user_id:
        conn_check = None
        cursor_check = None
        try:
            conn_check = get_connection()
            cursor_check = conn_check.cursor(dictionary=True)
            cursor_check.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (real_user_id,))
            user_row = cursor_check.fetchone()
            if user_row and user_row.get("rol") == "visor":
                return jsonify({"success": False, "message": "No tienes permisos de escritura (Rol Visor)"}), 403
        except Exception as e:
            logger.error(f"Error validando rol del usuario en send_chat_message: {e}")
        finally:
            if cursor_check: cursor_check.close()
            if conn_check: conn_check.close()

    import urllib.request as _urllib_req
    
    # Soporte para multipart/form-data (archivos) y JSON (texto)
    file_obj = request.files.get('file')
    if request.is_json:
        data = request.get_json(silent=True) or {}
    else:
        data = request.form.to_dict()

    text = clean_text(data.get("texto") or data.get("text") or "")
    media_url = data.get("media_url")
    media_type = data.get("tipo", "image")
    
    quoted_message_id = data.get("quoted_message_id")
    quoted_text = data.get("quoted_text")
    quoted_from_me = data.get("quoted_from_me")
    quoted_participant = data.get("quoted_participant")
    
    # Si no hay texto ni archivo ni url, error
    if not text and not file_obj and not media_url:
        return jsonify({"success": False, "message": "El mensaje no puede estar vacio"}), 400

    raw_chat_key = str(chat_key or "").strip()
    is_jid_lookup = "@" in raw_chat_key
    is_group_chat = raw_chat_key.startswith("grupo-") or raw_chat_key.endswith("@g.us")

    if is_jid_lookup:
        lookup_id = normalize_jid(raw_chat_key)
    else:
        try:
            lookup_id = int(raw_chat_key.replace("grupo-", "", 1) if is_group_chat else raw_chat_key)
        except ValueError:
            return jsonify({"success": False, "message": "Chat invalido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # Obtener el device_id_filter (desde query args o payload)
        device_id_val = request.args.get("device_id") or request.form.get("device_id")
        if not device_id_val and request.is_json:
            device_id_val = data.get("device_id")
        
        device_id_filter = None
        if device_id_val:
            try:
                device_id_filter = int(device_id_val)
            except ValueError:
                pass

        if is_group_chat:
            group_lookup_where = "g.jid = %s" if is_jid_lookup else "g.id = %s"
            group_params = [lookup_id]
            if device_id_filter:
                group_lookup_where += " AND g.dispositivo_id = %s"
                group_params.append(device_id_filter)
            group_params.append(user_id)

            cursor.execute(
                f"""
                SELECT g.id, g.dispositivo_id, g.jid, g.nombre, g.foto_perfil
                FROM grupos g
                INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                WHERE {group_lookup_where} AND d.usuario_id = %s
                LIMIT 1
                """,
                tuple(group_params),
            )
            chat_row = cursor.fetchone()
            serialize_chat = serialize_group_chat
        else:
            contact_lookup_where = "c.jid = %s" if is_jid_lookup else "c.id = %s"
            contact_params = [lookup_id]
            if device_id_filter:
                contact_lookup_where += " AND c.dispositivo_id = %s"
                contact_params.append(device_id_filter)
            contact_params.append(user_id)

            cursor.execute(
                f"""
                SELECT c.id, c.dispositivo_id, c.jid, c.nombre, c.foto_perfil
                FROM contactos c
                INNER JOIN dispositivos d ON d.id = c.dispositivo_id
                WHERE {contact_lookup_where} AND d.usuario_id = %s
                LIMIT 1
                """,
                tuple(contact_params),
            )
            chat_row = cursor.fetchone()
            serialize_chat = serialize_contact

        if not chat_row:
            if is_jid_lookup:
                # Obtener el device_id (desde query args o payload)
                device_id_val = request.args.get("device_id") or request.form.get("device_id")
                if not device_id_val and request.is_json:
                    device_id_val = data.get("device_id")
                
                if device_id_val:
                    try:
                        device_id = int(device_id_val)
                    except ValueError:
                        device_id = None
                else:
                    device_id = None
                
                if not device_id:
                    # Fallback robusto a un dispositivo conectado del usuario
                    cursor.execute(
                        "SELECT id FROM dispositivos WHERE usuario_id = %s AND estado = 'conectado' LIMIT 1",
                        (user_id,)
                    )
                    dev_row = cursor.fetchone()
                    if not dev_row:
                        cursor.execute(
                            "SELECT id FROM dispositivos WHERE usuario_id = %s LIMIT 1",
                            (user_id,)
                        )
                        dev_row = cursor.fetchone()
                    if dev_row:
                        device_id = dev_row["id"]
                
                if not device_id:
                    return jsonify({"success": False, "message": "No se encontró ningún dispositivo asociado"}), 400
                
                # Crear el contacto temporal/virtual en la base de datos validando límites
                if check_mac_limit_exceeded(cursor, device_id):
                    return jsonify({"success": False, "message": "Límite de Contactos Activos Mensuales (MAC) alcanzado en tu plan. No se pueden registrar nuevos contactos."}), 400

                phone = lookup_id.split("@")[0]
                contact_name = f"+{phone}"
                cursor.execute(
                    """
                    INSERT INTO contactos (dispositivo_id, jid, telefono, nombre, creado_en, actualizado_en)
                    VALUES (%s, %s, %s, %s, NOW(), NOW())
                    """,
                    (device_id, lookup_id, phone, contact_name)
                )
                conn.commit()
                
                # Re-consultar el chat_row recién creado
                cursor.execute(
                    """
                    SELECT c.id, c.dispositivo_id, c.jid, c.nombre, c.foto_perfil
                    FROM contactos c
                    WHERE c.jid = %s AND c.dispositivo_id = %s
                    LIMIT 1
                    """,
                    (lookup_id, device_id)
                )
                chat_row = cursor.fetchone()
                if not chat_row:
                    return jsonify({"success": False, "message": "Error al registrar el contacto en base de datos"}), 500
            else:
                return jsonify({"success": False, "message": "Chat no encontrado"}), 404

        device_id = int(chat_row["dispositivo_id"])
        
        # Procesar archivo o URL de galería
        file_url = None
        media_mimetype = None
        media_filename = None
        if file_obj:
            filename = secure_filename(file_obj.filename)
            subfolder = "documentos"
            mimetype = file_obj.content_type or ""
            media_mimetype = mimetype or None
            media_filename = filename or None
            if mimetype.startswith('image/'): subfolder = "imagenes"
            elif mimetype.startswith('video/'): subfolder = "videos"
            elif mimetype.startswith('audio/'): subfolder = "audios"
            
            upload_path = os.path.join(app.config['UPLOAD_FOLDER'], subfolder)
            os.makedirs(upload_path, exist_ok=True)
            final_filename = f"{uuid.uuid4().hex}_{filename}"
            file_obj.save(os.path.join(upload_path, final_filename))
            file_url = f"/media/{subfolder}/{final_filename}"
            media_type = "image" if subfolder == "imagenes" else subfolder.rstrip('s')
        elif media_url:
            file_url = media_url
            if "/media/" in file_url:
                file_url = "/media/" + file_url.split("/media/")[-1]

        # Payload para el bridge de WhatsApp
        payload_dict = {
            "jid": chat_row["jid"],
            "text": text
        }
        
        if file_url:
            full_url = file_url
            if file_url.startswith('/media/'):
                clean_path = file_url.replace('/media/', '', 1)
                full_url = os.path.join(app.config['UPLOAD_FOLDER'], *clean_path.split('/'))
            elif file_url.startswith('/'):
                full_url = f"{request.host_url.rstrip('/')}{file_url}"
            
            payload_dict.update({
                "type": media_type,
                "url": full_url,
                "caption": text
            })
            if media_mimetype:
                payload_dict["mimetype"] = media_mimetype
            if media_filename:
                payload_dict["filename"] = media_filename
            if media_type == "audio":
                payload_dict["mimetype"] = scheduled_audio_mimetype(media_filename, media_mimetype)
                payload_dict["ptt"] = False

        if quoted_message_id:
            payload_dict.update({
                "quotedMessageId": quoted_message_id,
                "quotedText": quoted_text,
                "quotedFromMe": quoted_from_me,
                "quotedParticipant": quoted_participant
            })

        # Consultar tipo de dispositivo y credenciales oficiales de Meta
        cursor.execute(
            "SELECT color, meta_access_token, meta_phone_number_id, meta_waba_id FROM dispositivos WHERE id = %s LIMIT 1",
            (device_id,)
        )
        dev_row = cursor.fetchone()
        is_cloud = dev_row and dev_row.get("color") == "cloud"

        if is_cloud:
            meta_token = dev_row.get("meta_access_token")
            meta_phone_id = dev_row.get("meta_phone_number_id")
            if not meta_token or not meta_phone_id:
                return jsonify({"success": False, "message": "Credenciales de WhatsApp Cloud API incompletas en el dispositivo."}), 400

            recipient_phone = chat_row["jid"].split("@")[0]
            meta_url = f"https://graph.facebook.com/v18.0/{meta_phone_id}/messages"
            headers = {
                "Authorization": f"Bearer {meta_token}",
                "Content-Type": "application/json"
            }

            if file_url:
                meta_media_url = file_url
                if file_url.startswith('/'):
                    meta_media_url = f"{request.host_url.rstrip('/')}{file_url}"

                meta_media_type = media_type
                if meta_media_type not in ("image", "video", "audio", "document"):
                    meta_media_type = "document"

                payload_meta = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient_phone,
                    "type": meta_media_type,
                    meta_media_type: {
                        "link": meta_media_url
                    }
                }
                if text and meta_media_type in ("image", "video", "document"):
                    payload_meta[meta_media_type]["caption"] = text
            else:
                payload_meta = {
                    "messaging_product": "whatsapp",
                    "recipient_type": "individual",
                    "to": recipient_phone,
                    "type": "text",
                    "text": {
                        "body": text
                    }
                }

            try:
                import urllib.request as _urllib_req
                import urllib.error as _urllib_err
                req_data = json.dumps(payload_meta).encode("utf-8")
                meta_req = _urllib_req.Request(meta_url, data=req_data, headers=headers, method="POST")
                with _urllib_req.urlopen(meta_req, timeout=15) as res:
                    res_body = json.loads(res.read().decode() or "{}")
                    wamid = res_body.get("messages", [{}])[0].get("id")
                    bridge_response = {"success": True, "messageId": wamid}
                    bridge_status = 200
            except Exception as meta_err:
                logger.error(f"Error en envío de Meta Cloud API: {meta_err}")
                return jsonify({"success": False, "message": f"Error al enviar por Meta: {str(meta_err)}"}), 500
        else:
            # Usar urllib para enviar al bridge local
            bridge_port = 5000 + (device_id % 1000)
            bridge_url = f"http://127.0.0.1:{bridge_port}/send"
            
            if not is_bridge_running(device_id):
                start_whatsapp_bridge(user_id, device_id)
                wait_for_bridge_port(device_id, timeout_seconds=10)

            # 4. Enviar al bridge local
            bridge_payload = json.dumps(payload_dict).encode("utf-8")
            try:
                req = _urllib_req.Request(
                    bridge_url,
                    data=bridge_payload,
                    headers={"Content-Type": "application/json"},
                    method="POST",
                )
                with _urllib_req.urlopen(req, timeout=15) as response:
                    bridge_response = json.loads(response.read().decode() or "{}")
                    bridge_status = response.status
            except Exception as e:
                import urllib.error as _urllib_err
                if isinstance(e, _urllib_err.HTTPError):
                    try:
                        error_body = json.loads(e.read().decode() or "{}")
                        error_msg = error_body.get("error") or str(e)
                        if "socket not connected" in error_msg.lower() or "not connected" in error_msg.lower():
                            return jsonify({"success": False, "message": "El número de WhatsApp está desconectado. Por favor, conéctalo en el panel de conexiones."}), 400
                        return jsonify({"success": False, "message": f"Error del bridge: {error_msg}"}), 400
                    except Exception:
                        pass
                return jsonify({"success": False, "message": f"Error del bridge: {str(e)}"}), 500

        if bridge_status >= 400:
            return jsonify({"success": False, "message": "Error al enviar mensaje via WhatsApp"}), 500
        if bridge_response.get("error"):
            error_msg = bridge_response.get("error")
            if "socket not connected" in error_msg.lower() or "not connected" in error_msg.lower():
                return jsonify({"success": False, "message": "El número de WhatsApp está desconectado. Por favor, conéctalo en el panel de conexiones."}), 400
            return jsonify({"success": False, "message": error_msg}), 500

        # 5. Actualizar base de datos local
        try:
            # Obtener el nombre del agente/dueño que envía el mensaje
            agente_nombre_val = None
            if real_user_id:
                cursor.execute("SELECT nombre FROM usuarios WHERE id = %s LIMIT 1", (real_user_id,))
                u_row = cursor.fetchone()
                if u_row:
                    agente_nombre_val = u_row["nombre"]

            # Obtener el ID del mensaje generado por el bridge
            msg_key_id = None
            if isinstance(bridge_response, dict):
                msg_key_id = (
                    bridge_response.get("messageId")
                    or bridge_response.get("key", {}).get("id")
                    or bridge_response.get("message", {}).get("key", {}).get("id")
                )

            if msg_key_id:
                try:
                    cursor.execute(
                        """
                        INSERT INTO mensajes (
                            mensaje_id, dispositivo_id, chat_jid, de_jid, es_mio, es_grupo,
                            texto, tipo, url_media, mime_media, nombre_archivo, estado,
                            fecha_mensaje, agente_nombre
                        )
                        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 2, NOW(), %s)
                        ON DUPLICATE KEY UPDATE agente_nombre = VALUES(agente_nombre)
                        """,
                        (
                            msg_key_id,
                            device_id,
                            chat_row["jid"],
                            chat_row["jid"],
                            1,
                            1 if is_group_chat else 0,
                            text,
                            media_type,
                            file_url,
                            media_mimetype,
                            media_filename,
                            agente_nombre_val
                        )
                    )
                except Exception as db_ins_err:
                    logger.error(f"Error insertando mensaje en send_chat_message: {db_ins_err}")

            # Marcar como leídos y actualizar agente
            if not is_group_chat:
                cursor.execute(
                    """
                    UPDATE contactos 
                    SET agente_asignado_id = COALESCE(agente_asignado_id, %s), 
                        mensajes_sin_leer = 0, 
                        actualizado_en = NOW() 
                    WHERE id = %s
                    """,
                    (user_id, chat_row["id"])
                )
            else:
                cursor.execute(
                    "UPDATE grupos SET mensajes_sin_leer = 0, actualizado_en = NOW() WHERE id = %s",
                    (chat_row["id"],)
                )
            conn.commit()
            
            # Re-consultar el contacto completo para retornar la información actualizada en tiempo real
            if not is_group_chat:
                cursor.execute(
                    """
                    SELECT
                        c.id, c.dispositivo_id, d.nombre AS dispositivo_nombre, d.estado AS dispositivo_estado,
                        c.jid, c.telefono, c.nombre, c.foto_perfil, c.correo, c.empresa,
                        c.estado_lead, c.agente_asignado_id, da.nombre AS agente_asignado_nombre, c.mensajes_sin_leer, c.ultimo_mensaje,
                        c.ultima_vez_visto, c.creado_en, c.actualizado_en, c.push_name,
                        c.verified_name, c.notify_name, c.last_timestamp, c.last_media_type
                    FROM contactos c
                    INNER JOIN dispositivos d ON d.id = c.dispositivo_id
                    LEFT JOIN usuarios da ON da.id = c.agente_asignado_id
                    WHERE c.id = %s AND d.usuario_id = %s
                    LIMIT 1
                    """,
                    (chat_row["id"], user_id),
                )
                chat_row = cursor.fetchone() or chat_row
            else:
                cursor.execute(
                    """
                    SELECT g.id, g.dispositivo_id, d.nombre AS dispositivo_nombre, d.estado AS dispositivo_estado,
                           g.jid, g.nombre, g.foto_perfil, g.mensajes_sin_leer, g.ultimo_mensaje,
                           g.ultima_vez_visto, g.creado_en, g.actualizado_en
                    FROM grupos g
                    INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                    WHERE g.id = %s AND d.usuario_id = %s
                    LIMIT 1
                    """,
                    (chat_row["id"], user_id),
                )
                chat_row = cursor.fetchone() or chat_row
        except Exception as db_err:
            print(f"Error actualizando y re-consultando DB post-envío: {db_err}")

        return jsonify({
            "success": True,
            "chat": serialize_chat(chat_row),
            "bridge": bridge_response
        })

    except Exception as error:
        if conn: conn.rollback()
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/chats/<int:user_id>/<chat_key>/messages/<message_id>/react", methods=["POST"])
def react_chat_message(user_id, chat_key, message_id):
    user_id = resolve_owner_by_id(user_id)
    data = request.get_json(silent=True) or {}
    reaccion = data.get("reaccion")
    
    raw_chat_key = str(chat_key or "").strip()
    is_jid_lookup = "@" in raw_chat_key
    is_group_chat = raw_chat_key.startswith("grupo-") or raw_chat_key.endswith("@g.us")

    if is_jid_lookup:
        lookup_id = normalize_jid(raw_chat_key)
    else:
        try:
            lookup_id = int(raw_chat_key.replace("grupo-", "", 1) if is_group_chat else raw_chat_key)
        except ValueError:
            return jsonify({"success": False, "message": "Chat invalido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if is_group_chat:
            group_lookup_where = "g.jid = %s" if is_jid_lookup else "g.id = %s"
            cursor.execute(
                f"SELECT g.dispositivo_id, g.jid FROM grupos g INNER JOIN dispositivos d ON d.id = g.dispositivo_id WHERE {group_lookup_where} AND d.usuario_id = %s LIMIT 1",
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()
        else:
            contact_lookup_where = "c.jid = %s" if is_jid_lookup else "c.id = %s"
            cursor.execute(
                f"SELECT c.dispositivo_id, c.jid FROM contactos c INNER JOIN dispositivos d ON d.id = c.dispositivo_id WHERE {contact_lookup_where} AND d.usuario_id = %s LIMIT 1",
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()

        if not chat_row:
            return jsonify({"success": False, "message": "Chat no encontrado"}), 404

        device_id = int(chat_row["dispositivo_id"])
        
        # Obtener es_mio de base de datos para definir fromMe
        cursor.execute("SELECT es_mio FROM mensajes WHERE mensaje_id = %s AND dispositivo_id = %s LIMIT 1", (message_id, device_id))
        msg_db = cursor.fetchone()
        es_mio = msg_db["es_mio"] if msg_db else 1

        payload_dict = {
            "jid": chat_row["jid"],
            "type": "reaction",
            "targetMessageId": message_id,
            "text": reaccion,
            "fromMe": bool(es_mio)
        }

        bridge_res = post_bridge_json(device_id, "/send", payload_dict, user_id=user_id)
        if not bridge_res.get("success", False):
            return jsonify({"success": False, "message": bridge_res.get("error") or "Error al reaccionar al mensaje"}), 500

        # Guardar reacción en la base de datos local
        cursor.execute("UPDATE mensajes SET reaccion = %s WHERE mensaje_id = %s AND dispositivo_id = %s", (reaccion, message_id, device_id))
        conn.commit()

        # Notificar por SSE
        event = {
            "event_type": "chat-update",
            "user_id": user_id,
            "device_id": device_id,
            "data": {
                "jid": chat_row["jid"],
                "source": "message-reaction-update",
                "messageId": message_id,
                "reaccion": reaccion
            }
        }
        publish_whatsapp_event(event)

        return jsonify({"success": True})

    except Exception as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/chats/<int:user_id>/<chat_key>/messages/<message_id>/pin", methods=["POST"])
def pin_chat_message(user_id, chat_key, message_id):
    user_id = resolve_owner_by_id(user_id)
    data = request.get_json(silent=True) or {}
    fijar = bool(data.get("fijado", True))
    
    raw_chat_key = str(chat_key or "").strip()
    is_jid_lookup = "@" in raw_chat_key
    is_group_chat = raw_chat_key.startswith("grupo-") or raw_chat_key.endswith("@g.us")

    if is_jid_lookup:
        lookup_id = normalize_jid(raw_chat_key)
    else:
        try:
            lookup_id = int(raw_chat_key.replace("grupo-", "", 1) if is_group_chat else raw_chat_key)
        except ValueError:
            return jsonify({"success": False, "message": "Chat invalido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if is_group_chat:
            group_lookup_where = "g.jid = %s" if is_jid_lookup else "g.id = %s"
            cursor.execute(
                f"SELECT g.dispositivo_id, g.jid FROM grupos g INNER JOIN dispositivos d ON d.id = g.dispositivo_id WHERE {group_lookup_where} AND d.usuario_id = %s LIMIT 1",
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()
        else:
            contact_lookup_where = "c.jid = %s" if is_jid_lookup else "c.id = %s"
            cursor.execute(
                f"SELECT c.dispositivo_id, c.jid FROM contactos c INNER JOIN dispositivos d ON d.id = c.dispositivo_id WHERE {contact_lookup_where} AND d.usuario_id = %s LIMIT 1",
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()

        if not chat_row:
            return jsonify({"success": False, "message": "Chat no encontrado"}), 404

        device_id = int(chat_row["dispositivo_id"])
        
        # Obtener es_mio de base de datos para definir fromMe
        cursor.execute("SELECT es_mio FROM mensajes WHERE mensaje_id = %s AND dispositivo_id = %s LIMIT 1", (message_id, device_id))
        msg_db = cursor.fetchone()
        es_mio = msg_db["es_mio"] if msg_db else 1

        payload_dict = {
            "jid": chat_row["jid"],
            "type": "pin",
            "targetMessageId": message_id,
            "pinType": 1 if fijar else 2,
            "fromMe": bool(es_mio)
        }

        bridge_res = post_bridge_json(device_id, "/send", payload_dict, user_id=user_id)
        if not bridge_res.get("success", False):
            return jsonify({"success": False, "message": bridge_res.get("error") or "Error al fijar/desfijar mensaje"}), 500

        # Guardar estado fijado en la base de datos local
        # Primero desfijamos todos los mensajes de este chat en este dispositivo
        cursor.execute("UPDATE mensajes SET fijado = 0 WHERE chat_jid = %s AND dispositivo_id = %s", (chat_row["jid"], device_id))
        
        # Luego fijamos el actual
        cursor.execute("UPDATE mensajes SET fijado = %s WHERE mensaje_id = %s AND dispositivo_id = %s", (1 if fijar else 0, message_id, device_id))

        # Insertar mensaje de sistema en mensajes locales
        sys_msg_id = f"sys_pin_{message_id}_{'1' if fijar else '0'}"
        sys_text = "Fijaste un mensaje." if fijar else "Desfijaste un mensaje."
        
        cursor.execute(
            """
            INSERT INTO mensajes (
                mensaje_id, dispositivo_id, chat_jid, de_jid, es_mio, es_grupo,
                texto, tipo, estado, fecha_mensaje
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, NOW())
            ON DUPLICATE KEY UPDATE texto = VALUES(texto)
            """,
            (sys_msg_id, device_id, chat_row["jid"], chat_row["jid"], 1, 1 if is_group_chat else 0, sys_text, "sistema", 2)
        )

        # Actualizar ultimo_mensaje en la tabla de contactos/grupos
        table_name = "grupos" if is_group_chat else "contactos"
        cursor.execute(
            f"UPDATE {table_name} SET ultimo_mensaje = %s, actualizado_en = NOW() WHERE jid = %s AND dispositivo_id = %s",
            (sys_text, chat_row["jid"], device_id)
        )
        
        conn.commit()

        # Notificar por SSE
        event = {
            "event_type": "chat-update",
            "user_id": user_id,
            "device_id": device_id,
            "data": {
                "jid": chat_row["jid"],
                "source": "message-pin-update",
                "messageId": message_id,
                "fijado": fijar,
                "systemMessage": sys_text
            }
        }
        publish_whatsapp_event(event)

        return jsonify({"success": True})

    except Exception as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/chats/<int:user_id>/<chat_key>/messages/<message_id>/star", methods=["POST"])
def star_chat_message(user_id, chat_key, message_id):
    user_id = resolve_owner_by_id(user_id)
    data = request.get_json(silent=True) or {}
    destacar = bool(data.get("destacado", True))
    
    raw_chat_key = str(chat_key or "").strip()
    is_jid_lookup = "@" in raw_chat_key
    is_group_chat = raw_chat_key.startswith("grupo-") or raw_chat_key.endswith("@g.us")

    if is_jid_lookup:
        lookup_id = normalize_jid(raw_chat_key)
    else:
        try:
            lookup_id = int(raw_chat_key.replace("grupo-", "", 1) if is_group_chat else raw_chat_key)
        except ValueError:
            return jsonify({"success": False, "message": "Chat invalido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if is_group_chat:
            group_lookup_where = "g.jid = %s" if is_jid_lookup else "g.id = %s"
            cursor.execute(
                f"SELECT g.dispositivo_id, g.jid FROM grupos g INNER JOIN dispositivos d ON d.id = g.dispositivo_id WHERE {group_lookup_where} AND d.usuario_id = %s LIMIT 1",
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()
        else:
            contact_lookup_where = "c.jid = %s" if is_jid_lookup else "c.id = %s"
            cursor.execute(
                f"SELECT c.dispositivo_id, c.jid FROM contactos c INNER JOIN dispositivos d ON d.id = c.dispositivo_id WHERE {contact_lookup_where} AND d.usuario_id = %s LIMIT 1",
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()

        if not chat_row:
            return jsonify({"success": False, "message": "Chat no encontrado"}), 404

        device_id = int(chat_row["dispositivo_id"])
        
        cursor.execute(
            "UPDATE mensajes SET destacado = %s WHERE mensaje_id = %s AND dispositivo_id = %s",
            (1 if destacar else 0, message_id, device_id)
        )
        conn.commit()

        event = {
            "event_type": "chat-update",
            "user_id": user_id,
            "device_id": device_id,
            "data": {
                "jid": chat_row["jid"],
                "source": "message-star-update",
                "messageId": message_id,
                "destacado": destacar
            }
        }
        publish_whatsapp_event(event)

        return jsonify({"success": True})

    except Exception as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()



@app.route("/api/chats/<int:user_id>/<chat_key>/subscribe-presence", methods=["POST"])
def subscribe_chat_presence(user_id, chat_key):
    user_id = resolve_owner_by_id(user_id)
    raw_chat_key = str(chat_key or "").strip()
    is_jid_lookup = "@" in raw_chat_key
    is_group_chat = raw_chat_key.startswith("grupo-") or raw_chat_key.endswith("@g.us")

    if is_group_chat:
        return jsonify({"success": True})

    if is_jid_lookup:
        lookup_id = normalize_jid(raw_chat_key)
    else:
        try:
            lookup_id = int(raw_chat_key)
        except ValueError:
            return jsonify({"success": False, "message": "Chat invalido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        contact_lookup_where = "c.jid = %s" if is_jid_lookup else "c.id = %s"
        cursor.execute(
            f"SELECT c.dispositivo_id, c.jid FROM contactos c INNER JOIN dispositivos d ON d.id = c.dispositivo_id WHERE {contact_lookup_where} AND d.usuario_id = %s LIMIT 1",
            (lookup_id, user_id),
        )
        chat_row = cursor.fetchone()

        if not chat_row:
            return jsonify({"success": False, "message": "Chat no encontrado"}), 404

        device_id = int(chat_row["dispositivo_id"])
        jid = chat_row["jid"]
        
        bridge_port = 5000 + (device_id % 1000)
        try:
            response = requests.post(
                f"http://127.0.0.1:{bridge_port}/subscribe-presence",
                json={"jid": jid},
                timeout=5
            )
            data = response.json()
            if response.status_code >= 400 or data.get("error"):
                return jsonify({"success": False, "message": data.get("error") or "Error del puente"}), 400
        except Exception as e:
            return jsonify({"success": False, "message": f"Puente desconectado: {str(e)}"}), 502

        return jsonify({"success": True})

    except Exception as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/chats/<int:user_id>/<chat_key>/messages/<message_id>", methods=["DELETE"])
def delete_chat_message(user_id, chat_key, message_id):
    user_id = resolve_owner_by_id(user_id)
    raw_chat_key = str(chat_key or "").strip()
    is_jid_lookup = "@" in raw_chat_key
    is_group_chat = raw_chat_key.startswith("grupo-") or raw_chat_key.endswith("@g.us")

    if is_jid_lookup:
        lookup_id = normalize_jid(raw_chat_key)
    else:
        try:
            lookup_id = int(raw_chat_key.replace("grupo-", "", 1) if is_group_chat else raw_chat_key)
        except ValueError:
            return jsonify({"success": False, "message": "Chat invalido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        if is_group_chat:
            group_lookup_where = "g.jid = %s" if is_jid_lookup else "g.id = %s"
            cursor.execute(
                f"SELECT g.dispositivo_id, g.jid FROM grupos g INNER JOIN dispositivos d ON d.id = g.dispositivo_id WHERE {group_lookup_where} AND d.usuario_id = %s LIMIT 1",
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()
        else:
            contact_lookup_where = "c.jid = %s" if is_jid_lookup else "c.id = %s"
            cursor.execute(
                f"SELECT c.dispositivo_id, c.jid FROM contactos c INNER JOIN dispositivos d ON d.id = c.dispositivo_id WHERE {contact_lookup_where} AND d.usuario_id = %s LIMIT 1",
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()

        if not chat_row:
            return jsonify({"success": False, "message": "Chat no encontrado"}), 404

        device_id = int(chat_row["dispositivo_id"])
        
        # Obtener es_mio de base de datos para definir fromMe
        cursor.execute("SELECT es_mio FROM mensajes WHERE mensaje_id = %s AND dispositivo_id = %s LIMIT 1", (message_id, device_id))
        msg_db = cursor.fetchone()
        es_mio = msg_db["es_mio"] if msg_db else 1

        payload_dict = {
            "jid": chat_row["jid"],
            "type": "delete",
            "targetMessageId": message_id,
            "fromMe": bool(es_mio)
        }

        bridge_res = post_bridge_json(device_id, "/send", payload_dict, user_id=user_id)
        if not bridge_res.get("success", False):
            return jsonify({"success": False, "message": bridge_res.get("error") or "Error al eliminar mensaje"}), 500

        # Guardar mensaje eliminado en la base de datos local
        cursor.execute("UPDATE mensajes SET texto = %s WHERE mensaje_id = %s AND dispositivo_id = %s", ('🚫 Mensaje eliminado', message_id, device_id))
        conn.commit()

        # Notificar por SSE
        event = {
            "event_type": "chat-update",
            "user_id": user_id,
            "device_id": device_id,
            "data": {
                "jid": chat_row["jid"],
                "source": "message-delete-update",
                "messageId": message_id
            }
        }
        publish_whatsapp_event(event)

        return jsonify({"success": True})

    except Exception as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/contacts/<int:contact_id>/report", methods=["POST"])
def report_contact_endpoint(contact_id):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("UPDATE contactos SET reportado = 1 WHERE id = %s", (contact_id,))
        conn.commit()

        return jsonify({"success": True})
    except Exception as error:
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/contacts/<int:user_id>/<int:contact_id>", methods=["PUT"])
def update_contact(user_id, contact_id):
    user_id = resolve_owner_by_id(user_id)
    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip() or None
    correo = (data.get("correo") or "").strip() or None
    empresa = (data.get("empresa") or "").strip() or None
    estado_lead = (data.get("estado_lead") or "nuevo").strip()
    allowed_states = {"nuevo", "interesado", "en_negociacion", "cerrado", "perdido"}

    if estado_lead not in allowed_states:
        return jsonify({"success": False, "message": "Estado de lead invalido"}), 400

    agente_asignado_id = data.get("agente_asignado_id")
    if not agente_asignado_id or agente_asignado_id == 'null' or str(agente_asignado_id).strip() == '':
        agente_asignado_id = None
    else:
        try:
            agente_asignado_id = int(agente_asignado_id)
        except ValueError:
            agente_asignado_id = None

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            UPDATE contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            SET c.nombre = %s,
                c.correo = %s,
                c.empresa = %s,
                c.estado_lead = %s,
                c.agente_asignado_id = %s
            WHERE c.id = %s AND d.usuario_id = %s
            """,
            (nombre, correo, empresa, estado_lead, agente_asignado_id, contact_id, user_id),
        )

        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({"success": False, "message": "Contacto no encontrado"}), 404

        conn.commit()
        cursor.execute(
            """
            SELECT
                c.id, c.dispositivo_id, d.nombre AS dispositivo_nombre, d.estado AS dispositivo_estado,
                c.jid, c.telefono, c.nombre, c.foto_perfil, c.correo, c.empresa,
                c.estado_lead, c.agente_asignado_id, da.nombre AS agente_asignado_nombre, c.mensajes_sin_leer, c.ultimo_mensaje,
                c.ultima_vez_visto, c.creado_en, c.actualizado_en, c.push_name,
                c.verified_name, c.notify_name, c.last_timestamp, c.last_media_type
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            LEFT JOIN usuarios da ON da.id = c.agente_asignado_id
            WHERE c.id = %s AND d.usuario_id = %s
            LIMIT 1
            """,
            (contact_id, user_id),
        )
        row = cursor.fetchone()

        return jsonify(
            {
                "success": True,
                "contact": serialize_contact(row),
            }
        )

    except mysql.connector.Error as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/profile/<int:user_id>", methods=["PUT"])
def update_profile(user_id):
    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip()
    whatsapp_personal = (data.get("whatsapp_personal") or data.get("whatsapp") or "").strip() or None
    zona_horaria = (data.get("zona_horaria") or data.get("zonaHoraria") or "America/Guayaquil").strip()
    foto_perfil = (data.get("foto_perfil") or "").strip() or None

    if not nombre:
        return jsonify({"success": False, "message": "El nombre es obligatorio"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            UPDATE usuarios
            SET nombre = %s,
                whatsapp_personal = %s,
                zona_horaria = %s,
                foto_perfil = %s
            WHERE id = %s
            """,
            (nombre, whatsapp_personal, zona_horaria, foto_perfil, user_id),
        )

        if cursor.rowcount == 0:
            conn.rollback()
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        conn.commit()
        cursor.execute(
            f"SELECT {', '.join(PUBLIC_USER_FIELDS)} FROM usuarios WHERE id = %s LIMIT 1",
            (user_id,),
        )
        user = cursor.fetchone()

        return jsonify({"success": True, "user": public_user(user)})

    except mysql.connector.Error as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/onboarding", methods=["PUT"])
@jwt_required()
def save_onboarding():
    user_id = get_jwt_identity()
    data = request.get_json(silent=True) or {}
    
    nombre_negocio = (data.get("nombre_negocio") or "").strip()
    whatsapp_personal = (data.get("whatsapp_personal") or "").strip() or None
    onboarding_json = data.get("onboarding_json") # dict
    
    import json
    onboarding_str = json.dumps(onboarding_json, ensure_ascii=False) if onboarding_json else None
    
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # 1. Actualizar usuario (whatsapp_personal y onboarding_json)
        cursor.execute("""
            UPDATE usuarios 
            SET whatsapp_personal = %s, onboarding_json = %s 
            WHERE id = %s
        """, (whatsapp_personal, onboarding_str, user_id))
        
        # 2. Actualizar o Crear configuración del negocio
        if nombre_negocio:
            cursor.execute("SELECT id FROM configuracion WHERE usuario_id = %s LIMIT 1", (user_id,))
            config_row = cursor.fetchone()
            if config_row:
                cursor.execute("""
                    UPDATE configuracion 
                    SET nombre_negocio = %s 
                    WHERE usuario_id = %s
                """, (nombre_negocio, user_id))
            else:
                cursor.execute("""
                    INSERT INTO configuracion (usuario_id, nombre_negocio) 
                    VALUES (%s, %s)
                """, (user_id, nombre_negocio))
                
        conn.commit()
        
        # Obtener el usuario actualizado
        cursor.execute(f"SELECT {', '.join(PUBLIC_USER_FIELDS)} FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
        updated_user = cursor.fetchone()
        
        return jsonify({
            "success": True, 
            "message": "Onboarding guardado con éxito.",
            "user": public_user(updated_user)
        })
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error al guardar onboarding")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def get_automation_folder(cursor, folder_id, user_id):
    cursor.execute(
        """
        SELECT id, usuario_id, nombre, parent_id, creado_en, actualizado_en
        FROM automatizacion_carpetas
        WHERE id = %s AND usuario_id = %s
        LIMIT 1
        """,
        (folder_id, user_id),
    )
    return cursor.fetchone()


def build_automation_breadcrumbs(cursor, folder_id, user_id):
    breadcrumbs = []
    current_id = folder_id

    while current_id:
        folder = get_automation_folder(cursor, current_id, user_id)
        if not folder:
            break
        breadcrumbs.append({"id": folder["id"], "nombre": folder["nombre"]})
        current_id = folder.get("parent_id")

    breadcrumbs.reverse()
    return breadcrumbs


@app.route("/api/v1/users/<int:user_id>/trigger/<int:automation_id>", methods=["POST"])
def trigger_external_webhook(user_id, automation_id):
    """
    Recibe peticiones HTTP POST de terceros (Zapier, Make, Hotmart, etc.)
    para iniciar una automatización de manera externa.
    """
    logger.info(f"Recibido webhook de terceros para usuario {user_id}, automatización {automation_id}")
    data = request.json or {}
    
    # 1. Obtener la automatización de la base de datos
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            "SELECT * FROM automatizaciones WHERE id = %s AND usuario_id = %s AND activo = 1 LIMIT 1",
            (automation_id, user_id)
        )
        auto = cursor.fetchone()
        if not auto:
            logger.warning(f"Automatización {automation_id} no encontrada, inactiva o no pertenece al usuario {user_id}")
            return jsonify({"success": False, "message": "Automatización no encontrada o inactiva"}), 404

        # 2. Obtener el triggerNode de los nodos para leer la configuración de mapeo
        import json
        nodos = auto.get("nodos") or []
        if isinstance(nodos, str):
            try:
                nodos = json.loads(nodos)
            except:
                nodos = []
                
        trigger_node = next((n for n in nodos if n.get("type") == "triggerNode"), None)
        if not trigger_node:
            return jsonify({"success": False, "message": "El flujo no tiene un nodo de disparador válido"}), 400
            
        config = trigger_node.get("data", {}).get("config", {})
        
        # Extraer teléfono (obligatorio)
        telefono_raw = None
        mapeo_telefono_key = config.get("webhook_mapeo_telefono") or "telefono"
        if mapeo_telefono_key in data:
            telefono_raw = data.get(mapeo_telefono_key)
        else:
            # Fallback a claves estándar
            telefono_raw = data.get("telefono") or data.get("phone") or data.get("phone_number") or data.get("number")
            
        if not telefono_raw:
            return jsonify({"success": False, "message": "No se encontró el campo de teléfono en el payload"}), 400
            
        # Normalizar teléfono y construir JID
        phone = "".join(filter(str.isdigit, str(telefono_raw)))
        if phone.startswith("0") and len(phone) == 10:
            phone = f"593{phone[1:]}"
        elif len(phone) == 9 and not phone.startswith("593"):
            phone = f"593{phone}"
            
        chat_jid = f"{phone}@s.whatsapp.net"
        
        # Obtener dispositivo_id asociado
        device_id = auto.get("dispositivo_id")
        if not device_id:
            # Si no tiene dispositivo específico, elegir el primero conectado
            cursor.execute("SELECT id FROM dispositivos WHERE usuario_id = %s AND estado = 'conectado' LIMIT 1", (user_id,))
            dev_row = cursor.fetchone()
            if dev_row:
                device_id = dev_row["id"]
            else:
                cursor.execute("SELECT id FROM dispositivos WHERE usuario_id = %s LIMIT 1", (user_id,))
                dev_row = cursor.fetchone()
                if dev_row:
                    device_id = dev_row["id"]
                    
        if not device_id:
            return jsonify({"success": False, "message": "No hay dispositivos configurados o activos para este usuario"}), 400

        # 3. Crear o actualizar contacto
        cursor.execute("SELECT id FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (chat_jid, device_id))
        contact_row = cursor.fetchone()
        
        # Extraer nombre
        nombre_raw = None
        mapeo_nombre_key = config.get("webhook_mapeo_nombre") or "nombre"
        if mapeo_nombre_key in data:
            nombre_raw = data.get(mapeo_nombre_key)
        else:
            nombre_raw = data.get("nombre") or data.get("name") or data.get("first_name") or "Cliente Webhook"
            
        # Extraer correo
        correo_raw = None
        mapeo_correo_key = config.get("webhook_mapeo_correo") or "correo"
        if mapeo_correo_key in data:
            correo_raw = data.get(mapeo_correo_key)
        else:
            correo_raw = data.get("correo") or data.get("email")

        if contact_row:
            contact_id = contact_row["id"]
            cursor.execute(
                "UPDATE contactos SET nombre = %s, email = %s, actualizado_en = NOW() WHERE id = %s",
                (nombre_raw, correo_raw, contact_id)
            )
        else:
            cursor.execute(
                """
                INSERT INTO contactos (dispositivo_id, jid, telefono, nombre, email, creado_en, actualizado_en)
                VALUES (%s, %s, %s, %s, %s, NOW(), NOW())
                """,
                (device_id, chat_jid, phone, nombre_raw, correo_raw)
            )
            contact_id = cursor.lastrowid
            
        # 4. Guardar campos personalizados adicionales (si los hay y están mapeados)
        custom_mapping = config.get("webhook_custom_mapping") or {}
        if isinstance(custom_mapping, dict):
            for payload_key, field_name in custom_mapping.items():
                if payload_key in data:
                    val = data[payload_key]
                    # Buscar el campo customizado en DB
                    cursor.execute("SELECT id FROM campos_customizados WHERE nombre = %s AND usuario_id = %s LIMIT 1", (field_name, user_id))
                    cf_row = cursor.fetchone()
                    if cf_row:
                        cf_id = cf_row["id"]
                        cursor.execute(
                            """
                            INSERT INTO contacto_campos_customizados (contacto_id, campo_id, valor)
                            VALUES (%s, %s, %s)
                            ON DUPLICATE KEY UPDATE valor = %s
                            """,
                            (contact_id, cf_id, str(val), str(val))
                        )
                        
        conn.commit()

        # 5. Ejecutar automatización
        # Cancelar cualquier espera previa
        cursor.execute("DELETE FROM automatizacion_esperas WHERE contacto_jid = %s AND usuario_id = %s", (chat_jid, user_id))
        conn.commit()
        
        trigger_automation_async(user_id, device_id, auto, chat_jid, nombre_raw)
        logger.info(f"Automatización webhook de terceros ID {automation_id} disparada para {chat_jid}")
        
        return jsonify({"success": True, "message": "Automatización disparada con éxito"})
        
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception(f"Error en trigger_external_webhook: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/automatizaciones/overview", methods=["GET"])
def automation_overview():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no autenticado"}), 401
    search = (request.args.get("search") or "").strip()
    folder_id = request.args.get("folder_id", type=int)

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_automation_schema(cursor)

        current_folder = None
        if folder_id:
            current_folder = get_automation_folder(cursor, folder_id, user_id)
            if not current_folder:
                return jsonify({"success": False, "message": "Carpeta no encontrada"}), 404

        folder_filters = ["usuario_id = %s"]
        folder_params = [user_id]

        if folder_id:
            folder_filters.append("parent_id = %s")
            folder_params.append(folder_id)
        else:
            folder_filters.append("parent_id IS NULL")

        if search:
            folder_filters.append("nombre LIKE %s")
            folder_params.append(f"%{search}%")

        cursor.execute(
            f"""
            SELECT id, nombre, parent_id, creado_en, actualizado_en
            FROM automatizacion_carpetas
            WHERE {' AND '.join(folder_filters)}
            ORDER BY nombre ASC
            """,
            tuple(folder_params),
        )
        folders = cursor.fetchall()

        automation_filters = ["a.usuario_id = %s"]
        automation_params = [user_id]

        if request.args.get("all") == "true":
            pass
        elif folder_id:
            automation_filters.append("a.carpeta_id = %s")
            automation_params.append(folder_id)
        else:
            automation_filters.append("a.carpeta_id IS NULL")

        if search:
            automation_filters.append(
                """
                (
                    a.nombre LIKE %s OR
                    COALESCE(a.palabra_clave, '') LIKE %s OR
                    a.tipo_disparador LIKE %s
                )
                """
            )
            automation_params.extend([f"%{search}%"] * 3)

        cursor.execute(
            f"""
            SELECT
                a.id,
                a.nombre,
                a.tipo_disparador,
                a.palabra_clave,
                a.activo,
                a.creado_en,
                a.actualizado_en,
                a.dispositivo_id,
                COUNT(ra.id) AS ejecuciones
            FROM automatizaciones a
            LEFT JOIN registros_automatizacion ra
                ON ra.automatizacion_id = a.id
            WHERE {' AND '.join(automation_filters)}
            GROUP BY
                a.id, a.nombre, a.tipo_disparador, a.palabra_clave, a.activo,
                a.creado_en, a.actualizado_en, a.dispositivo_id
            ORDER BY a.creado_en DESC, a.id DESC
            """,
            tuple(automation_params),
        )
        automations = cursor.fetchall()

        for item in automations:
            item["ejecuciones"] = int(item.get("ejecuciones") or 0)

        breadcrumbs = [{"id": None, "nombre": "Mis automatizaciones"}]
        breadcrumbs.extend(build_automation_breadcrumbs(cursor, folder_id, user_id))

        return jsonify(
            {
                "success": True,
                "folders": folders,
                "automations": automations,
                "breadcrumbs": breadcrumbs,
                "current_folder": current_folder,
            }
        )
    except Exception as e:
        logger.exception("Error cargando overview de automatizaciones")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/automatizaciones/folders", methods=["POST"])
def create_automation_folder():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no autenticado"}), 401
    data = request.json or {}
    nombre = (data.get("nombre") or "").strip()
    parent_id = data.get("parent_id", None)

    if not nombre:
        return jsonify({"success": False, "message": "El nombre de la carpeta es obligatorio"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_automation_schema(cursor)

        if parent_id:
            parent_folder = get_automation_folder(cursor, int(parent_id), user_id)
            if not parent_folder:
                return jsonify({"success": False, "message": "La carpeta padre no existe"}), 404

        cursor.execute(
            """
            INSERT INTO automatizacion_carpetas (usuario_id, nombre, parent_id)
            VALUES (%s, %s, %s)
            """,
            (user_id, nombre, parent_id),
        )
        conn.commit()
        return jsonify({"success": True, "folder_id": cursor.lastrowid})
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error creando carpeta de automatizacion")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/automatizaciones/folders/<int:folder_id>", methods=["PUT"])
def update_automation_folder(folder_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no autenticado"}), 401
    data = request.json or {}
    nombre = (data.get("nombre") or "").strip()

    if not nombre:
        return jsonify({"success": False, "message": "El nombre de la carpeta es obligatorio"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_automation_schema(cursor)
        folder = get_automation_folder(cursor, folder_id, user_id)
        if not folder:
            return jsonify({"success": False, "message": "Carpeta no encontrada"}), 404

        cursor.execute(
            """
            UPDATE automatizacion_carpetas
            SET nombre = %s
            WHERE id = %s AND usuario_id = %s
            """,
            (nombre, folder_id, user_id),
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error actualizando carpeta de automatizacion")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/automatizaciones/folders/<int:folder_id>", methods=["DELETE"])
def delete_automation_folder(folder_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no autenticado"}), 401
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_automation_schema(cursor)
        folder = get_automation_folder(cursor, folder_id, user_id)
        if not folder:
            return jsonify({"success": False, "message": "Carpeta no encontrada"}), 404

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM automatizacion_carpetas
            WHERE usuario_id = %s AND parent_id = %s
            """,
            (user_id, folder_id),
        )
        child_folders = int((cursor.fetchone() or {}).get("total") or 0)

        cursor.execute(
            """
            SELECT COUNT(*) AS total
            FROM automatizaciones
            WHERE usuario_id = %s AND carpeta_id = %s
            """,
            (user_id, folder_id),
        )
        flows = int((cursor.fetchone() or {}).get("total") or 0)

        if child_folders > 0 or flows > 0:
            return jsonify(
                {
                    "success": False,
                    "message": "No puedes eliminar esta carpeta porque contiene subcarpetas o flujos.",
                    "has_children": child_folders > 0,
                    "has_flows": flows > 0,
                }
            ), 409

        cursor.execute(
            "DELETE FROM automatizacion_carpetas WHERE id = %s AND usuario_id = %s",
            (folder_id, user_id),
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error eliminando carpeta de automatizacion")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


def resolve_nodos_media_urls(nodos_data):
    public_url = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
    if not public_url:
        return nodos_data
    
    try:
        is_str = isinstance(nodos_data, str)
        nodos_list = json.loads(nodos_data) if is_str else nodos_data
        if not isinstance(nodos_list, list):
            return nodos_data

        modified = False
        for node in nodos_list:
            node_data = node.get("data") or {}
            blocks = node_data.get("blocks") or []
            for block in blocks:
                media_url = block.get("url")
                if media_url and isinstance(media_url, str):
                    if media_url.startswith("/media/") or media_url.startswith("media/"):
                        clean_rel = media_url.replace("/media/", "", 1).replace("media/", "", 1).lstrip("/")
                        local_file = os.path.join(app.config['UPLOAD_FOLDER'], *clean_rel.split("/"))
                        if not os.path.isfile(local_file):
                            block["url"] = f"{public_url}/{clean_rel}"
                            modified = True

        if modified:
            return json.dumps(nodos_list, ensure_ascii=False) if is_str else nodos_list
    except Exception as err:
        logger.error(f"Error resolviendo media URLs de nodos: {err}")

    return nodos_data


@app.route("/api/automatizaciones/detail", methods=["GET"])
def get_automation_detail():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no autenticado"}), 401
    
    automation_id = request.args.get("id")
    if not automation_id:
        return jsonify({"success": False, "message": "ID de automatización requerido"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute(
            """
            SELECT id, nombre, tipo_disparador, palabra_clave, activo, carpeta_id, dispositivo_id, nodos, conexiones
            FROM automatizaciones
            WHERE id = %s AND usuario_id = %s
            LIMIT 1
            """,
            (automation_id, user_id)
        )
        automation = cursor.fetchone()
        if not automation:
            return jsonify({"success": False, "message": "Automatización no encontrada"}), 404
            
        if automation.get("nodos"):
            automation["nodos"] = resolve_nodos_media_urls(automation["nodos"])

        return jsonify({"success": True, "automation": automation})
    except Exception as e:
        logger.exception("Error obteniendo detalle de automatizacion")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/automatizaciones", methods=["POST"])
@jwt_required()
def create_automation():
    # Solo admins/superadmins pueden crear automatizaciones
    role_err = require_admin_role()
    if role_err:
        return role_err

    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no autenticado"}), 401
    data = request.json or {}
    nombre = (data.get("nombre") or "").strip()
    tipo_disparador = (data.get("tipo_disparador") or "palabra_clave").strip()
    palabra_clave = (data.get("palabra_clave") or "").strip() or None
    activo = 1 if data.get("activo", True) else 0
    carpeta_id = data.get("carpeta_id")
    dispositivo_id = data.get("dispositivo_id")

    if not nombre:
        return jsonify({"success": False, "message": "El nombre es obligatorio"}), 400

    is_todos_messages = False
    for node in (data.get("nodos") or []):
        if node.get("type") == "triggerNode":
            node_data = node.get("data") or {}
            config = node_data.get("config") or {}
            if config.get("coincidencia") == "Todos los mensajes":
                is_todos_messages = True
                break
            kw_val = config.get("palabra_clave") or config.get("keywords") or config.get("palabraClave") or config.get("palabras") or config.get("frase")
            if kw_val and not palabra_clave:
                palabra_clave = str(kw_val).strip()

    if tipo_disparador == "palabra_clave" and not palabra_clave and not is_todos_messages:
        return jsonify({"success": False, "message": "La palabra clave es obligatoria para este disparador"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_automation_schema(cursor)

        # Validar límite de automatizaciones del plan
        cursor.execute(
            """
            SELECT p.max_automatizaciones
            FROM suscripciones s
            INNER JOIN planes p ON p.id = s.plan_id
            WHERE s.usuario_id = %s
            ORDER BY FIELD(s.estado, 'activa', 'prueba', 'vencida', 'cancelada'), s.fecha_vencimiento DESC, s.id DESC
            LIMIT 1
            """,
            (user_id,)
        )
        plan_auto = cursor.fetchone()
        max_autos = int(plan_auto.get("max_automatizaciones") or -1) if plan_auto else -1
        if max_autos >= 0:  # -1 significa ilimitado
            cursor.execute("SELECT COUNT(*) AS total FROM automatizaciones WHERE usuario_id = %s", (user_id,))
            auto_count = cursor.fetchone()["total"]
            if auto_count >= max_autos:
                return jsonify({"success": False, "message": f"L\u00edmite de automatizaciones alcanzado ({max_autos}). Mejora tu plan para crear m\u00e1s."}), 403

        if carpeta_id:
            folder = get_automation_folder(cursor, int(carpeta_id), user_id)
            if not folder:
                return jsonify({"success": False, "message": "La carpeta seleccionada no existe"}), 404

        if not dispositivo_id:
            dispositivo_id = get_or_create_device(user_id)

        nodos_json = json.dumps(data.get("nodos") or [], ensure_ascii=False)
        conexiones_json = json.dumps(data.get("conexiones") or [], ensure_ascii=False)

        cursor.execute(
            """
            INSERT INTO automatizaciones (
                usuario_id, dispositivo_id, carpeta_id, nombre,
                tipo_disparador, palabra_clave, activo, nodos, conexiones
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
            """,
            (
                user_id,
                dispositivo_id,
                carpeta_id,
                nombre,
                tipo_disparador,
                palabra_clave,
                activo,
                nodos_json,
                conexiones_json,
            ),
        )
        conn.commit()
        return jsonify({"success": True, "automation_id": cursor.lastrowid})
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error creando automatizacion")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/automatizaciones/<int:automation_id>", methods=["PUT"])
@jwt_required()
def update_automation(automation_id):
    # Solo admins/superadmins pueden editar automatizaciones
    role_err = require_admin_role()
    if role_err:
        return role_err

    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no autenticado"}), 401
    data = request.json or {}
    nombre = (data.get("nombre") or "").strip()
    tipo_disparador = (data.get("tipo_disparador") or "palabra_clave").strip()
    palabra_clave = (data.get("palabra_clave") or "").strip() or None
    activo = 1 if data.get("activo", True) else 0
    carpeta_id = data.get("carpeta_id")

    if not nombre:
        return jsonify({"success": False, "message": "El nombre es obligatorio"}), 400

    is_todos_messages = False
    for node in (data.get("nodos") or []):
        if node.get("type") == "triggerNode":
            node_data = node.get("data") or {}
            config = node_data.get("config") or {}
            if config.get("coincidencia") == "Todos los mensajes":
                is_todos_messages = True
                break
            kw_val = config.get("palabra_clave") or config.get("keywords") or config.get("palabraClave") or config.get("palabras") or config.get("frase")
            if kw_val and not palabra_clave:
                palabra_clave = str(kw_val).strip()

    if tipo_disparador == "palabra_clave" and not palabra_clave and not is_todos_messages:
        return jsonify({"success": False, "message": "La palabra clave es obligatoria para este disparador"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_automation_schema(cursor)

        if carpeta_id:
            folder = get_automation_folder(cursor, int(carpeta_id), user_id)
            if not folder:
                return jsonify({"success": False, "message": "La carpeta seleccionada no existe"}), 404

        nodos_json = json.dumps(data.get("nodos") or [], ensure_ascii=False)
        conexiones_json = json.dumps(data.get("conexiones") or [], ensure_ascii=False)

        cursor.execute(
            """
            UPDATE automatizaciones
            SET nombre = %s,
                tipo_disparador = %s,
                palabra_clave = %s,
                activo = %s,
                carpeta_id = %s,
                dispositivo_id = %s,
                nodos = %s,
                conexiones = %s
            WHERE id = %s AND usuario_id = %s
            """,
            (
                nombre,
                tipo_disparador,
                palabra_clave,
                activo,
                carpeta_id,
                data.get("dispositivo_id"),
                nodos_json,
                conexiones_json,
                automation_id,
                user_id,
            ),
        )

        if cursor.rowcount == 0:
            # Si no se actualizó nada, verificamos si es porque no cambió nada o porque no existe
            cursor.execute("SELECT id FROM automatizaciones WHERE id = %s AND usuario_id = %s", (automation_id, user_id))
            if not cursor.fetchone():
                return jsonify({"success": False, "message": "Automatización no encontrada o no pertenece al usuario"}), 404

        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error actualizando automatizacion")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/automatizaciones/<int:automation_id>", methods=["DELETE"])
@jwt_required()
def delete_automation(automation_id):
    # Solo admins/superadmins pueden eliminar automatizaciones
    role_err = require_admin_role()
    if role_err:
        return role_err

    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario no autenticado"}), 401
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "DELETE FROM automatizaciones WHERE id = %s AND usuario_id = %s",
            (automation_id, user_id),
        )
        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Automatización no encontrada"}), 404

        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        if conn:
            conn.rollback()
        logger.exception("Error eliminando automatizacion")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/kanban/tableros', methods=['GET'])
@jwt_required()
def list_tableros():
    try:
        user_id = get_jwt_identity()
        logger.info(f"KANBAN: Listando tableros para usuario {user_id}")
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        try:
            ensure_tableros_table(cursor)
            cursor.execute("SELECT id, nombre, creado_en FROM tableros WHERE usuario_id = %s ORDER BY creado_en DESC", (user_id,))
            tableros = cursor.fetchall()
            return jsonify({"success": True, "tableros": tableros})
        finally:
            cursor.close()
            conn.close()
    except Exception as e:
        logger.error(f"ERROR KANBAN LIST: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/kanban/tableros', methods=['POST'])
@jwt_required()
def create_tablero():
    user_id = get_jwt_identity()
    data = request.json
    nombre = data.get('nombre')
    if not nombre:
        return jsonify({"success": False, "message": "El nombre es obligatorio"}), 400
        
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_tableros_table(cursor)
        ensure_etapas_table(cursor)
        
        cursor.execute("INSERT INTO tableros (usuario_id, nombre) VALUES (%s, %s)", (user_id, nombre))
        tablero_id = cursor.lastrowid
        
        conn.commit()
        return jsonify({"success": True, "tablero_id": tablero_id})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/kanban/tableros/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_tablero(id):
    user_id = get_jwt_identity()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Verificar pertenencia
        cursor.execute("DELETE FROM tableros WHERE id = %s AND usuario_id = %s", (id, user_id))
        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Tablero no encontrado"}), 404
        
        # Las etapas y contactos se podrían manejar por CASCADE en la DB, 
        # pero por seguridad limpiamos etapas
        cursor.execute("DELETE FROM etapas WHERE tablero_id = %s", (id,))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/kanban/tableros/<int:id>', methods=['PUT'])
@jwt_required()
def update_tablero(id):
    user_id = get_jwt_identity()
    data = request.json
    nuevo_nombre = data.get('nombre')
    
    if not nuevo_nombre:
        return jsonify({"success": False, "message": "Nombre requerido"}), 400
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE tableros SET nombre = %s WHERE id = %s AND usuario_id = %s",
            (nuevo_nombre, id, user_id)
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

def ensure_tableros_table(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS tableros (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_user (usuario_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)

def ensure_etapas_table(cursor):
    # Aseguramos la tabla y el campo tag_id
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS etapas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            tablero_id INT NOT NULL,
            usuario_id INT NOT NULL,
            nombre VARCHAR(100) NOT NULL,
            orden INT DEFAULT 0,
            tag_id INT DEFAULT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_tablero (tablero_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    # Migración: Renombrar user_id a usuario_id si existe
    try:
        cursor.execute("SHOW COLUMNS FROM etapas LIKE 'user_id'")
        if cursor.fetchone():
            cursor.execute("ALTER TABLE etapas CHANGE user_id usuario_id INT NOT NULL")
            logger.info("Migración: Columna user_id renombrada a usuario_id en etapas")
    except Exception as e:
        logger.error(f"Error en migración de etapas: {e}")
    # Verificar si la columna tag_id existe (por si la tabla ya existía sin ella)
    try:
        cursor.execute("SHOW COLUMNS FROM etapas LIKE 'tag_id'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE etapas ADD COLUMN tag_id INT DEFAULT NULL")
            logger.info("Columna tag_id añadida a la tabla etapas")
    except: pass

@app.route('/api/kanban', methods=['GET'])
@jwt_required()
def get_kanban_data_final():
    current_user_id = get_jwt_identity()
    tablero_id = request.args.get('tablero_id')
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_tableros_table(cursor)
        ensure_etapas_table(cursor)
        
        if not tablero_id:
            cursor.execute("SELECT id FROM tableros WHERE usuario_id = %s ORDER BY creado_en DESC LIMIT 1", (current_user_id,))
            row = cursor.fetchone()
            if not row:
                return jsonify({"success": True, "columns": [], "no_tableros": True})
            tablero_id = row['id']

        # 1. Obtener las etapas del tablero con información del tag
        cursor.execute("""
            SELECT e.id, e.nombre, e.orden, e.tag_id, t.nombre as tag_nombre, t.color as tag_color
            FROM etapas e
            LEFT JOIN tags t ON t.id = e.tag_id
            WHERE e.tablero_id = %s 
            ORDER BY e.orden ASC
        """, (tablero_id,))
        etapas = cursor.fetchall()

        # 2. Obtener contactos para cada etapa filtrando por Tag si existe
        for etapa in etapas:
            if etapa['tag_id']:
                # Si la columna tiene un tag, buscamos contactos con ese tag
                cursor.execute("""
                    SELECT c.id, c.nombre, c.telefono, c.ultimo_mensaje 
                    FROM contactos c
                    INNER JOIN dispositivos d ON d.id = c.dispositivo_id
                    INNER JOIN contactos_tags ct ON ct.contacto_id = c.id
                    WHERE ct.tag_id = %s AND d.usuario_id = %s
                """, (etapa['tag_id'], current_user_id))
            else:
                # Si no tiene tag, buscamos contactos asignados a esa etapa_id (retrocompatibilidad)
                cursor.execute("""
                    SELECT c.id, c.nombre, c.telefono, c.ultimo_mensaje 
                    FROM contactos c
                    INNER JOIN dispositivos d ON d.id = c.dispositivo_id
                    WHERE c.etapa_id = %s AND d.usuario_id = %s
                """, (etapa['id'], current_user_id))
            etapa['items'] = cursor.fetchall()

        return jsonify({"success": True, "columns": etapas, "tablero_id": tablero_id})
    except Exception as e:
        logger.error(f"ERROR KANBAN DETECTADO: {str(e)}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/kanban/etapas/<int:etapa_id>/tag', methods=['PUT'])
@jwt_required()
def update_stage_tag(etapa_id):
    user_id = get_jwt_identity()
    data = request.json
    tag_id = data.get('tag_id') # Puede ser None para desvincular
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "UPDATE etapas SET tag_id = %s WHERE id = %s AND usuario_id = %s",
            (tag_id, etapa_id, user_id)
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/kanban/etapas', methods=['POST'])
@jwt_required()
def create_stage():
    user_id = get_jwt_identity()
    data = request.json
    tablero_id = data.get('tablero_id')
    nombre = data.get('nombre')
    tag_id = data.get('tag_id')
    
    if not tablero_id or not nombre:
        return jsonify({"success": False, "message": "Tablero y nombre requeridos"}), 400
        
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Obtener el último orden
        cursor.execute("SELECT MAX(orden) FROM etapas WHERE tablero_id = %s", (tablero_id,))
        max_order = cursor.fetchone()[0] or 0
        
        cursor.execute(
            "INSERT INTO etapas (tablero_id, usuario_id, nombre, tag_id, orden) VALUES (%s, %s, %s, %s, %s)",
            (tablero_id, user_id, nombre, tag_id, max_order + 1)
        )
        conn.commit()
        return jsonify({"success": True, "id": cursor.lastrowid})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/kanban/etapas/<int:id>', methods=['DELETE'])
@jwt_required()
def delete_stage(id):
    user_id = get_jwt_identity()
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM etapas WHERE id = %s AND usuario_id = %s", (id, user_id))
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()

@app.route('/api/kanban/move', methods=['POST'])
@jwt_required()
def move_contact_kanban():
    data = request.json
    contact_id = data.get('contactId')
    target_stage_id = data.get('targetStageId')
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        # Actualizamos la etapa del contacto
        cursor.execute(
            "UPDATE contactos SET etapa_id = %s WHERE id = %s",
            (target_stage_id, contact_id)
        )
        conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()



# =====================================================================
# MOTOR DE EJECUCIÓN DE AUTOMATIZACIONES
# =====================================================================

def send_bridge_audio(device_id, jid, file_path_or_url, is_ptt=True):
    """Envía un archivo de audio a través del bridge de WhatsApp."""
    bridge_port = 5000 + (int(device_id) % 1000)
    url = f"http://127.0.0.1:{bridge_port}/send"
    payload = {
        "jid": jid,
        "type": "audio",
        "url": file_path_or_url,
        "mimetype": "audio/mp4" if str(file_path_or_url).endswith(".m4a") else "audio/mpeg",
        "ptt": is_ptt
    }
    try:
        res = requests.post(url, json=payload, timeout=30)
        return res.json()
    except Exception as e:
        logger.error(f"Error enviando audio por el bridge en puerto {bridge_port}: {e}")
        return {"error": str(e)}

def send_bridge_media(device_id, jid, file_url, media_type, filename=None):
    """Envía un archivo multimedia (imagen, video, documento, audio) a través del bridge."""
    bridge_port = 5000 + (int(device_id) % 1000)
    url = f"http://127.0.0.1:{bridge_port}/send"
    
    mtype = "document"
    url_lower = str(file_url).lower()
    type_lower = str(media_type).lower()
    
    if "imagen" in type_lower or "image" in type_lower or url_lower.endswith((".jpg", ".jpeg", ".png", ".webp")):
        mtype = "image"
    elif "video" in type_lower or url_lower.endswith((".mp4", ".avi", ".mov", ".3gp")):
        mtype = "video"
    elif "audio" in type_lower or url_lower.endswith((".mp3", ".wav", ".ogg", ".m4a")):
        mtype = "audio"
        
    payload = {
        "jid": jid,
        "type": mtype,
        "url": file_url
    }
    if mtype == "document" and filename:
        payload["filename"] = filename
        
    try:
        res = requests.post(url, json=payload, timeout=30)
        return res.json()
    except Exception as e:
        logger.error(f"Error enviando media {mtype} por el bridge en puerto {bridge_port}: {e}")
        return {"error": str(e)}

def send_bridge_message(device_id, jid, text, is_command=False):
    """Envía un mensaje o comando a través del bridge de WhatsApp o Meta Cloud API."""
    import json as _json_module
    import urllib.request as _urllib_req

    conn = None
    cursor = None
    is_cloud = False
    meta_token = None
    meta_phone_id = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            "SELECT color, meta_access_token, meta_phone_number_id FROM dispositivos WHERE id = %s LIMIT 1",
            (device_id,)
        )
        dev_row = cursor.fetchone()
        if dev_row:
            is_cloud = (dev_row.get("color") == "cloud")
            meta_token = dev_row.get("meta_access_token")
            meta_phone_id = dev_row.get("meta_phone_number_id")
    except Exception as db_err:
        logger.error(f"Error consultando dispositivo en send_bridge_message: {db_err}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

    if is_cloud:
        if not meta_token or not meta_phone_id:
            logger.error(f"Error: Credenciales de Meta Cloud API incompletas para dispositivo {device_id}")
            return {"error": "Credenciales de Meta incompletas"}
        
        recipient_phone = jid.split("@")[0]
        meta_url = f"https://graph.facebook.com/v18.0/{meta_phone_id}/messages"
        headers = {
            "Authorization": f"Bearer {meta_token}",
            "Content-Type": "application/json"
        }
        
        payload_meta = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": recipient_phone,
            "type": "text",
            "text": {
                "body": text
            }
        }
        
        try:
            data = _json_module.dumps(payload_meta).encode("utf-8")
            req = _urllib_req.Request(meta_url, data=data, headers=headers, method="POST")
            with _urllib_req.urlopen(req, timeout=15) as response:
                res_body = _json_module.loads(response.read().decode())
                wamid = res_body.get("messages", [{}])[0].get("id")
                return {"success": True, "messageId": wamid}
        except Exception as e:
            logger.error(f"Error enviando mensaje vía Meta Cloud API en send_bridge_message: {e}")
            return {"error": str(e)}

    # COMPORTAMIENTO ORIGINAL PARA PUENTE QR
    bridge_port = 5000 + (device_id % 1000)
    url = f"http://127.0.0.1:{bridge_port}/send"
    
    if is_command and text == "/getgroupinfo":
        payload = {"jid": jid, "type": "group_metadata"}
    else:
        payload = {"jid": jid, "text": text}
        
    try:
        data = _json_module.dumps(payload).encode("utf-8")
        req = _urllib_req.Request(url, data=data, headers={'Content-Type': 'application/json'}, method="POST")
        with _urllib_req.urlopen(req, timeout=15) as response:
            return _json_module.loads(response.read().decode())
    except Exception as e:
        logger.error(f"Error enviando comando/mensaje al bridge en puerto {bridge_port}: {e}")
        return {"error": str(e)}

def call_llm_api(prompt, label, openai_key, gemini_key, nvidia_key, model_override=None, return_errors=False):
    """
    Realiza una consulta a los modelos de lenguaje configurados (NVIDIA NIM, Gemini, OpenAI)
    siguiendo la prioridad estándar o el modelo solicitado por model_override.
    """
    response_text = ""
    errors = []
    
    # Escribir el prompt a un archivo temporal para depuración
    try:
        debug_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "scratch", "last_prompt.txt")
        os.makedirs(os.path.dirname(debug_path), exist_ok=True)
        with open(debug_path, "w", encoding="utf-8") as f:
            f.write(f"--- LABEL: {label} ---\n")
            f.write(prompt)
    except Exception as e_debug:
        pass

    
    # Determinar orden de prioridad según model_override
    # Gemini primero (mejor calidad y ahora activo), luego NVIDIA, luego OpenAI
    priority = ["gemini", "nvidia", "openai"]
    if model_override:
        m_lower = str(model_override).lower()
        if "gemini" in m_lower and gemini_key:
            priority = ["gemini", "nvidia", "openai"]
        elif ("gpt" in m_lower or "openai" in m_lower) and openai_key:
            priority = ["openai", "gemini", "nvidia"]
        elif ("nvidia" in m_lower or "llama" in m_lower) and nvidia_key:
            priority = ["nvidia", "gemini", "openai"]
            
    # Intentar los proveedores en el orden determinado
    for provider in priority:
        if response_text:
            break
            
        if provider == "nvidia":

            if not nvidia_key:
                errors.append("NVIDIA: API Key no configurada en el servidor.")
                continue
            try:
                # Usar modelo específico si el override contiene el nombre completo del modelo de nvidia
                model_name = "meta/llama-3.1-8b-instruct"
                if model_override and "/" in str(model_override):
                    model_name = model_override
                headers = {

                    "Authorization": f"Bearer {nvidia_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1000,
                    "temperature": 0.3
                }
                r = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers, timeout=35)
                if r.status_code == 200:
                    res_json = r.json()
                    response_text = res_json['choices'][0]['message']['content']
                    logger.info(f"{label} (NVIDIA NIM - {model_name}): Exitosa")
                elif r.status_code == 429:
                    err_msg = "NVIDIA: Límite de velocidad (429 Rate Limit) alcanzado."
                    logger.warning(f"{err_msg} en {label}")
                    errors.append(err_msg)
                else:
                    err_msg = f"NVIDIA: Error {r.status_code} - {r.text[:120]}"
                    logger.error(f"Error consultando NVIDIA API en {label}: {r.status_code} - {r.text[:200]}")
                    errors.append(err_msg)
            except Exception as e:
                err_msg = f"NVIDIA: Excepción - {str(e)}"
                logger.error(f"Error consultando NVIDIA API en {label}: {e}")
                errors.append(err_msg)
                
        elif provider == "gemini":
            if not gemini_key:
                errors.append("Gemini: API Key no configurada en el servidor.")
                continue
            try:
                model_name = "gemini-2.5-flash"
                if model_override and "gemini" in str(model_override).lower():
                    model_name = model_override
                payload = {
                    "contents": [
                        {
                            "parts": [{"text": prompt}]
                        }
                    ],
                    "generationConfig": {
                        "temperature": 0.3,
                        "maxOutputTokens": 8000
                    }
                }
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={gemini_key}"
                r = requests.post(api_url, json=payload, timeout=25)
                if r.status_code == 200:
                    res_json = r.json()
                    response_text = res_json['candidates'][0]['content']['parts'][0]['text']
                    logger.info(f"{label} (Gemini - {model_name}): Exitosa")
                elif r.status_code == 429:
                    err_msg = "Gemini: Límite de velocidad o cuota diaria agotada (429)."
                    logger.warning(f"{err_msg} en {label}: {r.text[:120]}")
                    errors.append(err_msg)
                else:
                    # Chequear si es el error de activación de API común
                    res_text = r.text
                    if "API_KEY_INVALID" in res_text:
                        err_msg = "Gemini: API Key inválida."
                    elif "generativelanguage.googleapis.com" in res_text:
                        err_msg = "Gemini: API 'Generative Language' no habilitada en tu cuenta de Google."
                    else:
                        err_msg = f"Gemini: Error {r.status_code} - {res_text[:120]}"
                    logger.error(f"Error consultando Gemini API en {label}: {r.status_code} - {res_text[:200]}")
                    errors.append(err_msg)
            except Exception as e:
                err_msg = f"Gemini: Excepción - {str(e)}"
                logger.error(f"Error consultando Gemini API en {label}: {e}")
                errors.append(err_msg)
                
        elif provider == "openai":
            if not openai_key:
                errors.append("OpenAI: API Key no configurada en el servidor.")
                continue
            try:
                model_name = "gpt-4o-mini"
                if model_override and ("gpt" in str(model_override).lower() or "o1" in str(model_override).lower()):
                    model_name = model_override
                headers = {
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": model_name,
                    "messages": [{"role": "user", "content": prompt}],
                    "max_tokens": 1000,
                    "temperature": 0.3
                }
                r = requests.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=25)
                if r.status_code == 200:
                    res_json = r.json()
                    response_text = res_json['choices'][0]['message']['content']
                    logger.info(f"{label} (OpenAI - {model_name}): Exitosa")
                elif r.status_code == 429:
                    err_msg = "OpenAI: Límite de velocidad o saldo agotado (429)."
                    errors.append(err_msg)
                else:
                    err_msg = f"OpenAI: Error {r.status_code} - {r.text[:120]}"
                    logger.error(f"Error consultando OpenAI API en {label}: {r.status_code} - {r.text}")
                    errors.append(err_msg)
            except Exception as e:
                err_msg = f"OpenAI: Excepción - {str(e)}"
                logger.error(f"Error consultando OpenAI API en {label}: {e}")
                errors.append(err_msg)
                
    if return_errors:
        return response_text, errors
    return response_text


def get_automation_smart_trigger(auto):
    """
    Determina si la automatizacion tiene activo el disparador inteligente de IA.
    """
    try:
        nodos = auto.get("nodos", [])
        if isinstance(nodos, str):
            nodos = json.loads(nodos)
        if not isinstance(nodos, list):
            return False
        trigger_node = next((n for n in nodos if n.get("type") == "triggerNode"), None)
        if trigger_node:
            config = trigger_node.get("data", {}).get("config", {})
            return bool(config.get("smart_trigger"))
    except Exception as e:
        logger.error(f"Error parseando smart_trigger: {e}")
    return False

def match_smart_trigger_ai(disparador, texto_recibido, user_id=None):
    """
    Valida semánticamente si el mensaje del usuario coincide con la palabra clave
    usando NVIDIA NIM (meta/llama-3.1-8b-instruct) y fallbacks a Gemini y OpenAI.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")

    if not nvidia_key and not gemini_key and not openai_key:
        logger.warning("No hay ninguna API key de IA configurada para disparador inteligente. Usando coincidencia exacta.")
        return disparador.strip().lower() in texto_recibido.strip().lower()

    system_prompt = (
        "Eres un clasificador de intención semántica experto para un sistema de automatización en español.\n"
        "Tu tarea es decidir si el mensaje del usuario final tiene una intención de buscar o preguntar por el concepto representado por la palabra o frase clave.\n"
        "Responde únicamente con \"SI\" o \"NO\" (sin puntuación, sin explicación, sin texto adicional).\n\n"
        f"Palabra/Frase Clave: \"{disparador}\"\n\n"
        "Ejemplos:\n"
        "Clave: \"precio\"\n"
        "Mensaje: \"¿Cuánto vale esto?\" -> SI\n"
        "Mensaje: \"quiero saber el costo\" -> SI\n"
        "Mensaje: \"hola\" -> NO\n"
        "Mensaje: \"presio\" -> SI\n"
        "Mensaje: \"me das info de precios\" -> SI\n"
        "Mensaje: \"cuanto cuesta\" -> SI\n\n"
        "Clave: \"ubicación\"\n"
        "Mensaje: \"¿Dónde están ubicados?\" -> SI\n"
        "Mensaje: \"como llego\" -> SI\n"
        "Mensaje: \"dirección por favor\" -> SI\n"
        "Mensaje: \"hola qué tal\" -> NO\n"
    )

    user_message = f"Clave: \"{disparador}\"\nMensaje: \"{texto_recibido}\" ->"

    response_text = ""

    # A. NVIDIA NIM API
    if nvidia_key:
        try:
            headers = {
                "Authorization": f"Bearer {nvidia_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "meta/llama-3.1-8b-instruct",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "max_tokens": 10,
                "temperature": 0.1
            }
            r = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers, timeout=10)
            if r.status_code == 200:
                res_json = r.json()
                response_text = res_json['choices'][0]['message']['content'].strip()
                logger.info(f"Smart Trigger AI (NVIDIA): '{disparador}' vs '{texto_recibido}' -> '{response_text}'")
            else:
                logger.error(f"Error consultando NVIDIA API: {r.status_code} - {r.text}")
        except Exception as e:
            logger.error(f"Error consultando NVIDIA API: {e}")

    # B. Gemini API Fallback
    if gemini_key and not response_text:
        try:
            payload = {
                "contents": [
                    {
                        "parts": [
                            {"text": system_prompt},
                            {"text": f"Usuario: {user_message}"}
                        ]
                    }
                ]
            }
            api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
            r = requests.post(api_url, json=payload, timeout=10)
            if r.status_code == 200:
                res_json = r.json()
                response_text = res_json['candidates'][0]['content']['parts'][0]['text'].strip()
                logger.info(f"Smart Trigger AI (Gemini): '{disparador}' vs '{texto_recibido}' -> '{response_text}'")
        except Exception as e:
            logger.error(f"Error consultando Gemini API: {e}")

    # C. OpenAI API Fallback
    if openai_key and not response_text:
        try:
            headers = {
                "Authorization": f"Bearer {openai_key}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_message}
                ],
                "max_tokens": 10,
                "temperature": 0.1
            }
            r = requests.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=10)
            if r.status_code == 200:
                res_json = r.json()
                response_text = res_json['choices'][0]['message']['content'].strip()
                logger.info(f"Smart Trigger AI (OpenAI): '{disparador}' vs '{texto_recibido}' -> '{response_text}'")
        except Exception as e:
            logger.error(f"Error consultando OpenAI API: {e}")

    if response_text:
        cleaned_response = response_text.upper()
        if "SI" in cleaned_response or "SÍ" in cleaned_response:
            return True
        elif "NO" in cleaned_response:
            return False

    return disparador.strip().lower() in texto_recibido.strip().lower()

def match_multiple_choice_ai(options, user_response, question_text=""):
    """
    Usa IA y diccionario inteligente en español para validar la respuesta del usuario en un nodo de Pregunta Múltiple
    cuando el usuario responde con lenguaje natural (ej: 'negativo', 'quiero el de yanbal', 'por supuesto').
    Retorna la opción (dict) que coincide o None.
    """
    try:
        resp_clean = user_response.strip().lower()

        # 1. Reglas directas de sinónimos en español para respuestas afirmativas o negativas
        affirmative_words = ["si", "sí", "sip", "sii", "claro", "por supuesto", "afirmativo", "de una", "confirmo", "obvio", "acepto", "ok", "dame"]
        negative_words = ["no", "nop", "noo", "negativo", "cancelar", "ninguno", "para nada", "paso", "rechazo", "jamás"]

        for opt in options:
            label_clean = opt.get("label", "").strip().lower()
            if label_clean in ["si", "sí", "si, por favor", "si por favor", "acepto", "afirmativo"]:
                if any(w == resp_clean or resp_clean.startswith(w) for w in affirmative_words):
                    logger.info(f"Coincidencia directa afirmativa: '{user_response}' -> opción '{opt.get('label')}'")
                    return opt
            elif label_clean in ["no", "no, gracias", "no gracias", "cancelar", "rechazar", "negativo"]:
                if any(w == resp_clean or resp_clean.startswith(w) for w in negative_words):
                    logger.info(f"Coincidencia directa negativa: '{user_response}' -> opción '{opt.get('label')}'")
                    return opt

        # 2. Si no es un sinónimo directo, consultar modelos de IA (NVIDIA / Gemini / OpenAI)
        openai_key = os.getenv("OPENAI_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")
        nvidia_key = os.getenv("NVIDIA_API_KEY")
        
        if not nvidia_key and not gemini_key and not openai_key:
            return None

        labels = [opt.get("label", "").strip() for opt in options]
        prompt = (
            "Eres un clasificador de respuestas de opción múltiple en español para un chatbot de automatización.\n"
            f"Pregunta realizada: \"{question_text}\"\n"
            f"Opciones disponibles:\n" + "\n".join([f"{i+1}. {lbl}" for i, lbl in enumerate(labels)]) + "\n\n"
            f"Respuesta recibida del usuario: \"{user_response}\"\n\n"
            "Tu objetivo es identificar cuál número de opción (1, 2, 3...) eligió o quiso decir el usuario.\n"
            "Responde ÚNICAMENTE con el número entero correspondiente (por ejemplo: 1, 2 o 3). "
            "Si la respuesta no tiene relación con ninguna opción, responde '0'."
        )

        resp_text = None

        if nvidia_key:
            try:
                headers = {"Authorization": f"Bearer {nvidia_key}", "Content-Type": "application/json"}
                payload = {
                    "model": "meta/llama-3.1-8b-instruct",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 10
                }
                r = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers, timeout=5)
                if r.status_code == 200:
                    resp_text = r.json()['choices'][0]['message']['content'].strip()
            except Exception as e:
                logger.error(f"Error NVIDIA NIM en AI validation: {e}")

        if gemini_key and not resp_text:
            try:
                payload = {"contents": [{"parts": [{"text": prompt}]}]}
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
                r = requests.post(api_url, json=payload, timeout=5)
                if r.status_code == 200:
                    resp_text = r.json()['candidates'][0]['content']['parts'][0]['text'].strip()
            except Exception as e:
                logger.error(f"Error Gemini en AI validation: {e}")

        if openai_key and not resp_text:
            try:
                headers = {"Authorization": f"Bearer {openai_key}", "Content-Type": "application/json"}
                payload = {
                    "model": "gpt-3.5-turbo",
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.1,
                    "max_tokens": 10
                }
                r = requests.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=5)
                if r.status_code == 200:
                    resp_text = r.json()['choices'][0]['message']['content'].strip()
            except Exception as e:
                logger.error(f"Error OpenAI en AI validation: {e}")

        if resp_text:
            import re
            match = re.search(r'\b([1-9]\d*)\b', resp_text)
            if match:
                idx = int(match.group(1)) - 1
                if 0 <= idx < len(options):
                    logger.info(f"Validar con IA: '{user_response}' emparejado con opción #{idx+1} ({options[idx].get('label')})")
                    return options[idx]
    except Exception as err:
        logger.error(f"Excepción en match_multiple_choice_ai: {err}")
    return None

def auto_mark_message_read(cursor, conn, user_id, device_id, chat_jid, message_id):
    """
    Marca automáticamente el mensaje como leído tanto en la base de datos como
    enviando la señal de lectura (read receipt) al bridge de WhatsApp.
    """
    try:
        # 1. Poner a 0 mensajes sin leer en la base de datos
        cursor.execute(
            "UPDATE contactos SET mensajes_sin_leer = 0, actualizado_en = NOW() WHERE jid = %s AND dispositivo_id = %s",
            (chat_jid, device_id)
        )
        cursor.execute(
            "UPDATE chats SET mensajes_sin_leer = 0, actualizado_en = NOW() WHERE jid = %s AND dispositivo_id = %s",
            (chat_jid, device_id)
        )
        cursor.execute(
            "UPDATE grupos SET mensajes_sin_leer = 0, actualizado_en = NOW() WHERE jid = %s AND dispositivo_id = %s",
            (chat_jid, device_id)
        )
        conn.commit()

        # 2. Enviar recibo de lectura al bridge
        if message_id:
            read_payload = {
                "jid": chat_jid,
                "messageId": message_id
            }
            # Lanzamos con un timeout muy bajo para no retrasar el webhook
            post_bridge_json(device_id, "/read", read_payload, timeout=2, user_id=user_id)
            
        # 3. Notificar al frontend via SSE
        event = {
            "event_type": "chat-update",
            "user_id": user_id,
            "device_id": device_id,
            "data": {
                "jid": chat_jid,
                "unread_count": 0,
                "source": "mark-read"
            }
        }
        publish_whatsapp_event(event)
    except Exception as e:
        logger.error(f"Error en auto_mark_message_read: {e}")

def execute_automation_flow(user_id, device_id, automation, chat_jid, contact_name="amigo", start_node_id=None, response_text=None):
    """Ejecuta el flujo de una automatización desde el inicio o desde un nodo específico."""
    try:
        nodos = automation.get("nodos", [])
        if isinstance(nodos, str): nodos = json.loads(nodos)
        conexiones = automation.get("conexiones", [])
        if isinstance(conexiones, str): conexiones = json.loads(conexiones)

        current_node_id = start_node_id
        is_resuming = False

        if not current_node_id:
            trigger_node = next((n for n in nodos if n.get("type") == "triggerNode"), None)
            if not trigger_node:
                logger.error(f"Auto {automation.get('id')}: No se encontró nodo de disparo")
                return
            current_node_id = trigger_node.get("id")

            # Registrar la ejecución de la automatización en la base de datos
            try:
                with get_connection() as conn_log:
                    with conn_log.cursor() as cursor_log:
                        cursor_log.execute(
                            "INSERT INTO registros_automatizacion (automatizacion_id, contacto_jid, dispositivo_id, ejecutado_en) VALUES (%s, %s, %s, NOW())",
                            (automation.get("id"), chat_jid, device_id)
                        )
                        conn_log.commit()
                        logger.info(f"Registro de ejecución contador guardado para automatización ID {automation.get('id')}")
            except Exception as log_err:
                logger.error(f"Error registrando contador de ejecución: {log_err}")
        else:
            is_resuming = True

        while current_node_id:
            node = next((n for n in nodos if n.get("id") == current_node_id), None)
            if not node: break
            
            node_type = node.get("type")
            node_data = node.get("data", {})

            # LOGICA DE REANUDACION (Si venimos de una respuesta a una pregunta)
            if is_resuming:
                is_resuming = False
                
                # 1. Guardar la respuesta si el nodo lo pedia (Simple o Multiple)
                save_to = node_data.get("saveIn")
                if save_to and response_text:
                    try:
                        with get_connection() as conn:
                            with conn.cursor(dictionary=True) as cursor:
                                standard_fields = {'nombre': 'nombre', 'correo': 'correo', 'email': 'correo', 'empresa': 'empresa'}
                                f_lower = save_to.lower()
                                if f_lower in standard_fields:
                                    col = standard_fields[f_lower]
                                    cursor.execute(f"UPDATE contactos SET {col} = %s WHERE jid = %s AND dispositivo_id = %s", (response_text, chat_jid, device_id))
                                else:
                                    cursor.execute("""
                                        INSERT INTO contacto_campos_customizados (contacto_id, campo_id, valor)
                                        SELECT c.id, f.id, %s
                                        FROM contactos c, campos_customizados f
                                        WHERE c.jid = %s AND c.dispositivo_id = %s AND f.nombre = %s AND f.usuario_id = %s
                                        ON DUPLICATE KEY UPDATE valor = VALUES(valor)
                                    """, (response_text, chat_jid, device_id, save_to, user_id))
                                conn.commit()
                    except Exception as e:
                        logger.error(f"Error guardando respuesta en campo {save_to}: {e}")

                    # Actualizar contact_name en memoria si se guardó el nombre
                    if save_to.lower() in ('nombre', 'name') and response_text:
                        contact_name = response_text

                # 2. Decidir el camino para preguntas múltiples
                if node_type == 'multipleChoiceNode' and response_text:
                    options = node_data.get("options", [])
                    chosen_opt_id = None
                    resp_clean = response_text.strip().lower()
                    
                    # 1. Buscar por texto exacto
                    for opt in options:
                        if opt.get("label", "").strip().lower() == resp_clean:
                            chosen_opt_id = opt.get("id")
                            break
                    
                    # 2. Si no, buscar por índice (1, 2, 3...)
                    if not chosen_opt_id:
                        try:
                            idx = int(resp_clean) - 1
                            if 0 <= idx < len(options):
                                chosen_opt_id = options[idx].get("id")
                        except: pass

                    # 3. Emparejar semánticamente con sinónimos e IA
                    if not chosen_opt_id:
                        matched_opt = match_multiple_choice_ai(options, response_text, node_data.get("question", ""))
                        if matched_opt:
                            chosen_opt_id = matched_opt.get("id")
                    
                    if chosen_opt_id:
                        edge = next((e for e in conexiones if e.get("source") == current_node_id and e.get("sourceHandle") == chosen_opt_id), None)
                        if edge:
                            current_node_id = edge.get("target")
                            continue
                    
                    # Si era pregunta múltiple y ninguna opción coincidió, NUNCA ejecutar el camino por defecto (Opción 1)
                    logger.warning(f"Pregunta Múltiple ({current_node_id}): La respuesta '{response_text}' no coincidió con ninguna opción disponible. Deteniendo flujo.")
                    break
                
                # Para pregunta simple o si no hubo match en múltiple, solo seguimos el primer camino
                edge = next((e for e in conexiones if e.get("source") == current_node_id), None)
                if not edge: break
                current_node_id = edge.get("target")
                continue

            # LOGICA DE EJECUCION DE NODOS NORMALES
            # LOGICA DE EJECUCION DE NODOS NORMALES
            if node_type == 'sendMessageNode':
                blocks = node_data.get("blocks") or []
                for block in blocks:
                    msg_text = (block.get("text") or "")
                    # Reemplazo robusto de nombres
                    for tag in ["{nombre}", "{amigo}", "{Frosdh}"]:
                        msg_text = msg_text.replace(tag, contact_name)
                    # Limpiar posibles llaves dobles o residuales {{nombre}} -> Wendy
                    msg_text = msg_text.replace(f"{{{contact_name}}}", contact_name)
                    
                    # Limpiar espacios en negritas
                    if "*" in msg_text:
                        import re
                        msg_text = re.sub(r'\*\s+', '*', msg_text)
                        msg_text = re.sub(r'\s+\*', '*', msg_text)

                    if block.get("key") == "Texto" and msg_text:
                        send_bridge_message(device_id, chat_jid, msg_text)
                    
                    elif block.get("key") in ["Multimedia", "Audio", "Documento"]:
                        media_url = block.get("url")
                        if media_url:
                            public_url = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
                            full_media_url = media_url
                            
                            if media_url.startswith("http://") or media_url.startswith("https://"):
                                full_media_url = media_url
                            elif "/media/" in media_url:
                                clean_path = media_url.split("/media/", 1)[1].lstrip("/")
                                local_path = os.path.join(app.config['UPLOAD_FOLDER'], *clean_path.split('/'))
                                if os.path.isfile(local_path):
                                    full_media_url = local_path
                                elif public_url:
                                    full_media_url = f"{public_url}/{clean_path}"
                            elif media_url.startswith('/'):
                                clean_path = media_url.replace('/media/', '', 1).replace('media/', '', 1).lstrip('/')
                                local_path = os.path.join(app.config['UPLOAD_FOLDER'], *clean_path.split('/'))
                                if os.path.isfile(local_path):
                                    full_media_url = local_path
                                elif public_url:
                                    full_media_url = f"{public_url}/{clean_path}"
                            
                            ext = (media_url.split('.')[-1] or "").lower()
                            m_type = "image"
                            if any(v in ext for v in ["mp4", "m4v", "mov", "webm"]): m_type = "video"
                            elif ext == "pdf" or block.get("key") == "Documento": m_type = "document"
                            elif any(v in ext for v in ["mp3", "ogg", "wav"]) or block.get("key") == "Audio": m_type = "audio"
                            
                            payload = {
                                "jid": chat_jid, "url": full_media_url, "type": m_type,
                                "caption": msg_text, "text": msg_text,
                                "filename": block.get("fileName") or "archivo"
                            }
                            bridge_port = 5000 + (device_id % 1000)
                            try: requests.post(f"http://127.0.0.1:{bridge_port}/send", json=payload, timeout=30)
                            except: pass

                    elif block.get("key") == "Contacto":
                        phone = block.get("contactPhone")
                        if phone:
                            payload = {
                                "jid": chat_jid, "type": "contact",
                                "contactName": block.get("contactName") or "Contacto",
                                "contactPhone": phone
                            }
                            bridge_port = 5000 + (device_id % 1000)
                            try: requests.post(f"http://127.0.0.1:{bridge_port}/send", json=payload, timeout=30)
                            except: pass

                    delay = 3
                    try: delay = int(block.get("delay") or 3)
                    except: pass
                    time.sleep(max(1, delay))

            elif node_type == 'questionNode':
                logger.info(f"Auto {automation.get('id')}: Nodo de PREGUNTA alcanzado ({current_node_id})")
                q_text = node_data.get("question", "")
                for tag in ["{nombre}", "{amigo}", "{Frosdh}"]:
                    q_text = q_text.replace(tag, contact_name)
                q_text = q_text.replace(f"{{{contact_name}}}", contact_name)

                # Limpiar espacios en negritas
                if "*" in q_text:
                    import re
                    q_text = re.sub(r'\*\s+', '*', q_text)
                    q_text = re.sub(r'\s+\*', '*', q_text)
                send_bridge_message(device_id, chat_jid, q_text)
            
            elif node_type == 'multipleChoiceNode':
                logger.info(f"Auto {automation.get('id')}: Nodo de OPCION MULTIPLE alcanzado ({current_node_id})")
                q_text = node_data.get("question", "")
                for tag in ["{nombre}", "{amigo}", "{Frosdh}"]:
                    q_text = q_text.replace(tag, contact_name)
                q_text = q_text.replace(f"{{{contact_name}}}", contact_name)

                # Limpiar espacios en negritas
                if "*" in q_text:
                    import re
                    q_text = re.sub(r'\*\s+', '*', q_text)
                    q_text = re.sub(r'\s+\*', '*', q_text)

                
                opts = node_data.get("options", [])
                
                # Formatear lista de texto (Ahora la enviamos SIEMPRE para asegurar que el cliente vea las opciones)
                opciones_texto = "\n".join([f"{i+1}. {opt.get('label')}" for i, opt in enumerate(opts)])
                mensaje_completo = f"{q_text}\n\n{opciones_texto}"

                # Intentar enviar botones (el texto del mensaje ahora incluye la lista)
                payload = {
                    "jid": chat_jid,
                    "type": "buttons",
                    "text": mensaje_completo,
                    "footer": "Selecciona una opción",
                    "buttons": [{"id": opt.get("id"), "label": opt.get("label")} for opt in opts]
                }

                bridge_port = 5000 + (device_id % 1000)
                try:
                    resp = requests.post(f"http://127.0.0.1:{bridge_port}/send", json=payload, timeout=20)
                    if resp.status_code != 200:
                        send_bridge_message(device_id, chat_jid, mensaje_completo)
                except Exception as e:
                    logger.error(f"Error enviando botones: {e}")
                    send_bridge_message(device_id, chat_jid, mensaje_completo)

                
            elif node_type == 'waitNode':
                w_type = node_data.get("waitType")
                w_val = node_data.get("waitValue")
                
                seconds_to_wait = 0
                
                try:
                    if w_type == 'minutos':
                        seconds_to_wait = int(w_val) * 60
                    elif w_type == 'horas':
                        seconds_to_wait = int(w_val) * 3600
                    elif w_type == 'dias':
                        seconds_to_wait = int(w_val) * 86400
                    elif w_type == 'fecha':
                        # Formato esperado: YYYY-MM-DDTHH:MM
                        target_dt = datetime.fromisoformat(w_val)
                        diff = (target_dt - datetime.now()).total_seconds()
                        seconds_to_wait = max(0, diff)
                    elif w_type == 'hora_especifica':
                        # Formato esperado: HH:MM
                        now = datetime.now()
                        h, m = map(int, w_val.split(':'))
                        target_dt = now.replace(hour=h, minute=m, second=0, microsecond=0)
                        if target_dt < now:
                            target_dt += timedelta(days=1)
                        seconds_to_wait = (target_dt - now).total_seconds()
                    elif w_type == 'dia_semana':
                        # w_val es una lista ['Lun', 'Mar', ...]
                        dias_map = {'Lun': 0, 'Mar': 1, 'Mie': 2, 'Jue': 3, 'Vie': 4, 'Sab': 5, 'Dom': 6}
                        now = datetime.now()
                        current_day = now.weekday()
                        
                        target_days = [dias_map[d] for d in w_val if d in dias_map]
                        if target_days:
                            # Buscar el próximo día disponible
                            days_diff = min([(d - current_day) % 7 for d in target_days])
                            if days_diff == 0:
                                # Si es hoy, pero ya pasó una hora base o queremos que sea al menos mañana?
                                # Por simplicidad, si es hoy, esperamos 0. Si se quiere hora, se usa el otro nodo.
                                days_diff = 0
                            
                            target_dt = (now + timedelta(days=days_diff)).replace(hour=0, minute=0, second=0)
                            if target_dt < now and days_diff == 0:
                                # Si ya pasó la medianoche de hoy, buscar el siguiente día de la lista
                                days_diff = min([(d - current_day) % 7 or 7 for d in target_days])
                                target_dt = (now + timedelta(days=days_diff)).replace(hour=0, minute=0, second=0)
                            
                            seconds_to_wait = (target_dt - now).total_seconds()
                except Exception as e:
                    logger.error(f"Error calculando tiempo de espera: {e}")

                if seconds_to_wait > 0:
                    logger.info(f"Auto {automation.get('id')}: Esperando {seconds_to_wait} segundos en chat {chat_jid}")
                    time.sleep(seconds_to_wait)

            elif node_type == 'actionNode':
                logger.info(f"Auto {automation.get('id')}: Nodo de ACCION alcanzado ({current_node_id})")
                action_type = node_data.get("actionType")
                wa_id = chat_jid.split('@')[0]
                
                if action_type == 'add_tag':
                    tag_id = node_data.get("tagId")
                    logger.info(f"AUTO: Intentando agregar Tag ID {tag_id} a {chat_jid}")
                    if tag_id:
                        try:
                            with get_connection() as conn:
                                with conn.cursor(dictionary=True) as cursor:
                                    cursor.execute("SELECT id FROM contactos WHERE jid = %s AND dispositivo_id = %s", (chat_jid, device_id))
                                    contact = cursor.fetchone()
                                    if contact:
                                        c_id = contact['id']
                                        cursor.execute("SELECT 1 FROM contactos_tags WHERE contacto_id = %s AND tag_id = %s", (c_id, tag_id))
                                        if not cursor.fetchone():
                                            cursor.execute("INSERT INTO contactos_tags (contacto_id, tag_id) VALUES (%s, %s)", (c_id, tag_id))
                                            conn.commit()
                                            logger.info(f"✅ TAG AGREGADO: Contacto {c_id} recibió Tag {tag_id}")
                                            # Disparar automatizaciones vinculadas al tag agregado
                                            trigger_tag_automations(user_id, c_id, tag_id)
                                        else:
                                            logger.info(f"ℹ️ TAG YA EXISTE: Contacto {c_id} ya tenía el Tag {tag_id}")
                                    else:
                                        logger.warning(f"⚠️ CONTACTO NO ENCONTRADO: No se pudo taguear {chat_jid}")
                        except Exception as e:
                            logger.error(f"❌ Error agregando tag en automatizacion: {e}")

                elif action_type == 'remove_tag':
                    tag_id = node_data.get("tagId")
                    if tag_id:
                        try:
                            with get_connection() as conn:
                                with conn.cursor(dictionary=True) as cursor:
                                    cursor.execute("SELECT id FROM contactos WHERE jid = %s AND dispositivo_id = %s", (chat_jid, device_id))
                                    contact = cursor.fetchone()
                                    if contact:
                                        cursor.execute("DELETE FROM contactos_tags WHERE contacto_id = %s AND tag_id = %s", (contact['id'], tag_id))
                                        conn.commit()
                        except Exception as e:
                            logger.error(f"Error quitando tag en automatizacion: {e}")

                elif action_type == 'update_field':
                    field = node_data.get("field")
                    val = node_data.get("value", "")
                    if field and val:
                        # Reemplazar variables
                        val = val.replace("{nombre}", contact_name)
                        if response_text:
                            val = val.replace("{respuesta}", response_text)
                        
                        try:
                            with get_connection() as conn:
                                with conn.cursor(dictionary=True) as cursor:
                                    standard_fields = {'nombre': 'nombre', 'correo': 'correo', 'email': 'correo', 'empresa': 'empresa'}
                                    f_lower = field.lower()
                                    if f_lower in standard_fields:
                                        col = standard_fields[f_lower]
                                        cursor.execute(f"UPDATE contactos SET {col} = %s WHERE jid = %s AND dispositivo_id = %s", (val, chat_jid, device_id))
                                    else:
                                        cursor.execute("""
                                            INSERT INTO contacto_campos_customizados (contacto_id, campo_id, valor)
                                            SELECT c.id, f.id, %s
                                            FROM contactos c, campos_customizados f
                                            WHERE c.jid = %s AND c.dispositivo_id = %s AND f.nombre = %s AND f.usuario_id = %s
                                            ON DUPLICATE KEY UPDATE valor = VALUES(valor)
                                        """, (val, chat_jid, device_id, field, user_id))
                                    conn.commit()
                        except Exception as e:
                            logger.error(f"Error actualizando campo en automatizacion: {e}")
                
            elif node_type == 'assignConversationNode':
                logger.info(f"Auto {automation.get('id')}: Nodo de ASIGNAR CONVERSACION alcanzado ({current_node_id})")
                assignee = node_data.get("assignee")
                
                try:
                    with get_connection() as conn:
                        with conn.cursor(dictionary=True) as cursor:
                            # 'me' significa el usuario administrador creador de la automatización
                            # Otros valores son IDs de agentes humanos
                            agent_id = automation.get("usuario_id") if assignee == 'me' else assignee
                            
                            # Actualizar el contacto
                            cursor.execute("""
                                UPDATE contactos 
                                SET agente_asignado_id = %s 
                                WHERE jid = %s AND dispositivo_id = %s
                            """, (agent_id, chat_jid, device_id))
                            
                            conn.commit()
                            logger.info(f"✅ CONVERSACION ASIGNADA: Contacto {chat_jid} asignado al agente {agent_id}")
                except Exception as e:
                    logger.error(f"❌ Error asignando conversación en automatizacion: {e}")
                
            elif node_type == 'conditionNode':
                logger.info(f"Auto {automation.get('id')}: Nodo de CONDICION alcanzado ({current_node_id})")
                condiciones = node_data.get("condiciones", [])
                match_type = node_data.get("matchType", "all")
                
                # Obtener la zona horaria del usuario de la DB
                user_tz = "America/Guayaquil"
                try:
                    with get_connection() as conn:
                        with conn.cursor(dictionary=True) as cursor:
                            cursor.execute("SELECT zona_horaria FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
                            res = cursor.fetchone()
                            if res and res.get("zona_horaria"):
                                user_tz = res["zona_horaria"].strip()
                except Exception as tz_err:
                    logger.error(f"Error cargando zona horaria: {tz_err}")
                
                import pytz
                from datetime import datetime
                try:
                    tz = pytz.timezone(user_tz)
                    now_local = datetime.now(tz)
                except Exception as tz_err2:
                    logger.error(f"Error parseando zona horaria '{user_tz}': {tz_err2}")
                    tz = pytz.timezone("America/Guayaquil")
                    now_local = datetime.now(tz)
                
                # Obtener tags del contacto
                contact_tags = []
                try:
                    with get_connection() as conn:
                        with conn.cursor(dictionary=True) as cursor:
                            cursor.execute("""
                                SELECT t.id, t.nombre
                                FROM contactos_tags ct
                                INNER JOIN tags t ON t.id = ct.tag_id
                                INNER JOIN contactos c ON c.id = ct.contacto_id
                                WHERE c.jid = %s AND c.dispositivo_id = %s
                            """, (chat_jid, device_id))
                            contact_tags = cursor.fetchall()
                except Exception as tags_err:
                    logger.error(f"Error cargando tags del contacto: {tags_err}")
                
                weekday_map = {
                    0: "Lunes",
                    1: "Martes",
                    2: "Miércoles",
                    3: "Jueves",
                    4: "Viernes",
                    5: "Sábado",
                    6: "Domingo"
                }
                current_day_name = weekday_map.get(now_local.weekday(), "Lunes")
                current_time_str = now_local.strftime("%H:%M")
                
                condition_results = []
                
                for cond in condiciones:
                    c_type = cond.get("type", "tag")
                    operator = cond.get("operator", "es")
                    value = cond.get("value", "")
                    
                    matched = False
                    
                    if c_type == 'tag':
                        has_tag = any(str(t.get("id")) == str(value) for t in contact_tags)
                        if operator == 'es':
                            matched = has_tag
                        elif operator == 'no_es':
                            matched = not has_tag
                            
                    elif c_type == 'dia_semana':
                        if value == "Día siguiente":
                            tomorrow_day_name = weekday_map.get((now_local.weekday() + 1) % 7)
                            is_match = (current_day_name == tomorrow_day_name)
                            if operator == 'es':
                                matched = is_match
                            elif operator == 'no_es':
                                matched = not is_match
                        else:
                            if operator == 'es':
                                matched = (current_day_name == value)
                            elif operator == 'no_es':
                                matched = (current_day_name != value)
                                
                    elif c_type == 'hora':
                        if value:
                            val_clean = ":".join(value.split(":")[:2])
                            if operator == 'antes_de':
                                matched = (current_time_str < val_clean)
                            elif operator == 'despues_de':
                                matched = (current_time_str > val_clean)
                                
                    condition_results.append(matched)
                
                if not condition_results:
                    all_conditions_met = True
                elif match_type == 'any':
                    all_conditions_met = any(condition_results)
                else:
                    all_conditions_met = all(condition_results)
                
                target_handle = "cumple" if all_conditions_met else "no_cumple"
                logger.info(f"AUTO {automation.get('id')}: Evaluadas {len(condiciones)} condiciones con resultado={all_conditions_met} (tipo {match_type}). Siguiente rama: {target_handle}")
                
                edge = next((e for e in conexiones if e.get("source") == current_node_id and e.get("sourceHandle") == target_handle), None)
                if edge:
                    current_node_id = edge.get("target")
                    continue
                else:
                    logger.warning(f"⚠️ Rama '{target_handle}' del nodo de condición {current_node_id} no está conectada.")
                    break
                
            elif node_type == 'startAutomationNode':
                logger.info(f"Auto {automation.get('id')}: Nodo INICIAR AUTOMATIZACION alcanzado ({current_node_id})")
                target_id = node_data.get("targetAutomationId")
                if target_id:
                    try:
                        with get_connection() as conn:
                            with conn.cursor(dictionary=True) as cursor:
                                cursor.execute("SELECT * FROM automatizaciones WHERE id = %s AND usuario_id = %s LIMIT 1", (target_id, user_id))
                                target_auto = cursor.fetchone()
                                if target_auto:
                                    logger.info(f"AUTO {automation.get('id')}: Encadenando con Automatización ID {target_id} para {chat_jid}")
                                    trigger_automation_async(user_id, device_id, target_auto, chat_jid, contact_name)
                                else:
                                    logger.warning(f"⚠️ AUTO: Automatización destino {target_id} no encontrada o no pertenece al usuario {user_id}")
                    except Exception as auto_err:
                        logger.error(f"Error encadenando automatización: {auto_err}")
                break
                
            elif node_type == 'rotatorNode':
                logger.info(f"Auto {automation.get('id')}: Nodo ROTADOR alcanzado ({current_node_id})")
                sel_type = node_data.get("selectionType", "sequential")
                options = node_data.get("options", [])
                
                if not options:
                    logger.warning(f"⚠️ ROTADOR: Nodo {current_node_id} no tiene opciones configuradas.")
                    break
                
                selected_option = None
                
                if sel_type == 'random':
                    import random
                    probs = []
                    for opt in options:
                        try:
                            probs.append(float(opt.get("probability") or 0))
                        except (ValueError, TypeError):
                            probs.append(0.0)
                    total = sum(probs)
                    if total <= 0:
                        selected_option = random.choice(options)
                    else:
                        r = random.uniform(0, total)
                        upto = 0.0
                        selected_option = options[0]
                        for opt, prob in zip(options, probs):
                            if upto + prob >= r:
                                selected_option = opt
                                break
                            upto += prob
                else: # sequential
                    target_index = 0
                    try:
                        with get_connection() as conn:
                            with conn.cursor(dictionary=True) as cursor:
                                cursor.execute("SELECT last_index FROM registros_rotador WHERE automation_id = %s AND node_id = %s", (automation.get("id"), current_node_id))
                                res = cursor.fetchone()
                                if res:
                                    last_index = res["last_index"]
                                    target_index = (last_index + 1) % len(options)
                                else:
                                    target_index = 0
                                
                                cursor.execute("""
                                    INSERT INTO registros_rotador (automation_id, node_id, last_index)
                                    VALUES (%s, %s, %s)
                                    ON DUPLICATE KEY UPDATE last_index = VALUES(last_index)
                                """, (automation.get("id"), current_node_id, target_index))
                                conn.commit()
                    except Exception as db_err:
                        logger.error(f"Error actualizando secuencial rotador: {db_err}")
                    
                    if 0 <= target_index < len(options):
                        selected_option = options[target_index]
                    else:
                        selected_option = options[0]
                
                if selected_option:
                    logger.info(f"AUTO {automation.get('id')}: Rotador eligió Opción '{selected_option.get('label')}' (ID: {selected_option.get('id')}) para {chat_jid}")
                    edge = next((e for e in conexiones if e.get("source") == current_node_id and e.get("sourceHandle") == selected_option.get("id")), None)
                    if edge:
                        current_node_id = edge.get("target")
                        continue
                    else:
                        logger.warning(f"⚠️ Rama '{selected_option.get('id')}' del rotador {current_node_id} no está conectada.")
                        break
                
            elif node_type == 'templateNode':
                logger.info(f"Auto {automation.get('id')}: Nodo TEMPLATE alcanzado ({current_node_id})")
                template_id = node_data.get("templateId")
                
                if template_id:
                    try:
                        with get_connection() as conn:
                            with conn.cursor(dictionary=True) as cursor:
                                cursor.execute("SELECT * FROM plantillas WHERE id = %s AND usuario_id = %s LIMIT 1", (template_id, user_id))
                                template = cursor.fetchone()
                                if template:
                                    msg_text = template.get("cuerpo") or ""
                                    for tag in ["{nombre}", "{amigo}", "{Frosdh}"]:
                                        msg_text = msg_text.replace(tag, contact_name)
                                    msg_text = msg_text.replace(f"{{{contact_name}}}", contact_name)
                                    
                                    if "*" in msg_text:
                                        import re
                                        msg_text = re.sub(r'\*\s+', '*', msg_text)
                                        msg_text = re.sub(r'\s+\*', '*', msg_text)
                                    
                                    if msg_text:
                                        logger.info(f"AUTO {automation.get('id')}: Enviando plantilla ID {template_id} para {chat_jid}")
                                        send_bridge_message(device_id, chat_jid, msg_text)
                                else:
                                    logger.warning(f"⚠️ AUTO: Plantilla {template_id} no encontrada para el usuario {user_id}")
                    except Exception as template_err:
                        logger.error(f"Error procesando plantilla: {template_err}")
                
                edge = next((e for e in conexiones if e.get("source") == current_node_id), None)
                if edge:
                    current_node_id = edge.get("target")
                    continue
                else:
                    break
                
            elif node_type == 'assignAiNode':
                logger.info(f"Auto {automation.get('id')}: Nodo ASIGNAR AGENTE IA alcanzado ({current_node_id})")
                agent_id = node_data.get("agentId")
                if not agent_id:
                    logger.warning(f"⚠️ ASIGNAR AGENTE IA: Nodo {current_node_id} no tiene agente_id configurado.")
                    break
                
                try:
                    with get_connection() as conn:
                        with conn.cursor(dictionary=True) as cursor:
                            cursor.execute("DELETE FROM automatizacion_esperas WHERE contacto_jid = %s", (chat_jid,))
                            
                            opts = {
                                "agent_id": agent_id,
                                "message_count": 0,
                                "assign_ai_node_id": current_node_id
                            }
                            
                            cursor.execute("""
                                INSERT INTO automatizacion_esperas 
                                (usuario_id, contacto_jid, automatizacion_id, nodo_espera_id, campo_destino, tipo_pregunta, opciones_json)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """, (user_id, chat_jid, automation.get('id'), current_node_id, str(agent_id), 'assignAiNode', json.dumps(opts)))
                            conn.commit()
                except Exception as db_err:
                    logger.error(f"Error guardando espera de agente IA en DB: {db_err}")
                
                logger.info(f"Auto {automation.get('id')}: Deteniendo flujo para esperar interacciones de Agente IA {agent_id} en {chat_jid}")
                break
                
            if node_type in ['questionNode', 'multipleChoiceNode']:
                save_in = node_data.get("saveIn")
                opts = node_data.get("options", [])
                
                try:
                    with get_connection() as conn:
                        with conn.cursor(dictionary=True) as cursor:
                            cursor.execute("DELETE FROM automatizacion_esperas WHERE contacto_jid = %s", (chat_jid,))
                            cursor.execute("""
                                INSERT INTO automatizacion_esperas 
                                (usuario_id, contacto_jid, automatizacion_id, nodo_espera_id, campo_destino, tipo_pregunta, opciones_json)
                                VALUES (%s, %s, %s, %s, %s, %s, %s)
                            """, (user_id, chat_jid, automation.get('id'), current_node_id, save_in, node_type, json.dumps(opts)))
                            conn.commit()
                except Exception as db_err: 
                    logger.error(f"Error guardando espera en DB: {db_err}")
                
                logger.info(f"Auto {automation.get('id')}: Deteniendo flujo para esperar respuesta en {chat_jid}")
                break # DETENER SIEMPRE





            is_resuming = False # Solo saltamos el primer nodo si is_resuming era True

            # Buscar siguiente nodo
            edge = next((e for e in conexiones if e.get("source") == current_node_id), None)
            if not edge: break
            current_node_id = edge.get("target")

    except Exception as e:
        logger.error(f"Error en execute_automation_flow: {e}", exc_info=True)

def trigger_automation_async(user_id, device_id, automation, chat_jid, contact_name="amigo", start_node_id=None, response_text=None):
    """Lanza la ejecución del flujo en un hilo separado."""
    import threading
    auto_id = automation.get('id')
    logger.info(f"=== {'REANUDANDO' if start_node_id else 'INICIANDO'} AUTOMATIZACION ID: {auto_id} PARA {chat_jid} ===")
    
    t = threading.Thread(target=execute_automation_flow, args=(user_id, device_id, automation, chat_jid, contact_name, start_node_id, response_text))
    t.daemon = True
    t.start()

def trigger_tag_automations(user_id, contact_id, tag_id):
    """
    Busca y ejecuta asíncronamente las automatizaciones de tipo 'tag_agregado'
    que coincidan con el tag_id y el usuario.
    """
    logger.info(f"Buscando automatizaciones 'tag_agregado' para usuario={user_id}, contacto_id={contact_id}, tag_id={tag_id}")
    try:
        with get_connection() as conn:
            with conn.cursor(dictionary=True) as cursor:
                # 1. Obtener datos del contacto (JID, nombre, etc.)
                cursor.execute("SELECT id, jid, nombre, dispositivo_id FROM contactos WHERE id = %s LIMIT 1", (contact_id,))
                contact = cursor.fetchone()
                if not contact or not contact.get("jid"):
                    logger.warning(f"No se encontró contacto con ID {contact_id} para disparar automatización.")
                    return

                chat_jid = contact["jid"]
                device_id = contact["dispositivo_id"]
                nombre_contacto = contact.get("nombre") or "Cliente"

                # 2. Buscar automatizaciones activas de tipo 'tag_agregado' para este usuario
                # y cuyo valor en 'palabra_clave' sea el tag_id
                cursor.execute(
                    """
                    SELECT * FROM automatizaciones
                    WHERE usuario_id = %s AND tipo_disparador = 'tag_agregado' AND palabra_clave = %s AND activo = 1
                    """,
                    (user_id, str(tag_id))
                )
                autos = cursor.fetchall()
                logger.info(f"Encontradas {len(autos)} automatizaciones para el tag_id={tag_id}")

                for auto in autos:
                    # Cancelar esperas previas
                    cursor.execute("DELETE FROM automatizacion_esperas WHERE contacto_jid = %s AND usuario_id = %s", (chat_jid, user_id))
                    conn.commit()

                    # Disparar flujo asíncronamente
                    trigger_automation_async(user_id, device_id, auto, chat_jid, nombre_contacto)
                    logger.info(f"Automatización ID {auto['id']} disparada por tag agregado.")
    except Exception as e:
        logger.exception(f"Error en trigger_tag_automations: {e}")

def trigger_group_agent_response_async(user_id, device_id, group_db, chat_jid, text_original, sender_name):
    """Lanza la ejecución de la IA en grupos en un hilo separado."""
    import threading
    t = threading.Thread(
        target=execute_group_agent_response,
        args=(user_id, device_id, group_db, chat_jid, text_original, sender_name)
    )
    t.daemon = True
    t.start()


def execute_group_agent_response(user_id, device_id, group_db, chat_jid, text_original, sender_name):
    logger.info(f"=== INICIANDO RESPUESTA DE IA EN GRUPO JID: {chat_jid} ===")
    
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")
    
    if not openai_key and not gemini_key and not nvidia_key:
        logger.warning("No hay API keys configuradas para la IA en Grupos.")
        return

    # Preparar el Prompt de Sistema para el grupo
    instrucciones = group_db.get("ia_instrucciones") or ""
    personalidad = group_db.get("ia_personalidad") or ""
    
    system_prompt = (
        "Eres un Asistente de IA en un chat grupal de WhatsApp.\n"
        f"Instrucciones de tu rol:\n{instrucciones}\n\n"
        f"Personalidad y Tono:\n{personalidad}\n\n"
        "REGLAS IMPORTANTES:\n"
        f"- Estás respondiendo en un grupo al mensaje enviado por el usuario '{sender_name}'.\n"
        "- Sé extremadamente breve, claro y servicial en tus respuestas. Evita escribir textos largos.\n"
        "- Responde directamente con el mensaje en texto plano. No devuelvas ningún JSON ni código markdown.\n"
        "- Si no sabes la respuesta basándote en tus instrucciones, responde educadamente indicando que no tienes esa información."
    )

    try:
        # Llamar a la API de LLM
        respuesta = call_llm_api(
            system_prompt,
            f"Asistente Grupo - {group_db.get('nombre')}",
            openai_key,
            gemini_key,
            nvidia_key
        )
        
        if respuesta:
            respuesta_clean = respuesta.strip()
            # Enviar el mensaje de respuesta al grupo
            send_bridge_message(device_id, chat_jid, respuesta_clean)
            logger.info(f"Respuesta de IA enviada al grupo {chat_jid}: {respuesta_clean}")
    except Exception as ex:
        logger.error(f"Error al procesar respuesta de IA en grupo: {ex}")


def trigger_agent_response_async(user_id, device_id, agent, chat_jid, text_original, contact_name, contact_id):
    """Lanza la ejecución del agente de IA en un hilo separado."""
    import threading
    t = threading.Thread(target=execute_agent_response, args=(user_id, device_id, agent, chat_jid, text_original, contact_name, contact_id))
    t.daemon = True
    t.start()

def execute_agent_response(user_id, device_id, agent, chat_jid, text_original, contact_name, contact_id):
    logger.info(f"=== INICIANDO RESPUESTA DE AGENTE DE IA ID: {agent.get('id')} PARA {chat_jid} ===")
    
    openai_key = os.getenv("OPENAI_API_KEY")
    gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
    nvidia_key = os.getenv("NVIDIA_API_KEY")
    
    if not openai_key and not gemini_key and not nvidia_key:
        logger.warning("No hay API keys configuradas para el Agente de IA.")
        return

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Si contact_id es None, buscamos el id del contacto
        is_assign_ai_node = False
        espera_row = None
        cursor.execute("""
            SELECT * FROM automatizacion_esperas 
            WHERE contacto_jid = %s AND usuario_id = %s AND tipo_pregunta = 'assignAiNode'
            LIMIT 1
        """, (chat_jid, user_id))
        espera_row = cursor.fetchone()
        if espera_row:
            is_assign_ai_node = True

        if not contact_id:
            cursor.execute("SELECT id FROM contactos WHERE jid = %s AND dispositivo_id = %s LIMIT 1", (chat_jid, device_id))
            c_row = cursor.fetchone()
            if c_row:
                contact_id = c_row["id"]
        
        # --- A. OBTENER DATOS DE CONTACTO ---
        contact_nombre = ""
        contact_email = ""
        contact_telefono = ""
        if contact_id:
            cursor.execute("SELECT nombre, correo, telefono FROM contactos WHERE id = %s LIMIT 1", (contact_id,))
            contact_row = cursor.fetchone()
            if contact_row:
                contact_nombre = contact_row.get("nombre") or ""
                contact_email = contact_row.get("correo") or ""
                contact_telefono = contact_row.get("telefono") or ""

        # --- B. PREPARAR REGLAS Y VARIABLES PARA EL PROMPT CONSOLIDADO ---
        # 1. Pasos de captura
        pasos_captura_raw = agent.get("pasos_captura")
        pasos_text = ""
        if pasos_captura_raw:
            try:
                pasos = json.loads(pasos_captura_raw)
                if isinstance(pasos, list) and len(pasos) > 0:
                    pasos_text = "PASOS DE CAPTURA DE DATOS:\n"
                    pasos_text += "Debes recopilar la siguiente información del cliente de forma cálida y natural. IMPORTANTE: Si el cliente te hace una pregunta o pide información, PRIMERO responde a su duda detalladamente usando la base de conocimiento o recursos disponibles, y luego, al final de tu respuesta, solicita de forma cordial el siguiente dato de captura pendiente. Nunca ignores las preguntas del cliente para limitarte a pedir datos. Pregunta por el siguiente dato pendiente únicamente cuando el cliente responda a la pregunta anterior:\n"
                    
                    skip_existing = agent.get("skip_existing_data") == 1
                    
                    # Cargar campos customizados del contacto si existen
                    custom_fields_values = {}
                    if contact_id:
                        try:
                            cursor.execute("""
                                SELECT LOWER(TRIM(f.nombre)) as nombre, v.valor 
                                FROM campos_customizados f
                                JOIN contacto_campos_customizados v ON v.campo_id = f.id
                                WHERE v.contacto_id = %s
                            """, (contact_id,))
                            for row in cursor.fetchall():
                                if row.get("nombre"):
                                    custom_fields_values[row["nombre"]] = row.get("valor") or ""
                        except Exception as cf_err:
                            logger.error(f"Error cargando campos customizados para validacion de pasos: {cf_err}")

                    for idx, p in enumerate(pasos):
                        var_name = (p.get("variable") or "").lower().strip()
                        is_captured = False
                        current_val = ""
                        
                        if var_name == "nombre" and contact_nombre:
                            is_captured = True
                            current_val = contact_nombre
                        elif (var_name == "email" or var_name == "correo") and contact_email:
                            is_captured = True
                            current_val = contact_email
                        elif (var_name == "telefono" or var_name == "teléfono") and contact_telefono:
                            is_captured = True
                            current_val = contact_telefono
                        elif var_name in custom_fields_values:
                            is_captured = True
                            current_val = custom_fields_values[var_name]
                            
                        status = f"[YA CAPTURADO: {current_val}]" if is_captured else "[PENDIENTE POR PREGUNTAR]"
                        
                        if skip_existing and is_captured:
                            continue
                            
                        pasos_text += f"- Paso {idx+1}: {p.get('text')} (Para la propiedad: {p.get('variable')}) {status}\n"
                    pasos_text += "\n"
            except Exception as pe:
                logger.error(f"Error parseando pasos_captura: {pe}")

        # 2. Reglas de etiquetado
        reglas_etiquetado_raw = agent.get("reglas_etiquetado")
        reglas_etiquetado_text = ""
        if reglas_etiquetado_raw:
            try:
                reglas_etiquetado = json.loads(reglas_etiquetado_raw)
                if isinstance(reglas_etiquetado, list) and len(reglas_etiquetado) > 0:
                    reglas_etiquetado_text = "REGLAS DE ETIQUETADO DISPONIBLES:\n"
                    for rule in reglas_etiquetado:
                        reglas_etiquetado_text += f"- ID Regla: {rule.get('id')}, Condición del mensaje: \"{rule.get('text')}\", Etiqueta a aplicar: \"{rule.get('label') or rule.get('target')}\"\n"
                    reglas_etiquetado_text += "\n"
            except Exception as re_err:
                logger.error(f"Error parseando reglas_etiquetado: {re_err}")

        # 3. Reglas de transferencia
        reglas_trans_raw = agent.get("reglas_transferencia")
        reglas_trans_text = "REGLAS DE TRANSFERENCIA/DERIVACIÓN A ASESOR HUMANO (PREMIUM):\n"
        reglas_trans_text += "- ID Regla: 9999, Condición del mensaje: \"El cliente muestra enojo, rabia, frustración severa, insultos, o exige hablar urgentemente con una persona, asesor o supervisor\", Tipo: \"Humano\", Destino/Asesor: \"Soporte\"\n"
        if reglas_trans_raw:
            try:
                reglas_trans = json.loads(reglas_trans_raw)
                if isinstance(reglas_trans, list) and len(reglas_trans) > 0:
                    for rule in reglas_trans:
                        if str(rule.get("id")) != "9999":
                            reglas_trans_text += f"- ID Regla: {rule.get('id')}, Condición del mensaje: \"{rule.get('text')}\", Tipo: \"{rule.get('type')}\", Destino/Asesor: \"{rule.get('target')}\"\n"
            except Exception as rt_err:
                logger.error(f"Error parseando reglas_transferencia: {rt_err}")
        reglas_trans_text += "\n"

        # 4. Comportamiento y calendario
        config_raw = agent.get("config_comportamiento")
        config_json = {}
        cal_google_connected = False
        cal_calendly_connected = False
        cal_com_connected = False
        cal_google_meet = False
        cal_consultar_horarios = True
        cal_schedule_restriction = False
        cal_distribution_mode = "secuencial"
        use_emojis = True
        only_business = False
        divide_messages = False
        response_delay = 0
        calendar_text = ""
        seguimiento_enabled = False
        
        if config_raw:
            try:
                config_json = json.loads(config_raw)
                cal_google_connected = config_json.get("calGoogleConnected", False)
                cal_calendly_connected = config_json.get("calCalendlyConnected", False)
                cal_com_connected = bool(config_json.get("calComApiKey"))
                cal_google_meet = config_json.get("calGoogleMeet", False)
                cal_consultar_horarios = config_json.get("calConsultarHorarios", True)
                cal_schedule_restriction = config_json.get("calScheduleRestriction", False)
                cal_distribution_mode = config_json.get("calDistributionMode", "secuencial")
                use_emojis = config_json.get("useEmojis", True)
                only_business = config_json.get("onlyBusinessTopics", False)
                divide_messages = config_json.get("divideMessages", False)
                seguimiento_enabled = config_json.get("seguimientoInteligente", False)
                
                message_limit = config_json.get("messageLimit")
                if message_limit:
                    try:
                        limit_val = int(message_limit)
                        cursor.execute("""
                            SELECT COUNT(*) as cnt FROM mensajes 
                            WHERE dispositivo_id = %s AND chat_jid = %s AND es_mio = 0
                        """, (device_id, chat_jid))
                        client_msg_count = cursor.fetchone()["cnt"]
                        
                        if client_msg_count >= limit_val:
                            logger.info(f"Límite de mensajes ({limit_val}) alcanzado para {chat_jid}. Transfiriendo a humano.")
                            cursor.execute("UPDATE contactos SET agente_asignado_id = NULL WHERE jid = %s AND dispositivo_id = %s", (chat_jid, device_id))
                            conn.commit()
                            
                            transfer_msg = "He notado que tenemos una conversación extensa. Te he transferido con un asesor humano para darte una atención más personalizada."
                            send_bridge_message(device_id, chat_jid, transfer_msg)
                            return
                    except Exception as limit_err:
                        logger.error(f"Error procesando limite de mensajes del bot: {limit_err}")
                
                resp_time = config_json.get("responseTime")
                if resp_time:
                    import re
                    digits = re.findall(r'\d+', str(resp_time))
                    if digits:
                        response_delay = min(int(digits[0]), 10)
                        
                cal_provider = config_json.get("calProvider")
                if cal_provider:
                    cal_provider = str(cal_provider).lower()
                    if "google" in cal_provider:
                        cal_provider = "google"
                    elif "calendly" in cal_provider:
                        cal_provider = "calendly"
                    elif "cal.com" in cal_provider or "cal" in cal_provider:
                        cal_provider = "cal.com"

                if cal_provider and cal_provider != "ninguno":

                    cal_email = ""
                    if cal_provider == "google":
                        cal_email = config_json.get("calGoogleEmail")
                    elif cal_provider == "calendly":
                        cal_email = config_json.get("calCalendlyEmail")
                        
                    cal_asunto = config_json.get("calAsunto", "Reunion con {name}")
                    cal_reunion_desc = config_json.get("calReunionDesc", "")
                    cal_proactivas = config_json.get("calProactivas", False)
                    cal_opciones_sugerir = config_json.get("calOpcionesSugerir", "3 opciones")
                    cal_msg_confirmacion = config_json.get("calMsgConfirmacion")

                    calendar_text = f"CALENDARIO Y RESERVAS:\n"
                    calendar_text += f"- Proveedor conectado: {cal_provider.upper()}\n"
                    if cal_email:
                        calendar_text += f"- Correo de reservas: {cal_email}\n"

                    c_name_val = contact_name or "Cliente"
                    c_email_val = contact_email or ""
                    
                    asunto_formatted = cal_asunto.replace("{name}", c_name_val).replace("{email}", c_email_val)
                    desc_formatted = cal_reunion_desc.replace("{name}", c_name_val).replace("{email}", c_email_val)
                    
                    calendar_text += f"- Al crear la cita usando las herramientas de Google Calendar, usa estrictamente como título (summary): \"{asunto_formatted}\" y como descripción: \"{desc_formatted}\".\n"
                    
                    if cal_proactivas:
                        calendar_text += f"- SUGERENCIA PROACTIVA: Ofrece de forma proactiva {cal_opciones_sugerir} de horarios disponibles al cliente en vez de preguntarle qué hora prefiere.\n"
                        
                    if cal_msg_confirmacion:
                        calendar_text += f"- Cuando la cita sea confirmada exitosamente, DEBES redactar tu respuesta de confirmación siguiendo exactamente esta plantilla (reemplazando los campos con los datos reales de la cita):\n{cal_msg_confirmacion}\n"
                    else:
                        calendar_text += "- Si el cliente solicita agendar una cita o reservar una hora, dile que con gusto le enviaremos la confirmación o invitación por correo electrónico.\n"
                    
                    if cal_distribution_mode:
                        calendar_text += f"- Modo de distribución de agendamientos configurado: {cal_distribution_mode.upper()}.\n"
                    calendar_text += "\n"
            except Exception as ce_err:
                logger.error(f"Error parsing config_comportamiento: {ce_err}")

        # Horarios de atención de la empresa
        working_hours_text = ""
        working_hours_raw = config_json.get("calWorkingHours")
        if working_hours_raw:
            try:
                working_hours_text = "HORARIOS DE ATENCIÓN DE LA EMPRESA:\n"
                days_map = {
                    "lunes": "Lunes",
                    "martes": "Martes",
                    "miercoles": "Miércoles",
                    "jueves": "Jueves",
                    "viernes": "Viernes",
                    "sabado": "Sábado",
                    "domingo": "Domingo"
                }
                for day_key, day_name in days_map.items():
                    day_data = working_hours_raw.get(day_key)
                    if day_data and day_data.get("active"):
                        working_hours_text += f"- {day_name}: de {day_data.get('start', '09:00')} a {day_data.get('end', '18:00')}\n"
                    else:
                        working_hours_text += f"- {day_name}: Cerrado/No disponible\n"
                working_hours_text += "\n"
            except Exception as wh_err:
                logger.error(f"Error parseando calWorkingHours: {wh_err}")

        comportamiento_directives = "DIRECTIVAS DE FORMATO Y COMPORTAMIENTO:\n"
        if use_emojis:
            comportamiento_directives += "- Usa emojis amigables de forma moderada en tus respuestas para ser más cercano.\n"
        else:
            comportamiento_directives += "- NO uses ningún emoji en tus respuestas bajo ninguna circunstancia.\n"
            
        if only_business:
            comportamiento_directives += "- Mantente estrictamente dentro de los temas del negocio y la base de conocimiento. Si te preguntan algo ajeno al negocio, responde educadamente diciendo que solo puedes asistir en temas del negocio.\n"
        comportamiento_directives += "\n"

        # 5. Base de conocimiento (RAG Vectorial con similitud coseno)
        conocimiento_text = ""
        chunks_found = []
        try:
            from con_embeddings import search_relevant_chunks
            chunks_found = search_relevant_chunks(cursor, agent["id"], text_original, top_n=5, gemini_key=gemini_key, openai_key=openai_key)
        except Exception as rag_err:
            logger.error(f"Error realizando busqueda RAG: {rag_err}")
            
        if chunks_found:
            conocimiento_text = "FRAGMENTOS DE CONOCIMIENTO RELEVANTES ENCONTRADOS:\n"
            for idx, chunk in enumerate(chunks_found):
                conocimiento_text += f"- [Fragmento {idx+1}]: {chunk}\n"
        else:
            # Fallback a volcado completo si no hay chunks
            cursor.execute("SELECT titulo, contenido, tipo FROM agente_conocimiento WHERE agente_id = %s", (agent["id"],))
            conocimiento_rows = cursor.fetchall()
            for i, item in enumerate(conocimiento_rows):
                conocimiento_text += f"\nDocumento/FAQ {i+1} ({item.get('titulo', 'Sin título')}):\n{item.get('contenido', '')}\n"

        # Cargar recursos multimedia
        cursor.execute("SELECT tipo, archivo_url, nombre_archivo, descripcion, notas_uso FROM agente_recursos WHERE agente_id = %s", (agent["id"],))
        recursos_rows = cursor.fetchall()
        recursos_text = ""
        if recursos_rows:
            recursos_text = "RECURSOS MULTIMEDIA DEL NEGOCIO:\n"
            recursos_text += "Tienes disponibles los siguientes archivos multimedia. Si el cliente te pide fotos, imágenes, audios o videos sobre algún tema listado abajo, o si consideras que enviar uno de estos archivos le ayudará a resolver su duda, debes incluir su Enlace (URL) exacto en tu respuesta de forma natural. No inventes URLs, usa solo las indicadas aquí:\n"
            for r in recursos_rows:
                desc = r.get("descripcion") or "Sin descripción"
                notas = r.get("notas_uso") or ""
                recursos_text += f"- Archivo: {r.get('nombre_archivo')} (Tipo: {r.get('tipo')}), Enlace: {r.get('archivo_url')}, Descripción: \"{desc}\""
                if notas:
                    recursos_text += f", Notas de uso: \"{notas}\""
                recursos_text += "\n"
            recursos_text += "\n"

        # 6. Historial de conversación
        cursor.execute("""
            SELECT texto, es_mio FROM mensajes 
            WHERE dispositivo_id = %s AND chat_jid = %s
            ORDER BY fecha_mensaje DESC LIMIT 10
        """, (device_id, chat_jid))
        history_rows = cursor.fetchall()
        history_rows.reverse()
        
        history_text = ""
        for m in history_rows:
            sender = "Asistente" if m.get("es_mio") == 1 else "Cliente"
            history_text += f"{sender}: {m.get('texto')}\n"

        # 7. Formar prompt unificado
        instruccion_seguimiento = ""
        if seguimiento_enabled:
            instruccion_seguimiento = (
                "5. Si el cliente pide o acepta que le contactemos en el futuro (ej. 'escríbeme mañana', 'háblame en 3 horas'), determina que se debe programar un seguimiento e indícalo en el objeto 'seguimiento' con:\n"
                "   - 'programar': true\n"
                "   - 'horas_retraso': número decimal de horas en el futuro para enviar el mensaje (ejemplo: 24 para mañana, 2 para 2 horas. Si dice mañana, usa 23.5).\n"
                "   - 'mensaje_propuesto': frase de seguimiento muy corta, cordial y personalizada en español relacionada con el contexto.\n"
                "   Si no solicita contacto futuro, deja 'programar' en false.\n"
            )
        else:
            instruccion_seguimiento = "5. Deja el objeto 'seguimiento' con 'programar': false y los demás campos en null.\n"

        tool_instructions = ""
        if not cal_consultar_horarios:
            tool_instructions = (
                "IMPORTANTE - CONSULTA DE HORARIOS DESHABILITADA:\n"
                "La consulta de disponibilidad en tiempo real está deshabilitada en la configuración del asistente.\n"
                "NO utilices ninguna herramienta para consultar disponibilidad ni agendar eventos.\n"
                "Si el cliente solicita agendar una cita o ver horarios disponibles, ofrécele directamente el enlace de reserva de tu proveedor de calendario o pídele que te indique qué día y hora prefiere para reservarlo manualmente.\n\n"
            )
        else:
            if cal_provider == "google" and cal_google_connected:
                tool_instructions = (
                    "HERRAMIENTAS DE GOOGLE CALENDAR:\n"
                    "Tienes acceso a las siguientes herramientas para consultar disponibilidad y agendar citas:\n"
                    "- 'list_google_calendar_slots': Sirve para listar eventos/espacios ocupados. Parámetros: start_time (ISO 8601 string, UTC), end_time (ISO 8601 string, UTC).\n"
                    "- 'create_google_calendar_event': Sirve para reservar una cita. Parámetros: summary (string), start_time (ISO 8601 string, UTC), end_time (ISO 8601 string, UTC), attendee_email (string, opcional), description (string).\n\n"
                    "Si el cliente desea agendar una cita o saber si hay disponibilidad, DEBES ejecutar la herramienta correspondiente (incluso si en el historial de la conversación le dijiste al cliente que había un inconveniente técnico o error, debes ignorar eso e intentar llamar a la herramienta de todas formas) respondiendo ÚNICAMENTE con un JSON que contenga la propiedad 'tool_call':\n"
                    "{\n"
                    "  \"tool_call\": {\n"
                    "    \"name\": \"nombre_de_la_herramienta\",\n"
                    "    \"arguments\": { ... }\n"
                    "  }\n"
                    "}\n"
                    "IMPORTANTE: Cuando ejecutes una herramienta, NO respondas nada más (deja el resto de campos como respuesta_final en blanco o null). Solo cuando tengas los resultados de la herramienta en tu contexto, podrás responder formalmente al cliente con el JSON estándar de respuesta.\n\n"
                )
            elif cal_provider == "calendly" and cal_calendly_connected:
                tool_instructions = (
                    "HERRAMIENTAS DE CALENDLY:\n"
                    "Tienes acceso a la siguiente herramienta para obtener los enlaces de reserva y tipos de cita configurados:\n"
                    "- 'list_calendly_slots': Sirve para listar las opciones de citas (reuniones) y sus enlaces URL correspondientes para que se los envíes al cliente para que reserve directamente. No requiere parámetros.\n\n"
                    "Si el cliente desea agendar o solicita un enlace para reservar, DEBES ejecutar la herramienta correspondiente respondiendo ÚNICAMENTE con un JSON que contenga la propiedad 'tool_call':\n"
                    "{\n"
                    "  \"tool_call\": {\n"
                    "    \"name\": \"list_calendly_slots\",\n"
                    "    \"arguments\": {}\n"
                    "  }\n"
                    "}\n"
                    "IMPORTANTE: Cuando ejecutes una herramienta, NO respondas nada más. Solo cuando tengas los resultados de la herramienta con los enlaces, podrás responder al cliente enviándole el enlace del tipo de cita correspondiente.\n\n"
                )
            elif cal_provider == "cal.com" and cal_com_connected:
                tool_instructions = (
                    "HERRAMIENTAS DE CAL.COM:\n"
                    "Tienes acceso a la siguiente herramienta para obtener los enlaces de reserva y tipos de cita configurados:\n"
                    "- 'list_calcom_slots': Sirve para listar las opciones de citas (reuniones) y sus enlaces URL correspondientes de Cal.com para que se los envíes al cliente para que reserve directamente. No requiere parámetros.\n\n"
                    "Si el cliente desea agendar o solicita un enlace para reservar, DEBES ejecutar la herramienta correspondiente respondiendo ÚNICAMENTE con un JSON que contenga la propiedad 'tool_call':\n"
                    "{\n"
                    "  \"tool_call\": {\n"
                    "    \"name\": \"list_calcom_slots\",\n"
                    "    \"arguments\": {}\n"
                    "  }\n"
                    "}\n"
                    "IMPORTANTE: Cuando ejecutes una herramienta, NO respondas nada más. Solo cuando tengas los resultados de la herramienta con los enlaces, podrás responder al cliente enviándole el enlace del tipo de cita correspondiente.\n\n"
                )

        if cal_schedule_restriction:
            tool_instructions += (
                "RESTRICCIÓN DE HORARIOS:\n"
                "- Al proponer o sugerir horarios libres al cliente, hazlo estrictamente en horas punto o enteras (ejemplo: 09:00, 10:00, 15:00) y evita ofrecer minutos fraccionados (como 09:30 o 14:15).\n\n"
            )

        # Obtener fecha y hora local del negocio según la zona horaria
        selected_timezone = config_json.get("selectedTimezone")
        local_time_str = ""
        if selected_timezone:
            try:
                import pytz
                from datetime import datetime
                tz = pytz.timezone(selected_timezone)
                local_dt = datetime.now(tz)
                local_time_str = local_dt.strftime("%Y-%m-%d %H:%M:%S (%Z)")
            except Exception as tz_err:
                logger.error(f"Error calculando hora local del negocio: {tz_err}")
                
        if not local_time_str:
            from datetime import datetime
            local_time_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S (Local Server)")

        # Construir estructura JSON esperada dinámicamente
        expected_json_structure = (
            "{\n"
            "  \"tags_a_aplicar_ids\": [],\n"
            "  \"regla_transferencia_id\": null,\n"
            "  \"datos_extraidos\": {},\n"
            "  \"respuesta_final\": \"Texto de la respuesta para el cliente (puedes dejarlo vacío/null si vas a usar tool_call)\",\n"
            "  \"url_media_a_enviar\": null,\n"
            "  \"tipo_media_a_enviar\": null,\n"
            "  \"tool_call\": null,\n"
        )
        if is_assign_ai_node:
            expected_json_structure += "  \"duda_resuelta\": false,\n"
        expected_json_structure += (
            "  \"seguimiento\": {\n"
            "     \"programar\": false,\n"
            "     \"horas_retraso\": null,\n"
            "     \"mensaje_propuesto\": null\n"
            "  }\n"
            "}"
        )

        flow_instruction = ""
        if is_assign_ai_node:
            flow_instruction = (
                "5. Analiza el historial y el mensaje del cliente. Si determinas que la duda del cliente ha sido respondida "
                "y su consulta está completamente resuelta, o que el objetivo principal de la conversación ha sido cumplido de "
                "forma satisfactoria, DEBES incluir 'duda_resuelta': true en el JSON de respuesta. De lo contrario, escribe 'duda_resuelta': false.\n"
            )

        system_prompt = (
            f"Eres {agent.get('nombre', 'Asistente Virtual')}, el asistente inteligente oficial de la empresa.\n"
            f"Fecha y hora actual del negocio: {local_time_str}\n"
            f"Industria: {agent.get('industria', 'Servicios')}\n"
            f"Descripción del negocio: {agent.get('descripcion_negocio', '')}\n"
            f"Tu Objetivo: {agent.get('objetivo', '')}\n\n"
            f"Tu Personalidad:\n{agent.get('personalidad', 'Amigable, profesional y servicial')}\n\n"
            f"Instrucciones de comportamiento:\n{agent.get('instrucciones', 'Responde las preguntas de los clientes en base a tu base de conocimiento.')}\n\n"
            f"{pasos_text}"
            f"{reglas_etiquetado_text}"
            f"{reglas_trans_text}"
            f"{calendar_text}"
            f"{working_hours_text}"
            f"{comportamiento_directives}"
            f"{recursos_text}"
            f"{tool_instructions}"
            f"BASE DE CONOCIMIENTO (Usa esta información exacta para responder si el cliente pregunta por estos temas):\n"
            f"{conocimiento_text}\n\n"
            f"HISTORIAL DE LA CONVERSACIÓN:\n"
            f"{history_text}\n"
            "INSTRUCCIÓN DE RETORNO (DEBES CUMPLIR ESTO ESTRICTAMENTE):\n"
            "Tu tarea es analizar el último mensaje del cliente y determinar:\n"
            "1. Si coincide con alguna condición de las REGLAS DE ETIQUETADO DISPONIBLES. Si es así, incluye una lista de los IDs de las reglas que se cumplieron en 'tags_a_aplicar_ids'. Si ninguna coincide, deja un arreglo vacío [].\n"
            "2. Si coincide con alguna condición de las REGLAS DE TRANSFERENCIA A ASESOR HUMANO. Si es así, incluye el ID de la primera regla que se cumpla en 'regla_transferencia_id' (como número). Si ninguna coincide, deja este campo en null.\n"
            "3. Si el usuario proporciona datos para alguna variable pendiente en PASOS DE CAPTURA DE DATOS. Si es así, extráelos en el objeto 'datos_extraidos' con la estructura {variable: valor}. Si no hay datos nuevos, deja un objeto vacío {}.\n"
            "4. Generar la respuesta final amigable y profesional para el cliente, redactada en español, y colocarla en el campo 'respuesta_final'.\n"
            f"{flow_instruction}"
            f"{instruccion_seguimiento}\n"
            "DEBES RESPONDER EXCLUSIVAMENTE CON UN OBJETO JSON VÁLIDO. No agregues texto antes ni después del bloque JSON, ni uses bloques de código markdown como ```json.\n"
            f"Estructura del JSON esperada:\n"
            f"{expected_json_structure}\n\n"
            "IMPORTANTE: Si necesitas ejecutar una herramienta (ej. list_google_calendar_slots para ver disponibilidad, o create_google_calendar_event para agendar), rellena la propiedad 'tool_call' con la siguiente estructura:\n"
            "{\n"
            "  ... (demás campos en vacio/null) ...\n"
            "  \"tool_call\": {\n"
            "     \"name\": \"list_google_calendar_slots o create_google_calendar_event\",\n"
            "     \"arguments\": {\n"
            "        \"start_time\": \"ISO 8601 string\",\n"
            "        \"end_time\": \"ISO 8601 string\"\n"
            "     }\n"
            "  }\n"
            "}"
        )

        # Loop de ejecución del Agente (ReAct)
        tool_results_context = ""
        response_text = ""
        parsed_ok = False
        res_data = {}
        
        for iteration in range(2):
            current_prompt = system_prompt
            if tool_results_context:
                current_prompt += f"\n\nRESULTADOS DE HERRAMIENTAS EJECUTADAS:\n{tool_results_context}\nUsa esta información para responder al cliente de manera precisa."
                
            response_text = call_llm_api(current_prompt, f"Asistente IA - {agent.get('nombre')}", openai_key, gemini_key, nvidia_key, model_override=agent.get('modelo'))
            
            if not response_text:
                break
                
            try:
                import re
                json_match = re.search(r'\{.*\}', response_text.strip(), re.DOTALL)
                if json_match:
                    res_data = json.loads(json_match.group(0))
                    parsed_ok = True
                else:
                    res_data = {"respuesta_final": response_text.strip()}
                    parsed_ok = True
            except Exception as pe:
                logger.error(f"Error parseando respuesta en iteracion {iteration}: {pe}. Respuesta: {response_text}")
                res_data = {"respuesta_final": response_text.strip()}
                parsed_ok = True
                break
                
            # Si no hay llamada a herramienta, es la respuesta final, salimos del loop
            if not parsed_ok or "tool_call" not in res_data or not res_data["tool_call"]:
                break

                
            tool_call = res_data["tool_call"]
            tool_name = tool_call.get("name")
            tool_args = tool_call.get("arguments") or {}
            logger.info(f"El agente {agent.get('nombre')} solicito ejecutar herramienta: {tool_name} con argumentos {tool_args}")
            
            tool_result = ""
            if cal_provider == "google" and cal_google_connected:
                try:
                    from calendar_tools import refresh_google_oauth_token, list_google_calendar_events, create_google_calendar_event
                    active_token = refresh_google_oauth_token(cursor, conn, agent["id"], config_json)
                    if active_token:
                        if tool_name == "list_google_calendar_slots":
                            start_time = tool_args.get("start_time")
                            end_time = tool_args.get("end_time")
                            if start_time and end_time:
                                res_slots = list_google_calendar_events(active_token, start_time, end_time)
                                tool_result = json.dumps(res_slots)
                            else:
                                tool_result = '{"error": "Faltan parametros start_time o end_time"}'
                        elif tool_name == "create_google_calendar_event":
                            summary = tool_args.get("summary") or f"Cita con {contact_nombre or 'Cliente'}"
                            start_time = tool_args.get("start_time")
                            end_time = tool_args.get("end_time")
                            attendee_email = tool_args.get("attendee_email") or contact_email
                            description = tool_args.get("description") or f"Cita agendada por {agent.get('nombre')}"
                            if start_time and end_time:
                                res_event = create_google_calendar_event(
                                    active_token, summary, start_time, end_time, attendee_email, description, create_meet=cal_google_meet
                                )
                                tool_result = json.dumps(res_event)
                            else:
                                tool_result = '{"error": "Faltan parametros start_time o end_time"}'
                        else:
                            tool_result = f'{{"error": "Herramienta {tool_name} no valida."}}'
                    else:
                        tool_result = '{"error": "No se pudo obtener token de acceso de Google Calendar."}'
                except Exception as ex_tool:
                    logger.error(f"Error ejecutando herramienta de calendario: {ex_tool}")
                    tool_result = f'{{"error": "Error interno al ejecutar herramienta: {str(ex_tool)}"}}'
            elif cal_provider == "calendly" and cal_calendly_connected:
                try:
                    from calendar_tools import refresh_calendly_oauth_token, list_calendly_event_types
                    active_token = refresh_calendly_oauth_token(cursor, conn, agent["id"], config_json)
                    if active_token:
                        if tool_name == "list_calendly_slots":
                            res_events = list_calendly_event_types(active_token)
                            tool_result = json.dumps(res_events)
                        else:
                            tool_result = f'{{"error": "Herramienta {tool_name} no valida para Calendly."}}'
                    else:
                        tool_result = '{"error": "No se pudo obtener token de acceso de Calendly."}'
                except Exception as ex_tool:
                    logger.error(f"Error ejecutando herramienta de Calendly: {ex_tool}")
                    tool_result = f'{{"error": "Error interno al ejecutar herramienta Calendly: {str(ex_tool)}"}}'
            elif cal_provider == "cal.com" and cal_com_connected:
                try:
                    from calendar_tools import list_calcom_event_types
                    cal_api_key = config_json.get("calComApiKey")
                    cal_event_id = config_json.get("calComEventId")
                    if cal_api_key:
                        if tool_name == "list_calcom_slots":
                            res_events = list_calcom_event_types(cal_api_key, cal_event_id)
                            tool_result = json.dumps(res_events)
                        else:
                            tool_result = f'{{"error": "Herramienta {tool_name} no valida para Cal.com."}}'
                    else:
                        tool_result = '{"error": "API Key de Cal.com no configurada."}'
                except Exception as ex_tool:
                    logger.error(f"Error ejecutando herramienta de Cal.com: {ex_tool}")
                    tool_result = f'{{"error": "Error interno al ejecutar herramienta Cal.com: {str(ex_tool)}"}}'
            else:
                tool_result = f'{{"error": "Calendario no conectado."}}'
                
            logger.info(f"Resultado de la herramienta {tool_name}: {tool_result}")
            tool_results_context += f"- Herramienta: {tool_name}\n  Argumentos: {json.dumps(tool_args)}\n  Resultado: {tool_result}\n\n"

        tags_a_aplicar_ids = res_data.get("tags_a_aplicar_ids") or []
        regla_transferencia_id = res_data.get("regla_transferencia_id")
        datos_extraidos = res_data.get("datos_extraidos") or {}
        respuesta_final = (res_data.get("respuesta_final") or "").strip()
        seguimiento_data = res_data.get("seguimiento") or {}

        if respuesta_final:
            # 1. Aplicar reglas de etiquetado
            if parsed_ok and tags_a_aplicar_ids and reglas_etiquetado_raw and contact_id:
                try:
                    reglas_etiquetado = json.loads(reglas_etiquetado_raw)
                    matched_ids_str = [str(x) for x in tags_a_aplicar_ids]
                    for rule in reglas_etiquetado:
                        if str(rule.get("id")) in matched_ids_str:
                            rule_type = rule.get("action") or rule.get("type") or "Agregar"
                            tag_name = rule.get("label") or rule.get("target")
                            if tag_name:
                                cursor.execute("SELECT id FROM tags WHERE nombre = %s AND usuario_id = %s LIMIT 1", (tag_name, user_id))
                                tag_row = cursor.fetchone()
                                if not tag_row:
                                    tag_color = '#6366f1'  # Azul por defecto
                                    tag_name_clean = str(tag_name).lower().strip()
                                    if 'vendor' in tag_name_clean:
                                        tag_color = '#a855f7'
                                    elif 'cliente nuevo' in tag_name_clean:
                                        tag_color = '#22c55e'
                                    elif 'interesado' in tag_name_clean:
                                        tag_color = '#3b82f6'
                                    elif 'calificado' in tag_name_clean:
                                        tag_color = '#f97316'
                                    elif 'cerrado' in tag_name_clean:
                                        tag_color = '#ef4444'
                                    elif 'seguimiento' in tag_name_clean:
                                        tag_color = '#eab308'
                                    
                                    cursor.execute("INSERT INTO tags (nombre, color, usuario_id) VALUES (%s, %s, %s)", (tag_name, tag_color, user_id))
                                    conn.commit()
                                    tag_id = cursor.lastrowid
                                else:
                                    tag_id = tag_row["id"]
                                    
                                if rule_type == "Agregar":
                                    cursor.execute("INSERT IGNORE INTO contactos_tags (contacto_id, tag_id) VALUES (%s, %s)", (contact_id, tag_id))
                                    logger.info(f"Etiqueta {tag_name} agregada a contacto {contact_id}")
                                elif rule_type == "Quitar":
                                    cursor.execute("DELETE FROM contactos_tags WHERE contacto_id = %s AND tag_id = %s", (contact_id, tag_id))
                                    logger.info(f"Etiqueta {tag_name} removida de contacto {contact_id}")
                                conn.commit()
                                if rule_type == "Agregar":
                                    trigger_tag_automations(user_id, contact_id, tag_id)
                except Exception as tag_err:
                    logger.error(f"Error aplicando etiquetas en respuesta consolidada: {tag_err}")

            # 2. Evaluar regla de transferencia
            is_transferred = False
            if parsed_ok and regla_transferencia_id is not None:
                try:
                    matched_rule = None
                    if reglas_trans_raw:
                        reglas_trans = json.loads(reglas_trans_raw)
                        matched_rule = next((r for r in reglas_trans if str(r.get("id")) == str(regla_transferencia_id)), None)
                    
                    if not matched_rule and str(regla_transferencia_id) == "9999":
                        matched_rule = {
                            "id": 9999,
                            "type": "Humano",
                            "target": "Soporte"
                        }

                    if matched_rule:
                        dest_type = matched_rule.get("type")
                        target = matched_rule.get("target")
                        logger.info(f"Regla de transferencia activada! ID: {regla_transferencia_id}, Destino: {dest_type}, Destinatario: {target}")
                        
                        if dest_type == "Humano" and target and target != "Elegir...":
                            cursor.execute("SELECT id FROM usuarios WHERE nombre = %s AND activo = 1 LIMIT 1", (target,))
                            user_row = cursor.fetchone()
                            if not user_row:
                                cursor.execute("SELECT id FROM usuarios WHERE nombre LIKE %s AND activo = 1 LIMIT 1", (f"%{target}%",))
                                user_row = cursor.fetchone()
                            if not user_row:
                                # Fallback al primer usuario activo en el sistema
                                cursor.execute("SELECT id FROM usuarios WHERE activo = 1 ORDER BY id ASC LIMIT 1")
                                user_row = cursor.fetchone()
                                
                            if user_row:
                                human_id = user_row["id"]
                                cursor.execute("UPDATE contactos SET agente_asignado_id = %s WHERE jid = %s AND dispositivo_id = %s", (human_id, chat_jid, device_id))
                                conn.commit()
                                
                                if str(regla_transferencia_id) == "9999":
                                    transfer_msg = "Lamento mucho los inconvenientes. Para atenderte de la mejor manera, he pausado el asistente virtual y te he transferido con un asesor humano que te responderá de inmediato."
                                    
                                    # Aplicar etiqueta de frustración de emergencia
                                    if contact_id:
                                        try:
                                            cursor.execute("SELECT id FROM tags WHERE nombre = 'URGENTE: Cliente Frustrado' AND usuario_id = %s LIMIT 1", (user_id,))
                                            tag_row = cursor.fetchone()
                                            if not tag_row:
                                                cursor.execute("INSERT INTO tags (nombre, color, usuario_id) VALUES ('URGENTE: Cliente Frustrado', '#ef4444', %s)", (user_id,))
                                                conn.commit()
                                                tag_id = cursor.lastrowid
                                            else:
                                                tag_id = tag_row["id"]
                                            cursor.execute("INSERT IGNORE INTO contactos_tags (contacto_id, tag_id) VALUES (%s, %s)", (contact_id, tag_id))
                                            conn.commit()
                                            logger.info(f"Etiqueta URGENTE: Cliente Frustrado aplicada al contacto {contact_id}")
                                        except Exception as tag_err:
                                            logger.error(f"Error al aplicar etiqueta de frustracion: {tag_err}")
                                else:
                                    transfer_msg = f"Entiendo tu solicitud. Te he transferido con nuestro asesor {target} para atenderte de manera personalizada."
                                
                                send_bridge_message(device_id, chat_jid, transfer_msg)
                                is_transferred = True
                        elif dest_type == "Superagente" and target and target != "Elegir...":
                            cursor.execute("SELECT id FROM agentes_ia WHERE nombre = %s AND dispositivo_id = %s LIMIT 1", (target, device_id))
                            agent_row = cursor.fetchone()
                            if not agent_row:
                                cursor.execute("SELECT id FROM agentes_ia WHERE nombre LIKE %s AND dispositivo_id = %s LIMIT 1", (f"%{target}%", device_id))
                                agent_row = cursor.fetchone()
                            if agent_row:
                                new_agent_id = agent_row["id"]
                                cursor.execute("UPDATE contactos SET agente_asignado_id = %s WHERE jid = %s AND dispositivo_id = %s", (new_agent_id, chat_jid, device_id))
                                conn.commit()
                                
                                transfer_msg = f"Entiendo tu solicitud. Te he transferido con nuestro asistente virtual {target}."
                                send_bridge_message(device_id, chat_jid, transfer_msg)
                                is_transferred = True
                        elif dest_type == "Flujo" and target and target != "Elegir...":
                            cursor.execute("SELECT * FROM automatizaciones WHERE nombre = %s AND usuario_id = %s AND activo = 1 LIMIT 1", (target, user_id))
                            auto_row = cursor.fetchone()
                            if not auto_row:
                                cursor.execute("SELECT * FROM automatizaciones WHERE nombre LIKE %s AND usuario_id = %s AND activo = 1 LIMIT 1", (f"%{target}%", user_id))
                                auto_row = cursor.fetchone()
                            if auto_row:
                                cursor.execute("UPDATE contactos SET agente_asignado_id = NULL WHERE jid = %s AND dispositivo_id = %s", (chat_jid, device_id))
                                cursor.execute("DELETE FROM automatizacion_esperas WHERE contacto_jid = %s AND usuario_id = %s", (chat_jid, user_id))
                                conn.commit()
                                
                                trigger_automation_async(user_id, device_id, auto_row, chat_jid, contact_nombre or "Cliente")
                                is_transferred = True
                except Exception as trans_err:
                    logger.error(f"Error procesando transferencia en respuesta consolidada: {trans_err}")

            if is_transferred:
                return

            # 3. Guardar datos extraídos (Estándar y Customizados)
            if parsed_ok and datos_extraidos and contact_id:
                try:
                    for var, val in datos_extraidos.items():
                        if val:
                            column_name = None
                            var_clean = var.lower().strip()
                            if var_clean == 'nombre':
                                column_name = 'nombre'
                            elif var_clean == 'email' or var_clean == 'correo':
                                column_name = 'correo'
                            elif var_clean == 'telefono' or var_clean == 'teléfono':
                                column_name = 'telefono'
                            elif var_clean == 'empresa':
                                column_name = 'empresa'
                                
                            if column_name:
                                cursor.execute(f"UPDATE contactos SET {column_name} = %s WHERE id = %s", (val, contact_id))
                                conn.commit()
                                logger.info(f"Dato de contacto estándar extraído y guardado: {column_name} = {val}")
                            else:
                                # Buscar si existe el campo customizado para el usuario e insertarlo/actualizarlo (tolerante a mayúsculas/minúsculas y singular/plural)
                                cursor.execute("""
                                    INSERT INTO contacto_campos_customizados (contacto_id, campo_id, valor)
                                    SELECT %s, id, %s
                                    FROM campos_customizados
                                    WHERE (LOWER(nombre) = LOWER(%s) 
                                       OR LOWER(nombre) = LOWER(CONCAT(%s, 's')) 
                                       OR LOWER(CONCAT(nombre, 's')) = LOWER(%s))
                                      AND usuario_id = %s
                                    ON DUPLICATE KEY UPDATE valor = VALUES(valor)
                                """, (contact_id, str(val), var, var, var, user_id))
                                conn.commit()
                                logger.info(f"Dato de contacto customizado extraído y guardado: {var} = {val}")
                except Exception as save_err:
                    logger.error(f"Error guardando datos extraídos en respuesta consolidada: {save_err}")

            # 4. Aplicar retraso simulado si está configurado
            if response_delay > 0:
                import time
                time.sleep(response_delay)
                
            # 5. Determinar si enviamos respuesta por audio de voz (TTS)
            voice_enabled = config_json.get("voiceEnabled", False)
            voice_percentage = config_json.get("voicePercentage", 50)
            selected_voice = config_json.get("selectedVoice", "Sarah - Mature, Reassuring, Confident")
            
            should_send_voice = False
            if voice_enabled and openai_key:
                import random
                if random.randint(1, 100) <= voice_percentage:
                    should_send_voice = True
            
            if should_send_voice:
                try:
                    logger.info(f"Generando TTS para el contacto {chat_jid} usando la voz: {selected_voice}")
                    voice_map = {
                        "Fay - Clear, Expressive": "nova",
                        "Roger - Laid-Back, Casual, Resonant": "onyx",
                        "River - Relaxed, Neutral, Informative": "echo",
                        "Matilda - Knowledgable, Professional": "shimmer",
                        "Sarah - Mature, Reassuring, Confident": "alloy",
                        "Will - Relaxed Optimist": "alloy"
                    }
                    openai_voice = "alloy"
                    for k, v in voice_map.items():
                        if k.lower() in selected_voice.lower():
                            openai_voice = v
                            break
                            
                    tts_url = "https://api.openai.com/v1/audio/speech"
                    headers = {
                        "Authorization": f"Bearer {openai_key}",
                        "Content-Type": "application/json"
                    }
                    tts_payload = {
                        "model": "tts-1",
                        "input": respuesta_final,
                        "voice": openai_voice,
                        "response_format": "mp3"
                    }
                    tts_res = requests.post(tts_url, json=tts_payload, headers=headers, timeout=30)
                    if tts_res.status_code == 200:
                        upload_dir = os.path.join(MEDIA_FOLDER, "audios")
                        os.makedirs(upload_dir, exist_ok=True)
                        import uuid
                        filename = f"tts_{uuid.uuid4().hex}.mp3"
                        audio_local_path = os.path.join(upload_dir, filename)
                        with open(audio_local_path, "wb") as f_audio:
                            f_audio.write(tts_res.content)
                        
                        send_bridge_audio(device_id, chat_jid, audio_local_path, is_ptt=True)
                        logger.info(f"Audio de voz TTS enviado exitosamente al bridge para {chat_jid}")
                    else:
                        logger.error(f"Error de API OpenAI TTS: {tts_res.status_code} - {tts_res.text}")
                        send_bridge_message(device_id, chat_jid, respuesta_final)
                except Exception as tts_err:
                    logger.error(f"Error de excepcion generando o enviando TTS: {tts_err}")
                    send_bridge_message(device_id, chat_jid, respuesta_final)
            else:
                # 6. Dividir mensajes si está configurado
                if divide_messages:
                    import time
                    paragraphs = [p.strip() for p in respuesta_final.split("\n\n") if p.strip()]
                    for p in paragraphs:
                        send_bridge_message(device_id, chat_jid, p)
                        time.sleep(0.5)
                else:
                    send_bridge_message(device_id, chat_jid, respuesta_final)
                
            logger.info(f"Respuesta enviada de forma exitosa por el Agente '{agent.get('nombre')}': {respuesta_final}")

            # Buscar si la respuesta contiene algún recurso para mandarlo nativo
            try:
                cursor.execute("SELECT tipo, archivo_url, nombre_archivo FROM agente_recursos WHERE agente_id = %s", (agent["id"],))
                resources = cursor.fetchall()
                for r in resources:
                    r_url = r.get("archivo_url")
                    if r_url and r_url in respuesta_final:
                        logger.info(f"Encontrado recurso {r.get('nombre_archivo')} en respuesta. Enviando de forma nativa a {chat_jid}")
                        send_bridge_media(device_id, chat_jid, r_url, r.get("tipo"), r.get("nombre_archivo"))
            except Exception as res_err:
                logger.error(f"Error verificando y enviando recursos nativos: {res_err}")

            # 6. Procesar seguimiento inteligente consolidado
            if seguimiento_enabled and parsed_ok and seguimiento_data.get("programar") is True:
                try:
                    horas_retraso = float(seguimiento_data.get("horas_retraso") or 23.5)
                    mensaje_propuesto = seguimiento_data.get("mensaje_propuesto") or "Hola, te escribo de seguimiento a nuestra conversación anterior."
                    
                    # Cancelar cualquier otro mensaje programado anterior para este mismo contacto que sea de Seguimiento Inteligente
                    cursor.execute("""
                        DELETE FROM mensajes_programados 
                        WHERE usuario_id = %s AND dispositivo_id = %s AND target_id = %s AND nombre LIKE 'Seguimiento inteligente%%'
                    """, (user_id, device_id, chat_jid))
                    conn.commit()
                    
                    # Calcular fecha programada
                    from datetime import datetime, timedelta
                    scheduled_dt = datetime.now() + timedelta(hours=horas_retraso)
                    
                    # Generar un ID único BIGINT
                    import random
                    import time
                    unique_id = int(time.time() * 1000) + random.randint(100, 999)
                    
                    # Insertar en mensajes_programados
                    msg_payload = {
                        "id": unique_id,
                        "usuario_id": user_id,
                        "dispositivoId": device_id,
                        "tipoEnvio": "grupo",
                        "targetId": chat_jid,
                        "targetName": contact_name or "Cliente",
                        "nombre": f"Seguimiento inteligente - {contact_name or 'Cliente'}",
                        "campana": f"Seguimiento inteligente - {contact_name or 'Cliente'}",
                        "velocidad": "rapido",
                        "opcionEnvio": "ahora",
                        "fecha": scheduled_dt.strftime("%Y-%m-%d"),
                        "hora": scheduled_dt.strftime("%H:%M"),
                        "repetir": False,
                        "frecuencia": "Semanal",
                        "diasSeleccionados": [],
                        "repetirCada": 1,
                        "finalizarOp": "nunca",
                        "repeticiones": 1,
                        "finalizarFecha": None,
                        "soloNuevos": False,
                        "soloLlenos": False,
                        "messageBlocks": [
                            {
                                "id": int(time.time() * 1000) + 1,
                                "type": "texto",
                                "text": mensaje_propuesto
                            }
                        ]
                    }
                    
                    cursor.execute("""
                        INSERT INTO mensajes_programados (
                            id, usuario_id, dispositivo_id, tipo_envio, target_id, target_nombre,
                            nombre, campana, velocidad, opcion_envio, fecha_programada, fecha_texto,
                            hora_texto, repetir, status, payload_json, creado_en, actualizado_en
                        ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 'Programado', %s, NOW(), NOW())
                    """, (
                        unique_id, user_id, device_id, 'grupo', chat_jid, contact_name or "Cliente",
                        f"Seguimiento inteligente - {contact_name or 'Cliente'}", f"Seguimiento inteligente - {contact_name or 'Cliente'}",
                        'rapido', 'ahora', scheduled_dt, scheduled_dt.strftime("%Y-%m-%d"), scheduled_dt.strftime("%H:%M"),
                        json.dumps(msg_payload)
                    ))
                    conn.commit()
                    logger.info(f"Seguimiento inteligente programado exitosamente para {chat_jid} el {scheduled_dt}")
                except Exception as follow_err:
                    logger.error(f"Error procesando seguimiento inteligente consolidado: {follow_err}")

            # 7. Procesar seguimientos secuenciales estáticos si están configurados
            # Solo si no se programó un seguimiento inteligente
            smart_scheduled = (seguimiento_enabled and parsed_ok and seguimiento_data.get("programar") is True)
            if not smart_scheduled:
                try:
                    seguimientos_raw = agent.get("seguimientos")
                    if seguimientos_raw:
                        seq_list = json.loads(seguimientos_raw)
                        if isinstance(seq_list, list) and len(seq_list) > 0:
                            first_seq = seq_list[0]
                            seq_text = first_seq.get("text")
                            seq_time = first_seq.get("time") or 30
                            seq_unit = first_seq.get("unit") or "min"
                            
                            delay_hours = 0.5
                            try:
                                val = float(seq_time)
                                if seq_unit == "min":
                                    delay_hours = val / 60.0
                                elif seq_unit == "hours" or seq_unit == "hr" or seq_unit == "hora" or seq_unit == "horas":
                                    delay_hours = val
                                elif seq_unit == "days" or seq_unit == "dia" or seq_unit == "días":
                                    delay_hours = val * 24.0
                            except ValueError:
                                pass
                                
                            if seq_text:
                                cursor.execute("""
                                    DELETE FROM mensajes_programados 
                                    WHERE usuario_id = %s AND dispositivo_id = %s AND target_id = %s AND nombre LIKE 'Seguimiento secuencial%%'
                                """, (user_id, device_id, chat_jid))
                                conn.commit()
                                
                                from datetime import datetime, timedelta
                                scheduled_dt = datetime.now() + timedelta(hours=delay_hours)
                                
                                import random
                                import time
                                unique_id = int(time.time() * 1000) + random.randint(100, 999)
                                
                                next_name = f"Seguimiento secuencial - {contact_name or 'Cliente'} - Paso 1"
                                
                                msg_payload = {
                                    "id": unique_id,
                                    "usuario_id": user_id,
                                    "dispositivoId": device_id,
                                    "tipoEnvio": "grupo",
                                    "targetId": chat_jid,
                                    "targetName": contact_name or "Cliente",
                                    "nombre": next_name,
                                    "campana": next_name,
                                    "velocidad": "rapido",
                                    "opcionEnvio": "ahora",
                                    "fecha": scheduled_dt.strftime("%Y-%m-%d"),
                                    "hora": scheduled_dt.strftime("%H:%M"),
                                    "repetir": False,
                                    "frecuencia": "Semanal",
                                    "diasSeleccionados": [],
                                    "repetirCada": 1,
                                    "finalizarOp": "nunca",
                                    "repeticiones": 1,
                                    "finalizarFecha": None,
                                    "soloNuevos": False,
                                    "soloLlenos": False,
                                    "messageBlocks": [
                                        {
                                            "id": int(time.time() * 1000) + 1,
                                            "type": "texto",
                                            "text": seq_text
                                        }
                                    ]
                                }
                                
                                cursor.execute("""
                                    INSERT INTO mensajes_programados (
                                        id, usuario_id, dispositivo_id, tipo_envio, target_id, target_nombre,
                                        nombre, campana, velocidad, opcion_envio, fecha_programada, fecha_texto,
                                        hora_texto, repetir, status, payload_json, creado_en, actualizado_en
                                    ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 0, 'Programado', %s, NOW(), NOW())
                                """, (
                                    unique_id, user_id, device_id, 'grupo', chat_jid, contact_name or "Cliente",
                                    next_name, next_name,
                                    'rapido', 'ahora', scheduled_dt, scheduled_dt.strftime("%Y-%m-%d"), scheduled_dt.strftime("%H:%M"),
                                    json.dumps(msg_payload)
                                ))
                                conn.commit()
                                logger.info(f"Seguimiento secuencial estático Paso 1 programado para {chat_jid} en {delay_hours} horas.")
                except Exception as seq_err:
                    logger.error(f"Error programando seguimiento secuencial estatico base: {seq_err}")

            # 8. Lógica especial de flujo para assignAiNode
            if is_assign_ai_node and espera_row:
                try:
                    duda_resuelta = res_data.get("duda_resuelta", False) if parsed_ok else False
                    opts_json = {}
                    try:
                        opts_json = json.loads(espera_row.get("opciones_json") or "{}")
                    except:
                        pass
                    
                    message_count = opts_json.get("message_count", 0) + 1
                    assign_ai_node_id = opts_json.get("assign_ai_node_id")
                    
                    cursor.execute("SELECT * FROM automatizaciones WHERE id = %s", (espera_row["automatizacion_id"],))
                    auto = cursor.fetchone()
                    
                    should_transition = False
                    target_handle = None
                    
                    if duda_resuelta:
                        logger.info(f"AUTO {espera_row['automatizacion_id']}: Agente IA determinó DUDA RESUELTA para {chat_jid}")
                        should_transition = True
                        target_handle = "success"
                    elif message_count >= 10:
                        logger.info(f"AUTO {espera_row['automatizacion_id']}: Límite de 10 mensajes alcanzado para {chat_jid}")
                        should_transition = True
                        target_handle = "fail"
                    
                    if should_transition and auto:
                        cursor.execute("DELETE FROM automatizacion_esperas WHERE id = %s", (espera_row["id"],))
                        conn.commit()
                        
                        try:
                            flow_data = json.loads(auto.get("contenido_json") or "{}")
                            conexiones = flow_data.get("connections", [])
                        except Exception as e_json:
                            conexiones = []
                            logger.error(f"Error cargando conexiones de automatizacion {auto.get('id')}: {e_json}")
                            
                        edge = next((e for e in conexiones if e.get("source") == assign_ai_node_id and e.get("sourceHandle") == target_handle), None)
                        if edge:
                            next_node_id = edge.get("target")
                            logger.info(f"AUTO {auto.get('id')}: Transicionando a través de '{target_handle}' a nodo {next_node_id}")
                            trigger_automation_async(user_id, device_id, auto, chat_jid, contact_name or "Cliente", start_node_id=next_node_id)
                        else:
                            logger.warning(f"⚠️ Rama '{target_handle}' del nodo Asignar Agente IA no está conectada.")
                    else:
                        opts_json["message_count"] = message_count
                        cursor.execute("""
                            UPDATE automatizacion_esperas 
                            SET opciones_json = %s 
                            WHERE id = %s
                        """, (json.dumps(opts_json), espera_row["id"]))
                        conn.commit()
                        logger.info(f"AUTO {espera_row['automatizacion_id']}: Incrementado conteo de mensajes de agente IA a {message_count} para {chat_jid}")
                except Exception as flow_err:
                    logger.error(f"Error procesando lógica de transición de agente IA en flujo: {flow_err}")

    except Exception as err:
        logger.exception(f"Error procesando ejecución del agente de IA: {err}")
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()



# =====================================================================
# MODULO: CAMPOS CUSTOMIZADOS
# =====================================================================
@app.route('/api/campos-customizados', methods=['GET'])
def get_custom_fields():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "user_id is required"}), 400
    
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM campos_customizados WHERE usuario_id = %s ORDER BY id DESC", (user_id,))
        fields = cursor.fetchall()
        return jsonify(fields)
    except Exception as e:
        logger.error(f"Error obteniendo campos: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/campos-customizados', methods=['POST'])
def create_custom_field():
    data = request.json
    user_id = data.get('usuario_id')
    nombre = data.get('nombre')
    tipo = data.get('tipo')

    if not user_id or not nombre or not tipo:
        return jsonify({"error": "Missing required fields"}), 400

    # Verificar rol del usuario
    try:
        conn_r = get_connection()
        cur_r = conn_r.cursor(dictionary=True)
        cur_r.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (int(user_id),))
        u_row = cur_r.fetchone()
        cur_r.close(); conn_r.close()
        if u_row and u_row.get("rol") in ("agente", "visor"):
            return jsonify({"success": False, "message": "Acción no permitida para colaboradores"}), 403
    except Exception as e:
        logger.error(f"Error verificando rol en create_custom_field: {e}")
    
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute(
            "INSERT INTO campos_customizados (usuario_id, nombre, tipo) VALUES (%s, %s, %s)",
            (user_id, nombre, tipo)
        )
        conn.commit()
        return jsonify({"id": cursor.lastrowid, "message": "Field created successfully"})
    except Exception as e:
        logger.error(f"Error creando campo: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()

@app.route('/api/campos-customizados/<int:id>', methods=['DELETE'])
def delete_custom_field(id):
    # Obtener el user_id de los parámetros para validar
    user_id = request.args.get('user_id')
    if user_id:
        try:
            conn_r = get_connection()
            cur_r = conn_r.cursor(dictionary=True)
            cur_r.execute("SELECT rol FROM usuarios WHERE id = %s LIMIT 1", (int(user_id),))
            u_row = cur_r.fetchone()
            cur_r.close(); conn_r.close()
            if u_row and u_row.get("rol") in ("agente", "visor"):
                return jsonify({"success": False, "message": "Acción no permitida para colaboradores"}), 403
        except Exception as e:
            logger.error(f"Error verificando rol en delete_custom_field: {e}")
    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("DELETE FROM campos_customizados WHERE id = %s", (id,))
        conn.commit()
        return jsonify({"message": "Field deleted successfully"})
    except Exception as e:
        logger.error(f"Error eliminando campo: {e}")
        return jsonify({"error": str(e)}), 500
    finally:
        conn.close()
# =====================================================================

# =====================================================================
# MODULO: ENVIOS MASIVOS
# =====================================================================
def ensure_campanas_tables(cursor):
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS campanas (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            dispositivo_id INT NOT NULL,
            nombre VARCHAR(150) NOT NULL,
            mensaje TEXT NOT NULL,
            descripcion TEXT DEFAULT NULL,
            tipo VARCHAR(20) DEFAULT 'grupo',
            imagen_url VARCHAR(500) DEFAULT NULL,
            url_media VARCHAR(500) DEFAULT NULL,
            creacion_automatica TINYINT(1) DEFAULT 1,
            mensajes_permiso VARCHAR(20) DEFAULT 'admins',
            admins_json TEXT DEFAULT NULL,
            nombre_variaciones_json TEXT DEFAULT NULL,
            configuracion_avanzada_json TEXT DEFAULT NULL,
            max_participantes INT DEFAULT 1000,
            estrategia VARCHAR(50) DEFAULT 'Paralelo',
            link VARCHAR(500) DEFAULT NULL,
            short_code VARCHAR(16) DEFAULT NULL,
            dominio_personalizado VARCHAR(180) DEFAULT NULL,
            ruta_personalizada VARCHAR(180) DEFAULT NULL,
            clicks INT DEFAULT 0,
            ingresos INT DEFAULT 0,
            estado ENUM('borrador', 'programado', 'enviando', 'completado', 'fallido') DEFAULT 'borrador',
            total_enviados INT DEFAULT 0,
            total_fallidos INT DEFAULT 0,
            programado_para DATETIME DEFAULT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_campanas_usuario (usuario_id),
            INDEX idx_campanas_dispositivo (dispositivo_id),
            UNIQUE KEY idx_campanas_short_code (short_code)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS campana_grupos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            campana_id INT NOT NULL,
            grupo_id INT NOT NULL,
            grupo_modulo_id BIGINT DEFAULT NULL,
            invite_link VARCHAR(500) DEFAULT NULL,
            clicks INT NOT NULL DEFAULT 0,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_campana_grupos_campana (campana_id),
            INDEX idx_campana_grupos_grupo (grupo_id),
            INDEX idx_campana_grupos_modulo (grupo_modulo_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )
    cursor.execute(
        """
        CREATE TABLE IF NOT EXISTS campana_visitas (
            id BIGINT AUTO_INCREMENT PRIMARY KEY,
            campana_id INT NOT NULL,
            grupo_modulo_id BIGINT DEFAULT NULL,
            visitor_key VARCHAR(120) DEFAULT NULL,
            ip_address VARCHAR(80) DEFAULT NULL,
            user_agent TEXT DEFAULT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_campana_visitas_campana (campana_id),
            INDEX idx_campana_visitas_visitor (campana_id, visitor_key)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
        """
    )

    columns = get_table_columns(cursor, "campanas")
    missing_columns = {
        "descripcion": "ALTER TABLE campanas ADD COLUMN descripcion TEXT DEFAULT NULL",
        "tipo": "ALTER TABLE campanas ADD COLUMN tipo VARCHAR(20) DEFAULT 'grupo'",
        "imagen_url": "ALTER TABLE campanas ADD COLUMN imagen_url VARCHAR(500) DEFAULT NULL",
        "creacion_automatica": "ALTER TABLE campanas ADD COLUMN creacion_automatica TINYINT(1) DEFAULT 1",
        "mensajes_permiso": "ALTER TABLE campanas ADD COLUMN mensajes_permiso VARCHAR(20) DEFAULT 'admins'",
        "admins_json": "ALTER TABLE campanas ADD COLUMN admins_json TEXT DEFAULT NULL",
        "nombre_variaciones_json": "ALTER TABLE campanas ADD COLUMN nombre_variaciones_json TEXT DEFAULT NULL",
        "configuracion_avanzada_json": "ALTER TABLE campanas ADD COLUMN configuracion_avanzada_json TEXT DEFAULT NULL",
        "max_participantes": "ALTER TABLE campanas ADD COLUMN max_participantes INT DEFAULT 1000",
        "estrategia": "ALTER TABLE campanas ADD COLUMN estrategia VARCHAR(50) DEFAULT 'Paralelo'",
        "link": "ALTER TABLE campanas ADD COLUMN link VARCHAR(500) DEFAULT NULL",
        "short_code": "ALTER TABLE campanas ADD COLUMN short_code VARCHAR(16) DEFAULT NULL",
        "dominio_personalizado": "ALTER TABLE campanas ADD COLUMN dominio_personalizado VARCHAR(180) DEFAULT NULL",
        "ruta_personalizada": "ALTER TABLE campanas ADD COLUMN ruta_personalizada VARCHAR(180) DEFAULT NULL",
        "clicks": "ALTER TABLE campanas ADD COLUMN clicks INT DEFAULT 0",
        "ingresos": "ALTER TABLE campanas ADD COLUMN ingresos INT DEFAULT 0",
    }
    for column_name, alter_sql in missing_columns.items():
        if column_name not in columns:
            cursor.execute(alter_sql)

    if not table_has_index(cursor, "campanas", "idx_campanas_short_code"):
        cursor.execute("ALTER TABLE campanas ADD UNIQUE KEY idx_campanas_short_code (short_code)")

    group_columns = get_table_columns(cursor, "campana_grupos")
    missing_group_columns = {
        "grupo_modulo_id": "ALTER TABLE campana_grupos ADD COLUMN grupo_modulo_id BIGINT DEFAULT NULL",
        "invite_link": "ALTER TABLE campana_grupos ADD COLUMN invite_link VARCHAR(500) DEFAULT NULL",
        "clicks": "ALTER TABLE campana_grupos ADD COLUMN clicks INT NOT NULL DEFAULT 0",
        "creado_en": "ALTER TABLE campana_grupos ADD COLUMN creado_en DATETIME DEFAULT CURRENT_TIMESTAMP",
    }
    for column_name, alter_sql in missing_group_columns.items():
        if column_name not in group_columns:
            cursor.execute(alter_sql)

    if not table_has_index(cursor, "campana_grupos", "idx_campana_grupos_modulo"):
        cursor.execute("ALTER TABLE campana_grupos ADD INDEX idx_campana_grupos_modulo (grupo_modulo_id)")


def parse_campana_admins(raw_admins):
    if not raw_admins:
        return []
    try:
        admins = json.loads(raw_admins)
        return admins if isinstance(admins, list) else []
    except (TypeError, ValueError):
        return []


def parse_campana_json_object(raw_value):
    if not raw_value:
        return {}
    try:
        value = json.loads(raw_value)
        return value if isinstance(value, dict) else {}
    except (TypeError, ValueError):
        return {}


def campana_short_code_exists(cursor, short_code):
    cursor.execute("SELECT id FROM campanas WHERE short_code = %s LIMIT 1", (short_code,))
    return bool(cursor.fetchone())


def generate_campana_short_code(cursor, length=7):
    alphabet = string.ascii_lowercase + string.digits
    for _ in range(40):
        short_code = "".join(secrets.choice(alphabet) for _ in range(length))
        if not campana_short_code_exists(cursor, short_code):
            return short_code
    return uuid.uuid4().hex[:length]


def build_campana_public_url(short_code):
    return f"{public_base_url()}/c/{short_code}"


def get_campaign_visitor_key():
    cookie_key = request.cookies.get("geo_campaign_visitor")
    if cookie_key:
        return cookie_key[:120], False
    fingerprint = f"{request.remote_addr or ''}|{request.headers.get('User-Agent') or ''}"
    return uuid.uuid5(uuid.NAMESPACE_URL, fingerprint or uuid.uuid4().hex).hex, True


def normalize_campaign_admin_phone(admin):
    raw_phone = str(admin.get("telefono") or admin.get("phone") or admin.get("numero_telefono") or "")
    digits = re.sub(r"\D+", "", raw_phone)
    return digits or None


def campaign_admin_participants(admins, creator_device_id):
    participants = []
    for admin in admins or []:
        if str(admin.get("id")) == str(creator_device_id):
            continue
        phone = normalize_campaign_admin_phone(admin)
        if phone:
            participants.append(phone)
    return list(dict.fromkeys(participants))


def upsert_campaign_group_module(cursor, user_id, device_id, group_payload, tipo="grupo"):
    jid = str(group_payload.get("jid") or "").strip()
    if not jid:
        return None

    nombre = str(group_payload.get("subject") or group_payload.get("nombre") or group_payload.get("name") or jid).strip()
    invite_link = str(group_payload.get("inviteLink") or group_payload.get("invite_link") or "").strip() or None
    participants = group_payload.get("participants")
    participantes_count = len(participants) if isinstance(participants, list) else int(group_payload.get("participantes") or 0)
    admins_count = int(group_payload.get("admins") or 1)

    ensure_groups_module_tables(cursor)
    cursor.execute(
        """
        INSERT INTO grupos_modulo (
            usuario_id, dispositivo_id, jid, nombre, tipo, origen,
            admins_count, participantes_count, estado_sync, invite_link, sincronizado_en
        )
        VALUES (%s, %s, %s, %s, %s, 'Campana', %s, %s, 'activo', %s, NOW())
        ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            tipo = VALUES(tipo),
            admins_count = VALUES(admins_count),
            participantes_count = VALUES(participantes_count),
            estado_sync = 'activo',
            invite_link = COALESCE(VALUES(invite_link), invite_link),
            sincronizado_en = NOW()
        """,
        (user_id, device_id, jid, nombre, tipo, admins_count, participantes_count, invite_link),
    )
    cursor.execute(
        """
        SELECT id
        FROM grupos_modulo
        WHERE usuario_id = %s AND dispositivo_id = %s AND jid = %s
        LIMIT 1
        """,
        (user_id, device_id, jid),
    )
    row = cursor.fetchone()
    return row.get("id") if isinstance(row, dict) else (row[0] if row else None)


def link_group_to_campaign(cursor, campana_id, grupo_modulo_id, invite_link=None):
    if not grupo_modulo_id:
        return
    cursor.execute(
        """
        SELECT id
        FROM campana_grupos
        WHERE campana_id = %s AND grupo_modulo_id = %s
        LIMIT 1
        """,
        (campana_id, grupo_modulo_id),
    )
    if cursor.fetchone():
        return

    # Retrieve device_id, jid and name from grupos_modulo to keep the legacy 'grupos' table in sync and satisfy foreign keys
    cursor.execute(
        "SELECT dispositivo_id, jid, nombre FROM grupos_modulo WHERE id = %s LIMIT 1",
        (grupo_modulo_id,)
    )
    gm_row = cursor.fetchone()
    grupo_id = 0
    if gm_row:
        device_id = gm_row.get("dispositivo_id") if isinstance(gm_row, dict) else gm_row[0]
        jid = gm_row.get("jid") if isinstance(gm_row, dict) else gm_row[1]
        nombre_grupo = gm_row.get("nombre") if isinstance(gm_row, dict) else gm_row[2]

        # Insert or update in legacy 'grupos' table
        cursor.execute(
            """
            INSERT INTO grupos (dispositivo_id, jid, nombre)
            VALUES (%s, %s, %s)
            ON DUPLICATE KEY UPDATE
                nombre = VALUES(nombre),
                actualizado_en = NOW()
            """,
            (device_id, jid, nombre_grupo),
        )
        cursor.execute(
            "SELECT id FROM grupos WHERE dispositivo_id = %s AND jid = %s LIMIT 1",
            (device_id, jid)
        )
        g_row = cursor.fetchone()
        grupo_id = g_row.get("id") if isinstance(g_row, dict) else (g_row[0] if g_row else 0)

    cursor.execute(
        """
        INSERT INTO campana_grupos (campana_id, grupo_id, grupo_modulo_id, invite_link)
        VALUES (%s, %s, %s, %s)
        """,
        (campana_id, grupo_id, grupo_modulo_id, invite_link),
    )


def try_create_campaign_group(cursor, user_id, campana_id, data, admins, short_code):
    tipo = (data.get("tipo") or "grupo").strip().lower()
    if tipo != "grupo" or not data.get("creacion_automatica", True):
        return None

    device_id = data.get("dispositivo_id")
    participants = campaign_admin_participants(admins, device_id)
    if not participants:
        return {"success": False, "message": "Campana guardada. Agrega un backup o importa un grupo para generar link de invitacion."}

    group_name = str(data.get("nombre") or "").strip()
    response = post_bridge_json(
        device_id,
        "/groups/create",
        {
            "subject": group_name,
            "participants": participants,
            "description": data.get("descripcion") or "",
            "picture": data.get("imagen_url") or "",
        },
        timeout=45,
        user_id=user_id,
    )
    if not response.get("success"):
        return {"success": False, "message": response.get("error") or "No se pudo crear el grupo automaticamente"}

    grupo_modulo_id = upsert_campaign_group_module(cursor, user_id, device_id, response, tipo="grupo")
    link_group_to_campaign(cursor, campana_id, grupo_modulo_id, response.get("inviteLink"))
    if not response.get("inviteLink"):
        return {
            "success": False,
            "grupo_modulo_id": grupo_modulo_id,
            "message": "Grupo creado, pero WhatsApp no devolvio el link de invitacion. Sincroniza el grupo para activar el link publico.",
        }
    return {"success": True, "grupo_modulo_id": grupo_modulo_id, "inviteLink": response.get("inviteLink"), "short_code": short_code}


def serialize_campana(row):
    admins = parse_campana_admins(row.get("admins_json"))
    short_code = row.get("short_code")
    short_url = build_campana_public_url(short_code) if short_code else None
    return {
        "id": row.get("id"),
        "nombre": row.get("nombre"),
        "descripcion": row.get("descripcion") or row.get("mensaje") or "",
        "tipo": row.get("tipo") or "grupo",
        "imagen_url": row.get("imagen_url") or row.get("url_media"),
        "link": row.get("link") or short_url,
        "short_code": short_code,
        "short_url": short_url,
        "dominio_personalizado": row.get("dominio_personalizado"),
        "ruta_personalizada": row.get("ruta_personalizada"),
        "grupos": int(row.get("grupos") or 0),
        "administradores": len(admins),
        "admins": admins,
        "nombre_variaciones": parse_campana_admins(row.get("nombre_variaciones_json")),
        "configuracion_avanzada": parse_campana_json_object(row.get("configuracion_avanzada_json")),
        "ingresos": int(row.get("ingresos") or 0),
        "clicks": int(row.get("clicks") or 0),
        "estado": row.get("estado") or "borrador",
        "dispositivo_id": row.get("dispositivo_id"),
        "dispositivo_nombre": row.get("dispositivo_nombre"),
        "creado_en": as_json_value(row.get("creado_en")),
    }


@app.route('/api/campanas/options', methods=['GET'])
def get_campanas_options():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_campanas_tables(cursor)
        conn.commit()

        cursor.execute(
            """
            SELECT id, nombre, numero_telefono, estado
            FROM dispositivos
            WHERE usuario_id = %s
            ORDER BY FIELD(estado, 'conectado') DESC, id ASC
            """,
            (user_id,),
        )
        return jsonify({"success": True, "data": {"devices": cursor.fetchall()}})
    except Exception as error:
        logger.exception("Error cargando opciones de campanas")
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/campanas', methods=['GET'])
def get_campanas():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    search = (request.args.get("q") or "").strip()
    tipo = (request.args.get("tipo") or "todos").strip().lower()
    dispositivo_id = (request.args.get("dispositivo_id") or "todos").strip()

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_campanas_tables(cursor)
        conn.commit()

        where_clauses = ["c.usuario_id = %s"]
        params = [user_id]

        if search:
            where_clauses.append("c.nombre LIKE %s")
            params.append(f"%{search}%")
        if tipo in ("grupo", "comunidad", "canal"):
            where_clauses.append("COALESCE(c.tipo, 'grupo') = %s")
            params.append(tipo)
        if dispositivo_id not in ("", "todos", "null", "undefined"):
            where_clauses.append("c.dispositivo_id = %s")
            params.append(dispositivo_id)

        cursor.execute(
            """
            SELECT id, nombre, numero_telefono, estado
            FROM dispositivos
            WHERE usuario_id = %s
            ORDER BY FIELD(estado, 'conectado') DESC, id ASC
            """,
            (user_id,),
        )
        devices = cursor.fetchall()

        cursor.execute(
            f"""
            SELECT
                c.*,
                d.nombre AS dispositivo_nombre,
                (
                    SELECT COUNT(*)
                    FROM campana_grupos cg
                    WHERE cg.campana_id = c.id
                ) AS grupos
            FROM campanas c
            LEFT JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE {' AND '.join(where_clauses)}
            ORDER BY c.creado_en DESC, c.id DESC
            """,
            tuple(params),
        )
        items = [serialize_campana(row) for row in cursor.fetchall()]
        return jsonify({"success": True, "data": {"items": items, "devices": devices}})
    except Exception as error:
        logger.exception("Error listando campanas")
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/campanas/<int:campana_id>', methods=['GET'])
def get_campana_detail(campana_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_campanas_tables(cursor)
        conn.commit()
        cursor.execute(
            """
            SELECT
                c.*,
                d.nombre AS dispositivo_nombre,
                (
                    SELECT COUNT(*)
                    FROM campana_grupos cg
                    WHERE cg.campana_id = c.id
                ) AS grupos
            FROM campanas c
            LEFT JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE c.id = %s AND c.usuario_id = %s
            LIMIT 1
            """,
            (campana_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Campana no encontrada"}), 404
        return jsonify({"success": True, "data": serialize_campana(row)})
    except Exception as error:
        logger.exception("Error obteniendo campana")
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/campanas/<int:campana_id>', methods=['PUT'])
def update_campana(campana_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    data = request.get_json(silent=True) or {}
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_campanas_tables(cursor)
        cursor.execute("SELECT id FROM campanas WHERE id = %s AND usuario_id = %s LIMIT 1", (campana_id, user_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Campana no encontrada"}), 404

        allowed_statuses = {"borrador", "programado", "enviando", "completado", "fallido"}
        updates = []
        params = []

        if "nombre" in data:
            nombre = str(data.get("nombre") or "").strip()
            if not nombre:
                return jsonify({"success": False, "message": "Nombre requerido"}), 400
            updates.append("nombre = %s")
            params.append(nombre)
        if "descripcion" in data:
            descripcion = str(data.get("descripcion") or "").strip()
            if not descripcion:
                return jsonify({"success": False, "message": "Descripcion requerida"}), 400
            updates.extend(["descripcion = %s", "mensaje = %s"])
            params.extend([descripcion, descripcion])
        if "tipo" in data:
            tipo = str(data.get("tipo") or "grupo").strip().lower()
            if tipo not in ("grupo", "comunidad", "canal"):
                return jsonify({"success": False, "message": "Tipo de campana invalido"}), 400
            updates.append("tipo = %s")
            params.append(tipo)
        if "estado" in data:
            estado = str(data.get("estado") or "borrador").strip().lower()
            if estado not in allowed_statuses:
                return jsonify({"success": False, "message": "Estado invalido"}), 400
            updates.append("estado = %s")
            params.append(estado)
        if "link" in data:
            updates.append("link = %s")
            params.append(str(data.get("link") or "").strip() or None)
        if "imagen_url" in data:
            updates.extend(["imagen_url = %s", "url_media = %s"])
            params.extend([data.get("imagen_url"), data.get("imagen_url")])
        if "admins" in data:
            admins = data.get("admins")
            if not isinstance(admins, list):
                return jsonify({"success": False, "message": "Administradores invalidos"}), 400
            updates.append("admins_json = %s")
            params.append(json.dumps(admins, ensure_ascii=False))
        if "nombre_variaciones" in data:
            updates.append("nombre_variaciones_json = %s")
            params.append(json.dumps(data.get("nombre_variaciones") or [], ensure_ascii=False))
        if "configuracion_avanzada" in data:
            configuracion = data.get("configuracion_avanzada") if isinstance(data.get("configuracion_avanzada"), dict) else {}
            link_config = configuracion.get("link_personalizado") if isinstance(configuracion.get("link_personalizado"), dict) else {}
            updates.append("configuracion_avanzada_json = %s")
            params.append(json.dumps(configuracion, ensure_ascii=False))
            updates.append("dominio_personalizado = %s")
            params.append(str(link_config.get("dominio") or "").strip() or None)
            updates.append("ruta_personalizada = %s")
            params.append(str(link_config.get("ruta") or "").strip().strip("/") or None)
        if "max_participantes" in data:
            updates.append("max_participantes = %s")
            params.append(int(data.get("max_participantes") or 1000))
        if "estrategia" in data:
            updates.append("estrategia = %s")
            params.append(str(data.get("estrategia") or "Paralelo"))

        if updates:
            params.extend([campana_id, user_id])
            cursor.execute(f"UPDATE campanas SET {', '.join(updates)} WHERE id = %s AND usuario_id = %s", tuple(params))
            conn.commit()

        cursor.execute(
            """
            SELECT c.*, d.nombre AS dispositivo_nombre,
                (SELECT COUNT(*) FROM campana_grupos cg WHERE cg.campana_id = c.id) AS grupos
            FROM campanas c
            LEFT JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE c.id = %s AND c.usuario_id = %s
            LIMIT 1
            """,
            (campana_id, user_id),
        )
        return jsonify({"success": True, "data": serialize_campana(cursor.fetchone()), "message": "Campana actualizada correctamente"})
    except Exception as error:
        if conn:
            conn.rollback()
        logger.exception("Error actualizando campana")
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/campanas/<int:campana_id>', methods=['DELETE'])
def delete_campana(campana_id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_campanas_tables(cursor)
        cursor.execute("SELECT id FROM campanas WHERE id = %s AND usuario_id = %s LIMIT 1", (campana_id, user_id))
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Campana no encontrada"}), 404
        cursor.execute("DELETE FROM campana_visitas WHERE campana_id = %s", (campana_id,))
        cursor.execute("DELETE FROM campana_grupos WHERE campana_id = %s", (campana_id,))
        cursor.execute("DELETE FROM campanas WHERE id = %s AND usuario_id = %s", (campana_id, user_id))
        conn.commit()
        return jsonify({"success": True, "message": "Campana eliminada correctamente"})
    except Exception as error:
        if conn:
            conn.rollback()
        logger.exception("Error eliminando campana")
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/campanas', methods=['POST'])
def create_campana():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip()
    descripcion = (data.get("descripcion") or "").strip()
    tipo = (data.get("tipo") or "grupo").strip().lower()
    dispositivo_id = data.get("dispositivo_id")
    admins = data.get("admins") or []

    if not nombre:
        return jsonify({"success": False, "message": "Nombre requerido"}), 400
    if not descripcion:
        return jsonify({"success": False, "message": "Descripcion requerida"}), 400
    if tipo not in ("grupo", "comunidad", "canal"):
        return jsonify({"success": False, "message": "Tipo de campana invalido"}), 400
    if not isinstance(admins, list):
        return jsonify({"success": False, "message": "Administradores invalidos"}), 400
    if tipo == "canal":
        if len(admins) < 1:
            return jsonify({"success": False, "message": "Debes seleccionar el numero creador del canal"}), 400
    elif len(admins) < 2:
        return jsonify({"success": False, "message": "Debes agregar al menos 2 administradores"}), 400
    if not dispositivo_id:
        return jsonify({"success": False, "message": "Debes agregar al menos 1 numero conectado como administrador"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_campanas_tables(cursor)

        # Validar si el plan del usuario permite campanas e IA de grupos
        cursor.execute(
            """
            SELECT p.permite_campanas, p.permite_ia_grupos
            FROM suscripciones s
            INNER JOIN planes p ON p.id = s.plan_id
            WHERE s.usuario_id = %s
            ORDER BY FIELD(s.estado, 'activa', 'prueba', 'vencida', 'cancelada'), s.fecha_vencimiento DESC, s.id DESC
            LIMIT 1
            """,
            (user_id,)
        )
        plan_res = cursor.fetchone()
        permite_campanas = bool(plan_res.get("permite_campanas")) if plan_res else False
        permite_ia_grupos = bool(plan_res.get("permite_ia_grupos")) if plan_res else False

        if not permite_campanas:
            return jsonify({"success": False, "message": "Tu plan actual no incluye la funcionalidad de Campañas. Por favor, mejora tu plan."}), 403

        cursor.execute(
            "SELECT id FROM dispositivos WHERE id = %s AND usuario_id = %s LIMIT 1",
            (dispositivo_id, user_id),
        )
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Dispositivo no encontrado o no autorizado"}), 404

        configuracion_avanzada = data.get("configuracion_avanzada") if isinstance(data.get("configuracion_avanzada"), dict) else {}
        link_config = configuracion_avanzada.get("link_personalizado") if isinstance(configuracion_avanzada.get("link_personalizado"), dict) else {}
        short_code = generate_campana_short_code(cursor)
        public_link = build_campana_public_url(short_code)

        # Si el plan no tiene IA de grupos, se deshabilitan dominios y rutas personalizadas
        dominio_personalizado = None
        ruta_personalizada = None
        if permite_ia_grupos:
            dominio_personalizado = str(link_config.get("dominio") or "").strip() or None
            ruta_personalizada = str(link_config.get("ruta") or "").strip().strip("/") or None

        link_candidate = str(data.get("link") or "").strip() or str(link_config.get("preview") or "").strip()
        link_value = public_link if not link_candidate or "auto-generado" in link_candidate else link_candidate
        admins_json = json.dumps(admins, ensure_ascii=False)
        nombre_variaciones_json = json.dumps(data.get("nombre_variaciones") or [], ensure_ascii=False)
        configuracion_avanzada_json = json.dumps(configuracion_avanzada, ensure_ascii=False)
        cursor.execute(
            """
            INSERT INTO campanas (
                usuario_id, dispositivo_id, nombre, mensaje, descripcion, tipo,
                imagen_url, url_media, creacion_automatica, mensajes_permiso,
                admins_json, nombre_variaciones_json, configuracion_avanzada_json, max_participantes, estrategia,
                link, short_code, dominio_personalizado, ruta_personalizada, estado,
                total_enviados, total_fallidos
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, 'borrador', 0, 0)
            """,
            (
                user_id,
                dispositivo_id,
                nombre,
                descripcion,
                descripcion,
                tipo,
                data.get("imagen_url"),
                data.get("imagen_url"),
                1 if data.get("creacion_automatica", True) else 0,
                data.get("mensajes_permiso") or "admins",
                admins_json,
                nombre_variaciones_json,
                configuracion_avanzada_json,
                int(data.get("max_participantes") or 1000),
                data.get("estrategia") or "Paralelo",
                link_value,
                short_code,
                dominio_personalizado,
                ruta_personalizada,
            ),
        )
        campana_id = cursor.lastrowid
        bridge_result = try_create_campaign_group(
            cursor,
            user_id,
            campana_id,
            {**data, "nombre": nombre, "descripcion": descripcion, "tipo": tipo, "dispositivo_id": dispositivo_id},
            admins,
            short_code,
        )
        conn.commit()
        message = "Campana creada correctamente"
        if bridge_result and not bridge_result.get("success"):
            message = f"{message}. {bridge_result.get('message')}"
        return jsonify({
            "success": True,
            "data": {
                "id": campana_id,
                "link": public_link,
                "short_code": short_code,
                "short_url": public_link,
                "bridge": bridge_result,
            },
            "message": message,
        })
    except Exception as error:
        if conn:
            conn.rollback()
        logger.exception("Error creando campana")
        return jsonify({"success": False, "message": str(error)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/api/campanas/upload-image', methods=['POST'])
def upload_campana_image():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "Usuario requerido"}), 401

    file = request.files.get("file")
    if not file or not file.filename:
        return jsonify({"success": False, "message": "Imagen requerida"}), 400
    if not allowed_image_file(file.filename):
        return jsonify({"success": False, "message": "Formato de imagen no permitido"}), 400

    try:
        upload_dir = os.path.join(app.config["UPLOAD_FOLDER"], "campanas", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        filename = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        file.save(os.path.join(upload_dir, unique_name))
        media_path = f"campanas/{user_id}/{unique_name}"
        return jsonify({
            "success": True,
            "url": f"{request.host_url.rstrip('/')}/media/{media_path}",
            "filename": filename,
        })
    except Exception as error:
        logger.exception("Error subiendo imagen de campana")
        return jsonify({"success": False, "message": str(error)}), 500


def campaign_message_page(title, message, status=200):
    safe_title = html.escape(title or "Campana")
    safe_message = html.escape(message or "")
    return Response(
        f"""
        <!doctype html>
        <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>{safe_title}</title>
          <style>
            body {{ margin: 0; min-height: 100vh; display: grid; place-items: center; font-family: Arial, sans-serif; background: #f6f7fb; color: #111827; }}
            main {{ width: min(92vw, 460px); border: 1px solid #e5e7eb; border-radius: 18px; padding: 28px; background: white; box-shadow: 0 18px 45px rgba(15, 23, 42, .08); text-align: center; }}
            h1 {{ margin: 0 0 10px; font-size: 22px; }}
            p {{ margin: 0; color: #64748b; line-height: 1.5; }}
          </style>
        </head>
        <body><main><h1>{safe_title}</h1><p>{safe_message}</p></main></body>
        </html>
        """,
        status=status,
        mimetype="text/html",
    )



@app.route('/api/public/campana/<short_code>', methods=['GET'])
def get_public_campana_redirect(short_code):
    clean_code = re.sub(r"[^a-zA-Z0-9_-]", "", short_code or "")[:32]
    if not clean_code:
        return jsonify({"success": False, "message": "Link inválido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_campanas_tables(cursor)
        ensure_groups_module_tables(cursor)
        conn.commit()
        cursor.execute("SELECT * FROM campanas WHERE short_code = %s LIMIT 1", (clean_code,))
        campana = cursor.fetchone()
        if not campana:
            return jsonify({"success": False, "message": "Campaña no encontrada"}), 404
        if (campana.get("estado") or "borrador") == "fallido":
            return jsonify({"success": False, "message": "Campaña no disponible"}), 410

        config = parse_campana_json_object(campana.get("configuracion_avanzada_json"))
        max_participantes = int(config.get("max_participantes") or campana.get("max_participantes") or 1000)
        max_clicks = int(config.get("max_clicks") or 1000)
        distribucion = str(config.get("distribucion_visitas") or "equilibrado")
        recordar = bool(config.get("recordar_grupo_visitante", True))
        visitor_key, should_set_cookie = get_campaign_visitor_key()

        selected = None
        if recordar and visitor_key:
            cursor.execute(
                """
                SELECT
                    cv.grupo_modulo_id,
                    cg.id AS campana_grupo_id,
                    COALESCE(cg.invite_link, gm.invite_link) AS invite_link
                FROM campana_visitas cv
                JOIN campana_grupos cg ON cg.campana_id = cv.campana_id AND cg.grupo_modulo_id = cv.grupo_modulo_id
                LEFT JOIN grupos_modulo gm ON gm.id = cv.grupo_modulo_id
                WHERE cv.campana_id = %s
                    AND cv.visitor_key = %s
                    AND COALESCE(cg.invite_link, gm.invite_link) IS NOT NULL
                    AND COALESCE(cg.invite_link, gm.invite_link) <> ''
                ORDER BY cv.id DESC
                LIMIT 1
                """,
                (campana["id"], visitor_key),
            )
            selected = cursor.fetchone()

        if not selected:
            order_sql = "cg.id ASC" if distribucion in ("uno_a_la_vez", "uno-a-la-vez") else "COALESCE(cg.clicks, 0) ASC, COALESCE(gm.participantes_count, 0) ASC, cg.id ASC"
            cursor.execute(
                f"""
                SELECT
                    cg.id AS campana_grupo_id,
                    cg.grupo_modulo_id,
                    COALESCE(cg.invite_link, gm.invite_link) AS invite_link
                FROM campana_grupos cg
                LEFT JOIN grupos_modulo gm ON gm.id = cg.grupo_modulo_id
                WHERE cg.campana_id = %s
                    AND COALESCE(cg.invite_link, gm.invite_link) IS NOT NULL
                    AND COALESCE(cg.invite_link, gm.invite_link) <> ''
                    AND COALESCE(cg.clicks, 0) < %s
                    AND (gm.id IS NULL OR gm.eliminado_en IS NULL)
                    AND (gm.id IS NULL OR COALESCE(gm.lleno, 0) = 0)
                    AND (gm.id IS NULL OR COALESCE(gm.participantes_count, 0) < %s)
                ORDER BY {order_sql}
                LIMIT 1
                """,
                (campana["id"], max_clicks, max_participantes),
            )
            selected = cursor.fetchone()

        if not selected or not selected.get("invite_link"):
            return jsonify({"success": False, "message": "Esta campaña no tiene grupos de WhatsApp disponibles en este momento."}), 404

        cursor.execute("UPDATE campanas SET clicks = COALESCE(clicks, 0) + 1, ingresos = COALESCE(ingresos, 0) + 1 WHERE id = %s", (campana["id"],))
        cursor.execute("UPDATE campana_grupos SET clicks = COALESCE(clicks, 0) + 1 WHERE id = %s", (selected["campana_grupo_id"],))
        if selected.get("grupo_modulo_id"):
            cursor.execute("UPDATE grupos_modulo SET clicks = COALESCE(clicks, 0) + 1 WHERE id = %s", (selected["grupo_modulo_id"],))
        cursor.execute(
            """
            INSERT INTO campana_visitas (campana_id, grupo_modulo_id, visitor_key, ip_address, user_agent)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                campana["id"],
                selected.get("grupo_modulo_id"),
                visitor_key,
                (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip(),
                request.headers.get("User-Agent", "")[:1000],
            ),
        )
        conn.commit()

        response = jsonify({"success": True, "invite_link": selected["invite_link"]})
        if should_set_cookie:
            response.set_cookie("geo_campaign_visitor", visitor_key, max_age=60 * 60 * 24 * 365, httponly=True, samesite="Lax")
        return response
    except Exception as err:
        if conn:
            conn.rollback()
        logger.exception("Error en api public campana redirect")
        return jsonify({"success": False, "message": "Error interno del servidor."}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/public/whalink/<short_code>", methods=["GET"])
def get_public_whalink(short_code):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_whalinks_table(cursor)
        ensure_whalink_clicks_table(cursor)
        ensure_whalink_leads_table(cursor)
        columns = get_table_columns(cursor, "whalinks")
        device_expr = whalink_device_expr(columns)

        select_fields = whalink_select_fields(columns)
        where_parts = ["w.short_code = %s"]
        params = [short_code]

        if "slug" in columns:
            where_parts.append("w.slug = %s")
            params.append(short_code)

        cursor.execute(
            f"""
            SELECT {', '.join(select_fields)}
            FROM whalinks w
            LEFT JOIN dispositivos d ON d.id = {device_expr}
            WHERE {' OR '.join(where_parts)}
            LIMIT 1
            """,
            tuple(params),
        )
        whalink = cursor.fetchone()

        if not whalink:
            return jsonify({"success": False, "message": "Link corto no encontrado"}), 404

        link_message = whalink.get("mensaje") or whalink.get("mensaje_bienvenida") or ""
        if link_message.lower() == "hola":
            link_message = ""
            
        whatsapp_url = (
            whalink.get("url_generada")
            or build_whatsapp_url(
                whalink.get("numero_telefono"),
                link_message,
            )
        )

        if not whatsapp_url:
            return jsonify({"success": False, "message": "El link corto no tiene destino configurado"}), 404

        has_landing = bool(
            str(whalink.get("pixel_tracking") or "").strip()
            or str(whalink.get("clave_nombre") or "").strip()
            or str(whalink.get("clave_correo") or "").strip()
        )

        if not has_landing:
            user_agent = request.headers.get("User-Agent", "")
            ip_address = (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip()
            client_type = detect_client_device_type(user_agent)
            stored_short_code = whalink.get("short_code") or whalink.get("slug") or short_code
            
            cursor.execute(
                """
                INSERT INTO whalink_clicks (
                    whalink_id, short_code, ip_address, user_agent, device_type, clicked_at
                )
                VALUES (%s, %s, %s, %s, %s, NOW())
                """,
                (
                    whalink.get("id"),
                    stored_short_code,
                    ip_address,
                    user_agent,
                    client_type,
                ),
            )

            if "total_clics" in columns:
                cursor.execute(
                    """
                    UPDATE whalinks
                    SET total_clics = COALESCE(total_clics, 0) + 1
                    WHERE id = %s
                    """,
                    (whalink.get("id"),),
                )
            conn.commit()

        return jsonify({
            "success": True,
            "has_landing": has_landing,
            "whatsapp_url": whatsapp_url,
            "nombre": whalink.get("nombre") or "GEOCHAT",
            "descripcion": whalink.get("descripcion") or "Completa tus datos para continuar a WhatsApp.",
            "imagen_url": whalink.get("imagen_url") or "",
            "clave_nombre": str(whalink.get("clave_nombre") or "").strip(),
            "clave_correo": str(whalink.get("clave_correo") or "").strip(),
            "pixel_tracking": str(whalink.get("pixel_tracking") or "").strip()
        })
    except Exception as error:
        if conn:
            conn.rollback()
        logger.exception("Error obteniendo whalink publico")
        return jsonify({"success": False, "message": "Error del servidor"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/public/whalink/<short_code>/lead", methods=["POST"])
def post_public_whalink_lead(short_code):
    data = request.get_json(silent=True) or {}
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_whalinks_table(cursor)
        ensure_whalink_clicks_table(cursor)
        ensure_whalink_leads_table(cursor)
        columns = get_table_columns(cursor, "whalinks")
        device_expr = whalink_device_expr(columns)

        select_fields = whalink_select_fields(columns)
        where_parts = ["w.short_code = %s"]
        params = [short_code]

        if "slug" in columns:
            where_parts.append("w.slug = %s")
            params.append(short_code)

        cursor.execute(
            f"""
            SELECT {', '.join(select_fields)}
            FROM whalinks w
            LEFT JOIN dispositivos d ON d.id = {device_expr}
            WHERE {' OR '.join(where_parts)}
            LIMIT 1
            """,
            tuple(params),
        )
        whalink = cursor.fetchone()

        if not whalink:
            return jsonify({"success": False, "message": "Link corto no encontrado"}), 404

        link_message = whalink.get("mensaje") or whalink.get("mensaje_bienvenida") or ""
        if link_message.lower() == "hola":
            link_message = ""
            
        whatsapp_url = (
            whalink.get("url_generada")
            or build_whatsapp_url(
                whalink.get("numero_telefono"),
                link_message,
            )
        )

        user_agent = request.headers.get("User-Agent", "")
        ip_address = (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip()
        client_type = detect_client_device_type(user_agent)
        stored_short_code = whalink.get("short_code") or whalink.get("slug") or short_code

        name_key = str(whalink.get("clave_nombre") or "").strip()
        email_key = str(whalink.get("clave_correo") or "").strip()
        
        lead_name = str(data.get("nombre") or "").strip()
        lead_email = str(data.get("correo") or "").strip()

        if lead_name or lead_email:
            should_insert = True
            if lead_email:
                cursor.execute(
                    "SELECT id FROM whalink_leads WHERE whalink_id = %s AND correo = %s LIMIT 1",
                    (whalink.get("id"), lead_email),
                )
                if cursor.fetchone():
                    should_insert = False

            if should_insert:
                cursor.execute(
                    """
                    INSERT INTO whalink_leads (
                        whalink_id, short_code, nombre, correo, ip_address, user_agent, creado_en
                    )
                    VALUES (%s, %s, %s, %s, %s, %s, NOW())
                    """,
                    (
                        whalink.get("id"),
                        stored_short_code,
                        lead_name or None,
                        lead_email or None,
                        ip_address,
                        user_agent,
                    ),
                )

        cursor.execute(
            """
            INSERT INTO whalink_clicks (
                whalink_id, short_code, ip_address, user_agent, device_type, clicked_at
            )
            VALUES (%s, %s, %s, %s, %s, NOW())
            """,
            (
                whalink.get("id"),
                stored_short_code,
                ip_address,
                user_agent,
                client_type,
            ),
        )

        if "total_clics" in columns:
            cursor.execute(
                """
                UPDATE whalinks
                SET total_clics = COALESCE(total_clics, 0) + 1
                WHERE id = %s
                """,
                (whalink.get("id"),),
            )

        conn.commit()
        return jsonify({"success": True, "whatsapp_url": whatsapp_url})
    except Exception as error:
        if conn:
            conn.rollback()
        logger.exception("Error registrando lead en whalink")
        return jsonify({"success": False, "message": "Error del servidor"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route('/c/<short_code>', methods=['GET'])
def open_campana_public_link(short_code):
    clean_code = re.sub(r"[^a-zA-Z0-9_-]", "", short_code or "")[:32]
    if not clean_code:
        return campaign_message_page("Link invalido", "No se encontro esta campana.", 404)

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_campanas_tables(cursor)
        ensure_groups_module_tables(cursor)
        conn.commit()
        cursor.execute("SELECT * FROM campanas WHERE short_code = %s LIMIT 1", (clean_code,))
        campana = cursor.fetchone()
        if not campana:
            return campaign_message_page("Campana no encontrada", "Este enlace no existe o ya no esta disponible.", 404)
        if (campana.get("estado") or "borrador") == "fallido":
            return campaign_message_page("Campana no disponible", "Este enlace no esta disponible en este momento.", 410)

        config = parse_campana_json_object(campana.get("configuracion_avanzada_json"))
        max_participantes = int(config.get("max_participantes") or campana.get("max_participantes") or 1000)
        max_clicks = int(config.get("max_clicks") or 1000)
        distribucion = str(config.get("distribucion_visitas") or "equilibrado")
        recordar = bool(config.get("recordar_grupo_visitante", True))
        visitor_key, should_set_cookie = get_campaign_visitor_key()

        selected = None
        if recordar and visitor_key:
            cursor.execute(
                """
                SELECT
                    cv.grupo_modulo_id,
                    cg.id AS campana_grupo_id,
                    COALESCE(cg.invite_link, gm.invite_link) AS invite_link
                FROM campana_visitas cv
                JOIN campana_grupos cg ON cg.campana_id = cv.campana_id AND cg.grupo_modulo_id = cv.grupo_modulo_id
                LEFT JOIN grupos_modulo gm ON gm.id = cv.grupo_modulo_id
                WHERE cv.campana_id = %s
                    AND cv.visitor_key = %s
                    AND COALESCE(cg.invite_link, gm.invite_link) IS NOT NULL
                    AND COALESCE(cg.invite_link, gm.invite_link) <> ''
                ORDER BY cv.id DESC
                LIMIT 1
                """,
                (campana["id"], visitor_key),
            )
            selected = cursor.fetchone()

        if not selected:
            order_sql = "cg.id ASC" if distribucion in ("uno_a_la_vez", "uno-a-la-vez") else "COALESCE(cg.clicks, 0) ASC, COALESCE(gm.participantes_count, 0) ASC, cg.id ASC"
            cursor.execute(
                f"""
                SELECT
                    cg.id AS campana_grupo_id,
                    cg.grupo_modulo_id,
                    COALESCE(cg.invite_link, gm.invite_link) AS invite_link
                FROM campana_grupos cg
                LEFT JOIN grupos_modulo gm ON gm.id = cg.grupo_modulo_id
                WHERE cg.campana_id = %s
                    AND COALESCE(cg.invite_link, gm.invite_link) IS NOT NULL
                    AND COALESCE(cg.invite_link, gm.invite_link) <> ''
                    AND COALESCE(cg.clicks, 0) < %s
                    AND (gm.id IS NULL OR gm.eliminado_en IS NULL)
                    AND (gm.id IS NULL OR COALESCE(gm.lleno, 0) = 0)
                    AND (gm.id IS NULL OR COALESCE(gm.participantes_count, 0) < %s)
                ORDER BY {order_sql}
                LIMIT 1
                """,
                (campana["id"], max_clicks, max_participantes),
            )
            selected = cursor.fetchone()

        if not selected or not selected.get("invite_link"):
            return campaign_message_page("Sin grupos disponibles", "Esta campana no tiene grupos disponibles para redirigir en este momento.", 404)

        cursor.execute("UPDATE campanas SET clicks = COALESCE(clicks, 0) + 1, ingresos = COALESCE(ingresos, 0) + 1 WHERE id = %s", (campana["id"],))
        cursor.execute("UPDATE campana_grupos SET clicks = COALESCE(clicks, 0) + 1 WHERE id = %s", (selected["campana_grupo_id"],))
        if selected.get("grupo_modulo_id"):
            cursor.execute("UPDATE grupos_modulo SET clicks = COALESCE(clicks, 0) + 1 WHERE id = %s", (selected["grupo_modulo_id"],))
        cursor.execute(
            """
            INSERT INTO campana_visitas (campana_id, grupo_modulo_id, visitor_key, ip_address, user_agent)
            VALUES (%s, %s, %s, %s, %s)
            """,
            (
                campana["id"],
                selected.get("grupo_modulo_id"),
                visitor_key,
                (request.headers.get("X-Forwarded-For") or request.remote_addr or "").split(",")[0].strip(),
                request.headers.get("User-Agent", "")[:1000],
            ),
        )
        conn.commit()

        response = redirect(selected["invite_link"], code=302)
        if should_set_cookie:
            response.set_cookie("geo_campaign_visitor", visitor_key, max_age=60 * 60 * 24 * 365, httponly=True, samesite="Lax")
        return response
    except Exception as error:
        if conn:
            conn.rollback()
        logger.exception("Error abriendo link publico de campana")
        return campaign_message_page("Error", "No se pudo abrir esta campana. Intentalo nuevamente.", 500)
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


def ensure_envios_masivos_tables(cursor):
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS envios_masivos (
            id INT AUTO_INCREMENT PRIMARY KEY,
            usuario_id INT NOT NULL,
            dispositivo_id INT NOT NULL,
            nombre VARCHAR(150) NOT NULL,
            mensaje TEXT NOT NULL,
            url_media VARCHAR(500) DEFAULT NULL,
            media_type VARCHAR(20) DEFAULT NULL,
            velocidad_envio VARCHAR(20) DEFAULT 'lento',
            estado ENUM('borrador', 'programado', 'enviando', 'completado', 'fallido') DEFAULT 'borrador',
            total_enviados INT DEFAULT 0,
            total_fallidos INT DEFAULT 0,
            total_pendientes INT DEFAULT 0,
            programado_para DATETIME DEFAULT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            INDEX idx_envios_masivos_usuario (usuario_id),
            INDEX idx_envios_masivos_dispositivo (dispositivo_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS destinatarios_envio (
            id INT AUTO_INCREMENT PRIMARY KEY,
            envio_id INT NOT NULL,
            contacto_id INT NOT NULL,
            estado ENUM('pendiente', 'enviado', 'fallido') DEFAULT 'pendiente',
            mensaje_error VARCHAR(500) DEFAULT NULL,
            enviado_en DATETIME DEFAULT NULL,
            INDEX idx_destinatarios_envio_campana (envio_id),
            INDEX idx_destinatarios_envio_contacto (contacto_id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    """)
    envio_columns = get_table_columns(cursor, "envios_masivos")
    if "media_type" not in envio_columns:
        cursor.execute("ALTER TABLE envios_masivos ADD COLUMN media_type VARCHAR(20) DEFAULT NULL AFTER url_media")
    if "velocidad_envio" not in envio_columns:
        cursor.execute("ALTER TABLE envios_masivos ADD COLUMN velocidad_envio VARCHAR(20) DEFAULT 'lento' AFTER media_type")

@app.route('/api/envios_masivos', methods=['GET'])
def get_envios_masivos():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    search = request.args.get("search", "").strip()
    limit = request.args.get("limit", "25")
    offset = request.args.get("offset", "0")

    try:
        limit = int(limit)
        offset = int(offset)
    except ValueError:
        limit = 25
        offset = 0

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_envios_masivos_tables(cursor)

        query = """
            SELECT em.*, d.nombre AS dispositivo_nombre,
                   (SELECT COUNT(*) FROM destinatarios_envio de WHERE de.envio_id = em.id) AS total_contactos
            FROM envios_masivos em
            LEFT JOIN dispositivos d ON em.dispositivo_id = d.id
            WHERE em.usuario_id = %s
        """
        params = [user_id]

        if search:
            query += " AND em.nombre LIKE %s"
            params.append(f"%{search}%")

        query += " ORDER BY em.creado_en DESC, em.id DESC LIMIT %s OFFSET %s"
        params.extend([limit, offset])

        cursor.execute(query, tuple(params))
        rows = cursor.fetchall()

        count_query = "SELECT COUNT(*) AS total FROM envios_masivos WHERE usuario_id = %s"
        count_params = [user_id]
        if search:
            count_query += " AND nombre LIKE %s"
            count_params.append(f"%{search}%")
        
        cursor.execute(count_query, tuple(count_params))
        total_row = cursor.fetchone()
        total = total_row["total"] if total_row else 0

        formatted_rows = []
        for r in rows:
            formatted_rows.append({
                "id": r["id"],
                "nombre": r["nombre"],
                "dispositivo_id": r["dispositivo_id"],
                "dispositivo_nombre": r["dispositivo_nombre"] or "Mi WhatsApp",
                "mensaje": r["mensaje"],
                "url_media": r["url_media"],
                "estado": r["estado"],
                "total_enviados": r["total_enviados"],
                "total_fallidos": r["total_fallidos"],
                "total_pendientes": r["total_pendientes"],
                "total_contactos": r["total_contactos"],
                "programado_para": r["programado_para"].isoformat() if r["programado_para"] else None,
                "creado_en": r["creado_en"].isoformat() if r["creado_en"] else None
            })

        return jsonify({"success": True, "data": formatted_rows, "total": total})
    except Exception as e:
        logger.error(f"Error obteniendo envíos masivos: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/envios_masivos', methods=['POST'])
def create_envio_masivo():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip()
    mensaje = (data.get("mensaje") or "").strip()
    dispositivo_id = data.get("dispositivo_id")
    url_media = (data.get("url_media") or "").strip() or None
    media_type = (data.get("media_type") or "").strip().lower() or None
    velocidad_envio = (data.get("velocidad_envio") or "lento").strip().lower()
    programado_para_str = data.get("programado_para")

    if not nombre or dispositivo_id is None:
        return jsonify({"success": False, "message": "Nombre y dispositivo son obligatorios"}), 400

    if not mensaje and not url_media:
        return jsonify({"success": False, "message": "Agrega un mensaje, imagen o video para enviar"}), 400

    if media_type and media_type not in {"image", "video", "document", "audio"}:
        media_type = None
    if velocidad_envio not in {"lento", "normal", "rapido"}:
        velocidad_envio = "lento"

    try:
        dispositivo_id = int(dispositivo_id)
    except ValueError:
        return jsonify({"success": False, "message": "ID de dispositivo inválido"}), 400

    import datetime
    programado_para = None
    if programado_para_str:
        try:
            clean_dt = programado_para_str.replace("Z", "")
            if "T" in clean_dt:
                programado_para = datetime.datetime.fromisoformat(clean_dt)
            else:
                programado_para = datetime.datetime.strptime(clean_dt, "%Y-%m-%d %H:%M:%S")
        except Exception as e:
            logger.error(f"Error al analizar fecha programada {programado_para_str}: {e}")
            return jsonify({"success": False, "message": "Fecha programada inválida"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_envios_masivos_tables(cursor)

        # Verificar que el dispositivo pertenezca al usuario
        cursor.execute(
            "SELECT id FROM dispositivos WHERE id = %s AND usuario_id = %s LIMIT 1",
            (dispositivo_id, user_id)
        )
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Dispositivo no encontrado o no autorizado"}), 404

        # Resolver contactos a enviar
        targets = data.get("targets") or {}
        
        query, params = build_contacts_filter_query(dispositivo_id, targets)
        cursor.execute(query, tuple(params))
        contacts = cursor.fetchall()

        if not contacts:
            return jsonify({"success": False, "message": "No se encontraron contactos para los filtros seleccionados"}), 400

        # Determinar estado
        estado = "programado" if programado_para and programado_para > datetime.datetime.now() else "enviando"

        # Crear campaña
        cursor.execute(
            """
            INSERT INTO envios_masivos (
                usuario_id, dispositivo_id, nombre, mensaje, url_media, media_type, velocidad_envio, estado,
                total_enviados, total_fallidos, total_pendientes, programado_para, creado_en
            ) VALUES (%s, %s, %s, %s, %s, %s, %s, %s, 0, 0, %s, %s, NOW())
            """,
            (user_id, dispositivo_id, nombre, mensaje, url_media, media_type, velocidad_envio, estado, len(contacts), programado_para)
        )
        envio_id = cursor.lastrowid

        # Insertar destinatarios
        insert_recipients_query = """
            INSERT INTO destinatarios_envio (envio_id, contacto_id, estado)
            VALUES (%s, %s, 'pendiente')
        """
        batch_params = [(envio_id, c["id"]) for c in contacts]
        cursor.executemany(insert_recipients_query, batch_params)
        
        conn.commit()

        # Si debe enviarse de inmediato, lanzar el hilo de procesamiento
        if estado == "enviando":
            import threading
            t = threading.Thread(target=process_envio_masivo, args=(envio_id, user_id))
            t.daemon = True
            t.start()

        return jsonify({
            "success": True, 
            "id": envio_id, 
            "message": "Campaña creada correctamente", 
            "estado": estado,
            "total_contactos": len(contacts)
        })

    except Exception as e:
        logger.error(f"Error creando envío masivo: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

def get_country_prefix(country_code):
    country_to_calling = {
        'AD': '376', 'AE': '971', 'AG': '1268', 'AI': '1264', 'AL': '355', 'AM': '374',
        'AO': '244', 'AR': '54', 'AT': '43', 'AU': '61', 'AZ': '994', 'BA': '387',
        'BB': '1246', 'BD': '880', 'BE': '32', 'BF': '226', 'BG': '359', 'BH': '973',
        'BI': '257', 'BJ': '229', 'BN': '673', 'BO': '591', 'BR': '55', 'BS': '1242',
        'BT': '975', 'BW': '267', 'BY': '375', 'BZ': '501', 'CA': '1', 'CD': '243',
        'CF': '236', 'CG': '242', 'CH': '41', 'CI': '225', 'CL': '56', 'CM': '237',
        'CN': '86', 'CO': '57', 'CR': '506', 'CU': '53', 'CV': '238', 'CY': '357',
        'CZ': '420', 'DE': '49', 'DJ': '253', 'DK': '45', 'DM': '1767', 'DO': '1',
        'DZ': '213', 'EC': '593', 'EE': '372', 'EG': '20', 'ER': '291', 'ES': '34',
        'ET': '251', 'FI': '358', 'FJ': '679', 'FR': '33', 'GA': '241', 'GB': '44',
        'GD': '1473', 'GE': '995', 'GH': '233', 'GM': '220', 'GN': '224', 'GQ': '240',
        'GR': '30', 'GT': '502', 'GW': '245', 'GY': '592', 'HN': '504', 'HR': '385',
        'HT': '509', 'HU': '36', 'ID': '62', 'IE': '353', 'IL': '972', 'IN': '91',
        'IQ': '964', 'IR': '98', 'IS': '354', 'IT': '39', 'JM': '1876', 'JO': '962',
        'JP': '81', 'KE': '254', 'KG': '996', 'KH': '855', 'KI': '686', 'KM': '269',
        'KN': '1869', 'KP': '850', 'KR': '82', 'KW': '965', 'KZ': '7', 'LA': '856',
        'LB': '961', 'LC': '1758', 'LI': '423', 'LK': '94', 'LR': '231', 'LS': '266',
        'LT': '370', 'LU': '352', 'LV': '371', 'LY': '218', 'MA': '212', 'MC': '377',
        'MD': '373', 'ME': '382', 'MG': '261', 'MK': '389', 'ML': '223', 'MM': '95',
        'MN': '976', 'MR': '222', 'MT': '356', 'MU': '230', 'MV': '960', 'MW': '265',
        'MX': '52', 'MY': '60', 'MZ': '258', 'NA': '264', 'NE': '227', 'NG': '234',
        'NI': '505', 'NL': '31', 'NO': '47', 'NP': '977', 'NR': '674', 'NZ': '64',
        'OM': '968', 'PA': '507', 'PE': '51', 'PG': '675', 'PH': '63', 'PK': '92',
        'PL': '48', 'PT': '351', 'PW': '680', 'PY': '595', 'QA': '974', 'RO': '40',
        'RS': '381', 'RU': '7', 'RW': '250', 'SA': '966', 'SB': '677', 'SC': '248',
        'SD': '249', 'SE': '46', 'SG': '65', 'SI': '386', 'SK': '421', 'SL': '232',
        'SM': '378', 'SN': '221', 'SO': '252', 'SR': '597', 'SS': '211', 'ST': '239',
        'SV': '503', 'SY': '963', 'SZ': '268', 'TD': '235', 'TG': '228', 'TH': '66',
        'TJ': '992', 'TL': '670', 'TM': '993', 'TN': '216', 'TO': '676', 'TR': '90',
        'TT': '1868', 'TV': '688', 'TZ': '255', 'UA': '380', 'UG': '256', 'US': '1',
        'UY': '598', 'UZ': '998', 'VA': '379', 'VC': '1784', 'VE': '58', 'VN': '84',
        'VU': '678', 'WS': '685', 'YE': '967', 'ZA': '27', 'ZM': '260', 'ZW': '263'
    }
    return country_to_calling.get(country_code.upper())

def build_contacts_filter_query(dispositivo_id, targets):
    target_type = targets.get("type", "all")
    where_clauses = ["c.dispositivo_id = %s", "c.jid IS NOT NULL", "c.jid != ''"]
    params = [dispositivo_id]
    
    # 1. Country filter
    countries = targets.get("countries") or []
    if isinstance(countries, str):
        countries = [countries]
    legacy_country = targets.get("country")
    if legacy_country and legacy_country not in countries:
        countries.append(legacy_country)
    country_clauses = []
    for country in countries:
        calling_code = get_country_prefix(str(country))
        if calling_code:
            country_clauses.append("(c.telefono LIKE %s OR c.telefono LIKE %s OR c.telefono LIKE %s)")
            params.extend([f"{calling_code}%", f"+{calling_code}%", f"00{calling_code}%"])
    if country_clauses:
        where_clauses.append(f"({' OR '.join(country_clauses)})")

    # 2. Date filter
    fecha_period = targets.get("fecha_period")
    if fecha_period:
        import datetime
        now = datetime.datetime.now()
        if fecha_period == 'hoy':
            today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
            where_clauses.append("c.creado_en >= %s")
            params.append(today_start)
        elif fecha_period == 'ultimos3':
            start = now - datetime.timedelta(days=3)
            where_clauses.append("c.creado_en >= %s")
            params.append(start)
        elif fecha_period == 'ultimos7':
            start = now - datetime.timedelta(days=7)
            where_clauses.append("c.creado_en >= %s")
            params.append(start)
        elif fecha_period == 'ultimos14':
            start = now - datetime.timedelta(days=14)
            where_clauses.append("c.creado_en >= %s")
            params.append(start)
        elif fecha_period == 'ultimos30':
            start = now - datetime.timedelta(days=30)
            where_clauses.append("c.creado_en >= %s")
            params.append(start)
        elif fecha_period == 'personalizado':
            fecha_inicio = targets.get("fecha_inicio")
            fecha_fin = targets.get("fecha_fin")
            if fecha_inicio:
                try:
                    dt_start = datetime.datetime.strptime(fecha_inicio, "%Y-%m-%d").replace(hour=0, minute=0, second=0)
                    where_clauses.append("c.creado_en >= %s")
                    params.append(dt_start)
                except ValueError:
                    pass
            if fecha_fin:
                try:
                    dt_end = datetime.datetime.strptime(fecha_fin, "%Y-%m-%d").replace(hour=23, minute=59, second=59)
                    where_clauses.append("c.creado_en <= %s")
                    params.append(dt_end)
                except ValueError:
                    pass

    # 3. Stage filter
    etapa_id = targets.get("etapa_id")
    if target_type == "stage" and etapa_id:
        where_clauses.append("c.etapa_id = %s")
        params.append(int(etapa_id))

    # 4. Tags filter
    tag_ids = targets.get("tag_ids") or []
    tag_op = targets.get("tag_op", "contiene_algunos")
    if (target_type == "tags" or len(tag_ids) > 0) and tag_ids:
        tag_ids_ints = [int(tid) for tid in tag_ids]
        if tag_op == "contiene_algunos":
            placeholders = ",".join(["%s"] * len(tag_ids_ints))
            where_clauses.append(f"c.id IN (SELECT contacto_id FROM contactos_tags WHERE tag_id IN ({placeholders}))")
            params.extend(tag_ids_ints)
        elif tag_op == "contiene_todos":
            placeholders = ",".join(["%s"] * len(tag_ids_ints))
            where_clauses.append(f"""
                c.id IN (
                    SELECT contacto_id FROM contactos_tags 
                    WHERE tag_id IN ({placeholders})
                    GROUP BY contacto_id
                    HAVING COUNT(DISTINCT tag_id) = %s
                )
            """)
            params.extend(tag_ids_ints)
            params.append(len(tag_ids_ints))
        elif tag_op == "excluir":
            placeholders = ",".join(["%s"] * len(tag_ids_ints))
            where_clauses.append(f"c.id NOT IN (SELECT contacto_id FROM contactos_tags WHERE tag_id IN ({placeholders}))")
            params.extend(tag_ids_ints)

    where_sql = " AND ".join(where_clauses)
    query = f"SELECT c.id, c.jid, c.nombre, c.telefono, c.foto_perfil FROM contactos c WHERE {where_sql}"
    return query, params


def envio_masivo_media_type(media_url, stored_type=None):
    media_type = (stored_type or "").strip().lower()
    if media_type in {"image", "video", "document", "audio"}:
        return media_type

    ext = (str(media_url or "").split("?")[0].rsplit(".", 1)[-1] or "").lower()
    if ext in {"mp4", "m4v", "mov", "webm", "avi", "mkv"}:
        return "video"
    if ext in {"pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv"}:
        return "document"
    if ext in {"mp3", "ogg", "wav", "m4a", "webm"}:
        return "audio"
    return "image"


def envio_masivo_media_path(media_url):
    media_value = str(media_url or "").strip()
    if not media_value:
        return None

    resolved_path = scheduled_media_local_path({"url": media_value})
    if (
        resolved_path
        and isinstance(resolved_path, str)
        and not resolved_path.startswith(("http://", "https://"))
        and not os.path.exists(resolved_path)
    ):
        raise FileNotFoundError(f"Archivo multimedia no encontrado: {resolved_path}")
    return resolved_path


def bridge_response_error(response):
    try:
        data = response.json()
    except Exception:
        body = (response.text or "").strip()
        return body or f"Bridge respondio HTTP {response.status_code}", None

    if isinstance(data, dict):
        error_text = data.get("error") or data.get("message")
        if error_text:
            return str(error_text), data
    if response.status_code >= 400:
        return f"Bridge respondio HTTP {response.status_code}", data
    return None, data

@app.route('/api/envios_masivos/preview_count', methods=['POST'])
def preview_envio_masivo_count():
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400
        
    data = request.get_json(silent=True) or {}
    dispositivo_id = data.get("dispositivo_id")
    targets = data.get("targets") or {}
    
    if dispositivo_id is None:
        return jsonify({"success": False, "message": "dispositivo_id requerido"}), 400
        
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_envios_masivos_tables(cursor)

        cursor.execute(
            "SELECT id FROM dispositivos WHERE id = %s AND usuario_id = %s LIMIT 1",
            (dispositivo_id, user_id)
        )
        if not cursor.fetchone():
            return jsonify({"success": False, "message": "Dispositivo no encontrado o no autorizado"}), 404
        
        query, params = build_contacts_filter_query(dispositivo_id, targets)
        
        count_query = f"SELECT COUNT(*) AS total FROM ({query}) AS sub"
        cursor.execute(count_query, tuple(params))
        row = cursor.fetchone()
        count = row["total"] if row else 0
        
        contacts = []
        if count > 0:
            preview_query = f"{query} LIMIT 500"
            cursor.execute(preview_query, tuple(params))
            contacts = cursor.fetchall()
            
        serialized_contacts = []
        for c in contacts:
            serialized_contacts.append({
                "id": c["id"],
                "nombre": c["nombre"] or "Sin nombre",
                "telefono": c["telefono"] or "",
                "foto_perfil": c["foto_perfil"] or None
            })
            
        return jsonify({"success": True, "count": count, "contacts": serialized_contacts})
    except Exception as e:
        logger.error(f"Error en vista previa de contactos masivos: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/envios_masivos/upload-media', methods=['POST'])
def upload_envio_masivo_media():
    try:
        user_id = resolve_request_user_id()
        if not user_id:
            return jsonify({"success": False, "message": "Usuario requerido"}), 401
            
        file = request.files.get("file")
        if not file or not file.filename:
            return jsonify({"success": False, "message": "Archivo requerido"}), 400
            
        upload_dir = os.path.join(app.config["UPLOAD_FOLDER"], "envios_masivos", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        from werkzeug.utils import secure_filename
        import uuid
        filename = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        file.save(os.path.join(upload_dir, unique_name))
        
        media_path = f"envios_masivos/{user_id}/{unique_name}"
        media_url = f"{request.host_url.rstrip('/')}/media/{media_path}"
        
        # Determine media type from file extension
        ext = filename.split('.')[-1].lower() if '.' in filename else ''
        media_type = 'video' if ext in ['mp4', 'mov', 'avi', 'mkv', 'webm'] else 'image'
        
        return jsonify({
            "success": True, 
            "url": media_url,
            "filename": filename,
            "media_type": media_type
        })
    except Exception as e:
        logger.exception("Error subiendo media de envio masivo")
        return jsonify({"success": False, "message": str(e)}), 500

@app.route('/api/envios_masivos/<int:id>', methods=['DELETE'])
def delete_envio_masivo(id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        # Eliminar destinatarios primero
        cursor.execute("DELETE FROM destinatarios_envio WHERE envio_id = %s", (id,))
        # Eliminar campaña
        cursor.execute("DELETE FROM envios_masivos WHERE id = %s AND usuario_id = %s", (id, user_id))
        
        conn.commit()
        return jsonify({"success": True, "message": "Campaña eliminada correctamente"})
    except Exception as e:
        logger.error(f"Error eliminando envío masivo: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()

@app.route('/api/envios_masivos/<int:id>/cancelar', methods=['POST'])
def cancelar_envio_masivo(id):
    user_id = resolve_request_user_id()
    if not user_id:
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            "SELECT estado FROM envios_masivos WHERE id = %s AND usuario_id = %s LIMIT 1",
            (id, user_id)
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Campaña no encontrada"}), 404

        if row["estado"] != "programado":
            return jsonify({"success": False, "message": "Solo se pueden cancelar campañas programadas"}), 400

        cursor.execute(
            "UPDATE envios_masivos SET estado = 'borrador' WHERE id = %s",
            (id,)
        )
        conn.commit()
        return jsonify({"success": True, "message": "Campaña cancelada y guardada como borrador"})
    except Exception as e:
        logger.error(f"Error cancelando envío masivo: {e}")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


def process_envio_masivo(envio_id, user_id):
    logger.info(f"[Envío Masivo] Iniciando proceso para campaña ID: {envio_id}")
    
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute(
            """
            SELECT id, dispositivo_id, mensaje, url_media, media_type, velocidad_envio, estado
            FROM envios_masivos
            WHERE id = %s AND usuario_id = %s LIMIT 1
            """,
            (envio_id, user_id)
        )
        campaign = cursor.fetchone()
        if not campaign:
            logger.error(f"[Envío Masivo] Campaña {envio_id} no encontrada.")
            return

        if campaign["estado"] in ["completado"]:
            logger.info(f"[Envío Masivo] Campaña {envio_id} ya completada.")
            return

        # Actualizar estado a enviando
        cursor.execute(
            "UPDATE envios_masivos SET estado = 'enviando' WHERE id = %s",
            (envio_id,)
        )
        conn.commit()

        # Recoger destinatarios pendientes
        cursor.execute(
            """
            SELECT de.id AS dest_id, de.contacto_id, c.jid, c.nombre, c.telefono
            FROM destinatarios_envio de
            INNER JOIN contactos c ON c.id = de.contacto_id
            WHERE de.envio_id = %s AND de.estado = 'pendiente'
            """,
            (envio_id,)
        )
        recipients = cursor.fetchall()
        
        device_id = campaign["dispositivo_id"]
        mensaje_template = campaign["mensaje"]
        url_media = campaign["url_media"]
        velocidad_envio = campaign.get("velocidad_envio") or "lento"

        # Consultar tipo de dispositivo y credenciales oficiales
        cursor.execute(
            "SELECT color, meta_access_token, meta_phone_number_id, meta_waba_id FROM dispositivos WHERE id = %s LIMIT 1",
            (device_id,)
        )
        dev_row = cursor.fetchone()
        is_cloud = dev_row and dev_row.get("color") == "cloud"
        meta_token = dev_row.get("meta_access_token") if is_cloud else None
        meta_phone_id = dev_row.get("meta_phone_number_id") if is_cloud else None

        if not is_cloud:
            if not is_bridge_running(device_id):
                logger.info(f"[Envio Masivo] Bridge no activo para dispositivo {device_id}. Iniciando...")
                start_whatsapp_bridge(user_id, device_id)
                if not wait_for_bridge_port(device_id, timeout_seconds=15):
                    raise Exception("No se pudo iniciar el bridge de WhatsApp para el dispositivo seleccionado")

        import time
        import random

        for r in recipients:
            dest_id = r["dest_id"]
            chat_jid = r["jid"]
            contact_name = r["nombre"] or "amigo"
            
            # Formatear el mensaje reemplazando las etiquetas
            msg_text = mensaje_template
            for tag, val in [("{nombre}", contact_name), ("{name}", contact_name), ("{telefono}", r["telefono"]), ("{phone}", r["telefono"])]:
                msg_text = msg_text.replace(tag, val)

            payload = {
                "jid": chat_jid,
                "text": msg_text
            }

            success = False
            error_msg = None
            
            if is_cloud:
                recipient_phone = chat_jid.split("@")[0]
                meta_url = f"https://graph.facebook.com/v18.0/{meta_phone_id}/messages"
                headers = {
                    "Authorization": f"Bearer {meta_token}",
                    "Content-Type": "application/json"
                }
                
                meta_media_type = campaign.get("media_type") or "image"
                if meta_media_type not in ("image", "video", "audio", "document"):
                    meta_media_type = "document"

                if url_media:
                    meta_media_url = url_media
                    if url_media.startswith('/'):
                        def get_thread_safe_url():
                            v = os.getenv("PUBLIC_BASE_URL")
                            if v: return v.rstrip("/")
                            return "http://localhost:5000"
                        meta_media_url = f"{get_thread_safe_url()}{url_media}"
                    
                    payload_meta = {
                      "messaging_product": "whatsapp",
                      "recipient_type": "individual",
                      "to": recipient_phone,
                      "type": meta_media_type,
                      meta_media_type: {
                        "link": meta_media_url
                      }
                    }
                    if msg_text:
                        payload_meta[meta_media_type]["caption"] = msg_text
                else:
                    payload_meta = {
                      "messaging_product": "whatsapp",
                      "recipient_type": "individual",
                      "to": recipient_phone,
                      "type": "text",
                      "text": {
                        "body": msg_text
                      }
                    }

                try:
                    res = requests.post(meta_url, json=payload_meta, headers=headers, timeout=30)
                    if res.status_code < 400:
                        success = True
                    else:
                        success = False
                        try:
                            err_data = res.json()
                            error_msg = err_data.get("error", {}).get("message") or res.text
                        except Exception:
                            error_msg = res.text
                except Exception as meta_err:
                    success = False
                    error_msg = str(meta_err)
                    logger.error(f"[Envío Masivo] Error enviando mensaje Cloud API a {chat_jid}: {meta_err}")
            else:
                bridge_port = 5000 + (device_id % 1000)
                url = f"http://127.0.0.1:{bridge_port}/send"
                try:
                    if url_media:
                        payload["url"] = envio_masivo_media_path(url_media)
                        payload["type"] = envio_masivo_media_type(url_media, campaign.get("media_type"))
                        payload["caption"] = msg_text

                    response = requests.post(url, json=payload, timeout=30)
                    error_msg, res_data = bridge_response_error(response)
                    success = response.status_code < 400 and not error_msg and bool(res_data)
                except Exception as send_err:
                    error_msg = str(send_err)
                    logger.error(f"[Envío Masivo] Error enviando mensaje a {chat_jid}: {send_err}")

            if error_msg:
                log_payload = {k: v for k, v in payload.items() if k != "text"}
                logger.error("[Envio Masivo] Bridge rechazo mensaje a %s: %s | payload=%s", chat_jid, error_msg, log_payload)

            if success:
                cursor.execute(
                    "UPDATE destinatarios_envio SET estado = 'enviado', enviado_en = NOW() WHERE id = %s",
                    (dest_id,)
                )
                cursor.execute(
                    """
                    UPDATE envios_masivos
                    SET total_enviados = total_enviados + 1, total_pendientes = total_pendientes - 1
                    WHERE id = %s
                    """,
                    (envio_id,)
                )
            else:
                cursor.execute(
                    "UPDATE destinatarios_envio SET estado = 'fallido', mensaje_error = %s, enviado_en = NOW() WHERE id = %s",
                    (error_msg[:500] if error_msg else "Error desconocido", dest_id)
                )
                cursor.execute(
                    """
                    UPDATE envios_masivos
                    SET total_fallidos = total_fallidos + 1, total_pendientes = total_pendientes - 1
                    WHERE id = %s
                    """,
                    (envio_id,)
                )
            conn.commit()

            # Retraso entre contactos segun la velocidad elegida en el asistente.
            delay_ranges = {
                "rapido": (5, 5),
                "normal": (15, 15),
                "lento": (30, 30),
            }
            delay_min, delay_max = delay_ranges.get(velocidad_envio, delay_ranges["lento"])
            time.sleep(random.randint(delay_min, delay_max))

        # Finalizar campaña
        cursor.execute(
            "SELECT total_enviados, total_fallidos FROM envios_masivos WHERE id = %s LIMIT 1",
            (envio_id,)
        )
        stats = cursor.fetchone()
        
        final_state = "completado"
        if stats and stats["total_enviados"] == 0 and stats["total_fallidos"] > 0:
            final_state = "fallido"
            
        cursor.execute(
            "UPDATE envios_masivos SET estado = %s WHERE id = %s",
            (final_state, envio_id)
        )
        conn.commit()
        logger.info(f"[Envío Masivo] Campaña {envio_id} finalizada con estado: {final_state}")

    except Exception as outer_err:
        logger.error(f"[Envío Masivo] Error crítico procesando envío masivo: {outer_err}", exc_info=True)
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


def run_campaign_scheduler():
    logger.info("[Envío Masivo Scheduler] Hilo planificador iniciado")
    import time
    while True:
        time.sleep(60)
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            ensure_envios_masivos_tables(cursor)
            
            cursor.execute(
                """
                SELECT id, usuario_id
                FROM envios_masivos
                WHERE estado = 'programado' AND programado_para <= NOW()
                """
            )
            scheduled_campaigns = cursor.fetchall()
            
            for c in scheduled_campaigns:
                envio_id = c["id"]
                user_id = c["usuario_id"]
                logger.info(f"[Envío Masivo Scheduler] Iniciando campaña programada ID: {envio_id}")
                
                import threading
                t = threading.Thread(target=process_envio_masivo, args=(envio_id, user_id))
                t.daemon = True
                t.start()
                
        except Exception as e:
            logger.error(f"[Envío Masivo Scheduler] Error en bucle: {e}")
        finally:
            if cursor: cursor.close()
            if conn: conn.close()
# =====================================================================


def run_scheduled_messages_scheduler():
    logger.info("[Mensajes Programados Scheduler] Hilo planificador iniciado")
    while True:
        time.sleep(30)
        conn = None
        cursor = None
        try:
            conn = get_connection()
            cursor = conn.cursor(dictionary=True)
            ensure_scheduled_messages_table(cursor)

            cursor.execute(
                """
                SELECT id, usuario_id
                FROM mensajes_programados
                WHERE status = 'Programado'
                  AND fecha_programada IS NOT NULL
                  AND fecha_programada <= NOW()
                ORDER BY fecha_programada ASC
                LIMIT 20
                """
            )
            scheduled_messages = cursor.fetchall()

            for message in scheduled_messages:
                import threading

                t = threading.Thread(target=process_scheduled_message, args=(message["id"], message["usuario_id"]))
                t.daemon = True
                t.start()
        except Exception as error:
            logger.error(f"[Mensajes Programados Scheduler] Error en bucle: {error}")
        finally:
            if cursor:
                cursor.close()
            if conn:
                conn.close()



def start_all_connected_bridges_on_boot():
    """Busca todos los dispositivos conectados que no sean Cloud API y arranca sus bridges al iniciar el servidor."""
    # Esperamos unos segundos para dejar que Flask inicialice completamente
    import time
    time.sleep(3)
    logger.info("Iniciando auto-arranque de bridges para dispositivos conectados...")
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute(
            """
            SELECT id, usuario_id, color
            FROM dispositivos
            WHERE estado = 'conectado'
            """
        )
        devices = cursor.fetchall()
        for dev in devices:
            # Si el color es 'cloud', no necesita bridge local
            if dev.get("color") == "cloud":
                continue
            device_id = dev["id"]
            user_id = dev["usuario_id"]
            if not is_bridge_running(device_id):
                logger.info(f"Auto-arranque de bridge: Iniciando bridge para dispositivo {device_id} (usuario {user_id})...")
                start_whatsapp_bridge(user_id, device_id)
    except Exception as e:
        logger.error(f"Error en start_all_connected_bridges_on_boot: {e}")
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# =====================================================================
# CHATBOT ASSISTANT API
# =====================================================================
@app.route("/api/chatbot/query", methods=["POST"])
def chatbot_query():
    data = request.json or {}
    user_id = data.get("user_id")
    message = (data.get("message") or "").strip()

    if not user_id:
        return jsonify({"success": False, "message": "user_id es requerido"}), 400
    if not message:
        return jsonify({"success": False, "message": "El mensaje no puede estar vacío"}), 400

    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # A. Cantidad de contactos
        cursor.execute("""
            SELECT COUNT(*) AS total
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE d.usuario_id = %s
        """, (user_id,))
        contactos_res = cursor.fetchone()
        num_contactos = contactos_res["total"] if contactos_res else 0

        # B. Lista de dispositivos
        cursor.execute("""
            SELECT id, nombre, numero_telefono, estado 
            FROM dispositivos 
            WHERE usuario_id = %s
            ORDER BY id ASC
        """, (user_id,))
        dispositivos = cursor.fetchall()
        num_dispositivos = len(dispositivos)

        # C. Comprobar si el bridge está corriendo para cada dispositivo
        bridge_running = False
        device_statuses = []
        for d in dispositivos:
            d_id = d["id"]
            d_nombre = d["nombre"]
            d_telefono = d["numero_telefono"] or "S/N"
            is_running = is_bridge_running(d_id)
            if is_running:
                bridge_running = True
            
            # Formatear estado del dispositivo
            status_label = "Conectado" if d["estado"] == "conectado" else "Desconectado"
            bridge_label = "Activo" if is_running else "Inactivo"
            device_statuses.append(f"• **{d_nombre}** ({d_telefono}): WhatsApp: {status_label} | Bridge: {bridge_label}")

        # D. Automatizaciones activas
        num_automations = 0
        try:
            cursor.execute("SELECT COUNT(*) as total FROM automatizaciones WHERE usuario_id = %s AND activo = 1", (user_id,))
            automations_res = cursor.fetchone()
            num_automations = automations_res["total"] if automations_res else 0
        except Exception:
            pass

        # E. Contar dispositivos desconectados
        num_disconnected = sum(1 for d in dispositivos if d["estado"] != "conectado")

        if message == "init_stats_silent":
            return jsonify({
                "success": True,
                "response": "",
                "stats": {
                    "contacts": num_contactos,
                    "devices": num_dispositivos,
                    "disconnected_devices": num_disconnected,
                    "bridge_running": bridge_running,
                    "automations": num_automations
                }
            })

        # 2. Comprobar si hay una API KEY de IA configurada
        openai_key = os.getenv("OPENAI_API_KEY")
        gemini_key = os.getenv("GEMINI_API_KEY")
        nvidia_key = os.getenv("NVIDIA_API_KEY")
        
        device_statuses_text = "\n".join(device_statuses) if device_statuses else "No hay dispositivos registrados."
        system_status_prompt = (
            "Eres el Asistente Virtual Inteligente oficial de GeoCHAT, la plataforma premium de CRM y multiagente de WhatsApp.\n"
            "Tu objetivo es guiar, asesorar y ayudar al usuario en el uso operativo de todas las funciones de GeoCHAT.\n\n"
            "INFORMACIÓN CLAVE DE LAS SECCIONES DE GEOCHAT (Para guiar al usuario paso a paso):\n"
            "1. **Envíos Masivos (Campañas)**:\n"
            "   - Ubicación: Módulo 'Envíos masivos' en el menú lateral.\n"
            "   - Proceso: Hacer clic en '+ Crear envío masivo'. Elegir nombre de campaña, seleccionar el dispositivo de WhatsApp emisor, elegir destinatarios (todos los contactos, filtrar por etiquetas/tags o por grupos/comunidades de WhatsApp).\n"
            "   - Mensajes y Plantillas: Escribir el texto del mensaje. Se pueden usar etiquetas dinámicas que se autocompletarán con los datos del contacto: `{nombre}` (o `{name}`) y `{telefono}` (o `{phone}`).\n"
            "   - Archivos: Permite adjuntar imágenes, videos, audios o documentos PDF/Excel.\n"
            "   - Configuración de envío: Elegir velocidad (Rápido: retraso de 5s, Normal: 15s, Lento: 30s) para evitar bloqueos/spam de WhatsApp, y programar fecha/hora o enviar de inmediato.\n"
            "2. **Dispositivos y WhatsApp Bridge**:\n"
            "   - Ubicación: Módulo 'Conexión' (icono de engranaje o llave).\n"
            "   - Proceso: Permite emparejar líneas escaneando el código QR en WhatsApp Web. Muestra el estado de la línea ('conectado' o 'desconectado').\n"
            "   - Diagnóstico: Monitorea si el Bridge de Node.js en el servidor está 'Activo' o 'Inactivo'. Si está Inactivo, el usuario debe abrir el dispositivo y re-vincularlo.\n"
            "3. **Contactos e Importación**:\n"
            "   - Ubicación: Módulo 'Contactos'.\n"
            "   - Funciones: Crear contactos manualmente, importar masivamente usando archivos Excel (.xlsx), CSV o vCard. \n"
            "   - Etiquetas (Tags): Crear y asignar etiquetas personalizadas de colores (ej: 'Cliente Nuevo', 'Interesado', 'Mayorista') para filtrar y segmentar tus envíos.\n"
            "   - Campos Custom: Crear campos personalizados según el negocio (ej. 'Talla de zapato', 'Dirección de envío').\n"
            "4. **Automatizaciones de IA**:\n"
            "   - Ubicación: Módulo 'Automatizaciones'.\n"
            "   - Funciones: Configurar reglas de respuesta inteligente automáticas para contestar a tus clientes 24/7 sin intervención humana.\n"
            "5. **Bandeja de Entrada Multiagente (Chats)**:\n"
            "   - Ubicación: Módulo 'Chats'.\n"
            "   - Funciones: Leer y responder chats de WhatsApp en tiempo real. Permite asignar conversaciones a agentes específicos, añadir notas internas privadas (invisibles al cliente) para colaborar entre el equipo, y usar respuestas rápidas mediante el atajo '/' en el input.\n"
            "6. **Mensajes Programados**:\n"
            "   - Ubicación: Módulo 'Mensajes programados' -> '+ Crear mensaje'.\n"
            "   - Funciones: Planificar el envío individual de un mensaje de WhatsApp a un contacto a una fecha y hora exactas en el futuro. Ideal para recordatorios de pago o seguimiento de clientes.\n"
            "7. **Grupos y Comunidades**:\n"
            "   - Ubicación: Módulo 'Grupos'.\n"
            "   - Funciones: Gestionar y visualizar grupos y comunidades de la cuenta de WhatsApp conectada, permitiendo lanzar campañas directamente a miembros de grupos.\n"
            "8. **Integraciones API & Webhooks**:\n"
            "   - Ubicación: Módulo 'Configuración' / 'API'.\n"
            "   - Funciones: Permite conectar sistemas externos (como Odoo, WooCommerce o CRMs propios) enviando mensajes mediante la API REST de GeoCHAT y recibiendo notificaciones en tiempo real en un Webhook externo cuando llega un mensaje.\n\n"
            "CONSEJOS CRÍTICOS Y BUENAS PRÁCTICAS DE WHATSAPP (Evitar suspensiones/bloqueos):\n"
            "- **Evitar Spam**: No enviar mensajes masivos a números que no han solicitado el contacto. Segmentar siempre por etiquetas.\n"
            "- **Personalizar Mensajes**: Usar siempre variables como `{nombre}` para que los mensajes no sean idénticos, burlando el detector de spam de WhatsApp.\n"
            "- **Velocidades de envío**: Enviar campañas masivas grandes con velocidad 'Lenta' (30 segundos entre mensajes) o 'Normal' (15 segundos) para no disparar alertas de WhatsApp.\n"
            "- **Estabilidad de la Línea**: Evitar el modo de ahorro de energía en el teléfono vinculado y asegurar conexión Wi-Fi fija para que el Bridge Node.js no pierda conectividad.\n\n"
            "REGLAS DE COMPORTAMIENTO Y GUARDRAILS (CRÍTICO):\n"
            "- **Asesoramiento de Negocio**: Si el usuario te pregunta cómo hacer una campaña para su rubro específico (ej. ropa deportiva, consultorio médico, bienes raíces, restaurantes, etc.), debes guiarle paso a paso sobre cómo modelarlo EN GEOCHAT. Además, puedes redactarle plantillas de mensajes persuasivos listas para copiar y pegar, usando las variables de GeoCHAT como `{nombre}`.\n"
            "- **Respuestas en base a Datos**: Utiliza los datos del sistema proveídos abajo para responder preguntas de estado actual (ej: '¿cuántos contactos tengo?', '¿cómo está mi WhatsApp?').\n"
            "- **Guardrails (Restricción)**: Si el usuario te pregunta algo totalmente ajeno al software o a la gestión de su negocio/clientes (ej. recetas de cocina, historia universal, chistes de fútbol, ayuda de programación de Python general, etc.), debes rechazar responder de manera muy educada indicando que como asistente oficial de GeoCHAT tu propósito es guiarle en el crecimiento de su negocio y el control de su plataforma.\n\n"
            "Información del sistema para este usuario:\n"
            f"- Cantidad de contactos guardados: {num_contactos}\n"
            f"- Dispositivos de WhatsApp vinculados: {num_dispositivos}\n"
            f"- Automatizaciones de IA activas: {num_automations}\n"
            f"- Servidor Bridge General: {'OPERATIVO' if bridge_running else 'INACTIVO'}\n\n"
            "Estado detallado de los dispositivos del usuario:\n"
            f"{device_statuses_text}\n\n"
            "Responde de manera concisa, profesional y siempre en español. Usa formato markdown para resaltar cosas importantes si es necesario (como negritas, listas)."
        )

        response_text = ""

        # A. Si hay NVIDIA API Key, usar NVIDIA NIM API
        if nvidia_key:
            try:
                headers = {
                    "Authorization": f"Bearer {nvidia_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "meta/llama-3.1-8b-instruct",
                    "messages": [
                        {"role": "system", "content": system_status_prompt},
                        {"role": "user", "content": message}
                    ],
                    "max_tokens": 500,
                    "temperature": 0.2
                }
                r = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers, timeout=35)
                if r.status_code == 200:
                    res_json = r.json()
                    response_text = res_json['choices'][0]['message']['content']
                else:
                    logger.error(f"Error consultando NVIDIA API: {r.status_code} - {r.text}")
            except Exception as e:
                logger.error(f"Error consultando NVIDIA API: {e}")

        # B. Si hay Gemini API Key y no se usó NVIDIA, usar Gemini
        if gemini_key and not response_text:
            try:
                payload = {
                    "contents": [
                        {
                            "parts": [
                                {"text": system_status_prompt},
                                {"text": f"Usuario: {message}"}
                            ]
                        }
                    ]
                }
                api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={gemini_key}"
                r = requests.post(api_url, json=payload, timeout=10)
                if r.status_code == 200:
                    res_json = r.json()
                    response_text = res_json['candidates'][0]['content']['parts'][0]['text']
            except Exception as e:
                logger.error(f"Error consultando Gemini API: {e}")

        # C. Si hay OpenAI API Key y no se usaron las anteriores, usar OpenAI
        elif openai_key and not response_text:
            try:
                headers = {
                    "Authorization": f"Bearer {openai_key}",
                    "Content-Type": "application/json"
                }
                payload = {
                    "model": "gpt-3.5-turbo",
                    "messages": [
                        {"role": "system", "content": system_status_prompt},
                        {"role": "user", "content": message}
                    ],
                    "max_tokens": 500,
                    "temperature": 0.7
                }
                r = requests.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=10)
                if r.status_code == 200:
                    res_json = r.json()
                    response_text = res_json['choices'][0]['message']['content']
            except Exception as e:
                logger.error(f"Error consultando OpenAI API: {e}")

        # D. Si no hay llaves de API o fallaron, usar la lógica local
        if not response_text:
            msg_lower = message.lower()
            if any(k in msg_lower for k in ["hola", "buen", "bueno", "saludo"]):
                response_text = (
                    "¡Hola! 👋 Soy tu Asistente Virtual de GeoCHAT. "
                    "Estoy aquí para ayudarte a monitorear tu sistema y resolver dudas. "
                    "¿En qué puedo ayudarte hoy?\n\n"
                    "Puedes preguntarme por comandos como:\n"
                    "• **dispositivos** o **whatsapp**\n"
                    "• **contactos** o **clientes**\n"
                    "• **bridge** o **servidor**\n"
                    "• **ayuda**"
                )
            elif any(k in msg_lower for k in ["dispositivo", "telefono", "teléfono", "whatsapp"]):
                if num_dispositivos == 0:
                    response_text = "Actualmente no tienes ningún dispositivo registrado en GeoCHAT."
                else:
                    response_text = f"Tienes **{num_dispositivos}** dispositivos registrados en tu cuenta:\n" + "\n".join(device_statuses)
            elif any(k in msg_lower for k in ["contacto", "cliente"]):
                response_text = f"Tienes un total de **{num_contactos}** contactos registrados en tu base de datos de GeoCHAT."
            elif any(k in msg_lower for k in ["bridge", "servidor", "conexión", "conexion"]):
                if bridge_running:
                    response_text = "✅ El **WhatsApp Bridge** está corriendo y funcionando correctamente en el servidor para tus dispositivos activos."
                else:
                    response_text = "⚠️ El **WhatsApp Bridge** está detenido para tus dispositivos. Puedes iniciarlo escaneando el código QR de tus dispositivos desde el panel de conexión."
            elif any(k in msg_lower for k in ["ayuda", "comandos", "qué haces", "que haces"]):
                response_text = (
                    "Aquí tienes la lista de cosas que puedo hacer por ti:\n\n"
                    "• **Ver Dispositivos**: Muestra tus números de WhatsApp y su estado de conexión.\n"
                    "• **Ver Contactos**: Te da el número de clientes guardados.\n"
                    "• **Estado del Bridge**: Verifica si el servidor de conexión con WhatsApp está operativo.\n"
                    "• **Ayuda**: Muestra este mensaje informativo."
                )
            else:
                response_text = (
                    "Disculpa, como tu asistente oficial de GeoCHAT, solo puedo responder a consultas e información relacionadas con el estado y funcionamiento de tu plataforma.\n\n"
                    "Prueba preguntándome sobre alguno de estos temas:\n"
                    "• **dispositivos** (para ver el estado de tus WhatsApps vinculados)\n"
                    "• **contactos** (para ver el total de tus clientes)\n"
                    "• **bridge** (para verificar el estado del servidor de conexión)\n"
                    "• **ayuda** (para ver la lista de comandos disponibles)"
                )

        return jsonify({
            "success": True,
            "response": response_text,
            "stats": {
                "contacts": num_contactos,
                "devices": num_dispositivos,
                "disconnected_devices": num_disconnected,
                "bridge_running": bridge_running,
                "automations": num_automations
            }
        })

    except Exception as e:
        logger.exception("Error en chatbot query API")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# ============================================================
# INTEGRACIÓN HOTMART WEBHOOK & ACCESO AUTOMÁTICO
# ============================================================

import smtplib
import random
import string
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

def get_hotmart_plan_map():
    """Retorna un mapeo dinámico de códigos de oferta de Hotmart a Planes de GeoChat"""
    return {
        str(os.getenv("HOTMART_STARTER_MENSUAL_CODE") or "starter_m").strip():  {"plan_nombre": "Starter", "periodo": "mensual"},
        str(os.getenv("HOTMART_STARTER_ANUAL_CODE") or "starter_a").strip():    {"plan_nombre": "Starter", "periodo": "anual"},
        str(os.getenv("HOTMART_GROWTH_MENSUAL_CODE") or "growth_m").strip():    {"plan_nombre": "Growth",  "periodo": "mensual"},
        str(os.getenv("HOTMART_GROWTH_ANUAL_CODE") or "growth_a").strip():      {"plan_nombre": "Growth",  "periodo": "anual"},
        str(os.getenv("HOTMART_ADVANCED_MENSUAL_CODE") or "advanced_m").strip():{"plan_nombre": "Advanced","periodo": "mensual"},
        str(os.getenv("HOTMART_ADVANCED_ANUAL_CODE") or "advanced_a").strip():  {"plan_nombre": "Advanced","periodo": "anual"},
    }

def send_welcome_email(email, name, password, plan_name):
    """Envia un correo electrónico con las credenciales de acceso usando SMTP"""
    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_pass = os.getenv("SMTP_PASS")
    email_from_name = os.getenv("EMAIL_FROM_NAME", "Soporte GeoChat")
    app_url = os.getenv("APP_URL", "https://tudominio.com")

    if not smtp_user or not smtp_pass:
        logger.warning(f"Credenciales de SMTP incompletas. No se pudo enviar correo de bienvenida a {email}")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = f"¡Bienvenido a GeoChat! - Tu acceso al Plan {plan_name} está listo"
        msg["From"] = f"{email_from_name} <{smtp_user}>"
        msg["To"] = email

        html_body = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #c7d2fe; border-radius: 12px;">
            <div style="text-align: center; margin-bottom: 20px;">
                <h1 style="color: #4f46e5; margin: 0;">¡Bienvenido a GeoChat! 🎉</h1>
                <p style="font-size: 16px; color: #666666;">Tu suscripción al Plan <strong>{plan_name}</strong> está activa.</p>
            </div>
            <div style="background-color: #f3f4f6; border-radius: 8px; padding: 15px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0;"><strong>Tus credenciales de acceso para la plataforma:</strong></p>
                <p style="margin: 0 0 5px 0;"><strong>Usuario:</strong> {email}</p>
                <p style="margin: 0 0 5px 0;"><strong>Contraseña Temporal:</strong> <span style="font-family: monospace; background: #e5e7eb; padding: 2px 6px; border-radius: 4px; font-size: 16px; font-weight: bold;">{password}</span></p>
                <p style="font-size: 12px; color: #ef4444; margin-top: 10px;">* Por seguridad, te recomendamos cambiar esta contraseña temporal en tu Perfil al iniciar sesión.</p>
            </div>
            <div style="text-align: center; margin-bottom: 20px;">
                <a href="{app_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Ingresar a la Plataforma</a>
            </div>
            <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
            <p style="font-size: 12px; color: #9ca3af; text-align: center;">Este es un mensaje automático del sistema de activación de GeoChat.</p>
        </body>
        </html>
        """
        msg.attach(MIMEText(html_body, "html"))

        # Conectar al servidor SMTP y enviar
        server = smtplib.SMTP(smtp_host, smtp_port)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(smtp_user, email, msg.as_string())
        server.quit()
        logger.info(f"Correo de bienvenida enviado con éxito a {email}")
        return True
    except Exception as e:
        logger.error(f"Error al enviar correo de bienvenida a {email}: {e}")
        return False

@app.route("/api/hotmart/webhook", methods=["POST"])
def hotmart_webhook():
    """Recibe y procesa las notificaciones automáticas de compra y cancelación de Hotmart"""
    hottok_header = request.headers.get("x-hotmart-hottok") or request.headers.get("X-Hotmart-Hottok")
    expected_hottok = os.getenv("HOTMART_HOTTOK")
    if expected_hottok and hottok_header != expected_hottok:
        logger.warning(f"Intento de acceso al webhook con HotTok no autorizado: {hottok_header}")
        return jsonify({"success": False, "message": "Unauthorized"}), 401

    payload = request.get_json(silent=True) or {}
    event = payload.get("event")
    data = payload.get("data") or {}

    if not event or not data:
        return jsonify({"success": False, "message": "Datos de payload incompletos"}), 400

    logger.info(f"Webhook Hotmart Recibido: Evento = {event}")

    # Extraer comprador o suscriptor (algunos eventos de cancelación envían los datos en 'subscriber')
    buyer = data.get("buyer") or {}
    subscription = data.get("subscription") or {}
    subscriber = data.get("subscriber") or subscription.get("subscriber") or {}
    
    email = str(buyer.get("email") or subscriber.get("email") or "").strip().lower()
    name = str(buyer.get("name") or subscriber.get("name") or "Cliente GeoChat").strip()

    # Extraer datos de compra y suscripción
    purchase = data.get("purchase") or {}
    offer = purchase.get("offer") or {}
    offer_code = str(offer.get("code") or "").strip()
    transaction_id = str(purchase.get("transaction") or "").strip()

    subscriber_code = str(subscriber.get("code") or "").strip()

    if not email:
        logger.warning(f"Falta correo en el webhook de Hotmart para evento {event}. Datos recibidos: {data}")
        return jsonify({"success": False, "message": "Comprador/Suscriptor sin email"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        # A. PROCESAR COMPRAS Y PERÍODOS DE PRUEBA (Activaciones)
        if event in ("PURCHASE_APPROVED", "PURCHASE_COMPLETED"):
            plan_map = get_hotmart_plan_map()
            plan_info = plan_map.get(offer_code)

            if not plan_info:
                logger.warning(f"Webhook recibido con código de oferta no mapeado: '{offer_code}'")
                return jsonify({"success": True, "message": f"Oferta '{offer_code}' ignorada por falta de mapeo"}), 200

            plan_nombre = plan_info["plan_nombre"]
            periodo = plan_info["periodo"]

            # Obtener ID del plan en la DB
            cursor.execute("SELECT id FROM planes WHERE nombre = %s LIMIT 1", (plan_nombre,))
            plan_row = cursor.fetchone()
            if not plan_row:
                logger.error(f"El plan '{plan_nombre}' no existe en la tabla de planes")
                return jsonify({"success": False, "message": f"Plan '{plan_nombre}' inexistente en la DB"}), 500
            plan_id = plan_row["id"]

            # Determinar fecha de vencimiento según el próximo cobro de Hotmart
            date_next_charge = subscription.get("date_next_charge")
            if date_next_charge:
                try:
                    fecha_vencimiento = datetime.fromtimestamp(int(date_next_charge) / 1000)
                except Exception:
                    dias = 365 if periodo == "anual" else 30
                    fecha_vencimiento = datetime.now() + timedelta(days=dias)
            else:
                # Detección multicapa de periodo de prueba (trial)
                is_trial = (
                    bool(purchase.get("trial") or False) or
                    bool(subscription.get("trial") or False) or
                    bool(purchase.get("subscription", {}).get("trial") or False) or
                    (purchase.get("price", {}).get("value") == 0 and plan_nombre == "Starter" and periodo == "mensual")
                )
                dias = 7 if is_trial else (365 if periodo == "anual" else 30)
                fecha_vencimiento = datetime.now() + timedelta(days=dias)

            # Buscar si el usuario ya tiene cuenta en el sistema
            cursor.execute("SELECT id FROM usuarios WHERE correo = %s LIMIT 1", (email,))
            user_row = cursor.fetchone()

            user_id = None
            welcome_sent = False

            if not user_row:
                # Crear nuevo usuario con contraseña temporal
                from werkzeug.security import generate_password_hash
                temp_pass = "".join(random.choices(string.ascii_letters + string.digits, k=10))
                pass_hash = generate_password_hash(temp_pass)

                cursor.execute(
                    """
                    INSERT INTO usuarios (nombre, correo, contrasena_hash, rol, activo, contrasena_temporal, hotmart_subscriber_code, hotmart_purchase_id, creado_en)
                    VALUES (%s, %s, %s, 'admin', 1, 1, %s, %s, NOW())
                    """,
                    (name, email, pass_hash, subscriber_code or None, transaction_id or None)
                )
                conn.commit()
                user_id = cursor.lastrowid
                logger.info(f"Usuario nuevo auto-creado por compra de Hotmart: id={user_id}, email={email}")

                # Enviar correo de bienvenida
                welcome_sent = send_welcome_email(email, name, temp_pass, plan_nombre)
            else:
                user_id = user_row["id"]
                # Vincular códigos de Hotmart al usuario existente y activarlo
                cursor.execute(
                    """
                    UPDATE usuarios
                    SET hotmart_subscriber_code = %s, hotmart_purchase_id = %s, activo = 1
                    WHERE id = %s
                    """,
                    (subscriber_code or None, transaction_id or None, user_id)
                )
                conn.commit()
                logger.info(f"Usuario existente id={user_id} actualizado con datos de Hotmart: email={email}")

            # Buscar suscripción del usuario
            cursor.execute("SELECT id FROM suscripciones WHERE usuario_id = %s LIMIT 1", (user_id,))
            sub_row = cursor.fetchone()

            estado_suscripcion = "prueba" if bool(purchase.get("trial") or False) else "activa"

            if not sub_row:
                # Insertar suscripción
                cursor.execute(
                    """
                    INSERT INTO suscripciones (usuario_id, plan_id, estado, periodo, fecha_inicio, fecha_vencimiento, renovacion_auto)
                    VALUES (%s, %s, %s, %s, NOW(), %s, 1)
                    """,
                    (user_id, plan_id, estado_suscripcion, periodo, fecha_vencimiento)
                )
            else:
                # Modificar suscripción
                cursor.execute(
                    """
                    UPDATE suscripciones
                    SET plan_id = %s, estado = %s, periodo = %s, fecha_inicio = NOW(), fecha_vencimiento = %s, renovacion_auto = 1
                    WHERE usuario_id = %s
                    """,
                    (plan_id, estado_suscripcion, periodo, fecha_vencimiento, user_id)
                )
            conn.commit()
            logger.info(f"Suscripción del usuario id={user_id} guardada/actualizada. Vence: {fecha_vencimiento}")

            return jsonify({
                "success": True,
                "message": "Activación realizada con éxito",
                "email_enviado": welcome_sent
            }), 200

        # B. PROCESAR CANCELACIONES, DEVOLUCIONES Y REEMBOLSOS
        elif event in ("SUBSCRIPTION_CANCELLATION", "PURCHASE_REFUNDED", "PURCHASE_CHARGEBACK", "PURCHASE_DELAYED"):
            user_id = None
            
            # Buscar por código de suscriptor primero
            if subscriber_code:
                cursor.execute("SELECT id FROM usuarios WHERE hotmart_subscriber_code = %s LIMIT 1", (subscriber_code,))
                user_row = cursor.fetchone()
                if user_row:
                    user_id = user_row["id"]

            # Si no, buscar por email
            if not user_id and email:
                cursor.execute("SELECT id FROM usuarios WHERE correo = %s LIMIT 1", (email,))
                user_row = cursor.fetchone()
                if user_row:
                    user_id = user_row["id"]

            if not user_id:
                logger.warning(f"Cancelación ignorada: No se encontró usuario para email={email} o suscriptor={subscriber_code}")
                return jsonify({"success": True, "message": "Usuario no encontrado"}), 200

            nuevo_estado = "cancelada"
            if event == "PURCHASE_DELAYED":
                nuevo_estado = "vencida"  # Cobro pendiente o rechazado provisionalmente

            cursor.execute(
                """
                UPDATE suscripciones
                SET estado = %s, renovacion_auto = 0
                WHERE usuario_id = %s
                """,
                (nuevo_estado, user_id)
            )
            conn.commit()
            logger.info(f"Suscripción del usuario id={user_id} cambiada a '{nuevo_estado}' por evento de Hotmart: {event}")

            return jsonify({"success": True, "message": f"Suscripción actualizada a {nuevo_estado}"}), 200

        # C. OTROS EVENTOS
        else:
            return jsonify({"success": True, "message": f"Evento '{event}' registrado sin acciones"}), 200

    except Exception as e:
        logger.exception("Error interno al procesar webhook de Hotmart")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


# =====================================================================
# ENDPOINTS PARA PERFIL Y CONFIGURACIÓN DE USUARIO
# =====================================================================

def ensure_profile_columns_exist(cursor):
    """Asegura que existan las columnas de preferencias en la tabla usuarios."""
    try:
        cursor.execute("SHOW COLUMNS FROM usuarios LIKE 'notif_email'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE usuarios ADD COLUMN notif_email TINYINT(1) DEFAULT 1")
        cursor.execute("SHOW COLUMNS FROM usuarios LIKE 'notif_whatsapp'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE usuarios ADD COLUMN notif_whatsapp TINYINT(1) DEFAULT 1")
        cursor.execute("SHOW COLUMNS FROM usuarios LIKE 'notif_system'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE usuarios ADD COLUMN notif_system TINYINT(1) DEFAULT 1")
        cursor.execute("SHOW COLUMNS FROM usuarios LIKE 'whatsapp_personal'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE usuarios ADD COLUMN whatsapp_personal VARCHAR(50) DEFAULT NULL")
        cursor.execute("SHOW COLUMNS FROM usuarios LIKE 'zona_horaria'")
        if not cursor.fetchone():
            cursor.execute("ALTER TABLE usuarios ADD COLUMN zona_horaria VARCHAR(100) DEFAULT 'America/Guayaquil'")
    except Exception as err:
        logger.warning(f"Error comprobando esquema de usuarios: {err}")


@app.route("/api/profile/<int:user_id>", methods=["GET"])
def get_user_profile(user_id):
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_profile_columns_exist(cursor)

        cursor.execute("""
            SELECT id, nombre, correo, whatsapp_personal, zona_horaria, foto_perfil,
                   notif_email, notif_whatsapp, notif_system, ultimo_login, creado_en
            FROM usuarios
            WHERE id = %s
            LIMIT 1
        """, (user_id,))
        user_data = cursor.fetchone()

        if not user_data:
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        user_data['notif_email'] = bool(user_data.get('notif_email', 1))
        user_data['notif_whatsapp'] = bool(user_data.get('notif_whatsapp', 1))
        user_data['notif_system'] = bool(user_data.get('notif_system', 1))
        if user_data.get('creado_en'):
            user_data['creado_en'] = str(user_data['creado_en'])
        if user_data.get('ultimo_login'):
            user_data['ultimo_login'] = str(user_data['ultimo_login'])

        return jsonify({"success": True, "user": user_data}), 200
    except Exception as e:
        logger.exception("Error al obtener perfil de usuario")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/profile/<int:user_id>", methods=["PUT"])
def update_user_profile(user_id):
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        nombre = data.get("nombre", "").strip()
        whatsapp = data.get("whatsapp_personal", "").strip()
        zona_horaria = data.get("zona_horaria", "America/Guayaquil").strip()
        foto_perfil = data.get("foto_perfil")
        notif_email = 1 if data.get("notif_email", True) else 0
        notif_whatsapp = 1 if data.get("notif_whatsapp", True) else 0
        notif_system = 1 if data.get("notif_system", True) else 0

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_profile_columns_exist(cursor)

        query = """
            UPDATE usuarios
            SET nombre = %s,
                whatsapp_personal = %s,
                zona_horaria = %s,
                notif_email = %s,
                notif_whatsapp = %s,
                notif_system = %s
        """
        params = [nombre, whatsapp, zona_horaria, notif_email, notif_whatsapp, notif_system]

        if foto_perfil is not None:
            query += ", foto_perfil = %s"
            params.append(foto_perfil)

        query += " WHERE id = %s"
        params.append(user_id)

        cursor.execute(query, tuple(params))
        conn.commit()

        cursor.execute("""
            SELECT id, nombre, correo, whatsapp_personal, zona_horaria, foto_perfil,
                   notif_email, notif_whatsapp, notif_system
            FROM usuarios WHERE id = %s LIMIT 1
        """, (user_id,))
        updated_user = cursor.fetchone()

        if updated_user:
            updated_user['notif_email'] = bool(updated_user.get('notif_email'))
            updated_user['notif_whatsapp'] = bool(updated_user.get('notif_whatsapp'))
            updated_user['notif_system'] = bool(updated_user.get('notif_system'))

        return jsonify({
            "success": True,
            "message": "Perfil actualizado correctamente",
            "user": updated_user
        }), 200
    except Exception as e:
        logger.exception("Error al actualizar perfil")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/profile/<int:user_id>/password", methods=["POST"])
def change_user_password(user_id):
    conn = None
    cursor = None
    try:
        data = request.get_json() or {}
        password_actual = data.get("password_actual", "").strip()
        password_nueva = data.get("password_nueva", "").strip()

        if not password_nueva or len(password_nueva) < 6:
            return jsonify({"success": False, "message": "La nueva contraseña debe tener al menos 6 caracteres"}), 400

        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT clave FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
        user_row = cursor.fetchone()
        if not user_row:
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

        hashed = bcrypt.hashpw(password_nueva.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        cursor.execute("UPDATE usuarios SET clave = %s WHERE id = %s", (hashed, user_id))
        conn.commit()

        return jsonify({"success": True, "message": "Contraseña actualizada exitosamente"}), 200
    except Exception as e:
        logger.exception("Error al cambiar contraseña")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


@app.route("/api/profile/<int:user_id>/photo", methods=["POST"])
def upload_profile_photo(user_id):
    if 'foto' not in request.files:
        return jsonify({"success": False, "message": "No se adjunto ningun archivo"}), 400

    file = request.files['foto']
    if not file or not allowed_file(file.filename, ALLOWED_IMAGE_EXTENSIONS):
        return jsonify({"success": False, "message": "Formato de imagen no permitido"}), 400

    conn = None
    cursor = None
    try:
        filename = secure_filename(f"user_{user_id}_{int(time.time())}_{file.filename}")
        user_photo_dir = os.path.join(MEDIA_FOLDER, "perfiles")
        os.makedirs(user_photo_dir, exist_ok=True)
        file_path = os.path.join(user_photo_dir, filename)
        file.save(file_path)

        relative_url = f"/media/perfiles/{filename}"

        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("UPDATE usuarios SET foto_perfil = %s WHERE id = %s", (relative_url, user_id))
        conn.commit()

        return jsonify({"success": True, "foto_perfil": relative_url, "message": "Foto de perfil actualizada"}), 200
    except Exception as e:
        logger.exception("Error al subir foto de perfil")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor: cursor.close()
        if conn: conn.close()


# Registrar Blueprints
try:
    from routes.agentes_ia import agentes_ia_blueprint
    app.register_blueprint(agentes_ia_blueprint)
    logger.info("Blueprint de Agentes de IA registrado con éxito.")
except Exception as e:
    logger.exception(f"Error al registrar Blueprint de Agentes de IA: {e}")

if __name__ == "__main__":
    # Iniciar el scheduler de envíos masivos
    import threading
    t_sched = threading.Thread(target=run_campaign_scheduler)
    t_sched.daemon = True
    t_sched.start()
    t_messages = threading.Thread(target=run_scheduled_messages_scheduler)
    t_messages.daemon = True
    t_messages.start()
    t_bridges = threading.Thread(target=start_all_connected_bridges_on_boot)
    t_bridges.daemon = True
    t_bridges.start()

    t_r2 = threading.Thread(target=run_r2_sync_scheduler)
    t_r2.daemon = True
    t_r2.start()


    host = os.getenv("HOST", "127.0.0.1")
    port = int(os.getenv("PORT", "5000"))
    debug = os.getenv("FLASK_DEBUG", "0") == "1"
    print(f"Servidor Flask corriendo en http://{host}:{port}")
    app.run(host=host, port=port, debug=debug)
