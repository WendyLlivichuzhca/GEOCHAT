# backend/routes/agentes_ia.py
from flask import Blueprint, jsonify, request, redirect
from flask_jwt_extended import jwt_required, get_jwt_identity, decode_token
from main import get_connection, logger
import os
import requests
import json
import time
from datetime import datetime, timedelta

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

# ==========================================
# ENDPOINTS PARA RECURSOS MULTIMEDIA DEL AGENTE
# ==========================================

from werkzeug.utils import secure_filename
import uuid
from flask import current_app

ALLOWED_RESOURCE_EXTENSIONS = {'jpg', 'jpeg', 'png', 'mp3', 'wav', 'ogg', 'mp4', 'avi', 'mov'}

def allowed_resource_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_RESOURCE_EXTENSIONS

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/recursos', methods=['GET'])
@jwt_required()
def get_agente_recursos(agent_id):
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el agente pertenece al usuario
        cursor.execute("SELECT id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Asistente no encontrado o no autorizado"}), 404
            
        cursor.execute("SELECT * FROM agente_recursos WHERE agente_id = %s ORDER BY creado_en DESC", (agent_id,))
        recursos = cursor.fetchall()
        
        for r in recursos:
            if r.get('creado_en'):
                r['creado_en'] = r['creado_en'].isoformat()
                
        return jsonify({"success": True, "data": recursos})
    except Exception as e:
        logger.exception("Error al listar recursos del agente")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/recursos', methods=['POST'])
@jwt_required()
def upload_agente_recurso(agent_id):
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el agente pertenece al usuario
        cursor.execute("SELECT id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Asistente no encontrado o no autorizado"}), 404
            
        file = request.files.get('file')
        if not file or not file.filename:
            return jsonify({"success": False, "message": "Archivo requerido"}), 400
            
        tipo = request.form.get('tipo', 'Imagen')
        descripcion = request.form.get('descripcion', '')
        notas_uso = request.form.get('notas_uso', '')
        
        if not allowed_resource_file(file.filename):
            return jsonify({"success": False, "message": "Formato de archivo no permitido"}), 400
            
        # Crear carpeta de subidas de recursos
        upload_dir = os.path.join(current_app.config.get("UPLOAD_FOLDER", "media"), "recursos", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = secure_filename(file.filename)
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        file.save(os.path.join(upload_dir, unique_name))
        
        # Guardar en base de datos la URL relativa/absoluta
        media_path = f"recursos/{user_id}/{unique_name}"
        media_url = f"{request.host_url.rstrip('/')}/media/{media_path}"
        
        cursor.execute("""
            INSERT INTO agente_recursos (agente_id, tipo, archivo_url, nombre_archivo, descripcion, notas_uso)
            VALUES (%s, %s, %s, %s, %s, %s)
        """, (agent_id, tipo, media_url, filename, descripcion, notas_uso))
        conn.commit()
        
        new_id = cursor.lastrowid
        
        return jsonify({
            "success": True,
            "message": "Recurso subido con éxito",
            "data": {
                "id": new_id,
                "agente_id": agent_id,
                "tipo": tipo,
                "archivo_url": media_url,
                "nombre_archivo": filename,
                "descripcion": descripcion,
                "notas_uso": notas_uso
            }
        })
    except Exception as e:
        logger.exception("Error al subir recurso del agente")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/recursos/<int:recurso_id>', methods=['DELETE'])
@jwt_required()
def delete_agente_recurso(agent_id, recurso_id):
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el agente pertenece al usuario
        cursor.execute("SELECT id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Asistente no encontrado o no autorizado"}), 404
            
        # Obtener el recurso
        cursor.execute("SELECT * FROM agente_recursos WHERE id = %s AND agente_id = %s", (recurso_id, agent_id))
        recurso = cursor.fetchone()
        if not recurso:
            return jsonify({"success": False, "message": "Recurso no encontrado"}), 404
            
        # Eliminar archivo físico
        archivo_url = recurso.get('archivo_url', '')
        if archivo_url:
            try:
                path_part = archivo_url.split('/media/')[-1]
                file_path = os.path.join(current_app.config.get("UPLOAD_FOLDER", "media"), *path_part.split('/'))
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                logger.error(f"Error al eliminar archivo físico de recurso: {e}")
                
        # Eliminar de la base de datos
        cursor.execute("DELETE FROM agente_recursos WHERE id = %s", (recurso_id,))
        conn.commit()
        
        return jsonify({"success": True, "message": "Recurso eliminado con éxito"})
    except Exception as e:
        logger.exception("Error al eliminar recurso del agente")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================================
