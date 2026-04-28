import mysql.connector
import json
import os

# Configuración de conexión (ajustada a tu sistema)
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',
    'database': 'funnelchat_dev'
}

def clean_group_names():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        print("🔍 Buscando grupos con nombres genéricos...")
        
        # 1. Buscar contactos que sean grupos (@g.us) y tengan nombres genéricos
        query = """
            UPDATE contactos 
            SET nombre = 'Sincronizando grupo...' 
            WHERE jid LIKE '%@g.us' 
            AND (nombre = 'Grupo de WhatsApp' OR nombre IS NULL OR nombre = '')
        """
        cursor.execute(query)
        affected = cursor.rowcount
        conn.commit()
        
        print(f"✅ Se han marcado {affected} grupos para actualización automática.")
        print("💡 Los nombres reales aparecerán en cuanto lleguen nuevos mensajes o se reinicie el bridge.")
        
    except Exception as e:
        print(f"❌ Error durante la limpieza: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    clean_group_names()
