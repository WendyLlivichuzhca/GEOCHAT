# backend/routes/agentes_ia.py
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from main import get_connection, logger

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
            INSERT INTO agentes_ia (usuario_id, dispositivo_id, nombre, modelo, instrucciones, personalidad, activo, descripcion_negocio, industria, objetivo)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (user_id, dispositivo_id, nombre, modelo, instrucciones, personalidad, activo, descripcion_negocio, industria, objetivo))
        
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
            
        cursor.execute("""
            UPDATE agentes_ia
            SET dispositivo_id = %s, nombre = %s, modelo = %s, instrucciones = %s, personalidad = %s, activo = %s, descripcion_negocio = %s, industria = %s, objetivo = %s
            WHERE id = %s AND usuario_id = %s
        """, (new_dispositivo, new_nombre, new_modelo, new_instrucciones, new_personalidad, new_activo, new_descripcion, new_industria, new_objetivo, agent_id, user_id))
        
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
