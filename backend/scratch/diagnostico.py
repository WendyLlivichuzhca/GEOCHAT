import logging
import os
import sys
import mysql.connector

# Cargar configuración desde main.py
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
try:
    from main import get_connection
    print("Conectando a la base de datos...")
    conn = get_connection()
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
    print(f"ERROR GENERAL: {err}")
