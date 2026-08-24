"""
Paso 2 de la migracion de vuelta a almacenamiento local: escanea TODAS las
columnas de texto de TODAS las tablas de la base de datos buscando
referencias a la URL publica de Cloudflare R2, y reporta cuantas filas las
tienen. Es de SOLO LECTURA — no modifica nada.

Uso:
    python3 scan_r2_references.py
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
except ImportError:
    pass

import mysql.connector

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "funnelchat_dev"),
    "charset": "utf8mb4",
}

r2_public_url = os.getenv("R2_PUBLIC_URL", "").rstrip("/")
if not r2_public_url:
    print("ERROR: R2_PUBLIC_URL no esta configurado en .env. Abortando.")
    sys.exit(1)

conn = mysql.connector.connect(**db_config)
cursor = conn.cursor(dictionary=True)

cursor.execute("""
    SELECT TABLE_NAME, COLUMN_NAME
    FROM information_schema.COLUMNS
    WHERE TABLE_SCHEMA = %s
      AND DATA_TYPE IN ('varchar', 'text', 'longtext', 'mediumtext', 'char')
    ORDER BY TABLE_NAME, ORDINAL_POSITION
""", (db_config["database"],))
columns = cursor.fetchall()

print(f"Buscando '{r2_public_url}' en {len(columns)} columnas de texto de la base de datos '{db_config['database']}' ...\n")

found_any = False
for col in columns:
    table = col["TABLE_NAME"]
    column = col["COLUMN_NAME"]
    try:
        cursor.execute(
            f"SELECT COUNT(*) as cnt FROM `{table}` WHERE `{column}` LIKE %s",
            (f"%{r2_public_url}%",),
        )
        result = cursor.fetchone()
        count = result["cnt"] if result else 0
        if count > 0:
            found_any = True
            print(f"  {table}.{column}: {count} fila(s) con referencia a R2")
    except Exception as e:
        print(f"  (omitido {table}.{column}: {e})")

cursor.close()
conn.close()

print("")
if found_any:
    print("Se encontraron referencias a R2 en las tablas de arriba. El siguiente paso las corrige.")
else:
    print("No se encontro ninguna referencia a R2 en la base de datos. Ya se puede pasar directo a la verificacion final.")
