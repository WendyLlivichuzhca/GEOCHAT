import os
import requests
import json
from dotenv import load_dotenv

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, "..", ".env"), override=True)

nvidia_key = os.getenv("NVIDIA_API_KEY")
print("NVIDIA Key:", nvidia_key[:10] + "..." if nvidia_key else "None")

model_name = "meta/llama-3.1-8b-instruct"
headers = {
    "Authorization": f"Bearer {nvidia_key}",
    "Content-Type": "application/json"
}
payload = {
    "model": model_name,
    "messages": [{"role": "user", "content": "Hola, responde con la palabra 'OK'."}],
    "max_tokens": 10,
    "temperature": 0.3
}

try:
    print("Enviando petición a NVIDIA NIM...")
    r = requests.post("https://integrate.api.nvidia.com/v1/chat/completions", json=payload, headers=headers, timeout=10)
    print("Status Code:", r.status_code)
    print("Response:", r.text)
except Exception as e:
    print("Error:", e)