# ENDPOINTS PARA BASE DE CONOCIMIENTO (ENTRENAMIENTO)
# ==========================================

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/conocimiento', methods=['GET'])
@jwt_required()
def get_agente_conocimiento(agent_id):
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el agente pertenece al usuario
        cursor.execute("SELECT id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Asistente no encontrado o no autorizado"}), 404
            
        tipo = request.args.get('tipo')
        if tipo:
            cursor.execute("SELECT * FROM agente_conocimiento WHERE agente_id = %s AND tipo = %s ORDER BY creado_en DESC", (agent_id, tipo))
        else:
            cursor.execute("SELECT * FROM agente_conocimiento WHERE agente_id = %s ORDER BY creado_en DESC", (agent_id,))
            
        items = cursor.fetchall()
        for item in items:
            if item.get('creado_en'):
                item['creado_en'] = item['creado_en'].isoformat()
                
        return jsonify({"success": True, "data": items})
    except Exception as e:
        logger.exception("Error al listar conocimiento del agente")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/conocimiento', methods=['POST'])
@jwt_required()
def add_agente_conocimiento(agent_id):
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el agente pertenece al usuario
        cursor.execute("SELECT id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Asistente no encontrado o no autorizado"}), 404
            
        tipo = request.form.get('tipo')
        if not tipo:
            data = request.get_json() or {}
            tipo = data.get('tipo')
            titulo = data.get('titulo')
            contenido = data.get('contenido')
            url = data.get('url')
        else:
            titulo = request.form.get('titulo')
            contenido = request.form.get('contenido')
            url = request.form.get('url')
            
        if not tipo or not titulo:
            return jsonify({"success": False, "message": "Tipo y Título son requeridos"}), 400
            
        file_url = None
        if tipo == 'Doc' and 'file' in request.files:
            file = request.files['file']
            if file and file.filename:
                ALLOWED_DOC_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt', 'csv', 'xls', 'xlsx'}
                ext = file.filename.rsplit('.', 1)[1].lower() if '.' in file.filename else ''
                if ext not in ALLOWED_DOC_EXTENSIONS:
                    return jsonify({"success": False, "message": "Formato de documento no permitido"}), 400
                    
                upload_dir = os.path.join(current_app.config.get("UPLOAD_FOLDER", "media"), "conocimiento", str(user_id))
                os.makedirs(upload_dir, exist_ok=True)
                
                filename = secure_filename(file.filename)
                unique_name = f"{uuid.uuid4().hex}_{filename}"
                file.save(os.path.join(upload_dir, unique_name))
                
                media_path = f"conocimiento/{user_id}/{unique_name}"
                file_url = f"{request.host_url.rstrip('/')}/media/{media_path}"
                
        cursor.execute("""
            INSERT INTO agente_conocimiento (agente_id, tipo, titulo, contenido, url)
            VALUES (%s, %s, %s, %s, %s)
        """, (agent_id, tipo, titulo, contenido, file_url or url))
        conn.commit()
        
        new_id = cursor.lastrowid
        
        return jsonify({
            "success": True,
            "message": "Entrenamiento agregado con éxito",
            "data": {
                "id": new_id,
                "agente_id": agent_id,
                "tipo": tipo,
                "titulo": titulo,
                "contenido": contenido,
                "url": file_url or url
            }
        })
    except Exception as e:
        logger.exception("Error al agregar conocimiento del agente")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/conocimiento/<int:item_id>', methods=['DELETE'])
