import makeWASocket, {
  Browsers,
  BufferJSON,
  DisconnectReason,
  fetchLatestBaileysVersion,
  initAuthCreds,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  proto,
  downloadMediaMessage,
} from '@whiskeysockets/baileys';
import mysql from 'mysql2/promise';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import http from 'http';
import url, { fileURLToPath } from 'url';
import fs from 'fs';
import path from 'path';

const bridgeDir = path.dirname(fileURLToPath(import.meta.url));
const backendDir = path.resolve(bridgeDir, '..');
const mediaRoot = path.join(backendDir, 'media');
const profilePicturesRoot = path.join(mediaRoot, 'imagenes', 'perfiles');

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

function logToSyncAudit(data) {
  const logPath = path.join(process.cwd(), 'sync_audit.log');
  const timestamp = new Date().toISOString();
  const line = `[${timestamp}] ${JSON.stringify(data)}\n`;
  fs.appendFileSync(logPath, line);
}

const baileysLogger = logger.child({ module: 'baileys' });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: Number.parseInt(process.env.DB_PORT || '3306', 10),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'funnelchat_dev',
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: Number.parseInt(process.env.DB_POOL_LIMIT || '10', 10),
};

let pool;
let socket;
let reconnectTimer;
let profilePictureTimer;
let identitySyncTimer;
let reconnectAttempts = 0;
let isShuttingDown = false;
let profilePicturesSyncing = false;
let profilePictureSyncRounds = 0;
const identitySyncQueue = new Map();
const contactIdentityCache = new Map();

function readArg(name) {
  const exact = `--${name}`;
  const prefix = `${exact}=`;
  const index = process.argv.findIndex((arg) => arg === exact);

  if (index !== -1 && process.argv[index + 1]) {
    return process.argv[index + 1];
  }

  const arg = process.argv.find((item) => item.startsWith(prefix));
  return arg ? arg.slice(prefix.length) : null;
}

const runtime = {
  userId: Number.parseInt(readArg('user-id') || process.env.WA_USER_ID || '', 10),
  deviceId: Number.parseInt(readArg('device-id') || process.env.WA_DEVICE_ID || '', 10),
};
const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || 'https://petted-euphemism-helpline.ngrok-free.dev/webhook/whatsapp';
const webhookTimeoutMs = Number.parseInt(process.env.WHATSAPP_WEBHOOK_TIMEOUT_MS || '2500', 10) || 2500;

if (!Number.isInteger(runtime.userId) || !Number.isInteger(runtime.deviceId)) {
  logger.error('Missing required arguments. Use: node bridge.js --user-id=1 --device-id=1');
  process.exit(1);
}
// Lock file
const lockFilePath = path.join(process.cwd(), `.bridge.device${runtime.deviceId}.lock`);
function acquireLock() {
  if (fs.existsSync(lockFilePath)) {
    const existingPid = fs.readFileSync(lockFilePath, 'utf8').trim();
    try {
      process.kill(Number(existingPid), 0);
      logger.error({ deviceId: runtime.deviceId, existingPid }, `Ya hay un bridge corriendo para device-id=${runtime.deviceId} (PID=${existingPid}). Abortando.`);
      process.exit(1);
    } catch { logger.warn({ deviceId: runtime.deviceId }, 'Lockfile huerfano detectado. Sobreescribiendo.'); }
  }
  fs.writeFileSync(lockFilePath, String(process.pid));
}
function releaseLock() {
  try { if (fs.existsSync(lockFilePath)) fs.unlinkSync(lockFilePath); } catch { }
}
process.on('exit', releaseLock);
process.on('SIGINT', () => { releaseLock(); process.exit(0); });
process.on('SIGTERM', () => { releaseLock(); process.exit(0); });
acquireLock();


async function getPool() {
  if (!pool) {
    pool = mysql.createPool(dbConfig);
  }
  return pool;
}

async function execute(sql, params = []) {
  const connection = await getPool();
  const [rows] = await connection.execute(sql, params);
  return rows;
}

async function queryOne(sql, params = []) {
  const rows = await execute(sql, params);
  return rows[0] || null;
}

async function pnFromLid(lid) {
  if (!lid || !isLidJid(lid)) return null;

  // Intento 1: mapeo en tiempo real via socket Baileys
  if (socket?.signalRepository?.lidMapping?.getPNForLID) {
    try {
      const mapped = await socket.signalRepository.lidMapping.getPNForLID(lid);
      if (mapped) return normalizeJid(mapped);
    } catch (e) {
      logger.debug({ lid, error: e.message }, 'LID→PN mapping via socket failed');
    }
  }

  // Intento 2: buscar en DB si ya tenemos el contacto guardado
  try {
    const row = await queryOne(
      'SELECT jid FROM contactos WHERE lid = ? AND dispositivo_id = ? LIMIT 1',
      [lid, runtime.deviceId]
    );
    if (row?.jid) return normalizeJid(row.jid);
  } catch (e) {
    logger.debug({ lid, error: e.message }, 'LID→PN mapping via DB failed');
  }

  return null;
}

async function ensureSessionAuthColumn() {
  const rows = await execute(
    `
    SELECT COUNT(*) AS total
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'dispositivos'
      AND COLUMN_NAME = 'session_auth'
    `
  );

  if (Number(rows[0]?.total || 0) > 0) {
    return;
  }

  await execute(
    `
    ALTER TABLE dispositivos
    ADD COLUMN session_auth LONGTEXT COLLATE utf8mb4_unicode_ci NULL
    AFTER codigo_qr
    `
  );
  logger.info('Column dispositivos.session_auth created');
}

async function ensureChatsTable() {
  await execute(
    `
    CREATE TABLE IF NOT EXISTS chats (
      id int(11) NOT NULL AUTO_INCREMENT,
      dispositivo_id int(11) NOT NULL,
      jid varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
      tipo enum('contacto','grupo') COLLATE utf8mb4_unicode_ci DEFAULT 'contacto',
      nombre varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      mensajes_sin_leer int(11) DEFAULT '0',
      ultimo_mensaje text COLLATE utf8mb4_unicode_ci,
      ultimo_mensaje_fecha datetime DEFAULT NULL,
      last_timestamp int(11) DEFAULT NULL,
      last_media_type varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
      creado_en datetime DEFAULT CURRENT_TIMESTAMP,
      actualizado_en datetime DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY chat_unico (dispositivo_id, jid),
      KEY idx_chats_orden (dispositivo_id, last_timestamp),
      CONSTRAINT chats_ibfk_1 FOREIGN KEY (dispositivo_id) REFERENCES dispositivos (id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `
  );

  const rows = await execute(
    `
    SELECT COUNT(*) AS total
    FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE()
      AND TABLE_NAME = 'chats'
      AND COLUMN_NAME = 'nombre'
    `
  );

  if (Number(rows[0]?.total || 0) === 0) {
    await execute(
      `
      ALTER TABLE chats
      ADD COLUMN nombre varchar(150) COLLATE utf8mb4_unicode_ci DEFAULT NULL
      AFTER tipo
      `
    );
  }
}

async function ensureLightweightChatSchema() {
  await execute(
    `
    ALTER TABLE contactos
    MODIFY COLUMN ultimo_mensaje text COLLATE utf8mb4_unicode_ci NULL
    `
  );
}

async function getDevice() {
  const rows = await execute(
    `
    SELECT id, usuario_id, dispositivo_id, nombre, numero_telefono, estado, session_auth
    FROM dispositivos
    WHERE id = ? AND usuario_id = ?
    LIMIT 1
    `,
    [runtime.deviceId, runtime.userId]
  );

  if (!rows.length) {
    throw new Error(`Device ${runtime.deviceId} does not belong to user ${runtime.userId}`);
  }

  return rows[0];
}

function stringifyAuth(value) {
  return JSON.stringify(value, BufferJSON.replacer);
}

function parseAuth(value) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value, BufferJSON.reviver);
  } catch (error) {
    logger.warn({ error }, 'Invalid session_auth JSON. Starting with fresh credentials');
    return null;
  }
}

function createEmptyAuthSnapshot() {
  return {
    creds: initAuthCreds(),
    keys: {},
  };
}

async function loadAuthSnapshot(deviceId) {
  const rows = await execute(
    'SELECT session_auth FROM dispositivos WHERE id = ? LIMIT 1',
    [deviceId]
  );
  const parsed = parseAuth(rows[0]?.session_auth);

  if (!parsed?.creds || !parsed?.keys) {
    return createEmptyAuthSnapshot();
  }

  return parsed;
}

async function saveAuthSnapshot(deviceId, snapshot) {
  await execute(
    'UPDATE dispositivos SET session_auth = ? WHERE id = ?',
    [stringifyAuth(snapshot), deviceId]
  );
}

async function clearAuthSnapshot(deviceId) {
  await execute(
    "UPDATE dispositivos SET session_auth = NULL, codigo_qr = NULL, estado = 'desconectado' WHERE id = ?",
    [deviceId]
  );
}

async function useDatabaseAuthState(deviceId) {
  const snapshot = await loadAuthSnapshot(deviceId);
  let writeQueue = Promise.resolve();

  const enqueueSave = () => {
    writeQueue = writeQueue
      .catch(() => undefined)
      .then(() => saveAuthSnapshot(deviceId, snapshot));

    return writeQueue;
  };

  const state = {
    creds: snapshot.creds,
    keys: {
      get: async (type, ids) => {
        const keyBucket = snapshot.keys[type] || {};
        const result = {};

        for (const id of ids) {
          const value = keyBucket[id];
          if (!value) continue;

          result[id] = type === 'app-state-sync-key'
            ? proto.Message.AppStateSyncKeyData.fromObject(value)
            : value;
        }

        return result;
      },
      set: async (data) => {
        for (const [type, values] of Object.entries(data)) {
          snapshot.keys[type] = snapshot.keys[type] || {};

          for (const [id, value] of Object.entries(values)) {
            if (value) {
              snapshot.keys[type][id] = value;
            } else {
              delete snapshot.keys[type][id];
            }
          }
        }

        await enqueueSave();
      },
    },
  };

  const saveCreds = async () => {
    snapshot.creds = state.creds;
    await enqueueSave();
  };

  return { state, saveCreds };
}

