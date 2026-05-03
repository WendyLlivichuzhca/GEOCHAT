import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def eliminar_duplicados_grupos():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "funnelchat_dev")
        )
        cursor = conn.cursor()

        print("--- Eliminando duplicados en la tabla 'grupos' ---")
        # Mantener el ID más bajo para cada combinación de dispositivo_id y jid
        cursor.execute("""
            DELETE t1 FROM grupos t1
            INNER JOIN grupos t2 
            WHERE t1.id > t2.id 
              AND t1.dispositivo_id = t2.dispositivo_id 
              AND t1.jid = t2.jid
        """)
        grupos_borrados = cursor.rowcount

        print("--- Eliminando duplicados en la tabla 'chats' ---")
        # Mantener el ID más bajo para cada combinación de dispositivo_id y jid
        cursor.execute("""
            DELETE t1 FROM chats t1
            INNER JOIN chats t2 
            WHERE t1.id > t2.id 
              AND t1.dispositivo_id = t2.dispositivo_id 
              AND t1.jid = t2.jid
        """)
        chats_borrados = cursor.rowcount

        conn.commit()
        print(f"Hecho! Se eliminaron {grupos_borrados} grupos duplicados y {chats_borrados} chats duplicados.")

    except Exception as e:
        print(f"Error al limpiar duplicados: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    eliminar_duplicados_grupos()
