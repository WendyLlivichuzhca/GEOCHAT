"""Revisión diaria de recordatorios de vencimiento de plan y límites de uso.
Pensado para ejecutarse una vez al día vía cron. Usa notificaciones_sistema_log
para no reenviar el mismo aviso más de una vez."""
import os
import sys
from datetime import datetime

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from main import get_connection, enviar_notificacion_sistema, fetch_count, logger

DIAS_RECORDATORIO_VENCIMIENTO = [7, 3, 1]
UMBRAL_CERCA_LIMITE = 0.8  # 80%
DIAS_ANTES_DE_REPETIR_AVISO_LIMITE = 25

DIAS_SIN_CONECTAR_WHATSAPP = 2
DIAS_SIN_CREAR_AUTOMATIZACION = 5

DIA_RESUMEN_SEMANAL = 0  # 0 = lunes
DIAS_INACTIVIDAD = 5
DIAS_ANTES_DE_REPETIR_AVISO_INACTIVIDAD = 15


def ya_enviado(cursor, usuario_id, tipo):
    cursor.execute(
        "SELECT id FROM notificaciones_sistema_log WHERE usuario_id = %s AND tipo = %s LIMIT 1",
        (usuario_id, tipo),
    )
    return cursor.fetchone() is not None


def ya_enviado_reciente(cursor, usuario_id, tipo, dias=DIAS_ANTES_DE_REPETIR_AVISO_LIMITE):
    cursor.execute(
        "SELECT id FROM notificaciones_sistema_log WHERE usuario_id = %s AND tipo = %s "
        "AND enviado_en > NOW() - INTERVAL %s DAY LIMIT 1",
        (usuario_id, tipo, dias),
    )
    return cursor.fetchone() is not None


def registrar_envio(cursor, conn, usuario_id, tipo):
    cursor.execute(
        "INSERT INTO notificaciones_sistema_log (usuario_id, tipo) VALUES (%s, %s)",
        (usuario_id, tipo),
    )
    conn.commit()


def revisar_vencimientos(cursor, conn):
    cursor.execute(
        """
        SELECT s.usuario_id, s.fecha_vencimiento, u.nombre, p.nombre AS plan_nombre
        FROM suscripciones s
        INNER JOIN usuarios u ON u.id = s.usuario_id
        INNER JOIN planes p ON p.id = s.plan_id
        WHERE s.estado IN ('activa', 'prueba') AND s.fecha_vencimiento IS NOT NULL
        """
    )
    for row in cursor.fetchall():
        vencimiento = row["fecha_vencimiento"]
        if not vencimiento:
            continue
        dias_restantes = (vencimiento.date() - datetime.now().date()).days
        if dias_restantes not in DIAS_RECORDATORIO_VENCIMIENTO:
            continue

        tipo = f"plan_vence_{dias_restantes}dias_{vencimiento.date().isoformat()}"
        if ya_enviado(cursor, row["usuario_id"], tipo):
            continue

        fecha_txt = vencimiento.strftime("%d/%m/%Y")
        if dias_restantes == 1:
            mensaje = (
                f"⏰ Hola {row['nombre']}, tu plan *{row['plan_nombre']}* en GeoChat vence *mañana* ({fecha_txt}). "
                f"Verifica tu método de pago en Hotmart para no perder el acceso a tu panel."
            )
        else:
            mensaje = (
                f"📅 Hola {row['nombre']}, tu plan *{row['plan_nombre']}* en GeoChat vence en {dias_restantes} días "
                f"({fecha_txt}). Verifica tu método de pago en Hotmart para no perder el acceso a tu panel."
            )

        resultado = enviar_notificacion_sistema(row["usuario_id"], mensaje)
        if not (resultado and resultado.get("error")):
            registrar_envio(cursor, conn, row["usuario_id"], tipo)


