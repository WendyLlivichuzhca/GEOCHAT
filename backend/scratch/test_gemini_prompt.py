import os
import requests
import json
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"), override=True)

gemini_key = os.getenv("GOOGLE_API_KEY") or os.getenv("GEMINI_API_KEY")
print("Using Gemini Key:", gemini_key[:10] + "...")

# Leer el último prompt registrado
prompt_path = os.path.join(BASE_DIR, "last_prompt.txt")
if not os.path.exists(prompt_path):
    print(f"Error: No se encontró el archivo {prompt_path}")
    exit(1)

with open(prompt_path, "r", encoding="utf-8") as f:
    prompt_content = f.read()

# Limpiar label si existe
if prompt_content.startswith("--- LABEL:"):
    lines = prompt_content.splitlines()
    prompt_content = "\n".join(lines[1:])

payload = {
    "contents": [
        {
            "parts": [{"text": prompt_content}]
        }
    ],
    "generationConfig": {
        "temperature": 0.3,
        "maxOutputTokens": 2048
    }
}

# Probamos con gemini-2.5-flash y gemini-2.0-flash para comparar
for model in ["gemini-2.5-flash", "gemini-2.0-flash"]:
    print(f"\n=== PROBANDO MODELO: {model} ===")
    api_url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={gemini_key}"
    try:
        r = requests.post(api_url, json=payload, timeout=20)
        print("Status Code:", r.status_code)
        if r.status_code == 200:
            res_json = r.json()
            print("Response JSON:")
            print(json.dumps(res_json, indent=2, ensure_ascii=False))
        else:
            print("Error Response:", r.text)
    except Exception as e:
        print(f"Error llamando a {model}: {e}")
