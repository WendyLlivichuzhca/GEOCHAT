import os
import glob

print("Buscando archivos de logs de PM2...")
home = os.path.expanduser("~")
pm2_log_dir = os.path.join(home, ".pm2", "logs")

log_files = glob.glob(os.path.join(pm2_log_dir, "geochat-backend-*.log"))
if not log_files:
    # Buscar en ubicaciones comunes o relativas
    print(f"No se encontraron logs en {pm2_log_dir}. Buscando alternativas...")
    # Intentar ver si hay logs locales o en carpetas de sistema
    log_files = glob.glob("/home/*/.pm2/logs/geochat-backend-*.log")

if log_files:
    for log_path in log_files:
        print(f"\n--- Leyendo últimas 40 líneas de: {log_path} ---")
        try:
            with open(log_path, "r", encoding="utf-8", errors="ignore") as f:
                lines = f.readlines()
                for line in lines[-40:]:
                    print(line.strip())
        except Exception as e:
            print(f"Error al leer {log_path}: {e}")
else:
    print("No se encontró ningún archivo de logs de PM2 para 'geochat-backend'.")