def revisar_limites(cursor, conn):
    cursor.execute(
        """
        SELECT s.usuario_id, u.nombre, p.nombre AS plan_nombre,
               p.max_contactos, p.max_dispositivos, p.max_accesos_multiagente
        FROM suscripciones s
        INNER JOIN usuarios u ON u.id = s.usuario_id
        INNER JOIN planes p ON p.id = s.plan_id
        WHERE s.estado IN ('activa', 'prueba')
        """
    )
    planes = cursor.fetchall()

    for row in planes:
        usuario_id = row["usuario_id"]

        contactos_usados = fetch_count(
            cursor,
            """
            SELECT COUNT(*) AS total FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE d.usuario_id = %s
            """,
            (usuario_id,),
        )
        dispositivos_usados = fetch_count(
            cursor, "SELECT COUNT(*) AS total FROM dispositivos WHERE usuario_id = %s", (usuario_id,)
        )
        agentes_usados = fetch_count(
            cursor, "SELECT COUNT(*) AS total FROM usuarios WHERE parent_id = %s", (usuario_id,)
        ) + 1

        usos = {
            "contactos": (contactos_usados, row["max_contactos"], "contactos"),
            "dispositivos": (dispositivos_usados, row["max_dispositivos"], "líneas de WhatsApp"),
            "agentes": (agentes_usados, row["max_accesos_multiagente"], "agentes de soporte"),
        }

        for clave, (usados, maximo, etiqueta) in usos.items():
            if not maximo or maximo <= 0:
                continue
            proporcion = usados / maximo

            if proporcion >= 1.0:
                tipo = f"limite_{clave}_alcanzado"
                if ya_enviado_reciente(cursor, usuario_id, tipo):
                    continue
                mensaje = (
                    f"🚫 Hola {row['nombre']}, alcanzaste el límite de *{etiqueta}* de tu plan {row['plan_nombre']} "
                    f"({usados}/{maximo}). Mejora tu plan en GeoChat para seguir creciendo sin restricciones."
                )
                resultado = enviar_notificacion_sistema(usuario_id, mensaje)
                if not (resultado and resultado.get("error")):
                    registrar_envio(cursor, conn, usuario_id, tipo)

            elif proporcion >= UMBRAL_CERCA_LIMITE:
                tipo = f"limite_{clave}_cerca"
                if ya_enviado_reciente(cursor, usuario_id, tipo):
                    continue
                mensaje = (
                    f"Hola {row['nombre']}, ya usaste el {int(proporcion * 100)}% de tu límite de *{etiqueta}* "
                    f"en tu plan {row['plan_nombre']} ({usados}/{maximo}). Considera mejorar tu plan si necesitas más capacidad."
                )
                resultado = enviar_notificacion_sistema(usuario_id, mensaje)
                if not (resultado and resultado.get("error")):
                    registrar_envio(cursor, conn, usuario_id, tipo)


def revisar_activacion_sin_conectar(cursor, conn):
    tipo = "activacion_sin_conectar_whatsapp"
    cursor.execute(
        """
        SELECT u.id, u.nombre
        FROM usuarios u
        WHERE u.parent_id IS NULL
          AND u.creado_en <= NOW() - INTERVAL %s DAY
          AND NOT EXISTS (
              SELECT 1 FROM dispositivos d WHERE d.usuario_id = u.id AND d.estado = 'conectado'
          )
        """,
        (DIAS_SIN_CONECTAR_WHATSAPP,),
    )
    for row in cursor.fetchall():
        usuario_id = row["id"]
        if ya_enviado(cursor, usuario_id, tipo):
            continue
        mensaje = (
            f"Hola {row['nombre']} 👋 Notamos que aún no has conectado tu WhatsApp en GeoChat. "
            f"Conéctalo desde tu panel para empezar a automatizar tus conversaciones. "
            f"Si tienes dudas, escríbenos por este mismo chat."
        )
        resultado = enviar_notificacion_sistema(usuario_id, mensaje)
        if not (resultado and resultado.get("error")):
            registrar_envio(cursor, conn, usuario_id, tipo)


def revisar_activacion_sin_automatizar(cursor, conn):
    tipo = "activacion_sin_automatizacion"
    cursor.execute(
        """
        SELECT u.id, u.nombre, MIN(d.conectado_en) AS primera_conexion
        FROM usuarios u
        INNER JOIN dispositivos d ON d.usuario_id = u.id AND d.conectado_en IS NOT NULL
        WHERE u.parent_id IS NULL
        GROUP BY u.id, u.nombre
        HAVING primera_conexion <= NOW() - INTERVAL %s DAY
        """,
        (DIAS_SIN_CREAR_AUTOMATIZACION,),
    )
    for row in cursor.fetchall():
        usuario_id = row["id"]
        if ya_enviado(cursor, usuario_id, tipo):
            continue

        tiene_agente = fetch_count(
            cursor, "SELECT COUNT(*) AS total FROM agentes_ia WHERE usuario_id = %s", (usuario_id,)
        )
        tiene_automatizacion = fetch_count(
            cursor, "SELECT COUNT(*) AS total FROM automatizaciones WHERE usuario_id = %s", (usuario_id,)
        )
        if tiene_agente or tiene_automatizacion:
            continue

        mensaje = (
            f"Hola {row['nombre']} 👋 Ya conectaste tu WhatsApp en GeoChat, ¡buen primer paso! "
            f"Ahora crea tu primer agente de IA o una automatización para responder solo, sin que tengas "
            f"que estar pendiente del celular todo el día. Entra a tu panel y pruébalo."
        )
        resultado = enviar_notificacion_sistema(usuario_id, mensaje)
        if not (resultado and resultado.get("error")):
            registrar_envio(cursor, conn, usuario_id, tipo)


