from flask import Flask, request, jsonify
from flask_cors import CORS
import mysql.connector

app = Flask(__name__)
# Permitimos que React (puerto 5173) acceda a Flask (puerto 5000)
CORS(app)

# Configura aqui tus datos de MySQL
db_config = {
    'host': 'localhost',
    'user': 'root',
    'password': '',  # Tu contrasena de MySQL
    'database': 'funnelchat_dev'
}

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json
    correo = data.get('correo')
    contrasena_hash = data.get('contrasena_hash')

    try:
        conn = mysql.connector.connect(**db_config)
        cursor = conn.cursor(dictionary=True)

        # Validacion de usuario
        query = "SELECT id, nombre, correo, rol FROM usuarios WHERE correo = %s AND contrasena_hash = %s"
        cursor.execute(query, (correo, contrasena_hash))
        user = cursor.fetchone()

        cursor.close()
        conn.close()

        if user:
            return jsonify({"success": True, "user": user})
        return jsonify({"success": False, "message": "Credenciales invalidas"}), 401

    except Exception as e:
        return jsonify({"success": False, "message": str(e)}), 500

if __name__ == '__main__':
    print("Servidor Flask corriendo en http://localhost:5000")
    app.run(debug=True, port=5000)
