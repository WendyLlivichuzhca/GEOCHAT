ALTER TABLE dispositivos
  ADD COLUMN IF NOT EXISTS session_auth LONGTEXT COLLATE utf8mb4_unicode_ci NULL
  AFTER codigo_qr;
