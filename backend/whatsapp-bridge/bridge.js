import makeWASocket, {
  Browsers,
  BufferJSON,
  DisconnectReason,
  fetchLatestBaileysVersion,
  initAuthCreds,
  jidNormalizedUser,
  makeCacheableSignalKeyStore,
  proto,
} from '@whiskeysockets/baileys';
import mysql from 'mysql2/promise';
import pino from 'pino';
import qrcode from 'qrcode-terminal';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  timestamp: pino.stdTimeFunctions.isoTime,
});

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
let reconnectAttempts = 0;
let isShuttingDown = false;
let profilePicturesSyncing = false;
let profilePictureSyncRounds = 0;

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
const webhookUrl = process.env.WHATSAPP_WEBHOOK_URL || 'http://localhost:5000/webhook/whatsapp';
const webhookTimeoutMs = Number.parseInt(process.env.WHATSAPP_WEBHOOK_TIMEOUT_MS || '2500', 10) || 2500;

if (!Number.isInteger(runtime.userId) || !Number.isInteger(runtime.deviceId)) {
  logger.error('Missing required arguments. Use: node bridge.js --user-id=1 --device-id=1');
  process.exit(1);
}

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
  return text.includes('@lid') || text.includes('@broadcast') || text.endsWith('@newsletter');
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

async function pnFromLid(jid) {
  const normalized = normalizeJid(jid);

  if (!isLidJid(normalized) || !socket?.signalRepository?.lidMapping?.getPNForLID) {
    return null;
  }

  try {
    const mapped = await socket.signalRepository.lidMapping.getPNForLID(normalized);
    const normalizedMapped = normalizeJid(mapped);
    return isUserJid(normalizedMapped) ? normalizedMapped : null;
  } catch (error) {
    logger.debug({ jid: normalized, error: error?.message }, 'Unable to resolve LID to phone JID');
    return null;
  }
}

