import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  ChevronDown,
  Clock,
  Download,
  FileText,
  Image,
  Mail,
  MessageCircle,
  Paperclip,
  Phone,
  RefreshCw,
  Search,
  Send,
  Smile,
  User,
  Users,
  X,
} from 'lucide-react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';
const loadedAvatarUrls = new Set();
const failedAvatarUrls = new Set();

const tabs = [
  { value: 'todos', label: 'Todos' },
  { value: 'mios', label: 'Mis Chats' },
  { value: 'favoritos', label: 'Favoritos' },
];

const leadLabels = {
  nuevo: 'Nuevo',
  interesado: 'Interesado',
  en_negociacion: 'En negociacion',
  cerrado: 'Cerrado',
  perdido: 'Perdido',
};

const leadClasses = {
  nuevo: 'bg-slate-100 text-slate-600 border-slate-200',
  interesado: 'bg-blue-50 text-blue-700 border-blue-100',
  en_negociacion: 'bg-amber-50 text-amber-700 border-amber-100',
  cerrado: 'bg-green-50 text-green-700 border-green-100',
  perdido: 'bg-red-50 text-red-700 border-red-100',
};

function parseDate(value) {
  if (!value) return null;
  const dateValue = typeof value === 'number' ? value * 1000 : String(value).replace(' ', 'T');
  const date = new Date(dateValue);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatChatTime(chat) {
  const date = parseDate(chat?.ultimo_mensaje_fecha || chat?.last_timestamp || chat?.actualizado_en);
  if (!date) return '';

  const today = new Date();
  const isToday = date.toDateString() === today.toDateString();

  if (isToday) {
    return new Intl.DateTimeFormat('es-EC', {
      hour: '2-digit',
      minute: '2-digit',
    }).format(date);
  }

  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'short',
  }).format(date);
}

