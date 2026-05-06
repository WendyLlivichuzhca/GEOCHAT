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
MEDIA_FOLDER = os.path.join(BASE_DIR, 'media')

# Configuración de Flask para el diseño (static) y fotos (media)
app = Flask(__name__, static_folder='static', static_url_path='')
app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
app.config['MEDIA_FOLDER'] = MEDIA_FOLDER

# main.py
app.config['JWT_SECRET_KEY'] = os.getenv("JWT_SECRET_KEY", "geochat-secret-key-12345")
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

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

# 1. RUTA PARA EL FRONTEND (Esta es la que hace que tu amigo vea la página)
@app.route('/')
def serve_frontend():
    return app.send_static_file('index.html')

# 2. RUTA PARA LAS FOTOS
@app.route('/media/<path:filename>')
def serve_media(filename):
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


def is_bridge_running(device_id):
    """Verifica si el bridge de Node.js está corriendo para el device_id dado."""
    lock_path = os.path.join(BRIDGE_DIR, f'.bridge.device{device_id}.lock')
    if not os.path.exists(lock_path):
        return False
    try:
        with open(lock_path, 'r') as f:
            pid = int(f.read().strip())
        # Verificar si el proceso con ese PID existe
        os.kill(pid, 0)  # señal 0 = solo verificar, no matar
        return True
    except (ValueError, ProcessLookupError, PermissionError, OSError):
        # PID inválido o proceso muerto → limpiar lockfile huérfano
        try:
            os.remove(lock_path)
        except OSError:
            pass
        return False


def start_whatsapp_bridge(user_id, device_id):
    """Lanza el bridge de WhatsApp en segundo plano sin bloquear Flask."""
    if is_bridge_running(device_id):
        logger.info(f'Bridge ya corriendo para device_id={device_id}. No se lanza duplicado.')
        return

    log_path = os.path.join(BRIDGE_DIR, f'bridge_device{device_id}.log')
    log_file = open(log_path, 'a', encoding='utf-8')

    node_cmd = 'node'
    cmd = [node_cmd, 'bridge.js', f'--user-id={user_id}', f'--device-id={device_id}']

    proc = subprocess.Popen(
        cmd,
        cwd=BRIDGE_DIR,
        stdout=log_file,
        stderr=log_file,
        # En Windows, crear el proceso en un grupo nuevo para que no muera con Flask
        creationflags=subprocess.CREATE_NEW_PROCESS_GROUP if sys.platform == 'win32' else 0,
    )
    logger.info(f'Bridge lanzado: PID={proc.pid}, device_id={device_id}, log={log_path}')


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
)


def get_connection():
    return mysql.connector.connect(**db_config)


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


def resolve_request_user_id():
    """Obtiene el usuario desde JWT o desde el payload/qs como el resto del proyecto."""
    try:
        identity = get_jwt_identity()
        if identity:
            return int(identity)
    except Exception:
        pass

    payload = request.get_json(silent=True) or {}
    candidate = (
        request.args.get("user_id")
        or request.form.get("user_id")
        or payload.get("user_id")
    )

    try:
        return int(candidate) if candidate is not None else None
    except (TypeError, ValueError):
        return None


def fetch_count(cursor, query, params):
    cursor.execute(query, params)
    row = cursor.fetchone() or {}
    return int(row.get("total") or 0)


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


def is_user_jid(jid):
    return normalize_jid(jid).endswith("@s.whatsapp.net")


def is_status_broadcast_jid(jid):
    return normalize_jid(jid).lower() == "status@broadcast"


def is_technical_jid(jid):
    normalized = normalize_jid(jid).lower()
    return is_status_broadcast_jid(normalized) or "@broadcast" in normalized or normalized.endswith("@newsletter")


def is_supported_chat_jid(jid):
    normalized = normalize_jid(jid)
    if is_status_broadcast_jid(normalized):
        return False
    # Permissive: allow user, group and lid formats
    return bool(normalized and not is_technical_jid(normalized) and (is_user_jid(normalized) or is_group_jid(normalized) or "@lid" in normalized.lower()))


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
def list_agents():
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("SELECT id, nombre, correo, rol, foto_perfil FROM usuarios WHERE activo = 1")
        users = cursor.fetchall()
        return jsonify({"success": True, "agents": users})
    except Exception as e:
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

        elif category == 'clics_en_enlaces':
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

        elif category == 'insights_ia':
            # Simulated AI Sentiment based on keywords
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
            # Count activity in the last 24h
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
            # Ranking of AI agents based on messages sent from their assigned devices
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
        "fields": parse_raw_fields(row.get("fields_raw"))
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
        if not jid or jid in unique:
            continue

        is_lid = "@lid" in jid.lower()
        alias = None
        display_name = contact_display_name(chat)
        if display_name and not looks_like_phone_alias(display_name, chat):
            alias = display_name.strip().lower()

        if alias in aliases and (is_lid or aliases[alias]):
            continue

        chat["jid"] = jid
        unique[jid] = chat
        if alias and (is_lid or alias not in aliases):
            aliases[alias] = is_lid

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


