import mysql.connector
import os
from dotenv import load_dotenv

load_dotenv()

def revisar_datos_grupos():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "funnelchat_dev")
        )
        cursor = conn.cursor(dictionary=True)

        print("\n--- 📝 REVISANDO TABLA 'GRUPOS' ---")
        cursor.execute("SELECT id, jid, nombre FROM grupos LIMIT 5")
        for row in cursor.fetchall():
            print(f"ID: {row['id']} | JID: {row['jid']} | Nombre: '{row['nombre']}'")

        print("\n--- 📝 REVISANDO TABLA 'CHATS' (solo grupos) ---")
        cursor.execute("SELECT id, jid, nombre FROM chats WHERE tipo = 'grupo' LIMIT 5")
        for row in cursor.fetchall():
            print(f"ID: {row['id']} | JID: {row['jid']} | Nombre: '{row['nombre']}'")

    except Exception as e:
        print(f"❌ Error: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    revisar_datos_grupos()
