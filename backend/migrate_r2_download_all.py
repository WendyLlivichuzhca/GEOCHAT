"""
Paso 1 de la migracion de vuelta a almacenamiento local: descarga TODOS los
objetos del bucket de Cloudflare R2 al disco local del servidor, dentro de
MEDIA_FOLDER, respetando la misma ruta relativa que tienen en R2 (que es la
misma ruta que usarian localmente bajo /media/...).

Es seguro re-ejecutar: si un archivo ya existe localmente con el mismo
tamano que en R2, se omite. No borra ni modifica nada en R2 ni en la base
de datos — solo agrega archivos al disco local.

Uso:
    python3 migrate_r2_download_all.py
"""
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
except ImportError:
    pass

import boto3
from botocore.config import Config

MEDIA_FOLDER = os.path.join(BASE_DIR, "media")

bucket_name = os.getenv("R2_BUCKET_NAME")
if not bucket_name:
    print("ERROR: R2_BUCKET_NAME no esta configurado en .env. Abortando.")
    sys.exit(1)

r2_client = boto3.client(
    "s3",
    endpoint_url=os.getenv("R2_ENDPOINT_URL"),
    aws_access_key_id=os.getenv("R2_ACCESS_KEY_ID"),
    aws_secret_access_key=os.getenv("R2_SECRET_ACCESS_KEY"),
    region_name="auto",
    config=Config(signature_version="s3v4"),
)

print(f"Descargando bucket '{bucket_name}' hacia {MEDIA_FOLDER} ...")

total = 0
downloaded = 0
skipped = 0
errors = 0

paginator = r2_client.get_paginator("list_objects_v2")
for page in paginator.paginate(Bucket=bucket_name):
    for obj in page.get("Contents", []):
        key = obj["Key"]
        remote_size = obj["Size"]
        total += 1

        local_path = os.path.join(MEDIA_FOLDER, *key.split("/"))

        if os.path.isfile(local_path) and os.path.getsize(local_path) == remote_size:
            skipped += 1
            continue

        try:
            os.makedirs(os.path.dirname(local_path), exist_ok=True)
            r2_client.download_file(bucket_name, key, local_path)
            downloaded += 1
            if downloaded % 50 == 0:
                print(f"  ... {downloaded} archivos descargados hasta ahora")
        except Exception as e:
            errors += 1
            print(f"  ERROR descargando '{key}': {e}")

print("")
print("Resumen:")
print(f"  Objetos totales en R2: {total}")
print(f"  Descargados ahora: {downloaded}")
print(f"  Ya existian localmente (omitidos): {skipped}")
print(f"  Errores: {errors}")
if errors == 0:
    print("\nListo. Todos los archivos de R2 ya existen tambien en el disco local.")
else:
    print("\nHubo errores — revisa los mensajes de arriba antes de continuar al siguiente paso.")
