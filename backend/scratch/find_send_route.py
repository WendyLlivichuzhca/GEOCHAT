import os

bridge_path = os.path.join(os.path.dirname(__file__), '../whatsapp-bridge/bridge.js')

with open(bridge_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print("Buscando rutas POST en bridge.js:")
for i, line in enumerate(lines):
    if 'app.post' in line or 'router.post' in line or '/send' in line:
        safe_line = line.strip().encode('ascii', 'replace').decode('ascii')
        print(f"Línea {i+1}: {safe_line}")
