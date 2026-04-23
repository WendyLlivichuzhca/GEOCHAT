import html
import json
import os
import secrets
import string
import subprocess
import sys
import time
import uuid
from datetime import datetime
from queue import Empty, Full, Queue
from urllib.parse import quote

import bcrypt
import mysql.connector
from flask import Flask, Response, jsonify, redirect, request, stream_with_context, send_from_directory
from flask_cors import CORS
from werkzeug.security import check_password_hash
from werkzeug.utils import secure_filename


from flask_cors import CORS
from werkzeug.security import check_password_hash
import logging

# Configurar logging para ver errores en consola
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MEDIA_FOLDER = os.path.join(BASE_DIR, 'media')

# Configuración de Flask para el diseño (static) y fotos (media)
app = Flask(__name__, static_folder='static', static_url_path='')
app.config['MEDIA_FOLDER'] = MEDIA_FOLDER

CORS(app, resources={r"/*": {"origins": "*"}})
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
        cursor.execute(
            """
            INSERT INTO dispositivos (usuario_id, nombre, estado, creado_en)
            VALUES (%s, 'Mi WhatsApp', 'desconectado', NOW())
            """,
            (user_id,)
        )
        conn.commit()
        new_id = cursor.lastrowid
        logger.info(f'Dispositivo auto-creado: id={new_id} para usuario_id={user_id}')
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
    user = normalize_jid(jid).split("@")[0].split(":")[0]
    digits = digits_only(user)
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
    for key in ("nombre", "push_name", "verified_name", "notify_name", "display_name"):
        value = clean_name_value(data.get(key), jid)
        if value:
            return value

    return None


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
    }


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
                    window.location.href = "{continue_url}";
                }}, 900);
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
            nombre = IF(nombre IS NOT NULL AND nombre != '' AND nombre != jid, nombre, COALESCE(NULLIF(VALUES(nombre), ''), nombre)),
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

    if update_name:
        update_sql = """
            telefono = VALUES(telefono),
            nombre = COALESCE(NULLIF(VALUES(nombre), ''), nombre),
            push_name = COALESCE(NULLIF(VALUES(push_name), ''), push_name),
            verified_name = COALESCE(NULLIF(VALUES(verified_name), ''), verified_name),
            notify_name = COALESCE(NULLIF(VALUES(notify_name), ''), notify_name),
            actualizado_en = NOW()
        """
    else:
        update_sql = """
            telefono = VALUES(telefono),
            actualizado_en = NOW()
        """

    cursor.execute(
        f"""
        INSERT INTO contactos (
            dispositivo_id, jid, telefono, nombre, push_name, verified_name, notify_name
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s)
        ON DUPLICATE KEY UPDATE
            {update_sql}
        """,
        (device_id, jid, phone, name, push_name, verified_name, notify_name),
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
    name = webhook_display_name(message, jid) if update_name and not is_group else None
    de_jid = clean_related_jid(message.get("de_jid")) or jid
    participant_jid = clean_related_jid(message.get("participant_jid"))

    if is_group:
        upsert_webhook_group(cursor, device_id, jid, name, update_name=False)
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

    upsert_webhook_chat(
        cursor,
        device_id,
        jid,
        "grupo" if is_group else "contacto",
        name,
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
    event_type = clean_text(payload.get("event_type"))
    data = payload.get("data") or {}

    try:
        user_id = int(payload.get("user_id") or data.get("user_id"))
        device_id = int(payload.get("device_id") or data.get("device_id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "user_id y device_id son obligatorios"}), 400

    if event_type not in {"upsert-message", "update-contact", "chat-update"}:
        return jsonify({"success": False, "message": "event_type invalido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        if not validate_webhook_device(cursor, user_id, device_id):
            return jsonify({"success": False, "message": "Dispositivo no encontrado"}), 404

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

        return jsonify({"success": True, "user": public_user(user)})

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
    try:
        user_id = int(request.form.get("user_id") or request.headers.get("X-User-Id"))
    except (TypeError, ValueError):
        return jsonify({"success": False, "message": "Usuario requerido"}), 400

    file = request.files.get("image")
    if not file or not file.filename:
        return jsonify({"success": False, "message": "Imagen requerida"}), 400

    if not allowed_image_file(file.filename):
        return jsonify({"success": False, "message": "Formato de imagen no permitido"}), 400

    upload_dir = os.path.join(app.config["UPLOAD_FOLDER"], "whalinks", str(user_id))
    os.makedirs(upload_dir, exist_ok=True)
    filename = secure_filename(file.filename)
    unique_name = f"{uuid.uuid4().hex}_{filename}"
    file.save(os.path.join(upload_dir, unique_name))

    image_path = f"whalinks/{user_id}/{unique_name}"
    image_url = f"{request.host_url.rstrip('/')}/media/{image_path}"
    return jsonify({"success": True, "imagen_url": image_url})


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

        whatsapp_url = (
            whalink.get("url_generada")
            or whalink.get("url_redireccion")
            or build_whatsapp_url(
                whalink.get("numero_telefono"),
                whalink.get("mensaje") or whalink.get("mensaje_bienvenida") or "",
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
                c.mensajes_sin_leer,
                c.ultimo_mensaje,
                c.ultima_vez_visto,
                c.creado_en,
                c.actualizado_en,
                c.push_name,
                c.verified_name,
                c.notify_name,
                c.last_timestamp,
                c.last_media_type
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
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

    try:
        # Usar GET (el bridge solo comprueba pathname + query, no el método)
        req = _urllib_req.Request(bridge_url, method="GET")
        with _urllib_req.urlopen(req, timeout=30) as response:
            data = json.loads(response.read().decode())
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


if __name__ == "__main__":
    print("Servidor Flask corriendo en http://localhost:5000")
    app.run(debug=True, port=5000)