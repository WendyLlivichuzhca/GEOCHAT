import os

main_path = os.path.join(os.path.dirname(__file__), '../main.py')

with open(main_path, 'r', encoding='utf-8', errors='ignore') as f:
    lines = f.readlines()

print("Buscando inserciones en persist_webhook_message (líneas 2900-3150):")
for i in range(2880, min(len(lines), 3120)):
    line = lines[i].strip()
    if 'insert' in line.lower() or 'update' in line.lower():
        print(f"Línea {i+1}: {line}")
        # Imprimir un bloque de 10 líneas
        for idx in range(i+1, min(len(lines), i+15)):
            print(f"  {idx+1}: {lines[idx].rstrip()}")
        print("-" * 50)
