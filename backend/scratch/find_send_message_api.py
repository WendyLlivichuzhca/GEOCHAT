import os

chats_path = os.path.join(os.path.dirname(__file__), '../../frontend/src/components/Chats.jsx')

with open(chats_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print("Buscando llamadas a messages en Chats.jsx:")
for i, line in enumerate(lines):
    if '/messages' in line or 'fetch(' in line and 'messages' in line:
        safe_line = line.strip().encode('ascii', 'replace').decode('ascii')
        print(f"Línea {i+1}: {safe_line}")
