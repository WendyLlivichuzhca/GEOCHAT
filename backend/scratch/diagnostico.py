import os
import re
import mysql.connector
from dotenv import load_dotenv

# Cargar dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '../.env'))

# Leer main.py para extraer la configuración de la base de datos sin importar Flask
db_config = {}
main_path = os.path.join(os.path.dirname(__file__), '../main.py')

try:
    with open(main_path, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Buscar el bloque db_config usando regex
    match = re.search(r'db_config\s*=\s*\{([^}]+)\}', content)
    if match:
        block = match.group(1)
        # Reemplazar llamadas a os.getenv
        for line in block.split('\n'):
            line = line.strip()
            if not line:
                continue
            key_match = re.match(r'"([^"]+)"\s*:\s*(.+),?', line)
            if key_match:
                key = key_match.group(1)
                val_expr = key_match.group(2).rstrip(',')
                
                # Evaluar la expresión de manera segura
                if 'os.getenv' in val_expr:
                    # Extraer argumentos de os.getenv
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
                    # Valor literal
                    val_literal = val_expr.strip('"\'')
                    db_config[key] = val_literal
except Exception as e:
    print(f"No se pudo extraer db_config de main.py: {e}")

# Valores por defecto si falla la extracción
if not db_config:
    db_config = {
        "host": os.getenv("DB_HOST", "localhost"),
        "port": int(os.getenv("DB_PORT", "3306")),
        "user": os.getenv("DB_USER", "root"),
        "password": os.getenv("DB_PASSWORD", ""),
        "database": os.getenv("DB_NAME", "funnelchat_dev"),
        "charset": "utf8mb4",
    }

print(f"Configuración de base de datos extraída: Host={db_config.get('host')}, User={db_config.get('user')}, DB={db_config.get('database')}")

try:
    print("Conectando a la base de datos...")
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    
    print("Verificando columnas de la tabla 'mensajes'...")
    cursor.execute("SHOW COLUMNS FROM mensajes")
    columns = [row['Field'] for row in cursor.fetchall()]
    print(f"Columnas encontradas: {columns}")
    
    if 'agente_nombre' not in columns:
        print("La columna 'agente_nombre' NO existe. Intentando agregarla...")
        try:
            cursor.execute("ALTER TABLE mensajes ADD COLUMN agente_nombre VARCHAR(100) DEFAULT NULL")
            conn.commit()
            print("¡Columna 'agente_nombre' agregada con éxito!")
        except Exception as alter_err:
            print(f"ERROR al ejecutar ALTER TABLE: {alter_err}")
    else:
        print("La columna 'agente_nombre' ya existe.")
        
    cursor.close()
    conn.close()
except Exception as err:
    print(f"ERROR GENERAL DE CONEXIÓN: {err}")