async function setDeviceState(state, extra = {}) {
  const updates = ['estado = ?'];
  const params = [state];

  if (Object.prototype.hasOwnProperty.call(extra, 'qr')) {
    updates.push('codigo_qr = ?');
    params.push(extra.qr);
  }

  if (Object.prototype.hasOwnProperty.call(extra, 'phone')) {
    updates.push('numero_telefono = ?');
    params.push(extra.phone);
  }

  if (extra.connectedAtNow) {
    updates.push('conectado_en = NOW()');
  }

  params.push(runtime.deviceId, runtime.userId);

  await execute(
    `
    UPDATE dispositivos
    SET ${updates.join(', ')}
    WHERE id = ? AND usuario_id = ?
    `,
    params
  );
}

function normalizeJid(jid) {
  if (!jid) return null;
  return jidNormalizedUser(String(jid));
}

function isUserJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@s.whatsapp.net');
}

function isGroupJid(jid) {
  return typeof jid === 'string' && jid.endsWith('@g.us');
}

function hasTechnicalJid(jid) {
  const text = String(jid || '').toLowerCase();
  return text.includes('@broadcast') || text.endsWith('@newsletter');
}

function isLidJid(jid) {
  return String(jid || '').toLowerCase().includes('@lid');
}

function isSupportedChatJid(jid) {
  return Boolean(jid && !hasTechnicalJid(jid) && (isUserJid(jid) || isGroupJid(jid)));
}

function shouldIgnoreJid(jid) {
  return !isSupportedChatJid(jid);
}

async function resolveJidToPn(jid) {
  if (!jid) return null;
  const normalized = normalizeJid(jid);

  // If it's already a standard user or group JID, return normalized
  if (isUserJid(normalized) || isGroupJid(normalized)) {
    return normalized;
  }

  // If it's a LID, try to map to PN
  if (isLidJid(normalized) && socket?.signalRepository?.lidMapping?.getPNForLID) {
    try {
      const mapped = await socket.signalRepository.lidMapping.getPNForLID(normalized);
      if (mapped) return normalizeJid(mapped);
    } catch (e) {
      logger.debug({ jid: normalized, error: e.message }, 'LID mapping failed');
    }
  }

  return isLidJid(normalized) ? null : normalized;
}

async function resolveChatJid(message) {
  const candidates = [
    normalizeJid(message?.key?.remoteJid),
    normalizeJid(message?.key?.remoteJidAlt),
  ].filter(Boolean);
  const primary = candidates[0];

  if (hasTechnicalJid(primary)) {
    return primary;
  }

  if (isGroupJid(primary) || isUserJid(primary)) {
    return primary;
  }

  const pnCandidate = candidates.find((candidate) => isUserJid(candidate));
  if (pnCandidate) {
    return pnCandidate;
  }

  return (await pnFromLid(primary)) || primary;
}

async function resolveParticipantJid(message) {
  const candidates = [
    normalizeJid(message?.key?.participant),
    normalizeJid(message?.key?.participantAlt),
    normalizeJid(message?.participant),
  ].filter(Boolean);
  const pnCandidate = candidates.find((candidate) => isUserJid(candidate));

  if (pnCandidate) {
    return pnCandidate;
  }

  return (await pnFromLid(candidates[0])) || null;
}

function ownJid() {
  return normalizeJid(socket?.user?.id);
}

function isOwnJid(jid) {
  const currentOwnJid = ownJid();
  return Boolean(currentOwnJid && normalizeJid(jid) === currentOwnJid);
}

async function chatExists(jid) {
  const rows = await execute(
    `
    SELECT id
    FROM chats
    WHERE dispositivo_id = ? AND jid = ?
    LIMIT 1
    `,
    [runtime.deviceId, normalizeJid(jid)]
  );

  return rows.length > 0;
}

function phoneFromJid(jid) {
  const user = String(jid || '').split('@')[0].split(':')[0];
  const digits = user.replace(/\D/g, '');
  return digits || user || 'sin_numero';
}

function digitsOnly(value) {
  return String(value || '').replace(/\D/g, '');
}

function cacheContactIdentity(jid, values = {}) {
  const normalizedJid = normalizeJid(jid);
  if (!normalizedJid) return;

  const name = cleanText(values.name || values.nombre || values.pushName || values.push_name || values.notifyName || values.notify_name);
  const pushName = cleanText(values.pushName || values.push_name || values.name || values.nombre);
  const verifiedName = cleanText(values.verifiedName || values.verified_name);
  const notifyName = cleanText(values.notifyName || values.notify_name || values.notify);
  const phone = phoneFromJid(normalizedJid);
  const current = contactIdentityCache.get(normalizedJid) || {};
  const next = {
    ...current,
    jid: normalizedJid,
    name: name && !looksLikePhoneAlias(name, normalizedJid) ? name : current.name,
    pushName: pushName && !looksLikePhoneAlias(pushName, normalizedJid) ? pushName : current.pushName,
    verifiedName: verifiedName && !looksLikePhoneAlias(verifiedName, normalizedJid) ? verifiedName : current.verifiedName,
    notifyName: notifyName && !looksLikePhoneAlias(notifyName, normalizedJid) ? notifyName : current.notifyName,
  };

  contactIdentityCache.set(normalizedJid, next);
  if (phone) {
    contactIdentityCache.set(phone, next);
  }
}

function getCachedContactIdentity(jid) {
  const normalizedJid = normalizeJid(jid);
  const phone = phoneFromJid(normalizedJid);
  return contactIdentityCache.get(normalizedJid) || contactIdentityCache.get(phone) || null;
}

async function getStoredContactIdentity(jid) {
  const normalizedJid = normalizeJid(jid);
  if (!normalizedJid) return null;

  const phone = phoneFromJid(normalizedJid);
  const phoneSuffix = phone && phone.length > 8 ? phone.slice(-9) : phone;

  try {
    const row = await queryOne(
      `
      SELECT
        c.jid,
        COALESCE(NULLIF(c.nombre, ''), NULLIF(ch.nombre, '')) AS nombre,
        c.push_name,
        c.verified_name,
        c.notify_name,
        c.foto_perfil
      FROM contactos c
      LEFT JOIN chats ch
        ON ch.dispositivo_id = c.dispositivo_id
       AND ch.jid = c.jid
      WHERE c.dispositivo_id = ?
        AND (
          c.jid = ?
          OR c.telefono = ?
          OR c.telefono LIKE ?
          OR c.jid LIKE ?
        )
      ORDER BY
        CASE
          WHEN c.jid = ? THEN 0
          ELSE 1
        END,
        CASE
          WHEN COALESCE(NULLIF(c.nombre, ''), NULLIF(ch.nombre, '')) IS NOT NULL THEN 0
          WHEN c.push_name IS NOT NULL AND c.push_name <> '' THEN 1
          WHEN c.verified_name IS NOT NULL AND c.verified_name <> '' THEN 2
          WHEN c.notify_name IS NOT NULL AND c.notify_name <> '' THEN 3
          ELSE 4
        END,
        c.actualizado_en DESC,
        c.id DESC
      LIMIT 1
      `,
      [
        runtime.deviceId,
        normalizedJid,
        phone,
        phoneSuffix ? `%${phoneSuffix}` : phone,
        phoneSuffix ? `%${phoneSuffix}%` : normalizedJid,
        normalizedJid,
      ]
    );

    if (!row) return null;

    const identity = {
      jid: normalizeJid(row.jid) || normalizedJid,
      name: cleanText(row.nombre),
      pushName: cleanText(row.push_name),
      verifiedName: cleanText(row.verified_name),
      notifyName: cleanText(row.notify_name),
      foto_perfil: cleanText(row.foto_perfil),
    };

    cacheContactIdentity(normalizedJid, identity);

    const trustedName = identity.name || identity.pushName || identity.verifiedName || identity.notifyName;
    if (trustedName && !looksLikePhoneAlias(trustedName, normalizedJid)) {
      await execute(
        `
        UPDATE contactos
        SET
          nombre = COALESCE(NULLIF(nombre, ''), ?),
          push_name = COALESCE(NULLIF(push_name, ''), ?),
          foto_perfil = COALESCE(NULLIF(foto_perfil, ''), ?),
          actualizado_en = NOW()
        WHERE dispositivo_id = ? AND jid = ?
        `,
        [
          trustedName,
          identity.pushName || trustedName,
          identity.foto_perfil || null,
          runtime.deviceId,
          normalizedJid,
        ]
      );

      await execute(
        `
        UPDATE chats
        SET
          nombre = COALESCE(NULLIF(nombre, ''), ?),
          actualizado_en = NOW()
        WHERE dispositivo_id = ? AND jid = ?
        `,
        [trustedName, runtime.deviceId, normalizedJid]
      );
    }

    return identity;
  } catch (error) {
    logger.debug({ jid: normalizedJid, error: error?.message }, 'Stored contact identity lookup failed');
    return null;
  }
}

function looksLikePhoneAlias(value, jid) {
  const text = cleanText(value);

  if (!text) {
    return true;
  }

  const jidUser = String(jid || '').split('@')[0].split(':')[0];
  const phone = phoneFromJid(jid);
  const lowered = text.toLowerCase();

  if (
    lowered.includes('@lid') ||
    lowered.includes('@broadcast') ||
    lowered.endsWith('@s.whatsapp.net') ||
    lowered.endsWith('@g.us')
  ) {
    return true;
  }

  if ([jid, jidUser, phone].includes(text)) {
    return true;
  }

  const textDigits = digitsOnly(text);
  const phoneDigits = digitsOnly(phone || jidUser);

  return Boolean(textDigits && phoneDigits && textDigits === phoneDigits && textDigits.length >= 6);
}

function displayNameForWebhook(values = {}, jid) {
  const candidates = [
    values.nombre,
    values.name,
    values.push_name,
    values.pushName,
    values.verified_name,
    values.verifiedName,
    values.notify_name,
    values.notify,
    values.display_name,
  ];

  for (const candidate of candidates) {
    const value = cleanText(candidate);

    if (value && !looksLikePhoneAlias(value, jid)) {
      return value;
    }
  }

  return null;
}

async function postWhatsappWebhook(eventType, data) {
  if (!webhookUrl || typeof fetch !== 'function') {
    return;
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), webhookTimeoutMs);

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event_type: eventType,
        user_id: runtime.userId,
        device_id: runtime.deviceId,
        data,
      }),
      signal: controller.signal,
    });

    if (!response.ok) {
      logger.warn(
        {
          eventType,
          status: response.status,
          statusText: response.statusText,
        },
        'WhatsApp webhook returned a non-success response'
      );
    }
  } catch (error) {
    logger.warn(
      {
        eventType,
        error: error?.message,
      },
      'WhatsApp webhook skipped because backend is not reachable'
    );
  } finally {
    clearTimeout(timeout);
  }
}

