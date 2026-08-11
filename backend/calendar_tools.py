# backend/calendar_tools.py
import os
import time
import requests
import json

def get_db_logger():
    try:
        from main import logger
        return logger
    except ImportError:
        import logging
        return logging.getLogger("calendar_tools")

logger = get_db_logger()

def refresh_google_oauth_token(cursor, conn, agent_id, config):
    """
    Refresca el token de acceso de Google OAuth si ha expirado o está por expirar.
    Actualiza la configuración en la base de datos.
    Returns the valid access token, or None if failed.
    """
    token_expiry = config.get("google_token_expiry", 0)
    refresh_token = config.get("google_refresh_token")
    access_token = config.get("google_access_token")
    
    # Si falta el token de refresco, no podemos hacer nada
    if not refresh_token:
        logger.warning(f"No google_refresh_token found in agent config for agent {agent_id}")
        return access_token

    # Si expira en más de 60 segundos, el actual sigue siendo válido
    if token_expiry and (token_expiry - time.time() > 60):
        return access_token

    logger.info(f"Refrescando Google OAuth token para agente {agent_id}...")
    
    client_id = os.getenv("GOOGLE_CLIENT_ID")
    client_secret = os.getenv("GOOGLE_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        logger.error("Credenciales GOOGLE_CLIENT_ID o GOOGLE_CLIENT_SECRET no configuradas en el entorno.")
        return access_token

    try:
        payload = {
            "client_id": client_id,
            "client_secret": client_secret,
            "refresh_token": refresh_token,
            "grant_type": "refresh_token"
        }
        res = requests.post("https://oauth2.googleapis.com/token", data=payload, timeout=15)
        if res.status_code == 200:
            tokens = res.json()
            new_access_token = tokens.get("access_token")
            expires_in = tokens.get("expires_in", 3600)
            
            if new_access_token:
                config["google_access_token"] = new_access_token
                config["google_token_expiry"] = time.time() + expires_in
                
                # Guardar la configuración actualizada en DB
                cursor.execute(
                    "UPDATE agentes_ia SET config_comportamiento = %s WHERE id = %s",
                    (json.dumps(config), agent_id)
                )
                conn.commit()
                logger.info(f"Google OAuth token refrescado con éxito para agente {agent_id}.")
                return new_access_token
        else:
            logger.error(f"Error en el intercambio de token de Google: {res.status_code} - {res.text}")
    except Exception as e:
        logger.error(f"Excepción al refrescar token de Google: {e}")
        
    return access_token


def list_google_calendar_events(access_token, start_time, end_time):
    """
    Lista los eventos existentes en el calendario principal para un rango de tiempo.
    start_time y end_time deben ser strings ISO (ej. '2026-07-02T00:00:00Z').
    """
    try:
        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events"
        headers = {"Authorization": f"Bearer {access_token}"}
        params = {
            "timeMin": start_time,
            "timeMax": end_time,
            "singleEvents": "true",
            "orderBy": "startTime"
        }
        res = requests.get(url, headers=headers, params=params, timeout=15)
        if res.status_code == 200:
            events_data = res.json().get("items", [])
            busy_slots = []
            for event in events_data:
                start = event.get("start", {}).get("dateTime") or event.get("start", {}).get("date")
                end = event.get("end", {}).get("dateTime") or event.get("end", {}).get("date")
                busy_slots.append({"start": start, "end": end})
            return {"success": True, "busy_slots": busy_slots}
        else:
            return {"success": False, "error": f"Google API error: {res.status_code} - {res.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


_DIAS_SEMANA_KEYS = ["lunes", "martes", "miercoles", "jueves", "viernes", "sabado", "domingo"]


def _parse_busy_boundary(value, tz, end_of_day):
    """Convierte un limite (start/end) de un evento de Google a datetime con zona horaria.
    Los eventos de todo el dia solo traen fecha (sin hora), asi que se asume que ocupan
    el dia completo."""
    if not value:
        return None
    import pytz
    from datetime import datetime, time as dtime
    try:
        if "T" in value:
            dt = datetime.fromisoformat(value.replace("Z", "+00:00"))
            if dt.tzinfo is None:
                dt = tz.localize(dt)
            else:
                dt = dt.astimezone(tz)
            return dt
        else:
            d = datetime.strptime(value, "%Y-%m-%d").date()
            t = dtime(23, 59, 59) if end_of_day else dtime(0, 0, 0)
            return tz.localize(datetime.combine(d, t))
    except Exception:
        return None


def compute_free_slots_by_day(busy_slots, working_hours, tz_name, start_date, num_days, now_dt=None, min_duration_minutes=None):
    """
    Calcula, dia por dia, las franjas horarias realmente libres dentro del horario de
    atencion configurado del negocio, restando los eventos ya ocupados del calendario.
    Se calcula aqui en Python (nunca pidiendole a la IA que lo razone) para que la
    disponibilidad que se le ofrece al cliente sea siempre exacta y cubra varios dias,
    no solo el primero que la IA decida mencionar.

    busy_slots: lista de {"start": iso_str, "end": iso_str} devuelta por Google Calendar.
    working_hours: dict {"lunes": {"active": bool, "start": "HH:MM", "end": "HH:MM"}, ...}
    tz_name: string de zona horaria IANA del negocio (ej. "America/Guayaquil"), puede ser None.
    start_date: datetime.date, primer dia a calcular.
    num_days: cuantos dias calcular desde start_date (inclusive). Se limita a 14 como tope.
    now_dt: datetime con zona horaria representando el momento actual real. Si el dia que se
    esta calculando es HOY, la ventana libre nunca empieza antes de este momento (no tiene
    sentido ofrecer un horario que ya paso), y si ya se paso la hora de cierre, el dia queda
    sin franjas libres.
    min_duration_minutes: si se indica, descarta las franjas libres mas cortas que este
    numero de minutos (por ejemplo, no tiene sentido ofrecer un hueco de 20 minutos para un
    servicio que dura 60).
    """
    import pytz
    from datetime import datetime, timedelta, time as dtime

    try:
        tz = pytz.timezone(tz_name) if tz_name else pytz.utc
    except Exception:
        tz = pytz.utc

    num_days = max(1, min(int(num_days or 1), 14))
    now_local = now_dt.astimezone(tz) if now_dt is not None else None

    busy_intervals = []
    for slot in (busy_slots or []):
        s = _parse_busy_boundary(slot.get("start"), tz, end_of_day=False)
        e = _parse_busy_boundary(slot.get("end"), tz, end_of_day=True)
        if s and e and e > s:
            busy_intervals.append((s, e))

    result = []
    for i in range(num_days):
        current_date = start_date + timedelta(days=i)
        day_key = _DIAS_SEMANA_KEYS[current_date.weekday()]
        day_cfg = (working_hours or {}).get(day_key) or {}

        if not day_cfg.get("active"):
            result.append({
                "fecha": current_date.isoformat(),
                "dia_semana": day_key,
                "abierto": False,
                "franjas_libres": []
            })
            continue

        try:
            h1, m1 = [int(x) for x in day_cfg.get("start", "09:00").split(":")]
            h2, m2 = [int(x) for x in day_cfg.get("end", "18:00").split(":")]
        except Exception:
            h1, m1, h2, m2 = 9, 0, 18, 0

        day_start = tz.localize(datetime.combine(current_date, dtime(h1, m1)))
        day_end = tz.localize(datetime.combine(current_date, dtime(h2, m2)))

        if now_local is not None and current_date == now_local.date() and now_local > day_start:
            day_start = now_local

        if day_start >= day_end:
            result.append({
                "fecha": current_date.isoformat(),
                "dia_semana": day_key,
                "abierto": True,
                "franjas_libres": []
            })
            continue

        day_busy = []
        for s, e in busy_intervals:
            clipped_start = max(s, day_start)
            clipped_end = min(e, day_end)
            if clipped_end > clipped_start:
                day_busy.append((clipped_start, clipped_end))
        day_busy.sort(key=lambda x: x[0])

        merged = []
        for s, e in day_busy:
            if merged and s <= merged[-1][1]:
                merged[-1] = (merged[-1][0], max(merged[-1][1], e))
            else:
                merged.append((s, e))

        free_ranges = []
        cursor = day_start
        for s, e in merged:
            if s > cursor:
                free_ranges.append((cursor, s))
            cursor = max(cursor, e)
        if cursor < day_end:
            free_ranges.append((cursor, day_end))

        if min_duration_minutes:
            free_ranges = [
                (fs, fe) for fs, fe in free_ranges
                if (fe - fs).total_seconds() / 60.0 >= min_duration_minutes
            ]

        franjas = [f"{fs.strftime('%H:%M')}-{fe.strftime('%H:%M')}" for fs, fe in free_ranges if fe > fs]

        result.append({
            "fecha": current_date.isoformat(),
            "dia_semana": day_key,
            "abierto": True,
            "franjas_libres": franjas
        })

    return result


def create_google_calendar_event(access_token, summary, start_time, end_time, attendee_email=None, description="", create_meet=False):
    """
    Crea un evento en Google Calendar principal con opción de sala de Meet.
    """
    try:
        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1&sendUpdates=all"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        
        event_body = {
            "summary": summary,
            "description": description,
            "start": {"dateTime": start_time, "timeZone": "UTC"},
            "end": {"dateTime": end_time, "timeZone": "UTC"},
        }
        
        if attendee_email:
            event_body["attendees"] = [{"email": attendee_email}]
            
        if create_meet:
            # Solicitar creación de enlace Google Meet
            event_body["conferenceData"] = {
                "createRequest": {
                    "requestId": f"meet_{int(time.time())}",
                    "conferenceSolutionKey": {"type": "hangoutsMeet"}
                }
            }
            
        res = requests.post(url, headers=headers, json=event_body, timeout=15)
        if res.status_code in (200, 201):
            event_data = res.json()
            meet_link = event_data.get("conferenceData", {}).get("entryPoints", [{}])[0].get("uri", "")
            return {
                "success": True,
                "event_id": event_data.get("id"),
                "html_link": event_data.get("htmlLink"),
                "meet_link": meet_link
            }
        else:
            return {"success": False, "error": f"Google API error: {res.status_code} - {res.text}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def refresh_calendly_oauth_token(cursor, conn, agent_id, config_json):
    """
    Refresca el token OAuth de Calendly si es necesario y actualiza la base de datos.
    """
    token_expiry = config_json.get("calendly_token_expiry", 0)
    refresh_token = config_json.get("calendly_refresh_token")
    access_token = config_json.get("calendly_access_token")
    
    # Si expira en más de 60 segundos, el actual sigue siendo válido
    if token_expiry and (token_expiry - time.time() > 60):
        return access_token
        
    if not refresh_token:
        logger.warning(f"No se encontró refresh token de Calendly para agente {agent_id}.")
        return access_token
        
    client_id = os.getenv("CALENDLY_CLIENT_ID")
    client_secret = os.getenv("CALENDLY_CLIENT_SECRET")
    
    if not client_id or not client_secret:
        logger.error("Credenciales de Calendly Client ID o Secret no configuradas en el entorno.")
        return access_token
        
    try:
        url = "https://auth.calendly.com/oauth/token"
        payload = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token,
            "client_id": client_id,
            "client_secret": client_secret
        }
        res = requests.post(url, data=payload, timeout=15)
        if res.status_code == 200:
            tokens = res.json()
            new_access_token = tokens.get("access_token")
            new_refresh = tokens.get("refresh_token") or refresh_token
            expires_in = tokens.get("expires_in", 7200)
            
            if new_access_token:
                config_json["calendly_access_token"] = new_access_token
                config_json["calendly_refresh_token"] = new_refresh
                config_json["calendly_token_expiry"] = time.time() + expires_in
                
                # Actualizar DB
                cursor.execute(
                    "UPDATE agentes_ia SET config_comportamiento = %s WHERE id = %s",
                    (json.dumps(config_json), agent_id)
                )
                conn.commit()
                logger.info(f"Calendly OAuth token refrescado con éxito para agente {agent_id}.")
                return new_access_token
        else:
            logger.error(f"Error al refrescar token de Calendly: {res.status_code} - {res.text}")
    except Exception as e:
        logger.error(f"Excepción al refrescar token de Calendly: {e}")
        
    return access_token


def list_calendly_event_types(access_token):
    """
    Obtiene los tipos de evento activos de Calendly y sus enlaces de reserva.
    """
    try:
        url = "https://api.calendly.com/event_types"
        headers = {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json"
        }
        # Obtener el usuario URI actual de Calendly
        me_res = requests.get("https://api.calendly.com/users/me", headers=headers, timeout=15)
        if me_res.status_code == 200:
            user_uri = me_res.json().get("resource", {}).get("uri")
            if user_uri:
                params = {"user": user_uri}
                res = requests.get(url, headers=headers, params=params, timeout=15)
                if res.status_code == 200:
                    data = res.json()
                    events = []
                    for et in data.get("collection", []):
                        if et.get("active"):
                            events.append({
                                "name": et.get("name"),
                                "scheduling_url": et.get("scheduling_url"),
                                "description": et.get("description_plain") or et.get("description") or ""
                            })
                    return {"success": True, "event_types": events}
        return {"success": False, "error": f"No se pudo obtener información del usuario. Status: {me_res.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}


def list_calcom_event_types(api_key, event_id=None):
    """
    Obtiene los tipos de evento activos de Cal.com y sus enlaces de reserva usando la API key.
    """
    try:
        url = "https://api.cal.com/v1/event-types"
        params = {"apiKey": api_key}
        res = requests.get(url, params=params, timeout=15)
        if res.status_code == 200:
            data = res.json()
            event_types = data.get("eventtypes") if isinstance(data, dict) else data
            if not isinstance(event_types, list):
                event_types = []
                
            events = []
            for et in event_types:
                if event_id and str(et.get("id")) != str(event_id):
                    continue
                slug = et.get("slug")
                scheduling_url = et.get("schedulingUrl")
                if not scheduling_url and slug:
                    owner = et.get("users", [{}])[0] if et.get("users") else {}
                    username = owner.get("username") or "booking"
                    scheduling_url = f"https://cal.com/{username}/{slug}"
                    
                events.append({
                    "id": et.get("id"),
                    "name": et.get("title") or et.get("name"),
                    "scheduling_url": scheduling_url or f"https://cal.com/event-types/{et.get('id')}",
                    "description": et.get("description") or ""
                })
            return {"success": True, "event_types": events}
        else:
            return {"success": False, "error": f"API de Cal.com retornó status: {res.status_code}"}
    except Exception as e:
        return {"success": False, "error": str(e)}

