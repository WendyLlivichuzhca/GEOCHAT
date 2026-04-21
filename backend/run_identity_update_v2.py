import mysql.connector
import os

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "funnelchat_dev"),
}

def run_commands():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        commands = [
            # Añadir columna estado
            "ALTER TABLE contactos ADD COLUMN estado text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER push_name",
            # Modificar columnas foto_perfil
            "ALTER TABLE contactos MODIFY COLUMN foto_perfil text COLLATE utf8mb4_unicode_ci",
            "ALTER TABLE grupos MODIFY COLUMN foto_perfil text COLLATE utf8mb4_unicode_ci",
            "ALTER TABLE chats MODIFY COLUMN foto_perfil text COLLATE utf8mb4_unicode_ci",
        ]
        
        for cmd in commands:
            try:
                cursor.execute(cmd)
                print(f"Executed: {cmd[:50]}...")
            except mysql.connector.Error as e:
                if e.errno == 1060: # Column already exists
                    print(f"Column already exists, skipping: {cmd[:50]}...")
                elif e.errno == 1061: # Duplicate key name 
                     print(f"Index already exists, skipping: {cmd[:50]}...")
                else:
                    print(f"Error executing {cmd[:50]}...: {e}")
        
        conn.commit()
        print("SQL updates completed.")
        
    except Exception as e:
        print(f"Failed to execute SQL updates: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    run_commands()
