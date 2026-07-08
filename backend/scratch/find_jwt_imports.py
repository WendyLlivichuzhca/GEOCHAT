import os

main_path = os.path.join(os.path.dirname(__file__), '../main.py')

with open(main_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print("Buscando jwt_required en main.py:")
for i, line in enumerate(lines):
    if 'jwt_required' in line:
        safe_line = line.strip().encode('ascii', 'replace').decode('ascii')
        print(f"Línea {i+1}: {safe_line}")