function formatMessageTime(value) {
  const date = parseDate(value);
  if (!date) return '';

  return new Intl.DateTimeFormat('es-EC', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function formatFullDate(value) {
  const date = parseDate(value);
  if (!date) return 'Sin fecha';

  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function cleanPhoneFromJid(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  return raw.split('@')[0].split(':')[0].replace(/\D/g, '') || raw;
}

function looksLikeTechnicalName(value) {
  const text = String(value || '').trim();
  if (!text) return true;
  const lower = text.toLowerCase();
  if (lower.includes('@lid') || lower.includes('@broadcast')) return true;
  if (lower.endsWith('@s.whatsapp.net') || lower.endsWith('@g.us')) return true;
  const digits = text.replace(/\D/g, '');
  return digits.length >= 6 && /^[\d\s+().-]+$/.test(text);
}

function chatVisibleName(contact) {
  const candidates = [
    contact?.display_name,
    contact?.nombre,
    contact?.push_name,
    contact?.verified_name,
    contact?.notify_name,
  ];

  const realName = candidates.find((value) => !looksLikeTechnicalName(value));
  if (realName) return String(realName).trim();

  const phone = cleanPhoneFromJid(contact?.telefono || contact?.jid);
  return phone || 'Contacto de WhatsApp';
}

function chatPhoneLabel(contact) {
  return cleanPhoneFromJid(contact?.telefono || contact?.jid) || 'Sin telefono';
}

function avatarText(contact) {
  return (chatVisibleName(contact) || '?').charAt(0).toUpperCase();
}

function mediaPreview(type) {
  const labels = {
    imagen: 'Imagen',
    video: 'Video',
    audio: 'Audio',
    documento: 'Documento',
    sticker: 'Sticker',
  };
  return labels[type] || 'Mensaje';
}

// Filtra textos placeholder del sistema como "[texto]", "[Nuevo Mensaje]", "Mensaje guardado", etc.
function isSystemPlaceholder(msg) {
  if (!msg) return true;
  const trimmed = msg.trim();
  return (
    trimmed === '' ||
    /^\[.*\]$/.test(trimmed) ||            // [texto], [imagen], [Nuevo Mensaje]
    trimmed === 'Mensaje guardado' ||
    trimmed === 'Saved message'
  );
}

function chatPreview(chat) {
  const msg = chat?.ultimo_mensaje ?? '';
  if (!isSystemPlaceholder(msg)) return msg;
  if (chat?.last_media_type && chat.last_media_type !== 'texto') return mediaPreview(chat.last_media_type);
  return '';
}

function chatSortValue(chat) {
  const date = parseDate(chat?.ultimo_mensaje_fecha);
  if (date) return date.getTime();

  const timestamp = Number(chat?.sort_timestamp || chat?.last_timestamp || 0);
  return Number.isFinite(timestamp) ? timestamp * 1000 : 0;
}

function sortChatsByLatest(items) {
  const seen = new Set();
  const aliases = new Map();

  return [...items]
    .sort((a, b) => chatSortValue(b) - chatSortValue(a))
    .filter((chat) => {
      const key = String(chat?.jid || chat?.id || '').trim();
      if (!key || seen.has(key)) return false;

      const isLid = key.toLowerCase().includes('@lid');
      const alias = chatVisibleName(chat).trim().toLowerCase();
      if (alias && aliases.has(alias) && (isLid || aliases.get(alias))) return false;

      seen.add(key);
      if (alias && (isLid || !aliases.has(alias))) aliases.set(alias, isLid);
      return true;
    });
}

function messageBody(message) {
  if (!message) return '';
  if (message.texto) return message.texto;
  if (message.tipo && message.tipo !== 'texto') return mediaPreview(message.tipo);
  return '';
}

function mediaUrl(url) {
  if (!url) return '';
  const raw = String(url).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;

  const cleanPath = raw.replace(/^[\/\\]*(uploads|media)?[\/\\]*/, '');
  return `${API_URL}/media/${cleanPath}`;
}

function fileExtension(fileName = '', url = '', mime = '') {
  const source = String(fileName || url || '').split('?')[0].split('#')[0];
  const match = source.match(/\.([a-z0-9]+)$/i);

  if (match?.[1]) return match[1].toUpperCase();
  if (String(mime).includes('pdf')) return 'PDF';
  if (String(mime).includes('word')) return 'DOCX';
  if (String(mime).includes('sheet') || String(mime).includes('excel')) return 'XLSX';
  return 'FILE';
}

function fileSizeLabel(bytes) {
  const size = Number(bytes || 0);
  if (!Number.isFinite(size) || size <= 0) return '';

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(size >= 10 * 1024 * 1024 ? 0 : 1)} MB`;
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`;
  }

  return `${size} B`;
}

function documentTheme(extension) {
  const ext = String(extension || '').toLowerCase();

  if (ext === 'pdf') {
    return {
      icon: 'PDF',
      accent: 'bg-red-50 text-red-600 border-red-100',
      strip: 'bg-red-500',
    };
  }

  if (['doc', 'docx'].includes(ext)) {
    return {
      icon: 'DOC',
      accent: 'bg-blue-50 text-blue-600 border-blue-100',
      strip: 'bg-blue-500',
    };
  }

  if (['xls', 'xlsx', 'csv'].includes(ext)) {
    return {
      icon: 'XLS',
      accent: 'bg-emerald-50 text-emerald-600 border-emerald-100',
      strip: 'bg-emerald-500',
    };
  }

  return {
    icon: extension && extension !== 'FILE' ? extension : 'DOC',
    accent: 'bg-slate-50 text-slate-600 border-slate-100',
    strip: 'bg-slate-400',
  };
}

function DocumentCard({ message, href, fileName, mine }) {
  const extension = fileExtension(fileName, href, message.mime_media);
  const theme = documentTheme(extension);
  const sizeLabel = fileSizeLabel(message.media_size || message.file_size || message.fileSize || message.tamano_archivo);
  const meta = [extension, sizeLabel].filter(Boolean).join(' - ');

  return (
    <a
      href={href}
      download={fileName}
      target="_blank"
      rel="noopener noreferrer"
      className="mb-2 block w-[300px] max-w-full overflow-hidden rounded-xl border border-slate-200 bg-white text-slate-900 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="flex min-h-[86px] items-stretch">
        <div className={`w-1.5 shrink-0 ${theme.strip}`} />

        <div className="flex min-w-0 flex-1 items-center gap-3 px-3 py-3">
          <div className={`flex h-12 w-10 shrink-0 flex-col items-center justify-center rounded-lg border ${theme.accent}`}>
            <FileText size={19} />
            <span className="mt-0.5 text-[8px] font-black leading-none">{theme.icon}</span>
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-black text-slate-900">{fileName}</p>
            <p className="mt-1 text-[11px] font-bold uppercase tracking-wide text-slate-500">{meta || 'DOCUMENTO'}</p>
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-slate-100 px-3 py-2 text-[12px] font-bold text-slate-500">
        <span>{extension === 'PDF' ? 'Previsualizacion no disponible' : 'Documento adjunto'}</span>
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${
          mine ? 'bg-indigo-50 text-indigo-700' : 'bg-slate-100 text-slate-700'
        }`}>
          <Download size={13} />
          Abrir
        </span>
      </div>
    </a>
  );
}

function MessageStatus({ status }) {
  if (status >= 3) {
    return (
      <span className="inline-flex -space-x-1 text-indigo-100" title="Leido">
        <Check size={13} />
        <Check size={13} />
      </span>
    );
  }

  if (status >= 2) {
    return (
      <span className="inline-flex -space-x-1 text-indigo-100" title="Entregado">
        <Check size={13} />
        <Check size={13} />
      </span>
    );
  }

  if (status >= 1) {
    return <Check size={13} className="text-indigo-100" title="Enviado" />;
  }

  return <Clock size={13} className="text-indigo-100" title="Pendiente" />;
}

const Avatar = React.memo(function Avatar({ contact, size = 'md' }) {
  const imageUrl = mediaUrl(contact?.foto_perfil);
  const [imgError, setImgError] = React.useState(() => Boolean(imageUrl && failedAvatarUrls.has(imageUrl)));
  const [imgLoading, setImgLoading] = React.useState(() => Boolean(imageUrl && !loadedAvatarUrls.has(imageUrl)));
  const [retryCount, setRetryCount] = React.useState(0);
  const retryTimerRef = React.useRef(null);
  const displayName = chatVisibleName(contact);
  const isGroup = contact?.is_group || contact?.jid?.endsWith('@g.us');

  const sizes = {
    sm: 'w-11 h-11 text-sm',
    md: 'w-12 h-12 text-base',
    lg: 'w-16 h-16 text-xl',
  };

  React.useEffect(() => {
    setImgError(Boolean(imageUrl && failedAvatarUrls.has(imageUrl)));
    setImgLoading(Boolean(imageUrl && !loadedAvatarUrls.has(imageUrl)));
    setRetryCount(0);

    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }

    return () => {
      if (retryTimerRef.current) {
        clearTimeout(retryTimerRef.current);
      }
    };
  }, [imageUrl]);

  if (imageUrl && !imgError) {
    return (
      <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-emerald-100 to-indigo-100 text-indigo-700 flex items-center justify-center overflow-hidden border border-white shadow-sm relative`}>
        {imgLoading && (
          <span className="font-black">
            {isGroup ? <Users size={size === 'lg' ? 24 : 18} /> : avatarText(contact)}
          </span>
        )}
        <img
          src={imageUrl}
          alt={displayName}
          key={`${contact.jid}-${retryCount}`}
          className={`absolute inset-0 ${sizes[size]} rounded-full object-cover transition-opacity duration-200 ${imgLoading ? 'opacity-0' : 'opacity-100'}`}
          onLoad={() => {
            loadedAvatarUrls.add(imageUrl);
            failedAvatarUrls.delete(imageUrl);
            setImgLoading(false);
          }}
          onError={() => {
            if (retryTimerRef.current) {
              clearTimeout(retryTimerRef.current);
            }

            if (retryCount < 6) {
              setImgLoading(true);
              retryTimerRef.current = setTimeout(() => {
                setRetryCount(prev => prev + 1);
              }, 10000);
            } else {
              failedAvatarUrls.add(imageUrl);
              setImgError(true);
              setImgLoading(false);
            }
          }}
        />
      </div>
    );
  }

  return (
    <div className={`${sizes[size]} rounded-full bg-gradient-to-br from-emerald-100 to-indigo-100 text-indigo-700 flex items-center justify-center font-black border border-white shadow-sm`}>
      {isGroup ? <Users size={size === 'lg' ? 24 : 18} /> : avatarText(contact)}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.size === nextProps.size
  && prevProps.contact?.jid === nextProps.contact?.jid
  && prevProps.contact?.foto_perfil === nextProps.contact?.foto_perfil
  && prevProps.contact?.is_group === nextProps.contact?.is_group
  && chatVisibleName(prevProps.contact) === chatVisibleName(nextProps.contact)
));

