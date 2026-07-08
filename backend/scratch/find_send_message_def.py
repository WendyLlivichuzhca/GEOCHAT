import os

bridge_path = os.path.join(os.path.dirname(__file__), '../whatsapp-bridge/bridge.js')

with open(bridge_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print("Buscando sendMessage en todo bridge.js:")
for i, line in enumerate(lines):
    if 'sendMessage' in line and ('const' in line or 'let' in line or 'function' in line or 'async' in line):
        safe_line = line.strip().encode('ascii', 'replace').decode('ascii')
        print(f"Línea {i+1}: {safe_line}")