@jwt_required()
def delete_agente_conocimiento(agent_id, item_id):
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el agente pertenece al usuario
        cursor.execute("SELECT id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Asistente no encontrado o no autorizado"}), 404
            
        # Obtener el ítem
        cursor.execute("SELECT * FROM agente_conocimiento WHERE id = %s AND agente_id = %s", (item_id, agent_id))
        item = cursor.fetchone()
        if not item:
            return jsonify({"success": False, "message": "Entrenamiento no encontrado"}), 404
            
        url = item.get('url')
        if item.get('tipo') == 'Doc' and url and '/media/conocimiento/' in url:
            try:
                path_part = url.split('/media/')[-1]
                file_path = os.path.join(current_app.config.get("UPLOAD_FOLDER", "media"), *path_part.split('/'))
                if os.path.exists(file_path):
                    os.remove(file_path)
            except Exception as e:
                logger.error(f"Error al eliminar archivo físico de documento: {e}")
                
        cursor.execute("DELETE FROM agente_conocimiento WHERE id = %s", (item_id,))
        conn.commit()
        
        return jsonify({"success": True, "message": "Entrenamiento eliminado con éxito"})
    except Exception as e:
        logger.exception("Error al eliminar conocimiento del agente")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

# ==========================================
# ENDPOINTS PARA INTEGRACIÓN CON GOOGLE DRIVE
# ==========================================

@agentes_ia_blueprint.route('/api/config/google', methods=['GET'])
@jwt_required()
def get_google_config():
    return jsonify({
        "success": True,
        "client_id": os.getenv("GOOGLE_CLIENT_ID"),
        "api_key": os.getenv("GOOGLE_API_KEY")
    })

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/conocimiento/google-drive', methods=['POST'])
@jwt_required()
def download_google_drive_file(agent_id):
    user_id = get_jwt_identity()
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el agente pertenece al usuario
        cursor.execute("SELECT id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Asistente no encontrado o no autorizado"}), 404
            
        data = request.get_json() or {}
        file_id = data.get('file_id')
        access_token = data.get('access_token')
        file_name = data.get('file_name', 'Archivo de Google Drive')
        
        if not file_id or not access_token:
            return jsonify({"success": False, "message": "Faltan datos requeridos (file_id o access_token)"}), 400
            
        # Descargar archivo desde la API de Google Drive
        drive_url = f"https://www.googleapis.com/drive/v3/files/{file_id}?alt=media"
        headers = {"Authorization": f"Bearer {access_token}"}
        
        res = requests.get(drive_url, headers=headers, stream=True)
        if res.status_code != 200:
            return jsonify({"success": False, "message": f"Error al descargar desde Google Drive: {res.text}"}), 400
            
        # Guardar en local
        upload_dir = os.path.join(current_app.config.get("UPLOAD_FOLDER", "media"), "conocimiento", str(user_id))
        os.makedirs(upload_dir, exist_ok=True)
        
        filename = secure_filename(file_name)
        unique_name = f"{uuid.uuid4().hex}_{filename}"
        
        file_path = os.path.join(upload_dir, unique_name)
        with open(file_path, 'wb') as f:
            for chunk in res.iter_content(chunk_size=8192):
                if chunk:
                    f.write(chunk)
                    
        media_path = f"conocimiento/{user_id}/{unique_name}"
        file_url = f"{request.host_url.rstrip('/')}/media/{media_path}"
        
        # Insertar en base de datos
        cursor.execute("""
            INSERT INTO agente_conocimiento (agente_id, tipo, titulo, contenido, url)
            VALUES (%s, %s, %s, %s, %s)
        """, (agent_id, 'Doc', file_name, 'Importado desde Google Drive', file_url))
        conn.commit()
        
        new_id = cursor.lastrowid
        
        return jsonify({
            "success": True,
            "message": "Archivo de Google Drive importado con éxito",
            "data": {
                "id": new_id,
                "agente_id": agent_id,
                "tipo": "Doc",
                "titulo": file_name,
                "contenido": "Importado desde Google Drive",
                "url": file_url
            }
        })
    except Exception as e:
        logger.exception("Error al importar archivo de Google Drive")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()


