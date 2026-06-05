import argparse
import os
import sys

import mysql.connector


DB_CONFIG = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "funnelchat_dev"),
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
}


def table_exists(cursor, table_name):
    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM information_schema.tables
        WHERE table_schema = DATABASE()
          AND table_name = %s
        """,
        (table_name,),
    )
    return int((cursor.fetchone() or {}).get("total") or 0) > 0


def column_exists(cursor, table_name, column_name):
    cursor.execute(
        """
        SELECT COUNT(*) AS total
        FROM information_schema.columns
        WHERE table_schema = DATABASE()
          AND table_name = %s
          AND column_name = %s
        """,
        (table_name, column_name),
    )
    return int((cursor.fetchone() or {}).get("total") or 0) > 0


def fetch_count(cursor, table_name, where_sql, params):
    if not table_exists(cursor, table_name):
        return 0

    cursor.execute(f"SELECT COUNT(*) AS total FROM {table_name} WHERE {where_sql}", params)
    return int((cursor.fetchone() or {}).get("total") or 0)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Reset WhatsApp sync data for one device so Baileys can request history again."
    )
    parser.add_argument("--user-id", type=int, required=True)
    parser.add_argument("--device-id", type=int, required=True)
    parser.add_argument(
        "--confirm",
        action="store_true",
        help="Actually delete WhatsApp sync data and clear the device session.",
    )
    parser.add_argument(
        "--keep-session",
        action="store_true",
        help="Keep dispositivos.session_auth. Use only when you do not need a full QR resync.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    try:
        cursor.execute(
            """
            SELECT id, usuario_id, dispositivo_id, nombre, estado
            FROM dispositivos
            WHERE id = %s AND usuario_id = %s
            LIMIT 1
            """,
            (args.device_id, args.user_id),
        )
        device = cursor.fetchone()

        if not device:
            print("No existe ese dispositivo para ese usuario.")
            return 1

        counts = {
            "mensajes": fetch_count(cursor, "mensajes", "dispositivo_id = %s", (args.device_id,)),
            "contactos": fetch_count(cursor, "contactos", "dispositivo_id = %s", (args.device_id,)),
            "grupos": fetch_count(cursor, "grupos", "dispositivo_id = %s", (args.device_id,)),
            "chats": fetch_count(cursor, "chats", "dispositivo_id = %s", (args.device_id,)),
        }

        print("Dispositivo encontrado:")
        print(f"- id: {device['id']}")
        print(f"- nombre: {device.get('nombre') or device.get('dispositivo_id')}")
        print(f"- estado: {device.get('estado')}")
        print("Datos WhatsApp que se limpiarian:")
        for table_name, total in counts.items():
            print(f"- {table_name}: {total}")

        if not args.confirm:
            print("")
            print("Modo seguro: no se hizo ningun cambio.")
            print("Para ejecutar la limpieza real agrega --confirm.")
            return 0

        cursor.execute("DELETE FROM mensajes WHERE dispositivo_id = %s", (args.device_id,))

        if table_exists(cursor, "chats"):
            cursor.execute("DELETE FROM chats WHERE dispositivo_id = %s", (args.device_id,))

        cursor.execute("DELETE FROM contactos WHERE dispositivo_id = %s", (args.device_id,))
        cursor.execute("DELETE FROM grupos WHERE dispositivo_id = %s", (args.device_id,))

        has_session_auth = column_exists(cursor, "dispositivos", "session_auth")
        session_sql = "session_auth = session_auth" if args.keep_session or not has_session_auth else "session_auth = NULL"

        cursor.execute(
            f"""
            UPDATE dispositivos
            SET estado = 'desconectado',
                codigo_qr = NULL,
                numero_telefono = NULL,
                conectado_en = NULL,
                {session_sql}
            WHERE id = %s AND usuario_id = %s
            """,
            (args.device_id, args.user_id),
        )

        conn.commit()

        print("")
        print("Limpieza WhatsApp completada.")
        if args.keep_session:
            print("Se conservo session_auth; no fuerza QR nuevo.")
        else:
            print("Se limpio session_auth; reinicia el bridge y escanea el QR para pedir historial otra vez.")
        return 0
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    sys.exit(main())
