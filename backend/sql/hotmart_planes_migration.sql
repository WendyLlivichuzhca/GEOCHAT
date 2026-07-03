-- ============================================================
-- GeoChat: Migración de Planes + Integración Hotmart
-- Paso 1: Base de Datos
-- Ejecutar en tu servidor MySQL/MariaDB (HeidiSQL, phpMyAdmin, etc.)
-- ============================================================

-- Desactivar llaves foráneas temporalmente para limpiar duplicados
SET FOREIGN_KEY_CHECKS = 0;
TRUNCATE TABLE planes;

-- ============================================================
-- PARTE A: Agregar columnas faltantes a tabla `planes`
-- ============================================================

ALTER TABLE planes
  -- Accesos multiagente (usuarios humanos del equipo por cuenta)
  ADD COLUMN IF NOT EXISTS max_accesos_multiagente      INT         NOT NULL DEFAULT 1,
  -- WhatsApp Cloud API (1 número Cloud API incluido en todos los planes)
  ADD COLUMN IF NOT EXISTS permite_cloud_api            TINYINT(1)  NOT NULL DEFAULT 0,
  -- Objetivos del agente IA: 0=solo FAQ, 1=TODOS (Starter/Growth=FAQ, Advanced=TODOS)
  ADD COLUMN IF NOT EXISTS permite_todos_objetivos_ia   TINYINT(1)  NOT NULL DEFAULT 0,
  -- Funciones IA de grupos y comunidades (solo Advanced)
  ADD COLUMN IF NOT EXISTS permite_ia_grupos            TINYINT(1)  NOT NULL DEFAULT 0,
  -- Sesión inicial de onboarding incluida ($100 USD)
  ADD COLUMN IF NOT EXISTS incluye_sesion_inicial       TINYINT(1)  NOT NULL DEFAULT 0,
  -- Soporte: chat y WhatsApp lunes a domingo y festivos
  ADD COLUMN IF NOT EXISTS permite_soporte_chat         TINYINT(1)  NOT NULL DEFAULT 0,
  -- Soporte: reuniones Zoom/Meet diarias
  ADD COLUMN IF NOT EXISTS permite_reuniones            TINYINT(1)  NOT NULL DEFAULT 0,
  -- Soporte: grupo de soporte personalizado (solo Advanced)
  ADD COLUMN IF NOT EXISTS permite_grupo_soporte        TINYINT(1)  NOT NULL DEFAULT 0,
  -- Soporte: Key Account Manager (solo Advanced)
  ADD COLUMN IF NOT EXISTS permite_key_account          TINYINT(1)  NOT NULL DEFAULT 0,
  -- Sesiones personalizadas 1 a 1 (solo plan Personalizado)
  ADD COLUMN IF NOT EXISTS max_sesiones_personalizadas  INT         NOT NULL DEFAULT 0;

-- Asegurar que el campo "nombre" sea único para evitar duplicaciones a futuro
ALTER TABLE planes ADD UNIQUE KEY IF NOT EXISTS idx_unique_plan_nombre (nombre);

-- ============================================================
-- PARTE B: Agregar columnas de Hotmart a tabla `usuarios`
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS hotmart_subscriber_code VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hotmart_purchase_id     VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contrasena_temporal     TINYINT(1)  NOT NULL DEFAULT 0;

CREATE UNIQUE INDEX IF NOT EXISTS idx_hotmart_subscriber
  ON usuarios (hotmart_subscriber_code);

-- ============================================================
-- PARTE C: Crear los registros limpios con IDs fijos (1 al 5)
-- ============================================================

-- ─────────────────────────────
-- PLAN 1: Gratis
-- ─────────────────────────────
INSERT INTO planes (id, nombre, descripcion,
  precio_mensual, precio_anual,
  max_dispositivos, max_agentes, max_contactos,
  max_envios_masivos, max_automatizaciones,
  permite_ia, permite_whalink, permite_grupos, permite_campanas,
  max_accesos_multiagente, permite_cloud_api,
  permite_todos_objetivos_ia, permite_ia_grupos,
  incluye_sesion_inicial, permite_soporte_chat, permite_reuniones,
  permite_grupo_soporte, permite_key_account, max_sesiones_personalizadas
) VALUES (
  1, 'Gratis', 'Plan gratuito de prueba limitado.',
  0.00, 0.00,
  1, 1, 100,
  0, 0,
  0, 0, 0, 0,
  1, 0,
  0, 0,
  0, 0, 0,
  0, 0, 0
)
ON DUPLICATE KEY UPDATE
  max_dispositivos=1, max_agentes=1, max_contactos=100, permite_ia=0;

-- ─────────────────────────────
-- PLAN 2: Starter
-- ─────────────────────────────
INSERT INTO planes (id, nombre, descripcion,
  precio_mensual, precio_anual,
  max_dispositivos, max_agentes, max_contactos,
  max_envios_masivos, max_automatizaciones,
  permite_ia, permite_whalink, permite_grupos, permite_campanas,
  max_accesos_multiagente, permite_cloud_api,
  permite_todos_objetivos_ia, permite_ia_grupos,
  incluye_sesion_inicial, permite_soporte_chat, permite_reuniones,
  permite_grupo_soporte, permite_key_account, max_sesiones_personalizadas
) VALUES (
  2, 'Starter', 'Ideal para emprendedores que quieren iniciar con WhatsApp profesional.',
  49.00, 41.00,
  1, -1, 3500,
  -1, -1,
  1, 0, 1, 1,
  1, 1,
  0, 0,
  1, 1, 1,
  0, 0, 0
)
ON DUPLICATE KEY UPDATE
  precio_mensual=49.00, precio_anual=41.00,
  max_dispositivos=1, max_agentes=-1, max_contactos=3500,
  max_accesos_multiagente=1, permite_cloud_api=1;

