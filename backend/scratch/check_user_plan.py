# backend/scratch/check_user_plan.py
import os
import sys
import mysql.connector

# Ensure we can load dotenv
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.append(BASE_DIR)

try:
    from dotenv import load_dotenv
    load_dotenv(os.path.join(BASE_DIR, ".env"), override=True)
except Exception as e:
    print("Could not load dotenv:", e)

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "funnelchat_dev"),
    "charset": "utf8mb4",
    "collation": "utf8mb4_unicode_ci",
}

print("Connecting to database:", db_config["database"], "at", db_config["host"])
try:
    conn = mysql.connector.connect(**db_config)
    cursor = conn.cursor(dictionary=True)
    
    # 1. Inspect all plans
    print("\n--- PLANES EN LA BASE DE DATOS ---")
    cursor.execute("SELECT id, nombre, precio_mensual, max_accesos_multiagente, max_dispositivos, max_contactos FROM planes")
    planes = cursor.fetchall()
    for p in planes:
        print(f"ID: {p['id']} | Nombre: {p['nombre']} | Precio: ${p['precio_mensual']} | Max Accesos: {p['max_accesos_multiagente']} | Max Dispositivos: {p['max_dispositivos']} | Max MACs: {p['max_contactos']}")

    # 2. Inspect all users
    print("\n--- USUARIOS REGISTRADOS ---")
    cursor.execute("SELECT id, nombre, correo, rol, parent_id FROM usuarios LIMIT 20")
    usuarios = cursor.fetchall()
    for u in usuarios:
        print(f"ID: {u['id']} | Nombre: {u['nombre']} | Correo: {u['correo']} | Rol: {u['rol']} | Parent ID: {u['parent_id']}")

    # 3. Inspect active subscriptions
    print("\n--- SUSCRIPCIONES ACTIVAS ---")
    cursor.execute("""
        SELECT s.id AS sub_id, s.usuario_id, u.correo AS usuario_correo, s.plan_id, p.nombre AS plan_nombre, s.estado, s.fecha_vencimiento
        FROM suscripciones s
        LEFT JOIN usuarios u ON u.id = s.usuario_id
        LEFT JOIN planes p ON p.id = s.plan_id
    """)
    subs = cursor.fetchall()
    if not subs:
        print("No se encontraron suscripciones en la base de datos.")
    for s in subs:
        print(f"Sub ID: {s['sub_id']} | User ID: {s['usuario_id']} ({s['usuario_correo']}) | Plan: {s['plan_nombre']} (ID: {s['plan_id']}) | Estado: {s['estado']} | Vence: {s['fecha_vencimiento']}")

    cursor.close()
    conn.close()
except Exception as e:
    print("Database error:", e)