def ensure_automation_schema(cursor):
    ensure_automation_folders_table(cursor)
    ensure_automatizaciones_folder_column(cursor)


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
        "fecha_creacion": as_json_value(row.get("fecha_creacion") or row.get("creado_en")),
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

    cursor.execute(
        """
        INSERT INTO chats (
            dispositivo_id, jid, tipo, nombre, mensajes_sin_leer,
            ultimo_mensaje, ultimo_mensaje_fecha, last_timestamp, last_media_type
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            tipo = VALUES(tipo),
            nombre = COALESCE(NULLIF(VALUES(nombre), ''), nombre),
            ultimo_mensaje = CASE
                WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
                    THEN COALESCE(VALUES(ultimo_mensaje), ultimo_mensaje, '[Mensaje]')
                ELSE ultimo_mensaje
            END,
            ultimo_mensaje_fecha = CASE
                WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
                    THEN COALESCE(VALUES(ultimo_mensaje_fecha), ultimo_mensaje_fecha)
                ELSE ultimo_mensaje_fecha
            END,
            last_media_type = CASE
                WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
                    THEN COALESCE(VALUES(last_media_type), last_media_type, 'texto')
                ELSE last_media_type
            END,
            last_timestamp = GREATEST(COALESCE(last_timestamp, 0), COALESCE(VALUES(last_timestamp), 0)),
            mensajes_sin_leer = COALESCE(mensajes_sin_leer, 0) + %s,
            actualizado_en = NOW()
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
            safe_type or 'texto',
            increment_unread,
        ),
    )


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

    if update_name:
        update_sql = """
            telefono = VALUES(telefono),
            nombre = COALESCE(NULLIF(VALUES(nombre), ''), nombre),
            push_name = COALESCE(NULLIF(VALUES(push_name), ''), push_name),
            verified_name = COALESCE(NULLIF(VALUES(verified_name), ''), verified_name),
            notify_name = COALESCE(NULLIF(VALUES(notify_name), ''), notify_name),
            foto_perfil = COALESCE(NULLIF(VALUES(foto_perfil), ''), foto_perfil),
            actualizado_en = NOW()
        """
    else:
        update_sql = """
            telefono = VALUES(telefono),
            foto_perfil = COALESCE(NULLIF(VALUES(foto_perfil), ''), foto_perfil),
            actualizado_en = NOW()
        """

    cursor.execute(
        f"""
        INSERT INTO contactos (
            dispositivo_id, jid, telefono, nombre, push_name, verified_name, notify_name, foto_perfil
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE {update_sql}
        """,
        (device_id, jid, phone, name, push_name, verified_name, notify_name, foto_perfil),
    )
    if name:
        cursor.execute(
            """
            UPDATE chats
            SET nombre = %s,
                actualizado_en = NOW()
            WHERE dispositivo_id = %s AND jid = %s
            """,
            (name, device_id, jid),
        )
    return {"jid": jid, "telefono": phone, "nombre": name}


def upsert_webhook_group(cursor, device_id, jid, name, update_name=True):
    if not is_supported_chat_jid(jid) or not is_group_jid(jid):
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
            if cand and str(cand).strip() and not str(cand).startswith("12036"):
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
                    try:
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
                        persisted_group_name = persist_group_subject(cursor, device_id, jid, bridge_subject)
                        if persisted_group_name:
                            group_title = persisted_group_name
                            name = persisted_group_name
                    except:
                        pass
                
                threading.Thread(target=fetch_group_metadata).start()
            except:
                pass
    else:
        upsert_webhook_contact(
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


def ensure_groups_module_tables(cursor):
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
        }
    )

    return payload


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
        "_searchable": f"{display_phone} {display_name} {raw_jid}".lower(),
    }


def build_group_status_badge(status_value):
    mapping = {
        "activo": "Activo",
        "sin_admin": "Sin admin",
        "error": "Error",
        "pendiente_sync": "Pendiente de sincronizacion",
        "sincronizando": "Sincronizando",
    }
    return mapping.get(status_value or "", "Pendiente de sincronizacion")


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


def replace_group_source_participants(cursor, source_group_id, device_id, bridge_response):
    if not source_group_id:
        return 0

    participants = extract_group_metadata_participants(bridge_response)
    if not participants:
        return 0

    contact_name_map = {}
    participant_jids = [item["jid"] for item in participants if item.get("jid")]
    participant_phones = [item["telefono"] for item in participants if item.get("telefono")]

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
        WHERE d.usuario_id = %s
        """,
        (user_id,),
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
        is_admin, participants_total, admins_total = resolve_group_admin_verification(
            cursor,
            row.get("id"),
            row.get("numero_telefono"),
        )
        participants_total = participants_total or int(row.get("participantes_total") or 0)
        admins_total = admins_total or int(row.get("admins_total") or 0)
        normalized_jid = normalize_jid(row.get("jid"))
        if not normalized_jid:
            continue

        groups_map[(int(row.get("dispositivo_id")), normalized_jid)] = {
            "id": normalized_jid,
            "sourceGroupId": row.get("id"),
            "dispositivoId": row.get("dispositivo_id"),
            "jid": normalized_jid,
            "nombre": row.get("nombre") or "Grupo sin nombre",
            "tipo": "grupo",
            "dispositivoNombre": row.get("dispositivo_nombre") or "Mi WhatsApp",
            "dispositivoEstado": row.get("dispositivo_estado") or "desconectado",
            "participantes": participants_total,
            "admins": admins_total,
            "canImport": bool(is_admin),
            "requiresAdmin": participants_total > 0,
            "isAdmin": bool(is_admin),
        }

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

        bridge_groups = bridge_payload.get("groups") or []
        if not bridge_groups:
            device_name = device.get("nombre") or f"Dispositivo {device.get('id')}"
            warnings.append(
                f"WhatsApp no devolvio grupos en tiempo real para {device_name}. Se muestran solo los grupos ya detectados localmente."
            )

        for bridge_group in bridge_groups:
            normalized_jid = normalize_jid(bridge_group.get("jid"))
            if not normalized_jid:
                continue

            local_row = local_map.get((int(device.get("id")), normalized_jid))
            groups_map[(int(device.get("id")), normalized_jid)] = {
                "id": normalized_jid,
                "sourceGroupId": local_row.get("id") if local_row else None,
                "dispositivoId": device.get("id"),
                "jid": normalized_jid,
                "nombre": bridge_group.get("nombre") or (local_row.get("nombre") if local_row else None) or "Grupo sin nombre",
                "tipo": bridge_group.get("tipo") or "grupo",
                "dispositivoNombre": device.get("nombre") or "Mi WhatsApp",
                "dispositivoEstado": device.get("estado") or "desconectado",
                "participantes": int(bridge_group.get("participantes") or 0),
                "admins": int(bridge_group.get("admins") or 0),
                "canImport": bool(bridge_group.get("canImport")),
                "requiresAdmin": bool(bridge_group.get("requiresAdmin")),
                "isAdmin": bool(bridge_group.get("isAdmin")),
            }

    groups = list(groups_map.values())
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
        SELECT gm.id, gm.grupo_origen_id, gm.estado_sync, d.numero_telefono
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

        cursor.execute(
            """
            SELECT id, nombre, dispositivo_id, estado
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
            WHERE d.usuario_id = %s
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

        cursor.execute(
            """
            SELECT id, nombre, dispositivo_id, estado, programado_para, creado_en
            FROM envios_masivos
            WHERE usuario_id = %s
            ORDER BY creado_en DESC, id DESC
            """,
            (user_id,),
        )
        batch_rows = cursor.fetchall()

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
        campaigns.extend(
            {
                "target_id": f"envio_masivo:{row['id']}",
                "id": row["id"],
                "nombre": row.get("nombre"),
                "dispositivo_id": row.get("dispositivo_id"),
                "estado": row.get("estado"),
                "programado_para": as_json_value(row.get("programado_para")),
                "source": "envio_masivo",
            }
            for row in batch_rows
        )

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


@app.route("/api/scheduled_messages", methods=["POST"])
def create_scheduled_message():
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

        return jsonify({"success": True, "data": serialize_scheduled_message_row(saved_row)}), 201
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
        for device in devices:
            device_id = device.get("id")
            device_state = str(device.get("estado") or "").strip().lower()
            if not device_id or device_state != "conectado":
                continue
            if not is_bridge_running(device_id):
                start_whatsapp_bridge(user_id, device_id)
            wait_for_bridge_port(device_id, timeout_seconds=12)

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
                        d.usuario_id,
                        d.nombre AS dispositivo_nombre,
                        d.numero_telefono,
                        d.estado AS dispositivo_estado
                    FROM grupos g
                    INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                    WHERE g.id = %s AND d.usuario_id = %s
                    LIMIT 1
                    """,
                    (local_group_id, user_id),
                )
                source_row = cursor.fetchone()
                normalized_group_jid = normalize_jid(source_row.get("jid")) if source_row else normalized_group_jid

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
                            d.usuario_id,
                            d.nombre AS dispositivo_nombre,
                            d.numero_telefono,
                            d.estado AS dispositivo_estado
                        FROM grupos g
                        INNER JOIN dispositivos d ON d.id = g.dispositivo_id
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

            is_admin = bool(bridge_group.get("isAdmin")) if bridge_group else False
            participants_total = int(bridge_group.get("participantes") or 0) if bridge_group else 0
            admins_total = int(bridge_group.get("admins") or 0) if bridge_group else 0

            if not bridge_group:
                is_admin, participants_total, admins_total = resolve_group_admin_verification(
                    cursor,
                    source_row.get("id"),
                    source_row.get("numero_telefono"),
                )

            if participants_total > 0 and not is_admin:
                results.append(
                    {
                        "groupId": original_group_id,
                        "success": False,
                        "message": f'No sos admin de "{source_row.get("nombre") or "Grupo sin nombre"}". No se puede importar.',
                    }
                )
                continue

            estado_sync = "pendiente_sync" if participants_total == 0 else "activo"
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
                    selected_type if selected_type in {"grupo", "comunidad", "canal"} else "grupo",
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

            if group_module_id:
                bridge_response = send_bridge_message(
                    source_row.get("dispositivo_id"),
                    source_row.get("jid"),
                    "/getgroupinfo",
                    is_command=True,
                ) or {}

                if not bridge_response.get("error"):
                    synced_subject = extract_group_metadata_subject(bridge_response, source_row.get("jid"))
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
                            estado_sync = %s,
                            sincronizado_en = NOW(),
                            actualizado_en = NOW()
                        WHERE id = %s
                        """,
                        (
                            synced_subject or source_row.get("nombre") or "Grupo sin nombre",
                            "activo" if synced_participants_total > 0 else "pendiente_sync",
                            group_module_id,
                        ),
                    )
                    sync_group_module_counts(cursor, group_module_id)

                log_group_module_action(
                    cursor,
                    group_module_id,
                    "importado",
                    f"Grupo importado desde {source_row.get('dispositivo_nombre') or 'WhatsApp'}",
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

            results.append(
                {
                    "groupId": original_group_id,
                    "success": True,
                    "message": "Grupo importado correctamente",
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
        admins = [
            {
                "nombre": admin.get("nombre") or normalize_phone_digits(admin.get("telefono") or admin.get("jid")),
                "telefono": normalize_phone_digits(admin.get("telefono") or admin.get("jid")),
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

        if synced_subject:
            cursor.execute(
                """
                UPDATE grupos_modulo
                SET nombre = %s,
                    estado_sync = %s,
                    sincronizado_en = NOW(),
                    actualizado_en = NOW()
                WHERE id = %s
                """,
                (synced_subject, "activo" if synced_participants_total > 0 else "pendiente_sync", group_id),
            )
        else:
            cursor.execute(
                """
                UPDATE grupos_modulo
                SET estado_sync = %s,
                    sincronizado_en = NOW(),
                    actualizado_en = NOW()
                WHERE id = %s
                """,
                ("activo" if synced_participants_total > 0 else "pendiente_sync", group_id),
            )
        sync_group_module_counts(cursor, group_id)
        log_group_module_action(cursor, group_id, "sincronizado", "Sincronizacion ejecutada manualmente")
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
            SELECT id, invite_link
            FROM grupos_modulo
            WHERE id = %s AND usuario_id = %s AND eliminado_en IS NULL
            LIMIT 1
            """,
            (group_id, user_id),
        )
        row = cursor.fetchone()
        if not row:
            return jsonify({"success": False, "message": "Grupo no encontrado"}), 404
        if not row.get("invite_link"):
            return jsonify({"success": False, "message": "Todavia no hay un link de invitacion disponible para este grupo"}), 400

        log_group_module_action(cursor, group_id, "link_actualizado", "Se consulto el link de invitacion")
        conn.commit()
        return jsonify({"success": True, "data": {"inviteLink": row.get("invite_link")}})
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
        writer.writerow(["Telefono", "Nombre", "Origen", "Estado", "Rol"])
        exported_count = 0

        for row in participant_rows:
            serialized = serialize_group_participant_row(row, contacts_by_jid, contacts_by_phone)
            estado = "Activo" if serialized.get("estado") == "activo" else "Salio"
            if scope == "active" and serialized.get("estado") != "activo":
                continue
            writer.writerow(
                [
                    serialized.get("telefono") or "",
                    serialized.get("nombre") or "",
                    serialized.get("origen") or "WhatsApp",
                    estado,
                    serialized.get("rol") or "miembro",
                ]
            )
            exported_count += 1

        log_group_module_action(
            cursor,
            group_id,
            "exportado",
            f"Exportacion de participantes ({'solo activos' if scope == 'active' else 'todos'})",
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


@app.route("/webhook/whatsapp", methods=["POST"])
def whatsapp_webhook():
    payload = request.get_json(silent=True) or {}
    
    # DIAGNÓSTICO: Guardar el payload para ver qué está enviando el bridge realmente
    try:
        with open("webhook_debug.json", "a") as f:
            import json
            f.write(json.dumps(payload) + "\n")
    except:
        pass

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
        if not validate_webhook_device(cursor, user_id, device_id):
            return jsonify({"success": False, "message": "Dispositivo no encontrado"}), 404

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

        event = {
            "event_type": event_type,
            "user_id": user_id,
            "device_id": device_id,
            "data": event_data,
        }
        publish_whatsapp_event(event)

        # GUARDAR EN BASE DE DATOS (CHATS, GRUPOS, MENSAJES)
        try:
            persist_webhook_message(cursor, user_id, device_id, event_data)
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
                texto_recibido = (msg.get("texto") or "").strip().lower()
                chat_jid = msg.get("chat_jid") or msg.get("remoteJid")
                
                if texto_recibido and chat_jid:
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
                    except: pass


                    # 1. VERIFICAR DISPARADORES DE PALABRAS CLAVE (PRIORIDAD ALTA)
                    cursor.execute(
                        """
                        SELECT * FROM automatizaciones 
                        WHERE usuario_id = %s AND dispositivo_id = %s AND activo = 1
                        """,
                        (user_id, device_id)
                    )
                    autos = cursor.fetchall()
                    keyword_triggered = False
                    
                    for auto in autos:
                        disparador = (auto.get("palabra_clave") or "").strip().lower()
                        # Si es coincidencia exacta o contiene la palabra clave
                        if disparador and (disparador == texto_recibido or disparador in texto_recibido):
                            # LIMPIAR CUALQUIER ESPERA PREVIA (REINICIAR FLUJO)
                            cursor.execute("DELETE FROM automatizacion_esperas WHERE contacto_jid = %s AND usuario_id = %s", (chat_jid, user_id))
                            conn.commit()
                            
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
                        # Guardar respuesta en el campo custom
                        campo_destino = espera.get("campo_destino")
                        if campo_destino:
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
                                    """, (contacto_row['id'], campo_row['id'], texto_recibido))
                                    conn.commit()
                        
                        # Eliminar la espera
                        cursor.execute("DELETE FROM automatizacion_esperas WHERE id = %s", (espera['id'],))
                        conn.commit()
                        
                        # Reanudar el flujo desde el nodo de la pregunta
                        auto_id = espera.get("automatizacion_id")
                        cursor.execute("SELECT * FROM automatizaciones WHERE id = %s", (auto_id,))
                        auto = cursor.fetchone()
                        if auto:
                            trigger_automation_async(user_id, device_id, auto, chat_jid, contact_name=nombre_contacto, start_node_id=espera.get("nodo_espera_id"), response_text=texto_recibido)
                        
                        return jsonify({"success": True, "message": "Respuesta capturada"})



        return jsonify({"success": True, "event": event})

    except ValueError as error:
        return jsonify({"success": False, "message": str(error)}), 400
    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    except Exception as error:
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
def get_profile(user_id):
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


@app.route("/api/dashboard/<int:user_id>", methods=["GET"])
def get_dashboard(user_id):
    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute("SELECT id, nombre, correo, rol FROM usuarios WHERE id = %s LIMIT 1", (user_id,))
        user = cursor.fetchone()
        if not user:
            return jsonify({"success": False, "message": "Usuario no encontrado"}), 404

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
                p.permite_campanas
            FROM suscripciones s
            INNER JOIN planes p ON p.id = s.plan_id
            WHERE s.usuario_id = %s
            ORDER BY
                FIELD(s.estado, 'activa', 'prueba', 'vencida', 'cancelada'),
                s.fecha_vencimiento DESC,
                s.id DESC
            LIMIT 1
            """,
            (user_id,),
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
                    permite_campanas
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
            }

        contacts_count = fetch_count(
            cursor,
            """
            SELECT COUNT(*) AS total
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE d.usuario_id = %s
            """,
            (user_id,),
        )
        devices_count = fetch_count(
            cursor,
            "SELECT COUNT(*) AS total FROM dispositivos WHERE usuario_id = %s",
            (user_id,),
        )
        connected_devices_count = fetch_count(
            cursor,
            "SELECT COUNT(*) AS total FROM dispositivos WHERE usuario_id = %s AND estado = 'conectado'",
            (user_id,),
        )
        agents_count = fetch_count(
            cursor,
            "SELECT COUNT(*) AS total FROM agentes_ia WHERE usuario_id = %s",
            (user_id,),
        )

        cursor.execute(
            """
            SELECT id, dispositivo_id, nombre, numero_telefono, estado, conectado_en, creado_en
            FROM dispositivos
            WHERE usuario_id = %s
            ORDER BY id ASC
            """,
            (user_id,),
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
                    "agentes": int(plan.get("max_agentes") or 0),
                    "contactos": int(plan.get("max_contactos") or 0),
                    "envios_masivos": int(plan.get("max_envios_masivos") or 0),
                    "automatizaciones": int(plan.get("max_automatizaciones") or 0),
                },
                "features": {
                    "ia": bool(plan.get("permite_ia") or False),
                    "whalink": bool(plan.get("permite_whalink") or False),
                    "grupos": bool(plan.get("permite_grupos") or False),
                    "campanas": bool(plan.get("permite_campanas") or False),
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
        }

        return jsonify({"success": True, "dashboard": dashboard})

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
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
    # ... (código existente)
    return jsonify({"success": True, "imagen_url": "..."}) # Simplificado para el chunk

@app.route("/api/automatizaciones/upload-media", methods=["POST"])
def upload_automation_media():
    try:
        user_id = resolve_request_user_id()
        if not user_id:
            return jsonify({"success": False, "message": "Usuario requerido"}), 401
            
        file = request.files.get("file")
        if not file or not file.filename:
            return jsonify({"success": False, "message": "Archivo requerido"}), 400
            
        upload_dir = os.path.join(app.config["UPLOAD_FOLDER"], "automations", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        file.save(os.path.join(upload_dir, unique_name))
        
        media_path = f"automations/{user_id}/{unique_name}"
        media_url = f"{request.host_url.rstrip('/')}/media/{media_path}"
        
        # Retornar la URL del archivo subido correctamente
        
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


@app.route("/api/whalink/save", methods=["POST"])
def save_whalink():
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

@app.route("/api/dispositivos/ensure", methods=["POST"])
def ensure_device():
    """Auto-crea el dispositivo del usuario si no tiene uno y arranca el bridge."""
    data = request.get_json(silent=True) or {}
    try:
        user_id = int(data.get("user_id") or request.args.get("user_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id requerido"}), 400

    try:
        device_id = get_or_create_device(user_id)
        bridge_running = is_bridge_running(device_id)

        if not bridge_running:
            start_whatsapp_bridge(user_id, device_id)
            bridge_running = True  # Se lanzó ahora

        return jsonify({
            "success": True,
            "device_id": device_id,
            "bridge_running": bridge_running,
        })
    except Exception as e:
        logger.error(f"Error en ensure_device: {e}")
        return jsonify({"success": False, "message": str(e)}), 500


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
            "SELECT id, usuario_id, nombre, numero_telefono, estado, codigo_qr, conectado_en, creado_en FROM dispositivos WHERE id = %s AND usuario_id = %s LIMIT 1",
            (device_id, user_id),
        )
        device = cursor.fetchone()

        if not device:
            return jsonify({"success": False, "message": "Dispositivo no encontrado"}), 404

        # Si ya está conectado, retornar estado directamente
        if device.get("estado") == "conectado":
            return jsonify({
                "success": True,
                "device": {
                    "id": device["id"],
                    "nombre": device.get("nombre") or "Mi WhatsApp",
                    "numero_telefono": device.get("numero_telefono"),
                    "estado": "conectado",
                    "codigo_qr": None,
                    "conectado_en": as_json_value(device.get("conectado_en")),
                    "creado_en": as_json_value(device.get("creado_en")),
                },
            })

        # Si el bridge no está corriendo, arrancarlo
        if not is_bridge_running(device_id):
            start_whatsapp_bridge(user_id, device_id)

        # Polling: esperar hasta 30s a que el QR aparezca en la BD
        qr_code = device.get("codigo_qr")
        if not qr_code:
            cursor.close()
            for _ in range(30):
                time.sleep(1)
                cursor = conn.cursor(dictionary=True)
                cursor.execute(
                    "SELECT estado, codigo_qr FROM dispositivos WHERE id = %s LIMIT 1",
                    (device_id,)
                )
                row = cursor.fetchone()
                cursor.close()
                cursor = None
                if row and row.get("estado") == "conectado":
                    return jsonify({"success": True, "device": {"id": device_id, "estado": "conectado", "codigo_qr": None}})
                if row and row.get("codigo_qr"):
                    qr_code = row["codigo_qr"]
                    break

        return jsonify({
            "success": True,
            "device": {
                "id": device["id"],
                "nombre": device.get("nombre") or "Mi WhatsApp",
                "numero_telefono": device.get("numero_telefono"),
                "estado": device.get("estado") or "desconectado",
                "codigo_qr": qr_code,
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


@app.route("/api/contacts/<int:user_id>", methods=["GET"])
def get_contacts(user_id):
    search = (request.args.get("q") or "").strip()
    estado = (request.args.get("estado") or "").strip()
    dispositivo_id = (request.args.get("dispositivo_id") or "").strip()
    try:
        page = max(int(request.args.get("page", 1) or 1), 1)
        limit = min(max(int(request.args.get("limit", 25) or 25), 1), 100)
    except ValueError:
        return jsonify({"success": False, "message": "Parametros de paginacion invalidos"}), 400
    offset = (page - 1) * limit

    where_parts = [
        "d.usuario_id = %s",
        "c.jid NOT LIKE '%@lid'",   # excluir duplicados LID de WhatsApp multi-device
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
                ua.nombre AS agente_asignado_nombre,
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
            LEFT JOIN usuarios ua ON ua.id = c.agente_asignado_id
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

# --- ACTUALIZAR CONTACTO ---
@app.route('/api/contacts/<int:user_id>/<int:contact_id>', methods=['PUT'])
def update_contact_basic(user_id, contact_id):
    data = request.json
    nombre = data.get('nombre')
    correo = data.get('correo')
    empresa = data.get('empresa')
    estado_lead = data.get('estado_lead', 'nuevo')

    conn = get_connection()
    cursor = conn.cursor()
    try:
        cursor.execute("""
            UPDATE contactos 
            SET nombre = %s, correo = %s, empresa = %s, estado_lead = %s, actualizado_en = CURRENT_TIMESTAMP
            WHERE id = %s
        """, (nombre, correo, empresa, estado_lead, contact_id))
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
        user_id = int(requested_user_id)
        dispositivo_id = int(requested_device_id)
        limit = min(max(int(request.args.get("limit", 250) or 250), 1), 500)
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id y dispositivo_id son obligatorios"}), 400

    contact_where_parts = [
        "d.usuario_id = %s",
        "c.dispositivo_id = %s",
        "(c.jid LIKE '%@s.whatsapp.net' OR c.jid LIKE '%@lid')",
        "c.jid NOT LIKE '%@broadcast'",
        "c.jid NOT LIKE '%@newsletter'",
        """
        (
            c.jid NOT LIKE '%@lid'
            OR (
                NULLIF(TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)), '') IS NOT NULL
                AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT REGEXP '^[0-9]+$'
                AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT LIKE '%@%'
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
    ]
    contact_params = [user_id, dispositivo_id]

    group_where_parts = [
        "d.usuario_id = %s",
        "g.dispositivo_id = %s",
        "g.jid LIKE '%@g.us'",
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
    group_params = [user_id, dispositivo_id]

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
                ua.nombre AS agente_asignado_nombre,
                c.mensajes_sin_leer,
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
                ) AS sort_timestamp
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            LEFT JOIN usuarios ua ON ua.id = c.agente_asignado_id
            LEFT JOIN chats ch_current
                ON ch_current.dispositivo_id = c.dispositivo_id
                AND ch_current.jid = c.jid
            WHERE {contact_where_sql}
            GROUP BY c.jid
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
                    (
                        SELECT ch.ultimo_mensaje
                        FROM chats ch
                        WHERE ch.dispositivo_id = g.dispositivo_id
                            AND ch.jid = g.jid
                        LIMIT 1
                    ),
                    g.ultimo_mensaje
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
                    (
                        SELECT ch.ultimo_mensaje_fecha
                        FROM chats ch
                        WHERE ch.dispositivo_id = g.dispositivo_id
                            AND ch.jid = g.jid
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
                    (
                        SELECT ch.last_media_type
                        FROM chats ch
                        WHERE ch.dispositivo_id = g.dispositivo_id
                            AND ch.jid = g.jid
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
                    (
                        SELECT ch.last_timestamp
                        FROM chats ch
                        WHERE ch.dispositivo_id = g.dispositivo_id
                            AND ch.jid = g.jid
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
                    (
                        SELECT ch.last_timestamp
                        FROM chats ch
                        WHERE ch.dispositivo_id = g.dispositivo_id
                            AND ch.jid = g.jid
                        LIMIT 1
                    ),
                    UNIX_TIMESTAMP(g.actualizado_en),
                    UNIX_TIMESTAMP(g.creado_en),
                    0
                ) AS sort_timestamp
            FROM grupos g
            INNER JOIN dispositivos d ON d.id = g.dispositivo_id
            WHERE {group_where_sql}
            GROUP BY g.jid
            ORDER BY
                ultimo_mensaje_fecha DESC,
                sort_timestamp DESC,
                g.actualizado_en DESC,
                g.id DESC
            LIMIT %s
            """,
            tuple(group_params + [limit]),
        )
        group_rows = cursor.fetchall()

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
    search = (request.args.get("q") or "").strip()
    try:
        limit = min(max(int(request.args.get("limit", 60) or 60), 1), 120)
    except ValueError:
        return jsonify({"success": False, "message": "Limite invalido"}), 400

    where_parts = [
        "d.usuario_id = %s",
        "(c.jid LIKE '%@s.whatsapp.net' OR c.jid LIKE '%@lid')",
        "c.jid NOT LIKE '%@broadcast'",
        "c.jid NOT LIKE '%@newsletter'",
        """
        (
            c.jid NOT LIKE '%@lid'
            OR (
                NULLIF(TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)), '') IS NOT NULL
                AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT REGEXP '^[0-9]+$'
                AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT LIKE '%@%'
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
                ua.nombre AS agente_asignado_nombre,
                c.mensajes_sin_leer,
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
                ) AS last_media_type
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            LEFT JOIN usuarios ua ON ua.id = c.agente_asignado_id
            LEFT JOIN chats ch_current
                ON ch_current.dispositivo_id = c.dispositivo_id
                AND ch_current.jid = c.jid
            WHERE {where_sql}
            GROUP BY c.jid
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

        if is_group_chat:
            group_lookup_where = "g.jid = %s" if is_jid_lookup else "g.id = %s"
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
                (lookup_id, user_id),
            )
            contact = cursor.fetchone()
            serialize_chat = serialize_group_chat
        else:
            contact_lookup_where = "c.jid = %s" if is_jid_lookup else "c.id = %s"
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
                    ua.nombre AS agente_asignado_nombre,
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
                LEFT JOIN usuarios ua ON ua.id = c.agente_asignado_id
                WHERE {contact_lookup_where} AND d.usuario_id = %s
                LIMIT 1
                """,
                (lookup_id, user_id),
            )
            contact = cursor.fetchone()
            serialize_chat = serialize_contact

        if not contact:
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
                m.push_name
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


@app.route("/api/chats/<int:user_id>/<chat_key>/messages", methods=["POST"])
def send_chat_message(user_id, chat_key):
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

        if is_group_chat:
            group_lookup_where = "g.jid = %s" if is_jid_lookup else "g.id = %s"
            cursor.execute(
                f"""
                SELECT g.id, g.dispositivo_id, g.jid, g.nombre, g.foto_perfil
                FROM grupos g
                INNER JOIN dispositivos d ON d.id = g.dispositivo_id
                WHERE {group_lookup_where} AND d.usuario_id = %s
                LIMIT 1
                """,
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()
            serialize_chat = serialize_group_chat
        else:
            contact_lookup_where = "c.jid = %s" if is_jid_lookup else "c.id = %s"
            cursor.execute(
                f"""
                SELECT c.id, c.dispositivo_id, c.jid, c.nombre, c.foto_perfil
                FROM contactos c
                INNER JOIN dispositivos d ON d.id = c.dispositivo_id
                WHERE {contact_lookup_where} AND d.usuario_id = %s
                LIMIT 1
                """,
                (lookup_id, user_id),
            )
            chat_row = cursor.fetchone()
            serialize_chat = serialize_contact

        if not chat_row:
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
            if file_url.startswith('/'):
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
            return jsonify({"success": False, "message": f"Error del bridge: {str(e)}"}), 500

        if bridge_status >= 400:
            return jsonify({"success": False, "message": "Error al enviar mensaje via WhatsApp"}), 500

        # 5. Actualizar base de datos local
        try:
            # Marcar como leídos y actualizar agente
            if not is_group_chat:
                cursor.execute(
                    "UPDATE contactos SET agente_asignado_id = %s, mensajes_sin_leer = 0, actualizado_en = NOW() WHERE id = %s",
                    (user_id, chat_row["id"])
                )
            else:
                cursor.execute(
                    "UPDATE grupos SET mensajes_sin_leer = 0, actualizado_en = NOW() WHERE id = %s",
                    (chat_row["id"],)
                )
            conn.commit()
        except Exception as db_err:
            print(f"Error actualizando DB post-envío: {db_err}")

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


@app.route("/api/contacts/<int:user_id>/<int:contact_id>", methods=["PUT"])
def update_contact(user_id, contact_id):
    data = request.get_json(silent=True) or {}
    nombre = (data.get("nombre") or "").strip() or None
    correo = (data.get("correo") or "").strip() or None
    empresa = (data.get("empresa") or "").strip() or None
    estado_lead = (data.get("estado_lead") or "nuevo").strip()
    allowed_states = {"nuevo", "interesado", "en_negociacion", "cerrado", "perdido"}

    if estado_lead not in allowed_states:
        return jsonify({"success": False, "message": "Estado de lead invalido"}), 400

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
                c.estado_lead = %s
            WHERE c.id = %s AND d.usuario_id = %s
            """,
            (nombre, correo, empresa, estado_lead, contact_id, user_id),
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
                c.estado_lead, c.agente_asignado_id, c.mensajes_sin_leer, c.ultimo_mensaje,
                c.ultima_vez_visto, c.creado_en, c.actualizado_en, c.push_name,
                c.verified_name, c.notify_name, c.last_timestamp, c.last_media_type
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
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

        if folder_id:
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
            
        return jsonify({"success": True, "automation": automation})
    except Exception as e:
        logger.exception("Error obteniendo detalle de automatizacion")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        cursor.close()
        conn.close()


@app.route("/api/automatizaciones", methods=["POST"])
def create_automation():
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

    if tipo_disparador == "palabra_clave" and not palabra_clave:
        return jsonify({"success": False, "message": "La palabra clave es obligatoria para este disparador"}), 400

    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        ensure_automation_schema(cursor)

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
def update_automation(automation_id):
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

    if tipo_disparador == "palabra_clave" and not palabra_clave:
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
def delete_automation(automation_id):
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

def send_bridge_message(device_id, jid, text, is_command=False):
    """Envía un mensaje o comando a través del bridge de WhatsApp."""
    import urllib.request as _urllib_req
    bridge_port = 5000 + (device_id % 1000)
    url = f"http://127.0.0.1:{bridge_port}/send"
    
    if is_command and text == "/getgroupinfo":
        payload = {"jid": jid, "type": "group_metadata"}
    else:
        payload = {"jid": jid, "text": text}
        
    try:
        data = json.dumps(payload).encode("utf-8")
        req = _urllib_req.Request(url, data=data, headers={'Content-Type': 'application/json'}, method="POST")
        with _urllib_req.urlopen(req, timeout=15) as response:
            return json.loads(response.read().decode())
    except Exception as e:
        logger.error(f"Error enviando comando/mensaje al bridge en puerto {bridge_port}: {e}")
        return {"error": str(e)}

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
                                standard_fields = {'nombre': 'nombre', 'correo': 'correo', 'empresa': 'empresa'}
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
                    
                    if chosen_opt_id:
                        edge = next((e for e in conexiones if e.get("source") == current_node_id and e.get("sourceHandle") == chosen_opt_id), None)
                        if edge:
                            current_node_id = edge.get("target")
                            continue
                
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
                            ext = (media_url.split('.')[-1] or "").lower()
                            m_type = "image"
                            if any(v in ext for v in ["mp4", "m4v", "mov", "webm"]): m_type = "video"
                            elif ext == "pdf" or block.get("key") == "Documento": m_type = "document"
                            elif any(v in ext for v in ["mp3", "ogg", "wav"]) or block.get("key") == "Audio": m_type = "audio"
                            
                            payload = {
                                "jid": chat_jid, "url": media_url, "type": m_type,
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
                                        cursor.execute("SELECT 1 FROM contacto_tags WHERE contacto_id = %s AND tag_id = %s", (c_id, tag_id))
                                        if not cursor.fetchone():
                                            cursor.execute("INSERT INTO contacto_tags (contacto_id, tag_id) VALUES (%s, %s)", (c_id, tag_id))
                                            conn.commit()
                                            logger.info(f"✅ TAG AGREGADO: Contacto {c_id} recibió Tag {tag_id}")
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
                                        cursor.execute("DELETE FROM contacto_tags WHERE contacto_id = %s AND tag_id = %s", (contact['id'], tag_id))
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
                                    standard_fields = {'nombre': 'nombre', 'correo': 'correo', 'empresa': 'empresa'}
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

if __name__ == "__main__":
    print("Servidor Flask corriendo en http://localhost:5000")
    app.run(debug=True, port=5000)