function notifyWhatsappWebhook(eventType, data) {
  postWhatsappWebhook(eventType, data).catch((error) => {
    logger.warn({ eventType, error: error?.message }, 'WhatsApp webhook failed');
  });
}

function timestampToDate(timestamp) {
  if (!timestamp) {
    return new Date();
  }

  if (typeof timestamp === 'number') {
    return new Date(timestamp * 1000);
  }

  if (typeof timestamp === 'bigint') {
    return new Date(Number(timestamp) * 1000);
  }

  if (typeof timestamp === 'object' && typeof timestamp.toNumber === 'function') {
    return new Date(timestamp.toNumber() * 1000);
  }

  if (typeof timestamp === 'object' && Number.isFinite(timestamp.low)) {
    return new Date(timestamp.low * 1000);
  }

  const parsed = Number(timestamp);
  return Number.isFinite(parsed) ? new Date(parsed * 1000) : new Date();
}

// Convierte cualquier Date (UTC) a string MySQL en hora Ecuador (GMT-5).
// Usamos offset fijo -5h en lugar de getTimezoneOffset() para que funcione
// igual sin importar la zona horaria del servidor (producción suele ser UTC).
const ECUADOR_OFFSET_MS = 5 * 60 * 60 * 1000; // UTC-5 en milisegundos

function toMysqlDate(date) {
  const validDate = date instanceof Date ? date : new Date(date);
  if (isNaN(validDate.getTime())) {
    // Hora actual en Ecuador
    return new Date(Date.now() - ECUADOR_OFFSET_MS).toISOString().slice(0, 19).replace('T', ' ');
  }
  // Restar 5 horas exactas → hora local de Ecuador
  const ecuadorDate = new Date(validDate.getTime() - ECUADOR_OFFSET_MS);
  return ecuadorDate.toISOString().slice(0, 19).replace('T', ' ');
}

function unixSeconds(date) {
  return Math.floor(date.getTime() / 1000);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function unwrapMessage(message) {
  let current = message || {};

  for (let index = 0; index < 6; index += 1) {
    if (current.ephemeralMessage?.message) {
      current = current.ephemeralMessage.message;
      continue;
    }
    if (current.viewOnceMessage?.message) {
      current = current.viewOnceMessage.message;
      continue;
    }
    if (current.viewOnceMessageV2?.message) {
      current = current.viewOnceMessageV2.message;
      continue;
    }
    if (current.documentWithCaptionMessage?.message) {
      current = current.documentWithCaptionMessage.message;
      continue;
    }
    break;
  }

  return current;
}

function getMessageKind(message) {
  const content = unwrapMessage(message);
  const keys = Object.keys(content || {});

  if (keys.includes('imageMessage')) return 'imagen';
  if (keys.includes('videoMessage')) return 'video';
  if (keys.includes('audioMessage')) return 'audio';
  if (keys.includes('documentMessage') || keys.includes('documentWithCaptionMessage')) return 'documento';
  if (keys.includes('stickerMessage')) return 'sticker';

  return 'texto';
}

function normalizeMessageKind(kind) {
  const value = cleanText(kind);
  const allowed = new Set(['texto', 'imagen', 'video', 'audio', 'documento', 'sticker']);
  return allowed.has(value) ? value : 'texto';
}

function getMessageText(message) {
  const content = unwrapMessage(message);
  if (!content) return '';

  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.buttonsResponseMessage?.selectedDisplayText ||
    content.listResponseMessage?.title ||
    content.templateButtonReplyMessage?.selectedDisplayText ||
    content.buttonsMessage?.contentText ||
    content.templateMessage?.hydratedTemplate?.hydratedContentText ||
    content.reactionMessage?.text ||
    content.viewOnceMessage?.message?.imageMessage?.caption ||
    content.viewOnceMessage?.message?.videoMessage?.caption ||
    ''
  );
}

function getMediaInfo(message) {
  const content = unwrapMessage(message);
  const media =
    content.imageMessage ||
    content.videoMessage ||
    content.audioMessage ||
    content.documentMessage ||
    content.stickerMessage ||
    {};

  return {
    mime: media.mimetype || null,
    fileName: media.fileName || media.title || null,
  };
}

function getChatName(chat) {
  return (
    chat?.pushName ||
    chat?.name ||
    chat?.notify ||
    chat?.subject ||
    chat?.verifiedName ||
    null
  );
}

function getChatLastMessageText(chat) {
  const lastMessage =
    chat?.messages?.[0]?.message ||
    chat?.lastMessage?.message ||
    chat?.lastMessage ||
    null;

  return lastMessage ? cleanText(getMessageText(lastMessage)) : null;
}

function getEmbeddedHistoryMessages(chat) {
  const chatJid = normalizeJid(chat?.id || chat?.jid);
  const entries = Array.isArray(chat?.messages) ? chat.messages : [];

  return entries
    .map((entry) => {
      const candidate = entry?.message?.key ? entry.message : entry;

      if (!candidate?.key?.id || !candidate?.message) {
        return null;
      }

      return {
        ...candidate,
        key: {
          ...candidate.key,
          remoteJid: normalizeJid(candidate.key.remoteJid || chatJid),
        },
      };
    })
    .filter(Boolean);
}

function getContactUpsertName(contact) {
  return (
    cleanText(contact?.name) ||
    cleanText(contact?.verifiedName) ||
    cleanText(contact?.pushName) ||
    cleanText(contact?.notify) ||
    null
  );
}

function cleanText(value) {
  const text = value == null ? '' : String(value).trim();
  return text || null;
}

async function upsertAgendaContact(contact, options = {}) {
  const rawJid = normalizeJid(contact?.id || contact?.jid);
  const resolvedJid = await resolveJidToPn(rawJid);
  const jid = normalizeJid(resolvedJid);
  const lid = isLidJid(rawJid) ? rawJid : normalizeJid(contact?.lid || null);

  if (shouldIgnoreJid(jid)) {
    logger.debug({ rawJid }, 'Skipping agenda contact because LID could not be resolved to a phone JID');
    return false;
  }

  const isOwnProfileContact = isOwnJid(jid);
  if (isOwnProfileContact && !(await chatExists(jid))) {
    return false;
  }

  const rawName = getContactUpsertName(contact);
  const name = rawName && !looksLikePhoneAlias(rawName, jid) ? rawName : null;
  const phone = phoneFromJid(jid);
  const pushName = cleanText(contact?.pushName || contact?.name || contact?.notify);
  const verifiedName = cleanText(contact?.verifiedName);
  const notifyName = cleanText(contact?.notify);

  cacheContactIdentity(jid, {
    name,
    pushName,
    verifiedName,
    notifyName,
  });

  const result = await execute(
    `
    INSERT INTO contactos (
      dispositivo_id, jid, lid, telefono, nombre, push_name, verified_name, notify_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      lid = COALESCE(VALUES(lid), lid),
      telefono = VALUES(telefono),
      nombre = CASE 
        WHEN VALUES(nombre) IS NOT NULL AND VALUES(nombre) <> '' THEN VALUES(nombre)
        ELSE nombre 
      END,
      push_name = COALESCE(NULLIF(VALUES(push_name), ''), push_name),
      verified_name = COALESCE(NULLIF(VALUES(verified_name), ''), verified_name),
      notify_name = COALESCE(NULLIF(VALUES(notify_name), ''), notify_name),
      actualizado_en = CURRENT_TIMESTAMP
    `,
    [runtime.deviceId, jid, lid, phone, name, pushName, verifiedName, notifyName]
  );

  if (name) {
    await execute(
      `UPDATE chats SET nombre = ?, actualizado_en = NOW() WHERE dispositivo_id = ? AND jid = ?`,
      [name, runtime.deviceId, jid]
    );
  }

  return Number(result?.affectedRows || 0) > 0;
}


async function updateExistingContactInfo(contact, options = {}) {
  const rawJid = normalizeJid(contact?.id || contact?.jid);
  const resolvedJid = await resolveJidToPn(rawJid);
  const jid = normalizeJid(resolvedJid);

  if (shouldIgnoreJid(jid)) return false;

  const rawName = getContactUpsertName(contact);
  const name = rawName && !looksLikePhoneAlias(rawName, jid) ? rawName : null;
  const pushName = cleanText(contact?.pushName || contact?.name || contact?.notify);
  const verifiedName = cleanText(contact?.verifiedName);
  const notifyName = cleanText(contact?.notify);

  const result = await execute(
    `
    UPDATE contactos
    SET
      nombre = COALESCE(NULLIF(?, ''), nombre),
      push_name = COALESCE(NULLIF(?, ''), push_name),
      verified_name = COALESCE(NULLIF(?, ''), verified_name),
      notify_name = COALESCE(NULLIF(?, ''), notify_name),
      actualizado_en = CURRENT_TIMESTAMP
    WHERE dispositivo_id = ? AND jid = ?
    `,
    [name, pushName, verifiedName, notifyName, runtime.deviceId, jid]
  );

  return Number(result?.affectedRows || 0) > 0;
}

async function syncAgendaContacts(contacts = [], source = 'unknown', options = {}) {
  let upsertedCount = 0;
  let ignoredCount = 0;

  for (const contact of contacts) {
    if (options.onlyUpdate) {
      await updateExistingContactInfo(contact, { ...options, source });
    } else {
      if (await upsertAgendaContact(contact, { ...options, source })) {
        upsertedCount += 1;
      } else {
        ignoredCount += 1;
      }
    }
  }

  if (contacts.length) {
    logger.info(
      {
        source,
        receivedCount: contacts.length,
        upsertedCount,
        ignoredCount,
      },
      'WhatsApp agenda contacts synced'
    );
  }
}