def revisar_resumen_semanal(cursor, conn):
    if datetime.now().weekday() != DIA_RESUMEN_SEMANAL:
        return

    cursor.execute(
        """
        SELECT u.id, u.nombre
        FROM usuarios u
        WHERE u.parent_id IS NULL
          AND EXISTS (SELECT 1 FROM dispositivos d WHERE d.usuario_id = u.id)
        """
    )
    semana_iso = datetime.now().strftime("%Y-W%W")

    for row in cursor.fetchall():
        usuario_id = row["id"]
        tipo = f"resumen_semanal_{semana_iso}"
        if ya_enviado(cursor, usuario_id, tipo):
            continue

        mensajes_recibidos = fetch_count(
            cursor,
            """
            SELECT COUNT(*) AS total FROM mensajes m
            INNER JOIN dispositivos d ON d.id = m.dispositivo_id
            WHERE d.usuario_id = %s AND m.es_mio = 0 AND m.fecha_mensaje >= NOW() - INTERVAL 7 DAY
            """,
            (usuario_id,),
        )
        mensajes_enviados = fetch_count(
            cursor,
            """
            SELECT COUNT(*) AS total FROM mensajes m
            INNER JOIN dispositivos d ON d.id = m.dispositivo_id
            WHERE d.usuario_id = %s AND m.es_mio = 1 AND m.fecha_mensaje >= NOW() - INTERVAL 7 DAY
            """,
            (usuario_id,),
        )
        chats_atendidos = fetch_count(
            cursor,
            """
            SELECT COUNT(DISTINCT m.chat_jid) AS total FROM mensajes m
            INNER JOIN dispositivos d ON d.id = m.dispositivo_id
            WHERE d.usuario_id = %s AND m.fecha_mensaje >= NOW() - INTERVAL 7 DAY
            """,
            (usuario_id,),
        )
        contactos_nuevos = fetch_count(
            cursor,
            """
            SELECT COUNT(*) AS total FROM contactos c
            INNER JOIN dispositivos d ON d.id = c.dispositivo_id
            WHERE d.usuario_id = %s AND c.creado_en >= NOW() - INTERVAL 7 DAY
            """,
            (usuario_id,),
        )

        if mensajes_recibidos == 0 and mensajes_enviados == 0 and contactos_nuevos == 0:
            # Sin actividad -> ya lo cubre el aviso de "actividad en cero", no duplicar
            continue

        mensaje = (
            f"📊 Resumen semanal de tu GeoChat, {row['nombre']}:\n\n"
            f"💬 {chats_atendidos} chats atendidos\n"
            f"📥 {mensajes_recibidos} mensajes recibidos\n"
            f"📤 {mensajes_enviados} mensajes enviados\n"
            f"🆕 {contactos_nuevos} contactos nuevos\n\n"
            f"¡Sigue así! Revisa tu panel para más detalles."
        )
        resultado = enviar_notificacion_sistema(usuario_id, mensaje)
        if not (resultado and resultado.get("error")):
            registrar_envio(cursor, conn, usuario_id, tipo)


def revisar_actividad_cero(cursor, conn):
    cursor.execute(
        """
        SELECT u.id, u.nombre
        FROM usuarios u
        WHERE u.parent_id IS NULL
          AND EXISTS (
              SELECT 1 FROM dispositivos d WHERE d.usuario_id = u.id AND d.estado = 'conectado'
          )
        """
    )

    for row in cursor.fetchall():
        usuario_id = row["id"]

        mensajes_recientes = fetch_count(
            cursor,
            """
            SELECT COUNT(*) AS total FROM mensajes m
            INNER JOIN dispositivos d ON d.id = m.dispositivo_id
            WHERE d.usuario_id = %s AND m.fecha_mensaje >= NOW() - INTERVAL %s DAY
            """,
            (usuario_id, DIAS_INACTIVIDAD),
        )
        if mensajes_recientes > 0:
            continue

        historial_previo = fetch_count(
            cursor,
            """
            SELECT COUNT(*) AS total FROM mensajes m
            INNER JOIN dispositivos d ON d.id = m.dispositivo_id
            WHERE d.usuario_id = %s
            """,
            (usuario_id,),
        )
        if historial_previo == 0:
            # Nunca tuvo actividad -> lo cubre el aviso de activación (Bloque 3), no duplicar
            continue

        tipo = "actividad_en_cero"
        if ya_enviado_reciente(cursor, usuario_id, tipo, dias=DIAS_ANTES_DE_REPETIR_AVISO_INACTIVIDAD):
            continue

        mensaje = (
            f"Hola {row['nombre']}, notamos que no ha habido actividad en tu WhatsApp de GeoChat "
            f"en los últimos {DIAS_INACTIVIDAD} días. ¿Todo bien? Si necesitas ayuda para reactivar tus "
            f"conversaciones o campañas, escríbenos por este mismo chat."
        )
        resultado = enviar_notificacion_sistema(usuario_id, mensaje)
        if not (resultado and resultado.get("error")):
            registrar_envio(cursor, conn, usuario_id, tipo)


def main():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        revisar_vencimientos(cursor, conn)
        revisar_limites(cursor, conn)
        revisar_activacion_sin_conectar(cursor, conn)
        revisar_activacion_sin_automatizar(cursor, conn)
        revisar_resumen_semanal(cursor, conn)
        revisar_actividad_cero(cursor, conn)
        logger.info("[RevisionDiaria] Revisión diaria de notificaciones completada.")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
