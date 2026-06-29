# backend/routes/agentes_ia.py
from flask import Blueprint, jsonify, request, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from main import get_connection, logger
import os
import requests
import json
import time

agentes_ia_blueprint = Blueprint('agentes_ia', __name__)

@agentes_ia_blueprint.route('/api/agentes-ia', methods=['GET'])
@jwt_required()
def get_agentes_ia():
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        cursor.execute("""
            SELECT a.*, d.nombre AS dispositivo_nombre, d.numero_telefono AS dispositivo_numero
            FROM agentes_ia a
            LEFT JOIN dispositivos d ON a.dispositivo_id = d.id
            WHERE a.usuario_id = %s
            ORDER BY a.creado_en DESC
        """, (user_id,))
        agents = cursor.fetchall()
        
        # Formatear las fechas a cadenas ISO
        for agent in agents:
            if agent.get('creado_en'):
                agent['creado_en'] = agent['creado_en'].isoformat()
            if agent.get('actualizado_en'):
                agent['actualizado_en'] = agent['actualizado_en'].isoformat()
                
        return jsonify({"success": True, "data": agents})
    except Exception as e:
        logger.exception("Error al listar agentes de IA")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia/stats', methods=['GET'])
@jwt_required()
def get_agentes_ia_stats():
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Conteo total
        cursor.execute("SELECT COUNT(*) AS total FROM agentes_ia WHERE usuario_id = %s", (user_id,))
        total = cursor.fetchone()['total']
        
        # Conteo activos
        cursor.execute("SELECT COUNT(*) AS activos FROM agentes_ia WHERE usuario_id = %s AND activo = 1", (user_id,))
        activos = cursor.fetchone()['activos']
        
        # Por ahora la base de conocimiento se calcula como 0 MB o según tamaño de instrucciones/personalidades
        cursor.execute("""
            SELECT SUM(LENGTH(COALESCE(instrucciones, '')) + LENGTH(COALESCE(personalidad, ''))) AS total_size 
            FROM agentes_ia 
            WHERE usuario_id = %s
        """, (user_id,))
        res_size = cursor.fetchone()
        total_size_bytes = res_size['total_size'] if res_size and res_size['total_size'] else 0
        kb_size_mb = round(total_size_bytes / (1024 * 1024), 2)
        
        return jsonify({
            "success": True,
            "total": total,
            "activos": activos,
            "knowledge_base_mb": kb_size_mb
        })
    except Exception as e:
        logger.exception("Error al obtener estadísticas de agentes de IA")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia', methods=['POST'])