-- ─────────────────────────────
-- PLAN 3: Growth
-- ─────────────────────────────
INSERT INTO planes (id, nombre, descripcion,
  precio_mensual, precio_anual,
  max_dispositivos, max_agentes, max_contactos,
  max_envios_masivos, max_automatizaciones,
  permite_ia, permite_whalink, permite_grupos, permite_campanas,
  max_accesos_multiagente, permite_cloud_api,
  permite_todos_objetivos_ia, permite_ia_grupos,
  incluye_sesion_inicial, permite_soporte_chat, permite_reuniones,
  permite_grupo_soporte, permite_key_account, max_sesiones_personalizadas
) VALUES (
  3, 'Growth', 'Ideal para negocios con equipos de trabajo que priorizan la atención al cliente por WhatsApp.',
  99.00, 83.00,
  2, -1, 8000,
  -1, -1,
  1, 0, 1, 1,
  3, 1,
  0, 0,
  1, 1, 1,
  0, 0, 0
)
ON DUPLICATE KEY UPDATE
  precio_mensual=99.00, precio_anual=83.00,
  max_dispositivos=2, max_agentes=-1, max_contactos=8000,
  max_accesos_multiagente=3, permite_cloud_api=1;

-- ─────────────────────────────
-- PLAN 4: Advanced
-- ─────────────────────────────
INSERT INTO planes (id, nombre, descripcion,
  precio_mensual, precio_anual,
  max_dispositivos, max_agentes, max_contactos,
  max_envios_masivos, max_automatizaciones,
  permite_ia, permite_whalink, permite_grupos, permite_campanas,
  max_accesos_multiagente, permite_cloud_api,
  permite_todos_objetivos_ia, permite_ia_grupos,
  incluye_sesion_inicial, permite_soporte_chat, permite_reuniones,
  permite_grupo_soporte, permite_key_account, max_sesiones_personalizadas
) VALUES (
  4, 'Advanced', 'Ideal para negocios con equipos de trabajo que requieren integraciones adicionales, funciones avanzadas y soporte premium.',
  199.00, 166.00,
  3, -1, 30000,
  -1, -1,
  1, 1, 1, 1,
  5, 1,
  1, 1,
  1, 1, 1,
  1, 1, 0
)
ON DUPLICATE KEY UPDATE
  precio_mensual=199.00, precio_anual=166.00,
  max_dispositivos=3, max_agentes=-1, max_contactos=30000,
  max_accesos_multiagente=5, permite_cloud_api=1;

-- ─────────────────────────────
-- PLAN 5: Personalizado
-- ─────────────────────────────
INSERT INTO planes (id, nombre, descripcion,
  precio_mensual, precio_anual,
  max_dispositivos, max_agentes, max_contactos,
  max_envios_masivos, max_automatizaciones,
  permite_ia, permite_whalink, permite_grupos, permite_campanas,
  max_accesos_multiagente, permite_cloud_api,
  permite_todos_objetivos_ia, permite_ia_grupos,
  incluye_sesion_inicial, permite_soporte_chat, permite_reuniones,
  permite_grupo_soporte, permite_key_account, max_sesiones_personalizadas
) VALUES (
  5, 'Personalizado', 'Soluciones personalizadas para negocios con grandes equipos de trabajo que requieren más, para escalar aún más.',
  0.00, 0.00,
  10, -1, 100000,
  -1, -1,
  1, 1, 1, 1,
  15, 1,
  1, 1,
  1, 1, 1,
  1, 1, 3
)
ON DUPLICATE KEY UPDATE
  precio_mensual=0.00, precio_anual=0.00,
  max_dispositivos=10, max_agentes=-1, max_contactos=100000,
  incluye_sesion_inicial=1, permite_soporte_chat=1, permite_reuniones=1,
  permite_grupo_soporte=1, permite_key_account=1, max_sesiones_personalizadas=3;

-- ============================================================
-- VERIFICACIÓN FINAL: Ver todos los planes creados
-- ============================================================
SELECT
  id,
  nombre,
  CONCAT('$', precio_mensual, '/mes | $', precio_anual, '/mes anual') AS precio,
  max_dispositivos AS 'WA Business',
  max_accesos_multiagente AS 'Multiagente',
  max_contactos AS 'MACs',
  permite_cloud_api AS 'Cloud API',
  permite_ia AS 'IA',
  permite_whalink AS 'Automatiz+IA',
  permite_ia_grupos AS 'IA Grupos',
  incluye_sesion_inicial AS 'Sesion',
  permite_soporte_chat AS 'Soporte Chat',
  permite_reuniones AS 'Reuniones',
  permite_grupo_soporte AS 'Grupo Sop.',
  permite_key_account AS 'Key Acc.'
FROM planes
ORDER BY precio_mensual ASC;