async function upsertChat({ jid, type, name, unreadCount = null, lastSeen = null, lastMessage = null, lastType = null }) {
  const normalizedJid = normalizeJid(jid);
  if (shouldIgnoreJid(normalizedJid)) {
    logger.debug({ jid: normalizedJid }, 'Skipping unsupported WhatsApp chat JID');
    return false;
  }

  const safeName = name && !looksLikePhoneAlias(name, normalizedJid) ? name : null;
  const hasMessageState = lastMessage != null || lastType != null;
  const safeLastType = hasMessageState ? normalizeMessageKind(lastType) : 'texto';
  const safeLastMessage = hasMessageState ? (cleanText(lastMessage) || `[${safeLastType}]`) : '[Nuevo Mensaje]';
  const lastSeenDate = hasMessageState ? (lastSeen || new Date()) : (lastSeen || new Date());
  const lastSeenMysql = toMysqlDate(lastSeenDate);
  const lastSeenTimestamp = unixSeconds(lastSeenDate);

  await execute(
    `
    INSERT INTO chats (
      dispositivo_id,
      jid,
      tipo,
      nombre,
      mensajes_sin_leer,
      ultimo_mensaje,
      ultimo_mensaje_fecha,
      last_timestamp,
      last_media_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      tipo = VALUES(tipo),
      nombre = COALESCE(NULLIF(VALUES(nombre), ''), nombre),
      mensajes_sin_leer = CASE
        WHEN VALUES(mensajes_sin_leer) IS NULL THEN mensajes_sin_leer
        ELSE VALUES(mensajes_sin_leer)
      END,
      ultimo_mensaje = CASE
        WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
          THEN COALESCE(VALUES(ultimo_mensaje), ultimo_mensaje)
        ELSE ultimo_mensaje
      END,
      ultimo_mensaje_fecha = CASE
        WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
          THEN COALESCE(VALUES(ultimo_mensaje_fecha), ultimo_mensaje_fecha)
        ELSE ultimo_mensaje_fecha
      END,
      last_media_type = CASE
        WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
          THEN COALESCE(VALUES(last_media_type), last_media_type)
        ELSE last_media_type
      END,
      last_timestamp = GREATEST(COALESCE(last_timestamp, 0), COALESCE(VALUES(last_timestamp), 0)),
      actualizado_en = NOW()
    `,
    [
      runtime.deviceId,
      normalizedJid,
      type,
      safeName,
      unreadCount ?? 0,
      safeLastMessage,
      lastSeenMysql,
      lastSeenTimestamp,
      safeLastType,
    ]
  );

  notifyWhatsappWebhook('chat-update', {
    jid: normalizedJid,
    type,
    name: safeName,
    last_message: safeLastMessage,
    last_type: safeLastType,
    last_time: lastSeenMysql,
    last_timestamp: lastSeenTimestamp,
    unread_count: unreadCount ?? 0,
  });

  return true;
}

async function updateChatActivity({ jid, type, name, lastSeen, lastMessage, lastType, incrementUnread }) {
  const normalizedJid = normalizeJid(jid);
  const lastSeenDate = lastSeen || new Date();
  const lastSeenMysql = toMysqlDate(lastSeenDate);
  const lastSeenTimestamp = unixSeconds(lastSeenDate);
  const safeLastType = normalizeMessageKind(lastType);
  const safeLastMessage = cleanText(lastMessage) || `[${safeLastType}]`;

  await upsertChat({
    jid: normalizedJid,
    type,
    name,
    lastSeen: lastSeenDate,
    lastMessage: safeLastMessage,
    lastType: safeLastType,
  });

  await execute(
    `
    UPDATE chats
    SET
      ultimo_mensaje = CASE
        WHEN COALESCE(last_timestamp, 0) <= ? THEN ?
        ELSE ultimo_mensaje
      END,
      ultimo_mensaje_fecha = CASE
        WHEN COALESCE(last_timestamp, 0) <= ? THEN ?
        ELSE ultimo_mensaje_fecha
      END,
      last_media_type = CASE
        WHEN COALESCE(last_timestamp, 0) <= ? THEN ?
        ELSE last_media_type
      END,
      mensajes_sin_leer = COALESCE(mensajes_sin_leer, 0) + ?,
      actualizado_en = NOW(),
      last_timestamp = GREATEST(COALESCE(last_timestamp, 0), ?)
    WHERE dispositivo_id = ? AND jid = ?
    `,
    [
      lastSeenTimestamp,
      safeLastMessage,
      lastSeenTimestamp,
      lastSeenMysql,
      lastSeenTimestamp,
      safeLastType,
      incrementUnread ? 1 : 0,
      lastSeenTimestamp,
      runtime.deviceId,
      normalizedJid,
    ]
  );
}

async function upsertContact({
  jid,
  lid = null,
  name,
  pushName = null,
  unreadCount = 0,
  lastSeen = null,
  lastMessage = null,
  lastType = null,
  allowNameUpdate = true,
}) {
  const normalizedJid = normalizeJid(jid);
  const normalizedLid = normalizeJid(lid);
  if (shouldIgnoreJid(normalizedJid)) {
    return false;
  }

  const phone = phoneFromJid(normalizedJid);
  const safePushName = cleanText(pushName);
  const safeName = allowNameUpdate && name && !looksLikePhoneAlias(name, normalizedJid) ? name : null;
  const hasMessageState = lastMessage != null || lastType != null;
  const safeLastType = hasMessageState ? normalizeMessageKind(lastType) : null;
  const safeLastMessage = hasMessageState ? (cleanText(lastMessage) || `[${safeLastType}]`) : null;
  const lastSeenDate = hasMessageState ? (lastSeen || new Date()) : (lastSeen || null);
  const lastSeenMysql = lastSeenDate ? toMysqlDate(lastSeenDate) : null;
  const lastSeenTimestamp = lastSeenDate ? unixSeconds(lastSeenDate) : null;

  await execute(
    `
    INSERT INTO contactos (
      dispositivo_id, jid, lid, telefono, nombre, push_name, mensajes_sin_leer, ultimo_mensaje, ultima_vez_visto, last_timestamp, last_media_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      lid = COALESCE(VALUES(lid), lid),
      telefono = VALUES(telefono),
      nombre = CASE 
        WHEN VALUES(nombre) IS NOT NULL AND VALUES(nombre) <> '' THEN VALUES(nombre)
        ELSE nombre 
      END,
      push_name = COALESCE(NULLIF(VALUES(push_name), ''), push_name),
      mensajes_sin_leer = CASE WHEN VALUES(mensajes_sin_leer) IS NULL THEN mensajes_sin_leer ELSE VALUES(mensajes_sin_leer) END,
      ultimo_mensaje = CASE WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp) THEN COALESCE(VALUES(ultimo_mensaje), ultimo_mensaje) ELSE ultimo_mensaje END,
      ultima_vez_visto = CASE WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp) THEN COALESCE(VALUES(ultima_vez_visto), ultima_vez_visto) ELSE ultima_vez_visto END,
      last_timestamp = GREATEST(COALESCE(last_timestamp, 0), COALESCE(VALUES(last_timestamp), 0)),
      actualizado_en = NOW()
    `,
    [runtime.deviceId, normalizedJid, normalizedLid, phone, safeName, safePushName || safeName, unreadCount, safeLastMessage, lastSeenMysql, lastSeenTimestamp, safeLastType]
  );

  return true;
}

async function incrementContactActivity({ jid, lastSeen, lastMessage, lastType, incrementUnread }) {
  const normalizedJid = normalizeJid(jid);
  const lastSeenDate = lastSeen || new Date();
  const lastSeenTimestamp = unixSeconds(lastSeenDate);
  const safeLastType = normalizeMessageKind(lastType);
  const safeLastMessage = cleanText(lastMessage) || `[${safeLastType}]`;

  await execute(
    `
    UPDATE contactos
    SET
      ultima_vez_visto = CASE
        WHEN COALESCE(last_timestamp, 0) <= ? THEN ?
        ELSE ultima_vez_visto
      END,
      ultimo_mensaje = CASE
        WHEN COALESCE(last_timestamp, 0) <= ? THEN ?
        ELSE ultimo_mensaje
      END,
      last_media_type = CASE
        WHEN COALESCE(last_timestamp, 0) <= ? THEN ?
        ELSE last_media_type
      END,
      mensajes_sin_leer = COALESCE(mensajes_sin_leer, 0) + ?,
      actualizado_en = NOW(),
      last_timestamp = GREATEST(COALESCE(last_timestamp, 0), ?)
    WHERE dispositivo_id = ? AND jid = ?
    `,
    [
      lastSeenTimestamp,
      toMysqlDate(lastSeenDate),
      lastSeenTimestamp,
      safeLastMessage,
      lastSeenTimestamp,
      safeLastType,
      incrementUnread ? 1 : 0,
      lastSeenTimestamp,
      runtime.deviceId,
      normalizedJid,
    ]
  );
}

async function upsertGroup({ jid, name, unreadCount = 0, lastMessage = null, allowNameUpdate = true }) {
  const normalizedJid = normalizeJid(jid);
  if (shouldIgnoreJid(normalizedJid) || !isGroupJid(normalizedJid)) {
    logger.debug({ jid: normalizedJid }, 'Skipping unsupported WhatsApp group JID');
    return false;
  }

  const safeName = allowNameUpdate && name && !looksLikePhoneAlias(name, normalizedJid) ? name : null;
  const nameUpdateSql = allowNameUpdate
    ? "nombre = COALESCE(NULLIF(VALUES(nombre), ''), nombre),"
    : "nombre = nombre,";

  await execute(
    `
    INSERT INTO grupos (
      dispositivo_id,
      jid,
      nombre,
      mensajes_sin_leer,
      ultimo_mensaje
    )
    VALUES (?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      nombre = CASE 
        WHEN VALUES(nombre) IS NOT NULL AND VALUES(nombre) <> '' THEN VALUES(nombre)
        ELSE nombre 
      END,
      mensajes_sin_leer = CASE
        WHEN VALUES(mensajes_sin_leer) IS NULL THEN mensajes_sin_leer
        ELSE VALUES(mensajes_sin_leer)
      END,
      ultimo_mensaje = COALESCE(VALUES(ultimo_mensaje), ultimo_mensaje),
      actualizado_en = NOW()
    `,
    [
      runtime.deviceId,
      normalizedJid,
      safeName,
      unreadCount,
      lastMessage,
    ]
  );

  return true;
}

function looksLikeGenericGroupName(name, jid) {
  const safeName = cleanText(name);
  if (!safeName) return true;
  if (safeName === 'Grupo de WhatsApp') return true;
  return looksLikePhoneAlias(safeName, jid);
}

