-- ============================================================
-- GeoChat: Migración de Planes + Integración Hotmart
-- Paso 1: Base de Datos
-- Ejecutar en tu servidor MySQL/MariaDB
-- ============================================================

-- ============================================================
-- PARTE A: Agregar columnas faltantes a tabla `planes`
-- ============================================================

ALTER TABLE planes
  -- Accesos multiagente (usuarios humanos del equipo por cuenta)
  -- Starter=1, Growth=3, Advanced=5
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

-- ============================================================
-- PARTE B: Agregar columnas de Hotmart a tabla `usuarios`
-- ============================================================

ALTER TABLE usuarios
  ADD COLUMN IF NOT EXISTS hotmart_subscriber_code VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS hotmart_purchase_id     VARCHAR(100) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS contrasena_temporal     TINYINT(1)  NOT NULL DEFAULT 0;

-- Índice único para búsqueda rápida por código de suscriptor
CREATE UNIQUE INDEX IF NOT EXISTS idx_hotmart_subscriber
  ON usuarios (hotmart_subscriber_code);

-- ============================================================
-- PARTE C: Crear/Actualizar registros de cada plan
-- (Valores exactos según imágenes de FunnelChat/Hotmart)
-- ============================================================

-- ─────────────────────────────
-- PLAN: Gratis (sin suscripción)
-- ─────────────────────────────
INSERT INTO planes (nombre, descripcion,
  precio_mensual, precio_anual,
  max_dispositivos, max_agentes, max_contactos,
  max_envios_masivos, max_automatizaciones,
  permite_ia, permite_whalink, permite_grupos, permite_campanas,
  max_accesos_multiagente, permite_cloud_api,
  permite_todos_objetivos_ia, permite_ia_grupos,
  incluye_sesion_inicial, permite_soporte_chat, permite_reuniones,
  permite_grupo_soporte, permite_key_account, max_sesiones_personalizadas
) VALUES (
  'Gratis', 'Plan gratuito de prueba limitado.',
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
  max_dispositivos=1, max_agentes=1, max_contactos=100,
  permite_ia=0, max_accesos_multiagente=1,
  permite_todos_objetivos_ia=0, permite_cloud_api=0;

-- ─────────────────────────────────────────────────────────
-- PLAN: Starter ($49/mes | $41/mes anual — $490 único pago)
-- ─────────────────────────────────────────────────────────
-- Agentes IA: ILIMITADOS pero solo objetivo FAQ
INSERT INTO planes (nombre, descripcion,
  precio_mensual, precio_anual,
  max_dispositivos, max_agentes, max_contactos,
  max_envios_masivos, max_automatizaciones,
  permite_ia, permite_whalink, permite_grupos, permite_campanas,
  max_accesos_multiagente, permite_cloud_api,
  permite_todos_objetivos_ia, permite_ia_grupos,
  incluye_sesion_inicial, permite_soporte_chat, permite_reuniones,
  permite_grupo_soporte, permite_key_account, max_sesiones_personalizadas
) VALUES (
  'Starter', 'Ideal para emprendedores que quieren iniciar con WhatsApp profesional.',
  49.00, 41.00,
  1,    -- 1 Número de WhatsApp Business
  -1,   -- Agentes IA ilimitados (-1 = sin límite)
  3500, -- Hasta 3,500 MACs
  -1,   -- Envíos Masivos ilimitados
  -1,   -- Automatizaciones ilimitadas
  1,    -- ✅ Plan con IA
  0,    -- ❌ Automatizaciones con IA (solo Advanced)
  1,    -- ✅ Grupos y Comunidades
  1,    -- ✅ Campañas / Envíos masivos
  1,    -- 1 acceso multiagente (solo el dueño)
  1,    -- ✅ 1 número WhatsApp Cloud API
  0,    -- ❌ Objetivos IA: solo FAQ (no TODOS)
  0,    -- ❌ Funciones IA de Grupos (solo Advanced)
  1,    -- ✅ Sesión Inicial INCLUIDA $100 USD
  1,    -- ✅ Chat y WhatsApp soporte L-D y festivos
  1,    -- ✅ Reuniones en Zoom y Meet diarias
  0,    -- ❌ Grupo de Soporte Personalizado
  0,    -- ❌ Key Account Manager
  0     -- ❌ Sesiones Personalizadas
)
ON DUPLICATE KEY UPDATE
  precio_mensual=49.00, precio_anual=41.00,
  max_dispositivos=1, max_agentes=-1, max_contactos=3500,
  max_envios_masivos=-1, max_automatizaciones=-1,
  permite_ia=1, permite_whalink=0, permite_grupos=1, permite_campanas=1,
  max_accesos_multiagente=1, permite_cloud_api=1,
  permite_todos_objetivos_ia=0, permite_ia_grupos=0,
  incluye_sesion_inicial=1, permite_soporte_chat=1, permite_reuniones=1,
  permite_grupo_soporte=0, permite_key_account=0, max_sesiones_personalizadas=0;

-- ──────────────────────────────────────────────────────────
-- PLAN: Growth ($99/mes | $83/mes anual — $990 único pago)
-- ──────────────────────────────────────────────────────────
-- Agentes IA: ILIMITADOS pero solo objetivo FAQ
INSERT INTO planes (nombre, descripcion,
  precio_mensual, precio_anual,
  max_dispositivos, max_agentes, max_contactos,
  max_envios_masivos, max_automatizaciones,
  permite_ia, permite_whalink, permite_grupos, permite_campanas,
  max_accesos_multiagente, permite_cloud_api,
  permite_todos_objetivos_ia, permite_ia_grupos,
  incluye_sesion_inicial, permite_soporte_chat, permite_reuniones,
  permite_grupo_soporte, permite_key_account, max_sesiones_personalizadas
) VALUES (
  'Growth', 'Ideal para negocios con equipos de trabajo que priorizan la atención al cliente por WhatsApp.',
  99.00, 83.00,
  2,    -- 2 Números de WhatsApp Business
  -1,   -- Agentes IA ilimitados
  8000, -- Hasta 8,000 MACs
  -1,   -- Envíos Masivos ilimitados
  -1,   -- Automatizaciones ilimitadas
  1,    -- ✅ Plan con IA
  0,    -- ❌ Automatizaciones con IA (solo Advanced)
  1,    -- ✅ Grupos y Comunidades
  1,    -- ✅ Campañas
  3,    -- 3 accesos multiagente
  1,    -- ✅ 1 número WhatsApp Cloud API
  0,    -- ❌ Objetivos IA: solo FAQ (no TODOS)
  0,    -- ❌ Funciones IA de Grupos (solo Advanced)
  1,    -- ✅ Sesión Inicial INCLUIDA
  1,    -- ✅ Chat y WhatsApp soporte
  1,    -- ✅ Reuniones Zoom y Meet
  0,    -- ❌ Grupo Soporte Personalizado
  0,    -- ❌ Key Account Manager
  0     -- ❌ Sesiones Personalizadas
)
ON DUPLICATE KEY UPDATE
  precio_mensual=99.00, precio_anual=83.00,
  max_dispositivos=2, max_agentes=-1, max_contactos=8000,
  max_envios_masivos=-1, max_automatizaciones=-1,
  permite_ia=1, permite_whalink=0, permite_grupos=1, permite_campanas=1,
  max_accesos_multiagente=3, permite_cloud_api=1,
  permite_todos_objetivos_ia=0, permite_ia_grupos=0,
  incluye_sesion_inicial=1, permite_soporte_chat=1, permite_reuniones=1,
  permite_grupo_soporte=0, permite_key_account=0, max_sesiones_personalizadas=0;

-- ────────────────────────────────────────────────────────────────
-- PLAN: Advanced ($199/mes | $166/mes anual — $1990 único pago)
-- ────────────────────────────────────────────────────────────────
-- Agentes IA: ILIMITADOS con TODOS los objetivos disponibles
INSERT INTO planes (nombre, descripcion,
  precio_mensual, precio_anual,
  max_dispositivos, max_agentes, max_contactos,
  max_envios_masivos, max_automatizaciones,
  permite_ia, permite_whalink, permite_grupos, permite_campanas,
  max_accesos_multiagente, permite_cloud_api,
  permite_todos_objetivos_ia, permite_ia_grupos,
  incluye_sesion_inicial, permite_soporte_chat, permite_reuniones,
  permite_grupo_soporte, permite_key_account, max_sesiones_personalizadas
) VALUES (
  'Advanced', 'Ideal para negocios con equipos de trabajo que requieren integraciones adicionales, funciones avanzadas y soporte premium.',
  199.00, 166.00,
  3,     -- 3 Números de WhatsApp Business
  -1,    -- Agentes IA ilimitados
  30000, -- Hasta 30,000 MACs
  -1,    -- Envíos Masivos ilimitados
  -1,    -- Automatizaciones ilimitadas
  1,     -- ✅ Plan con IA
  1,     -- ✅ Automatizaciones con IA
  1,     -- ✅ Grupos y Comunidades
  1,     -- ✅ Campañas
  5,     -- 5 accesos multiagente
  1,     -- ✅ 1 número WhatsApp Cloud API
  1,     -- ✅ Objetivos IA: TODOS (ventas, citas, leads, FAQ, etc.)
  1,     -- ✅ Funciones IA de Grupos y Comunidades
  1,     -- ✅ Sesión Inicial INCLUIDA
  1,     -- ✅ Chat y WhatsApp soporte
  1,     -- ✅ Reuniones Zoom y Meet diarias
  1,     -- ✅ Grupo de Soporte Personalizado
  1,     -- ✅ Key Account Manager
  0      -- ❌ Sesiones Personalizadas (solo plan Personalizado)
)
ON DUPLICATE KEY UPDATE
  precio_mensual=199.00, precio_anual=166.00,
  max_dispositivos=3, max_agentes=-1, max_contactos=30000,
  max_envios_masivos=-1, max_automatizaciones=-1,
  permite_ia=1, permite_whalink=1, permite_grupos=1, permite_campanas=1,
  max_accesos_multiagente=5, permite_cloud_api=1,
  permite_todos_objetivos_ia=1, permite_ia_grupos=1,
  incluye_sesion_inicial=1, permite_soporte_chat=1, permite_reuniones=1,
  permite_grupo_soporte=1, permite_key_account=1, max_sesiones_personalizadas=0;

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
