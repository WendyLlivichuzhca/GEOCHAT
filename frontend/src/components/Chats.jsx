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
  Trash2,
  User,
  Users,
  X,
  Star,
  Pin,
  PinOff,
  ArrowRight,
  Reply,
  MoreVertical,
  Copy,
  Forward,
  CheckSquare,
  Square,
} from 'lucide-react';
import Sidebar from './Sidebar';
import { SkeletonChatItem } from './Skeleton';
import { motion, AnimatePresence } from 'framer-motion';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/45 animate-in fade-in duration-150">
      <div className={`bg-white w-full ${maxWidth} rounded-md shadow-[0_18px_45px_rgba(15,23,42,0.18)] animate-in zoom-in-95 duration-150 relative z-[110] overflow-visible`}>
        <div className="h-[60px] px-6 flex justify-between items-center border-b border-slate-200">
          <h3 className="font-bold text-slate-800 text-base tracking-normal">{title}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-slate-800 transition-colors p-1">
            <X size={19} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};

const COUNTRIES = [
  { name: 'Ecuador', code: 'EC', dial: '+593', flag: 'EC' },
  { name: 'Colombia', code: 'CO', dial: '+57', flag: 'CO' },
  { name: 'Perú', code: 'PE', dial: '+51', flag: 'PE' },
  { name: 'México', code: 'MX', dial: '+52', flag: 'MX' },
  { name: 'España', code: 'ES', dial: '+34', flag: 'ES' },
  { name: 'Argentina', code: 'AR', dial: '+54', flag: 'AR' },
  { name: 'Estados Unidos', code: 'US', dial: '+1', flag: 'US' },
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
    let hours = date.getHours();
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const strHours = String(hours).padStart(2, '0');
    return `${strHours}:${minutes} ${ampm}`;
  }

  return new Intl.DateTimeFormat('es-EC', {
    weekday: 'short',
  }).format(date);
}