function EmptyState({ title, text }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center px-8">
      <div className="w-16 h-16 rounded-full bg-indigo-50 text-indigo-500 flex items-center justify-center mb-4">
        <MessageCircle size={30} />
      </div>
      <h3 className="text-lg font-black text-slate-800">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm mt-2">{text}</p>
    </div>
  );
}

function ChatListItem({ chat, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-5 py-4 border-b border-slate-100 text-left transition-colors ${
        active ? 'bg-indigo-50 border-l-4 border-l-[#67c915]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
      }`}
    >
      <Avatar contact={chat} size="sm" />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p className="font-black text-slate-900 truncate">{chatVisibleName(chat)}</p>
          <span className="text-slate-300">&gt;</span>
          <p className="text-xs text-slate-400 truncate">Sin asignar</p>
        </div>
        <div className="flex items-center gap-2 mt-1 min-w-0">
          {chat.last_media_type === 'imagen' && <Image size={13} className="text-slate-400 shrink-0" />}
          {chat.last_media_type === 'documento' && <FileText size={13} className="text-slate-400 shrink-0" />}
          <p className="text-sm text-slate-500 truncate">{chatPreview(chat)}</p>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2 shrink-0">
        <span className="text-[11px] font-semibold text-slate-400">{formatChatTime(chat)}</span>
        {chat.mensajes_sin_leer > 0 && (
          <span className="min-w-6 h-6 px-1.5 rounded-full bg-indigo-600 text-white text-xs font-black flex items-center justify-center">
            {chat.mensajes_sin_leer}
          </span>
        )}
      </div>
    </button>
  );
}

function MessageBubble({ message }) {
  const mine = message.es_mio;
  const resolvedMediaUrl = mediaUrl(message.url_media);
  const isMediaDownloaded = ['imagen', 'audio', 'video', 'documento', 'sticker'].includes(message.tipo) && resolvedMediaUrl;
  const body = (isMediaDownloaded && !message.texto)
    ? ''
    : isMediaDownloaded ? message.texto : messageBody(message);
  const fileName = message.nombre_archivo || mediaPreview(message.tipo);

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[78%] rounded-[1.35rem] px-4 py-3 shadow-sm ${
          mine
            ? 'bg-indigo-600 text-white rounded-br-md'
            : 'bg-[#ecebff] text-[#090044] rounded-bl-md'
        }`}
      >
        {message.push_name && !mine && message.es_grupo && (
          <p className="text-xs font-black text-indigo-600 mb-1">{message.push_name}</p>
        )}

        {['imagen', 'sticker'].includes(message.tipo) && message.url_media ? (
          <div className="mb-2">
            <img
              src={resolvedMediaUrl}
              alt={message.tipo === 'sticker' ? 'Sticker' : 'Imagen adjunta'}
              className={`max-w-full h-auto object-contain ${message.tipo === 'sticker' ? 'bg-transparent w-40' : 'max-h-[420px] rounded-lg bg-white/5'}`}
            />
          </div>
        ) : message.tipo === 'video' && message.url_media ? (
          <div className="mb-2 overflow-hidden rounded-xl bg-black">
            <video controls preload="metadata" className="block max-h-[420px] w-full max-w-[520px] bg-black">
              <source src={resolvedMediaUrl} type={message.mime_media || 'video/mp4'} />
              Tu navegador no soporta videos.
            </video>
          </div>
        ) : message.tipo === 'audio' && message.url_media ? (
          <div className="mb-2">
            <audio controls className="max-w-[240px] md:max-w-[300px]">
              <source src={resolvedMediaUrl} type={message.mime_media || 'audio/ogg'} />
              Tu navegador no soporta audios.
            </audio>
          </div>
        ) : message.tipo === 'documento' && message.url_media ? (
          <DocumentCard message={message} href={resolvedMediaUrl} fileName={fileName} mine={mine} />
        ) : message.tipo !== 'texto' && (
          <div className={`mb-2 inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-bold ${
            mine ? 'bg-white/15 text-white' : 'bg-white/70 text-indigo-700'
          }`}>
            {message.tipo === 'imagen' ? <Image size={15} /> : <FileText size={15} />}
            {mediaPreview(message.tipo)}
          </div>
        )}

        {body && <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{body}</p>}

        {message.nombre_archivo && message.tipo !== 'documento' && (
          <p className={`mt-2 text-xs truncate ${mine ? 'text-indigo-100' : 'text-slate-500'}`}>
            {message.nombre_archivo}
          </p>
        )}

        <div className={`flex items-center justify-end gap-1 mt-2 text-[11px] ${mine ? 'text-indigo-100' : 'text-slate-500'}`}>
          <span>{formatMessageTime(message.fecha_mensaje)}</span>
          {mine && <MessageStatus status={message.estado} />}
        </div>
      </div>
    </div>
  );
}

