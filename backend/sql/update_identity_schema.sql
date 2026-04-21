-- Actualización de Esquema para Identidad Completa e Historial
-- Objetivo: Añadir soporte para bios (estados), expandir URLs de fotos y optimizar búsqueda

USE funnelchat_dev;

-- 1. Ampliar longitud de foto_perfil para URLs de alta resolución
ALTER TABLE contactos MODIFY COLUMN foto_perfil varchar(1024) COLLATE utf8mb4_unicode_ci;
ALTER TABLE grupos MODIFY COLUMN foto_perfil varchar(1024) COLLATE utf8mb4_unicode_ci;

-- 2. Añadir columna 'estado' (bio) a contactos si no existe
ALTER TABLE contactos ADD COLUMN estado text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER push_name;

-- 3. Añadir índices para mejorar la velocidad de sincronización y búsqueda
-- Índice para buscar fotos faltantes rápidamente
CREATE INDEX idx_contactos_foto_perfil ON contactos(dispositivo_id, foto_perfil(10));
CREATE INDEX idx_grupos_foto_perfil ON grupos(dispositivo_id, foto_perfil(10));

-- Índice para ordenamiento por fecha de mensaje (crítico para historial)
CREATE INDEX idx_mensajes_fecha_chat ON mensajes(chat_jid, fecha_mensaje DESC);

-- 4. Asegurar que las tablas de mensajes soporten caracteres especiales de WhatsApp
ALTER TABLE mensajes CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE chats CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE contactos CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
