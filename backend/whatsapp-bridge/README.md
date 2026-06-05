# GEO-CHAT WhatsApp Bridge

Puente Node.js para conectar WhatsApp con Baileys y persistir la sesion en MariaDB.

## Reglas aplicadas

- No usa carpetas locales de sesion.
- No usa `creds.json`.
- Guarda credenciales y signal keys en `dispositivos.session_auth`.
- Guarda el QR actual en `dispositivos.codigo_qr`.
- Actualiza `dispositivos.estado` con `conectando`, `conectado` o `desconectado`.
- Ignora `contacts` de `messaging-history.set`.
- Sincroniza solo `chats` conversacionales.
- Crea contactos/grupos desde historial y mensajes entrantes.

## Instalacion

```powershell
cd backend\whatsapp-bridge
npm install
```

## Variables de entorno

Usa las mismas variables de base que Flask:

```powershell
$env:DB_HOST="localhost"
$env:DB_PORT="3306"
$env:DB_USER="root"
$env:DB_PASSWORD=""
$env:DB_NAME="funnelchat_dev"
```

## Ejecucion

Primero debe existir un registro en `dispositivos` para el usuario.

```powershell
node bridge.js --user-id=4 --device-id=1
```

Tambien se puede usar:

```powershell
$env:WA_USER_ID="4"
$env:WA_DEVICE_ID="1"
npm start
```

## Columna requerida

El bridge crea automaticamente la columna `session_auth` si no existe.
Tambien queda disponible el SQL manual:

```sql
ALTER TABLE dispositivos
  ADD COLUMN IF NOT EXISTS session_auth LONGTEXT COLLATE utf8mb4_unicode_ci NULL
  AFTER codigo_qr;
```

## Seguridad

No copies `sessions`, `.auth`, `.wwebjs_auth`, `.wwebjs_cache` ni `creds.json` desde otros proyectos.
La sesion de WhatsApp debe nacer desde el QR de este proyecto.
