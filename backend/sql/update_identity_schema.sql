-- Actualización de Esquema para Identidad Completa
-- Fecha: 2026-04-21

USE funnelchat_dev;

-- 1. Añadir columna estado (bio/status) si no existe
-- Usamos un procedimiento para evitar errores si ya existe
DELIMITER //
CREATE PROCEDURE AddColumnIfNotExist()
BEGIN
    IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_NAME = 'contactos' AND COLUMN_NAME = 'estado' AND TABLE_SCHEMA = 'funnelchat_dev'
    ) THEN
        ALTER TABLE contactos ADD COLUMN estado text COLLATE utf8mb4_unicode_ci DEFAULT NULL AFTER push_name;
    END IF;
END //
DELIMITER ;

CALL AddColumnIfNotExist();
DROP PROCEDURE AddColumnIfNotExist;

-- 2. Asegurar que la columna foto_perfil sea lo suficientemente larga para URLs firmadas (S3/WhatsApp)
ALTER TABLE contactos MODIFY COLUMN foto_perfil text COLLATE utf8mb4_unicode_ci;
ALTER TABLE grupos MODIFY COLUMN foto_perfil text COLLATE utf8mb4_unicode_ci;
ALTER TABLE chats MODIFY COLUMN foto_perfil text COLLATE utf8mb4_unicode_ci;

-- 3. Limpiar fotos de perfil corruptas o muy cortas que no sean URLs válidas para forzar re-sincronización
-- Solo si realmente queremos forzarlo, pero mejor dejar que el Bridge decida.
