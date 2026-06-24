import os
from main import get_connection

conn = get_connection()
cursor = conn.cursor(dictionary=True)

cursor.execute("SELECT id, numero_telefono, estado FROM dispositivos;")
devices = cursor.fetchall()
print("--- DISPOSITIVOS ---")
for d in devices:
    print(d)

cursor.execute("SELECT id, nombre, estado_sync, dispositivo_id, grupo_origen_id FROM grupos_modulo LIMIT 5;")
groups = cursor.fetchall()
print("\n--- GRUPOS MODULO ---")
for g in groups:
    print(g)

if groups:
    gid = groups[0]['grupo_origen_id']
    if gid:
        cursor.execute("SELECT id, jid, telefono, rol FROM participantes_grupo WHERE grupo_id = %s LIMIT 10;", (gid,))
        parts = cursor.fetchall()
        print("\n--- PARTICIPANTES PARA GRUPO", gid, "---")
        for p in parts:
            print(p)

cursor.close()
conn.close()
