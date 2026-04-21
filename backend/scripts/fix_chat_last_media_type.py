import os

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


def main():
    conn = mysql.connector.connect(**DB_CONFIG)
    cursor = conn.cursor(dictionary=True)

    try:
        if not table_exists(cursor, "chats"):
            print("La tabla chats no existe en esta base de datos.")
            return

        cursor.execute(
            """
            UPDATE chats c
            INNER JOIN mensajes m
              ON m.dispositivo_id = c.dispositivo_id
             AND m.chat_jid = c.jid
            LEFT JOIN mensajes newer
              ON newer.dispositivo_id = m.dispositivo_id
             AND newer.chat_jid = m.chat_jid
             AND (
                    newer.fecha_mensaje > m.fecha_mensaje
                 OR (newer.fecha_mensaje = m.fecha_mensaje AND newer.id > m.id)
             )
            SET
                c.last_media_type = COALESCE(NULLIF(m.tipo, ''), 'texto'),
                c.ultimo_mensaje = COALESCE(
                    NULLIF(c.ultimo_mensaje, ''),
                    NULLIF(m.texto, ''),
                    CONCAT('[', COALESCE(NULLIF(m.tipo, ''), 'texto'), ']')
                ),
                c.ultimo_mensaje_fecha = COALESCE(c.ultimo_mensaje_fecha, m.fecha_mensaje),
                c.last_timestamp = COALESCE(c.last_timestamp, UNIX_TIMESTAMP(m.fecha_mensaje)),
                c.actualizado_en = NOW()
            WHERE newer.id IS NULL
              AND (
                    c.last_media_type IS NULL
                 OR TRIM(c.last_media_type) = ''
                 OR c.ultimo_mensaje IS NULL
                 OR TRIM(c.ultimo_mensaje) = ''
                 OR c.ultimo_mensaje_fecha IS NULL
                 OR c.last_timestamp IS NULL
              )
            """
        )
        hydrated_rows = cursor.rowcount

        cursor.execute(
            """
            UPDATE chats
            SET last_media_type = 'texto',
                ultimo_mensaje = COALESCE(NULLIF(ultimo_mensaje, ''), '[texto]'),
                ultimo_mensaje_fecha = COALESCE(
                    ultimo_mensaje_fecha,
                    FROM_UNIXTIME(NULLIF(last_timestamp, 0)),
                    actualizado_en,
                    creado_en,
                    NOW()
                ),
                last_timestamp = COALESCE(
                    NULLIF(last_timestamp, 0),
                    UNIX_TIMESTAMP(ultimo_mensaje_fecha),
                    UNIX_TIMESTAMP(actualizado_en),
                    UNIX_TIMESTAMP(creado_en),
                    UNIX_TIMESTAMP(NOW())
                ),
                actualizado_en = NOW()
            WHERE last_media_type IS NULL
               OR TRIM(last_media_type) = ''
            """
        )
        fixed_rows = cursor.rowcount

        contacts_hydrated_rows = 0
        contacts_fixed_rows = 0

        if table_exists(cursor, "contactos"):
            cursor.execute(
                """
                UPDATE contactos c
                INNER JOIN mensajes m
                  ON m.dispositivo_id = c.dispositivo_id
                 AND m.chat_jid = c.jid
                LEFT JOIN mensajes newer
                  ON newer.dispositivo_id = m.dispositivo_id
                 AND newer.chat_jid = m.chat_jid
                 AND (
                        newer.fecha_mensaje > m.fecha_mensaje
                     OR (newer.fecha_mensaje = m.fecha_mensaje AND newer.id > m.id)
                 )
                SET
                    c.last_media_type = COALESCE(NULLIF(m.tipo, ''), 'texto'),
                    c.ultimo_mensaje = COALESCE(
                        NULLIF(c.ultimo_mensaje, ''),
                        NULLIF(m.texto, ''),
                        CONCAT('[', COALESCE(NULLIF(m.tipo, ''), 'texto'), ']')
                    ),
                    c.ultima_vez_visto = COALESCE(c.ultima_vez_visto, m.fecha_mensaje),
                    c.last_timestamp = COALESCE(c.last_timestamp, UNIX_TIMESTAMP(m.fecha_mensaje)),
                    c.actualizado_en = NOW()
                WHERE newer.id IS NULL
                  AND (
                        c.last_media_type IS NULL
                     OR TRIM(c.last_media_type) = ''
                     OR c.ultimo_mensaje IS NULL
                     OR TRIM(c.ultimo_mensaje) = ''
                     OR c.ultima_vez_visto IS NULL
                     OR c.last_timestamp IS NULL
                  )
                """
            )
            contacts_hydrated_rows = cursor.rowcount

            cursor.execute(
                """
                UPDATE contactos
                SET last_media_type = 'texto',
                    ultimo_mensaje = COALESCE(NULLIF(ultimo_mensaje, ''), '[texto]'),
                    ultima_vez_visto = COALESCE(
                        ultima_vez_visto,
                        FROM_UNIXTIME(NULLIF(last_timestamp, 0)),
                        actualizado_en,
                        creado_en,
                        NOW()
                    ),
                    last_timestamp = COALESCE(
                        NULLIF(last_timestamp, 0),
                        UNIX_TIMESTAMP(ultima_vez_visto),
                        UNIX_TIMESTAMP(actualizado_en),
                        UNIX_TIMESTAMP(creado_en),
                        UNIX_TIMESTAMP(NOW())
                    ),
                    actualizado_en = NOW()
                WHERE (last_media_type IS NULL OR TRIM(last_media_type) = '')
                  AND (
                        ultimo_mensaje IS NOT NULL
                     OR ultima_vez_visto IS NOT NULL
                     OR last_timestamp IS NOT NULL
                  )
                """
            )
            contacts_fixed_rows = cursor.rowcount

        conn.commit()
        print(f"Chats hidratados desde mensajes: {hydrated_rows}")
        print(f"Chats con last_media_type reparado a texto: {fixed_rows}")
        print(f"Contactos hidratados desde mensajes: {contacts_hydrated_rows}")
        print(f"Contactos con last_media_type reparado a texto: {contacts_fixed_rows}")
    except Exception:
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
