import os
import re
import mysql.connector
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

db_config = {}
main_path = os.path.join(os.path.dirname(__file__), '../main.py')

try:
    with open(main_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    match = re.search(r'db_config\s*=\s*\{([^}]+)\}', content)
    if match:
        block = match.group(1)
        for line in block.split('\n'):
            line = line.strip()
            if not line:
                continue
            key_match = re.match(r'"([^"]+)"\s*:\s*(.+),?', line)
            if key_match:
                key = key_match.group(1)
                val_expr = key_match.group(2).rstrip(',')
                if 'os.getenv' in val_expr:
                    env_match = re.search(r'os\.getenv\("([^"]+)"\s*(?:,\s*"([^"]*)")?\)', val_expr)
                    if env_match:
                        env_key = env_match.group(1)
                        env_default = env_match.group(2) or ""
                        db_config[key] = os.getenv(env_key, env_default)
                elif 'int(' in val_expr:
                    env_match = re.search(r'int\(os\.getenv\("([^"]+)"\s*(?:,\s*"([^"]*)")?\)\)', val_expr)
                    if env_match:
                        env_key = env_match.group(1)
                        env_default = env_match.group(2) or "3306"
                        db_config[key] = int(os.getenv(env_key, env_default))
                    else:
                        db_config[key] = 3306
                else:
                    val_literal = val_expr.strip('"\'')
                    db_config[key] = val_literal
except Exception as e:
    print(f"No se pudo extraer db_config: {e}")

if not db_config:
    db_config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "database": os.getenv("DB_NAME", "funnelchat_dev"),
        "charset": "utf8mb4",
    }

try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor()
    
    print("Reparando base de datos...")
    
    # 1. Verificar si existe el índice unique_lid
    cursor.execute("""
        SHOW INDEX FROM contactos WHERE Key_name = 'unique_lid'
    """)
    if cursor.fetchone():
        print("Eliminando la restricción de clave única 'unique_lid'...")
        cursor.execute("ALTER TABLE contactos DROP INDEX unique_lid")
        conn.commit()
        print("Restricción eliminada exitosamente.")
    else:
        print("La restricción 'unique_lid' ya había sido eliminada o no existe.")
        
    # 2. Agregar un índice regular para mantener el rendimiento al buscar por lid
    cursor.execute("""
        SHOW INDEX FROM contactos WHERE Key_name = 'idx_contactos_lid'
    """)
    if not cursor.fetchone():
        print("Creando índice normal 'idx_contactos_lid'...")
        cursor.execute("ALTER TABLE contactos ADD INDEX idx_contactos_lid (lid)")
        conn.commit()
        print("Índice normal creado con éxito.")
    else:
        print("El índice normal 'idx_contactos_lid' ya existe.")
        
    cursor.close()
    conn.close()
    print("\n¡Base de datos reparada con éxito!")
    
except Exception as err:
    print(f"ERROR: {err}")
