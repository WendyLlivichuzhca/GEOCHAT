import mysql.connector
import os
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def limpiar_nombres_genericos():
    try:
        conn = mysql.connector.connect(
            host=os.getenv("DB_HOST", "localhost"),
            user=os.getenv("DB_USER", "root"),
            password=os.getenv("DB_PASSWORD", ""),
            database=os.getenv("DB_NAME", "funnelchat_dev")
        )
        cursor = conn.cursor()

        print("🧹 Iniciando limpieza de nombres de grupos genéricos...")

        # 1. Limpiar en la tabla 'grupos'
        cursor.execute("""
            UPDATE grupos 
            SET nombre = NULL 
            WHERE nombre LIKE 'Grupo %' 
               OR nombre REGEXP '^[0-9]+$'
               OR nombre = jid
        """)
        grupos_afectados = cursor.rowcount
        
        # 2. Limpiar en la tabla 'chats'
        cursor.execute("""
            UPDATE chats 
            SET nombre = NULL 
            WHERE tipo = 'grupo'
              AND (nombre LIKE 'Grupo %' 
                   OR nombre REGEXP '^[0-9]+$'
                   OR nombre = jid)
        """)
        chats_afectados = cursor.rowcount

        conn.commit()
        print(f"✅ Limpieza completada.")
        print(f"📊 Grupos limpiados: {grupos_afectados}")
        print(f"📊 Chats limpiados: {chats_afectados}")
        print("\n💡 Ahora, cuando llegue un mensaje nuevo a esos grupos, el sistema intentará capturar el nombre real.")

    except Exception as e:
        print(f"❌ Error durante la limpieza: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    limpiar_nombres_genericos()
