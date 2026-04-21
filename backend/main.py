import json
import os
import time
from datetime import datetime
from queue import Empty, Full, Queue

import bcrypt
import mysql.connector
from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS
from werkzeug.security import check_password_hash


app = Flask(__name__)
CORS(app)
whatsapp_event_subscribers = []


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


def normalize_jid(value):
    return str(value or "").strip()


def is_group_jid(jid):
    return normalize_jid(jid).endswith("@g.us")


def is_user_jid(jid):
    return normalize_jid(jid).endswith("@s.whatsapp.net")


def is_technical_jid(jid):
    normalized = normalize_jid(jid).lower()
    return "@lid" in normalized or "@broadcast" in normalized or normalized.endswith("@newsletter")


def is_supported_chat_jid(jid):
    normalized = normalize_jid(jid)
    return bool(normalized and not is_technical_jid(normalized) and (is_user_jid(normalized) or is_group_jid(normalized)))


def clean_related_jid(value):
    normalized = normalize_jid(value)
    return normalized if is_supported_chat_jid(normalized) else None


def phone_from_jid(jid):
    user = normalize_jid(jid).split("@")[0].split(":")[0]
    digits = digits_only(user)
    return digits or user or "sin_numero"


def parse_webhook_datetime(value):
    if not value:
        return datetime.now()

    if isinstance(value, datetime):
        return value

    try:
        if isinstance(value, (int, float)):
            return datetime.fromtimestamp(value)

        text = str(value).strip().replace("Z", "")
        return datetime.fromisoformat(text.replace(" ", "T"))
    except (TypeError, ValueError):
        return datetime.now()


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
        "telefono": row.get("telefono"),
        "nombre": row.get("nombre"),
        "display_name": contact_display_name(row),
        "foto_perfil": row.get("foto_perfil"),
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
        "url_media": row.get("url_media"),
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
    if not is_supported_chat_jid(jid):
        return

    safe_name = clean_name_value(name, jid)
    message_date = to_mysql_datetime(sent_at) if sent_at else None
    message_timestamp = unix_seconds(sent_at) if sent_at else None

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
                    THEN COALESCE(VALUES(ultimo_mensaje), ultimo_mensaje)
                ELSE ultimo_mensaje
            END,
            ultimo_mensaje_fecha = CASE
                WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
                    THEN COALESCE(VALUES(ultimo_mensaje_fecha), ultimo_mensaje_fecha)
                ELSE ultimo_mensaje_fecha
            END,
            last_media_type = CASE
                WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
                    THEN COALESCE(VALUES(last_media_type), last_media_type)
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
            preview,
            message_date,
            message_timestamp,
            message_type,
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
    upsert_webhook_chat(cursor, device_id, jid, "contacto", name)
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
    upsert_webhook_chat(cursor, device_id, jid, "grupo", safe_name)


