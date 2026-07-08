import os
import glob

bridge_dir = os.path.join(os.path.dirname(__file__), '../whatsapp-bridge')
log_files = glob.glob(os.path.join(bridge_dir, 'bridge_device*.log'))

print("Buscando logs del puente en:", bridge_dir)
if not log_files:
    print("No se encontraron archivos bridge_device*.log")
else:
    # Ordenar por fecha de modificación
    log_files.sort(key=os.path.getmtime, reverse=True)
    for log_path in log_files[:3]:
        print(f"\n--- ÚLTIMAS 40 LÍNEAS DE LOG: {os.path.basename(log_path)} ---")
        try:
            with open(log_path, 'r', encoding='utf-8', errors='ignore') as f:
                lines = f.readlines()
                for line in lines[-40:]:
                    print(line.strip())
        except Exception as e:
            print(f"Error al leer {log_path}: {e}")
