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


def create_google_calendar_event(access_token, summary, start_time, end_time, attendee_email=None, description="", create_meet=False):
    """
    Crea un evento en Google Calendar principal con opción de sala de Meet.
    """
    try:
        url = "https://www.googleapis.com/calendar/v3/calendars/primary/events?conferenceDataVersion=1"
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

