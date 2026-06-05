-- ============================================================
-- merge_lid_duplicates.sql
-- Fusiona contactos duplicados @lid con su equivalente @s.whatsapp.net
--
-- ¿Por qué existen duplicados?
-- WhatsApp multi-device asigna LIDs (Linked IDs) internos a los contactos.
-- Cuando un mensaje llega antes de que el bridge resuelva el LID al número
-- real, se crea un registro extra con JID tipo "12345@lid".
--
-- Ejecuta este script una vez para limpiar la DB existente.
-- ============================================================

-- Paso 1: Transferir foto_perfil del @lid al @s.whatsapp.net si le falta
UPDATE contactos AS pn
INNER JOIN contactos AS lid
  ON lid.dispositivo_id = pn.dispositivo_id
  AND lid.lid = pn.jid          -- el @lid apunta al JID real en su columna lid
  AND lid.jid LIKE '%@lid'
  AND pn.jid LIKE '%@s.whatsapp.net'
SET
  pn.foto_perfil    = COALESCE(pn.foto_perfil,    lid.foto_perfil),
  pn.nombre         = COALESCE(pn.nombre,         lid.nombre),
  pn.push_name      = COALESCE(pn.push_name,      lid.push_name),
  pn.verified_name  = COALESCE(pn.verified_name,  lid.verified_name),
  pn.notify_name    = COALESCE(pn.notify_name,    lid.notify_name),
  pn.last_timestamp = GREATEST(COALESCE(pn.last_timestamp, 0), COALESCE(lid.last_timestamp, 0)),
  pn.actualizado_en = NOW()
WHERE pn.dispositivo_id IS NOT NULL;

-- Paso 2: Redirigir mensajes que quedaron guardados con el JID @lid
--         hacia el JID @s.whatsapp.net correcto
UPDATE mensajes AS m
INNER JOIN contactos AS lid
  ON lid.dispositivo_id = m.dispositivo_id
  AND lid.jid = m.chat_jid
  AND lid.jid LIKE '%@lid'
INNER JOIN contactos AS pn
  ON pn.dispositivo_id = lid.dispositivo_id
  AND pn.jid = lid.lid
  AND pn.jid LIKE '%@s.whatsapp.net'
SET m.chat_jid = pn.jid
WHERE m.chat_jid LIKE '%@lid';

-- Paso 3: Redirigir chats @lid → @s.whatsapp.net
UPDATE chats AS ch
INNER JOIN contactos AS lid
  ON lid.dispositivo_id = ch.dispositivo_id
  AND lid.jid = ch.jid
  AND lid.jid LIKE '%@lid'
INNER JOIN contactos AS pn
  ON pn.dispositivo_id = lid.dispositivo_id
  AND pn.jid = lid.lid
  AND pn.jid LIKE '%@s.whatsapp.net'
SET
  ch.jid            = pn.jid,
  ch.nombre         = COALESCE(pn.nombre, ch.nombre),
  ch.actualizado_en = NOW()
WHERE ch.jid LIKE '%@lid';

-- Paso 4: Eliminar los registros @lid huérfanos de contactos
DELETE FROM contactos
WHERE jid LIKE '%@lid';

-- Paso 5: Eliminar chats @lid que no se pudieron redirigir (sin PN equivalente)
DELETE FROM chats
WHERE jid LIKE '%@lid';

SELECT 'Limpieza de duplicados @lid completada.' AS resultado;
