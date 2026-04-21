import mysql.connector
import os

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "funnelchat_dev"),
}

def run_sql_script(filename):
    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        with open(filename, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        # Split script into individual commands
        # Note: very simple splitting, might not handle complex scripts with delimiters correctly
        commands = sql_script.split(';')
        
        for command in commands:
            if command.strip():
                try:
                    cursor.execute(command)
                except mysql.connector.Error as e:
                    print(f"Error executing command: {command[:50]}... \nError: {e}")
        
        conn.commit()
        print("SQL script executed successfully.")
        
    except Exception as e:
        print(f"Failed to execute SQL script: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    script_path = os.path.join("sql", "normalize_db.sql")
    run_sql_script(script_path)
