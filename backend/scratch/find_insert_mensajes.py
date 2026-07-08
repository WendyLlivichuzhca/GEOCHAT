import os

main_path = os.path.join(os.path.dirname(__file__), '../main.py')

with open(main_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print("Buscando INSERT INTO mensajes en main.py:")
for i, line in enumerate(lines):
    if 'INSERT INTO mensajes' in line or 'INSERT INTO  mensajes' in line or 'insert into mensajes' in line.lower():
        print(f"Línea {i+1}: {line.strip()}")
        # Imprimir las siguientes 25 líneas
        for idx in range(i+1, min(len(lines), i+35)):
            print(f"  {idx+1}: {lines[idx].rstrip()}")
        print("-" * 50)
