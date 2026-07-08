import os

chats_path = os.path.join(os.path.dirname(__file__), '../../frontend/src/components/Chats.jsx')

with open(chats_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print("Buscando rol / user / perfil en Chats.jsx:")
for i, line in enumerate(lines):
    lower_line = line.lower()
    if 'rol' in lower_line or 'role' in lower_line or 'perfil' in lower_line or 'user' in lower_line:
        # Imprimir sólo líneas interesantes
        if any(keyword in lower_line for keyword in ['role', 'rol', 'user_id', 'parent_id', 'admin']):
            print(f"Línea {i+1}: {line.strip()}")
