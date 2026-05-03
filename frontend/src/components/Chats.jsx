import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Bot,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  Clock,
  Download,
  FileText,
  Filter,
  Image,
  ListFilter,
  Mail,
  MessageCircle,
  Mic,
  Paperclip,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Smile,
  User,
  Users,
  X,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { SkeletonChatItem } from './Skeleton';

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

const GENERIC_PLACEHOLDERS = new Set([
  'grupo de whatsapp',
  'whatsapp group',
  'group',
  'sin nombre',
  'contacto de whatsapp',
  'none',
  'null',
  'undefined',
]);

function isGenericPlaceholder(value) {
  const text = String(value || '').trim().toLowerCase();
  if (GENERIC_PLACEHOLDERS.has(text)) return true;
  // Filtro para nombres tipo "Grupo 123456" o IDs largos
  if (/^grupo\s+\d+$/i.test(text)) return true;
  if (/^\d{10,}$/.test(text)) return true;
  return false;
}

function chatVisibleName(contact) {
  if (!contact) return 'Cargando...';
  const isGroup = contact.is_group || String(contact.jid || '').endsWith('@g.us');

  // Candidatos ordenados por relevancia
  const candidates = [
    contact.subject,        // Prioridad 1: Asunto real del grupo
    contact.group_subject,  // Prioridad 2: Alias de grupo
    contact.nombre,         // Prioridad 3: Nombre persistido
    contact.display_name,   // Prioridad 4: Nombre de visualizacion
    contact.push_name,      // Prioridad 5: Nombre de push (solo si no es grupo)
  ];

  // Si es grupo, ignoramos nombres que sepamos que son de personas (como push_name)
  const filteredCandidates = isGroup 
    ? candidates.filter(c => c !== contact.push_name)
    : candidates;

  const realName = filteredCandidates.find(
    (value) => value && !looksLikeTechnicalName(value) && !isGenericPlaceholder(value)
  );

  if (realName) return String(realName).trim();

  // Si seguimos sin nombre pero tenemos el JID, mostrar una parte del JID o placeholder
  if (isGroup) return 'Grupo de WhatsApp';
  
  return cleanPhoneFromJid(contact.telefono || contact.jid) || 'Contacto de WhatsApp';
}

function chatPhoneLabel(contact) {
  return cleanPhoneFromJid(contact?.telefono || contact?.jid) || 'Sin telefono';
}