async function getStoredGroupName(jid) {
  const normalizedJid = normalizeJid(jid);
  if (!normalizedJid || !isGroupJid(normalizedJid)) {
    return null;
  }

  const row = await queryOne(
    `
    SELECT nombre
    FROM grupos
    WHERE dispositivo_id = ? AND jid = ?
    LIMIT 1
    `,
    [runtime.deviceId, normalizedJid]
  );

  return cleanText(row?.nombre);
}

async function fetchGroupSubject(jid) {
  const normalizedJid = normalizeJid(jid);
  if (!socket || !normalizedJid || !isGroupJid(normalizedJid)) {
    return null;
  }

  try {
    const metadata = await socket.groupMetadata(normalizedJid);
    const subject = cleanText(metadata?.subject);
    return subject && !looksLikeGenericGroupName(subject, normalizedJid) ? subject : null;
  } catch (error) {
    logger.debug({ jid: normalizedJid, error: error?.message }, 'Group metadata fetch failed');
    return null;
  }
}

async function syncGroupMetadata(jid, options = {}) {
  const normalizedJid = normalizeJid(jid);
  if (!normalizedJid || !isGroupJid(normalizedJid)) {
    return { error: 'Unsupported group JID' };
  }

  const subject = await fetchGroupSubject(normalizedJid);
  if (!subject) {
    return { error: 'Group subject not available', jid: normalizedJid };
  }

  await upsertGroup({
    jid: normalizedJid,
    name: subject,
    allowNameUpdate: true,
  });

  notifyWhatsappWebhook('groups-update', {
    jid: normalizedJid,
    id: normalizedJid,
    subject,
    name: subject,
  });

  return {
    success: true,
    jid: normalizedJid,
    subject,
  };
}

async function incrementGroupActivity({ jid, lastMessage, incrementUnread }) {
  await execute(
    `
    UPDATE grupos
    SET
      ultimo_mensaje = ?,
      mensajes_sin_leer = mensajes_sin_leer + ?,
      actualizado_en = NOW()
    WHERE dispositivo_id = ? AND jid = ?
    `,
    [
      lastMessage,
      incrementUnread ? 1 : 0,
      runtime.deviceId,
      jid,
    ]
  );
}

async function saveMessage(message, upsertType, options = {}) {
  const rawRemoteJid = normalizeJid(message.key?.remoteJid);

  if (hasTechnicalJid(rawRemoteJid)) {
    logger.debug(
      { rawRemoteJid, messageId: message.key?.id },
      'Skipping technical WhatsApp message before chat resolution'
    );
    return false;
  }

  const remoteJid = normalizeJid(await resolveChatJid(message));

  if (!remoteJid || shouldIgnoreJid(remoteJid) || !message.message) {
    logger.debug({ rawRemoteJid, resolvedJid: remoteJid }, 'Skipping WhatsApp message because chat JID is unsupported or unresolved');
    return false;
  }

  if (!message.key?.id) {
    logger.debug({ jid: remoteJid }, 'Skipping WhatsApp message without id');
    return false;
  }

  const fromMe = Boolean(message.key?.fromMe);
  const isGroup = isGroupJid(remoteJid);
  const participantJid = await resolveParticipantJid(message);
  const senderJid = fromMe ? ownJid() : (participantJid || remoteJid);

  if (!senderJid) {
    logToSyncAudit({ event: 'skip_no_sender', messageId: message.key?.id, jid: remoteJid });
    return false;
  }

  const sentAt = timestampToDate(message.messageTimestamp);
  const kind = getMessageKind(message.message);
  const text = getMessageText(message.message);
  const media = getMediaInfo(message.message);

  if (!text && kind === 'texto' && !media.mime && !media.fileName) {
    logger.debug(
      {
        jid: remoteJid,
        rawRemoteJid,
        messageId: message.key.id,
        messageKeys: Object.keys(unwrapMessage(message.message) || {}),
      },
      'Skipping WhatsApp message without displayable content'
    );
    return false;
  }

  const preview = text || `[${kind}]`;
  const incrementUnread = !message.key?.fromMe && upsertType === 'notify';
  const displayName = fromMe ? phoneFromJid(remoteJid) : displayNameForWebhook({ pushName: message.pushName }, remoteJid);
  const pushName = cleanText(message.pushName);
  const cachedIdentity = getCachedContactIdentity(remoteJid) || (fromMe ? await getStoredContactIdentity(remoteJid) : null);
  const trustedCachedName = cachedIdentity?.name || cachedIdentity?.pushName || cachedIdentity?.verifiedName || cachedIdentity?.notifyName || null;
  const safeOutboundName = fromMe && trustedCachedName && !looksLikePhoneAlias(trustedCachedName, remoteJid) ? trustedCachedName : null;
  const safeCachedPushName = cachedIdentity?.pushName && !looksLikePhoneAlias(cachedIdentity.pushName, remoteJid)
    ? cachedIdentity.pushName
    : null;
  const safeOutboundPushName = fromMe ? (safeCachedPushName || safeOutboundName) : pushName;
  let groupSubject = null;

  if (isGroup) {
    const storedGroupName = await getStoredGroupName(remoteJid);
    groupSubject = looksLikeGenericGroupName(storedGroupName, remoteJid) ? await fetchGroupSubject(remoteJid) : storedGroupName;

    await upsertGroup({
      jid: remoteJid,
      name: groupSubject,
      lastMessage: preview,
      allowNameUpdate: Boolean(groupSubject),
    });

    await incrementGroupActivity({
      jid: remoteJid,
      lastMessage: preview,
      incrementUnread,
    });

    await updateChatActivity({
      jid: remoteJid,
      type: 'grupo',
      name: groupSubject,
      lastSeen: sentAt,
      lastMessage: preview,
      lastType: kind,
      incrementUnread,
    });
  } else if (isUserJid(remoteJid)) {
    await upsertContact({
      jid: remoteJid,
      name: fromMe ? safeOutboundName : displayName,
      pushName: fromMe ? safeOutboundPushName : pushName,
      lastSeen: sentAt,
      lastMessage: preview,
      lastType: kind,
      allowNameUpdate: !fromMe || Boolean(safeOutboundName),
    });

    await incrementContactActivity({
      jid: remoteJid,
      lastSeen: sentAt,
      lastMessage: preview,
      lastType: kind,
      incrementUnread,
    });

    await updateChatActivity({
      jid: remoteJid,
      type: 'contacto',
      name: fromMe ? safeOutboundName : displayName,
      lastSeen: sentAt,
      lastMessage: preview,
      lastType: kind,
      incrementUnread,
    });
  }

  let urlMedia = null;
  if (['imagen', 'audio', 'video', 'documento', 'sticker'].includes(kind) && message.message) {
    try {
      const buffer = await downloadMediaMessage(
        message,
        'buffer',
        {},
        { logger, reuploadRequest: socket?.updateMediaMessage }
      );

      const mime = media.mime || 'application/octet-stream';
      let extension = 'bin';
      if (mime.includes('image/jpeg')) extension = 'jpg';
      else if (mime.includes('image/png')) extension = 'png';
      else if (mime.includes('video/mp4')) extension = 'mp4';
      else if (mime.includes('audio/ogg')) extension = 'ogg';
      else if (mime.includes('audio/mp4')) extension = 'm4a';
      else if (mime.includes('webp')) extension = 'webp';
      else extension = mime.split('/')[1]?.split(';')[0] || 'bin';

      let subFolder = 'documentos';
      if (kind === 'audio') subFolder = 'audios';
      else if (kind === 'imagen') subFolder = 'imagenes';
      else if (kind === 'video') subFolder = 'videos';
      else if (kind === 'sticker') subFolder = 'stickers';

      const fileBaseName = `${message.key.id}.${extension}`;
      const relativeFileName = `${subFolder}/${fileBaseName}`;

      const destDir = path.join(mediaRoot, subFolder);
      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }
      const destPath = path.join(destDir, fileBaseName);

      fs.writeFileSync(destPath, buffer);
      urlMedia = `/media/${relativeFileName}`;
      logger.info({ messageId: message.key.id, fileName: fileBaseName }, 'Media downloaded successfully');
    } catch (err) {
      logger.error({ err: err.message, messageId: message.key.id }, 'Failed to download media');
    }
  }

  try {
    await execute(
      `
        INSERT INTO mensajes (
          mensaje_id, dispositivo_id, chat_jid, de_jid, es_mio, es_grupo,
          texto, tipo, url_media, mime_media, nombre_archivo, estado,
          fecha_mensaje, participant_jid, push_name
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
          estado = VALUES(estado),
          texto = COALESCE(VALUES(texto), texto),
          tipo = VALUES(tipo),
          mime_media = COALESCE(VALUES(mime_media), mime_media),
          url_media = COALESCE(VALUES(url_media), url_media),
          nombre_archivo = COALESCE(VALUES(nombre_archivo), nombre_archivo),
          push_name = COALESCE(VALUES(push_name), push_name)
        `,
      [
        message.key.id,
        runtime.deviceId,
        remoteJid,
        senderJid,
        fromMe ? 1 : 0,
        isGroup ? 1 : 0,
        text || null,
        kind,
        urlMedia,
        media.mime,
        media.fileName,
        fromMe ? 1 : 0,
        toMysqlDate(sentAt),
        participantJid,
        pushName,
      ]
    );
    logToSyncAudit({ event: 'save_message_success', messageId: message.key?.id, jid: remoteJid });
  } catch (dbError) {
    logToSyncAudit({ event: 'save_message_error', messageId: message.key?.id, jid: remoteJid, error: dbError.message });
    logger.error({ error: dbError.message, messageId: message.key.id, jid: remoteJid }, 'Failed to save message to database');
    return false;
  }

  if (options.log !== false) {
    logger.info(
      {
        jid: remoteJid,
        messageId: message.key.id,
        type: kind,
        fromMe,
      },
      'Message persisted'
    );
  }

  return {
    message: {
      mensaje_id: message.key.id,
      chat_jid: remoteJid,
      remoteJid,
      fromMe,
      de_jid: senderJid,
      es_mio: fromMe,
      es_grupo: isGroup,
      texto: text || null,
      tipo: kind,
      url_media: urlMedia,
      mime_media: media.mime,
      nombre_archivo: media.fileName,
      estado: fromMe ? 1 : 0,
      fecha_mensaje: toMysqlDate(sentAt),
      participant_jid: participantJid,
      push_name: fromMe ? safeOutboundPushName : pushName,
      nombre: fromMe ? safeOutboundName : displayName,
      subject: groupSubject,
      groupName: groupSubject,
      telefono: phoneFromJid(remoteJid),
      last_timestamp: unixSeconds(sentAt),
    },
  };
}

