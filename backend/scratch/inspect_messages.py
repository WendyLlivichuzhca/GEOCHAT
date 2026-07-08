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
    cursor = conn.cursor(dictionary=True)
    
    print("\n--- ÚLTIMOS 15 MENSAJES DE LA TABLA 'mensajes' ---")
    cursor.execute("""
        SELECT id, mensaje_id, chat_jid, de_jid, es_mio, texto, fecha_mensaje, agente_nombre 
        FROM mensajes 
        ORDER BY id DESC LIMIT 15
    """)
    for row in cursor.fetchall():
        print(f"ID: {row['id']} | MsgID: {row['mensaje_id']} | Chat: {row['chat_jid']} | De: {row['de_jid']} | EsMio: {row['es_mio']} | Agente: {row['agente_nombre']} | Texto: '{row['texto']}' | Fecha: {row['fecha_mensaje']}")
        
    cursor.close()
    conn.close()
except Exception as err:
    print(f"ERROR: {err}")