function formatMessageTime(value) {
  const date = parseDate(value);
  if (!date) return '';

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const strHours = String(hours).padStart(2, '0');
  return `${strHours}:${minutes} ${ampm}`;
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
  const SYSTEM_JIDS = new Set(['0@s.whatsapp.net', 'status@broadcast', 'announcement@broadcast']);

  return [...items]
    .sort((a, b) => chatSortValue(b) - chatSortValue(a))
    .filter((chat) => {
      const jid = String(chat?.jid || chat?.id || '').trim();
      if (!jid || seen.has(jid)) return false;
      if (SYSTEM_JIDS.has(jid.toLowerCase()) || jid.toLowerCase().includes('@broadcast')) return false;

      const isLid = jid.toLowerCase().includes('@lid');
      const alias = chatVisibleName(chat).trim().toLowerCase();
      if (alias && aliases.has(alias) && (isLid || aliases.get(alias))) return false;

      seen.add(jid);
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
            className="inline-flex max-w-full items-center gap-1 rounded-md bg-white/15 px-1.5 py-0.5 font-semibold underline underline-offset-4 decoration-emerald-300 text-inherit hover:bg-white/25 hover:text-[#c7d2fe] break-all transition-colors"
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
      accent: 'bg-indigo-50 text-emerald-600 border-indigo-100',
      strip: 'bg-indigo-500',
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

function MessageStatus({ status, isSidebar = false }) {
  const readColor = 'text-sky-400';
  const otherColor = isSidebar ? 'text-slate-400' : 'text-indigo-100';

  if (status >= 3) {
    return (
      <span className={`inline-flex -space-x-1 ${readColor}`} title="Leido">
        <Check size={13} />
        <Check size={13} />
      </span>
    );
  }

  if (status >= 2) {
    return (
      <span className={`inline-flex -space-x-1 ${otherColor}`} title="Entregado">
        <Check size={13} />
        <Check size={13} />
      </span>
    );
  }

  if (status >= 1) {
    return <Check size={13} className={otherColor} title="Enviado" />;
  }

  return <Clock size={13} className={otherColor} title="Pendiente" />;
}

function getCountryFlag(contact) {
  const phone = cleanPhoneFromJid(contact?.telefono || contact?.jid || '');
  if (!phone) return null;
  const clean = String(phone).replace(/\D/g, '');
  if (!clean) return null;

  // Prefijos de 4 dígitos
  if (clean.startsWith('1809') || clean.startsWith('1829') || clean.startsWith('1849')) return 'DO'; // Rep. Dominicana
  if (clean.startsWith('1787') || clean.startsWith('1939')) return 'PR'; // Puerto Rico

  // Prefijos de 3 dígitos
  if (clean.startsWith('593')) return 'EC'; // Ecuador
  if (clean.startsWith('591')) return 'BO'; // Bolivia
  if (clean.startsWith('506')) return 'CR'; // Costa Rica
  if (clean.startsWith('507')) return 'PA'; // Panamá
  if (clean.startsWith('595')) return 'PY'; // Paraguay
  if (clean.startsWith('598')) return 'UY'; // Uruguay
  if (clean.startsWith('502')) return 'GT'; // Guatemala
  if (clean.startsWith('503')) return 'SV'; // El Salvador
  if (clean.startsWith('504')) return 'HN'; // Honduras
  if (clean.startsWith('505')) return 'NI'; // Nicaragua
  if (clean.startsWith('351')) return 'PT'; // Portugal

  // Prefijos de 2 dígitos
  if (clean.startsWith('57')) return 'CO'; // Colombia
  if (clean.startsWith('58')) return 'VE'; // Venezuela
  if (clean.startsWith('51')) return 'PE'; // Perú
  if (clean.startsWith('52')) return 'MX'; // México
  if (clean.startsWith('34')) return 'ES'; // España
  if (clean.startsWith('54')) return 'AR'; // Argentina
  if (clean.startsWith('56')) return 'CL'; // Chile
  if (clean.startsWith('53')) return 'CU'; // Cuba
  if (clean.startsWith('55')) return 'BR'; // Brasil
  if (clean.startsWith('44')) return 'GB'; // Reino Unido
  if (clean.startsWith('33')) return 'FR'; // Francia
  if (clean.startsWith('49')) return 'DE'; // Alemania
  if (clean.startsWith('39')) return 'IT'; // Italia

  // Prefijos de 1 dígito
  if (clean.startsWith('1')) return 'US'; // USA / Canadá

  return null;
}

const Avatar = React.memo(function Avatar({ contact, size = 'md', showFlag = true }) {
  const imageUrl = mediaUrl(contact?.foto_perfil);
  const [imgError, setImgError] = React.useState(() => Boolean(imageUrl && failedAvatarUrls.has(imageUrl)));
  const [imgLoading, setImgLoading] = React.useState(() => Boolean(imageUrl && !loadedAvatarUrls.has(imageUrl)));
  const [retryCount, setRetryCount] = React.useState(0);
  const retryTimerRef = React.useRef(null);
  const displayName = chatVisibleName(contact);
  const isGroup = contact?.is_group || contact?.jid?.endsWith('@g.us');

  const sizes = {
    xs: 'w-8 h-8 text-[9px]',
    sm: 'w-11 h-11 text-[11px]',
    md: 'w-12 h-12 text-sm',
    lg: 'w-20 h-20 text-xl',
  };

  const flagSizes = {
    xs: 'text-[8px] w-3.5 h-3.5 bottom-[-1px] right-[-1px] font-bold text-slate-500',
    sm: 'text-[10px] w-4.5 h-4.5 bottom-[-2px] right-[-2px] font-bold text-slate-500',
    md: 'text-[11px] w-5 h-5 bottom-[-2px] right-[-2px] font-bold text-slate-500',
    lg: 'text-[18px] w-8 h-8 bottom-[-4px] right-[-4px] font-bold text-slate-500',
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
    <div className={`${sizes[size]} rounded-2xl bg-gradient-to-br from-[#c7d2fe] to-[#e0e7ff] text-[#818cf8] flex items-center justify-center font-black border border-[#a5b4fc] shadow-sm w-full h-full`}>
      {isGroup ? <Users size={size === 'lg' ? 28 : 20} /> : <Bot size={size === 'lg' ? 36 : (size === 'md' ? 22 : (size === 'sm' ? 18 : 14))} />}
    </div>
  );

  const flag = !isGroup ? getCountryFlag(contact) : null;

  return (
    <div className={`relative ${sizes[size]} shrink-0 select-none`}>
      {imageUrl && !imgError ? (
        <div className={`w-full h-full rounded-2xl bg-[#eef2ff] border border-[#a5b4fc] flex items-center justify-center overflow-hidden relative group`}>
          {imgLoading && fallbackContent}
          <img
            src={imageUrl}
            alt={displayName}
            key={`${contact.jid}-${retryCount}`}
            className="absolute inset-0 w-full h-full rounded-2xl object-cover transition-opacity duration-300 group-hover:scale-110"
            style={{ opacity: imgLoading ? 0 : 1 }}
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
      ) : (
        fallbackContent
      )}
      {showFlag && flag && (
        <span className={`absolute ${flagSizes[size]} bg-white rounded-full leading-none flex items-center justify-center border border-slate-100 shadow-sm p-0.5 z-10`}>
          {flag}
        </span>
      )}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.size === nextProps.size &&
  prevProps.showFlag === nextProps.showFlag &&
  prevProps.contact?.jid === nextProps.contact?.jid &&
  prevProps.contact?.telefono === nextProps.contact?.telefono &&
  prevProps.contact?.foto_perfil === nextProps.contact?.foto_perfil
));

function EmptyState({ title, text, showLogo = false }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-center p-12 opacity-70">
      {showLogo ? (
        <div className="flex flex-col items-center mb-2 animate-in fade-in duration-300">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-10 h-10 text-slate-400" viewBox="0 0 24 24" fill="currentColor">
              <rect x="2" y="5" width="20" height="3" rx="1.5" />
              <rect x="5" y="10.5" width="14" height="3" rx="1.5" />
              <rect x="9" y="16" width="6" height="3" rx="1.5" />
            </svg>
            <span className="text-3xl font-extrabold text-slate-700 tracking-tight select-none">Geo<span className="font-medium text-[#5d5fef]">CHAT</span></span>
          </div>
          <p className="text-sm text-[#9ca3af] max-w-[280px] font-semibold leading-relaxed">{text}</p>
        </div>
      ) : (
        <>
          <div className="w-16 h-16 rounded-2xl bg-[#eef2ff] text-[#a5b4fc] flex items-center justify-center mb-5 border border-[#c7d2fe]">
            <MessageCircle size={28} />
          </div>
          <h3 className="text-sm font-black text-[#9ca3af] uppercase tracking-widest">{title}</h3>
          <p className="text-[12px] text-[#9ca3af] max-w-[220px] mt-2 font-medium leading-relaxed">{text}</p>
        </>
      )}
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
      className={`group w-full h-[74px] flex items-center pl-4 cursor-pointer transition-colors border-b border-slate-100 relative ${
        active ? 'bg-[#f1f5ff]' : 'bg-white hover:bg-slate-50'
      }`}
    >
      {active && <span className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#7ed321]" />}
      <div className="pr-3 shrink-0">
        <Avatar contact={chat} size="sm" showFlag={true} />
      </div>
      <div className="flex-1 min-w-0 flex flex-col justify-center h-full pr-4 relative">
        {/* Fila superior: Nombre y Hora */}
        <div className="flex justify-between items-center mb-0.5">
          <div className="flex items-center gap-1 min-w-0 pr-2">
            <span className="font-semibold text-[14px] text-slate-900 truncate">
              {chatVisibleName(chat)}
            </span>
            <span className="text-[11px] text-slate-400 flex items-center gap-0.5 shrink-0 truncate max-w-[80px] mt-0.5">
              <ChevronRight size={12} />
              <span className="truncate">{assigned}</span>
            </span>
          </div>
          <span className={`text-[11px] shrink-0 whitespace-nowrap mt-0.5 ${hasUnread ? 'text-[#5d5fef] font-bold' : 'text-slate-500'}`}>
            {formatChatTime(chat)}
          </span>
        </div>
        
        {/* Fila inferior: Estado de lectura, icono de multimedia, previo y badge */}
        <div className="flex justify-between items-center min-h-[20px]">
          <div className="flex items-center gap-1 min-w-0 text-slate-500 pr-2">
            {chat.es_mio && <MessageStatus status={chat.estado} isSidebar={true} />}
            {isImage && <Image size={14} className="shrink-0" />}
            {isSticker && <FileText size={14} className="shrink-0" />}
            {isAudio && <Mic size={14} className="shrink-0 text-indigo-500" />}
            {isVideo && <Image size={14} className="shrink-0" />}
            {isDoc && <FileText size={14} className="shrink-0" />}
            <span className="text-[12px] truncate leading-5 text-slate-500">
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
 
function MessageBubble({ 
  message, 
  contact, 
  onReply, 
  onPin, 
  onStar, 
  onDelete, 
  onReact, 
  onReport,
  onCopy,
  onForward,
  onSelect,
  isSelected,
  isSelectionMode
}) {
  const mine = message.es_mio;
  const resolvedMediaUrl = mediaUrl(message.url_media);
  const isMedia = ['imagen', 'audio', 'video', 'documento', 'sticker'].includes(message.tipo) && resolvedMediaUrl;
  const body = (isMedia && !message.texto) ? '' : isMedia ? message.texto : messageBody(message);

  const [showMenu, setShowMenu] = useState(false);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const menuRef = useRef(null);

  // Close menus when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
        setShowEmojiPicker(false);
        setShowAllEmojis(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const quickEmojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
  const extraEmojis = ['😭', '😡', '🎉', '🔥', '👏', '💯', '👀', '🚀', '🤔', '🤷', '💩', '💔', '🤮', '👑', '☀️', '💡', '✨', '🎈'];

  if (message.tipo === 'sistema') {
    return (
      <div className="flex justify-center w-full my-2.5 select-none">
        <span className="px-4 py-1.5 rounded-full bg-slate-100 border border-slate-200/60 text-slate-500 text-[11px] font-bold shadow-xs">
          {message.texto}
        </span>
      </div>
    );
  }

  return (
    <div 
      className={`group flex ${mine ? 'justify-end' : 'justify-start'} items-start gap-2 relative mb-3 ${isSelectionMode ? 'cursor-pointer hover:bg-slate-100/50 p-1 rounded-lg transition-colors' : ''}`} 
      id={`msg-${message.mensaje_id}`}
      onClick={(e) => {
        if (isSelectionMode) {
          e.stopPropagation();
          onSelect(message.mensaje_id);
        }
      }}
    >
      {/* Selection Checkbox */}
      {isSelectionMode && (
        <div className="shrink-0 self-center mr-2 z-20" onClick={(e) => {
          e.stopPropagation();
          onSelect(message.mensaje_id);
        }}>
          {isSelected ? (
            <CheckSquare className="text-[#6a63dc] fill-[#6a63dc]/10" size={20} />
          ) : (
            <Square className="text-slate-400" size={20} />
          )}
        </div>
      )}

      {/* Avatar column */}
      {!mine && !contact?.is_group && (
        <div className="shrink-0 mt-1">
          <Avatar contact={contact} size="xs" showFlag={false} />
        </div>
      )}

      {/* Bubble + Actions container */}
      <div className={`flex items-center gap-2 max-w-[78%] ${mine ? 'flex-row-reverse' : 'flex-row'}`}>
        
        {/* The Message Bubble */}
        <div className={`rounded-[18px] px-4 py-3 shadow-sm relative transition-all text-left ${
            mine
            ? 'bg-[#6a63dc] text-white rounded-tr-sm'
            : 'bg-[#ebe8ff] border border-[#e2defd] text-[#1e1b4b] rounded-tl-sm shadow-none'
        }`}>
          {/* Group participant name */}
          {message.push_name && !mine && message.es_grupo && (
            <p className="text-[10px] font-black text-[#818cf8] uppercase tracking-widest mb-1.5 px-0.5">
              {message.push_name}
            </p>
          )}

          {/* Quoted Message (Reply Preview) */}
          {message.quoted_message_id && (
            <div 
              className="mb-2 p-2 rounded bg-black/5 dark:bg-white/5 border-l-4 border-[#312e81] text-xs text-left cursor-pointer opacity-90 hover:opacity-100 transition-opacity flex flex-col gap-0.5"
              onClick={(e) => {
                e.stopPropagation();
                const el = document.getElementById(`msg-${message.quoted_message_id}`);
                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
              }}
            >
              <span className="font-bold text-[10px] text-[#4f46e5]">
                {message.quoted_participant === contact?.jid ? (contact?.nombre || 'Contacto') : 'Tú'}
              </span>
              <span className="line-clamp-2 text-[11px] text-slate-600 dark:text-slate-300">
                {message.quoted_text || 'Mensaje de WhatsApp'}
              </span>
            </div>
          )}

          {/* Media Content */}
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

          {/* Message Text */}
          {body && (
            <p className="whitespace-pre-wrap break-words text-[14px] leading-relaxed font-medium">
              {formatMessageText(body)}
            </p>
          )}

          {/* Footer (Time + Status + Pinned/Starred indicators) */}
          <div className={`flex items-center justify-end gap-1.5 mt-1.5 text-[10px] font-semibold ${mine ? 'text-white/70' : 'text-[#4f46e5]'}`}>
            {!!message.destacado && <Star size={10} className="fill-amber-400 text-amber-400" />}
            {!!message.fijado && <Pin size={10} className="rotate-45" />}
            <span className="uppercase">{formatMessageTime(message.fecha_mensaje)}</span>
            {mine && <MessageStatus status={message.estado} />}
          </div>

          {/* Floating Reaction Badge */}
          {message.reaccion && (
            <div className={`absolute -bottom-2 ${mine ? 'right-3' : 'left-3'} bg-white border border-slate-200 shadow-sm rounded-full px-1.5 py-0.5 text-xs select-none z-10 flex items-center justify-center animate-in zoom-in duration-200`}>
              <span className="text-[12px]">{message.reaccion}</span>
            </div>
          )}
        </div>

        {/* Hover Action Menu & Emoji Reaction Buttons */}
        {!isSelectionMode && (
          <div className="hidden group-hover:flex items-center gap-1 relative z-20" ref={menuRef}>
            {/* Reaction Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowEmojiPicker(!showEmojiPicker);
              }}
              className="w-7 h-7 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
              title="Reaccionar"
            >
              <Smile size={14} />
            </button>

            {/* Action Menu Trigger */}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu(!showMenu);
              }}
              className="w-7 h-7 bg-white border border-slate-200 shadow-sm rounded-full flex items-center justify-center text-slate-500 hover:text-indigo-600 hover:bg-slate-50 transition-colors"
              title="Menú de acciones"
            >
              <MoreVertical size={14} />
            </button>

            {/* Quick Reaction Emojis Panel */}
            {showEmojiPicker && (
              <div className="absolute bottom-9 left-0 bg-white border border-slate-200 shadow-xl rounded-full px-2 py-1 flex items-center gap-1.5 animate-in slide-in-from-bottom-2 duration-150 z-30">
                {quickEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact(message, message.reaccion === emoji ? null : emoji);
                      setShowEmojiPicker(false);
                    }}
                    className={`text-[16px] hover:scale-125 transition-transform duration-100 ${message.reaccion === emoji ? 'bg-indigo-50 rounded-full p-0.5' : ''}`}
                  >
                    {emoji}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowAllEmojis(!showAllEmojis);
                  }}
                  className="text-[16px] hover:scale-125 transition-transform duration-100 font-bold text-slate-500 hover:text-indigo-600 px-1"
                  title="Más emojis"
                >
                  +
                </button>
              </div>
            )}

            {/* Expanded Emojis Grid Panel */}
            {showEmojiPicker && showAllEmojis && (
              <div className="absolute bottom-20 left-0 bg-white border border-slate-200 shadow-2xl rounded-2xl p-2.5 grid grid-cols-6 gap-2 w-52 animate-in zoom-in-95 duration-100 z-50">
                {extraEmojis.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => {
                      onReact(message, message.reaccion === emoji ? null : emoji);
                      setShowEmojiPicker(false);
                      setShowAllEmojis(false);
                    }}
                    className="text-[18px] hover:scale-125 transition-transform duration-75 text-center"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}

            {/* Action Dropdown Menu */}
            {showMenu && (
              <div className={`absolute bottom-9 ${mine ? 'right-0' : 'left-0'} bg-white border border-slate-200 shadow-2xl rounded-xl py-1.5 min-w-[150px] animate-in zoom-in-95 duration-150 z-30`}>
                <button
                  type="button"
                  onClick={() => {
                    onReply(message);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                >
                  <Reply size={13} className="text-slate-500" /> Responder
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onCopy(body || '');
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                >
                  <Copy size={13} className="text-slate-500" /> Copiar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onForward(message);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                >
                  <Forward size={13} className="text-slate-500" /> Reenviar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onStar(message);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                >
                  <Star size={13} className={!!message.destacado ? 'fill-amber-400 text-amber-400' : 'text-slate-500'} /> 
                  {!!message.destacado ? 'Quitar destacado' : 'Destacar'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onPin(message);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                >
                  <Pin size={13} className={!!message.fijado ? 'text-indigo-600 rotate-45' : 'text-slate-500'} />
                  {!!message.fijado ? 'Desfijar mensaje' : 'Fijar mensaje'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSelect(message.mensaje_id);
                    setShowMenu(false);
                  }}
                  className="w-full text-left px-3 py-1.5 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                >
                  <CheckSquare size={13} className="text-slate-500" /> Seleccionar
                </button>

                {mine ? (
                  <button
                    type="button"
                    onClick={() => {
                      onDelete(message);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-rose-50 text-xs font-semibold text-rose-600 flex items-center gap-2 border-t border-slate-100 mt-1"
                  >
                    <Trash2 size={13} /> Eliminar mensaje
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      onReport(contact);
                      setShowMenu(false);
                    }}
                    className="w-full text-left px-3 py-1.5 hover:bg-amber-50 text-xs font-semibold text-amber-600 flex items-center gap-2 border-t border-slate-100 mt-1"
                  >
                    <AlertCircle size={13} /> Reportar contacto
                  </button>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}

const formatLastSeen = (timestamp) => {
  if (!timestamp) return null;
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  if (isNaN(date.getTime())) return null;

  const now = new Date();
  const isToday = date.toDateString() === now.toDateString();
  
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = date.toDateString() === yesterday.toDateString();

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const timeStr = `${hours}:${minutes}`;

  if (isToday) {
    return `últ. vez hoy a las ${timeStr}`;
  } else if (isYesterday) {
    return `últ. vez ayer a las ${timeStr}`;
  } else {
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `últ. vez el ${day}/${month}/${year} a las ${timeStr}`;
  }
};

export default function Chats({ user, onLogout }) {
  const [chats, setChats] = useState([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const [chatDevice, setChatDevice] = useState(null);
  const [selectedChat, setSelectedChat] = useState(null);
  const hasSelectedInitialChatRef = useRef(false);
  const [showNameRulesTooltip, setShowNameRulesTooltip] = useState(false);
  const [showEmailRulesTooltip, setShowEmailRulesTooltip] = useState(false);
  const [messages, setMessages] = useState([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [activeTab, setActiveTab] = useState('todos');
  const [draftMessage, setDraftMessage] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
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

  // Estados para acordeones de barra lateral derecha
  const [isTagsExpanded, setIsTagsExpanded] = useState(true);
  const [isFieldsExpanded, setIsFieldsExpanded] = useState(true);
  const [isNotesExpanded, setIsNotesExpanded] = useState(true);

  // Estados para ediciÃ³n rÃ¡pida de contacto en barra lateral
  const [isEditingSidebarName, setIsEditingSidebarName] = useState(false);
  const [sidebarNameValue, setSidebarNameValue] = useState('');
  const [isEditingSidebarEmail, setIsEditingSidebarEmail] = useState(false);
  const [sidebarEmailValue, setSidebarEmailValue] = useState('');

  // Estados para aÃ±adir tag y campo
  const [selectedTagToAdd, setSelectedTagToAdd] = useState('');
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [isTagDropdownOpen, setIsTagDropdownOpen] = useState(false);
  const [allCustomFields, setAllCustomFields] = useState([]);
  const [newFieldSelection, setNewFieldSelection] = useState({ campo_id: '', valor: '' });
  const [showCampoDropdown, setShowCampoDropdown] = useState(false);

  // Estados para notas desde la barra lateral
  const [sidebarNoteDraft, setSidebarNoteDraft] = useState('');
  const [isSavingSidebarNote, setIsSavingSidebarNote] = useState(false);

  // Estados para colapsables de filtros
  const [filterTagsOpen, setFilterTagsOpen] = useState(true);
  const [filterAgentsOpen, setFilterAgentsOpen] = useState(true);
  const [filterDevicesOpen, setFilterDevicesOpen] = useState(true);

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
  const [allAgents, setAllAgents] = useState([]); // Por ahora vacÃ­o hasta tener endpoint
  const [editedFields, setEditedFields] = useState({});
  const [isSavingFields, setIsSavingFields] = useState(false);

  const isFieldAssigned = (f) => {
    if (editedFields.hasOwnProperty(f.id)) {
      return editedFields[f.id] !== '';
    }
    return f.valor !== null && f.valor !== undefined && f.valor !== '';
  };

  const assignedFields = useMemo(() => {
    return contactFields.filter(isFieldAssigned);
  }, [contactFields, editedFields]);

  const availableFields = useMemo(() => {
    return contactFields.filter(f => !isFieldAssigned(f));
  }, [contactFields, editedFields]);

  // Resize sidebar state
  const [sidebarWidth, setSidebarWidth] = useState(340);

  // Nuevos estados para funcionalidades avanzadas de chat
  const [toast, setToast] = useState(null);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedMessageIds, setSelectedMessageIds] = useState([]);
  const [forwardingMessage, setForwardingMessage] = useState(null);
  const [forwardSearch, setForwardSearch] = useState('');
  const [selectedForwardTargets, setSelectedForwardTargets] = useState([]);
  const [isForwardingSubmit, setIsForwardingSubmit] = useState(false);
  const [filterStarredOnly, setFilterStarredOnly] = useState(false);
  const [messageToDelete, setMessageToDelete] = useState(null);
  const [showPinMenu, setShowPinMenu] = useState(false);
  const [contactPresence, setContactPresence] = useState(null);
  const [lastSeenTime, setLastSeenTime] = useState(null);

  const showToast = (text) => {
    setToast(text);
    setTimeout(() => setToast(null), 2500);
  };
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

  useEffect(() => {
    if (chatDevice?.id) {
      setFilters(prev => ({ ...prev, deviceId: chatDevice.id }));
    }
  }, [chatDevice?.id]);

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
        if (current) {
          return nextChats.find((chat) => chat.id === current.id || chat.jid === current.jid) || current;
        }
        return null;
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
    loadAllCustomFields();
  }, [user.id, debouncedSearch]);

  const loadAllAgents = async () => {
    try {
      const res = await fetch(`${API_URL}/api/agents`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
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

  const loadAllCustomFields = async () => {
    try {
      const res = await fetch(`${API_URL}/api/campos-customizados?user_id=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllCustomFields(data);
      }
    } catch (err) {
      console.error("Error loading custom fields definitions:", err);
    }
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

  const loadContactDetails = async (contactId) => {
    if (!contactId) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${contactId}/details`);
      const data = await res.json();
      if (data.success) {
        setContactTags(data.tags || []);
        setContactFields(data.fields || []);
      }
    } catch (err) {
      console.error('Error loading contact details:', err);
    }
  };

  const loadContactNotes = async (contactId) => {
    if (!contactId || !user?.id) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${contactId}/notes?user_id=${user.id}`);
      const data = await res.json();
      if (data.success) {
        setContactNotes(data.notes || []);
        setNotesError('');
      } else {
        setNotesError(data.message || 'No se pudieron cargar las notas.');
      }
    } catch (err) {
      console.error('Error loading contact notes:', err);
      setNotesError('No se pudieron cargar las notas.');
    }
  };

  useEffect(() => {
    if (selectedChat?.id && !selectedChat.is_group) {
      loadContactDetails(selectedChat.id);
    } else {
      setContactTags([]);
      setContactFields([]);
    }
  }, [selectedChat?.id, selectedChat?.is_group]);

  useEffect(() => {
    if (selectedChat?.id && !selectedChat.is_group) {
      loadContactNotes(selectedChat.id);
    } else {
      setContactNotes([]);
      setNotesError('');
    }
  }, [selectedChat?.id, selectedChat?.is_group, user?.id]);

  useEffect(() => {
    setIsInternalNoteMode(false);
    setReplyingTo(null);
    setInternalNoteDraft('');
    setNotesError('');
    setSidebarNoteDraft('');
    setIsEditingSidebarName(false);
    setIsEditingSidebarEmail(false);
    setIsCreatingField(false);
    setNewFieldSelection({ campo_id: '', valor: '' });
    setShowCampoDropdown(false);
    setFilterStarredOnly(false);
    setMessageToDelete(null);
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

        // Ignorar eventos de presencia de contacto por completo
        if (payload.event_type === 'chat-update' && payload.data?.source === 'presence-update') {
          return;
        }

        const changedJid = payload.data?.message?.chat_jid || payload.data?.contact?.jid || payload.data?.jid;

        const isNewChat = payload.event_type === 'chat-update';

        if (isNewChat && !changedJid) {
          setTimeout(() => loadChats({ silent: true }), 150);
        }

        // Efecto WhatsApp: actualizar estado local inmediatamente para el chat afectado
        if (changedJid && payload.data?.source !== 'message-reaction-update') {
          setChats((prevChats) => {
            const chatIndex = prevChats.findIndex((c) => c.jid === changedJid);
            if (chatIndex === -1) {
              // Chat no estÃ¡ en lista todavía â†’ recargar lista completa
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
            // Para chat-update, bridge.js envÃ­a: { last_message, last_type, last_timestamp }
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
              chat.es_mio               = msg.es_mio;
              chat.estado               = msg.estado;
            } else if (payload.data?.last_message) {
              const rawText = payload.data.last_message || '';
              const preview = !isSystemPlaceholder(rawText) ? rawText : chat.ultimo_mensaje;
              chat.ultimo_mensaje       = preview;
              chat.last_media_type      = payload.data.last_type || chat.last_media_type;
              chat.last_timestamp       = payload.data.last_timestamp || nowTs;
              chat.sort_timestamp       = chat.last_timestamp;
              chat.ultimo_mensaje_fecha = new Date().toISOString().slice(0, 19).replace('T', ' ');
            } else if (payload.data?.source === 'message-status-update') {
              chat.es_mio               = true;
              chat.estado               = payload.data.status;
            }

            // Incrementar no-leÃ­dos SOLO para mensajes entrantes (es_mio === false)
            if (payload.event_type === 'upsert-message' && payload.data?.message?.es_mio === false) {
              const currentChat = selectedChatRef.current;
              if (currentChat?.jid && changedJid === currentChat.jid) {
                chat.mensajes_sin_leer = 0;
                // Enviar visto a WhatsApp y marcar en la base de datos
                const chatKey = encodeURIComponent(changedJid);
                fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/read`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                }).catch((err) => console.error('Error al marcar chat activo como leido:', err));
              } else {
                chat.mensajes_sin_leer = (chat.mensajes_sin_leer || 0) + 1;
              }
            }

            // Subir al primer lugar de la lista (efecto WhatsApp)
            updatedChats.splice(chatIndex, 1);
            updatedChats.unshift(chat);

            return sortChatsByLatest(updatedChats);
          });
        } else if (isNewChat) {
          loadChats({ silent: true });
        }

        // Si el chat afectado es el que está abierto → recargar mensajes o actualizar reacción
        const currentChat = selectedChatRef.current;
        if (currentChat?.jid && changedJid === currentChat.jid) {
          if (payload.data?.source === 'message-reaction-update') {
            const reactedMessageId = payload.data.messageId;
            const reaccion = payload.data.reaccion;
            setMessages((prevMessages) =>
              prevMessages.map((m) =>
                m.mensaje_id === reactedMessageId ? { ...m, reaccion } : m
              )
            );
          } else {
            loadMessages(currentChat, { silent: true });
          }
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
    const SYSTEM_JIDS = new Set(['0@s.whatsapp.net', 'status@broadcast', 'announcement@broadcast']);
    let filtered = chats.filter(c => {
      const jid = String(c?.jid || '').trim().toLowerCase();
      return !SYSTEM_JIDS.has(jid) && !jid.includes('@broadcast');
    });

    // Filtro por Tab (Todos, Mis Chats, Favoritos)
    if (activeTab === 'mios') {
      filtered = filtered.filter(c => Number(c.agente_asignado_id || 0) === Number(user?.id || 0));
    } else if (activeTab === 'favoritos') {
      filtered = filtered.filter(c => c.favorito); // Asumiendo campo favorito
    }

    // Filtro por Estado (LeÃ­dos, Abiertos, Cerrados)
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

    // Filtro por BÃºsqueda (ya manejado por el fetch en loadChats, pero por si acaso re-filtramos)
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

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (filters.status !== 'all') count++;
    if (filters.tags.length > 0) count++;
    if (filters.agents.length > 0) count++;
    return count;
  }, [filters]);

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

      // Si el bridge estÃ¡ apagado, Python retorna 500 con mensaje de conexiÃ³n rechazada
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

      // Refrescar datos tras sincronizaciÃ³n exitosa
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

  const handleAddTag = async (tagId) => {
    if (!tagId || !selectedChat) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${selectedChat.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: tagId })
      });
      if (res.ok) {
        setSelectedTagToAdd('');
        loadContactDetails(selectedChat.id);
      }
    } catch (err) {
      console.error("Error añadiendo tag:", err);
    }
  };

  const handleRemoveTag = async (tagId) => {
    if (!selectedChat) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${selectedChat.id}/tags/${tagId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        loadContactDetails(selectedChat.id);
      }
    } catch (err) {
      console.error("Error quitando tag:", err);
    }
  };

  const handleUpdateField = async (campoId, valor) => {
    if (!selectedChat) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${selectedChat.id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campo_id: campoId, valor })
      });
      if (res.ok) {
        loadContactDetails(selectedChat.id);
      }
    } catch (err) {
      console.error("Error actualizando campo:", err);
    }
  };



  const handleSaveSidebarNote = async () => {
    if (!selectedChat || !sidebarNoteDraft.trim() || !user?.id) return;
    setIsSavingSidebarNote(true);
    setNotesError('');
    try {
      const response = await fetch(`${API_URL}/api/contacts/${selectedChat.id}/notes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          contenido: sidebarNoteDraft.trim(),
        }),
      });
      const data = await response.json();
      if (data.success) {
        setContactNotes((prev) => (data.note ? [data.note, ...prev] : prev));
        setSidebarNoteDraft('');
      } else {
        setNotesError(data.message || 'No se pudo guardar la nota.');
      }
    } catch (error) {
      setNotesError('No se pudo guardar la nota.');
    } finally {
      setIsSavingSidebarNote(false);
    }
  };

  const handleSaveSidebarName = async () => {
    const val = sidebarNameValue.trim();
    if (!val) {
      alert('El nombre es obligatorio.');
      return;
    }
    if (val.length > 100) {
      alert('El nombre no puede exceder los 100 caracteres.');
      return;
    }
    if (!/^[A-Za-zÁÉÍÓÚáéíóúÑñ\s]+$/.test(val)) {
      alert('El nombre solo debe contener letras y espacios.');
      return;
    }
    try {
      const response = await fetch(`${API_URL}/api/contacts/${user.id}/${selectedChat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: val,
          correo: selectedChat.correo || '',
          empresa: selectedChat.empresa || '',
          estado_lead: selectedChat.estado_lead || 'nuevo'
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedChat(prev => ({ ...prev, nombre: val, display_name: val }));
        setIsEditingSidebarName(false);
        loadChats({ silent: true });
      }
    } catch (err) {
      console.error('Error updating name:', err);
    }
  };

  const handleSaveSidebarEmail = async () => {
    if (!selectedChat) return;
    try {
      const response = await fetch(`${API_URL}/api/contacts/${user.id}/${selectedChat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: selectedChat.nombre || selectedChat.display_name || '',
          correo: sidebarEmailValue.trim(),
          empresa: selectedChat.empresa || '',
          estado_lead: selectedChat.estado_lead || 'nuevo'
        }),
      });
      const data = await response.json();
      if (data.success) {
        setSelectedChat(prev => ({ ...prev, correo: sidebarEmailValue.trim() }));
        setIsEditingSidebarEmail(false);
      }
    } catch (err) {
      console.error('Error updating email:', err);
    }
  };

  const handleAssignAgent = async (agentId) => {
    if (!selectedChat) return;
    const targetAgentId = agentId ? Number(agentId) : null;
    
    // Optimistic update
    const updatedAgent = allAgents.find(a => Number(a.id) === targetAgentId);
    const agentName = updatedAgent ? updatedAgent.nombre : '';
    setSelectedChat(prev => ({
      ...prev,
      agente_asignado_id: targetAgentId,
      agente_asignado_nombre: agentName
    }));
    
    try {
      const response = await fetch(`${API_URL}/api/contacts/${user.id}/${selectedChat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: selectedChat.nombre || selectedChat.display_name || '',
          correo: selectedChat.correo || '',
          empresa: selectedChat.empresa || '',
          estado_lead: selectedChat.estado_lead || 'nuevo',
          agente_asignado_id: targetAgentId
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadChats({ silent: true });
      }
    } catch (err) {
      console.error('Error assigning agent:', err);
    }
  };

  const handleToggleChatStatus = async () => {
    if (!selectedChat) return;
    const isClosed = selectedChat.estado_lead === 'cerrado';
    const nextStatus = isClosed ? 'nuevo' : 'cerrado';
    
    // Optimistic update
    setSelectedChat(prev => ({
      ...prev,
      estado_lead: nextStatus
    }));
    
    try {
      const response = await fetch(`${API_URL}/api/contacts/${user.id}/${selectedChat.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: selectedChat.nombre || selectedChat.display_name || '',
          correo: selectedChat.correo || '',
          empresa: selectedChat.empresa || '',
          estado_lead: nextStatus,
          agente_asignado_id: selectedChat.agente_asignado_id
        }),
      });
      const data = await response.json();
      if (data.success) {
        loadChats({ silent: true });
      }
    } catch (err) {
      console.error('Error toggling chat status:', err);
    }
  };

  const handleFieldChange = (fieldId, value) => {
    setEditedFields(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSaveAllFields = async () => {
    if (!selectedChat) return;
    setIsSavingFields(true);
    try {
      // 1. Guardar campos modificados
      for (const [campoId, valor] of Object.entries(editedFields)) {
        await fetch(`${API_URL}/api/contacts/${selectedChat.id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ campo_id: Number(campoId), valor })
        });
      }

      // 2. Guardar el nuevo campo si se estÃ¡ creando y se seleccionÃ³ una definiciÃ³n
      if (isCreatingField && newFieldSelection.campo_id) {
        await fetch(`${API_URL}/api/contacts/${selectedChat.id}/fields`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            campo_id: Number(newFieldSelection.campo_id),
            valor: newFieldSelection.valor
          })
        });
        setIsCreatingField(false);
        setNewFieldSelection({ campo_id: '', valor: '' });
        setShowCampoDropdown(false);
      }

      setEditedFields({});
      loadContactDetails(selectedChat.id);
    } catch (err) {
      console.error("Error saving custom fields:", err);
    } finally {
      setIsSavingFields(false);
    }
  };

  const selectChat = (chat) => {
    setSelectedChat(chat);
    hasSelectedInitialChatRef.current = true;
    setMessageError('');
    setNotesError('');
    setDraftMessage('');
    setInternalNoteDraft('');
    setIsInternalNoteMode(false);
    setEditedFields({});
    setContactPresence(null);
    setLastSeenTime(chat.last_timestamp || null);

    // Resetear localmente el contador de mensajes sin leer
    setChats((prevChats) =>
      prevChats.map((c) => (c.jid === chat.jid ? { ...c, mensajes_sin_leer: 0 } : c))
    );

    // Enviar visto a WhatsApp y marcar en la base de datos
    if (chat.jid && user?.id) {
      const chatKey = encodeURIComponent(chat.jid);
      fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/read`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      }).catch((err) => console.error('Error al marcar chat como leido:', err));
    }
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
        // Enviar como FormData si hay un archivo (nuevo o de galerÃ­a)
        const formData = new FormData();
        formData.append('text', messageToSend);
        
        if (selectedFile.file instanceof File) {
          formData.append('file', selectedFile.file);
        } else if (selectedFile.preview) {
          // Si es de la galerÃ­a, enviamos la URL
          formData.append('media_url', selectedFile.preview);
        }
        
        formData.append('tipo', selectedFile.type);
        
        if (replyingTo) {
          formData.append('quoted_message_id', replyingTo.mensaje_id || '');
          formData.append('quoted_text', replyingTo.texto || replyingTo.nombre_archivo || 'Archivo');
          formData.append('quoted_from_me', replyingTo.es_mio ? '1' : '0');
          formData.append('quoted_participant', replyingTo.de_jid || '');
        }
        
        body = formData;
      } else {
        // Enviar solo texto
        const jsonPayload = { text: messageToSend };
        if (replyingTo) {
          jsonPayload.quoted_message_id = replyingTo.mensaje_id || '';
          jsonPayload.quoted_text = replyingTo.texto || replyingTo.nombre_archivo || 'Archivo';
          jsonPayload.quoted_from_me = replyingTo.es_mio ? 1 : 0;
          jsonPayload.quoted_participant = replyingTo.de_jid || '';
        }
        body = JSON.stringify(jsonPayload);
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
      setReplyingTo(null);

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

  const handleReplyMessage = (message) => {
    setReplyingTo(message);
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };

  const handlePinMessage = async (message) => {
    if (!selectedChat) return;
    try {
      const chatKey = encodeURIComponent(selectedChat.jid || selectedChat.id);
      const isFijado = !!message.fijado;
      const res = await fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/messages/${message.mensaje_id}/pin`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fijado: !isFijado }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.mensaje_id === message.mensaje_id ? { ...m, fijado: !isFijado } : { ...m, fijado: false }
          )
        );
        // Cargar chats de nuevo silenciosamente para actualizar la barra lateral de inmediato
        loadChats({ silent: true });
      } else {
        setMessageError(data.message || 'Error al fijar/desfijar el mensaje.');
      }
    } catch (err) {
      console.error(err);
      setMessageError('Error al fijar/desfijar el mensaje.');
    }
  };

  const handleStarMessage = async (message) => {
    if (!selectedChat) return;
    try {
      const chatKey = encodeURIComponent(selectedChat.jid || selectedChat.id);
      const isDestacado = !!message.destacado;
      const res = await fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/messages/${message.mensaje_id}/star`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destacado: !isDestacado }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.mensaje_id === message.mensaje_id ? { ...m, destacado: !isDestacado } : m
          )
        );
      } else {
        setMessageError(data.message || 'Error al destacar el mensaje.');
      }
    } catch (err) {
      console.error(err);
      setMessageError('Error al destacar el mensaje.');
    }
  };

  const handleDeleteMessage = (message) => {
    setMessageToDelete(message);
  };

  const runDeleteMessage = async (message, target) => {
    if (!selectedChat) return;
    if (target === 'everyone') {
      try {
        const chatKey = encodeURIComponent(selectedChat.jid || selectedChat.id);
        const res = await fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/messages/${message.mensaje_id}`, {
          method: 'DELETE',
        });
        const data = await res.json();
        if (data.success) {
          setMessages((prev) =>
            prev.map((m) =>
              m.mensaje_id === message.mensaje_id ? { ...m, texto: '🚫 Mensaje eliminado' } : m
            )
          );
          showToast('Mensaje eliminado para todos');
        } else {
          setMessageError(data.message || 'Error al eliminar el mensaje.');
        }
      } catch (err) {
        console.error(err);
        setMessageError('Error al eliminar el mensaje.');
      }
    } else if (target === 'me') {
      setMessages((prev) => prev.filter((m) => m.mensaje_id !== message.mensaje_id));
      showToast('Mensaje eliminado para mí');
    }
  };

  const handleReactMessage = async (message, reaccion) => {
    if (!selectedChat) return;
    try {
      const chatKey = encodeURIComponent(selectedChat.jid || selectedChat.id);
      const res = await fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/messages/${message.mensaje_id}/react`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reaccion }),
      });
      const data = await res.json();
      if (data.success) {
        setMessages((prev) =>
          prev.map((m) =>
            m.mensaje_id === message.mensaje_id ? { ...m, reaccion } : m
          )
        );
      } else {
        setMessageError(data.message || 'Error al reaccionar al mensaje.');
      }
    } catch (err) {
      console.error(err);
      setMessageError('Error al reaccionar al mensaje.');
    }
  };

  const handleReportContact = async (contact) => {
    if (!window.confirm(`¿Estás seguro de que deseas reportar al contacto ${contact.nombre || contact.telefono}?`)) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${contact.id}/report`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        setSelectedChat((prev) => prev ? { ...prev, reportado: 1 } : null);
        setChats((prev) => prev.map(c => c.id === contact.id ? { ...c, reportado: 1 } : c));
        showToast('Contacto reportado con éxito');
      } else {
        setMessageError(data.message || 'Error al reportar el contacto.');
      }
    } catch (err) {
      console.error(err);
      setMessageError('Error al reportar el contacto.');
    }
  };

  const handleCopy = (text) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    showToast('Mensaje copiado al portapapeles');
  };

  const handleForwardMessage = (message) => {
    setForwardingMessage(message);
    setSelectedForwardTargets([]);
    setForwardSearch('');
  };

  const handleForwardMessageSubmit = async () => {
    if (!forwardingMessage || selectedForwardTargets.length === 0) return;
    setIsForwardingSubmit(true);
    try {
      for (const targetJid of selectedForwardTargets) {
        const headers = {};
        let body;
        
        if (forwardingMessage.url_media) {
          const formData = new FormData();
          formData.append('text', forwardingMessage.texto || '');
          formData.append('media_url', forwardingMessage.url_media);
          formData.append('tipo', forwardingMessage.tipo);
          body = formData;
        } else {
          body = JSON.stringify({ text: forwardingMessage.texto || '' });
          headers['Content-Type'] = 'application/json';
        }

        const res = await fetch(`${API_URL}/api/chats/${user.id}/${encodeURIComponent(targetJid)}/messages`, {
          method: 'POST',
          headers,
          body
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok || !data.success) {
          console.error(`Error reenviando a ${targetJid}:`, data.message);
        }
      }
      showToast('Mensaje reenviado con éxito');
    } catch (err) {
      console.error(err);
      showToast('Error al reenviar el mensaje');
    } finally {
      setIsForwardingSubmit(false);
      setForwardingMessage(null);
      setSelectedForwardTargets([]);
    }
  };

  const toggleSelectMessage = (messageId) => {
    setSelectionMode(true);
    setSelectedMessageIds((prev) => {
      if (prev.includes(messageId)) {
        return prev.filter(id => id !== messageId);
      } else {
        return [...prev, messageId];
      }
    });
  };

  const handleCancelSelection = () => {
    setSelectionMode(false);
    setSelectedMessageIds([]);
  };

  const handleBulkCopy = () => {
    if (selectedMessageIds.length === 0) return;
    const selectedTexts = messages
      .filter(m => selectedMessageIds.includes(m.mensaje_id))
      .map(m => {
        const sender = m.es_mio ? 'Tú' : (selectedChat?.nombre || 'Contacto');
        return `[${sender}]: ${m.texto || m.nombre_archivo || '[Archivo]'}`;
      })
      .join('\n');
    
    navigator.clipboard.writeText(selectedTexts);
    showToast(`${selectedMessageIds.length} mensaje(s) copiado(s)`);
    handleCancelSelection();
  };

  const handleBulkDelete = async () => {
    if (selectedMessageIds.length === 0) return;
    if (!window.confirm(`¿Estás seguro de que deseas eliminar estos ${selectedMessageIds.length} mensajes seleccionados para todos?`)) return;
    
    let successCount = 0;
    const chatKey = encodeURIComponent(selectedChat.jid || selectedChat.id);
    for (const msgId of selectedMessageIds) {
      try {
        const res = await fetch(`${API_URL}/api/chats/${user.id}/${chatKey}/messages/${msgId}`, {
          method: 'DELETE',
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok && data.success) {
          successCount++;
          setMessages((prev) =>
            prev.map((m) =>
              m.mensaje_id === msgId ? { ...m, texto: '🚫 Mensaje eliminado' } : m
            )
          );
        }
      } catch (err) {
        console.error(err);
      }
    }
    showToast(`${successCount} mensaje(s) eliminado(s)`);
    handleCancelSelection();
  };

  const handleBulkForward = () => {
    if (selectedMessageIds.length === 0) return;
    const mergedText = messages
      .filter(m => selectedMessageIds.includes(m.mensaje_id))
      .map(m => m.texto || m.nombre_archivo || '')
      .filter(Boolean)
      .join('\n');

    if (!mergedText) {
      showToast('No hay texto para reenviar en la selección');
      return;
    }
    
    setForwardingMessage({ tipo: 'texto', texto: mergedText });
    setSelectedForwardTargets([]);
    setForwardSearch('');
    handleCancelSelection();
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
      hasSelectedInitialChatRef.current = true;
      setMessages([]); // Limpiar mensajes para el nuevo chat
    }
    
    setShowNewChatModal(false);
    // Resetear form pero mantener el dispositivo seleccionado para la prÃ³xima
    setNewChatData(prev => ({ ...prev, phone: '' }));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSubmit(event);
    }
  };

  const activeComposerText = getActiveComposerValue();
  const isBoldActive = activeComposerText.includes('*');
  const isItalicActive = activeComposerText.includes('_');
  const isStrikeActive = activeComposerText.includes('~');

  return (
    <div className="flex h-screen bg-[#f5f5f6] font-sans overflow-hidden selection:bg-indigo-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">


        <div className="flex-1 flex gap-0 min-h-0">

          {/* â”€â”€ Lista de chats â”€â”€ */}
          <div className="relative shrink-0 flex" style={{ width: sidebarWidth }}>
            <aside ref={sidebarRef} className="w-full bg-white border-r border-slate-200 shadow-none flex flex-col">
            {/* Tabs */}
            <div className="flex items-center justify-between px-4 pt-2 border-b border-gray-200 bg-white shrink-0 h-[44px]">
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
                className="w-8 h-8 rounded-md bg-[#5d5fef] text-white flex items-center justify-center shadow-sm hover:bg-[#4b4cbf] transition-colors mb-1"
              >
                <Plus size={18} />
              </button>
            </div>

            {/* BÃºsqueda */}
            <div className="p-3 flex items-center gap-2 border-b border-gray-100 bg-white shrink-0 relative">
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
                  {activeFiltersCount > 0 && (
                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-[#5d5fef] text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">
                      {activeFiltersCount}
                    </div>
                  )}
                </button>

                {showFilters && (
                  <div className="absolute top-full left-0 mt-2 w-[300px] bg-white rounded-3xl shadow-[0_10px_40px_rgba(0,0,0,0.1)] border border-slate-100 z-[100] overflow-hidden animate-in fade-in zoom-in-95 duration-200 origin-top-left">
                    <div className="p-6 space-y-6">
                      {/* Estado */}
                      <div className="flex flex-col">
                        {[
                          { id: 'unread', label: 'Conversaciones no leídas', count: filterCounts.unread },
                          { id: 'open', label: 'Conversaciones abiertas', count: filterCounts.open },
                          { id: 'closed', label: 'Conversaciones cerradas', count: filterCounts.closed },
                          { id: 'all', label: 'Todas las conversaciones', count: filterCounts.all }
                        ].map((opt, i) => (
                          <label key={opt.id} className={`flex items-center justify-between group cursor-pointer py-3.5 ${i !== 3 ? 'border-b border-slate-100' : ''}`}>
                            <div className="flex items-center gap-3">
                              <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all ${filters.status === opt.id ? 'border-[#5d5fef] bg-white' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                                {filters.status === opt.id && <div className="w-[10px] h-[10px] rounded-full bg-[#5d5fef]" />}
                              </div>
                              <input 
                                type="radio" 
                                className="hidden" 
                                name="filterStatus"
                                checked={filters.status === opt.id}
                                onChange={() => setFilters(prev => ({ ...prev, status: opt.id }))}
                              />
                              <span className={`text-sm font-semibold transition-colors ${filters.status === opt.id ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                {opt.label}
                              </span>
                            </div>
                            {opt.count > 0 && (
                              <span className="w-5 h-5 flex items-center justify-center rounded-full bg-[#5d5fef] text-white text-[10px] font-bold shrink-0 ml-2">
                                {opt.count}
                              </span>
                            )}
                          </label>
                        ))}
                      </div>

                      {/* Tags */}
                      <div className="pt-4 border-t border-slate-100">
                        <div 
                          onClick={() => setFilterTagsOpen(!filterTagsOpen)}
                          className="flex items-center justify-between mb-3 cursor-pointer select-none"
                        >
                          <h4 className="text-[13px] font-semibold text-slate-800">Tags</h4>
                          {filterTagsOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                        {filterTagsOpen && (
                          <div className="relative animate-in slide-in-from-top-2 duration-200">
                            <select 
                              value={filters.tags[0] || ''}
                              onChange={(e) => setFilters(prev => ({ ...prev, tags: e.target.value ? [Number(e.target.value)] : [] }))}
                              className={`w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none appearance-none focus:border-[#5d5fef]/20 transition-all cursor-pointer ${filters.tags[0] ? 'text-slate-700' : 'text-slate-400'}`}
                            >
                              <option value="">Seleccionar tag</option>
                              {allTags.map(tag => (
                                <option key={tag.id} value={tag.id}>{tag.nombre}</option>
                              ))}
                            </select>
                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          </div>
                        )}
                      </div>

                      {/* Agentes */}
                      <div className="pt-4 border-t border-slate-100">
                        <div 
                          onClick={() => setFilterAgentsOpen(!filterAgentsOpen)}
                          className="flex items-center justify-between mb-3 cursor-pointer select-none"
                        >
                          <h4 className="text-[13px] font-semibold text-slate-800">Agentes</h4>
                          {filterAgentsOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                        {filterAgentsOpen && (
                          <div className="relative animate-in slide-in-from-top-2 duration-200">
                            <select 
                              value={filters.agents[0] || ''}
                              onChange={(e) => setFilters(prev => ({ ...prev, agents: e.target.value ? [Number(e.target.value)] : [] }))}
                              className={`w-full h-11 pl-4 pr-10 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-semibold outline-none appearance-none focus:border-[#5d5fef]/20 transition-all cursor-pointer ${filters.agents[0] ? 'text-slate-700' : 'text-slate-400'}`}
                            >
                              <option value="">Seleccionar agente</option>
                              <option value={user.id}>{user.nombre} (Yo)</option>
                            </select>
                            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                          </div>
                        )}
                      </div>

                      {/* Por dispositivo */}
                      <div className="pt-4 border-t border-slate-100 pb-2">
                        <div 
                          onClick={() => setFilterDevicesOpen(!filterDevicesOpen)}
                          className="flex items-center justify-between mb-4 cursor-pointer select-none"
                        >
                          <h4 className="text-[13px] font-semibold text-slate-800">Por dispositivo</h4>
                          {filterDevicesOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                        </div>
                        {filterDevicesOpen && (
                          <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                            {devices.map((d, idx) => (
                              <label key={d.id} className="flex items-center gap-3 group cursor-pointer">
                                <div className={`w-[18px] h-[18px] rounded-full border flex items-center justify-center transition-all ${String(filters.deviceId) === String(d.id) ? 'border-[#5d5fef] bg-white' : 'border-slate-300 bg-white group-hover:border-slate-400'}`}>
                                  {String(filters.deviceId) === String(d.id) && <div className="w-[10px] h-[10px] rounded-full bg-[#5d5fef]" />}
                                </div>
                                <input 
                                  type="radio" 
                                  className="hidden" 
                                  name="filterDevice"
                                  checked={String(filters.deviceId) === String(d.id)}
                                  onChange={() => {
                                    setFilters(prev => ({ ...prev, deviceId: d.id }));
                                    setChatDevice(d);
                                  }}
                                />
                                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: deviceColors[idx % deviceColors.length] }} />
                                <span className={`text-sm font-semibold transition-colors ${String(filters.deviceId) === String(d.id) ? 'text-slate-800' : 'text-slate-500 group-hover:text-slate-700'}`}>
                                  {d.nombre} ({String(d.numero_telefono).slice(-4)})
                                </span>
                              </label>
                            ))}
                          </div>
                        )}
                      </div>
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

            {/* Contador de conversaciones */}
            <div className="px-4 py-2 text-xs font-semibold text-slate-500 border-b border-slate-100 bg-[#f7f8fd] shrink-0">
              {visibleChats.length} {visibleChats.length === 1 ? 'conversación' : 'conversaciones'}
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto p-0 space-y-0 overflow-hidden">
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
                  <p className="text-sm font-semibold text-slate-400">Ninguna conversación</p>
                </div>
              )}
            </div>
          </aside>
          
          {/* Drag Handle */}
          <div
            onMouseDown={handleMouseDown}
            className="absolute -right-1 top-0 bottom-0 w-2 cursor-col-resize hover:bg-[#5d5fef]/10 transition-colors z-10"
            title="Ajustar tamaño"
          />
        </div>

          {/* â”€â”€ Ventana de chat â”€â”€ */}
          <section className="flex-1 min-w-[320px] bg-white border-r border-slate-200 shadow-none flex flex-col overflow-hidden relative">
            {selectedChat ? (
              <>
                {/* Header del chat */}
                <div className="h-[60px] bg-white border-b border-slate-200 flex items-center justify-between px-5 shrink-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="relative">
                      <Avatar contact={selectedChat} size="xs" />
                    </div>
                    <div className="min-w-0 flex-1">
                      {isEditingName ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="bg-white border border-indigo-200 rounded-lg px-2 py-1 text-sm font-black w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            value={editingNameValue}
                            onChange={(e) => setEditingNameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
                            autoFocus
                          />
                          <button onClick={handleRename} className="p-1 text-emerald-600 hover:bg-indigo-50 rounded">
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
                          <h2 className="text-sm font-bold text-slate-950 truncate tracking-normal">
                            {chatVisibleName(selectedChat)}
                          </h2>
                          <span className="opacity-0 group-hover:opacity-100 text-[10px] text-emerald-600 font-bold uppercase transition-opacity">Editar</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] font-bold text-[#818cf8] uppercase tracking-wide">
                          {selectedChat.dispositivo_nombre || 'S/D'}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="hidden xl:flex items-center gap-2 bg-white px-3 py-1.5 rounded-md border border-slate-200 relative">
                      <Users size={14} className="text-[#9ca3af]" />
                      <select
                        value={selectedChat.agente_asignado_id || ''}
                        onChange={(e) => handleAssignAgent(e.target.value)}
                        className="bg-transparent text-xs font-semibold text-slate-500 outline-none cursor-pointer appearance-none pr-5"
                      >
                        <option value="">Sin asignar</option>
                        {allAgents.map(agent => (
                          <option key={agent.id} value={agent.id}>{agent.nombre}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="text-[#9ca3af] absolute right-2 pointer-events-none" />
                    </div>
                    <button
                      type="button"
                      onClick={() => setFilterStarredOnly(!filterStarredOnly)}
                      className={`h-9 px-3 rounded-md transition-all flex items-center gap-1.5 text-xs font-semibold shadow-sm active:scale-95 border ${
                        filterStarredOnly 
                          ? 'bg-amber-100 text-amber-700 border-amber-200 shadow-inner' 
                          : 'bg-white hover:bg-slate-50 text-slate-500 border-slate-200'
                      }`}
                      title="Filtrar mensajes destacados"
                    >
                      <Star size={14} className={filterStarredOnly ? 'fill-amber-400 text-amber-400' : ''} />
                      <span>{filterStarredOnly ? 'Ver todos' : 'Destacados'}</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleToggleChatStatus}
                      className={`h-9 px-5 rounded-md text-white text-xs font-semibold shadow-sm hover:shadow-md transition-all active:scale-95 ${
                        selectedChat.estado_lead === 'cerrado'
                          ? 'bg-[#5d5fef] hover:bg-[#4b4cbf]'
                          : 'bg-rose-500 hover:bg-rose-600'
                      }`}
                    >
                      {selectedChat.estado_lead === 'cerrado' ? 'Abrir conversación' : 'Cerrar conversación'}
                    </button>
                  </div>
                </div>

                {/* Mensaje fijado banner */}
                {(() => {
                  const pinnedMessage = messages.find(m => !!m.fijado);
                  if (!pinnedMessage) return null;
                  return (
                    <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-2 flex items-center justify-between text-xs font-semibold text-indigo-800 shrink-0 select-none relative z-30">
                      <div 
                        onClick={() => {
                          const el = document.getElementById(`msg-${pinnedMessage.mensaje_id}`);
                          if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }}
                        className="flex items-center gap-2 truncate cursor-pointer hover:opacity-80 transition-opacity flex-1"
                      >
                        <Pin size={12} className="rotate-45 text-indigo-600 shrink-0" />
                        <span className="font-bold shrink-0">Mensaje fijado:</span>
                        <span className="truncate text-indigo-600/90">{pinnedMessage.texto || pinnedMessage.nombre_archivo || 'Archivo'}</span>
                      </div>
                      
                      <div className="relative">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPinMenu(!showPinMenu);
                          }}
                          className="w-7 h-7 hover:bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 transition-colors"
                        >
                          <ChevronDown size={16} />
                        </button>

                        {showPinMenu && (
                          <div className="absolute right-0 top-8 bg-white border border-slate-200 shadow-xl rounded-lg py-1.5 w-36 z-40 animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handlePinMessage(pinnedMessage);
                                setShowPinMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                            >
                              <PinOff size={13} className="text-slate-500" />
                              Desfijar
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                const el = document.getElementById(`msg-${pinnedMessage.mensaje_id}`);
                                if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                setShowPinMenu(false);
                              }}
                              className="w-full text-left px-4 py-2 hover:bg-slate-50 text-xs font-semibold text-slate-700 flex items-center gap-2"
                            >
                              <ArrowRight size={13} className="text-slate-500" />
                              Ir al mensaje
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })()}

                {/* Mensajes */}
                <div className="flex-1 min-h-0 overflow-y-auto px-6 py-6 bg-[#f2f5fb]">
                  <div className="w-full space-y-4">
                    <div className="flex justify-center mb-6">
                      <span className="px-4 py-2 rounded-md bg-[#9ec7ff] text-[#1e1b4b] text-[10px] font-black uppercase tracking-normal">
                        HOY
                      </span>
                    </div>
                    {(() => {
                      const displayedMessages = filterStarredOnly 
                        ? messages.filter(m => !!m.destacado) 
                        : messages;
                      
                      if (displayedMessages.length > 0) {
                        return displayedMessages.map((message) => (
                          <MessageBubble 
                            key={message.id || message.timestamp} 
                            message={message} 
                            contact={selectedChat} 
                            onReply={handleReplyMessage}
                            onPin={handlePinMessage}
                            onStar={handleStarMessage}
                            onDelete={handleDeleteMessage}
                            onReact={handleReactMessage}
                            onReport={handleReportContact}
                            onCopy={handleCopy}
                            onForward={handleForwardMessage}
                            onSelect={toggleSelectMessage}
                            isSelected={selectedMessageIds.includes(message.mensaje_id)}
                            isSelectionMode={selectionMode}
                          />
                        ));
                      } else {
                        return (
                          <EmptyState 
                            title={filterStarredOnly ? "Sin destacados" : "Sin mensajes"} 
                            text={filterStarredOnly 
                              ? "No has destacado ningún mensaje en esta conversación todavía." 
                              : "Este contacto todavía no tiene historial guardado en GeoCHAT."
                            } 
                          />
                        );
                      }
                    })()}
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
                {selectionMode ? (
                  <div className="bg-slate-800 text-white mx-3 mb-3 px-6 py-4 rounded-xl flex items-center justify-between shadow-lg animate-in slide-in-from-bottom-4 duration-300">
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={handleCancelSelection}
                        className="p-1 hover:bg-white/10 rounded-full transition-colors"
                        title="Cancelar selección"
                      >
                        <X size={18} />
                      </button>
                      <span className="text-sm font-bold">{selectedMessageIds.length} mensaje(s) seleccionado(s)</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={handleBulkCopy}
                        disabled={selectedMessageIds.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Copy size={14} /> Copiar
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkForward}
                        disabled={selectedMessageIds.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Forward size={14} /> Reenviar
                      </button>
                      <button
                        type="button"
                        onClick={handleBulkDelete}
                        disabled={selectedMessageIds.length === 0}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                      >
                        <Trash2 size={14} /> Eliminar
                      </button>
                    </div>
                  </div>
                ) : (
                  <form
                    onSubmit={handleSubmit}
                    className={`bg-white mx-3 mb-3 shadow-none overflow-visible transition-colors ${
                      isInternalNoteMode ? 'border border-amber-200' : 'border border-slate-200'
                    }`}
                  >
                  {replyingTo && (
                    <div className="px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center justify-between animate-in slide-in-from-bottom-2 duration-150">
                      <div className="border-l-4 border-[#6a63dc] pl-3 py-0.5 text-left min-w-0 flex-1">
                        <p className="text-[11px] font-bold text-[#6a63dc] truncate">
                          Respondiendo a {replyingTo.es_mio ? 'ti mismo' : (selectedChat?.nombre || 'Contacto')}
                        </p>
                        <p className="text-[12px] text-slate-500 truncate leading-normal">
                          {replyingTo.texto || replyingTo.nombre_archivo || 'Archivo'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setReplyingTo(null)}
                        className="w-5 h-5 text-slate-400 hover:text-slate-600 rounded-full hover:bg-slate-100 flex items-center justify-center transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  )}
                  <div className={`px-4 py-3 border-b transition-colors ${isInternalNoteMode ? 'bg-[#fffbc7] border-[#f6df6f]' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-end gap-3">
                      <div className="flex-1 min-w-0">
                        {selectedFile && (
                          <div className="mb-3 flex animate-in slide-in-from-left-4 duration-300">
                            <div className="relative group">
                              <div className="w-20 h-20 rounded-xl border-2 border-amber-300/60 overflow-hidden shadow-lg bg-white">
                                {selectedFile.type === 'image' ? (
                                  <img src={selectedFile.preview} alt="preview" className="w-full h-full object-cover" />
                                ) : selectedFile.type === 'audio' ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-slate-50 px-2">
                                    <Mic size={20} className="text-indigo-500" />
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
                              <div className="ml-3 min-w-0 flex-1 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                                <p className="text-[11px] font-bold text-emerald-700 truncate mb-2">{selectedFile.file?.name || 'audio.ogg'}</p>
                                <audio controls className="w-full h-8">
                                  <source src={selectedFile.preview} type={selectedFile.file?.type || 'audio/ogg'} />
                                </audio>
                              </div>
                            )}
                          </div>
                        )}
                        {isRecordingAudio ? (
                          <div className="flex justify-center items-center flex-1 w-full py-1">
                            <div className="bg-slate-100 hover:bg-slate-200/50 transition-all rounded-full px-5 py-2 flex items-center gap-3.5 select-none shadow-sm">
                              <span className="text-[14px] font-semibold text-slate-600 tabular-nums">
                                {`${String(Math.floor(recordingSeconds / 60)).padStart(2, '0')}:${String(recordingSeconds % 60).padStart(2, '0')}`}
                              </span>
                              <button
                                type="button"
                                onClick={stopAudioRecording}
                                className="w-6 h-6 rounded-full bg-white flex items-center justify-center text-slate-600 hover:text-slate-800 transition-colors shadow-sm hover:scale-105 active:scale-95"
                                title="Detener grabación"
                              >
                                <svg className="w-3 h-3 translate-x-[1px]" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M8 5v14l11-7z" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ) : (
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
                            placeholder={isInternalNoteMode ? 'Escribe una nota interna...' : 'Escribe / para las respuesta rápidas...'}
                            rows={2}
                            className="w-full resize-none bg-transparent text-[14px] outline-none text-[#475569] placeholder:text-[#94a3b8]"
                          />
                        )}
                      </div>
                      <button
                        type="submit"
                        className={`w-12 h-12 rounded-full text-white flex items-center justify-center shadow-sm hover:shadow transition-all active:scale-90 disabled:opacity-30 disabled:grayscale shrink-0 ${
                          isInternalNoteMode
                            ? 'bg-[#eab308] hover:bg-[#ca8a04]'
                            : 'bg-[#5d5fef] hover:bg-[#4b4cbf]'
                        }`}
                        disabled={isInternalNoteMode ? (!internalNoteDraft.trim() || isSavingInternalNote) : ((!draftMessage.trim() && !selectedFile) || isSending)}
                      >
                        {(isSending || isSavingInternalNote) ? <RefreshCw size={22} className="animate-spin" /> : <Send size={22} />}
                      </button>
                    </div>
                  </div>
                  <div className="px-4 py-2.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-[#9ca3af]">
                          <button 
                            type="button" 
                            onClick={() => applyFormatting('bold')}
                            className={`p-1.5 transition-colors rounded-sm ${isBoldActive ? 'bg-[#5d5fef] text-white hover:bg-[#4b4cbf]' : 'hover:text-[#6366f1] hover:bg-indigo-50 text-[#9ca3af]'}`} 
                            title="Negrita"
                          >
                            <Bold size={16} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => applyFormatting('italic')}
                            className={`p-1.5 transition-colors rounded-sm ${isItalicActive ? 'bg-[#5d5fef] text-white hover:bg-[#4b4cbf]' : 'hover:text-[#6366f1] hover:bg-indigo-50 text-[#9ca3af]'}`} 
                            title="Cursiva"
                          >
                            <Italic size={16} />
                          </button>
                          <button 
                            type="button" 
                            onClick={() => applyFormatting('strikethrough')}
                            className={`p-1.5 transition-colors rounded-sm ${isStrikeActive ? 'bg-[#5d5fef] text-white hover:bg-[#4b4cbf]' : 'hover:text-[#6366f1] hover:bg-indigo-50 text-[#9ca3af]'}`} 
                            title="Tachado"
                          >
                            <Strikethrough size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={handleInsertLink}
                            className="hover:text-[#6366f1] p-1.5 transition-colors hover:bg-indigo-50 rounded-sm"
                            title="Insertar enlace"
                          >
                            <Link size={16} />
                          </button>
                          <div className="w-[1px] h-4 bg-[#c7d2fe] mx-1" />
                          <div className="relative">
                            <button 
                              type="button" 
                              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                              className={`p-1.5 transition-colors rounded-sm ${showEmojiPicker ? 'bg-[#5d5fef] text-white' : 'hover:text-[#6366f1] hover:bg-indigo-50 text-[#9ca3af]'}`} 
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
                              className="p-1.5 transition-colors rounded-sm cursor-pointer flex items-center justify-center hover:text-[#6366f1] hover:bg-indigo-50 text-[#9ca3af]"
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
                                  {/* SecciÃ³n Portapapeles */}
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
                                            if (['xls', 'xlsx', 'csv'].includes(ext)) return <div className="bg-indigo-50 p-3 rounded-xl"><div className="w-10 h-10 bg-[#107c41] rounded-lg flex items-center justify-center text-white font-bold text-xl">X</div></div>;
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

                                  {/* SecciÃ³n Descargado */}
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
                            className={`p-1.5 rounded-sm transition-colors ${(isInternalNoteMode && !selectedChat?.is_group) ? 'bg-[#f6c945] text-white' : 'hover:text-[#6366f1] text-[#9ca3af]'}`}
                            title="Nota interna"
                          >
                            <FileText size={17} />
                          </button>
                          <button
                            type="button"
                            onClick={toggleAudioRecording}
                            className={`p-1.5 rounded-sm transition-colors ${isRecordingAudio ? 'bg-[#5d5fef] text-white hover:bg-[#4b4cbf]' : 'hover:text-[#6366f1] text-[#9ca3af]'}`}
                            title={isRecordingAudio ? 'Detener grabación' : 'Grabar audio'}
                          >
                            <Mic size={18} />
                          </button>

                    </div>

                    <div className="relative ml-auto">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 transition-all select-none">
                        <span 
                          onClick={() => setShowDeviceSelector(!showDeviceSelector)} 
                          className="cursor-pointer hover:underline"
                        >
                          {devices.find(d => String(d.id) === String(selectedChat.dispositivo_id))?.nombre || 'Mi WhatsApp'}
                          {' '}
                          ({String(devices.find(d => String(d.id) === String(selectedChat.dispositivo_id))?.numero_telefono || '').slice(-4)})
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (chatDevice?.id) {
                              setSelectedChat(prev => ({ ...prev, dispositivo_id: chatDevice.id }));
                            }
                          }}
                          className="text-slate-400 hover:text-rose-500 p-0.5"
                          title="Quitar dispositivo"
                        >
                          <X size={12} />
                        </button>
                        <span className="text-slate-300 font-normal">|</span>
                        <button
                          type="button"
                          onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                          className="text-slate-400 hover:text-slate-600 p-0.5"
                          title="Seleccionar dispositivo"
                        >
                          <ChevronDown size={14} className={`transition-transform duration-200 ${showDeviceSelector ? 'rotate-180' : ''}`} />
                        </button>
                      </div>

                      {showDeviceSelector && (
                        <div className="absolute bottom-full right-0 mb-3 bg-white border border-slate-200 rounded-md shadow-[0_12px_28px_rgba(15,23,42,0.16)] p-0 min-w-[210px] z-[100] flex flex-col overflow-hidden origin-bottom animate-in fade-in slide-in-from-bottom-2 duration-200">
                          {devices.map((d, idx) => {
                            const isSelected = String(d.id) === String(selectedChat.dispositivo_id);
                            const color = deviceColors[idx % deviceColors.length];
                            
                            return (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setSelectedChat(prev => ({ ...prev, dispositivo_id: d.id }));
                                  setShowDeviceSelector(false);
                                }}
                                className={`w-full text-left px-4 py-3 text-sm font-semibold transition-all ${
                                  isSelected ? 'text-white' : 'hover:bg-slate-50'
                                }`}
                                style={{
                                  backgroundColor: isSelected ? color : 'transparent',
                                  color: isSelected ? 'white' : color,
                                }}
                              >
                                {d.nombre} ({String(d.numero_telefono).slice(-4)})
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </form>
                )}
              </>
            ) : (
              <EmptyState title="Selecciona un chat" text="Seleccione una conversación para iniciar" showLogo={true} />
            )}
          </section>

          {/* â”€â”€ Panel de contacto â”€â”€ */}
          {selectedChat && (
            <aside className="hidden xl:flex w-[360px] shrink-0 bg-white shadow-none flex-col min-h-0">
              <>
                <div className="p-5 border-b border-slate-200 bg-white relative flex items-start gap-4 shrink-0">
                  <Avatar contact={selectedChat} size="sm" />
                  <div className="flex-1 min-w-0 pr-6 text-left space-y-1">
                    {/* Nombre */}
                    {isEditingSidebarName ? (
                      <div className="w-full space-y-2 pt-1">
                        <div className="flex items-center border-b border-[#5d5fef] pb-1 w-full">
                          <input
                            type="text"
                            className="bg-transparent outline-none w-full text-sm font-bold text-slate-800"
                            value={sidebarNameValue}
                            onChange={(e) => setSidebarNameValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveSidebarName()}
                            autoFocus
                          />
                          <span
                            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0, marginLeft: '6px' }}
                          >
                            <span 
                              onMouseEnter={() => setShowNameRulesTooltip(true)}
                              onMouseLeave={() => setShowNameRulesTooltip(false)}
                              onClick={() => setShowNameRulesTooltip(prev => !prev)}
                              className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400 cursor-pointer select-none hover:border-[#5d5fef] hover:text-[#5d5fef] transition-colors leading-none"
                              style={{ lineHeight: 1 }}
                            >
                              ?
                            </span>
                            {showNameRulesTooltip && (
                              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300 }} className="w-56 bg-[#0f172a] text-white rounded-xl shadow-xl p-4 animate-in fade-in slide-in-from-top-1 duration-200">
                                <p className="text-xs font-black mb-2 tracking-wide text-white">Reglas:</p>
                                <ul className="space-y-1 text-[11px] font-bold text-slate-300">
                                  <li>• Obligatorio</li>
                                  <li>• Máximo 100 caracteres</li>
                                  <li>• Solo letras y espacios</li>
                                </ul>
                                <div className="absolute bottom-full right-1.5 translate-y-1 w-2.5 h-2.5 bg-[#0f172a] rotate-45" />
                              </div>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setIsEditingSidebarName(false)}
                            className="text-[12px] font-semibold text-slate-500 hover:text-slate-700 transition-colors px-2 py-1"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="button"
                            onClick={handleSaveSidebarName}
                            className="text-[12px] font-semibold text-white bg-[#5d5fef] hover:bg-[#4b4cbf] px-4 py-2 rounded-xl transition-all shadow-sm"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => {
                        setSidebarNameValue(selectedChat.nombre || selectedChat.display_name || '');
                        setIsEditingSidebarName(true);
                      }}>
                        <h3 className="font-bold text-sm text-slate-800 truncate">{chatVisibleName(selectedChat)}</h3>
                        <svg className="w-3.5 h-3.5 text-[#5d5fef]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        <CheckCheck size={14} className="text-[#5d5fef] shrink-0" />
                      </div>
                    )}

                    {/* TelÃ©fono */}
                    <p className="text-xs text-[#5d5fef] font-semibold">{chatPhoneLabel(selectedChat)}</p>

                    {/* Correo */}
                    {isEditingSidebarEmail ? (
                      <div className="w-full space-y-2 pt-1">
                        <div className="flex items-center border-b border-[#5d5fef] pb-1 w-full">
                          <input
                            type="email"
                            className="bg-transparent outline-none w-full text-xs font-semibold text-slate-600 placeholder:text-slate-300"
                            value={sidebarEmailValue}
                            onChange={(e) => setSidebarEmailValue(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSaveSidebarEmail()}
                            placeholder="correo@ejemplo.com"
                            autoFocus
                          />
                          <span
                            style={{ position: 'relative', display: 'inline-flex', alignItems: 'center', flexShrink: 0, marginLeft: '6px' }}
                          >
                            <span 
                              onMouseEnter={() => setShowEmailRulesTooltip(true)}
                              onMouseLeave={() => setShowEmailRulesTooltip(false)}
                              onClick={() => setShowEmailRulesTooltip(prev => !prev)}
                              className="w-4 h-4 rounded-full border border-slate-300 flex items-center justify-center text-[10px] font-bold text-slate-400 cursor-pointer select-none hover:border-[#5d5fef] hover:text-[#5d5fef] transition-colors leading-none"
                              style={{ lineHeight: 1 }}
                            >
                              ?
                            </span>
                            {showEmailRulesTooltip && (
                              <div style={{ position: 'absolute', top: 'calc(100% + 8px)', right: 0, zIndex: 300 }} className="w-52 bg-[#0f172a] text-white rounded-xl shadow-xl p-3 animate-in fade-in slide-in-from-top-1 duration-200">
                                <p className="text-xs font-black mb-1.5 tracking-wide text-white">Reglas:</p>
                                <ul className="space-y-1 text-[11px] font-bold text-slate-300">
                                  <li>• Formato de correo válido</li>
                                  <li>• Ejemplo: correo@dominio.com</li>
                                </ul>
                                <div className="absolute bottom-full right-1.5 translate-y-1 w-2.5 h-2.5 bg-[#0f172a] rotate-45" />
                              </div>
                            )}
                          </span>
                        </div>
                        <div className="flex justify-end items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setIsEditingSidebarEmail(false)}
                            className="text-[12px] font-semibold text-slate-500 hover:text-slate-700 transition-colors px-2 py-1"
                          >
                            Cancelar
                          </button>
                          <button 
                            type="button"
                            onClick={handleSaveSidebarEmail}
                            className="text-[12px] font-semibold text-white bg-[#5d5fef] hover:bg-[#4b4cbf] px-4 py-2 rounded-xl transition-all shadow-sm"
                          >
                            Guardar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5 group cursor-pointer" onClick={() => {
                        setSidebarEmailValue(selectedChat.correo || '');
                        setIsEditingSidebarEmail(true);
                      }}>
                        <p className="text-xs text-slate-400 truncate">{selectedChat.correo || 'Sin correo electrónico'}</p>
                        <svg className="w-3 h-3 text-[#5d5fef]" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={() => setSelectedChat(null)} 
                    type="button" 
                    className="text-slate-400 hover:text-slate-600 transition-colors absolute top-4 right-4"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto">
                  <div className="p-5 space-y-0">
                    
                    {/* â”€â”€ ACCORDEON 1: TAGS â”€â”€ */}
                    <div className="border-b border-slate-200 bg-white">
                      <button 
                        onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                        className="w-full flex items-center justify-between py-4 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[13px] font-semibold text-slate-800">Tags</span>
                        {isTagsExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>
                      {isTagsExpanded && (
                        <div className="pb-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {/* List of tags */}
                          <div className="flex flex-col gap-2 w-full">
                            {contactTags.map(tag => (
                              <div key={tag.id} className="w-full flex items-center justify-between px-4 py-2 bg-indigo-50 border border-indigo-100 rounded-full">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                                  <span className="text-xs font-bold text-[#5d5fef] uppercase tracking-wider">{tag.nombre}</span>
                                </div>
                                <button onClick={() => handleRemoveTag(tag.id)} className="text-indigo-300 hover:text-rose-500 transition-colors shrink-0">
                                  <X size={14} />
                                </button>
                              </div>
                            ))}
                            {contactTags.length === 0 && (
                              <p className="text-xs text-indigo-300 font-medium italic">No hay tags asignados a este contacto</p>
                            )}
                          </div>
                          {/* Add tag selector */}
                           <div className="relative">
                             <div 
                               onClick={() => setIsTagDropdownOpen(!isTagDropdownOpen)}
                               className="w-full h-10 px-4 bg-white border border-slate-300 rounded-md flex items-center justify-between cursor-pointer select-none text-xs font-semibold text-slate-400 hover:border-slate-400 transition-colors"
                             >
                               <span>Seleccionar tag</span>
                               <ChevronDown size={16} className="text-slate-400" />
                             </div>
                             {isTagDropdownOpen && (
                               <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 max-h-48 overflow-y-auto">
                                 <div className="space-y-1">
                                   {allTags
                                     .filter(t => !contactTags.find(ct => ct.id === t.id))
                                     .map(tag => (
                                       <button
                                         key={tag.id}
                                         type="button"
                                         onClick={() => {
                                           handleAddTag(tag.id);
                                           setIsTagDropdownOpen(false);
                                         }}
                                         className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors flex items-center gap-2"
                                       >
                                         <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                         {tag.nombre}
                                       </button>
                                     ))
                                   }
                                   {allTags.filter(t => !contactTags.find(ct => ct.id === t.id)).length === 0 && (
                                     <div className="text-center py-4 text-xs font-medium text-slate-400">Sin resultados</div>
                                   )}
                                 </div>
                               </div>
                             )}
                           </div>
                        </div>
                      )}
                    </div>

                    {/* â”€â”€ ACCORDEON 2: CAMPOS CUSTOMIZADOS â”€â”€ */}
                    <div className="border-b border-slate-200 bg-white">
                      <button 
                        onClick={() => setIsFieldsExpanded(!isFieldsExpanded)}
                        className="w-full flex items-center justify-between py-4 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[13px] font-semibold text-slate-800">Campos customizados</span>
                        {isFieldsExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>
                      {isFieldsExpanded && (
                        <div className="pb-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {isCreatingField && (
                            <div className="bg-white space-y-3 mb-4 animate-in fade-in slide-in-from-top-1 duration-200">
                              <div className="grid grid-cols-12 gap-3 px-1">
                                <div className="col-span-5 text-xs font-bold text-slate-800">Campo</div>
                                <div className="col-span-6 text-xs font-bold text-slate-800">Valor</div>
                                <div className="col-span-1"></div>
                              </div>
                              
                              <div className="grid grid-cols-12 gap-3 items-center">
                                {/* Selector Dropdown de Campo */}
                                <div className="col-span-5 relative">
                                  <div 
                                    onClick={() => setShowCampoDropdown(!showCampoDropdown)}
                                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md flex items-center justify-between cursor-pointer select-none text-xs font-semibold text-slate-600 hover:border-indigo-300 transition-colors"
                                  >
                                    <span className="truncate">
                                      {contactFields.find(f => String(f.id) === String(newFieldSelection.campo_id))?.nombre || "Seleccionar"}
                                    </span>
                                    <ChevronDown size={14} className="text-slate-400 shrink-0 ml-1" />
                                  </div>
                                  
                                  {showCampoDropdown && (
                                    <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-100 rounded-2xl shadow-xl z-50 p-2 max-h-48 overflow-y-auto">
                                      <div className="space-y-1">
                                        {availableFields.map(field => (
                                          <button
                                            key={field.id}
                                            type="button"
                                            onClick={() => {
                                              setNewFieldSelection(prev => ({ ...prev, campo_id: String(field.id) }));
                                              setShowCampoDropdown(false);
                                            }}
                                            className="w-full text-left px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 rounded-lg transition-colors truncate"
                                          >
                                            {field.nombre}
                                          </button>
                                        ))}
                                        
                                        {availableFields.length === 0 && (
                                          <div className="flex flex-col items-center justify-center py-6 text-center text-slate-400 gap-2">
                                            <FileText size={24} className="text-slate-300" />
                                            <span className="text-xs font-semibold">Ningún elemento encontrado</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                                
                                {/* Input de Valor */}
                                <div className="col-span-6">
                                  <input 
                                    type="text"
                                    value={newFieldSelection.valor}
                                    onChange={(e) => setNewFieldSelection(prev => ({ ...prev, valor: e.target.value }))}
                                    placeholder="Valor..."
                                    className="w-full h-10 px-3 bg-white border border-slate-300 rounded-md outline-none text-xs font-semibold text-slate-700 focus:border-[#5d5fef] transition-all"
                                  />
                                </div>
                                
                                {/* BotÃ³n de papelera */}
                                <div className="col-span-1 flex justify-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setIsCreatingField(false);
                                      setNewFieldSelection({ campo_id: '', valor: '' });
                                      setShowCampoDropdown(false);
                                    }}
                                    className="text-slate-400 hover:text-rose-500 transition-colors p-1"
                                    title="Eliminar fila"
                                  >
                                    <Trash2 size={16} className="text-slate-400 hover:text-rose-500 transition-colors cursor-pointer" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          )}

                          <div className="space-y-3">
                            {assignedFields.map(field => (
                              <div key={field.id} className="space-y-1 text-left">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.nombre}</label>
                                <input 
                                  type="text" 
                                  value={editedFields[field.id] !== undefined ? editedFields[field.id] : (field.valor || '')}
                                  onChange={(e) => handleFieldChange(field.id, e.target.value)}
                                  placeholder={`Escribir ${field.nombre}...`}
                                  className="w-full h-10 px-4 bg-white border border-slate-300 rounded-md outline-none text-xs font-semibold text-slate-700 focus:border-[#5d5fef] focus:bg-white transition-all"
                                />
                              </div>
                            ))}
                            {assignedFields.length === 0 && !isCreatingField && (
                              <p className="text-xs text-indigo-300 font-medium italic">Este contacto no tiene campos personalizados.</p>
                            )}

                            <button
                              type="button"
                              onClick={handleSaveAllFields}
                              disabled={isSavingFields || (isCreatingField && !newFieldSelection.campo_id)}
                              className={`w-full h-11 text-white rounded-xl text-sm font-semibold transition-all mt-4 shadow-sm ${
                                (isSavingFields || (isCreatingField && !newFieldSelection.campo_id))
                                  ? 'bg-slate-300 cursor-not-allowed'
                                  : 'bg-[#5d5fef] hover:bg-[#4b4cbf]'
                              }`}
                            >
                              {isSavingFields ? 'Guardando...' : 'Guardar'}
                            </button>

                            {!isCreatingField && (
                              <div className="flex justify-end mt-3">
                                <button
                                  type="button"
                                  onClick={() => setIsCreatingField(true)}
                                  className="flex items-center gap-2 px-4 py-2 bg-white border border-[#5d5fef] rounded-md text-xs font-semibold text-[#5d5fef] hover:bg-slate-50 transition-all shadow-sm"
                                >
                                  <Plus size={15} /> Añadir
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* â”€â”€ ACCORDEON 3: NOTAS DEL CONTACTO â”€â”€ */}
                    <div className="border-b border-slate-200 bg-white">
                      <button 
                        onClick={() => setIsNotesExpanded(!isNotesExpanded)}
                        className="w-full flex items-center justify-between py-4 bg-white hover:bg-slate-50 transition-colors"
                      >
                        <span className="text-[13px] font-semibold text-slate-800">Notas del contacto</span>
                        {isNotesExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                      </button>
                      {isNotesExpanded && (
                        <div className="pb-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                          {/* Add Note form */}
                          <div className="space-y-2 text-left">
                            <textarea
                              value={sidebarNoteDraft}
                              onChange={(e) => setSidebarNoteDraft(e.target.value)}
                              placeholder="Escribe una nota para este contacto..."
                              rows={3}
                              className="w-full p-4 border border-slate-200 rounded-md bg-slate-50 text-xs font-semibold text-slate-700 placeholder:text-slate-400 focus:border-[#5d5fef] focus:bg-white transition-all outline-none resize-none"
                            />
                            <button
                              type="button"
                              onClick={handleSaveSidebarNote}
                              disabled={!sidebarNoteDraft.trim() || isSavingSidebarNote}
                              className="w-full h-11 bg-[#5d5fef] hover:bg-[#4b4cbf] text-white rounded-xl text-sm font-semibold transition-all disabled:opacity-50"
                            >
                              {isSavingSidebarNote ? 'Guardando...' : 'Guardar nota'}
                            </button>
                          </div>

                          {/* Notes List */}
                          <div className="space-y-3">
                            {notesError ? (
                              <div className="w-full rounded-xl bg-rose-50 border border-rose-100 p-3 text-xs font-semibold text-rose-600">
                                {notesError}
                              </div>
                            ) : contactNotes.length > 0 ? (
                              contactNotes.map((note) => (
                                <div key={note.id} className="rounded-2xl bg-[#eef2ff]/70 border border-[#c7d2fe]/60 p-4 text-left">
                                  <p className="text-xs leading-relaxed text-slate-700 whitespace-pre-wrap">{note.contenido}</p>
                                  <p className="mt-2 text-[9px] font-black uppercase tracking-wider text-slate-400">
                                    {formatFullDate(note.creado_en)}
                                  </p>
                                </div>
                              ))
                            ) : (
                              <p className="text-xs text-[#64748b] font-medium italic">Aún no hay notas para este contacto.</p>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </>
            </aside>
          )}
        </div>
      </main>

      {/* â•â• MODAL NUEVA CONVERSACIÃ“N â•â• */}
      <Modal 
        isOpen={showNewChatModal} 
        onClose={() => setShowNewChatModal(false)} 
        title="Iniciar nueva conversación"
      >
        <div className="space-y-4">
          {/* Dispositivo */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 ml-1">
              Dispositivo <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <div className="absolute left-4 top-1/2 -translate-y-1/2 flex items-center pointer-events-none">
                <div 
                  className="w-2.5 h-2.5 rounded-full" 
                  style={{ 
                    backgroundColor: newChatData.deviceId 
                      ? deviceColors[devices.findIndex(d => String(d.id) === String(newChatData.deviceId)) % deviceColors.length] || '#9ca3af'
                      : '#9ca3af' 
                  }} 
                />
              </div>
              <select
                value={newChatData.deviceId}
                onChange={(e) => setNewChatData({ ...newChatData, deviceId: e.target.value })}
                className={`w-full h-9 pl-9 pr-10 rounded-md border border-slate-300 bg-white outline-none focus:border-[#5d5fef] transition-all font-medium text-sm appearance-none cursor-pointer ${newChatData.deviceId ? 'text-slate-600' : 'text-slate-400'}`}
              >
                <option value="" disabled>selecciona una opción</option>
                {devices.map((dev) => (
                  <option key={dev.id} value={dev.id}>
                    {dev.nombre}
                  </option>
                ))}
              </select>
              <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Número de teléfono */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-500 ml-1">
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
                    height: '41px',
                    borderRadius: '6px',
                    border: '1px solid #cbd5e1',
                    fontSize: '14px',
                    fontWeight: '500',
                    backgroundColor: '#ffffff',
                    color: '#334155',
                    paddingLeft: '58px'
                  }}
                  buttonStyle={{
                    backgroundColor: '#ffffff',
                    border: '1px solid #e2e8f0',
                    borderRight: '0',
                    borderRadius: '6px 0 0 6px',
                    paddingLeft: '8px',
                    zIndex: 10
                  }}
                  dropdownStyle={{
                    borderRadius: '6px',
                    marginTop: '8px',
                    boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                    border: '1px solid #e2e8f0',
                    width: '280px',
                    textAlign: 'left'
                  }}
                  containerStyle={{
                    borderRadius: '12px'
                  }}
                  placeholder="Ingrese número de teléfono"
                  enableSearch={true}
                  searchPlaceholder="Buscar país..."
                  searchStyle={{
                    margin: '8px',
                    width: 'calc(100% - 16px)',
                    height: '38px',
                    borderRadius: '6px',
                    border: '1.5px solid #5d5fef',
                    paddingLeft: '32px'
                  }}
                />
              </div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 font-medium ml-1">
            Los campos marcados con <span className="text-rose-500">*</span> son obligatorios
          </p>

          <div className="grid gap-2 pt-1">
            <button
              type="button"
              onClick={() => setShowNewChatModal(false)}
              className="w-full h-10 rounded-md border border-slate-300 bg-white font-semibold text-slate-600 text-sm hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleOpenNewChat}
              disabled={!newChatData.phone || !newChatData.deviceId}
              className="w-full h-10 rounded-md bg-[#a7a6ef] hover:bg-[#8a8df2] text-white font-semibold text-sm transition-all disabled:opacity-70 disabled:cursor-not-allowed shadow-sm"
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
          <div className="rounded-[1.35rem] border border-[#c7d2fe] bg-gradient-to-br from-[#f8fffd] to-[#eef2ff] p-4 shadow-[0_18px_40px_-28px_rgba(99,102,241,0.45)]">
            <div className="flex items-start gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#6366f1] to-[#818cf8] text-white shadow-lg shadow-indigo-100/80">
                <Link size={18} />
              </div>
              <div>
                <p className="text-sm font-black tracking-tight text-[#1e1b4b]">Agrega un enlace al mensaje</p>
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
              <div className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#6366f1]">
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
                className="w-full rounded-2xl border border-[#c7d2fe] bg-white py-4 pl-11 pr-4 text-sm font-semibold text-slate-700 outline-none transition-all focus:border-[#6366f1] focus:ring-4 focus:ring-indigo-100"
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
              className="rounded-xl border border-slate-200 py-3 text-sm font-semibold text-slate-500 transition-all hover:bg-slate-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={confirmInsertLink}
              disabled={!linkInputValue.trim()}
              className="rounded-xl bg-[#5d5fef] hover:bg-[#4b4cbf] py-3 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-40"
            >
              Insertar enlace
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal de Reenvío */}
      {forwardingMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[99999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-800">Reenviar mensaje</h3>
              <button
                type="button"
                onClick={() => {
                  setForwardingMessage(null);
                  setSelectedForwardTargets([]);
                }}
                className="text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Message Preview */}
            <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">Mensaje a reenviar:</span>
              <p className="text-xs text-slate-600 line-clamp-2 italic">
                {forwardingMessage.texto || forwardingMessage.nombre_archivo || '[Archivo / Media]'}
              </p>
            </div>

            {/* Search Input */}
            <div className="px-6 py-3 border-b border-slate-100 flex items-center gap-2 bg-white">
              <Search size={16} className="text-slate-400" />
              <input
                type="text"
                value={forwardSearch}
                onChange={(e) => setForwardSearch(e.target.value)}
                placeholder="Buscar contacto o grupo..."
                className="w-full text-xs font-semibold text-slate-700 bg-transparent outline-none placeholder-slate-400"
              />
            </div>

            {/* Recipients List */}
            <div className="flex-1 overflow-y-auto px-4 py-2 divide-y divide-slate-50 min-h-[250px]">
              {(() => {
                const query = forwardSearch.toLowerCase();
                const filteredForwardChats = chats.filter(c => 
                  (c.nombre && c.nombre.toLowerCase().includes(query)) ||
                  (c.telefono && c.telefono.includes(query)) ||
                  (c.jid && c.jid.includes(query))
                );

                if (filteredForwardChats.length > 0) {
                  return filteredForwardChats.map((c) => {
                    const isSelected = selectedForwardTargets.includes(c.jid);
                    return (
                      <div
                        key={c.jid || c.id}
                        onClick={() => {
                          setSelectedForwardTargets((prev) => {
                            if (prev.includes(c.jid)) {
                              return prev.filter(jid => jid !== c.jid);
                            } else {
                              return [...prev, c.jid];
                            }
                          });
                        }}
                        className="flex items-center justify-between py-2.5 px-2 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar contact={c} size="xs" showFlag={false} />
                          <div className="min-w-0">
                            <p className="text-xs font-bold text-slate-800 truncate">{c.nombre || c.telefono || 'Contacto'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{c.telefono || c.jid}</p>
                          </div>
                        </div>
                        <div>
                          {isSelected ? (
                            <CheckSquare className="text-[#6a63dc]" size={18} />
                          ) : (
                            <Square className="text-slate-300" size={18} />
                          )}
                        </div>
                      </div>
                    );
                  });
                } else {
                  return (
                    <div className="py-8 text-center text-xs text-slate-400">No se encontraron contactos.</div>
                  );
                }
              })()}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-semibold">
                {selectedForwardTargets.length} seleccionado(s)
              </span>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForwardingMessage(null);
                    setSelectedForwardTargets([]);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleForwardMessageSubmit}
                  disabled={selectedForwardTargets.length === 0 || isForwardingSubmit}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-[#6a63dc] hover:bg-[#5b54c2] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isForwardingSubmit ? 'Reenviando...' : 'Reenviar'}
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Modal Personalizado de Confirmación de Eliminación */}
      {messageToDelete && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[99999] animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl p-6 overflow-hidden flex flex-col gap-4 animate-in zoom-in-95 duration-200 text-center">
            <div className="mx-auto w-12 h-12 bg-rose-50 rounded-2xl flex items-center justify-center text-rose-600 mb-2">
              <Trash2 size={24} />
            </div>
            <h3 className="text-sm font-bold text-slate-800">¿Deseas eliminar este mensaje?</h3>
            <p className="text-xs text-slate-500 font-semibold leading-relaxed">Elige si deseas eliminarlo solo para ti en GeoCHAT o revocarlo/eliminarlo para todos en WhatsApp.</p>
            
            <div className="grid gap-2 mt-2">
              {messageToDelete.es_mio && (
                <button
                  type="button"
                  onClick={async () => {
                    const msg = messageToDelete;
                    setMessageToDelete(null);
                    await runDeleteMessage(msg, 'everyone');
                  }}
                  className="w-full h-10 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors"
                >
                  Eliminar para todos (Revocar)
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  const msg = messageToDelete;
                  setMessageToDelete(null);
                  runDeleteMessage(msg, 'me');
                }}
                className="w-full h-10 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition-colors"
              >
                Eliminar para mí (Ocultar)
              </button>
              <button
                type="button"
                onClick={() => setMessageToDelete(null)}
                className="w-full h-10 rounded-xl border border-slate-200 text-slate-500 font-medium text-xs hover:bg-slate-50 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notificación */}
      {toast && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 bg-slate-800 text-white text-xs font-semibold px-4 py-2.5 rounded-full shadow-2xl z-[99999] animate-in fade-in slide-in-from-top-4 duration-300">
          {toast}
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
        .phone-input-container .country-list .search-box {
          border: 1.5px solid #5d5fef !important;
          border-radius: 8px !important;
          height: 36px !important;
          padding-left: 30px !important;
          outline: none !important;
        }
        .phone-input-container .country-list .search-box:focus {
          box-shadow: 0 0 0 3px rgba(93, 95, 239, 0.1) !important;
        }
      `}</style>
    </div>
  );
}