@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/activity/stats', methods=['GET'])
@jwt_required()
def get_agent_activity_stats(agent_id):
    user_id = get_jwt_identity()
    period = request.args.get('period', '7dias') # 'hoy', '7dias', '30dias'
    
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar que el agente pertenece al usuario
        cursor.execute("SELECT id, dispositivo_id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Agente no encontrado"}), 404
            
        device_id = agent['dispositivo_id']
        if not device_id:
            return jsonify({"success": True, "conversations": 0, "messages_sent": 0, "pending_human": 0, "transferred": 0, "resolved": 0, "resolution_rate": 0, "timeline": []})

        # Calcular fecha de inicio
        now = datetime.now()
        if period == 'hoy':
            start_date = now.replace(hour=0, minute=0, second=0, microsecond=0)
        elif period == '30dias':
            start_date = now - timedelta(days=30)
        else: # Default 7dias
            start_date = now - timedelta(days=7)
            
        # 1. Total conversaciones únicas interactuadas
        cursor.execute("""
            SELECT COUNT(DISTINCT chat_jid) AS total 
            FROM mensajes 
            WHERE dispositivo_id = %s AND fecha_mensaje >= %s
        """, (device_id, start_date))
        conversations = cursor.fetchone()['total'] or 0
        
        # 2. Total mensajes enviados por el bot
        cursor.execute("""
            SELECT COUNT(*) AS total 
            FROM mensajes 
            WHERE dispositivo_id = %s AND es_mio = 1 AND fecha_mensaje >= %s
        """, (device_id, start_date))
        messages_sent = cursor.fetchone()['total'] or 0
        
        # 3. Conversaciones transferidas a humanos
        cursor.execute("""
            SELECT COUNT(DISTINCT c.jid) AS total 
            FROM contactos c 
            INNER JOIN mensajes m ON c.jid = m.chat_jid AND c.dispositivo_id = m.dispositivo_id
            WHERE c.dispositivo_id = %s 
              AND c.agente_asignado_id IS NOT NULL 
              AND c.agente_asignado_id != %s
              AND m.fecha_mensaje >= %s
        """, (device_id, device_id, start_date))
        transferred = cursor.fetchone()['total'] or 0
        
        # 4. Pendientes de atención humana (tienen agente asignado humano actualmente)
        cursor.execute("""
            SELECT COUNT(*) AS total 
            FROM contactos 
            WHERE dispositivo_id = %s 
              AND agente_asignado_id IS NOT NULL 
              AND agente_asignado_id != %s
        """, (device_id, device_id))
        pending_human = cursor.fetchone()['total'] or 0
        
        # 5. Conversaciones resueltas (no transferidas a humano)
        resolved = max(0, conversations - transferred)
        
        # 6. Tasa de resolución
        resolution_rate = round((resolved / conversations * 100), 1) if conversations > 0 else 0.0
        
        # 7. Timeline de tendencia (últimos días)
        cursor.execute("""
            SELECT DATE(fecha_mensaje) AS date_label, COUNT(DISTINCT chat_jid) AS value
            FROM mensajes 
            WHERE dispositivo_id = %s AND fecha_mensaje >= %s
            GROUP BY DATE(fecha_mensaje)
            ORDER BY DATE(fecha_mensaje) ASC
        """, (device_id, start_date))
        timeline_rows = cursor.fetchall()
        
        timeline = []
        for row in timeline_rows:
            timeline.append({
                "date": row['date_label'].strftime("%m-%d") if hasattr(row['date_label'], 'strftime') else str(row['date_label']),
                "value": row['value']
            })
            
        return jsonify({
            "success": True,
            "conversations": conversations,
            "messages_sent": messages_sent,
            "pending_human": pending_human,
            "transferred": transferred,
            "resolved": resolved,
            "resolution_rate": resolution_rate,
            "timeline": timeline
        })
    except Exception as e:
        logger.exception("Error al obtener estadísticas de actividad")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/activity/conversations', methods=['GET'])
