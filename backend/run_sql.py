import mysql.connector
import os
import sys

db_config = {
    "host": os.getenv("DB_HOST", "localhost"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", ""),
    "database": os.getenv("DB_NAME", "funnelchat_dev"),
}

def run_sql_script(filename):
    if not os.path.exists(filename):
        print(f"File not found: {filename}")
        return

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor()
        
        with open(filename, 'r', encoding='utf-8') as f:
            sql_script = f.read()
        
        # Split script into individual commands by semicolon, but handle multi-line strings
        # This is a bit naive but works for these scripts
        import re
        commands = re.split(r';\s*\n', sql_script)
        
        for command in commands:
            if command.strip():
                try:
                    cursor.execute(command)
                except mysql.connector.Error as e:
                    print(f"Error executing command: {command[:50]}... \nError: {e}")
        
        conn.commit()
        print(f"SQL script {filename} executed successfully.")
        
    except Exception as e:
        print(f"Failed to execute SQL script: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    if len(sys.argv) > 1:
        run_sql_script(sys.argv[1])
    else:
        print("Usage: python run_sql.py <filename>")