async function syncHistoryChats(chats = []) {
  let contactCount = 0;
  let groupCount = 0;
  let embeddedMessageCount = 0;
  let ignoredEmbeddedMessageCount = 0;

  // Prioritize active chats (last 24h/most recent)
  const sortedChats = [...chats].sort((a, b) => {
    const timeA = a.conversationTimestamp || 0;
    const timeB = b.conversationTimestamp || 0;
    return timeB - timeA;
  });

  for (const chat of sortedChats) {
    const rawJid = chat.id || chat.jid;
    const jid = await resolveJidToPn(rawJid);
    const lid = isLidJid(rawJid) ? rawJid : (isLidJid(jid) ? jid : null);

    if (!jid || shouldIgnoreJid(jid)) {
      continue;
    }

    const rawName = getChatName(chat);
    const pushName = cleanText(chat.name || chat.notify || chat.verifiedName);
    const name = rawName && !looksLikePhoneAlias(rawName, jid) ? rawName : null;
    const unreadCount = Number.parseInt(chat.unreadCount || '0', 10) || 0;
    const lastSeen = chat.conversationTimestamp ? timestampToDate(chat.conversationTimestamp) : null;
    const historyLastType = lastSeen ? 'texto' : null;
    const historyLastMessage = lastSeen ? (getChatLastMessageText(chat) || '[texto]') : null;

    if (isUserJid(jid)) {
      await upsertContact({
        jid,
        lid,
        name,
        pushName,
        unreadCount,
        lastSeen,
        lastMessage: historyLastMessage,
        lastType: historyLastType,
      });
      await upsertChat({
        jid,
        type: 'contacto',
        name,
        unreadCount,
        lastSeen,
        lastMessage: historyLastMessage,
        lastType: historyLastType,
      });
      contactCount += 1;
    } else if (isGroupJid(jid)) {
      await upsertGroup({
        jid,
        name,
        unreadCount,
      });
      await upsertChat({
        jid,
        type: 'grupo',
        name,
        unreadCount,
        lastSeen,
        lastMessage: historyLastMessage,
        lastType: historyLastType,
      });
      groupCount += 1;
    }

    for (const message of getEmbeddedHistoryMessages(chat)) {
      try {
        if (await saveMessage(message, 'history', { log: false })) {
          embeddedMessageCount += 1;
        } else {
          ignoredEmbeddedMessageCount += 1;
        }
      } catch (error) {
        ignoredEmbeddedMessageCount += 1;
        logger.error(
          {
            error,
            messageId: message?.key?.id,
            jid: message?.key?.remoteJid,
          },
          'Embedded historical message sync failed'
        );
      }
    }
  }

  notifyWhatsappWebhook('chat-update', {
    source: 'history-set',
    summary: {
      contactCount,
      groupCount,
      embeddedMessageCount,
    },
  });

  // Trigger identity sync after history
  scheduleMissingProfilePictureSync(5000);

  logger.info(
    {
      contactCount,
      groupCount,
      embeddedMessageCount,
      ignoredEmbeddedMessageCount,
    },
    'Conversational history synced'
  );
}

async function syncHistoryMessages(messages = []) {
  let savedCount = 0;
  let ignoredCount = 0;

  logger.info({ count: messages.length }, 'Processing historical messages batch');

  for (const msg of messages) {
    try {
      // Resolve LID to PN JID if necessary
      if (msg.key?.remoteJid) {
        msg.key.remoteJid = await resolveJidToPn(msg.key.remoteJid);
      }
      if (msg.key?.participant) {
        msg.key.participant = await resolveJidToPn(msg.key.participant);
      }

      if (await saveMessage(msg, 'history', { log: false })) {
        savedCount += 1;
      } else {
        ignoredCount += 1;
      }
    } catch (error) {
      ignoredCount += 1;
      logger.error(
        {
          error,
          messageId: msg?.key?.id,
          jid: msg?.key?.remoteJid,
        },
        'Historical message sync failed'
      );
    }
  }

  logger.info({ receivedCount: messages.length, savedCount, ignoredCount }, 'Historical messages synced');
}

async function getItemsMissingProfilePictures() {
  const limit = Number.parseInt(process.env.WA_PROFILE_PICTURE_SYNC_LIMIT || '0', 10) || 0;
  const limitSql = limit > 0 ? 'LIMIT ?' : '';
  const params = [runtime.deviceId, runtime.deviceId];
  if (limit > 0) params.push(limit);

  return execute(
    `
    SELECT entity_type, id, jid
    FROM (
      SELECT
        'contacto' AS entity_type,
        c.id,
        c.jid,
        COALESCE(
          (
            SELECT UNIX_TIMESTAMP(m.fecha_mensaje)
            FROM mensajes m
            WHERE m.dispositivo_id = c.dispositivo_id
              AND m.chat_jid = c.jid
            ORDER BY m.fecha_mensaje DESC, m.id DESC
            LIMIT 1
          ),
          (
            SELECT ch.last_timestamp
            FROM chats ch
            WHERE ch.dispositivo_id = c.dispositivo_id
              AND ch.jid = c.jid
            LIMIT 1
          ),
          c.last_timestamp,
          UNIX_TIMESTAMP(c.ultima_vez_visto),
          UNIX_TIMESTAMP(c.actualizado_en),
          0
        ) AS sort_timestamp,
        c.actualizado_en AS updated_at
      FROM contactos c
      WHERE c.dispositivo_id = ?
        AND (c.foto_perfil IS NULL OR c.foto_perfil = '' OR c.foto_perfil LIKE 'http%')
        AND (c.jid LIKE '%@s.whatsapp.net' OR c.jid LIKE '%@lid')
        AND c.jid NOT LIKE '%@broadcast'
        AND c.jid NOT LIKE '%@newsletter'
        AND (
          c.jid NOT LIKE '%@lid'
          OR (
            NULLIF(TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)), '') IS NOT NULL
            AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT REGEXP '^[0-9]+$'
            AND TRIM(COALESCE(c.nombre, c.push_name, c.verified_name, c.notify_name)) NOT LIKE '%@%'
          )
        )
        AND COALESCE(
          (
            SELECT UNIX_TIMESTAMP(m.fecha_mensaje)
            FROM mensajes m
            WHERE m.dispositivo_id = c.dispositivo_id
              AND m.chat_jid = c.jid
            ORDER BY m.fecha_mensaje DESC, m.id DESC
            LIMIT 1
          ),
          (
            SELECT ch.last_timestamp
            FROM chats ch
            WHERE ch.dispositivo_id = c.dispositivo_id
              AND ch.jid = c.jid
            LIMIT 1
          ),
          c.last_timestamp,
          0
        ) > 0
      UNION ALL
      SELECT
        'grupo' AS entity_type,
        g.id,
        g.jid,
        COALESCE(
          (
            SELECT UNIX_TIMESTAMP(m.fecha_mensaje)
            FROM mensajes m
            WHERE m.dispositivo_id = g.dispositivo_id
              AND m.chat_jid = g.jid
            ORDER BY m.fecha_mensaje DESC, m.id DESC
            LIMIT 1
          ),
          (
            SELECT ch.last_timestamp
            FROM chats ch
            WHERE ch.dispositivo_id = g.dispositivo_id
              AND ch.jid = g.jid
            LIMIT 1
          ),
          UNIX_TIMESTAMP(g.actualizado_en),
          0
        ) AS sort_timestamp,
        g.actualizado_en AS updated_at
      FROM grupos g
      WHERE g.dispositivo_id = ?
        AND g.jid LIKE '%@g.us'
        AND (g.foto_perfil IS NULL OR g.foto_perfil = '' OR g.foto_perfil LIKE 'http%')
        AND COALESCE(
          (
            SELECT UNIX_TIMESTAMP(m.fecha_mensaje)
            FROM mensajes m
            WHERE m.dispositivo_id = g.dispositivo_id
              AND m.chat_jid = g.jid
            ORDER BY m.fecha_mensaje DESC, m.id DESC
            LIMIT 1
          ),
          (
            SELECT ch.last_timestamp
            FROM chats ch
            WHERE ch.dispositivo_id = g.dispositivo_id
              AND ch.jid = g.jid
            LIMIT 1
          ),
          0
        ) > 0
    ) missing_pictures
    ORDER BY
      sort_timestamp DESC,
      updated_at DESC,
      id DESC
    ${limitSql}
    `,
    params
  );
}

async function getProfilePictureUrlForJid(jid) {
  const normalizedJid = normalizeJid(jid);
  const candidates = [normalizedJid];
  const resolvedJid = await resolveJidToPn(normalizedJid);

  if (resolvedJid && !candidates.includes(resolvedJid)) {
    candidates.push(resolvedJid);
  }

  for (const candidate of candidates) {
    try {
      const pictureUrl = await socket.profilePictureUrl(candidate, 'image');
      if (pictureUrl) {
        return { pictureUrl, queriedJid: candidate };
      }
    } catch (error) {
      logger.debug({ jid: normalizedJid, queriedJid: candidate, error: error?.message }, 'Profile picture candidate failed');
    }
  }

  return { pictureUrl: null, queriedJid: normalizedJid };
}

function getProfilePictureBatchSize() {
  return Math.max(1, Number.parseInt(process.env.WA_PROFILE_PICTURE_BATCH_SIZE || '3', 10) || 3);
}

function getProfilePictureDelay() {
  const minDelay = Math.max(
    1000,
    Number.parseInt(process.env.WA_PROFILE_PICTURE_DELAY_MIN_MS || '2000', 10) || 2000
  );
  const maxDelay = Math.max(
    minDelay,
    Number.parseInt(process.env.WA_PROFILE_PICTURE_DELAY_MAX_MS || '3000', 10) || 3000
  );

  return Math.floor(minDelay + Math.random() * (maxDelay - minDelay + 1));
}

function getProfilePictureRetryDelay() {
  return Math.max(
    60000,
    Number.parseInt(process.env.WA_PROFILE_PICTURE_RETRY_MS || '900000', 10) || 900000
  );
}