export default function Chats({ user, onLogout }) {
  const [chats, setChats] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [chatDevice, setChatDevice] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [draftMessage, setDraftMessage] = useState('');
  const [isLoadingChats, setIsLoadingChats] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const messagesEndRef = useRef(null);
  const selectedChatRef = useRef(null);
  const chatDeviceRef = useRef(null);
  const refreshingChatsRef = useRef(false);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 250);

    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    selectedChatRef.current = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    chatDeviceRef.current = chatDevice;
  }, [chatDevice]);

  const resolveChatDevice = async () => {
    if (chatDevice?.id) {
      return chatDevice;
    }

    // Primero: llamar a /ensure para auto-crear dispositivo y auto-arrancar bridge
    try {
      const ensureResp = await fetch(`${API_URL}/api/dispositivos/ensure`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id }),
      });
      const ensureData = await ensureResp.json();
      if (ensureData.success && ensureData.device_id) {
        const syntheticDevice = { id: ensureData.device_id };
        setChatDevice(syntheticDevice);
        return syntheticDevice;
      }
    } catch {
      // Si /ensure falla, intentar con el dashboard como fallback
    }

    // Fallback: buscar en el dashboard
    const response = await fetch(`${API_URL}/api/dashboard/${user.id}`);
    const data = await response.json();

    if (!data.success) {
      throw new Error(data.message || 'No se pudo encontrar un dispositivo para chats.');
    }

    const devices = data.dashboard?.devices || [];
    const selectedDevice = devices.find((device) => device.estado === 'conectado') || devices[0];

    if (!selectedDevice?.id) {
      throw new Error('No hay dispositivos registrados para cargar chats.');
    }

    setChatDevice(selectedDevice);
    return selectedDevice;
  };

  const loadChats = async ({ silent = false } = {}) => {
    if (refreshingChatsRef.current) {
      return;
    }

    if (!user?.id) {
      setError('No se encontro el usuario activo.');
      if (!silent) setIsLoadingChats(false);
      return;
    }

    refreshingChatsRef.current = true;
    if (!silent) {
      setIsLoadingChats(true);
      setError('');
    }

    try {
      const device = await resolveChatDevice();
      const params = new URLSearchParams({
        user_id: String(user.id),
        dispositivo_id: String(device.id),
        limit: '250',
      });
      if (debouncedSearch) params.set('q', debouncedSearch);

      const response = await fetch(`${API_URL}/api/chats?${params.toString()}`);
      const data = await response.json();

      if (!data.success) {
        if (!silent) setError(data.message || 'No se pudieron cargar los chats.');
        return;
      }

      const nextChats = sortChatsByLatest(data.chats || []);
      setChats(nextChats);
      if (data.device) {
        setChatDevice(data.device);
      }
      setSelectedChat((current) => {
        if (!nextChats.length) return null;
        return nextChats.find((chat) => chat.id === current?.id || chat.jid === current?.jid) || nextChats[0];
      });
    } catch (error) {
      if (!silent) setError(error?.message || 'Error de conexion al cargar chats.');
    } finally {
      refreshingChatsRef.current = false;
      if (!silent) setIsLoadingChats(false);
    }
  };

  useEffect(() => {
    loadChats();
  }, [debouncedSearch, user?.id]);

  const loadMessages = async (chat, { silent = false } = {}) => {
    if (!user?.id || !chat?.id) {
      setMessages([]);
      return;
    }

    if (!silent) {
      setIsLoadingMessages(true);
      setMessageError('');
    }

    try {
      const chatKey = encodeURIComponent(chat.jid || chat.id);
      const response = await fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/messages?limit=300`);
      const data = await response.json();

      if (!data.success) {
        if (!silent) setMessageError(data.message || 'No se pudieron cargar los mensajes.');
        setMessages([]);
        return;
      }

      setMessages(data.messages || []);
      if (data.contact) {
        setSelectedChat((current) => (current?.id === data.contact.id ? { ...current, ...data.contact } : current));
      }
    } catch {
      if (!silent) {
        setMessageError('Error de conexion al cargar mensajes.');
        setMessages([]);
      }
    } finally {
      if (!silent) setIsLoadingMessages(false);
    }
  };

  useEffect(() => {
    loadMessages(selectedChat);
  }, [selectedChat?.id, user?.id]);

  useEffect(() => {
    if (!user?.id || typeof EventSource === 'undefined') {
      return undefined;
    }

    const source = new EventSource(`${API_URL}/api/realtime/whatsapp?user_id=${user.id}`);

    source.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        const currentDevice = chatDeviceRef.current;

        if (currentDevice?.id && Number(payload.device_id) !== Number(currentDevice.id)) {
          return;
        }

        const changedJid = payload.data?.message?.chat_jid || payload.data?.contact?.jid || payload.data?.jid;
        const isNewChat = payload.event_type === 'chat-update';

        if (isNewChat && !changedJid) {
          setTimeout(() => loadChats({ silent: true }), 150);
        }

        // Efecto WhatsApp: actualizar estado local inmediatamente para el chat afectado
        if (changedJid) {
          setChats((prevChats) => {
            const chatIndex = prevChats.findIndex((c) => c.jid === changedJid);
            if (chatIndex === -1) {
              // Chat no está en lista todavía → recargar lista completa
              setTimeout(() => loadChats({ silent: true }), 150);
              return prevChats;
            }

            const updatedChats = [...prevChats];
            const chat = { ...updatedChats[chatIndex] };
            const nowTs = Math.floor(Date.now() / 1000);
            const identityData = payload.data?.message || payload.data?.contact || payload.data || {};

            ['nombre', 'display_name', 'push_name', 'verified_name', 'notify_name', 'foto_perfil'].forEach((field) => {
              if (identityData[field]) {
                chat[field] = field === 'foto_perfil' ? mediaUrl(identityData[field]) : identityData[field];
              }
            });

            // Enriquecer el chat con los datos del evento SSE.
            // Para upsert-message, Python retorna: { texto, tipo, es_mio, preview, last_timestamp }
            // Para chat-update, bridge.js envía: { last_message, last_type, last_timestamp }
            if (payload.data?.message) {
              const msg    = payload.data.message;
              const msgTipo = msg.tipo || 'texto';
              // Preferir texto real; si es placeholder o null, usar preview del backend
              const rawText = msg.texto || msg.preview || '';
              const preview = !isSystemPlaceholder(rawText)
                ? rawText
                : (msgTipo !== 'texto' ? mediaPreview(msgTipo) : chat.ultimo_mensaje);

              chat.ultimo_mensaje       = preview;
              chat.last_media_type      = msgTipo;
              chat.last_timestamp       = msg.last_timestamp || nowTs;
              chat.sort_timestamp       = chat.last_timestamp;
              chat.ultimo_mensaje_fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
            } else if (payload.data?.last_message) {
              const rawText = payload.data.last_message || '';
              const preview = !isSystemPlaceholder(rawText) ? rawText : chat.ultimo_mensaje;
              chat.ultimo_mensaje       = preview;
              chat.last_media_type      = payload.data.last_type || chat.last_media_type;
              chat.last_timestamp       = payload.data.last_timestamp || nowTs;
              chat.sort_timestamp       = chat.last_timestamp;
              chat.ultimo_mensaje_fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
            }

            // Incrementar no-leídos SOLO para mensajes entrantes (es_mio === false)
            if (payload.event_type === 'upsert-message' && payload.data?.message?.es_mio === false) {
              chat.mensajes_sin_leer = (chat.mensajes_sin_leer || 0) + 1;
            }

            // Subir al primer lugar de la lista (efecto WhatsApp)
            updatedChats.splice(chatIndex, 1);
            updatedChats.unshift(chat);

            return sortChatsByLatest(updatedChats);
          });
        } else if (isNewChat) {
          loadChats({ silent: true });
        }

        // Si el chat afectado es el que está abierto → recargar mensajes
        const currentChat = selectedChatRef.current;
        if (currentChat?.jid && changedJid === currentChat.jid) {
          loadMessages(currentChat, { silent: true });
          // No llamamos loadChats aquí para no sobreescribir el orden
          // que ya ajustamos optimistamente arriba. El polling cada 3s se encarga.
        }
      } catch (error) {
        console.error('Error al procesar evento en tiempo real:', error);
      }
    };

    source.onerror = () => {
      // EventSource reconnects automatically.
    };

    return () => {
      source.close();
    };
  }, [user?.id, debouncedSearch, chatDevice?.id]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadChats({ silent: true });

      const currentChat = selectedChatRef.current;
      if (currentChat?.id) {
        loadMessages(currentChat, { silent: true });
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [user?.id, debouncedSearch, chatDevice?.id]);

  const prevMessagesLength = useRef(0);
  const prevChatId = useRef(null);

  useEffect(() => {
    const isNewChat = prevChatId.current !== selectedChat?.id;
    const isNewMessage = messages.length > prevMessagesLength.current;

    if (isNewChat || isNewMessage) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }

    prevMessagesLength.current = messages.length;
    prevChatId.current = selectedChat?.id;
  }, [messages.length, selectedChat?.id]);

  const visibleChats = useMemo(() => {
    if (activeTab === 'mios') {
      return sortChatsByLatest(
        chats.filter((chat) => Number(chat.agente_asignado_id || 0) === Number(user?.id || 0))
      );
    }

    if (activeTab === 'favoritos') {
      return [];
    }

    return sortChatsByLatest(chats);
  }, [activeTab, chats, user?.id]);

  const handleSyncChat = async (chat) => {
    if (!chat?.jid) return;

    // Los JIDs de tipo @lid son identificadores internos de WhatsApp que el bridge
    // no puede resolver directamente. Ignorar en lugar de generar 500.
    if (chat.jid.includes('@lid')) {
      console.warn('Sync omitido: JID de tipo @lid no soportado por el bridge:', chat.jid);
      return;
    }

    // Usar siempre la ref actualizada para evitar ReferenceError por closure stale.
    const device = chatDeviceRef.current || chatDevice;
    if (!device?.id) return;

    setIsSyncing(true);

    try {
      const resp = await fetch(
        `${API_URL}/api/chats/${encodeURIComponent(chat.jid)}/sync?user_id=${user.id}&device_id=${device.id}`,
        { method: 'POST' }
      );

      // Si el bridge está apagado, Python retorna 500 con mensaje de conexión rechazada
      if (!resp.ok) {
        const errData = await resp.json().catch(() => ({}));
        const msg = errData?.error || errData?.message || `Error ${resp.status}`;

        if (msg.includes('10061') || msg.includes('Connection refused') || msg.includes('denegó')) {
          throw new Error('El Bridge de WhatsApp no está corriendo. Inícialo con: node bridge.js --user-id=X --device-id=Y');
        }
        throw new Error(msg);
      }

      const data = await resp.json();
      if (data.error) throw new Error(data.error);

      // Refrescar datos tras sincronización exitosa
      loadChats({ silent: true });
      if (selectedChatRef.current?.jid === chat.jid) {
        loadMessages(selectedChatRef.current, { silent: true });
      }
    } catch (err) {
      // Mostrar error en el panel de mensajes en lugar de solo en consola
      setMessageError(err?.message || 'Error al sincronizar. Verifica que el Bridge esté corriendo.');
      console.error('Error al sincronizar chat:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
    setMessageError('');
    setDraftMessage('');
    // El auto-sync automático se eliminó porque generaba errores en cascada:
    // disparaba para cada chat sin foto/mensaje (incluyendo JIDs @lid no resolvibles)
    // y fallaba con 500 cuando bridge.js no está corriendo.
    // El usuario puede sincronizar manualmente con el botón SINCRONIZAR del panel derecho.
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    if (!draftMessage.trim()) return;
    setMessageError('El envio real se conectara cuando integremos el puente de WhatsApp.');
  };

  return (
    <div className="flex h-screen bg-[#f5f7fb] font-sans overflow-hidden">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-20 lg:ml-24 h-screen overflow-hidden">
        <header className="h-[72px] bg-[#17172a] text-white flex items-center justify-between px-6 lg:px-8 shadow-md">
          <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1">
              <span className="w-9 h-1.5 bg-[#67c915] rounded-full -skew-x-12" />
              <span className="w-6 h-1.5 bg-[#67c915] rounded-full -skew-x-12 opacity-70" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight">GEOCHAT</h1>
              <p className="text-xs text-white/45">Chats conectados a MariaDB</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={loadChats}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
              title="Actualizar chats"
            >
              <RefreshCw size={18} className={isLoadingChats ? 'animate-spin' : ''} />
            </button>
            <div className="hidden md:flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-500 text-white flex items-center justify-center font-black">
                {(user?.nombre || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="text-right">
                <p className="text-sm font-black">{user?.nombre || 'Usuario'}</p>
                <p className="text-[11px] text-white/45">{user?.rol || 'admin'}</p>
              </div>
              <ChevronDown size={16} className="text-white/50" />
            </div>
          </div>
        </header>

        <div className="h-[calc(100vh-72px)] grid grid-cols-1 lg:grid-cols-[360px_minmax(0,1fr)] 2xl:grid-cols-[360px_minmax(0,1fr)_360px] bg-white">
          <aside className="border-r border-slate-200 bg-white flex flex-col min-h-0">
            <div className="h-[68px] flex items-center border-b border-slate-200">
              {tabs.map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setActiveTab(tab.value)}
                  className={`h-full flex-1 text-sm font-bold transition-colors border-b-2 ${
                    activeTab === tab.value
                      ? 'border-indigo-600 text-indigo-600'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    placeholder="Buscar contactos"
                    className="w-full h-11 pl-10 pr-9 rounded-lg border border-slate-200 text-sm outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                  />
                  {search && (
                    <button
                      type="button"
                      onClick={() => setSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
                      title="Limpiar busqueda"
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  className="w-11 h-11 rounded-lg border border-slate-200 text-slate-500 flex items-center justify-center hover:bg-slate-50"
                  title="Filtros"
                >
                  <ChevronDown size={17} />
                </button>
              </div>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto">
              {error && (
                <div className="m-4 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700 flex items-center gap-2">
                  <AlertCircle size={17} />
                  {error}
                </div>
              )}

              {isLoadingChats && !visibleChats.length ? (
                <div className="p-5 space-y-4">
                  {[1, 2, 3, 4, 5].map((item) => (
                    <div key={item} className="flex items-center gap-3 animate-pulse">
                      <div className="w-11 h-11 rounded-full bg-slate-100" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 rounded bg-slate-100 w-2/3" />
                        <div className="h-3 rounded bg-slate-100 w-full" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : visibleChats.length ? (
                visibleChats.map((chat) => (
                  <ChatListItem
                    key={chat.id}
                    chat={chat}
                    active={selectedChat?.id === chat.id || selectedChat?.jid === chat.jid}
                    onClick={() => selectChat(chat)}
                  />
                ))
              ) : (
                <EmptyState
                  title="Sin chats"
                  text={activeTab === 'favoritos' ? 'Aun no hay favoritos registrados.' : 'No se encontraron conversaciones para mostrar.'}
                />
              )}
            </div>
          </aside>

          <section className="min-w-0 min-h-0 bg-[#f1f4fa] flex flex-col">
            {selectedChat ? (
              <>
                <div className="h-[68px] bg-white border-b border-slate-200 flex items-center justify-between px-5">
                  <div className="flex items-center gap-3 min-w-0">
                    <Avatar contact={selectedChat} />
                    <div className="min-w-0">
                      <h2 className="font-black text-slate-900 truncate">{chatVisibleName(selectedChat)}</h2>
                      <p className="text-xs text-slate-500 truncate">{selectedChat.dispositivo_nombre || 'Sin dispositivo'} / {selectedChat.dispositivo_estado || 'desconectado'}</p>
                    </div>
                  </div>

                  <div className="hidden md:flex items-center gap-4">
                    <div className="flex items-center gap-2 text-slate-500 border-l border-slate-200 pl-4">
                      <Users size={20} className="text-slate-300" />
                      <span className="text-sm font-semibold">Sin asignar</span>
                      <ChevronDown size={16} />
                    </div>
                    <button
                      type="button"
                      className="h-11 px-5 rounded-lg bg-indigo-600 text-white font-black hover:bg-indigo-700 transition-colors"
                    >
                      Abrir conversacion
                    </button>
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto px-5 md:px-12 py-7">
                  <div className="max-w-5xl mx-auto space-y-4">
                    <div className="flex justify-center">
                      <span className="px-5 py-2 rounded-lg bg-blue-200/70 text-[#090044] text-xs font-bold">
                        HOY
                      </span>
                    </div>

                    {messageError && (
                      <div className="rounded-lg border border-amber-100 bg-amber-50 px-4 py-3 text-sm text-amber-700 flex items-center gap-2">
                        <AlertCircle size={17} />
                        {messageError}
                      </div>
                    )}

                    {isLoadingMessages ? (
                      <div className="space-y-4 animate-pulse">
                        <div className="h-24 rounded-2xl bg-white/70 w-2/3" />
                        <div className="h-28 rounded-2xl bg-indigo-200/60 w-3/5 ml-auto" />
                        <div className="h-20 rounded-2xl bg-white/70 w-1/2" />
                      </div>
                    ) : messages.length ? (
                      messages.map((message) => <MessageBubble key={message.id} message={message} />)
                    ) : (
                      <EmptyState title="Sin mensajes" text="Este contacto todavia no tiene historial guardado." />
                    )}

                    <div ref={messagesEndRef} />
                  </div>
                </div>

                <form onSubmit={handleSubmit} className="bg-white border-t border-slate-200 px-4 md:px-6 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0 rounded-xl border border-slate-200 bg-white overflow-hidden">
                      <textarea
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        placeholder="Escribe una respuesta rapida..."
                        rows={2}
                        className="w-full resize-none px-4 py-3 text-sm outline-none text-slate-700 placeholder:text-slate-400"
                      />
                      <div className="h-10 border-t border-slate-100 flex items-center justify-between px-3">
                        <div className="flex items-center gap-3 text-slate-400">
                          <button type="button" className="hover:text-indigo-600" title="Negrita">
                            <span className="font-black text-lg leading-none">B</span>
                          </button>
                          <button type="button" className="hover:text-indigo-600" title="Emoji">
                            <Smile size={19} />
                          </button>
                          <button type="button" className="hover:text-indigo-600" title="Adjuntar">
                            <Paperclip size={19} />
                          </button>
                          <button type="button" className="hover:text-indigo-600" title="Documento">
                            <FileText size={18} />
                          </button>
                        </div>
                        <span className="text-xs font-semibold text-slate-500">{chatPhoneLabel(selectedChat)}</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-14 h-14 rounded-full bg-indigo-600 text-white flex items-center justify-center shadow-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
                      disabled={!draftMessage.trim()}
                      title="Enviar"
                    >
                      <Send size={24} />
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <EmptyState title="Selecciona un chat" text="Cuando tengas conversaciones en la base de datos, apareceran aqui." />
            )}
          </section>

          <aside className="hidden 2xl:flex border-l border-slate-200 bg-white flex-col min-h-0">
            {selectedChat ? (
              <>
                <div className="h-[68px] flex items-center justify-between px-5 border-b border-slate-200">
                  <button 
                    onClick={() => handleSyncChat(selectedChat)}
                    disabled={isSyncing}
                    className={`flex items-center gap-2 text-xs font-bold transition-colors ${isSyncing ? 'text-slate-400' : 'text-indigo-600 hover:text-indigo-800'}`}
                    title="Sincronizar ahora"
                  >
                    <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}</span>
                  </button>
                  <button onClick={() => setSelectedChat(null)} type="button" className="text-slate-500 hover:text-slate-800" title="Cerrar panel">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 border-b border-slate-200">
                  <div className="flex items-start gap-4">
                    <Avatar contact={selectedChat} size="lg" />
                    <div className="min-w-0">
                      <h3 className="font-black text-lg text-slate-900 truncate">{chatVisibleName(selectedChat)}</h3>
                      <p className="text-sm text-indigo-600 font-semibold truncate">{chatPhoneLabel(selectedChat)}</p>
                      <p className="text-sm text-slate-500 truncate">{selectedChat.estado || selectedChat.correo || 'Sin estado'}</p>
                    </div>
                  </div>
                </div>

                <div className="border-b border-slate-200 px-6 py-5">
                  <button type="button" className="w-full flex items-center justify-between text-left">
                    <span className="font-black text-slate-900">Tags</span>
                    <ChevronDown size={18} className="text-slate-500" />
                  </button>
                  <div className="mt-3">
                    <span className={`inline-flex px-3 py-1 rounded-full border text-xs font-black ${leadClasses[selectedChat.estado_lead] || leadClasses.nuevo}`}>
                      {leadLabels[selectedChat.estado_lead] || 'Nuevo'}
                    </span>
                  </div>
                </div>

                <div className="border-b border-slate-200 px-6 py-5 space-y-4">
                  <button type="button" className="w-full flex items-center justify-between text-left">
                    <span className="font-black text-slate-900">Campos personalizados</span>
                    <ChevronDown size={18} className="text-slate-500" />
                  </button>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-3 text-slate-600">
                      <Phone size={16} className="text-slate-400" />
                      <span className="truncate">{chatPhoneLabel(selectedChat)}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Mail size={16} className="text-slate-400" />
                      <span className="truncate">{selectedChat.correo || 'Sin correo'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <Bot size={16} className="text-slate-400" />
                      <span className="truncate">{selectedChat.empresa || selectedChat.dispositivo_nombre || 'Sin empresa'}</span>
                    </div>
                    <div className="flex items-center gap-3 text-slate-600">
                      <User size={16} className="text-slate-400" />
                      <span className="truncate">Creado: {formatFullDate(selectedChat.creado_en)}</span>
                    </div>
                  </div>
                </div>

                <div className="px-6 py-5 flex-1 min-h-0">
                  <h4 className="font-black text-slate-900 mb-4">Notas del contacto</h4>
                  <textarea
                    rows={5}
                    placeholder="Escribe una nota para este contacto..."
                    className="w-full rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm resize-none outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-300"
                  />
                </div>
              </>
            ) : (
              <EmptyState title="Sin contacto" text="Selecciona una conversacion para ver sus datos." />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