@jwt_required()
def get_agent_activity_conversations(agent_id):
    user_id = get_jwt_identity()
    filter_type = request.args.get('filter', 'Todas') # 'Todas', 'Humano', 'Lagunas'
    search_query = request.args.get('search', '').strip()
    
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar agente
        cursor.execute("SELECT id, dispositivo_id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Agente no encontrado"}), 404
            
        device_id = agent['dispositivo_id']
        if not device_id:
            return jsonify({"success": True, "data": []})

        # Construir consulta
        query = """
            SELECT DISTINCT c.id, c.jid, c.nombre, c.telefono, c.agente_asignado_id, c.ultimo_mensaje, c.actualizado_en
            FROM contactos c
            INNER JOIN mensajes m ON c.jid = m.chat_jid AND c.dispositivo_id = m.dispositivo_id
            WHERE c.dispositivo_id = %s
        """
        params = [device_id]
        
        if filter_type == 'Humano':
            query += " AND c.agente_asignado_id IS NOT NULL AND c.agente_asignado_id != %s"
            params.append(device_id)
        elif filter_type == 'Lagunas':
            # Consideramos lagunas: asignado al bot/vacío pero el último mensaje fue del cliente (es_mio = 0)
            query += """ AND (c.agente_asignado_id IS NULL OR c.agente_asignado_id = %s)
                         AND (SELECT es_mio FROM mensajes WHERE chat_jid = c.jid AND dispositivo_id = c.dispositivo_id ORDER BY fecha_mensaje DESC LIMIT 1) = 0"""
            params.append(device_id)
            
        if search_query:
            query += " AND (c.nombre LIKE %s OR c.telefono LIKE %s)"
            params.append(f"%{search_query}%")
            params.append(f"%{search_query}%")
            
        query += " ORDER BY c.actualizado_en DESC LIMIT 50"
        
        cursor.execute(query, tuple(params))
        contacts = cursor.fetchall()
        
        # Formatear actualizado_en
        for c in contacts:
            if c.get('actualizado_en'):
                c['actualizado_en'] = c['actualizado_en'].isoformat()
                
        return jsonify({"success": True, "data": contacts})
    except Exception as e:
        logger.exception("Error al obtener lista de conversaciones")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()

@agentes_ia_blueprint.route('/api/agentes-ia/<int:agent_id>/activity/conversations/<string:chat_jid>/messages', methods=['GET'])
@jwt_required()
def get_agent_conversation_messages(agent_id, chat_jid):
    user_id = get_jwt_identity()
    
    conn = None
    cursor = None
    try:
        conn = get_connection()
        cursor = conn.cursor(dictionary=True)
        
        # Verificar agente
        cursor.execute("SELECT id, dispositivo_id FROM agentes_ia WHERE id = %s AND usuario_id = %s", (agent_id, user_id))
        agent = cursor.fetchone()
        if not agent:
            return jsonify({"success": False, "message": "Agente no encontrado"}), 404
            
        device_id = agent['dispositivo_id']
        if not device_id:
            return jsonify({"success": True, "data": []})

        cursor.execute("""
            SELECT texto, es_mio, fecha_mensaje 
            FROM mensajes 
            WHERE dispositivo_id = %s AND chat_jid = %s
            ORDER BY fecha_mensaje ASC LIMIT 100
        """, (device_id, chat_jid))
        messages = cursor.fetchall()
        
        for m in messages:
            if m.get('fecha_mensaje'):
                m['fecha_mensaje'] = m['fecha_mensaje'].isoformat()
                
        return jsonify({"success": True, "data": messages})
    except Exception as e:
        logger.exception("Error al obtener mensajes del chat")
        return jsonify({"success": False, "message": str(e)}), 500
    finally:
        if cursor:
            cursor.close()
        if conn:
            conn.close()



