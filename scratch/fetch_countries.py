import urllib.request
import json
import os

url = "https://restcountries.com/v3.1/all?fields=name,translations,cca2,idd,flag"
req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})

try:
    with urllib.request.urlopen(req) as response:
        resp_text = response.read().decode()
        countries_data = json.loads(resp_text)
except Exception as e:
    print("Error fetching countries:", e)
    countries_data = []

if isinstance(countries_data, dict):
    print("API returned a dict, probably error:", countries_data)
    countries_data = []

formatted_countries = []

for c in countries_data:
    if not isinstance(c, dict):
        continue
    # 1. Nombre en español (si existe)
    name_spa = c.get("translations", {}).get("spa", {}).get("common")
    name = name_spa if name_spa else c.get("name", {}).get("common", "")
    
    # 2. Código de país
    code = c.get("cca2", "")
    
    # 3. Bandera (emoji)
    flag = c.get("flag", "")
    
    # 4. Prefijo telefónico
    idd = c.get("idd", {})
    root = idd.get("root", "")
    suffixes = idd.get("suffixes", [])
    
    prefix = ""
    if root:
        clean_root = root.replace("+", "")
        if len(suffixes) == 1:
            prefix = f"{clean_root}{suffixes[0]}"
        elif len(suffixes) > 1:
            prefix = clean_root
        else:
            prefix = clean_root
            
    if name and code and flag and prefix:
        formatted_countries.append({
            "name": name,
            "code": code,
            "prefix": prefix,
            "flag": flag
        })

# Ordenar alfabéticamente
formatted_countries.sort(key=lambda x: x["name"])

# Escribir archivo JS
js_content = "export const countriesList = [\n"
for c in formatted_countries:
    js_content += f"  {{ name: {json.dumps(c['name'], ensure_ascii=False)}, code: '{c['code']}', prefix: '{c['prefix']}', flag: '{c['flag']}' }},\n"
js_content += "];\n"

os.makedirs("../frontend/src/utils", exist_ok=True)
output_path = "../frontend/src/utils/countries.js"
with open(output_path, "w", encoding="utf-8") as f:
    f.write(js_content)

print(f"Base de datos de países creada con éxito en {output_path}. Total países: {len(formatted_countries)}")
