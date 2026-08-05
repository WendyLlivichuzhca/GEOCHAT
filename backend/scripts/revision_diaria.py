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


def main():
    conn = get_connection()
    cursor = conn.cursor(dictionary=True)
    try:
        revisar_vencimientos(cursor, conn)
        revisar_limites(cursor, conn)
        logger.info("[RevisionDiaria] Revisión diaria de notificaciones completada.")
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()