def persist_webhook_message(cursor, user_id, device_id, data):
    message = data.get("message") or data
    jid = normalize_jid(message.get("remoteJid") or message.get("chat_jid") or message.get("jid"))
    if not jid:
        raise ValueError("remoteJid/chat_jid es obligatorio")
    if not is_supported_chat_jid(jid):
        raise ValueError("JID de WhatsApp no soportado")

    is_group = bool(message.get("es_grupo")) or is_group_jid(jid)
    message_type = clean_text(message.get("tipo")) or "texto"
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
        "sent_at": sent_at_mysql,
        "name": name,
        "user_id": user_id,
        "device_id": device_id,
    }


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
                    yield f"data: {json.dumps(event, default=str)}\n\n"
                except Empty:
                    yield f": ping {int(time.time())}\n\n"
        finally:
            if subscriber in whatsapp_event_subscribers:
                whatsapp_event_subscribers.remove(subscriber)

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

    if event_type not in {"upsert-message", "update-contact"}:
        return jsonify({"success": False, "message": "event_type invalido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        ensure_chats_table(cursor)

        if not validate_webhook_device(cursor, user_id, device_id):
            conn.rollback()
            return jsonify({"success": False, "message": "Dispositivo no encontrado"}), 404

        if event_type == "update-contact":
            contact = data.get("contact") or data
            result = upsert_webhook_contact(cursor, device_id, contact)

            if not result:
                conn.rollback()
                return jsonify({"success": False, "message": "Contacto invalido"}), 400

            conn.commit()
            event = {
                "event_type": event_type,
                "user_id": user_id,
                "device_id": device_id,
                "data": {"contact": result},
            }
            publish_whatsapp_event(event)
            return jsonify({"success": True, "event": event})

        message_result = persist_webhook_message(cursor, user_id, device_id, data)
        conn.commit()
        event = {
            "event_type": event_type,
            "user_id": user_id,
            "device_id": device_id,
            "data": {"message": message_result},
        }
        publish_whatsapp_event(event)
        return jsonify({"success": True, "event": event})

    except ValueError as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": str(error)}), 400
    except mysql.connector.Error as error:
        if conn:
            conn.rollback()
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    except Exception as error:
        if conn:
            conn.rollback()
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
            """
            SELECT
                id,
                usuario_id,
                dispositivo_id,
                nombre,
                numero_telefono,
                estado,
                codigo_qr,
                conectado_en,
                creado_en
            FROM dispositivos
            WHERE id = %s AND usuario_id = %s
            LIMIT 1
            """,
            (device_id, user_id),
        )
        device = cursor.fetchone()

        if not device:
            return jsonify({"success": False, "message": "Dispositivo no encontrado"}), 404

        return jsonify(
            {
                "success": True,
                "device": {
                    "id": device["id"],
                    "usuario_id": device.get("usuario_id"),
                    "dispositivo_id": device.get("dispositivo_id"),
                    "nombre": device.get("nombre") or "Mi WhatsApp",
                    "numero_telefono": device.get("numero_telefono"),
                    "estado": device.get("estado") or "desconectado",
                    "codigo_qr": device.get("codigo_qr"),
                    "conectado_en": as_json_value(device.get("conectado_en")),
                    "creado_en": as_json_value(device.get("creado_en")),
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

    where_parts = ["d.usuario_id = %s"]
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

    where_parts = [
        "d.usuario_id = %s",
        "c.dispositivo_id = %s",
        """
        (
            NULLIF(TRIM(c.ultimo_mensaje), '') IS NOT NULL
            OR EXISTS (
                SELECT 1
                FROM mensajes mx
                WHERE mx.dispositivo_id = c.dispositivo_id
                    AND mx.chat_jid = c.jid
                LIMIT 1
            )
        )
        """,
    ]
    params = [user_id, dispositivo_id]

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
                (
                    SELECT m.fecha_mensaje
                    FROM mensajes m
                    WHERE m.dispositivo_id = c.dispositivo_id
                        AND m.chat_jid = c.jid
                    ORDER BY m.fecha_mensaje DESC, m.id DESC
                    LIMIT 1
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
                    c.last_media_type
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
                    UNIX_TIMESTAMP(c.ultima_vez_visto),
                    UNIX_TIMESTAMP(c.actualizado_en),
                    0
                ) AS sort_timestamp
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE {where_sql}
            ORDER BY
                sort_timestamp DESC,
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
            chat["sort_timestamp"] = row.get("sort_timestamp")
            chats.append(chat)

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

    where_parts = ["d.usuario_id = %s"]
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
                c.nombre,
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
                (
                    SELECT m.fecha_mensaje
                    FROM mensajes m
                    WHERE m.dispositivo_id = c.dispositivo_id
                        AND m.chat_jid = c.jid
                    ORDER BY m.fecha_mensaje DESC, m.id DESC
                    LIMIT 1
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
                    c.last_media_type
                ) AS last_media_type
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE {where_sql}
            ORDER BY
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

        return jsonify({"success": True, "chats": chats})

    except mysql.connector.Error as error:
        return jsonify({"success": False, "message": f"Error de base de datos: {error}"}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@app.route("/api/chats/<int:user_id>/<int:contact_id>/messages", methods=["GET"])
def get_chat_messages(user_id, contact_id):
    try:
        limit = min(max(int(request.args.get("limit", 80) or 80), 1), 200)
    except ValueError:
        return jsonify({"success": False, "message": "Limite invalido"}), 400

    before_id = request.args.get("before_id")
    before_id_value = None
    if before_id:
        try:
            before_id_value = int(before_id)
        except ValueError:
            return jsonify({"success": False, "message": "before_id invalido"}), 400

    conn = None
    cursor = None

    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)

        cursor.execute(
            """
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
                c.participants_json,
                c.last_timestamp,
                c.last_media_type
            FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE c.id = %s AND d.usuario_id = %s
            LIMIT 1
            """,
            (contact_id, user_id),
        )
        contact = cursor.fetchone()

        if not contact:
            return jsonify({"success": False, "message": "Chat no encontrado"}), 404

        where_parts = ["m.dispositivo_id = %s", "m.chat_jid = %s"]
        params = [contact["dispositivo_id"], contact["jid"]]

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
                "contact": serialize_contact(contact),
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
