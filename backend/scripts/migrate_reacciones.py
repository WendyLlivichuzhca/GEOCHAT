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

def migrate():
    print("Iniciando migración para agregar columna 'reaccion' a la tabla 'mensajes'...")
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
        
        # Verificar si la columna ya existe
        cursor.execute("SHOW COLUMNS FROM mensajes LIKE 'reaccion'")
        column_exists = cursor.fetchone()
        
        if column_exists:
            print("La columna 'reaccion' ya existe en la tabla 'mensajes'.")
        else:
            print("Agregando la columna 'reaccion'...")
            cursor.execute("ALTER TABLE mensajes ADD COLUMN reaccion VARCHAR(10) NULL AFTER push_name")
            conn.commit()
            print("Columna 'reaccion' agregada exitosamente.")
            
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