function assignedLabel(chat) {
  return String(chat?.agente_asignado_nombre || '').trim() || 'Sin asignar';
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
    sm: 'w-11 h-11 text-[11px]',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-xl',
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
      if (retryTimerRef.current) clearTimeout(retryTimerRef.current);
    };
  }, [imageUrl]);

  const fallbackContent = (
    <div className={`${sizes[size]} rounded-2xl bg-gradient-to-br from-[#d1fae5] to-[#cffafe] text-[#0d9488] flex items-center justify-center font-black border border-[#a7f3d0] shadow-sm`}>
      {isGroup ? <Users size={size === 'lg' ? 28 : 20} /> : avatarText(contact)}
    </div>
  );

  if (imageUrl && !imgError) {
    return (
      <div className={`${sizes[size]} rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center overflow-hidden relative group`}>
        {imgLoading && fallbackContent}
        <img
          src={imageUrl}
          alt={displayName}
          key={`${contact.jid}-${retryCount}`}
          className={`absolute inset-0 ${sizes[size]} rounded-2xl object-cover transition-opacity duration-300 ${imgLoading ? 'opacity-0' : 'opacity-100'} group-hover:scale-110`}
          onLoad={() => {
            loadedAvatarUrls.add(imageUrl);
            failedAvatarUrls.delete(imageUrl);
            setImgLoading(false);
          }}
          onError={() => {
            if (retryCount < 3) {
              setImgLoading(true);
              retryTimerRef.current = setTimeout(() => setRetryCount(prev => prev + 1), 5000);
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

  return fallbackContent;
}, (prevProps, nextProps) => (
  prevProps.size === nextProps.size &&
  prevProps.contact?.jid === nextProps.contact?.jid &&
  prevProps.contact?.foto_perfil === nextProps.contact?.foto_perfil
));

function EmptyState({ title, text }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-70">
      <div className="w-16 h-16 rounded-2xl bg-[#ecfdf5] text-[#a7f3d0] flex items-center justify-center mb-5 border border-[#d1fae5]">
        <MessageCircle size={28} />
      </div>
      <h3 className="text-sm font-black text-[#9ca3af] uppercase tracking-widest">{title}</h3>
      <p className="text-[12px] text-[#9ca3af] max-w-[220px] mt-2 font-medium leading-relaxed">{text}</p>
    </div>
  );
}

function ChatListItem({ chat, active, onClick }) {
  const isImage = chat.last_media_type === 'imagen';
  const isSticker = chat.last_media_type === 'sticker';
  const isAudio = chat.last_media_type === 'audio';
  const isVideo = chat.last_media_type === 'video';
  const isDoc = chat.last_media_type === 'documento';
  
  const hasUnread = chat.mensajes_sin_leer > 0;
  const assigned = assignedLabel(chat);

  return (
    <div
      onClick={onClick}
      className={`group w-full h-[72px] flex items-center pl-3 cursor-pointer transition-colors ${
        active ? 'bg-slate-100' : 'bg-white hover:bg-slate-50'
      }`}
    >
      <div className="pr-3 shrink-0">
        <Avatar contact={chat} size="md" />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center border-b border-slate-100 h-full pr-4 relative">
        {/* Fila superior: Nombre y Hora */}
        <div className="flex justify-between items-center mb-0.5">
          <div className="flex items-center gap-1 min-w-0 pr-2">
            <span className="font-semibold text-[16px] text-slate-800 truncate">
              {chatVisibleName(chat)}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-0.5 shrink-0 truncate max-w-[80px] mt-0.5">
              <ChevronRight size={12} />
              <span className="truncate">{assigned}</span>
            </span>
          </div>
          <span className={`text-[12px] shrink-0 whitespace-nowrap mt-0.5 ${hasUnread ? 'text-[#5d5fef] font-bold' : 'text-slate-400'}`}>
            {formatChatTime(chat)}
          </span>
        </div>
        
        {/* Fila inferior: Estado de lectura, icono de multimedia, previo y badge */}
        <div className="flex justify-between items-center min-h-[20px]">
          <div className="flex items-center gap-1 min-w-0 text-slate-500 pr-2">
            {chat.es_mio && <MessageStatus status={chat.estado} />}
            {isImage && <Image size={14} className="shrink-0" />}
            {isSticker && <FileText size={14} className="shrink-0" />}
            {isAudio && <Mic size={14} className="shrink-0 text-emerald-500" />}
            {isVideo && <Image size={14} className="shrink-0" />}
            {isDoc && <FileText size={14} className="shrink-0" />}
            <span className="text-[13px] truncate leading-5">
              {chatPreview(chat) || 'Inicia una conversación...'}
            </span>
          </div>
          
          <div className="flex items-center gap-1 shrink-0">
            {hasUnread && (
              <span className="flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-[#5d5fef] text-white text-[11px] font-bold px-1.5 shrink-0">
                {chat.mensajes_sin_leer}
              </span>
            )}
            <ChevronDown size={18} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        </div>
      </div>
    </div>
  );
}
 
function MessageBubble({ message }) {
  const mine = message.es_mio;
  const resolvedMediaUrl = mediaUrl(message.url_media);
  const isMedia = ['imagen', 'audio', 'video', 'documento', 'sticker'].includes(message.tipo) && resolvedMediaUrl;
  const body = (isMedia && !message.texto) ? '' : isMedia ? message.texto : messageBody(message);

  return (
    <div className={`flex ${mine ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-200`}>
      <div className={`max-w-[78%] rounded-2xl px-5 py-3.5 shadow-sm relative transition-all ${
          mine
          ? 'bg-gradient-to-br from-[#10b981] to-[#0d9488] text-white rounded-tr-sm'
          : 'bg-white border border-[#e5e7eb] text-[#374151] rounded-tl-sm shadow-sm'
      }`}>
        {message.push_name && !mine && message.es_grupo && (
          <p className="text-[10px] font-black text-[#0d9488] uppercase tracking-widest mb-2 px-1">
            {message.push_name}
          </p>
        )}
        {isMedia && (
          <div className="mb-3 rounded-2xl overflow-hidden border border-white/10 bg-black/20">
            {['imagen', 'sticker'].includes(message.tipo) ? (
              <img
                src={resolvedMediaUrl}
                alt={message.tipo}
                className={`w-full object-contain ${message.tipo === 'sticker' ? 'h-32' : 'max-h-80'}`}
              />
            ) : message.tipo === 'video' ? (
              <video controls preload="metadata" className="block max-h-[380px] w-full">
                <source src={resolvedMediaUrl} type={message.mime_media || 'video/mp4'} />
              </video>
            ) : message.tipo === 'audio' ? (
              <div className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/5 min-w-[240px]">
                <audio controls className="w-full h-8 opacity-80 hover:opacity-100 transition-opacity invert brightness-150 grayscale">
                  <source src={resolvedMediaUrl} type={message.mime_media || 'audio/ogg'} />
                </audio>
              </div>
            ) : (
                <DocumentCard message={message} href={resolvedMediaUrl} fileName={message.nombre_archivo || 'Documento'} mine={mine} />
            )}
          </div>
        )}
 
        {body && (
          <p className="whitespace-pre-wrap break-words text-[15px] leading-relaxed font-medium">
            {body}
          </p>
        )}
 
        <div className={`flex items-center justify-end gap-2 mt-2 text-[10px] font-semibold ${mine ? 'text-white/60' : 'text-[#9ca3af]'}`}>
          <span className="uppercase">{formatMessageTime(message.fecha_mensaje)}</span>
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
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const messagesEndRef = useRef(null);
  const selectedChatRef = useRef(null);
  const chatDeviceRef = useRef(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const refreshingChatsRef = useRef(false);

  // Tags y campos del contacto seleccionado
  const [contactTags, setContactTags] = useState([]);
  const [contactFields, setContactFields] = useState([]);

  // Resize sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const isDragging = useRef(false);
  const sidebarRef = useRef(null);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging.current || !sidebarRef.current) return;
      const rect = sidebarRef.current.getBoundingClientRect();
      let newWidth = e.clientX - rect.left;
      if (newWidth < 260) newWidth = 260;
      if (newWidth > 550) newWidth = 550;
      setSidebarWidth(newWidth);
    };

    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const handleMouseDown = (e) => {
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  };

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
    const fetchContactDetails = async () => {
      if (!selectedChat?.id) {
        setContactTags([]);
        setContactFields([]);
        return;
      }
      try {
        const res = await fetch(`${API_URL}/api/contacts/${selectedChat.id}/details`);
        const data = await res.json();
        if (data.success) {
          setContactTags(data.tags || []);
          setContactFields(data.fields || []);
        }
      } catch (err) {
        console.error('Error fetching contact details:', err);
      }
    };
    fetchContactDetails();
  }, [selectedChat?.id]);

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

  const handleRename = async () => {
    if (!selectedChat?.jid || !chatDevice?.id || !editingNameValue.trim()) return;
    try {
      const response = await fetch(`${API_URL}/api/chats/rename`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jid: selectedChat.jid,
          device_id: chatDevice.id,
          nombre: editingNameValue.trim()
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedChat(prev => ({ ...prev, nombre: editingNameValue.trim(), display_name: editingNameValue.trim() }));
        setIsEditingName(false);
        loadChats({ silent: true });
      }
    } catch (err) {
      console.error('Error al renombrar:', err);
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!draftMessage.trim() || !selectedChat) return;

    const messageToSend = draftMessage.trim();
    const chatKey = encodeURIComponent(selectedChat?.jid || selectedChat?.id);
    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 20000);

    setIsSending(true);
    setMessageError('');

    try {
      const response = await fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        signal: controller.signal,
        body: JSON.stringify({ text: messageToSend }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo enviar el mensaje.');
      }

      if (data.chat) {
        setSelectedChat((prev) => (prev ? { ...prev, ...data.chat } : data.chat));
      }

      setDraftMessage('');
      await loadChats({ silent: true });

      if (selectedChatRef.current) {
        await loadMessages(selectedChatRef.current, { silent: true });
      }
    } catch (error) {
      if (error?.name === 'AbortError') {
        setMessageError('El envio tardo demasiado. Revisa si el bridge de WhatsApp sigue conectado.');
      } else {
      setMessageError(error?.message || 'No se pudo enviar el mensaje.');
      }
    } finally {
      clearTimeout(requestTimeout);
      setIsSending(false);
    }
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  return (
    <div className="flex h-screen bg-[#f0fdf9] font-sans overflow-hidden selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 h-[calc(100vh-32px)] overflow-hidden flex flex-col">
        {/* Header */}
        <header className="h-[72px] bg-white rounded-[1.5rem] border border-[#d1fae5] shadow-sm flex items-center justify-between px-6 lg:px-8 shrink-0 mb-4">
          <div className="flex items-center gap-4">
            <div className="bg-[#ecfdf5] rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-[#a7f3d0] shrink-0">
              <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={loadChats}
              className="w-10 h-10 rounded-xl flex items-center justify-center text-[#9ca3af] hover:text-[#10b981] hover:bg-[#f0fdf9] transition-colors"
              title="Actualizar chats"
            >
              <RefreshCw size={18} className={isLoadingChats ? 'animate-spin text-[#10b981]' : ''} />
            </button>
            <div className="hidden md:flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10b981] to-[#0891b2] text-white flex items-center justify-center font-black shadow-sm">
                {(user?.nombre || 'U').charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="text-sm font-black text-[#134e4a]">{user?.nombre || 'Usuario'}</p>
                <p className="text-[11px] text-[#9ca3af]">{user?.rol || 'admin'}</p>
              </div>
              <ChevronDown size={16} className="text-[#9ca3af]" />
            </div>
          </div>
        </header>

        <div className="flex-1 mt-2 flex gap-4 min-h-0">

          {/* ── Lista de chats ── */}
          <div className="relative shrink-0 flex" style={{ width: sidebarWidth }}>
            <aside ref={sidebarRef} className="w-full bg-white rounded-[2rem] border border-[#d1fae5] shadow-sm flex flex-col overflow-hidden">
            {/* Tabs */}
            <div className="flex items-center justify-between px-4 pt-3 border-b border-gray-200 bg-white shrink-0">
              <div className="flex gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setActiveTab(tab.value)}
                    className={`pb-3 text-[13px] font-semibold transition-all relative ${
                      activeTab === tab.value
                        ? 'text-[#5d5fef]'
                        : 'text-slate-500 hover:text-slate-700'
                    }`}
                  >
                    {tab.label}
                    {activeTab === tab.value && (
                      <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#5d5fef] rounded-t-md" />
                    )}
                  </button>
                ))}
              </div>
              <button className="w-7 h-7 rounded bg-[#5d5fef] text-white flex items-center justify-center shadow-sm hover:bg-[#4b4cbf] transition-colors mb-2">
                <Plus size={18} />
              </button>
            </div>

            {/* Búsqueda */}
            <div className="p-3 flex items-center gap-2 border-b border-gray-100 bg-white shrink-0">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar contactos"
                  className="w-full h-9 pl-9 pr-8 rounded-lg bg-white border border-slate-200 text-[13px] outline-none focus:border-[#5d5fef] focus:ring-1 focus:ring-[#5d5fef] transition-all text-slate-700 placeholder:text-slate-400"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors shrink-0">
                <Filter size={16} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors shrink-0">
                <ListFilter size={16} />
              </button>
              <button className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors shrink-0">
                <CheckCheck size={16} />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {error && (
                <div className="m-2 rounded-2xl bg-red-50 border border-red-100 px-4 py-3 text-[12px] font-bold text-red-500 flex items-center gap-2">
                  <AlertCircle size={15} /> {error}
                </div>
              )}
              {isLoadingChats && !visibleChats.length ? (
                <div className="py-2">
                  {Array.from({ length: 6 }).map((_, i) => <SkeletonChatItem key={i} />)}
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
                <div className="h-full flex flex-col items-center justify-center p-8 text-center">
                  <MessageCircle size={36} className="mb-3 text-[#a7f3d0]" />
                  <p className="text-[12px] font-black uppercase tracking-widest text-[#9ca3af]">Sin conversaciones</p>
                </div>
              )}
            </div>
          </aside>
          
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute -right-2 top-0 bottom-0 w-4 cursor-col-resize hover:bg-[#5d5fef]/10 transition-colors z-10"
            title="Ajustar tamaño"
          />
        </div>

          {/* ── Ventana de chat ── */}
          <section className="flex-1 min-w-[320px] bg-white rounded-[2rem] border border-[#d1fae5] shadow-sm flex flex-col overflow-hidden relative">
            {selectedChat ? (
              <>
                {/* Header del chat */}
                <div className="h-[72px] bg-[#f9fffe] border-b border-[#f0fdf9] flex items-center justify-between px-6 shrink-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative">
                      <Avatar contact={selectedChat} size="md" />
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#10b981] border-2 border-white rounded-full" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="bg-white border border-emerald-200 rounded-lg px-2 py-1 text-sm font-black w-full focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            autoFocus
                          />
                          <button onClick={handleRename} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded">
                            <Check size={16} />
                          </button>
                          <button onClick={() => setIsEditingName(false)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                            <X size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 group cursor-pointer" onClick={() => {
                          setEditingNameValue(chatVisibleName(selectedChat));
                          setIsEditingName(true);
                        }}>
                          <h2 className="text-sm font-black text-[#134e4a] truncate tracking-tight">
                            {chatVisibleName(selectedChat)}
                          </h2>
                          <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-600 font-bold uppercase transition-opacity">Editar</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-[#0d9488] uppercase tracking-wide">
                          {selectedChat.dispositivo_nombre || 'S/D'}
                        </span>
                        <span className="w-1 h-1 rounded-full bg-[#a7f3d0]" />
                        <span className="text-[10px] font-medium text-[#9ca3af] uppercase">Conectado</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden xl:flex items-center gap-2 bg-[#f0fdf9] px-4 py-2 rounded-xl border border-[#d1fae5]">
                      <Users size={14} className="text-[#9ca3af]" />
                      <span className="text-[11px] font-bold text-[#6b7280] uppercase tracking-wide">{assignedLabel(selectedChat)}</span>
                      <ChevronDown size={13} className="text-[#9ca3af]" />
                    </div>
                    <button
                      type="button"
                      className="h-9 px-5 rounded-xl bg-gradient-to-r from-[#10b981] to-[#0d9488] text-white text-[11px] font-black uppercase tracking-wide shadow-sm hover:shadow-md transition-all active:scale-95"
                    >
                      Ver expediente
                    </button>
                  </div>
                </div>

                {/* Mensajes */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 bg-[#f9fffe]">
                  <div className="max-w-3xl mx-auto space-y-4">
                    <div className="flex justify-center mb-6">
                      <span className="px-4 py-1 rounded-full bg-[#ecfdf5] border border-[#a7f3d0] text-[#059669] text-[10px] font-black uppercase tracking-[0.2em]">
                        Conversación de hoy
                      </span>
                    </div>
                    {messages.length > 0 ? (
                      messages.map((message) => (
                        <MessageBubble key={message.id || message.timestamp} message={message} />
                      ))
                    ) : (
                      <EmptyState title="Sin mensajes" text="Este contacto todavía no tiene historial guardado en GeoCHAT." />
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </div>

                {/* Error de mensajes */}
                {messageError && (
                  <div className="mx-6 mb-2 rounded-xl bg-amber-50 border border-amber-200 px-4 py-2 text-[11px] font-bold text-amber-700 flex items-center gap-2">
                    <AlertCircle size={14} /> {messageError}
                  </div>
                )}

                {/* Input de mensaje */}
                <form onSubmit={handleSubmit} className="bg-white rounded-[1.5rem] mx-4 mb-4 px-5 py-4 border border-[#d1fae5] shadow-sm">
                  <div className="flex items-end gap-3">
                    <div className="flex-1 min-w-0 bg-[#f0fdf9] rounded-xl border border-[#d1fae5] focus-within:border-[#10b981] focus-within:ring-2 focus-within:ring-emerald-50 transition-all px-4 py-3">
                      <textarea
                        value={draftMessage}
                        onChange={(event) => setDraftMessage(event.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        rows={1}
                        className="w-full resize-none bg-transparent text-[14px] outline-none text-[#374151] placeholder:text-[#9ca3af]"
                      />
                      <div className="mt-2 pt-2 border-t border-[#d1fae5] flex items-center justify-between">
                        <div className="flex items-center gap-3 text-[#9ca3af]">
                          <button type="button" className="hover:text-[#10b981] p-1 transition-colors" title="Emoji"><Smile size={18} /></button>
                          <button type="button" className="hover:text-[#10b981] p-1 transition-colors" title="Adjuntar"><Paperclip size={18} /></button>
                          <button type="button" className="hover:text-[#10b981] p-1 transition-colors" title="Documento"><FileText size={17} /></button>
                        </div>
                        <span className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wide">{chatPhoneLabel(selectedChat)}</span>
                      </div>
                    </div>
                    <button
                      type="submit"
                      className="w-12 h-12 rounded-xl bg-gradient-to-br from-[#10b981] to-[#0d9488] text-white flex items-center justify-center shadow-md shadow-emerald-200 hover:shadow-lg transition-all active:scale-90 disabled:opacity-30 disabled:grayscale shrink-0"
                      disabled={!draftMessage.trim() || isSending}
                    >
                      {isSending ? <RefreshCw size={20} className="animate-spin" /> : <Send size={20} />}
                    </button>
                  </div>
                </form>
              </>
            ) : (
              <EmptyState title="Selecciona un chat" text="Las conversaciones aparecerán aquí una vez seleccionadas." />
            )}
          </section>

          {/* ── Panel de contacto ── */}
          <aside className="hidden xl:flex w-[320px] shrink-0 bg-white rounded-[2rem] border border-[#d1fae5] shadow-sm flex-col min-h-0">
            {selectedChat ? (
              <>
                <div className="h-[64px] flex items-center justify-between px-5 border-b border-[#f0fdf9] shrink-0">
                  <button
                    onClick={() => handleSyncChat(selectedChat)}
                    disabled={isSyncing}
                    className={`flex items-center gap-2 text-[10px] font-black transition-colors ${isSyncing ? 'text-[#9ca3af]' : 'text-[#10b981] hover:text-[#059669]'}`}
                  >
                    <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
                    <span>{isSyncing ? 'SINCRONIZANDO...' : 'SINCRONIZAR'}</span>
                  </button>
                  <button onClick={() => setSelectedChat(null)} type="button" className="text-[#9ca3af] hover:text-[#10b981] transition-colors">
                    <X size={20} />
                  </button>
                </div>

                <div className="p-6 border-b border-[#f0fdf9] flex flex-col items-center text-center bg-[#f9fffe]">
                  <Avatar contact={selectedChat} size="lg" />
                  <h3 className="mt-4 font-black text-lg text-[#134e4a] tracking-tight">{chatVisibleName(selectedChat)}</h3>
                  <p className="text-sm text-[#0d9488] font-bold mt-1">{chatPhoneLabel(selectedChat)}</p>
                  
                  {/* Tags del contacto */}
                  <div className="mt-4 flex flex-wrap justify-center gap-1.5 max-w-full">
                    {contactTags.length > 0 ? (
                      contactTags.map(tag => (
                        <span 
                          key={tag.id} 
                          className="px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm"
                          style={{ backgroundColor: tag.color || '#5d5fef' }}
                        >
                          {tag.nombre}
                        </span>
                      ))
                    ) : (
                      <span className="px-4 py-1 bg-[#ecfdf5] rounded-full text-[10px] font-black uppercase tracking-widest text-[#059669] border border-[#a7f3d0]">
                        {selectedChat.estado || 'Cliente Activo'}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-5 space-y-6">
                    <div>
                      <span className="text-[10px] font-black text-[#9ca3af] uppercase tracking-widest block mb-3">Información</span>
                      <div className="space-y-2">
                        {/* Datos Básicos */}
                        <div className="flex items-center gap-3 bg-[#f0fdf9] p-3 rounded-xl border border-[#d1fae5] hover:border-[#10b981] transition-all">
                          <Phone size={14} className="text-[#10b981] shrink-0" />
                          <span className="text-xs font-bold text-[#374151] truncate">{chatPhoneLabel(selectedChat)}</span>
                        </div>
                        {selectedChat.correo && (
                          <div className="flex items-center gap-3 bg-[#f0fdf9] p-3 rounded-xl border border-[#d1fae5] hover:border-[#10b981] transition-all">
                            <Mail size={14} className="text-[#10b981] shrink-0" />
                            <span className="text-xs font-bold text-[#374151] truncate">{selectedChat.correo}</span>
                          </div>
                        )}
                        {selectedChat.empresa && (
                          <div className="flex items-center gap-3 bg-[#f0fdf9] p-3 rounded-xl border border-[#d1fae5] hover:border-[#10b981] transition-all">
                            <Bot size={14} className="text-[#10b981] shrink-0" />
                            <span className="text-xs font-bold text-[#374151] truncate">{selectedChat.empresa}</span>
                          </div>
                        )}

                        {/* Campos Customizados */}
                        {contactFields.filter(f => f.valor).map(field => (
                          <div key={field.id} className="flex items-center gap-3 bg-white p-3 rounded-xl border border-[#d1fae5] hover:border-[#10b981] transition-all shadow-sm">
                            <FileText size={14} className="text-[#10b981] shrink-0" />
                            <div className="min-w-0">
                              <p className="text-[9px] font-black text-[#9ca3af] uppercase tracking-wider leading-none mb-1">{field.nombre}</p>
                              <p className="text-xs font-bold text-[#374151] truncate">{field.valor}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <span className="text-[10px] font-black text-[#9ca3af] uppercase tracking-widest block mb-3">Notas internas</span>
                      <textarea
                        rows={4}
                        placeholder="Escribe notas privadas aquí..."
                        className="w-full rounded-xl bg-[#f0fdf9] border border-[#d1fae5] p-3 text-xs text-[#374151] resize-none outline-none focus:border-[#10b981] focus:ring-2 focus:ring-emerald-50 transition-all placeholder:text-[#9ca3af]"
                      />
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <EmptyState title="Sin contacto" text="Selecciona una conversación para ver los datos del contacto." />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
