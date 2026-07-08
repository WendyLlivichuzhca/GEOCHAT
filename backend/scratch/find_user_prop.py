import os

chats_path = os.path.join(os.path.dirname(__file__), '../../frontend/src/components/Chats.jsx')

with open(chats_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print("Buscando definición de Chats en todo Chats.jsx:")
for i, line in enumerate(lines):
    if 'function Chats' in line or 'export default' in line:
        safe_line = line.strip().encode('ascii', 'replace').decode('ascii')
        print(f"Línea {i+1}: {safe_line}")
