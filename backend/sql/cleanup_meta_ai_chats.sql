-- ============================================================
-- LIMPIEZA DE CHATS DE META AI
-- Elimina contactos, chats y mensajes de Meta AI (0@s.whatsapp.net)
-- y cualquier contacto cuyo nombre contenga "Meta AI"
-- ============================================================

-- 1. Eliminar mensajes de Meta AI
DELETE FROM mensajes
WHERE chat_jid = '0@s.whatsapp.net'
   OR chat_jid IN (
       SELECT jid FROM contactos
       WHERE LOWER(TRIM(COALESCE(nombre, push_name, verified_name, notify_name, ''))) LIKE '%meta ai%'
   );

-- 2. Eliminar chats de Meta AI
DELETE FROM chats
WHERE jid = '0@s.whatsapp.net'
   OR jid IN (
       SELECT jid FROM contactos
       WHERE LOWER(TRIM(COALESCE(nombre, push_name, verified_name, notify_name, ''))) LIKE '%meta ai%'
   );

-- 3. Eliminar contactos de Meta AI
DELETE FROM contactos
WHERE jid = '0@s.whatsapp.net'
   OR LOWER(TRIM(COALESCE(nombre, push_name, verified_name, notify_name, ''))) LIKE '%meta ai%';

-- 4. Verificar limpieza
SELECT 'Contactos restantes con Meta AI:' AS info,
       COUNT(*) AS total
FROM contactos
WHERE jid = '0@s.whatsapp.net'
   OR LOWER(TRIM(COALESCE(nombre, push_name, verified_name, notify_name, ''))) LIKE '%meta ai%';