async function resolveChatJid(message) {
  const candidates = [
    normalizeJid(message?.key?.remoteJid),
    normalizeJid(message?.key?.remoteJidAlt),
  ].filter(Boolean);
  const primary = candidates[0];

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

function toMysqlDate(date) {
  const ecuadorDate = new Date(date.getTime() - 5 * 60 * 60 * 1000);
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
  const rawType = Object.keys(content || {})[0] || 'conversation';

  if (rawType === 'imageMessage') return 'imagen';
  if (rawType === 'videoMessage') return 'video';
  if (rawType === 'audioMessage') return 'audio';
  if (rawType === 'documentMessage') return 'documento';
  if (rawType === 'stickerMessage') return 'sticker';

  return 'texto';
}

function normalizeMessageKind(kind) {
  const value = cleanText(kind);
  const allowed = new Set(['texto', 'imagen', 'video', 'audio', 'documento', 'sticker']);
  return allowed.has(value) ? value : 'texto';
}

function getMessageText(message) {
  const content = unwrapMessage(message);

  return (
    content.conversation ||
    content.extendedTextMessage?.text ||
    content.imageMessage?.caption ||
    content.videoMessage?.caption ||
    content.documentMessage?.caption ||
    content.buttonsResponseMessage?.selectedDisplayText ||
    content.listResponseMessage?.title ||
    content.templateButtonReplyMessage?.selectedDisplayText ||
    content.reactionMessage?.text ||
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
  const jid = normalizeJid(contact?.id || contact?.jid);

  if (shouldIgnoreJid(jid) || !isUserJid(jid)) {
    return false;
  }

  const isOwnProfileContact = isOwnJid(jid);
  const isExistingMeChat = isOwnProfileContact ? await chatExists(jid) : false;

  if (isOwnProfileContact && !isExistingMeChat) {
    logger.debug({ jid }, 'Skipping own WhatsApp profile from contacts.upsert');
    return false;
  }

  const rawName = getContactUpsertName(contact);
  const name = rawName && !looksLikePhoneAlias(rawName, jid) ? rawName : null;
  const phone = phoneFromJid(jid);
  const rawPushName = cleanText(contact?.pushName) || cleanText(contact?.name) || cleanText(contact?.notify);
  const rawVerifiedName = cleanText(contact?.verifiedName);
  const rawNotifyName = cleanText(contact?.notify);
  const pushName = rawPushName && !looksLikePhoneAlias(rawPushName, jid) ? rawPushName : null;
  const verifiedName = rawVerifiedName && !looksLikePhoneAlias(rawVerifiedName, jid) ? rawVerifiedName : null;
  const notifyName = rawNotifyName && !looksLikePhoneAlias(rawNotifyName, jid) ? rawNotifyName : null;
  const hasRealName = Boolean(name);
  const webhookName = displayNameForWebhook(
    {
      name,
      pushName,
      verifiedName,
      notify: notifyName,
    },
    jid
  );

  if (hasRealName) {
    logger.info(`Actualizando nombre para ${phone}: ${name}`);
  }

  const result = await execute(
    `
    INSERT INTO contactos (
      dispositivo_id,
      jid,
      telefono,
      nombre,
      push_name,
      verified_name,
      notify_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      telefono = VALUES(telefono),
      nombre = COALESCE(NULLIF(VALUES(nombre), ''), nombre),
      push_name = COALESCE(NULLIF(VALUES(push_name), ''), push_name),
      verified_name = COALESCE(NULLIF(VALUES(verified_name), ''), verified_name),
      notify_name = COALESCE(NULLIF(VALUES(notify_name), ''), notify_name),
      actualizado_en = NOW()
    `,
    [
      runtime.deviceId,
      jid,
      phone,
      name,
      pushName,
      verifiedName,
      notifyName,
    ]
  );

  if (hasRealName) {
    await execute(
      `
      UPDATE chats
      SET nombre = ?, actualizado_en = NOW()
      WHERE dispositivo_id = ? AND jid = ?
      `,
      [name, runtime.deviceId, jid]
    );
  }

  if (options.notifyWebhook && hasRealName && !isOwnProfileContact) {
    notifyWhatsappWebhook('update-contact', {
      source: options.source || 'contacts.upsert',
      contact: {
        jid,
        telefono: phone,
        nombre: webhookName,
        push_name: pushName,
        verified_name: verifiedName,
        notify_name: notifyName,
      },
    });
  }

  return Number(result?.affectedRows || 0) > 0;
}

async function syncAgendaContacts(contacts = [], source = 'unknown', options = {}) {
  let upsertedCount = 0;
  let ignoredCount = 0;

  for (const contact of contacts) {
    if (await upsertAgendaContact(contact, { ...options, source })) {
      upsertedCount += 1;
    } else {
      ignoredCount += 1;
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
  name,
  unreadCount = 0,
  lastSeen = null,
  lastMessage = null,
  lastType = null,
  allowNameUpdate = true,
}) {
  const normalizedJid = normalizeJid(jid);
  if (shouldIgnoreJid(normalizedJid) || !isUserJid(normalizedJid)) {
    logger.debug({ jid: normalizedJid }, 'Skipping unsupported WhatsApp contact JID');
    return false;
  }

  const phone = phoneFromJid(normalizedJid);
  // Priorizar nombre de la agenda, si no, usar pushName si es válido
  const safeName = allowNameUpdate && name && !looksLikePhoneAlias(name, normalizedJid) ? name : null;
  const safePushName = pushName && !looksLikePhoneAlias(pushName, normalizedJid) ? pushName : null;
  const hasMessageState = lastMessage != null || lastType != null;
  const safeLastType = hasMessageState ? normalizeMessageKind(lastType) : null;
  const safeLastMessage = hasMessageState ? (cleanText(lastMessage) || `[${safeLastType}]`) : null;
  const lastSeenDate = hasMessageState ? (lastSeen || new Date()) : (lastSeen || null);
  const lastSeenMysql = lastSeenDate ? toMysqlDate(lastSeenDate) : null;
  const lastSeenTimestamp = lastSeenDate ? unixSeconds(lastSeenDate) : null;
  const nameUpdateSql = allowNameUpdate
    ? `
      nombre = COALESCE(NULLIF(VALUES(nombre), ''), nombre),
      push_name = COALESCE(NULLIF(VALUES(push_name), ''), push_name),
    `
    : `
      nombre = nombre,
      push_name = push_name,
    `;

  await execute(
    `
    INSERT INTO contactos (
      dispositivo_id,
      jid,
      telefono,
      nombre,
      push_name,
      mensajes_sin_leer,
      ultimo_mensaje,
      ultima_vez_visto,
      last_timestamp,
      last_media_type
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      telefono = VALUES(telefono),
      ${nameUpdateSql}
      mensajes_sin_leer = CASE
        WHEN VALUES(mensajes_sin_leer) IS NULL THEN mensajes_sin_leer
        ELSE VALUES(mensajes_sin_leer)
      END,
      ultimo_mensaje = CASE
        WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
          THEN COALESCE(VALUES(ultimo_mensaje), ultimo_mensaje)
        ELSE ultimo_mensaje
      END,
      ultima_vez_visto = CASE
        WHEN VALUES(last_timestamp) IS NOT NULL AND COALESCE(last_timestamp, 0) <= VALUES(last_timestamp)
          THEN COALESCE(VALUES(ultima_vez_visto), ultima_vez_visto)
        ELSE ultima_vez_visto
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
      phone,
      safeName,
      safePushName,
      unreadCount,
      safeLastMessage,
      lastSeenMysql,
      lastSeenTimestamp,
      safeLastType,
    ]
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
      ${nameUpdateSql}
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
  const remoteJid = await resolveChatJid(message);

  if (shouldIgnoreJid(remoteJid) || !message.message) {
    logger.debug(
      {
        rawRemoteJid,
        remoteJid,
        remoteJidAlt: message.key?.remoteJidAlt,
        messageId: message.key?.id,
      },
      'Skipping unsupported WhatsApp message JID'
    );
    return false;
  }

  if (!message.key?.id) {
    logger.debug({ jid: remoteJid }, 'Skipping WhatsApp message without id');
    return false;
  }

  const isGroup = isGroupJid(remoteJid);
  const participantJid = await resolveParticipantJid(message);
  const senderJid = message.key?.fromMe ? normalizeJid(socket?.user?.id) : (participantJid || remoteJid);
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
  const fromMe = Boolean(message.key?.fromMe);
  const displayName = fromMe ? phoneFromJid(remoteJid) : displayNameForWebhook({ pushName: message.pushName }, remoteJid);
  const pushName = cleanText(message.pushName);

  if (isGroup) {
    await upsertGroup({
      jid: remoteJid,
      name: null,
      lastMessage: preview,
      allowNameUpdate: false,
    });

    if (!fromMe && participantJid && isUserJid(participantJid)) {
      await upsertContact({
        jid: participantJid,
        name: displayNameForWebhook({ pushName: message.pushName }, participantJid),
        lastSeen: sentAt,
        lastMessage: preview,
        lastType: kind,
      });
    }

    await incrementGroupActivity({
      jid: remoteJid,
      lastMessage: preview,
      incrementUnread,
    });

    await updateChatActivity({
      jid: remoteJid,
      type: 'grupo',
      name: null,
      lastSeen: sentAt,
      lastMessage: preview,
      lastType: kind,
      incrementUnread,
    });
  } else if (isUserJid(remoteJid)) {
    await upsertContact({
      jid: remoteJid,
      name: fromMe ? null : displayName,
      lastSeen: sentAt,
      lastMessage: preview,
      lastType: kind,
      allowNameUpdate: !fromMe,
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
      name: fromMe ? null : displayName,
      lastSeen: sentAt,
      lastMessage: preview,
      lastType: kind,
      incrementUnread,
    });
  }

  await execute(
    `
    INSERT INTO mensajes (
      mensaje_id,
      dispositivo_id,
      chat_jid,
      de_jid,
      es_mio,
      es_grupo,
      texto,
      tipo,
      url_media,
      mime_media,
      nombre_archivo,
      estado,
      fecha_mensaje,
      participant_jid,
      push_name
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      estado = VALUES(estado),
      texto = COALESCE(VALUES(texto), texto),
      tipo = VALUES(tipo),
      mime_media = COALESCE(VALUES(mime_media), mime_media),
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
      null,
      media.mime,
      media.fileName,
      fromMe ? 1 : 0,
      toMysqlDate(sentAt),
      participantJid,
      pushName,
    ]
  );

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
      url_media: null,
      mime_media: media.mime,
      nombre_archivo: media.fileName,
      estado: fromMe ? 1 : 0,
      fecha_mensaje: toMysqlDate(sentAt),
      participant_jid: participantJid,
      push_name: fromMe ? null : pushName,
      nombre: fromMe ? null : displayName,
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

  for (const chat of chats) {
    const jid = normalizeJid(chat.id || chat.jid);

    if (shouldIgnoreJid(jid)) {
      continue;
    }

    const rawName = getChatName(chat);
    const name = rawName && !looksLikePhoneAlias(rawName, jid) ? rawName : null;
    const unreadCount = Number.parseInt(chat.unreadCount || '0', 10) || 0;
    const lastSeen = chat.conversationTimestamp ? timestampToDate(chat.conversationTimestamp) : null;
    const historyLastType = lastSeen ? 'texto' : null;
    const historyLastMessage = lastSeen ? (getChatLastMessageText(chat) || '[texto]') : null;

    if (isUserJid(jid)) {
      await upsertContact({
        jid,
        name,
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

  const orderedMessages = [...messages].sort((left, right) => {
    return timestampToDate(left.messageTimestamp).getTime() - timestampToDate(right.messageTimestamp).getTime();
  });

  for (const message of orderedMessages) {
    try {
      if (await saveMessage(message, 'history', { log: false })) {
        savedCount += 1;
      } else {
        ignoredCount += 1;
      }
    } catch (error) {
      ignoredCount += 1;
      logger.error(
        {
          error,
          messageId: message?.key?.id,
          jid: message?.key?.remoteJid,
        },
        'Historical message sync failed'
      );
    }
  }

  logger.info({ receivedCount: messages.length, savedCount, ignoredCount }, 'Historical messages synced');
}

async function getItemsMissingProfilePictures() {
  const limit = Number.parseInt(process.env.WA_PROFILE_PICTURE_SYNC_LIMIT || '0', 10) || 0;
  const params = [runtime.deviceId, runtime.deviceId];
  const limitSql = limit > 0 ? 'LIMIT ?' : '';

  if (limit > 0) {
    params.push(limit);
  }

  return execute(
    `
    SELECT entity_type, id, jid
    FROM (
      SELECT
        'contacto' AS entity_type,
        id,
        jid,
        COALESCE(last_timestamp, 0) AS sort_timestamp,
        actualizado_en AS updated_at
      FROM contactos
      WHERE dispositivo_id = ?
        AND jid LIKE '%@s.whatsapp.net'
        AND (foto_perfil IS NULL OR foto_perfil = '')
      UNION ALL
      SELECT
        'grupo' AS entity_type,
        id,
        jid,
        UNIX_TIMESTAMP(actualizado_en) AS sort_timestamp,
        actualizado_en AS updated_at
      FROM grupos
      WHERE dispositivo_id = ?
        AND jid LIKE '%@g.us'
        AND (foto_perfil IS NULL OR foto_perfil = '')
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

async function saveProfileIdentity(item, pictureUrl, status) {
  const isGroup = item.entity_type === 'grupo';
  const tableName = isGroup ? 'grupos' : 'contactos';
  
  const updates = [];
  const params = [];
  
  if (pictureUrl) {
    updates.push('foto_perfil = ?');
    params.push(pictureUrl);
  }
  
  if (status && !isGroup) {
    updates.push('estado = ?');
    params.push(status);
  }
  
  if (updates.length === 0) return;
  
  params.push(item.id, runtime.deviceId);

  await execute(
    `
    UPDATE ${tableName}
    SET ${updates.join(', ')}, actualizado_en = NOW()
    WHERE id = ? AND dispositivo_id = ?
    `,
    params
  );
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
          const pictureUrl = await socket.profilePictureUrl(item.jid, 'image').catch(() => null);
          let status = null;
          
          if (item.entity_type === 'contacto') {
            status = await socket.fetchStatus(item.jid).then(s => s?.status).catch(() => null);
          }

          if (pictureUrl || status) {
            await saveProfileIdentity(item, pictureUrl, status);
            updatedCount += 1;
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
    syncFullHistory: true,
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
      await syncHistoryChats(chats);
      await syncHistoryMessages(messages);
      scheduleMissingProfilePictureSync(2000);
    } catch (error) {
      logger.error({ error }, 'messaging-history.set handler failed');
    }
  });

  socket.ev.on('contacts.upsert', async (contacts = []) => {
    try {
      await syncAgendaContacts(contacts, 'contacts.upsert', { notifyWebhook: true });
      scheduleMissingProfilePictureSync(2000);
    } catch (error) {
      logger.error({ error }, 'contacts.upsert handler failed');
    }
  });

  socket.ev.on('contacts.update', async (contacts = []) => {
    try {
      await syncAgendaContacts(contacts, 'contacts.update', { notifyWebhook: true });
      scheduleMissingProfilePictureSync(2000);
    } catch (error) {
      logger.error({ error }, 'contacts.update handler failed');
    }
  });

  socket.ev.on('messages.upsert', async ({ messages = [], type }) => {
    for (const message of messages) {
      try {
        const webhookPayload = await saveMessage(message, type);

        if (webhookPayload) {
          notifyWhatsappWebhook('upsert-message', webhookPayload);
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
