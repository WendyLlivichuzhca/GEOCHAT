import os
import sys

sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from main import app, get_connection

with app.app_context():
    print("Usuarios registrados en la base de datos:")
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id, nombre, correo, rol, parent_id FROM usuarios")
    for row in cursor.fetchall():
        print(f"ID: {row['id']} | Nombre: '{row['nombre']}' | Correo: '{row['correo']}' | Rol: '{row['rol']}' | Parent: {row['parent_id']}")
    cursor.close()
    conn.close()
