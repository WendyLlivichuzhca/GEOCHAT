import React, { useEffect, useMemo, useRef, useState } from 'react';
import EmojiPicker from 'emoji-picker-react';
import {
  AlertCircle,
  Bell,
  Bold,
  Bot,
  Calendar,
  Check,
  CheckCheck,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Filter,
  Image,
  Italic,
  Link,
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
  Settings,
  Smile,
  Strikethrough,
  User,
  Users,
  X,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { SkeletonChatItem } from './Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className={`bg-white w-full ${maxWidth} rounded-[2rem] shadow-2xl animate-in zoom-in-95 duration-200 relative z-[110]`}>
        <div className="px-8 py-6 flex justify-between items-center border-b border-slate-100">
          <h3 className="font-black text-slate-800 text-xl tracking-tight">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-50 rounded-xl">
            <X size={20} />
          </button>
        </div>
        <div className="p-8">{children}</div>
      </div>
    </div>
  );
};

const COUNTRIES = [
  { name: 'Ecuador', code: 'EC', dial: '+593', flag: '🇪🇨' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: '🇨🇴' },
  { name: 'Perú', code: 'PE', dial: '+51', flag: '🇵🇪' },
  { name: 'México', code: 'MX', dial: '+52', flag: '🇲🇽' },
  { name: 'España', code: 'ES', dial: '+34', flag: '🇪🇸' },
  { name: 'Argentina', code: 'AR', dial: '+54', flag: '🇦🇷' },
  { name: 'Estados Unidos', code: 'US', dial: '+1', flag: '🇺🇸' },
];

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

