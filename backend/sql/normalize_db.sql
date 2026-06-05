-- Normalización de la Base de Datos GEO-CHAT
-- Fecha: 2026-04-21
-- Objetivo: Eliminar valores nulos críticos y ajustar zona horaria a GMT-5 (Ecuador)

USE funnelchat_dev;

-- 1. Asegurar valores por defecto para campos de tipo de media
UPDATE chats SET last_media_type = 'texto' WHERE last_media_type IS NULL OR last_media_type = '';
UPDATE contactos SET last_media_type = 'texto' WHERE last_media_type IS NULL OR last_media_type = '';
UPDATE mensajes SET tipo = 'texto' WHERE tipo IS NULL OR tipo = '';

-- 2. Asegurar que ultimo_mensaje no sea NULL para evitar crasheos en el frontend
UPDATE chats SET ultimo_mensaje = '[Mensaje]' WHERE ultimo_mensaje IS NULL;
UPDATE contactos SET ultimo_mensaje = '[Mensaje]' WHERE ultimo_mensaje IS NULL;

-- 3. Asignar dispositivo por defecto si no existe (basado en el primer dispositivo conectado)
-- Nota: Esto es preventivo por si hay registros huérfanos
SET @default_device = (SELECT id FROM dispositivos WHERE estado = 'conectado' LIMIT 1);
UPDATE chats SET dispositivo_id = @default_device WHERE dispositivo_id IS NULL AND @default_device IS NOT NULL;

-- 4. Normalización de Timestamps a GMT-5 (Ecuador)
-- Asumiendo que los datos actuales están en UTC (por el uso de .toISOString() en el bridge anterior)
-- Restamos 5 horas para convertir UTC a GMT-5.

UPDATE chats 
SET ultimo_mensaje_fecha = DATE_SUB(ultimo_mensaje_fecha, INTERVAL 5 HOUR),
    actualizado_en = DATE_SUB(actualizado_en, INTERVAL 5 HOUR),
    creado_en = DATE_SUB(creado_en, INTERVAL 5 HOUR)
WHERE ultimo_mensaje_fecha > '2000-01-01'; -- Evitar valores nulos o base

UPDATE mensajes 
SET fecha_mensaje = DATE_SUB(fecha_mensaje, INTERVAL 5 HOUR),
    creado_en = DATE_SUB(creado_en, INTERVAL 5 HOUR)
WHERE fecha_mensaje > '2000-01-01';

UPDATE contactos 
SET ultima_vez_visto = DATE_SUB(ultima_vez_visto, INTERVAL 5 HOUR),
    actualizado_en = DATE_SUB(actualizado_en, INTERVAL 5 HOUR),
    creado_en = DATE_SUB(creado_en, INTERVAL 5 HOUR)
WHERE ultima_vez_visto > '2000-01-01';

-- 5. Modificar las tablas para que tengan valores por defecto y no permitan NULLs en campos críticos
ALTER TABLE chats 
MODIFY COLUMN last_media_type varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'texto',
MODIFY COLUMN ultimo_mensaje text COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE contactos 
MODIFY COLUMN last_media_type varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'texto',
MODIFY COLUMN ultimo_mensaje text COLLATE utf8mb4_unicode_ci NOT NULL;

ALTER TABLE mensajes 
MODIFY COLUMN tipo varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'texto';
