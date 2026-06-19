import os
import mysql.connector
from dotenv import load_dotenv

# Cargar archivo .env del directorio backend
backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
env_path = os.path.join(backend_dir, '.env')
if os.path.exists(env_path):
    load_dotenv(env_path)
else:
    load_dotenv()

def add_column_if_not_exists(cursor, table, column, definition):
    cursor.execute(f"SHOW COLUMNS FROM {table} LIKE '{column}'")
    if cursor.fetchone():
        print(f"La columna '{column}' ya existe en la tabla '{table}'.")
    else:
        print(f"Agregando la columna '{column}' a la tabla '{table}'...")
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {column} {definition}")
        print(f"Columna '{column}' agregada exitosamente.")

def migrate():
    print("Iniciando migración para agregar nuevas columnas a la base de datos de GeoCHAT...")
    conn = None
    cursor = None
    try:
        db_config = {
            "host": os.getenv("DB_HOST", "localhost"),
            "port": int(os.getenv("DB_PORT", "3306")),
            "user": os.getenv("DB_USER", "root"),
            "password": os.getenv("DB_PASSWORD", ""),
            "database": os.getenv("DB_NAME", "funnelchat_dev"),
            "charset": "utf8mb4",
            "collation": "utf8mb4_unicode_ci",
        }
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        # Columnas para tabla mensajes
        add_column_if_not_exists(cursor, "mensajes", "reaccion", "VARCHAR(10) NULL AFTER push_name")
        add_column_if_not_exists(cursor, "mensajes", "destacado", "TINYINT(1) DEFAULT 0 AFTER reaccion")
        add_column_if_not_exists(cursor, "mensajes", "fijado", "TINYINT(1) DEFAULT 0 AFTER destacado")
        add_column_if_not_exists(cursor, "mensajes", "quoted_message_id", "VARCHAR(255) NULL AFTER fijado")
        add_column_if_not_exists(cursor, "mensajes", "quoted_text", "TEXT NULL AFTER quoted_message_id")
        add_column_if_not_exists(cursor, "mensajes", "quoted_participant", "VARCHAR(255) NULL AFTER quoted_text")
        add_column_if_not_exists(cursor, "mensajes", "quoted_from_me", "TINYINT(1) DEFAULT 0 AFTER quoted_participant")
        
        # Columnas para tabla contactos
        add_column_if_not_exists(cursor, "contactos", "reportado", "TINYINT(1) DEFAULT 0 AFTER foto_perfil")
        
        conn.commit()
        print("Migración completada exitosamente.")
            
    except Exception as e:
        print(f"Error durante la migración: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("Proceso finalizado.")

if __name__ == "__main__":
    migrate()
