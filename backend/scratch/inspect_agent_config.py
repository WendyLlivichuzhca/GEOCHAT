import os
import mysql.connector
import json
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from main import db_config

def get_connection():
    return mysql.connector.connect(**db_config)

try:
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, config_comportamiento, reglas_transferencia FROM agentes_ia WHERE id = 15")
    agent = cursor.fetchone()
    print("Agent ID:", agent["id"])
    print("Agent Name:", agent["nombre"])
    config = json.loads(agent["config_comportamiento"])
    print("Config comportamiento:")
    for k, v in config.items():
        print(f"  {k}: {v}")
    cursor.close()
    conn.close()
except Exception as e:
    print("Error:", e)