function getProfilePictureMaxRounds() {
  return Math.max(1, Number.parseInt(process.env.WA_PROFILE_PICTURE_MAX_ROUNDS || '3', 10) || 3);
}

function imageExtensionFromContentType(contentType) {
  const mime = String(contentType || '').split(';')[0].trim().toLowerCase();

  if (mime === 'image/png') return 'png';
  if (mime === 'image/webp') return 'webp';
  if (mime === 'image/gif') return 'gif';
  return 'jpg';
}

function safeProfilePictureName(item) {
  const source = `${item.entity_type || 'contacto'}-${item.jid || item.id || Date.now()}`;
  return source.replace(/[^a-z0-9]+/gi, '_').replace(/^_+|_+$/g, '').toLowerCase() || 'perfil';
}

async function downloadProfilePictureToLocal(item, pictureUrl) {
  if (!pictureUrl) return null;

  const response = await fetch(pictureUrl);
  if (!response.ok) {
    throw new Error(`Profile picture download failed with HTTP ${response.status}`);
  }

  const contentType = response.headers.get('content-type') || 'image/jpeg';
  const extension = imageExtensionFromContentType(contentType);
  const fileName = `${safeProfilePictureName(item)}.${extension}`;
  const localPath = path.join(profilePicturesRoot, fileName);

  if (!fs.existsSync(profilePicturesRoot)) {
    fs.mkdirSync(profilePicturesRoot, { recursive: true });
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  fs.writeFileSync(localPath, buffer);

  return `/media/imagenes/perfiles/${fileName}`;
}

async function saveProfilePicture(item, pictureUrl) {
  const tableName = item.entity_type === 'grupo' ? 'grupos' : 'contactos';
  let storedPictureUrl = null;

  if (pictureUrl) {
    storedPictureUrl = await downloadProfilePictureToLocal(item, pictureUrl);
  }

  if (!storedPictureUrl) {
    return false;
  }

  if (item.entity_type === 'contacto') {
    await execute('UPDATE contactos SET foto_perfil = ?, estado = ?, actualizado_en = NOW() WHERE jid = ? AND dispositivo_id = ?', [
      storedPictureUrl,
      item.status || null,
      item.jid,
      runtime.deviceId
    ]);
  } else {
    await execute(`UPDATE ${tableName} SET foto_perfil = ?, actualizado_en = NOW() WHERE id = ? AND dispositivo_id = ?`, [
      storedPictureUrl,
      item.id,
      runtime.deviceId
    ]);
  }

  notifyWhatsappWebhook('chat-update', {
    jid: item.jid,
    source: 'profile-picture-sync',
    entity_type: item.entity_type,
    foto_perfil: storedPictureUrl,
  });

  return true;
}

async function syncMissingProfilePictures() {
  if (profilePicturesSyncing || !socket) {
    return;
  }

  profilePicturesSyncing = true;
  profilePictureSyncRounds += 1;

  try {
    const items = await getItemsMissingProfilePictures();
    let updatedCount = 0;
    let failedCount = 0;

    if (!items.length) {
      logger.info('No WhatsApp chats are missing profile pictures');
      return;
    }

    logger.info(
      { total: items.length, round: profilePictureSyncRounds },
      'Fetching missing WhatsApp profile pictures'
    );

    const batchSize = getProfilePictureBatchSize();

    for (let index = 0; index < items.length; index += batchSize) {
      const batch = items.slice(index, index + batchSize);

      logger.info(
        {
          batchStart: index + 1,
          batchEnd: index + batch.length,
          total: items.length,
          batchSize,
        },
        'Processing WhatsApp profile picture batch'
      );

      for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
        const item = batch[batchIndex];
        const absoluteIndex = index + batchIndex;

        try {
          const { pictureUrl, queriedJid } = await getProfilePictureUrlForJid(item.jid);

          if (pictureUrl) {
            let status = null;
            if (item.entity_type === 'contacto') {
              try {
                const statusObj = await socket.fetchStatus(queriedJid);
                status = statusObj?.status;
              } catch (e) {
                logger.debug({ jid: item.jid }, 'Status not available');
              }
            }
            const saved = await saveProfilePicture({ ...item, status }, pictureUrl);
            if (saved) {
              updatedCount += 1;
            }
          }
        } catch (error) {
          failedCount += 1;
          logger.debug(
            { jid: item.jid, entityType: item.entity_type, error: error?.message },
            'Profile picture not available for WhatsApp chat'
          );
        }

        if (absoluteIndex < items.length - 1) {
          await sleep(getProfilePictureDelay());
        }
      }
    }

    const remaining = await getItemsMissingProfilePictures();
    logger.info(
      {
        updatedCount,
        failedCount,
        total: items.length,
        remaining: remaining.length,
        round: profilePictureSyncRounds,
      },
      'Profile picture sync finished'
    );

    if (remaining.length && profilePictureSyncRounds < getProfilePictureMaxRounds()) {
      scheduleMissingProfilePictureSync(getProfilePictureRetryDelay());
    }
  } finally {
    profilePicturesSyncing = false;
  }
}

function scheduleMissingProfilePictureSync(delay = 3000) {
  if (profilePictureTimer) {
    clearTimeout(profilePictureTimer);
  }

  profilePictureTimer = setTimeout(() => {
    profilePictureTimer = null;
    syncMissingProfilePictures().catch((error) => {
      logger.error({ error }, 'Profile picture sync failed');
    });
  }, delay);
}

function scheduleIdentitySyncForJid(jid, delay = 1500) {
  const normalizedJid = normalizeJid(jid);
  if (!isSupportedChatJid(normalizedJid)) {
    return;
  }

  identitySyncQueue.set(normalizedJid, normalizedJid);
  if (identitySyncTimer) {
    return;
  }

  identitySyncTimer = setTimeout(async () => {
    identitySyncTimer = null;
    const jids = Array.from(identitySyncQueue.values());
    identitySyncQueue.clear();

    for (const queuedJid of jids) {
      try {
        await forceSyncProfilePicture(queuedJid);
      } catch (error) {
        logger.debug({ jid: queuedJid, error: error?.message }, 'Targeted identity sync failed');
      }

      await sleep(getProfilePictureDelay());
    }
  }, delay);
}

function scheduleReconnect(reason) {
  if (isShuttingDown || reconnectTimer) {
    return;
  }

  reconnectAttempts += 1;
  const delay = Math.min(30000, 2000 * reconnectAttempts);

  logger.warn({ delay, reason, reconnectAttempts }, 'Scheduling WhatsApp reconnect');
  reconnectTimer = setTimeout(async () => {
    reconnectTimer = null;
    await startSocket();
  }, delay);
}

async function updateContactIdentity(jid, { photo, status }) {
  const normalizedJid = normalizeJid(jid);
  const isGroup = isGroupJid(normalizedJid);
  const tableName = isGroup ? 'grupos' : 'contactos';
  let localPhoto = null;

  if (photo) {
    try {
      localPhoto = await downloadProfilePictureToLocal(
        { entity_type: isGroup ? 'grupo' : 'contacto', jid: normalizedJid },
        photo
      );
    } catch (error) {
      logger.warn({ jid: normalizedJid, error: error?.message }, 'Profile picture could not be cached locally');
    }
  }

  const updates = [];
  const params = [];

  if (localPhoto) {
    updates.push('foto_perfil = ?');
    params.push(localPhoto);
  }

  if (status && !isGroup) {
    updates.push('estado = ?');
    params.push(status);
  }

  if (updates.length > 0) {
    updates.push('actualizado_en = CURRENT_TIMESTAMP');
    const sql = `UPDATE ${tableName} SET ${updates.join(', ')} WHERE jid = ? AND dispositivo_id = ?`;
    params.push(normalizedJid, runtime.deviceId);
    await execute(sql, params);
    return {
      updated: true,
      foto_perfil: localPhoto,
      estado: status || null,
    };
  }

  return {
    updated: false,
    foto_perfil: null,
    estado: null,
  };
}

async function forceSyncProfilePicture(jid) {
  if (!socket) return { error: 'Socket not connected' };

  const normalizedJid = normalizeJid(jid);
  if (!isSupportedChatJid(normalizedJid)) {
    return { error: 'Unsupported JID' };
  }

  const result = { jid: normalizedJid, photo: false, status: false };

  try {
    const { pictureUrl, queriedJid } = await getProfilePictureUrlForJid(normalizedJid);
    let bioStatus = null;

    if (!isGroupJid(normalizedJid)) {
      try {
        const statusObj = await socket.fetchStatus(queriedJid);
        bioStatus = statusObj?.status;
      } catch (error) {
        logger.debug({ jid: normalizedJid, queriedJid, error: error?.message }, 'Status fetch failed');
      }
    }

    if (pictureUrl || bioStatus) {
      const updateResult = await updateContactIdentity(normalizedJid, { photo: pictureUrl, status: bioStatus });
      result.photo = Boolean(pictureUrl);
      result.status = Boolean(bioStatus);
      notifyWhatsappWebhook('chat-update', {
        jid: normalizedJid,
        source: 'photo-sync',
        photo: result.photo,
        foto_perfil: updateResult?.foto_perfil || null,
        estado: updateResult?.estado || null,
      });
    }

    return result;
  } catch (error) {
    logger.error({ jid: normalizedJid, error: error.message }, 'Forced profile picture sync failed');
    return { error: error.message };
  }
}

async function forceSyncJid(jid) {
  if (!socket) return { error: 'Socket not connected' };

  logger.info({ jid }, 'Forcing sync for specific JID (Extreme Care Mode)');
  const results = { jid, photo: false, status: false, messages: 0 };

  try {
    if (isGroupJid(jid)) {
      const groupSync = await syncGroupMetadata(jid);
      if (groupSync?.error) {
        return { ...results, error: groupSync.error };
      }

      return {
        ...results,
        group: true,
        subject: groupSync.subject || null,
      };
    }

    // 1. Fetch Photo and Status concurrently
    let pictureUrl = null;
    let bioStatus = null;

    try {
      const profilePicture = await getProfilePictureUrlForJid(jid);
      pictureUrl = profilePicture.pictureUrl;
    } catch (e) { logger.debug({ jid }, 'Photo fetch failed'); }

    if (!isGroupJid(jid)) {
      try {
        const statusObj = await socket.fetchStatus(jid);
        bioStatus = statusObj?.status;
      } catch (e) { logger.debug({ jid }, 'Status fetch failed'); }
    }

    // Unify update
    if (pictureUrl || bioStatus) {
      const updateResult = await updateContactIdentity(jid, { photo: pictureUrl, status: bioStatus });
      results.photo = !!pictureUrl;
      results.status = !!bioStatus;
      notifyWhatsappWebhook('chat-update', {
        jid,
        source: 'force-sync',
        foto_perfil: updateResult?.foto_perfil || null,
        estado: updateResult?.estado || null,
      });
    }

    // Lightweight mode: forced sync updates identity only, never old messages.
    results.messages = 0;
    return results;
  } catch (error) {
    logger.error({ jid, error: error.message }, 'Force sync failed');
  }
}

