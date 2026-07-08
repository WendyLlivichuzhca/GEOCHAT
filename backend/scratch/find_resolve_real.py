import os

main_path = os.path.join(os.path.dirname(__file__), '../main.py')

with open(main_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print("Buscando resolve_real_user_id en main.py:")
for i, line in enumerate(lines):
    if 'resolve_real_user_id' in line:
        print(f"Línea {i+1}: {line.strip()}")
