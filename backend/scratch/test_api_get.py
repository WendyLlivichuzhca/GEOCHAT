import os
import sys

# Agregar ruta backend al path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

import requests
import json

os.environ["FLASK_DEBUG"] = "0"
os.environ["JWT_SECRET_KEY"] = "geochat-secret-key-12345"

from main import app, get_connection

with app.app_context():
    print("Invocando get_chat_messages directamente desde Flask context:")
    
    with app.test_client() as client:
        token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTc4MzU0NjcyMSwianRpIjoiY2U4OGQ5ZjktZTQxMS00MWUzLWI2MDEtNmMzZjA2YWUwZWZhIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjQiLCJuYmYiOjE3ODM1NDY3MjEsImNzcmYiOiIzYzJjZTJkMy03NmY0LTQwMTItYjc2NC0xY2QxMTViMjIyZDciLCJleHAiOjE3ODYxMzg3MjF9.XvUjJFoJL2g6ozLY68aJYYVUbeaJtuSTURA5EuCAE0U"
        headers = {
            "Authorization": f"Bearer {token}"
        }
        res = client.get("/api/chats/4/593959709519@s.whatsapp.net/messages?limit=10", headers=headers)
        print("Status code:", res.status_code)
        data = res.get_json()
        print("Response success:", data.get("success") if data else None)
        messages = data.get("messages", []) if data else []
        print(f"Obtenidos {len(messages)} mensajes.")
        for msg in messages:
            print(f"Msg ID: {msg.get('id')} | Texto: '{msg.get('texto')}' | Agente: {msg.get('agente_nombre')} | EsMio: {msg.get('es_mio')}")
