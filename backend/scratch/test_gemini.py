import os
import requests
import json
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"), override=True)

gemini_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")
print("Gemini Key:", gemini_key[:10] + "..." if gemini_key else "None")

payload = {
    "contents": [
        {
            "parts": [{"text": "Hola, responde con la palabra 'OK'."}]
        }
    ],
    "generationConfig": {
        "temperature": 0.3,
        "maxOutputTokens": 10
    }
}
api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={gemini_key}"

try:
    print("Enviando petición a Gemini...")
    r = requests.post(api_url, json=payload, timeout=15)
    print("Status Code:", r.status_code)
    print("Response:", r.text)
except Exception as e:
    print("Error:", e)
