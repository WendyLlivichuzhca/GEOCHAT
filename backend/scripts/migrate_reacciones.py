import os
import sys

# Agregar el directorio padre (backend) al path de Python para poder importar main
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from dotenv import load_dotenv
load_dotenv()

import main

def migrate():
    print("Iniciando migración para agregar columna 'reaccion' a la tabla 'mensajes'...")
    conn = None
    cursor = None
    try:
        conn = main.get_connection()
        cursor = conn.cursor()
        
        # Verificar si la columna ya existe
        cursor.execute("SHOW COLUMNS FROM mensajes LIKE 'reaccion'")
        column_exists = cursor.fetchone()
        
        if column_exists:
            print("La columna 'reaccion' ya existe en la tabla 'mensajes'.")
        else:
            print("Agregando la columna 'reaccion'...")
            cursor.execute("ALTER TABLE mensajes ADD COLUMN reaccion VARCHAR(10) NULL AFTER push_name")
            conn.commit()
            print("Columna 'reaccion' agregada exitosamente.")
            
    except Exception as e:
        print(f"Error durante la migración: {e}")
        if conn:
            conn.rollback()
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()
        print("Proceso finalizado.")

if __name__ == "__main__":
    migrate()