async function sendMessage(jid, payload) {
  if (!socket) return { error: 'Socket not connected' };

  const { type, text, caption, url, filename, mimetype } = payload;
  const normalizedJid = normalizeJid(jid);

  if (type === 'group_metadata') {
    if (!normalizedJid || !isGroupJid(normalizedJid)) {
      return { error: 'Unsupported group JID' };
    }
    return await syncGroupMetadata(normalizedJid);
  }

  const targetJid = normalizeJid(await resolveJidToPn(normalizedJid));

  if (!targetJid || !isSupportedChatJid(targetJid) || hasTechnicalJid(targetJid)) {
    return { error: 'Unsupported JID' };
  }

  let messageContent = {};

  if (type === 'image') {
    messageContent = { image: { url }, caption: caption || text || '' };
  } else if (type === 'video') {
    messageContent = { video: { url }, caption: caption || text || '' };
  } else if (type === 'document') {
    messageContent = { document: { url }, fileName: filename || 'archivo', mimetype: mimetype || 'application/pdf', caption: caption || text || '' };
  } else if (type === 'audio') {
    messageContent = { audio: { url }, mimetype: mimetype || 'audio/mp4', ptt: true };
  } else if (type === 'contact') {
    const { contactName, contactPhone } = payload;
    const vcard = 'BEGIN:VCARD\n' +
      'VERSION:3.0\n' +
      'FN:' + contactName + '\n' +
      'TEL;type=CELL;type=VOICE;waid=' + contactPhone.replace(/\D/g, '') + ':+' + contactPhone.replace(/\D/g, '') + '\n' +
      'END:VCARD';
    messageContent = {
      contacts: {
        displayName: contactName,
        contacts: [{ vcard }]
      }
    };
  } else if (type === 'buttons') {
    const { buttons, text, footer, header } = payload;
    // Formato compatible con versiones recientes de Baileys para botones interactivos
    messageContent = {
      text: text || '',
      footer: footer || '',
      buttons: (buttons || []).map(b => ({
        buttonId: b.id || b.buttonId,
        buttonText: { displayText: b.label || b.text },
        type: 1
      })),
      headerType: 1
    };
  } else {
    const messageText = cleanText(text);
    if (!messageText) return { error: 'Message text is required' };
    messageContent = { text: messageText };
  }

  try {
    const sent = await Promise.race([
      socket.sendMessage(targetJid, messageContent),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Send message timeout')), 25000);
      }),
    ]);
    return {
      success: true,
      jid: targetJid,
      messageId: sent?.key?.id || null,
    };
  } catch (error) {
    logger.error({ jid: targetJid, error: error?.message }, 'Message send failed');
    return { error: error?.message || 'Failed to send message' };
  }
}

function startCommandServer() {
  const port = 5000 + (runtime.deviceId % 1000);
  const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    res.setHeader('Content-Type', 'application/json');

    if (parsedUrl.pathname === '/sync' && parsedUrl.query.jid) {
      const results = await forceSyncJid(parsedUrl.query.jid);
      res.end(JSON.stringify(results));
    } else if (parsedUrl.pathname === '/photo' && parsedUrl.query.jid) {
      const results = await forceSyncProfilePicture(parsedUrl.query.jid);
      res.end(JSON.stringify(results));
    } else if (parsedUrl.pathname === '/send' && req.method === 'POST') {
      let rawBody = '';
      req.on('data', (chunk) => {
        rawBody += chunk.toString();
      });
      req.on('end', async () => {
        try {
          const payload = rawBody ? JSON.parse(rawBody) : {};
          const results = await sendMessage(payload.jid || payload.chatId, payload);
          if (results?.error) {
            res.statusCode = 400;
          }
          res.end(JSON.stringify(results));
        } catch (error) {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: error?.message || 'Invalid request body' }));
        }
      });
      return;
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  });

  server.listen(port, '127.0.0.1', () => {
    logger.info({ port }, 'Bridge command server listening');
  });

  return server;
}

async function handleConnectionUpdate(update) {
  const { connection, lastDisconnect, qr } = update;

  if (qr) {
    logger.info('QR generated and stored in database');
    qrcode.generate(qr, { small: true });
    await setDeviceState('conectando', { qr });
  }

  if (connection === 'open') {
    reconnectAttempts = 0;
    profilePictureSyncRounds = 0;
    const phone = phoneFromJid(socket?.user?.id);
    logger.info({ phone }, 'WhatsApp connected');
    await setDeviceState('conectado', {
      qr: null,
      phone,
      connectedAtNow: true,
    });
    scheduleMissingProfilePictureSync();
  }

  if (connection === 'close') {
    const statusCode = lastDisconnect?.error?.output?.statusCode;
    const loggedOut = statusCode === DisconnectReason.loggedOut;
    clearTimeout(profilePictureTimer);
    profilePictureTimer = null;

    logger.warn(
      {
        statusCode,
        loggedOut,
        error: lastDisconnect?.error?.message,
      },
      'WhatsApp connection closed'
    );

    await setDeviceState('desconectado', { qr: null });

    if (loggedOut) {
      await clearAuthSnapshot(runtime.deviceId);
      logger.warn('Session cleared because WhatsApp reported loggedOut');
      return;
    }

    scheduleReconnect(statusCode || 'connection.close');
  }
}

async function startSocket() {
  clearTimeout(reconnectTimer);
  reconnectTimer = null;

  await ensureSessionAuthColumn();
  await ensureChatsTable();
  await ensureLightweightChatSchema();
  await getDevice();

  const { state, saveCreds } = await useDatabaseAuthState(runtime.deviceId);
  const { version } = await fetchLatestBaileysVersion();

  logger.info({ version, userId: runtime.userId, deviceId: runtime.deviceId }, 'Starting WhatsApp bridge');

  socket = makeWASocket({
    version,
    logger: baileysLogger,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, baileysLogger),
    },
    browser: Browsers.macOS('GEO-CHAT CRM'),
    printQRInTerminal: false,
    markOnlineOnConnect: false,
    syncFullHistory: false,
  });

  socket.ev.on('creds.update', async () => {
    try {
      await saveCreds();
    } catch (error) {
      logger.error({ error }, 'Failed to persist auth credentials');
    }
  });

  socket.ev.on('connection.update', (update) => {
    handleConnectionUpdate(update).catch((error) => {
      logger.error({ error }, 'connection.update handler failed');
    });
  });

  socket.ev.on('messaging-history.set', async ({ contacts = [], chats = [], messages = [] }) => {
    try {
      await syncAgendaContacts(contacts, 'messaging-history.set');
      logger.info(
        {
          contacts: contacts.length,
          chatsSkipped: chats.length,
          messagesSkipped: messages.length,
        },
        'Lightweight sync active: historical chats/messages skipped'
      );
    } catch (error) {
      logger.error({ error }, 'messaging-history.set handler failed');
    }
  });

  socket.ev.on('contacts.upsert', async (contacts = []) => {
    try {
      await syncAgendaContacts(contacts, 'contacts.upsert', { notifyWebhook: true, onlyUpdate: true });
      scheduleMissingProfilePictureSync(2000);
    } catch (error) {
      logger.error({ error }, 'contacts.upsert handler failed');
    }
  });

  socket.ev.on('contacts.update', async (contacts = []) => {
    try {
      await syncAgendaContacts(contacts, 'contacts.update', { notifyWebhook: true, onlyUpdate: true });
      scheduleMissingProfilePictureSync(2000);
    } catch (error) {
      logger.error({ error }, 'contacts.update handler failed');
    }
  });

  socket.ev.on('groups.update', async (groups = []) => {
    try {
      for (const group of groups) {
        const jid = normalizeJid(group?.id || group?.jid);
        const subject = cleanText(group?.subject || group?.name);
        if (!jid || !subject) continue;

        await upsertGroup({
          jid,
          name: subject,
          allowNameUpdate: true,
        });

        notifyWhatsappWebhook('groups-update', {
          id: jid,
          jid,
          subject,
          name: subject,
        });
      }
    } catch (error) {
      logger.error({ error }, 'groups.update handler failed');
    }
  });

  socket.ev.on('messages.upsert', async ({ messages = [], type }) => {
    for (const message of messages) {
      try {
        const webhookPayload = await saveMessage(message, type);

        if (webhookPayload) {
          notifyWhatsappWebhook('upsert-message', webhookPayload);
          scheduleIdentitySyncForJid(webhookPayload.message?.chat_jid || webhookPayload.message?.remoteJid);
        }
      } catch (error) {
        logger.error(
          {
            error,
            messageId: message?.key?.id,
            jid: message?.key?.remoteJid,
          },
          'messages.upsert handler failed'
        );
      }
    }
  });

  startCommandServer();
}

async function shutdown(signal) {
  if (isShuttingDown) {
    return;
  }

  isShuttingDown = true;
  logger.info({ signal }, 'Shutting down WhatsApp bridge');

  clearTimeout(reconnectTimer);
  clearTimeout(profilePictureTimer);

  try {
    await setDeviceState('desconectado', { qr: null });
  } catch (error) {
    logger.error({ error }, 'Failed to update device state during shutdown');
  }

  try {
    await socket?.end?.();
  } catch (error) {
    logger.warn({ error }, 'Socket end failed during shutdown');
  }

  if (pool) {
    await pool.end();
  }

  process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('unhandledRejection', (error) => {
  logger.error({ error }, 'Unhandled promise rejection');
});

startSocket().catch(async (error) => {
  logger.error({ error }, 'Bridge failed to start');

  try {
    await setDeviceState('desconectado', { qr: null });
  } catch (stateError) {
    logger.error({ error: stateError }, 'Failed to mark device as disconnected');
  }

  process.exit(1);
});
