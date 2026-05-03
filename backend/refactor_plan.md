# Plan de Refactorización: GEO-CHAT Backend

## Objetivo
Dividir el archivo `main.py` (5300+ líneas) en módulos lógicos para mejorar la mantenibilidad, legibilidad y escalabilidad del proyecto.

## Nueva Estructura Propuesta (Carpeta `backend/`)

```text
backend/
├── app_config.py          # Configuración de Flask, JWT y variables de entorno
├── database.py            # Gestión de conexiones MySQL (get_connection)
├── main.py                # Punto de entrada (solo imports y arranque del servidor)
├── services/
│   ├── automation_engine.py # Lógica de ejecución de flujos (execute_automation_flow)
│   ├── whatsapp_service.py  # Funciones auxiliares de WhatsApp (send_bridge_message)
│   └── media_service.py     # Gestión de archivos y subidas
└── routes/
    ├── auth.py            # Rutas de Login / Registro
    ├── automation.py      # CRUD de Automatizaciones y Carpetas
    ├── whatsapp.py        # Webhook y eventos en tiempo real
    ├── contacts.py        # Gestión de contactos
    └── custom_fields.py   # Gestión de campos personalizados
```

## Pasos de Ejecución

### Fase 1: Cimientos
1. **`database.py`**: Mover `get_connection` y configuraciones de BD.
2. **`app_config.py`**: Mover inicialización de `Flask`, `CORS`, `JWT` y logs.

### Fase 2: Servicios (El "Cerebro")
1. **`automation_engine.py`**: Mover `execute_automation_flow`, `trigger_automation_async` y toda la lógica de nodos.
2. **`whatsapp_service.py`**: Mover `send_bridge_message`, `send_bridge_buttons`, etc.

### Fase 3: Rutas (La "Cara" del API)
1. Mover las rutas `@app.route` a sus respectivos archivos usando `Flask Blueprints`.
   - Esto permitirá que cada archivo sea pequeño (200-500 líneas máximo).

## Beneficios
- **Facilidad de Búsqueda**: ¿Quieres cambiar algo del login? Vas a `routes/auth.py`. ¿Algo de la espera? Vas a `automation_engine.py`.
- **Menos Errores**: Al tocar un archivo pequeño, es casi imposible dañar otra parte del sistema.
- **Trabajo en Equipo**: Permite que en el futuro otras personas trabajen en módulos diferentes sin estorbarse.
