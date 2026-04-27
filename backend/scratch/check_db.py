
import mysql.connector
import os

db_config = {
    "host": "localhost",
    "user": "root",
    "password": "",
    "database": "funnelchat_dev",
}

def check_tables():
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        cursor.execute("SHOW TABLES")
        tables = cursor.fetchall()
        print("Tablas encontradas:")
        for table in tables:
            print(f"- {table[0]}")
        
        cursor.execute("DESCRIBE campos_customizados")
        print("\nEstructura de campos_customizados:")
        for col in cursor.fetchall():
            print(col)
            
    except Exception as e:
        print(f"Error: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            conn.close()

if __name__ == "__main__":
    check_tables()
