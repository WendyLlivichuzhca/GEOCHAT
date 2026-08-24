"""
Paso 3 de la migracion de vuelta a almacenamiento local: reescribe, en la
base de datos, cualquier URL que apunte a Cloudflare R2 para que en su
lugar apunte a la ruta local /media/... (servida por el propio backend,
que ya tiene el archivo real gracias al paso 1 de descarga).

Cubre las columnas encontradas por scan_r2_references.py:
  - contactos.foto_perfil
  - usuarios.foto_perfil
  - mensajes.url_media
  - automatizaciones.nodos (columna JSON en texto: se reemplaza la URL
    dentro del texto, sin tocar la estructura del JSON)

Es seguro re-ejecutar: si ya no quedan filas con la URL de R2, no hace nada.

Uso:
    python3 fix_r2_urls_to_local.py
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


def fix_simple_column(table, column, pk="id"):
    cursor.execute(
        f"SELECT `{pk}`, `{column}` FROM `{table}` WHERE `{column}` LIKE %s",
        (f"%{r2_public_url}%",),
    )
    rows = cursor.fetchall()
    if not rows:
        print(f"  {table}.{column}: nada que corregir.")
        return

    print(f"  {table}.{column}: corrigiendo {len(rows)} fila(s)...")
    print(f"    Ejemplo antes:  {rows[0][column]}")
    fixed = 0
    for row in rows:
        old_val = row[column] or ""
        new_val = old_val.replace(r2_public_url, "/media")
        cursor.execute(
            f"UPDATE `{table}` SET `{column}` = %s WHERE `{pk}` = %s",
            (new_val, row[pk]),
        )
        fixed += 1
    conn.commit()
    print(f"    Ejemplo despues: {rows[0][column].replace(r2_public_url, '/media')}")
    print(f"    {fixed} fila(s) corregidas y guardadas.")


print(f"Reemplazando '{r2_public_url}' por '/media' en la base de datos '{db_config['database']}' ...\n")

fix_simple_column("contactos", "foto_perfil")
fix_simple_column("usuarios", "foto_perfil")
fix_simple_column("mensajes", "url_media")
fix_simple_column("automatizaciones", "nodos")

cursor.close()
conn.close()

print("\nListo. Corre scan_r2_references.py de nuevo para confirmar que ya no queda ninguna referencia a R2.")