function inferComposerFileType(file) {
  const mime = String(file?.type || '').toLowerCase();
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'document';
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

function formatMessageText(text) {
  if (!text) return '';
  const str = String(text);
  const linkRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
  const linkChunkRegex = /^(https?:\/\/[^\s]+|www\.[^\s]+)$/i;

  const renderLinkifiedText = (value, keyPrefix) =>
    value.split(linkRegex).map((chunk, chunkIndex) => {
      if (!chunk) return null;
      if (linkChunkRegex.test(chunk)) {
        const href = /^https?:\/\//i.test(chunk) ? chunk : `https://${chunk}`;
        return (
          <a
            key={`${keyPrefix}-link-${chunkIndex}`}
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 font-semibold underline underline-offset-4 decoration-emerald-300 text-inherit hover:bg-white/25 hover:text-[#d1fae5] break-all transition-colors"
          >
            {chunk}
          </a>
        );
      }
      return <React.Fragment key={`${keyPrefix}-text-${chunkIndex}`}>{chunk}</React.Fragment>;
    });
  
  // Regex para WhatsApp: *negrita*, _cursiva_, ~tachado~
  const parts = str.split(/(\*[^*]+\*|_[^_]+_|~[^~]+~)/g);
  
  return parts.map((part, index) => {
    if (part.startsWith('*') && part.endsWith('*')) {
      return <strong key={index} className="font-bold">{renderLinkifiedText(part.slice(1, -1), `bold-${index}`)}</strong>;
    }
    if (part.startsWith('_') && part.endsWith('_')) {
      return <em key={index} className="italic">{renderLinkifiedText(part.slice(1, -1), `italic-${index}`)}</em>;
    }
    if (part.startsWith('~') && part.endsWith('~')) {
      return <s key={index} className="line-through opacity-70">{renderLinkifiedText(part.slice(1, -1), `strike-${index}`)}</s>;
    }
    return <React.Fragment key={`plain-${index}`}>{renderLinkifiedText(part, `plain-${index}`)}</React.Fragment>;
  });
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
            {formatMessageText(body)}
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
  const [isSavingInternalNote, setIsSavingInternalNote] = useState(false);
  const [error, setError] = useState('');
  const [messageError, setMessageError] = useState('');
  const [notesError, setNotesError] = useState('');
  const messagesEndRef = useRef(null);
  const selectedChatRef = useRef(null);
  const chatDeviceRef = useRef(null);
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingNameValue, setEditingNameValue] = useState('');
  const refreshingChatsRef = useRef(false);

  // Estados para Modal de Nuevo Chat
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [devices, setDevices] = useState([]);
  const [newChatData, setNewChatData] = useState({
    phone: '',
    deviceId: '',
  });

  // Tags y campos del contacto seleccionado
  const [contactTags, setContactTags] = useState([]);
  const [contactFields, setContactFields] = useState([]);
  const [contactNotes, setContactNotes] = useState([]);
  const [isInternalNoteMode, setIsInternalNoteMode] = useState(false);
  const [internalNoteDraft, setInternalNoteDraft] = useState('');

  // Estados para filtros
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: 'all', // 'unread', 'open', 'closed', 'all'
    tags: [],
    agents: [],
    deviceId: 'all',
  });
  const [sortOrder, setSortOrder] = useState('latest'); // 'latest', 'oldest', 'unread', 'name'
  const [showSort, setShowSort] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkInputValue, setLinkInputValue] = useState('');
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [recentFiles, setRecentFiles] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isRecordingAudio, setIsRecordingAudio] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [allTags, setAllTags] = useState([]);
  const fileInputRef = useRef(null);
  const audioRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const audioStreamRef = useRef(null);
  const [allAgents, setAllAgents] = useState([]); // Por ahora vacío hasta tener endpoint

  // Resize sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(340);
  const isDragging = useRef(false);
  const sidebarRef = useRef(null);
  const messageInputRef = useRef(null);

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
    if (!isRecordingAudio) return undefined;
    const timer = setInterval(() => {
      setRecordingSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isRecordingAudio]);

  useEffect(() => {
    return () => {
      if (audioRecorderRef.current && audioRecorderRef.current.state !== 'inactive') {
        audioRecorderRef.current.stop();
      }
      if (audioStreamRef.current) {
        audioStreamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

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
    loadDevices();
    loadAllTags();
    loadAllAgents();
  }, [user.id, debouncedSearch]);

  const loadAllAgents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/agents`);
      const data = await res.json();
      if (data.success) setAllAgents(data.agents || []);
    } catch (err) { console.error("Error cargando agentes:", err); }
  };

  const loadAllTags = async () => {
    try {
      const res = await fetch(`${API_URL}/api/tags`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();
      if (data.success) setAllTags(data.tags || []);
    } catch (err) { console.error("Error cargando tags:", err); }
  };

  const loadDevices = async () => {
    try {
      const res = await fetch(`${API_URL}/api/dashboard/${user.id}`);
      const data = await res.json();
      if (data.success && data.dashboard) {
        setDevices(data.dashboard.devices || []);
      }
    } catch (err) {
      console.error('Error cargando dispositivos:', err);
    }
  };

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
      if (!selectedChat?.id || selectedChat?.is_group) {
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
  }, [selectedChat?.id, selectedChat?.is_group]);

  useEffect(() => {
    const fetchContactNotes = async () => {
      if (!selectedChat?.id || selectedChat?.is_group || !user?.id) {
        setContactNotes([]);
        setNotesError('');
        return;
      }

      try {
        const res = await fetch(`${API_URL}/api/contacts/${selectedChat.id}/notes?user_id=${user.id}`);
        const data = await res.json();
        if (data.success) {
          setContactNotes(data.notes || []);
          setNotesError('');
        } else {
          setNotesError(data.message || 'No se pudieron cargar las notas internas.');
        }
      } catch (err) {
        console.error('Error fetching contact notes:', err);
        setNotesError('No se pudieron cargar las notas internas.');
      }
    };

    fetchContactNotes();
  }, [selectedChat?.id, selectedChat?.is_group, user?.id]);

  useEffect(() => {
    setIsInternalNoteMode(false);
    setInternalNoteDraft('');
    setNotesError('');
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
    let filtered = chats;

    // Filtro por Tab (Todos, Mis Chats, Favoritos)
    if (activeTab === 'mios') {
      filtered = filtered.filter(c => Number(c.agente_asignado_id || 0) === Number(user?.id || 0));
    } else if (activeTab === 'favoritos') {
      filtered = filtered.filter(c => c.favorito); // Asumiendo campo favorito
    }

    // Filtro por Estado (Leídos, Abiertos, Cerrados)
    if (filters.status === 'unread') {
      filtered = filtered.filter(c => (c.mensajes_sin_leer || 0) > 0);
    } else if (filters.status === 'open') {
      filtered = filtered.filter(c => c.estado_lead !== 'cerrado');
    } else if (filters.status === 'closed') {
      filtered = filtered.filter(c => c.estado_lead === 'cerrado');
    }

    // Filtro por Dispositivo
    if (filters.deviceId !== 'all') {
      filtered = filtered.filter(c => String(c.dispositivo_id) === String(filters.deviceId));
    }

    // Filtro por Tags (Si hay tags seleccionados, el contacto debe tener al menos uno)
    if (filters.tags.length > 0) {
      filtered = filtered.filter(c => 
        c.tags && c.tags.some(tag => filters.tags.includes(tag.id))
      );
    }

    // Filtro por Agentes
    if (filters.agents.length > 0) {
      filtered = filtered.filter(c => filters.agents.includes(Number(c.agente_asignado_id)));
    }

    // Filtro por Búsqueda (ya manejado por el fetch en loadChats, pero por si acaso re-filtramos)
    if (debouncedSearch) {
      const lowerSearch = debouncedSearch.toLowerCase();
      filtered = filtered.filter(c => 
        (c.display_name && c.display_name.toLowerCase().includes(lowerSearch)) ||
        (c.telefono && c.telefono.includes(lowerSearch)) ||
        (c.jid && c.jid.includes(lowerSearch))
      );
    }

    let final = [...filtered];
    
    // Aplicar Ordenamiento
    if (sortOrder === 'latest') {
      final.sort((a, b) => (b.last_timestamp || 0) - (a.last_timestamp || 0));
    } else if (sortOrder === 'oldest') {
      final.sort((a, b) => (a.last_timestamp || 0) - (b.last_timestamp || 0));
    } else if (sortOrder === 'unread') {
      final.sort((a, b) => (b.mensajes_sin_leer || 0) - (a.mensajes_sin_leer || 0));
    } else if (sortOrder === 'name') {
      final.sort((a, b) => (chatVisibleName(a)).localeCompare(chatVisibleName(b)));
    }

    return final;
  }, [chats, activeTab, filters, sortOrder, debouncedSearch, user?.id]);

  const filterCounts = useMemo(() => {
    return {
      unread: chats.filter(c => (c.mensajes_sin_leer || 0) > 0).length,
      open: chats.filter(c => c.estado_lead !== 'cerrado').length,
      closed: chats.filter(c => c.estado_lead === 'cerrado').length,
      all: chats.length
    };
  }, [chats]);

  const deviceColors = ['#e91e63', '#ffc107', '#4caf50', '#2196f3', '#9c27b0', '#ff5722'];

  const fetchRecentFiles = async () => {
    setIsLoadingRecent(true);
    try {
      const resp = await fetch(`${API_URL}/api/chats/recent-media`);
      const data = await resp.json();
      if (data.success) {
        setRecentFiles(data.files || []);
      }
    } catch (err) {
      console.error('Error fetching recent files:', err);
    } finally {
      setIsLoadingRecent(false);
    }
  };

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !selectedChat) return;

    setIsInternalNoteMode(false);
    setInternalNoteDraft('');
    setNotesError('');
    setSelectedFile({
      file,
      preview: URL.createObjectURL(file),
      type: inferComposerFileType(file)
    });
    setIsGalleryOpen(false);
    e.target.value = '';
  };

  const startAudioRecording = async () => {
    if (!selectedChat) return;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      audioStreamRef.current = stream;

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const chunks = audioChunksRef.current || [];
        if (chunks.length) {
          const mimeType = recorder.mimeType || 'audio/webm';
          const extension = mimeType.includes('ogg') ? 'ogg' : 'webm';
          const audioBlob = new Blob(chunks, { type: mimeType });
          const audioFile = new File([audioBlob], `audio-${Date.now()}.${extension}`, { type: mimeType });

          setSelectedFile({
            file: audioFile,
            preview: URL.createObjectURL(audioBlob),
            type: 'audio'
          });
        }

        if (audioStreamRef.current) {
          audioStreamRef.current.getTracks().forEach((track) => track.stop());
          audioStreamRef.current = null;
        }

        audioRecorderRef.current = null;
        audioChunksRef.current = [];
        setIsRecordingAudio(false);
        setRecordingSeconds(0);
      };

      recorder.start();
      audioRecorderRef.current = recorder;
      setSelectedFile(null);
      setIsInternalNoteMode(false);
      setInternalNoteDraft('');
      setNotesError('');
      setMessageError('');
      setRecordingSeconds(0);
      setIsRecordingAudio(true);
    } catch (error) {
      setMessageError('No se pudo acceder al micrófono. Revisa los permisos del navegador.');
    }
  };

  const stopAudioRecording = () => {
    if (!audioRecorderRef.current) return;
    if (audioRecorderRef.current.state !== 'inactive') {
      audioRecorderRef.current.stop();
    }
  };

  const toggleAudioRecording = async () => {
    if (isRecordingAudio) {
      stopAudioRecording();
      return;
    }
    await startAudioRecording();
  };

  useEffect(() => {
  }, [isGalleryOpen]);

  const updateActiveComposerValue = (nextValue) => {
    if (isInternalNoteMode) {
      setInternalNoteDraft(nextValue);
      return;
    }
    setDraftMessage(nextValue);
  };

  const getActiveComposerValue = () => (isInternalNoteMode ? internalNoteDraft : draftMessage);

  const applyFormatting = (format) => {
    if (!messageInputRef.current) return;
    
    const { selectionStart, selectionEnd } = messageInputRef.current;
    const activeValue = getActiveComposerValue();
    const selectedText = activeValue.substring(selectionStart, selectionEnd);
    
    let char = '';
    if (format === 'bold') char = '*';
    else if (format === 'italic') char = '_';
    else if (format === 'strikethrough') char = '~';
    
    if (!char) return;

    const newMessage = 
      activeValue.substring(0, selectionStart) + 
      char + selectedText + char + 
      activeValue.substring(selectionEnd);
    
    updateActiveComposerValue(newMessage);
    
    setTimeout(() => {
      if (messageInputRef.current) {
        messageInputRef.current.focus();
        if (selectedText) {
          messageInputRef.current.setSelectionRange(
            selectionStart, 
            selectionEnd + char.length * 2
          );
        } else {
          messageInputRef.current.setSelectionRange(
            selectionStart + char.length, 
            selectionStart + char.length
          );
        }
      }
    }, 0);
  };

  const handleInsertLink = () => {
    if (!messageInputRef.current) return;
    setLinkInputValue('');
    setShowLinkModal(true);
  };

  const confirmInsertLink = () => {
    if (!messageInputRef.current || !linkInputValue.trim()) return;

    const normalizedUrl = /^https?:\/\//i.test(linkInputValue.trim())
      ? linkInputValue.trim()
      : `https://${linkInputValue.trim()}`;

    const activeValue = getActiveComposerValue();
    const { selectionStart, selectionEnd } = messageInputRef.current;
    const selectedText = activeValue.substring(selectionStart, selectionEnd).trim();

    const insertion = selectedText
      ? `${selectedText} ${normalizedUrl}`
      : normalizedUrl;

    const nextValue =
      activeValue.substring(0, selectionStart) +
      insertion +
      activeValue.substring(selectionEnd);

    updateActiveComposerValue(nextValue);
    setShowLinkModal(false);
    setLinkInputValue('');

    setTimeout(() => {
      if (!messageInputRef.current) return;
      const nextCursor = selectionStart + insertion.length;
      messageInputRef.current.focus();
      messageInputRef.current.setSelectionRange(nextCursor, nextCursor);
    }, 0);
  };

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
    setNotesError('');
    setDraftMessage('');
    setInternalNoteDraft('');
    setIsInternalNoteMode(false);
    // El auto-sync automático se eliminó porque generaba errores en cascada:
    // disparaba para cada chat sin foto/mensaje (incluyendo JIDs @lid no resolvibles)
    // y fallaba con 500 cuando bridge.js no está corriendo.
    // El usuario puede sincronizar manualmente con el botón SINCRONIZAR del panel derecho.
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!selectedChat) return;

    if (isInternalNoteMode) {
      if (selectedChat?.is_group) {
        setNotesError('Las notas internas solo estan disponibles para contactos individuales.');
        return;
      }

      if (!internalNoteDraft.trim()) return;

      setIsSavingInternalNote(true);
      setNotesError('');
      try {
        const response = await fetch(`${API_URL}/api/contacts/${selectedChat.id}/notes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            contenido: internalNoteDraft.trim(),
          }),
        });

        const data = await response.json().catch(() => ({}));
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'No se pudo guardar la nota interna.');
        }

        setContactNotes((prev) => (data.note ? [data.note, ...prev] : prev));
        setInternalNoteDraft('');
        setIsInternalNoteMode(false);
        return;
      } catch (error) {
        setNotesError(error?.message || 'No se pudo guardar la nota interna.');
        return;
      } finally {
        setIsSavingInternalNote(false);
      }
    }

    if ((!draftMessage.trim() && !selectedFile) || !selectedChat) return;

    const messageToSend = draftMessage.trim();
    const chatKey = encodeURIComponent(selectedChat?.jid || selectedChat?.id);
    const controller = new AbortController();
    const requestTimeout = setTimeout(() => controller.abort(), 20000);

    setIsSending(true);
    setMessageError('');

    try {
      let response;
      const headers = {};
      let body;

      if (selectedFile) {
        // Enviar como FormData si hay un archivo (nuevo o de galería)
        const formData = new FormData();
        formData.append('text', messageToSend);
        
        if (selectedFile.file instanceof File) {
          formData.append('file', selectedFile.file);
        } else if (selectedFile.preview) {
          // Si es de la galería, enviamos la URL
          formData.append('media_url', selectedFile.preview);
        }
        
        formData.append('tipo', selectedFile.type);
        body = formData;
      } else {
        // Enviar solo texto
        body = JSON.stringify({ text: messageToSend });
        headers['Content-Type'] = 'application/json';
      }

      response = await fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/messages`, {
        method: 'POST',
        headers: headers,
        signal: controller.signal,
        body: body,
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo enviar el mensaje.');
      }

      setSelectedFile(null); // Limpiar preview tras enviar
      setDraftMessage('');

      if (data.chat) {
        setSelectedChat((prev) => (prev ? { ...prev, ...data.chat } : data.chat));
      }

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

  const fetchDevices = async () => {
    try {
      const response = await fetch(`${API_URL}/api/dashboard/${user.id}`);
      const data = await response.json();
      if (data.success) {
        const devList = data.dashboard?.devices || [];
        setDevices(devList);
        if (devList.length > 0 && !newChatData.deviceId) {
          setNewChatData(prev => ({ ...prev, deviceId: devList[0].id }));
        }
      }
    } catch (err) {
      console.error('Error fetching devices:', err);
    }
  };

  useEffect(() => {
    if (showNewChatModal) {
      fetchDevices();
    }
  }, [showNewChatModal]);

  const handleOpenNewChat = () => {
    const fullPhone = newChatData.phone.replace(/\D/g, '');
    if (!fullPhone || !newChatData.deviceId) return;

    const jid = `${fullPhone}@s.whatsapp.net`;
    
    // Buscar si ya existe el chat en la lista cargada
    const existing = chats.find(c => c.jid === jid);
    if (existing) {
      selectChat(existing);
    } else {
      // Si no existe, creamos un chat "virtual" temporal para abrir la ventana
      const virtualChat = {
        id: `temp_${Date.now()}`,
        jid: jid,
        nombre: `+${fullPhone}`,
        display_name: `+${fullPhone}`,
        telefono: jid.split('@')[0],
        dispositivo_id: newChatData.deviceId,
        ultimo_mensaje: '',
        mensajes_sin_leer: 0,
        estado: 0,
        es_mio: false
      };
      setSelectedChat(virtualChat);
      setMessages([]); // Limpiar mensajes para el nuevo chat
    }
    
    setShowNewChatModal(false);
    // Resetear form pero mantener el dispositivo seleccionado para la próxima
    setNewChatData(prev => ({ ...prev, phone: '' }));
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
            <aside ref={sidebarRef} className="w-full bg-white rounded-[2rem] border border-[#d1fae5] shadow-sm flex flex-col">
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
              <button 
                onClick={() => setShowNewChatModal(true)}
                className="w-7 h-7 rounded bg-[#5d5fef] text-white flex items-center justify-center shadow-sm hover:bg-[#4b4cbf] transition-colors mb-2"
              >
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
              <div className="relative">
                <button 
                  onClick={() => setShowFilters(!showFilters)}
                  className={`relative w-9 h-9 flex items-center justify-center rounded-lg border transition-all shrink-0 ${showFilters ? 'bg-[#5d5fef] text-white border-[#5d5fef]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >
                  <Filter size={16} />
                  {(filters.status !== 'all' || filters.tags.length > 0 || filters.agents.length > 0 || filters.deviceId !== 'all') && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#5d5fef] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                      1
                    </div>
                  )}
                </button>

                {showFilters && (
                  <div className="absolute top-full left-0 mt-2 w-[310px] bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                    <div className="p-6 space-y-6">
                      {/* Estado */}
                      <div className="space-y-3">
                        {[
                          { id: 'unread', label: 'Conversaciones no leídas', count: filterCounts.unread },
                          { id: 'open', label: 'Conversaciones abiertas', count: filterCounts.open },
                          { id: 'closed', label: 'Conversaciones cerradas', count: filterCounts.closed },
                          { id: 'all', label: 'Todas las conversaciones', count: filterCounts.all }
                        ].map(opt => (
                          <label key={opt.id} className="flex items-center justify-between group cursor-pointer">
                            <div className="flex items-center gap-3">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${filters.status === opt.id ? 'border-[#5d5fef] bg-[#5d5fef]' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                                {filters.status === opt.id && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <input 
                                type="radio" 
                                className="hidden" 
                                name="filterStatus"
                                checked={filters.status === opt.id}
                                onChange={() => setFilters(prev => ({ ...prev, status: opt.id }))}
                              />
                              <span className={`text-sm font-bold transition-colors ${filters.status === opt.id ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                {opt.label}
                              </span>
                            </div>
                            {opt.count > 0 && (
                              <span className="min-w-[24px] h-6 px-1.5 flex items-center justify-center rounded-full bg-indigo-50 text-[#5d5fef] text-[11px] font-black">
                                {opt.count}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>

                      {/* Tags */}
                      <div className="pt-4 border-t border-slate-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Tags</h4>
                          <ChevronUp size={16} className="text-slate-400" />
                        </div>
                        <div className="relative">
                          <select 
                            value={filters.tags[0] || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value ? [Number(e.target.value)] : [] }))}
                            className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-400 outline-none appearance-none focus:border-[#5d5fef]/20 transition-all cursor-pointer"
                          >
                            <option value="">Seleccionar tag</option>
                            {allTags.map(tag => (
                              <option key={tag.id} value={tag.id}>{tag.nombre}</option>
                            ))}
                          </select>
                          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        </div>
                      </div>

                      {/* Agentes */}
                      <div className="pt-4 border-t border-slate-50">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Agentes</h4>
                          <ChevronUp size={16} className="text-slate-400" />
                        </div>
                        <div className="relative">
                          <select 
                            value={filters.agents[0] || ''}
                            onChange={(e) => setFilters(prev => ({ ...prev, agents: e.target.value ? [Number(e.target.value)] : [] }))}
                            className="w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-bold text-slate-800 outline-none appearance-none focus:border-[#5d5fef]/20 transition-all cursor-pointer"
                          >
                            <option value="">Seleccionar agente</option>
                            <option value={user.id}>{user.nombre} (Yo)</option>
                          </select>
                          <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                        </div>
                      </div>

                      {/* Por dispositivo */}
                      <div className="pt-4 border-t border-slate-50 pb-2">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-[12px] font-black text-slate-800 uppercase tracking-widest">Por dispositivo</h4>
                          <ChevronUp size={16} className="text-slate-400" />
                        </div>
                        <div className="space-y-3">
                          <label className="flex items-center gap-3 group cursor-pointer">
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${filters.deviceId === 'all' ? 'border-[#5d5fef] bg-[#5d5fef]' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                              {filters.deviceId === 'all' && <div className="w-2 h-2 rounded-full bg-white" />}
                            </div>
                            <input 
                              type="radio" 
                              className="hidden" 
                              name="filterDevice"
                              checked={filters.deviceId === 'all'}
                              onChange={() => setFilters(prev => ({ ...prev, deviceId: 'all' }))}
                            />
                            <div className="w-2 h-2 rounded-full bg-slate-300" />
                            <span className={`text-sm font-bold transition-colors ${filters.deviceId === 'all' ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>
                              Todos
                            </span>
                          </label>
                          {devices.map((d, idx) => (
                            <label key={d.id} className="flex items-center gap-3 group cursor-pointer">
                              <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${String(filters.deviceId) === String(d.id) ? 'border-[#5d5fef] bg-[#5d5fef]' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                                {String(filters.deviceId) === String(d.id) && <div className="w-2 h-2 rounded-full bg-white" />}
                              </div>
                              <input 
                                type="radio" 
                                className="hidden" 
                                name="filterDevice"
                                checked={String(filters.deviceId) === String(d.id)}
                                onChange={() => setFilters(prev => ({ ...prev, deviceId: d.id }))}
                              />
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: deviceColors[idx % deviceColors.length] }} />
                              <span className={`text-sm font-bold transition-colors ${String(filters.deviceId) === String(d.id) ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                {d.nombre} ({String(d.numero_telefono).slice(-4)})
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="p-4 bg-white flex flex-col items-center border-t border-slate-50">
                      <button 
                        onClick={() => {
                          setFilters({ status: 'all', tags: [], agents: [], deviceId: 'all' });
                          setShowFilters(false);
                        }}
                        className="text-sm font-bold text-[#5d5fef] hover:underline transition-all"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </div>
                )}
              </div>
              <div className="relative">
                <button 
                  onClick={() => setShowSort(!showSort)}
                  className={`w-9 h-9 flex items-center justify-center rounded-lg border transition-all shrink-0 ${showSort ? 'bg-[#5d5fef] text-white border-[#5d5fef]' : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'}`}
                >
                  <ListFilter size={16} />
                </button>

                {showSort && (
                  <div className="absolute top-full right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 z-[100] p-2 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    {[
                      { id: 'latest', label: 'Más recientes', icon: <RefreshCw size={14} /> },
                      { id: 'oldest', label: 'Más antiguos', icon: <Calendar size={14} /> },
                      { id: 'unread', label: 'No leídos primero', icon: <Bell size={14} /> },
                      { id: 'name', label: 'Nombre A-Z', icon: <User size={14} /> },
                    ].map(opt => (
                      <button
                        key={opt.id}
                        onClick={() => { setSortOrder(opt.id); setShowSort(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[12px] font-bold transition-colors ${sortOrder === opt.id ? 'bg-indigo-50 text-[#5d5fef]' : 'text-slate-600 hover:bg-slate-50'}`}
                      >
                        <span className={sortOrder === opt.id ? 'text-[#5d5fef]' : 'text-slate-400'}>
                          {opt.icon}
                        </span>
                        {opt.label}
                        {sortOrder === opt.id && <Check size={14} className="ml-auto" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <button 
                onClick={async () => {
                  if (window.confirm('¿Marcar todas las conversaciones como leídas?')) {
                    try {
                      const res = await fetch(`${API_URL}/api/chats/mark-all-read`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id: user.id })
                      });
                      if (res.ok) loadChats({ silent: true });
                    } catch (err) { console.error(err); }
                  }
                }}
                className="w-9 h-9 flex items-center justify-center rounded-lg bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100 transition-colors shrink-0"
                title="Marcar todos como leídos"
              >
                <CheckCheck size={16} />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 overflow-hidden rounded-b-[2rem]">
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
                <form
                  onSubmit={handleSubmit}
                  className={`bg-white rounded-[1.5rem] mx-4 mb-4 shadow-sm overflow-visible transition-colors ${
                    isInternalNoteMode ? 'border border-amber-200' : 'border border-[#d1fae5]'
                  }`}
                >
                  <div className={`px-4 py-4 border-b transition-colors ${isInternalNoteMode ? 'bg-[#fff8cc] border-[#f4e8a4]' : 'bg-white border-[#ecfdf5]'}`}>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 min-w-0">
                        {isRecordingAudio && (
                          <div className="mb-3 flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-rose-700">
                            <span className="inline-flex h-2.5 w-2.5 rounded-full bg-rose-500 animate-pulse"></span>
                            <span className="text-xs font-bold">Grabando audio...</span>
                            <span className="text-xs tabular-nums ml-auto">{`${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`}</span>
                          </div>
                        )}
                        {selectedFile && (
                          <div className="mb-3 flex animate-in slide-in-from-left-4 duration-300">
                            <div className="relative group">
                              <div className="w-20 h-20 rounded-xl border-2 border-amber-300/60 overflow-hidden shadow-lg bg-white">
                                {selectedFile.type === 'image' ? (
                                  <img src={selectedFile.preview} alt="preview" className="w-full h-full object-cover" />
                                ) : selectedFile.type === 'audio' ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-50 px-2">
                                    <Mic size={20} className="text-emerald-500" />
                                    <span className="text-[8px] font-black text-emerald-600 uppercase">Audio</span>
                                  </div>
                                ) : selectedFile.type === 'video' ? (
                                  <video src={selectedFile.preview} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-slate-50">
                                    <FileText size={24} className="text-[#f6c945]" />
                                    <span className="text-[8px] font-black text-slate-400 uppercase">{selectedFile.file.name.split('.').pop()}</span>
                                  </div>
                                )}
                              </div>
                              <button
                                type="button"
                                onClick={() => setSelectedFile(null)}
                                className="absolute -top-2 -right-2 w-5 h-5 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-md hover:bg-rose-600 transition-colors z-10"
                              >
                                <X size={12} />
                              </button>
                            </div>
                            {selectedFile.type === 'audio' && (
                              <div className="ml-3 min-w-0 flex-1 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-2">
                                <p className="text-[11px] font-bold text-emerald-700 truncate mb-2">{selectedFile.file?.name || 'audio.ogg'}</p>
                                <audio controls className="w-full h-8">
                                  <source src={selectedFile.preview} type={selectedFile.file?.type || 'audio/ogg'} />
                                </audio>
                              </div>
                            )}
                          </div>
                        )}
                        <textarea
                          ref={messageInputRef}
                          value={isInternalNoteMode ? internalNoteDraft : draftMessage}
                          onChange={(event) => {
                            if (isInternalNoteMode) {
                              setInternalNoteDraft(event.target.value);
                            } else {
                              setDraftMessage(event.target.value);
                            }
                          }}
                          onKeyDown={handleKeyDown}
                          placeholder={isInternalNoteMode ? 'Escribe una nota interna...' : 'Escribe un mensaje...'}
                          rows={2}
                          className="w-full resize-none bg-transparent text-[14px] outline-none text-[#475569] placeholder:text-[#94a3b8]"
                        />
                      </div>
                      <button
                        type="submit"
                        className={`w-14 h-14 rounded-full text-white flex items-center justify-center shadow-md transition-all active:scale-90 disabled:opacity-30 disabled:grayscale shrink-0 ${
                          isInternalNoteMode
                            ? 'bg-[#f6c945] hover:shadow-lg hover:bg-[#f3bf27]'
                            : 'bg-gradient-to-r from-[#10b981] to-[#0d9488] hover:shadow-lg hover:from-[#0ea874] hover:to-[#0b7f77]'
                        }`}
                        disabled={isInternalNoteMode ? (!internalNoteDraft.trim() || isSavingInternalNote) : (!draftMessage.trim() || isSending)}
                      >
                        {(isSending || isSavingInternalNote) ? <RefreshCw size={22} className="animate-spin" /> : <Send size={22} />}
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[#9ca3af]">
                          <button 
                            type="button" 
                            onClick={() => applyFormatting('bold')}
                            className="hover:text-[#10b981] p-1.5 transition-colors hover:bg-emerald-50 rounded-lg" 
                            title="Negrita"
                          >
                            <Bold size={16} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => applyFormatting('italic')}
                            className="hover:text-[#10b981] p-1.5 transition-colors hover:bg-emerald-50 rounded-lg" 
                            title="Cursiva"
                          >
                            <Italic size={16} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => applyFormatting('strikethrough')}
                            className="hover:text-[#10b981] p-1.5 transition-colors hover:bg-emerald-50 rounded-lg" 
                            title="Tachado"
                          >
                            <Strikethrough size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={handleInsertLink}
                            className="hover:text-[#10b981] p-1.5 transition-colors hover:bg-emerald-50 rounded-lg"
                            title="Insertar enlace"
                          >
                            <Link size={16} />
                          </button>
                          <div className="w-[1px] h-4 bg-[#d1fae5] mx-1" />
                          <div className="relative">
                            <button 
                              type="button" 
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className={`p-1.5 transition-colors rounded-lg ${showEmojiPicker ? 'bg-emerald-100 text-[#10b981]' : 'hover:text-[#10b981] hover:bg-emerald-50 text-[#9ca3af]'}`} 
                              title="Emoji"
                            >
                              <Smile size={18} />
                            </button>
                            {showEmojiPicker && (
                              <div className="absolute bottom-full left-0 mb-4 z-[100] shadow-2xl animate-in fade-in slide-in-from-bottom-2 duration-200">
                                <EmojiPicker 
                                  onEmojiClick={(emojiData) => {
                                    setDraftMessage(prev => prev + emojiData.emoji);
                                    // setShowEmojiPicker(false); // Opcional: mantener abierto para varios emojis
                                  }}
                                  autoFocusSearch={false}
                                  theme="light"
                                  width={320}
                                  height={400}
                                />
                              </div>
                            )}
                          </div>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setIsGalleryOpen(false);
                                fileInputRef.current?.click();
                              }}
                              className="p-1.5 transition-colors rounded-lg cursor-pointer flex items-center justify-center hover:text-[#10b981] hover:bg-emerald-50 text-[#9ca3af]"
                              title="Adjuntar"
                            >
                              <Paperclip size={18} />
                            </button>
                            <input 
                              id="chat-file-input"
                              type="file" 
                              ref={fileInputRef} 
                              className="hidden" 
                              onChange={handleFileSelect}
                            />
                            {isGalleryOpen && (
                              <div className="absolute bottom-full left-[-160px] mb-6 z-[100] w-[520px] bg-white rounded-[2rem] shadow-[0_25px_70px_rgba(0,0,0,0.25)] border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 origin-bottom">
                                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
                                  <button 
                                    onClick={() => fileInputRef.current?.click()}
                                    className="px-5 py-2.5 bg-[#475569]/10 hover:bg-[#475569]/20 text-[#475569] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-2"
                                  >
                                    <Download size={14} />
                                    Mostrar todos los archivos
                                  </button>
                                  <div className="flex items-center gap-4 text-slate-400">
                                    <Smile size={19} className="cursor-pointer hover:text-slate-600 transition-colors" />
                                    <Settings size={19} className="cursor-pointer hover:text-slate-600 transition-colors" />
                                    <X size={22} className="cursor-pointer hover:text-rose-500 transition-colors" onClick={() => setIsGalleryOpen(false)} />
                                  </div>
                                </div>
                                <div className="p-8 h-[420px] overflow-y-auto custom-scrollbar bg-[#f8fafc]/50">
                                  {/* Sección Portapapeles */}
                                  <div className="mb-10">
                                    <div className="flex items-center gap-3 mb-6">
                                      <h5 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em]">Portapapeles</h5>
                                      <div className="h-[1px] flex-1 bg-slate-100"></div>
                                    </div>
                                    
                                    {isLoadingRecent ? (
                                      <div className="grid grid-cols-4 gap-6">
                                        {[1, 2, 3, 4].map((i) => (
                                          <div key={i} className="aspect-square bg-slate-100/50 rounded-2xl animate-pulse border border-slate-100" />
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="grid grid-cols-4 gap-6">
                                        {recentFiles.slice(0, 8).map((file, idx) => {
                                          const getFileIcon = (name) => {
                                            const ext = name.split('.').pop().toLowerCase();
                                            if (['xls', 'xlsx', 'csv'].includes(ext)) return <div className="bg-emerald-50 p-3 rounded-xl"><div className="w-10 h-10 bg-[#107c41] rounded-lg flex items-center justify-center text-white font-bold text-xl">X</div></div>;
                                            if (['doc', 'docx'].includes(ext)) return <div className="bg-blue-50 p-3 rounded-xl"><div className="w-10 h-10 bg-[#2b579a] rounded-lg flex items-center justify-center text-white font-bold text-xl">W</div></div>;
                                            if (['pdf'].includes(ext)) return <div className="bg-rose-50 p-3 rounded-xl"><div className="w-10 h-10 bg-[#ff0000] rounded-lg flex items-center justify-center text-white font-bold text-xl">PDF</div></div>;
                                            return <div className="bg-slate-50 p-4 rounded-xl"><FileText size={32} className="text-slate-300" /></div>;
                                          };

                                          return (
                                            <div key={idx} className="group cursor-pointer" onClick={() => {
                                              setSelectedFile({ file: { name: file.name }, preview: file.url, type: file.type });
                                              setIsGalleryOpen(false);
                                            }}>
                                              <div className="aspect-square bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden group-hover:border-[#5d5fef]/50 group-hover:shadow-md transition-all duration-300">
                                                {file.type === 'image' ? (
                                                  <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                                ) : (
                                                  getFileIcon(file.name)
                                                )}
                                              </div>
                                              <p className="mt-2.5 text-[10px] font-bold text-slate-400 truncate text-center uppercase tracking-tighter px-1">{file.name}</p>
                                            </div>
                                          );
                                        })}
                                      </div>
                                    )}
                                  </div>

                                  {/* Sección Descargado */}
                                  <div>
                                    <div className="flex items-center gap-3 mb-6">
                                      <h5 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Descargado</h5>
                                      <div className="h-[1px] flex-1 bg-slate-100/50"></div>
                                    </div>
                                    
                                    {isLoadingRecent ? (
                                      <div className="grid grid-cols-4 gap-6">
                                        {[1, 2, 3, 4].map((i) => (
                                          <div key={i} className="aspect-square bg-slate-100/50 rounded-2xl animate-pulse border border-slate-100" />
                                        ))}
                                      </div>
                                    ) : recentFiles.length > 4 ? (
                                      <div className="grid grid-cols-4 gap-6">
                                        {recentFiles.slice(4, 12).map((file, idx) => (
                                          <div key={idx} className="group cursor-pointer" onClick={() => {
                                            setSelectedFile({ file: { name: file.name }, preview: file.url, type: file.type });
                                            setIsGalleryOpen(false);
                                          }}>
                                            <div className="aspect-square bg-white rounded-2xl border border-slate-100 shadow-sm flex items-center justify-center overflow-hidden group-hover:border-[#5d5fef]/50 group-hover:shadow-md transition-all duration-300">
                                              {file.type === 'image' ? (
                                                <img src={file.url} alt={file.name} className="w-full h-full object-cover" />
                                              ) : (
                                                <div className="flex flex-col items-center gap-1">
                                                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                                                    <FileText size={20} className="text-blue-500" />
                                                  </div>
                                                  <span className="text-[8px] font-black text-blue-400 uppercase">{file.name.split('.').pop()}</span>
                                                </div>
                                              )}
                                            </div>
                                            <p className="mt-2.5 text-[10px] font-bold text-slate-400 truncate text-center uppercase tracking-tighter">{file.name}</p>
                                          </div>
                                        ))}
                                      </div>
                                    ) : (
                                      <div className="py-8 flex flex-col items-center justify-center text-center">
                                        <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3">
                                          <Download size={20} className="text-slate-200" />
                                        </div>
                                        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Sin más archivos</p>
                                      </div>
                                    )}
                                  </div>
                                </div>
                                {/* Flecha indicadora (Puntero) */}
                                <div className="absolute bottom-[-8px] left-[175px] w-4 h-4 bg-[#f8fafc] rotate-45 border-r border-b border-slate-100" />
                              </div>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (selectedChat?.is_group) {
                                setNotesError('Las notas internas solo estan disponibles para contactos individuales.');
                                return;
                              }
                              setNotesError('');
                              setSelectedFile(null);
                              setIsInternalNoteMode((prev) => !prev);
                            }}
                            className={`p-1.5 rounded-lg transition-colors ${(isInternalNoteMode && !selectedChat?.is_group) ? 'bg-[#f6c945] text-white' : 'hover:text-[#10b981] text-[#9ca3af]'}`}
                            title="Nota interna"
                          >
                            <FileText size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={toggleAudioRecording}
                            className={`p-1.5 rounded-lg transition-colors ${isRecordingAudio ? 'bg-rose-500 text-white hover:bg-rose-600' : 'hover:text-[#10b981] text-[#9ca3af]'}`}
                            title={isRecordingAudio ? 'Detener grabación' : 'Grabar audio'}
                          >
                            <Mic size={18} />
                          </button>
                    </div>

                    <div className="relative group ml-auto">
                      <button 
                        type="button"
                        onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                        className="flex items-center gap-2 px-3 py-1.5 hover:bg-emerald-50 rounded-lg transition-all"
                      >
                        <span className="text-[11px] font-black text-[#10b981] uppercase tracking-wide">
                          {devices.find(d => String(d.id) === String(selectedChat.dispositivo_id))?.nombre || 'Mi WhatsApp'}
                          {' '}
                          ({String(devices.find(d => String(d.id) === String(selectedChat.dispositivo_id))?.numero_telefono || '').slice(-4)})
                        </span>
                        <X 
                          size={14} 
                          className="text-[#9ca3af] hover:text-rose-500 transition-colors" 
                          onClick={(e) => { e.stopPropagation(); }} 
                        />
                        <ChevronDown size={14} className={`text-[#9ca3af] transition-transform ${showDeviceSelector ? 'rotate-180' : ''}`} />
                      </button>

                      {showDeviceSelector && (
                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-2xl shadow-2xl border border-slate-100 z-[100] overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
                          <div className="p-2 space-y-1">
                            {devices.map((d, idx) => {
                              const isSelected = String(d.id) === String(selectedChat.dispositivo_id);
                              return (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    setSelectedChat(prev => ({ ...prev, dispositivo_id: d.id }));
                                    setShowDeviceSelector(false);
                                  }}
                                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${isSelected ? 'text-white' : 'text-slate-600 hover:bg-slate-50'}`}
                                  style={isSelected ? { backgroundColor: deviceColors[idx % deviceColors.length] } : {}}
                                >
                                  <span className="text-[12px] font-black uppercase tracking-widest">
                                    {d.nombre} ({String(d.numero_telefono).slice(-4)})
                                  </span>
                                  {isSelected && <Check size={14} />}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
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
                      {selectedChat?.is_group ? (
                        <div className="w-full rounded-xl bg-[#f8fafc] border border-slate-200 p-3 text-xs font-semibold text-slate-500">
                          Las notas internas solo estan disponibles para contactos individuales.
                        </div>
                      ) : notesError ? (
                        <div className="w-full rounded-xl bg-rose-50 border border-rose-200 p-3 text-xs font-semibold text-rose-700">
                          {notesError}
                        </div>
                      ) : contactNotes.length > 0 ? (
                        <div className="space-y-3">
                          {contactNotes.map((note) => (
                            <div key={note.id} className="rounded-xl bg-[#f0fdf9] border border-[#d1fae5] p-3">
                              <p className="text-xs leading-relaxed text-[#374151] whitespace-pre-wrap">{note.contenido}</p>
                              <p className="mt-2 text-[10px] font-black uppercase tracking-wider text-[#9ca3af]">
                                {formatFullDate(note.creado_en)}
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="w-full rounded-xl bg-[#f0fdf9] border border-dashed border-[#d1fae5] p-3 text-xs font-semibold text-[#64748b]">
                          Aun no hay notas internas para este contacto.
                        </div>
                      )}
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

      {/* ══ MODAL NUEVA CONVERSACIÓN ══ */}
      <Modal 
        isOpen={showNewChatModal} 
        onClose={() => setShowNewChatModal(false)} 
        title="Iniciar nueva conversación"
      >
        <div className="space-y-6">
          {/* Dispositivo */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Dispositivo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <select
                value={newChatData.deviceId}
                onChange={(e) => setNewChatData({ ...newChatData, deviceId: e.target.value })}
                className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-bold text-slate-700 text-sm appearance-none cursor-pointer"
              >
                <option value="" disabled>Selecciona un dispositivo</option>
                {devices.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.nombre} ({dev.estado === 'conectado' ? 'En línea' : 'Desconectado'})
                  </option>
                ))}
              </select>
              <ChevronDown size={18} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Número de teléfono */}
          <div className="space-y-2">
            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">
              Número de teléfono <span className="text-rose-500">*</span>
            </label>
            <div className="flex gap-2">
              <div className="flex-1 phone-input-container">
                <PhoneInput
                  country={'ec'}
                  preferredCountries={['ec', 'co', 'pe', 'mx', 'ar', 'es', 'us']}
                  value={newChatData.phone}
                  onChange={(phone) => setNewChatData({ ...newChatData, phone })}
                  inputStyle={{
                    width: '100%',
                    height: '54px',
                    borderRadius: '16px',
                    border: '1px solid #f1f5f9',
                    fontSize: '14px',
                    fontWeight: '700',
                    backgroundColor: '#f8fafc',
                    color: '#334155',
                    paddingLeft: '58px'
                  }}
                  buttonStyle={{
                    backgroundColor: '#f8fafc',
                    border: '1px solid #f1f5f9',
                    borderRight: '0',
                    borderRadius: '16px 0 0 16px',
                    paddingLeft: '12px',
                    zIndex: 10
                  }}
                  dropdownStyle={{
                    borderRadius: '16px',
                    marginTop: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #f1f5f9',
                    width: '300px'
                  }}
                  containerStyle={{
                    borderRadius: '16px'
                  }}
                  placeholder="Ingrese número de teléfono"
                  enableSearch={true}
                  searchPlaceholder="Buscar país..."
                  searchStyle={{
                    margin: '8px',
                    width: 'calc(100% - 16px)',
                    height: '40px',
                    borderRadius: '12px',
                    border: '1px solid #f1f5f9',
                    paddingLeft: '35px'
                  }}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-medium italic ml-1">
            Los campos marcados con <span className="text-rose-500">*</span> son obligatorios
          </p>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => setShowNewChatModal(false)}
              className="flex-1 py-4 rounded-2xl border border-slate-100 font-black text-slate-400 text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleOpenNewChat}
              disabled={!newChatData.phone || !newChatData.deviceId}
              className="flex-1 py-4 rounded-2xl bg-[#5d5fef] text-white font-black text-xs uppercase tracking-widest hover:bg-[#4b4cbf] shadow-lg shadow-indigo-100 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Crear nueva conversación
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showLinkModal}
        onClose={() => {
          setShowLinkModal(false);
          setLinkInputValue('');
        }}
        title="Insertar enlace"
        maxWidth="max-w-lg"
      >
        <div className="space-y-6">
          <div className="rounded-[1.35rem] border border-[#d1fae5] bg-gradient-to-br from-[#f8fffd] to-[#ecfdf5] p-4 shadow-[0_18px_40px_-28px_rgba(16,185,129,0.45)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#10b981] to-[#0d9488] text-white shadow-lg shadow-emerald-100/80">
                <Link size={18} />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-[#134e4a]">Agrega un enlace al mensaje</p>
                <p className="mt-1 text-xs font-medium leading-relaxed text-slate-500">
                  Pega la URL y la dejaremos con formato visual dentro del chat, manteniendo compatibilidad con WhatsApp.
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="ml-1 text-[11px] font-black uppercase tracking-widest text-slate-400">
              URL
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#10b981]">
                <Link size={16} />
              </div>
              <input
                type="url"
                value={linkInputValue}
                onChange={(e) => setLinkInputValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    confirmInsertLink();
                  }
                }}
                placeholder="https://ejemplo.com"
                autoFocus
                className="w-full rounded-2xl border border-[#d1fae5] bg-white py-4 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#10b981] focus:ring-4 focus:ring-emerald-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                setShowLinkModal(false);
                setLinkInputValue('');
              }}
              className="rounded-2xl border border-slate-200 py-4 text-xs font-black uppercase tracking-widest text-slate-500 transition-all hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmInsertLink}
              disabled={!linkInputValue.trim()}
              className="rounded-2xl bg-gradient-to-r from-[#10b981] to-[#0d9488] py-4 text-xs font-black uppercase tracking-widest text-white shadow-lg shadow-emerald-100 transition-all hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-40"
            >
              Insertar enlace
            </button>
          </div>
        </div>
      </Modal>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
      `}</style>
    </div>
  );
}
