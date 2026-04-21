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
        
        # Split script by DELIMITER if present, otherwise by semicolon
        # This is a very basic parser
        if 'DELIMITER //' in sql_script:
            parts = sql_script.split('DELIMITER //')
            for part in parts:
                part = part.replace('DELIMITER ;', '').strip()
                if not part: continue
                # Handle the procedures
                if 'CREATE PROCEDURE' in part:
                    # We assume the procedure and the CALL/DROP are in separate parts or handled
                    subparts = part.split('//')
                    for sub in subparts:
                        sub = sub.strip()
                        if sub:
                            try:
                                cursor.execute(sub)
                            except Exception as e:
                                print(f"Error in subpart: {e}")
                else:
                    for cmd in part.split(';'):
                        if cmd.strip():
                            cursor.execute(cmd)
        else:
            commands = sql_script.split(';')
            for command in commands:
                if command.strip():
                    cursor.execute(command)
        
        conn.commit()
        print(f"SQL script {filename} executed successfully.")
        
    except Exception as e:
        print(f"Failed to execute SQL script: {e}")
    finally:
        if 'conn' in locals() and conn.is_connected():
            cursor.close()
            conn.close()

if __name__ == "__main__":
    script_path = os.path.join("sql", "update_identity_schema.sql")
    run_sql_script(script_path)