@jwt_required()
def create_agente_ia():
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    dispositivo_id = data.get('dispositivo_id')
    nombre = data.get('nombre')
    modelo = data.get('modelo', 'gpt-4')
    instrucciones = data.get('instrucciones', '')
    personalidad = data.get('personalidad', '')
    activo = 1 if data.get('activo') else 0
    descripcion_negocio = data.get('descripcion_negocio', '')
    industria = data.get('industria', '')
    objetivo = data.get('objetivo', '')
    
    pasos_captura = data.get('pasos_captura')
    skip_existing_data = 1 if data.get('skip_existing_data') else 0
    seguimientos = data.get('seguimientos')
    reglas_transferencia = data.get('reglas_transferencia')
    reglas_etiquetado = data.get('reglas_etiquetado')
    config_comportamiento = data.get('config_comportamiento')
    
    if not nombre:
        return jsonify({"success": False, "message": "nombre es obligatorio"}), 400
        
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Si no se provee dispositivo_id, auto-asignar el primer dispositivo del usuario
        if not dispositivo_id:
            cursor.execute("""
                SELECT id FROM dispositivos WHERE usuario_id = %s ORDER BY id ASC LIMIT 1
            """, (user_id,))
            device_row = cursor.fetchone()
            dispositivo_id = device_row['id'] if device_row else None
        
        # Insertar agente
        cursor.execute("""
            INSERT INTO agentes_ia (
                usuario_id, dispositivo_id, nombre, modelo, instrucciones, personalidad, activo, 
                descripcion_negocio, industria, objetivo, pasos_captura, skip_existing_data, 
                seguimientos, reglas_transferencia, reglas_etiquetado, config_comportamiento
            )
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            user_id, dispositivo_id, nombre, modelo, instrucciones, personalidad, activo, 
            descripcion_negocio, industria, objetivo, pasos_captura, skip_existing_data, 
            seguimientos, reglas_transferencia, reglas_etiquetado, config_comportamiento
        ))
        
        new_id = cursor.lastrowid
        conn.commit()
        
        return jsonify({"success": True, "message": "Agente creado con éxito", "id": new_id})
    except Exception as e:
        logger.exception("Error al crear agente de IA")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>', methods=['PUT'])
@jwt_required()
def update_agente_ia(agent_id):
    user_id = get_jwt_identity()
    data = request.get_json() or {}
    
    dispositivo_id = data.get('dispositivo_id')
    nombre = data.get('nombre')
    modelo = data.get('modelo')
    instrucciones = data.get('instrucciones')
    personalidad = data.get('personalidad')
    activo = data.get('activo')
    descripcion_negocio = data.get('descripcion_negocio')
    industria = data.get('industria')
    objetivo = data.get('objetivo')
    
    pasos_captura = data.get('pasos_captura')
    skip_existing_data = data.get('skip_existing_data')
    seguimientos = data.get('seguimientos')
    reglas_transferencia = data.get('reglas_transferencia')
    reglas_etiquetado = data.get('reglas_etiquetado')
    config_comportamiento = data.get('config_comportamiento')
    
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Buscar el agente existente para asegurar pertenencia
        cursor.execute("SELECT * FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        existing = cursor.fetchone()
        if not existing:
            return jsonify({"success": False, "message": "Agente no encontrado o sin permisos"}), 404
            
        # Preparar campos a actualizar
        new_dispositivo = dispositivo_id if dispositivo_id is not None else existing['dispositivo_id']
        new_nombre = nombre if nombre is not None else existing['nombre']
        new_modelo = modelo if modelo is not None else existing['modelo']
        new_instrucciones = instrucciones if instrucciones is not None else existing['instrucciones']
        new_personalidad = personalidad if personalidad is not None else existing['personalidad']
        new_activo = 1 if (activo is True or activo == 1 or (activo is None and existing['activo'])) else 0
        if activo is False or activo == 0:
            new_activo = 0
        new_descripcion = descripcion_negocio if descripcion_negocio is not None else existing.get('descripcion_negocio')
        new_industria = industria if industria is not None else existing.get('industria')
        new_objetivo = objetivo if objetivo is not None else existing.get('objetivo')
        
        new_pasos = pasos_captura if pasos_captura is not None else existing.get('pasos_captura')
        new_skip = 1 if (skip_existing_data is True or skip_existing_data == 1 or (skip_existing_data is None and existing.get('skip_existing_data'))) else 0
        if skip_existing_data is False or skip_existing_data == 0:
            new_skip = 0
        new_seguimientos = seguimientos if seguimientos is not None else existing.get('seguimientos')
        new_transferencia = reglas_transferencia if reglas_transferencia is not None else existing.get('reglas_transferencia')
        new_etiquetado = reglas_etiquetado if reglas_etiquetado is not None else existing.get('reglas_etiquetado')
        new_config = config_comportamiento if config_comportamiento is not None else existing.get('config_comportamiento')
            
        cursor.execute("""
            UPDATE agentes_ia
            SET dispositivo_id = %s, nombre = %s, modelo = %s, instrucciones = %s, personalidad = %s, activo = %s, 
                descripcion_negocio = %s, industria = %s, objetivo = %s, pasos_captura = %s, skip_existing_data = %s, 
                seguimientos = %s, reglas_transferencia = %s, reglas_etiquetado = %s, config_comportamiento = %s
            WHERE id = %s AND usuario_id = %s
        """, (
            new_dispositivo, new_nombre, new_modelo, new_instrucciones, new_personalidad, new_activo, 
            new_descripcion, new_industria, new_objetivo, new_pasos, new_skip, 
            new_seguimientos, new_transferencia, new_etiquetado, new_config, agent_id, user_id
        ))
        
        conn.commit()
        return jsonify({"success": True, "message": "Agente actualizado con éxito"})
    except Exception as e:
        logger.exception("Error al actualizar agente de IA")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>', methods=['DELETE'])
@jwt_required()
def delete_agente_ia(agent_id):
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Eliminar si pertenece al usuario
        cursor.execute("DELETE FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        conn.commit()
        
        if cursor.rowcount == 0:
            return jsonify({"success": False, "message": "Agente no encontrado o sin permisos"}), 404
            
        return jsonify({"success": True, "message": "Agente eliminado con éxito"})
    except Exception as e:
        logger.exception("Error al eliminar agente de IA")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/auth/google', methods=['GET'])
def auth_google():
    agent_id = request.args.get('agent_id')
    token = request.args.get('token')
    
    if not agent_id or not token:
        return "Faltan parámetros obligatorios (agent_id, token)", 400
        
    try:
        decoded = decode_token(token)
        user_id = decoded.get('sub') or decoded.get('identity')
    except Exception:
        return "Token de autorización inválido o expirado", 401
        
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
    agent = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not agent:
        return "Agente no encontrado o sin permisos", 404
        
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    if not client_id or not redirect_uri:
        return "Las credenciales de Google OAuth no están configuradas en el servidor", 500
        
    scope = "https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/userinfo.email"
    auth_url = (
        f"https://accounts.google.com/o/oauth2/v2/auth?"
        f"response_type=code&"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"scope={scope}&"
        f"access_type=offline&"
        f"prompt=consent&"
        f"state={agent_id}"
    )
    return redirect(auth_url)


@agentes_ia_blueprint.route('/api/auth/google/callback', methods=['GET'])
def auth_google_callback():
    code = request.args.get('code')
    agent_id = request.args.get('state')
    error = request.args.get('error')
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    if error:
        return redirect(f"{frontend_url}/agentes-ia?error={error}")
        
    if not code or not agent_id:
        return "Falta el código de autorización o el estado del agente", 400
        
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    redirect_uri = os.getenv("GOOGLE_REDIRECT_URI")
    
    try:
        token_url = "https://oauth2.googleapis.com/token"
        payload = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        res = requests.post(token_url, data=payload)
        tokens = res.json()
        
        if "error" in tokens:
            return redirect(f"{frontend_url}/agentes-ia?error={tokens.get('error_description', 'Error en Google Token Exchange')}")
            
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 3600)
        
        userinfo_url = "https://www.googleapis.com/oauth2/v2/userinfo"
        userinfo_res = requests.get(userinfo_url, headers={"Authorization": f"Bearer {access_token}"})
        email = userinfo_res.json().get("email", "Cuenta de Google")
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT config_comportamiento FROM agentes_ia WHERE id = %s", (agent_id,))
        agent = cursor.fetchone()
        
        config = {}
        if agent and agent.get("config_comportamiento"):
            try:
                config = json.loads(agent["config_comportamiento"])
            except Exception:
                config = {}
                
        config["calGoogleConnected"] = True
        config["calGoogleEmail"] = email
        config["google_access_token"] = access_token
        if refresh_token:
            config["google_refresh_token"] = refresh_token
        config["google_token_expiry"] = time.time() + expires_in
        
        cursor.execute(
            "UPDATE agentes_ia SET config_comportamiento = %s WHERE id = %s",
            (json.dumps(config), agent_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        return redirect(f"{frontend_url}/agentes-ia?success=true&provider=google")
    except Exception as e:
        logger.exception("Error en Google OAuth Callback")
        return redirect(f"{frontend_url}/agentes-ia?error={str(e)}")


@agentes_ia_blueprint.route('/api/auth/calendly', methods=['GET'])
def auth_calendly():
    agent_id = request.args.get('agent_id')
    token = request.args.get('token')
    
    if not agent_id or not token:
        return "Faltan parámetros obligatorios (agent_id, token)", 400
        
    try:
        decoded = decode_token(token)
        user_id = decoded.get('sub') or decoded.get('identity')
    except Exception:
        return "Token de autorización inválido o expirado", 401
        
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    cursor.execute("SELECT id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
    agent = cursor.fetchone()
    cursor.close()
    conn.close()
    
    if not agent:
        return "Agente no encontrado o sin permisos", 404
        
    client_id = os.getenv("CALENDLY_CLIENT_ID")
    redirect_uri = os.getenv("CALENDLY_REDIRECT_URI")
    
    if not client_id or not redirect_uri:
        return "Las credenciales de Calendly OAuth no están configuradas en el servidor", 500
        
    auth_url = (
        f"https://auth.calendly.com/oauth/authorize?"
        f"client_id={client_id}&"
        f"redirect_uri={redirect_uri}&"
        f"response_type=code&"
        f"state={agent_id}"
    )
    return redirect(auth_url)


@agentes_ia_blueprint.route('/api/auth/calendly/callback', methods=['GET'])
def auth_calendly_callback():
    code = request.args.get('code')
    agent_id = request.args.get('state')
    error = request.args.get('error')
    
    frontend_url = os.getenv("FRONTEND_URL", "http://localhost:5173")
    
    if error:
        return redirect(f"{frontend_url}/agentes-ia?error={error}")
        
    if not code or not agent_id:
        return "Falta el código de autorización o el estado del agente", 400
        
    client_id = os.getenv("CALENDLY_CLIENT_ID")
    client_secret = os.getenv("CALENDLY_CLIENT_SECRET")
    redirect_uri = os.getenv("CALENDLY_REDIRECT_URI")
    
    try:
        token_url = "https://auth.calendly.com/oauth/token"
        payload = {
            "code": code,
            "client_id": client_id,
            "client_secret": client_secret,
            "redirect_uri": redirect_uri,
            "grant_type": "authorization_code"
        }
        res = requests.post(token_url, data=payload)
        tokens = res.json()
        
        if "error" in tokens:
            return redirect(f"{frontend_url}/agentes-ia?error={tokens.get('error_description', 'Error en Calendly Token Exchange')}")
            
        access_token = tokens.get("access_token")
        refresh_token = tokens.get("refresh_token")
        expires_in = tokens.get("expires_in", 7200)
        
        user_url = "https://api.calendly.com/users/me"
        user_res = requests.get(user_url, headers={"Authorization": f"Bearer {access_token}"})
        user_data = user_res.json()
        
        email = user_data.get("resource", {}).get("email", "Cuenta de Calendly")
        
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        cursor.execute("SELECT config_comportamiento FROM agentes_ia WHERE id = %s", (agent_id,))
        agent = cursor.fetchone()
        
        config = {}
        if agent and agent.get("config_comportamiento"):
            try:
                config = json.loads(agent["config_comportamiento"])
            except Exception:
                config = {}
                
        config["calCalendlyConnected"] = True
        config["calCalendlyEmail"] = email
        config["calendly_access_token"] = access_token
        if refresh_token:
            config["calendly_refresh_token"] = refresh_token
        config["calendly_token_expiry"] = time.time() + expires_in
        
        cursor.execute(
            "UPDATE agentes_ia SET config_comportamiento = %s WHERE id = %s",
            (json.dumps(config), agent_id)
        )
        conn.commit()
        cursor.close()
        conn.close()
        
        return redirect(f"{frontend_url}/agentes-ia?success=true&provider=calendly")
    except Exception as e:
        logger.exception("Error en Calendly OAuth Callback")
        return redirect(f"{frontend_url}/agentes-ia?error={str(e)}")
