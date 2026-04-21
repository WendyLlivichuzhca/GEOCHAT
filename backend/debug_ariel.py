import mysql.connector
import os
import json

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "funnelchat_dev"),
}

def debug_ariel():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)
        
        print("--- CHATS for Ariel ---")
        cursor.execute("SELECT * FROM chats WHERE nombre LIKE '%Ariel%' OR jid LIKE '%593979832404%'")
        chats = cursor.fetchall()
        for chat in chats:
            print(json.dumps(chat, indent=2, default=str))

        print("\n--- CONTACTOS for Ariel ---")
        cursor.execute("SELECT * FROM contactos WHERE nombre LIKE '%Ariel%' OR jid LIKE '%593979832404%'")
        contacts = cursor.fetchall()
        for contact in contacts:
            print(json.dumps(contact, indent=2, default=str))

        print("\n--- MENSAJES COUNT for Ariel ---")
        for chat in chats:
            jid = chat['jid']
            cursor.execute("SELECT COUNT(*) as total FROM mensajes WHERE chat_jid = %s", (jid,))
            count = cursor.fetchone()
            print(f"JID: {jid} - Messages: {count['total']}")
            
            if count['total'] > 0:
                print("Latest messages:")
                cursor.execute("SELECT texto, fecha_mensaje FROM mensajes WHERE chat_jid = %s ORDER BY fecha_mensaje DESC LIMIT 3", (jid,))
                for m in cursor.fetchall():
                    print(f"  [{m['fecha_mensaje']}] {m['texto']}")

        conn.close()
    except Exception as e:
        print(f"Error debugging Ariel: {e}")

if __name__ == "__main__":
    debug_ariel()
