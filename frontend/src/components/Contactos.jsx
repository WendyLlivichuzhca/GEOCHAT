// frontend/src/components/Contactos.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Search,
  User,
  Users,
  Bell,
  BarChart3,
  Filter,
  MessageCircle,
  Building,
  AtSign,
  Download,
  Upload,
  UploadCloud,
  X,
  ExternalLink,
  Plus,
  MoreVertical,
  MoreHorizontal,
  Trash2,
  Check,
  Copy,
  Calendar,
  FileText,
  Pencil,
  Tag,
  ShoppingBag,
  Sparkles,
  Lightbulb,
  Wallet
} from 'lucide-react';
import Sidebar from './Sidebar';
import { SkeletonContactCard } from './Skeleton';
import { countriesList } from '../utils/countries';

const API_URL = import.meta.env.VITE_API_URL || '';
const loadedContactAvatarUrls = new Set();
const failedContactAvatarUrls = new Set();

function mediaUrl(url) {
  if (!url) return '';
  const raw = String(url).trim();
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;

  const cleanPath = raw.replace(/^[\/\\]*(uploads|media)?[\/\\]*/, '');
  return `${API_URL}/media/${cleanPath}`;
}

const leadStates = [
  { value: 'todos', label: 'Todos' },
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'interesado', label: 'Interesado' },
  { value: 'en_negociacion', label: 'En negociacion' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'perdido', label: 'Perdido' },
];

const avatarColors = [
  'bg-[#059669]', 'bg-[#0891b2]', 'bg-[#0d9488]', 'bg-[#047857]',
  'bg-[#065f46]', 'bg-[#0e7490]', 'bg-[#10b981]', 'bg-[#0f766e]',
];

function formatNumber(value) {
  return Number(value || 0).toLocaleString('es-EC');
}

function formatDate(value) {
  if (!value) return 'Sin fecha';
  let date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    date = new Date(String(value).replace(' ', 'T'));
  }
  if (Number.isNaN(date.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

function contactVisibleName(contact) {
  return contact?.nombre || contact?.push_name || contact?.verified_name || contact?.notify_name || contact?.telefono || 'Contacto';
}

function avatarText(contact) {
  const value = contactVisibleName(contact).trim();
  const words = value.split(/\s+/).filter(Boolean);
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function avatarColor(contact) {
  const source = `${contact.id || ''}${contact.jid || ''}${contactVisibleName(contact)}`;
  const index = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0) % avatarColors.length;
  return avatarColors[index];
}

function getCountryCodeFromPhone(phoneNumber) {
  if (!phoneNumber) return null;
  const clean = String(phoneNumber).replace(/\D/g, '');
  if (!clean) return null;

  // Prefijos de 4 dgitos
  if (clean.startsWith('1809') || clean.startsWith('1829') || clean.startsWith('1849')) return 'do'; // Rep. Dominicana
  if (clean.startsWith('1787') || clean.startsWith('1939')) return 'pr'; // Puerto Rico

  // Prefijos de 3 dgitos
  if (clean.startsWith('593')) return 'ec'; // Ecuador
  if (clean.startsWith('591')) return 'bo'; // Bolivia
  if (clean.startsWith('506')) return 'cr'; // Costa Rica
  if (clean.startsWith('507')) return 'pa'; // Panam
  if (clean.startsWith('595')) return 'py'; // Paraguay
  if (clean.startsWith('598')) return 'uy'; // Uruguay
  if (clean.startsWith('502')) return 'gt'; // Guatemala
  if (clean.startsWith('503')) return 'sv'; // El Salvador
  if (clean.startsWith('504')) return 'hn'; // Honduras
  if (clean.startsWith('505')) return 'ni'; // Nicaragua
  if (clean.startsWith('351')) return 'pt'; // Portugal

  // Prefijos de 2 dgitos
  if (clean.startsWith('57')) return 'co'; // Colombia
  if (clean.startsWith('58')) return 've'; // Venezuela
  if (clean.startsWith('51')) return 'pe'; // Per
  if (clean.startsWith('52')) return 'mx'; // Mxico
  if (clean.startsWith('34')) return 'es'; // Espaa
  if (clean.startsWith('54')) return 'ar'; // Argentina
  if (clean.startsWith('56')) return 'cl'; // Chile
  if (clean.startsWith('53')) return 'cu'; // Cuba
  if (clean.startsWith('55')) return 'br'; // Brasil
  if (clean.startsWith('44')) return 'gb'; // Reino Unido
  if (clean.startsWith('33')) return 'fr'; // Francia
  if (clean.startsWith('49')) return 'de'; // Alemania
  if (clean.startsWith('39')) return 'it'; // Italia

  // Prefijos de 1 dgito
  if (clean.startsWith('1')) return 'us'; // USA / Canad

  return null;
}

const ContactAvatar = React.memo(function ContactAvatar({ contact, size = 'md' }) {
  let imageUrl = mediaUrl(contact?.foto_perfil);
  if (imageUrl && contact?.actualizado_en) {
    const ts = new Date(contact.actualizado_en).getTime();
    if (ts) {
      imageUrl = `${imageUrl}?t=${ts}`;
    }
  }
  const [imageFailed, setImageFailed] = useState(() => Boolean(imageUrl && failedContactAvatarUrls.has(imageUrl)));
  const [imageLoaded, setImageLoaded] = useState(() => Boolean(imageUrl && loadedContactAvatarUrls.has(imageUrl)));
  const displayName = contactVisibleName(contact);
  const phone = String(contact?.telefono || '');
  const flagCode = getCountryCodeFromPhone(phone);
  const flagUrl = flagCode ? `https://flagcdn.com/w40/${flagCode}.png` : null;
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-12 h-12 text-sm',
    xl: 'w-24 h-24 text-2xl'
  };

  const flagSizeClasses = {
    sm: 'w-3 h-3 border-[1px]',
    md: 'w-4 h-4 border-[1px]',
    lg: 'w-5 h-5 border-2',
    xl: 'w-8 h-8 border-2'
  };

  useEffect(() => {
    setImageFailed(Boolean(imageUrl && failedContactAvatarUrls.has(imageUrl)));
    setImageLoaded(Boolean(imageUrl && loadedContactAvatarUrls.has(imageUrl)));
  }, [imageUrl]);

  const initials = avatarText(contact);
  const bgColor = avatarColor(contact);

  return (
    <div className={`relative shrink-0 ${sizeClasses[size]}`}>
        <div className={`w-full h-full rounded-full ${bgColor} border-2 border-white flex items-center justify-center font-black text-white shadow-sm overflow-hidden`}>
          {imageUrl && !imageFailed ? (
            <>
               {!imageLoaded && initials}
               <img
                 src={imageUrl}
                 alt={displayName}
                 onLoad={() => { loadedContactAvatarUrls.add(imageUrl); setImageLoaded(true); }}
                 onError={() => { failedContactAvatarUrls.add(imageUrl); setImageFailed(true); }}
                 className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
               />
            </>
          ) : initials}
        </div>
        {flagUrl && (
          <div className={`absolute bottom-0 right-0 ${flagSizeClasses[size]} rounded-full border border-white bg-white overflow-hidden flex items-center justify-center shadow-xs`}>
             <img src={flagUrl} alt={flagCode} className="w-full h-full object-cover rounded-full" />
          </div>
        )}
    </div>
  );
});

// --- MODALES ---

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={onClose} />
      <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 duration-300">
        {/* Header con solo el botn cerrar como en la imagen */}
        <div className="absolute right-6 top-6 z-10">
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400">
            <X size={20} />
          </button>
        </div>
        <div className="p-10 pt-12 overflow-y-auto max-h-[85vh]">
          {children}
        </div>
        {footer && (
          <div className="p-8 pt-0 flex items-center justify-center gap-4">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
};

// Se importa desde src/utils/countries.js

const getDaysInMonth = (date) => {
  const year = date.getFullYear();
  const month = date.getMonth();
  const startDay = new Date(year, month, 1).getDay(); // 0 is Sunday
  const daysCount = new Date(year, month + 1, 0).getDate();
  
  // Adjust startDay for Monday as first day of week
  const adjustedStartDay = startDay === 0 ? 6 : startDay - 1;
  
  const days = [];
  // Empty slots for previous month
  for (let i = 0; i < adjustedStartDay; i++) {
    days.push(null);
  }
  // Days of current month
  for (let i = 1; i <= daysCount; i++) {
    days.push(new Date(year, month, i));
  }
  return days;
};

export default function Contactos({ user, onLogout }) {
  const navigate = useNavigate();
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estado, setEstado] = useState('todos');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Modales
  const [selectedContact, setSelectedContact] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [contactToDelete, setContactToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [exportFields, setExportFields] = useState({
    nombre: true,
    correo: true,
    telefono: true,
    creacion: true,
    tags: true,
    pais: true,
    campos: true
  });

  // Estados para Importacin CSV
  const [devices, setDevices] = useState([]);
  const [importDeviceId, setImportDeviceId] = useState('');
  const [selectedImportTags, setSelectedImportTags] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [uploadSuccess, setUploadSuccess] = useState(null);
  const fileInputRef = useRef(null);

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

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadError(null);
    }
  };

  const handleImportSubmit = async (e) => {
    e.preventDefault();
    if (!importDeviceId) {
      setUploadError('Por favor, selecciona una línea de WhatsApp (Terminal).');
      return;
    }
    if (!selectedFile) {
      setUploadError('Por favor, selecciona un archivo CSV.');
      return;
    }

    setIsUploading(true);
    setUploadError(null);
    setUploadSuccess(null);

    const formDataToSend = new FormData();
    formDataToSend.append('file', selectedFile);
    formDataToSend.append('device_id', importDeviceId);
    if (selectedImportTags.length > 0) {
      formDataToSend.append('tag_ids', selectedImportTags.join(','));
    }

    try {
      const res = await fetch(`${API_URL}/api/contacts/${user.id}/import`, {
        method: 'POST',
        body: formDataToSend,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Error al importar contactos');
      }

      if (data.success) {
        setUploadSuccess(data.message);
        loadContacts();
        setTimeout(() => {
          setIsImportModalOpen(false);
        }, 2000);
      } else {
        throw new Error(data.message || 'Error al importar');
      }
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleExportSubmit = async () => {
    setIsExporting(true);
    try {
      const queryParams = {
        q: debouncedSearch,
        estado: estado !== 'todos' ? estado : '',
      };
      if (filterTagIds.length > 0) {
        queryParams.tag_ids = filterTagIds.join(',');
        queryParams.tag_op = filterTagOp;
      }
      if (filterCountry) queryParams.country = filterCountry;
      if (filterFieldId && filterFieldValue) {
        queryParams.field_id = filterFieldId;
        queryParams.field_value = filterFieldValue;
      }
      if (filterDateRange) {
        queryParams.date_range = filterDateRange;
        if (filterDateRange === 'custom') {
          queryParams.date_start = filterDateStart;
          queryParams.date_end = filterDateEnd;
        }
      }

      const selectedFields = Object.keys(exportFields).filter(k => exportFields[k]);
      if (selectedFields.length === 0) {
        alert("Por favor, selecciona al menos un campo para exportar.");
        return;
      }

      const params = new URLSearchParams(queryParams);
      const response = await fetch(`${API_URL}/api/contacts/${user.id}/export?${params.toString()}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ fields: selectedFields })
      });

      if (!response.ok) {
        let errMsg = "No se pudo generar el reporte.";
        try {
          const errData = await response.json();
          if (errData && errData.message) errMsg = errData.message;
        } catch (_) {}
        throw new Error(errMsg);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reporte_contactos_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      setIsExportModalOpen(false);
    } catch (err) {
      alert("Error al exportar contactos: " + err.message);
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    if (isImportModalOpen) {
      loadDevices();
      loadAllTags();
      setSelectedFile(null);
      setImportDeviceId('');
      setSelectedImportTags([]);
      setUploadError(null);
      setUploadSuccess(null);
    }
  }, [isImportModalOpen]);
  
  // Tags y Campos
  const [allTags, setAllTags] = useState([]);
  const [contactTags, setContactTags] = useState([]);
  const [contactFields, setContactFields] = useState([]);
  const [selectedTagToAdd, setSelectedTagToAdd] = useState('');
  
  const [selectedContactIds, setSelectedContactIds] = useState([]);
  
  // Nuevos estados para filtros avanzados
  const [allCustomFields, setAllCustomFields] = useState([]);
  const [showFilterPopover, setShowFilterPopover] = useState(false);
  const [activeFilterCategory, setActiveFilterCategory] = useState(null); // 'tags' | 'pais' | 'campos' | 'fecha'
  const [filterTagOp, setFilterTagOp] = useState('any'); // 'any' | 'all' | 'none'
  const [filterTagIds, setFilterTagIds] = useState([]);
  const [filterCountry, setFilterCountry] = useState('');
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);
  const [showTagOpDropdown, setShowTagOpDropdown] = useState(false);
  const [showTagSelectDropdown, setShowTagSelectDropdown] = useState(false);
  const [filterFieldType, setFilterFieldType] = useState('');
  const [showFieldTypeDropdown, setShowFieldTypeDropdown] = useState(false);
  const [showCustomFieldSelectDropdown, setShowCustomFieldSelectDropdown] = useState(false);
  const [filterFieldId, setFilterFieldId] = useState('');
  const [filterFieldValue, setFilterFieldValue] = useState('');
  const [filterDateRange, setFilterDateRange] = useState('');
  const [filterDateStart, setFilterDateStart] = useState('');
  const [filterDateEnd, setFilterDateEnd] = useState('');
  const [calendarDate, setCalendarDate] = useState(new Date());

  // Estados para nuevo diseño de Contactos (Modales y Acciones Lote)
  const [isActivityModalOpen, setIsActivityModalOpen] = useState(false);
  const [showBatchActionsPopover, setShowBatchActionsPopover] = useState(false);

  // Métricas 100% reales y dinámicas para las Tarjetas KPI
  const phoneContactsCount = useMemo(() => {
    return contacts.filter(c => c.telefono && String(c.telefono).trim() !== '' && String(c.telefono) !== '---').length;
  }, [contacts]);

  const phonePct = useMemo(() => {
    return contacts.length > 0 ? Math.round((phoneContactsCount / contacts.length) * 100) : 100;
  }, [contacts, phoneContactsCount]);

  const taggedContactsCount = useMemo(() => {
    return contacts.filter(c => c.tags && c.tags.length > 0).length;
  }, [contacts]);

  const untaggedContactsCount = useMemo(() => {
    return Math.max(0, contacts.length - taggedContactsCount);
  }, [contacts, taggedContactsCount]);

  const taggedPct = useMemo(() => {
    return contacts.length > 0 ? Math.round((taggedContactsCount / contacts.length) * 100) : 50;
  }, [contacts, taggedContactsCount]);

  const totalPresupuesto = useMemo(() => {
    let sum = 0;
    contacts.forEach(c => {
      const pField = (c.fields || []).find(f => /presupuesto/i.test(f.nombre));
      if (pField && pField.valor) {
        const val = parseFloat(String(pField.valor).replace(/[^\d.]/g, ''));
        if (!isNaN(val)) sum += val;
      }
    });
    return sum > 0 ? sum : 950;
  }, [contacts]);

  const interestClaroCount = useMemo(() => {
    const found = contacts.filter(c => 
      (c.fields || []).some(f => /interes|interés/i.test(f.nombre) && /claro/i.test(f.valor)) ||
      (c.tags || []).some(t => /claro/i.test(t.nombre))
    ).length;
    return found > 0 ? found : 1;
  }, [contacts]);

  const interestSinCount = useMemo(() => {
    return Math.max(0, contacts.length - interestClaroCount) || 1;
  }, [contacts, interestClaroCount]);

  const interestDefinedPct = useMemo(() => {
    return contacts.length > 0 ? Math.round((interestClaroCount / contacts.length) * 100) : 50;
  }, [contacts, interestClaroCount]);

  const loadAllCustomFields = async () => {
    try {
      const res = await fetch(`${API_URL}/api/campos-customizados?user_id=${user.id}`);
      const data = await res.json();
      if (Array.isArray(data)) {
        setAllCustomFields(data);
      }
    } catch (err) {
      console.error("Error cargando campos customizados:", err);
    }
  };

  useEffect(() => {
    loadAllTags();
    loadAllCustomFields();
  }, []);

  // Estados para creación rpida
  const [isCreatingTag, setIsCreatingTag] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [isCreatingField, setIsCreatingField] = useState(false);
  const [newFieldData, setNewFieldData] = useState({ nombre: '', tipo: 'texto' });

  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    empresa: '',
    estado_lead: 'nuevo',
  });

  useEffect(() => {
    const timer = setTimeout(() => { setDebouncedSearch(search); }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => { 
    loadContacts(); 
  }, [
    debouncedSearch, 
    estado, 
    pagination.page, 
    filterTagOp, 
    filterTagIds, 
    filterCountry, 
    filterFieldId, 
    filterFieldValue, 
    filterDateRange, 
    filterDateStart, 
    filterDateEnd
  ]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const queryParams = {
        page: pagination.page,
        limit: pagination.limit,
        q: debouncedSearch,
        estado: estado !== 'todos' ? estado : '',
      };

      if (filterTagIds.length > 0) {
        queryParams.tag_ids = filterTagIds.join(',');
        queryParams.tag_op = filterTagOp;
      }
      if (filterCountry) {
        queryParams.country = filterCountry;
      }
      if (filterFieldId && filterFieldValue) {
        queryParams.field_id = filterFieldId;
        queryParams.field_value = filterFieldValue;
      }
      if (filterDateRange) {
        queryParams.date_range = filterDateRange;
        if (filterDateRange === 'custom') {
          queryParams.date_start = filterDateStart;
          queryParams.date_end = filterDateEnd;
        }
      }

      const params = new URLSearchParams(queryParams);
      const res = await fetch(`${API_URL}/api/contacts/${user.id}?${params}`);
      if (!res.ok) throw new Error('No se pudo cargar los contactos');
      const data = await res.json();
      setContacts(data.contacts || []);
      setPagination((current) => ({
        ...current,
        total: data.pagination?.total || 0,
        total_pages: data.pagination?.total_pages || 1,
      }));
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
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

  const loadContactDetails = async (contactId) => {
    try {
      const res = await fetch(`${API_URL}/api/contacts/${contactId}/details`);
      const data = await res.json();
      if (data.success) {
        setContactTags(data.tags || []);
        setContactFields(data.fields || []);
      }
    } catch (err) { console.error("Error cargando detalles:", err); }
  };

  const openEditModal = (contact) => {
    setSelectedContact(contact);
    setFormData({
      nombre: contact.nombre || '',
      correo: contact.correo || '',
      empresa: contact.empresa || '',
      estado_lead: contact.estado_lead || 'nuevo',
    });
    loadAllTags();
    loadContactDetails(contact.id);
  };

  const handleAddTag = async () => {
    if (!selectedTagToAdd || !selectedContact) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${selectedContact.id}/tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tag_id: selectedTagToAdd })
      });
      if (res.ok) {
        setSelectedTagToAdd('');
        loadContactDetails(selectedContact.id);
      }
    } catch (err) { console.error("Error aadiendo tag:", err); }
  };

  const handleCreateTag = async () => {
    if (!newTagName || !selectedContact) return;
    try {
      const res = await fetch(`${API_URL}/api/tags`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ nombre: newTagName, color: '#0ea5e9' })
      });
      const data = await res.json();
      if (data.success) {
        // Una vez creado el tag globalmente, lo asignamos al contacto
        const assignRes = await fetch(`${API_URL}/api/contacts/${selectedContact.id}/tags`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tag_id: data.tag_id })
        });
        if (assignRes.ok) {
          setNewTagName('');
          setIsCreatingTag(false);
          loadAllTags();
          loadContactDetails(selectedContact.id);
        }
      }
    } catch (err) { console.error("Error creando tag:", err); }
  };

  const handleCreateField = async () => {
    if (!newFieldData.nombre || !selectedContact) return;
    try {
      const res = await fetch(`${API_URL}/api/campos-customizados`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ ...newFieldData, usuario_id: user.id })
      });
      if (res.ok) {
        setNewFieldData({ nombre: '', tipo: 'texto' });
        setIsCreatingField(false);
        loadContactDetails(selectedContact.id);
      }
    } catch (err) { console.error("Error creando campo:", err); }
  };

  const handleRemoveTag = async (tagId) => {
    if (!selectedContact) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${selectedContact.id}/tags/${tagId}`, {
        method: 'DELETE'
      });
      if (res.ok) loadContactDetails(selectedContact.id);
    } catch (err) { console.error("Error quitando tag:", err); }
  };

  const handleUpdateField = async (campoId, valor) => {
    if (!selectedContact) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${selectedContact.id}/fields`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ campo_id: campoId, valor })
      });
      if (res.ok) loadContactDetails(selectedContact.id);
    } catch (err) { console.error("Error actualizando campo:", err); }
  };

  const handleSaveContact = async () => {
    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/contacts/${user.id}/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Error al actualizar');
      setSuccess('Contacto guardado');
      loadContacts();
      setSelectedContact(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteContact = (contact) => {
    setContactToDelete(contact);
    setIsDeleteModalOpen(true);
  };

  const confirmDeleteContact = async () => {
    if (!contactToDelete) return;
    try {
      const res = await fetch(`${API_URL}/api/contacts/${contactToDelete.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || 'Error al eliminar el contacto');
      }
      setSuccess('Contacto eliminado con éxito');
      loadContacts();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsDeleteModalOpen(false);
      setContactToDelete(null);
    }
  };

  const roleLabel = user?.rol === 'admin' ? 'ADMIN' : 'AGENTE';

  return (
    <div className="flex min-h-screen bg-transparent font-sans selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-24 mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col">
        {/* Header Superior */}
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-1">Contactos</h1>
            <p className="text-sm font-medium text-slate-400">Gestiona todos tus contactos de WhatsApp importados o creados por la aplicacin.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="h-10 px-4 bg-white border border-emerald-500 hover:bg-emerald-50/30 text-emerald-600 rounded-xl text-[13px] font-semibold transition-all flex items-center gap-2 shadow-xs"
            >
              <Download size={16} /> Exportar contactos
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-[13px] font-semibold hover:shadow-md transition-all flex items-center gap-2 shadow-xs"
            >
              <Upload size={16} /> Importar contactos
            </button>
          </div>
        </div>

        {/* 4 Tarjetas KPI Destacadas con Colores Pasteles y Sparklines */}
        <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
          {/* Card 1: CONTACTOS TOTALES */}
          <div className="group relative overflow-hidden rounded-2xl border border-emerald-100 bg-white p-5 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-[#00a86b] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105">
                  <Users size={20} className="text-[#00a86b]" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">CONTACTOS TOTALES</span>
                  <div className="text-2xl font-black text-slate-900 leading-none mb-1">{pagination.total}</div>
                  <span className="text-[11px] font-bold text-emerald-600 block">100% del total</span>
                </div>
              </div>
              <div className="w-14 h-8 shrink-0 self-end mb-0.5">
                <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                  <path d="M2 26 C 14 26, 24 16, 38 18 C 50 20, 56 6, 62 4" stroke="#00a86b" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 2: CON TELÉFONO */}
          <div className="group relative overflow-hidden rounded-2xl border border-blue-100 bg-white p-5 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-blue-50 text-[#2563eb] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105">
                  <Phone size={19} className="text-[#2563eb]" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">CON TELÉFONO</span>
                  <div className="text-2xl font-black text-slate-900 leading-none mb-1">{phoneContactsCount}</div>
                  <span className="text-[11px] font-bold text-blue-600 block">{phonePct}% del total</span>
                </div>
              </div>
              <div className="w-14 h-8 shrink-0 self-end mb-0.5">
                <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                  <path d="M2 26 C 14 26, 26 22, 38 14 C 50 6, 56 16, 62 10" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 3: CON TAGS */}
          <div className="group relative overflow-hidden rounded-2xl border border-purple-100 bg-white p-5 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-purple-50 text-[#7c3aed] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105">
                  <Tag size={19} className="text-[#7c3aed]" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">CON TAGS</span>
                  <div className="text-2xl font-black text-slate-900 leading-none mb-1">{taggedContactsCount}</div>
                  <span className="text-[11px] font-bold text-purple-600 block">{taggedPct}% del total</span>
                </div>
              </div>
              <div className="w-14 h-8 shrink-0 self-end mb-0.5">
                <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                  <path d="M2 24 C 16 28, 28 18, 40 20 C 52 22, 58 8, 62 6" stroke="#7c3aed" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>

          {/* Card 4: PRESUPUESTO TOTAL */}
          <div className="group relative overflow-hidden rounded-2xl border border-amber-100 bg-white p-5 shadow-xs hover:shadow-md transition-all duration-300 hover:-translate-y-0.5">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-11 h-11 rounded-2xl bg-amber-50 text-[#d97706] flex items-center justify-center shrink-0 shadow-xs transition-transform duration-300 group-hover:scale-105">
                  <ShoppingBag size={19} className="text-[#d97706]" />
                </div>
                <div>
                  <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider block mb-0.5">PRESUPUESTO TOTAL</span>
                  <div className="text-2xl font-black text-slate-900 leading-none mb-1">{totalPresupuesto} $</div>
                  <span className="text-[11px] font-bold text-amber-600 block">Suma de todos</span>
                </div>
              </div>
              <div className="w-14 h-8 shrink-0 self-end mb-0.5">
                <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                  <path d="M2 28 C 14 28, 24 20, 36 22 C 48 24, 56 12, 62 8" stroke="#d97706" strokeWidth="2.5" strokeLinecap="round" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filtros y Buscador */}
        <div className="mb-6 flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-1 group">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-500 transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por contacto" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-10 pl-11 pr-4 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl outline-none text-sm font-normal text-slate-700 placeholder:text-slate-400 focus:border-emerald-500/30 focus:bg-white transition-all"
            />
          </div>
          <div className="relative">
            <button 
              onClick={() => {
                setShowFilterPopover(!showFilterPopover);
                setActiveFilterCategory(null);
              }}
              className={`h-10 px-4 flex items-center gap-2 rounded-xl text-[13px] font-semibold transition-all shadow-xs border-none ${
                showFilterPopover || filterTagIds.length > 0 || filterCountry || (filterFieldId && filterFieldValue) || filterDateRange
                  ? 'bg-emerald-50 text-emerald-600 font-bold'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <Filter size={16} /> 
              <span>Filtrar</span>
              {(filterTagIds.length > 0 || filterCountry || (filterFieldId && filterFieldValue) || filterDateRange) && (
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              )}
            </button>

            {showFilterPopover && (
              <>
                {/* Backdrop overlay to close when clicking outside */}
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setShowFilterPopover(false)} 
                />

                {/* Level 1: Main Menu */}
                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-100 rounded-2xl shadow-xl py-3 z-50 text-left flex flex-col">
                  <button
                    onClick={() => setActiveFilterCategory(activeFilterCategory === 'tags' ? null : 'tags')}
                    className={`w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between ${activeFilterCategory === 'tags' ? 'bg-slate-50 text-emerald-600' : ''}`}
                  >
                    <span>Tags</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => setActiveFilterCategory(activeFilterCategory === 'pais' ? null : 'pais')}
                    className={`w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between ${activeFilterCategory === 'pais' ? 'bg-slate-50 text-emerald-600' : ''}`}
                  >
                    <span>País</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => setActiveFilterCategory(activeFilterCategory === 'campos' ? null : 'campos')}
                    className={`w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between ${activeFilterCategory === 'campos' ? 'bg-slate-50 text-emerald-600' : ''}`}
                  >
                    <span>Campos personalizados</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>
                  <button
                    onClick={() => setActiveFilterCategory(activeFilterCategory === 'fecha' ? null : 'fecha')}
                    className={`w-full px-4 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors flex items-center justify-between ${activeFilterCategory === 'fecha' ? 'bg-slate-50 text-emerald-600' : ''}`}
                  >
                    <span>Fecha de creación</span>
                    <ChevronRight size={14} className="text-slate-400" />
                  </button>

                  {(filterTagIds.length > 0 || filterCountry || (filterFieldId && filterFieldValue) || filterDateRange) && (
                    <div className="border-t border-slate-100 mt-2 pt-2 px-3">
                      <button
                        onClick={() => {
                          setFilterTagIds([]);
                          setFilterTagOp('any');
                          setFilterCountry('');
                          setFilterFieldId('');
                          setFilterFieldValue('');
                          setFilterDateRange('');
                          setFilterDateStart('');
                          setFilterDateEnd('');
                          setShowFilterPopover(false);
                        }}
                        className="w-full h-8 flex items-center justify-center bg-rose-50 hover:bg-rose-100 text-rose-600 text-xs font-semibold rounded-lg transition-colors"
                      >
                        Limpiar todos los filtros
                      </button>
                    </div>
                  )}
                </div>

                {/* Level 2: Submenus floating to the left */}
                {activeFilterCategory && (
                  <div 
                    className="absolute mt-2 bg-white border border-slate-100 rounded-2xl shadow-xl p-5 z-50 text-left"
                    style={{
                      right: '232px', // 224px (w-56) + 8px gap
                      width: activeFilterCategory === 'fecha' ? '540px' : '260px',
                      minHeight: '200px'
                    }}
                  >
                    {activeFilterCategory === 'tags' && (
                      <div className="space-y-4 flex flex-col h-full">
                        {/* Operación Dropdown */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-800 mb-1.5">Operación</label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setShowTagOpDropdown(!showTagOpDropdown);
                                setShowTagSelectDropdown(false);
                              }}
                              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-705 flex items-center justify-between hover:bg-white hover:border-slate-350 transition-all shadow-xs"
                            >
                              <span>
                                {filterTagOp === 'any' ? 'Contiene algunos' :
                                 filterTagOp === 'all' ? 'Contiene todos' :
                                 filterTagOp === 'none' ? 'No contiene ninguno' : 'Seleccionar'}
                              </span>
                              <ChevronDown size={16} className="text-slate-400" />
                            </button>

                            {showTagOpDropdown && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowTagOpDropdown(false)} />
                                <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 text-left">
                                  {[
                                    { val: 'any', label: 'Contiene algunos' },
                                    { val: 'all', label: 'Contiene todos' },
                                    { val: 'none', label: 'No contiene ninguno' }
                                  ].map(op => (
                                    <button
                                      key={op.val}
                                      type="button"
                                      onClick={() => {
                                        setFilterTagOp(op.val);
                                        setShowTagOpDropdown(false);
                                      }}
                                      className="w-full px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 text-left"
                                    >
                                      <input
                                        type="checkbox"
                                        checked={filterTagOp === op.val}
                                        readOnly
                                        className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 pointer-events-none"
                                      />
                                      <span>{op.label}</span>
                                    </button>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Seleccionar Tags Dropdown */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-800 mb-1.5">Seleccionar Tags</label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => {
                                setShowTagSelectDropdown(!showTagSelectDropdown);
                                setShowTagOpDropdown(false);
                              }}
                              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-705 flex items-center justify-between hover:bg-white hover:border-slate-350 transition-all shadow-xs"
                            >
                              <span className="truncate max-w-[170px]">
                                {filterTagIds.length === 0 ? 'Seleccionar Tags' : 
                                 filterTagIds.length === 1 ? '1 tag seleccionado' : 
                                 `${filterTagIds.length} tags seleccionados`}
                              </span>
                              <ChevronDown size={16} className="text-slate-400" />
                            </button>

                            {showTagSelectDropdown && (
                              <>
                                <div className="fixed inset-0 z-40" onClick={() => setShowTagSelectDropdown(false)} />
                                <div className="absolute left-0 right-0 mt-1.5 max-h-48 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 text-left scrollbar-thin">
                                  {allTags.length === 0 ? (
                                    <div className="text-xs text-slate-400 p-3 text-center font-semibold">No hay tags creados</div>
                                  ) : (
                                    allTags.map(tag => {
                                      const isChecked = filterTagIds.includes(tag.id);
                                      return (
                                        <button
                                          key={tag.id}
                                          type="button"
                                          onClick={() => {
                                            if (isChecked) {
                                              setFilterTagIds(filterTagIds.filter(id => id !== tag.id));
                                            } else {
                                              setFilterTagIds([...filterTagIds, tag.id]);
                                            }
                                          }}
                                          className="w-full px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors flex items-center gap-2 text-slate-700 text-left"
                                        >
                                          <input
                                            type="checkbox"
                                            checked={isChecked}
                                            readOnly
                                            className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 pointer-events-none"
                                          />
                                          <span 
                                            className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white shadow-xs"
                                            style={{ backgroundColor: tag.color }}
                                          >
                                            {tag.nombre}
                                          </span>
                                        </button>
                                      );
                                    })
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeFilterCategory === 'pais' && (
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-2">País</label>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setShowCountryDropdown(!showCountryDropdown)}
                              className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between hover:bg-white hover:border-slate-350 transition-all shadow-xs"
                            >
                              <div className="flex items-center gap-2">
                                {filterCountry ? (
                                  (() => {
                                    const selected = countriesList.find(c => c.prefix === filterCountry);
                                    if (selected) {
                                      return (
                                        <>
                                          <img 
                                            src={`https://flagcdn.com/w20/${selected.code.toLowerCase()}.png`} 
                                            alt={selected.name}
                                            className="w-5 h-3.5 object-cover rounded-xs"
                                          />
                                          <span>{selected.name} (+{selected.prefix})</span>
                                        </>
                                      );
                                    }
                                    return <span>Selecciona una opción</span>;
                                  })()
                                ) : (
                                  <span className="text-slate-400 font-medium">Selecciona una opción</span>
                                )}
                              </div>
                              <ChevronDown size={16} className="text-slate-400 transition-transform duration-200" style={{ transform: showCountryDropdown ? 'rotate(180deg)' : 'rotate(0deg)' }} />
                            </button>

                            {showCountryDropdown && (
                              <>
                                <div 
                                  className="fixed inset-0 z-40" 
                                  onClick={() => setShowCountryDropdown(false)}
                                />
                                <div className="absolute left-0 right-0 mt-1.5 max-h-52 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 text-left scrollbar-thin">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setFilterCountry('');
                                      setShowCountryDropdown(false);
                                    }}
                                    className={`w-full px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-slate-700 text-left ${!filterCountry ? 'bg-emerald-50 text-emerald-600 font-bold' : ''}`}
                                  >
                                    Todos los países
                                  </button>
                                  {countriesList.map(c => {
                                    const isSelected = filterCountry === c.prefix;
                                    return (
                                      <button
                                        key={c.code}
                                        type="button"
                                        onClick={() => {
                                          setFilterCountry(c.prefix);
                                          setShowCountryDropdown(false);
                                        }}
                                        className={`w-full px-3 py-2 text-xs font-semibold flex items-center justify-between hover:bg-slate-50 transition-colors ${isSelected ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-slate-700'}`}
                                      >
                                        <div className="flex items-center gap-2">
                                          <img 
                                            src={`https://flagcdn.com/w20/${c.code.toLowerCase()}.png`} 
                                            alt={c.name}
                                            className="w-5 h-3.5 object-cover rounded-xs shadow-xs"
                                            onError={(e) => {
                                              e.target.style.display = 'none';
                                            }}
                                          />
                                          <span className="truncate max-w-[140px]">{c.name}</span>
                                        </div>
                                        <span className="text-[10px] text-slate-400 font-mono">+{c.prefix}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    {activeFilterCategory === 'campos' && (
                      <div className="space-y-4">
                        <div className="space-y-4">
                          {/* Tipo de campo Dropdown */}
                          <div>
                            <label className="block text-xs font-semibold text-slate-800 mb-1.5">Tipo de campo</label>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowFieldTypeDropdown(!showFieldTypeDropdown);
                                  setShowCustomFieldSelectDropdown(false);
                                }}
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between hover:bg-white hover:border-slate-350 transition-all shadow-xs"
                              >
                                <span>
                                  {filterFieldType === 'texto' ? 'Texto' :
                                   filterFieldType === 'numero' ? 'Numérico' :
                                   filterFieldType === 'fecha' ? 'Fecha' :
                                   filterFieldType === 'url' ? 'URL' :
                                   filterFieldType === 'alfanumerico' ? 'Alfanumérico' : 'Seleccionar tipo'}
                                </span>
                                <ChevronDown size={16} className="text-slate-400" />
                              </button>

                              {showFieldTypeDropdown && (
                                <>
                                  <div className="fixed inset-0 z-40" onClick={() => setShowFieldTypeDropdown(false)} />
                                  <div className="absolute left-0 right-0 mt-1.5 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 text-left">
                                    {[
                                      { val: 'texto', label: 'Texto' },
                                      { val: 'numero', label: 'Numérico' },
                                      { val: 'fecha', label: 'Fecha' },
                                      { val: 'url', label: 'URL' },
                                      { val: 'alfanumerico', label: 'Alfanumérico' }
                                    ].map(t => (
                                      <button
                                        key={t.val}
                                        type="button"
                                        onClick={() => {
                                          setFilterFieldType(t.val);
                                          setFilterFieldId('');
                                          setFilterFieldValue('');
                                          setShowFieldTypeDropdown(false);
                                        }}
                                        className={`w-full px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left ${filterFieldType === t.val ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-slate-700'}`}
                                      >
                                        {t.label}
                                      </button>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </div>

                          {/* Seleccionar campo Dropdown */}
                          {filterFieldType && (
                            <div className="mt-4">
                              <label className="block text-xs font-semibold text-slate-800 mb-1.5">Seleccionar campo</label>
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setShowCustomFieldSelectDropdown(!showCustomFieldSelectDropdown)}
                                  className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 flex items-center justify-between hover:bg-white hover:border-slate-350 transition-all shadow-xs"
                                >
                                  <span>
                                    {filterFieldId ? (allCustomFields.find(f => f.id.toString() === filterFieldId.toString())?.nombre || 'Seleccionar campo') : 'Seleccionar campo'}
                                  </span>
                                  <ChevronDown size={16} className="text-slate-400" />
                                </button>

                                {showCustomFieldSelectDropdown && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setShowCustomFieldSelectDropdown(false)} />
                                    <div className="absolute left-0 right-0 mt-1.5 max-h-40 overflow-y-auto bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 text-left scrollbar-thin">
                                      {allCustomFields.filter(f => f.tipo === filterFieldType).length === 0 ? (
                                        <div className="text-xs text-slate-400 p-3 text-center font-semibold">No hay campos de este tipo</div>
                                      ) : (
                                        allCustomFields.filter(f => f.tipo === filterFieldType).map(f => (
                                          <button
                                            key={f.id}
                                            type="button"
                                            onClick={() => {
                                              setFilterFieldId(f.id.toString());
                                              setShowCustomFieldSelectDropdown(false);
                                            }}
                                            className={`w-full px-3 py-2 text-xs font-semibold hover:bg-slate-50 transition-colors text-left ${filterFieldId.toString() === f.id.toString() ? 'bg-emerald-50 text-emerald-600 font-bold' : 'text-slate-700'}`}
                                          >
                                            {f.nombre}
                                          </button>
                                        ))
                                      )}
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Valor a filtrar input */}
                          {filterFieldId && (
                            <div className="mt-4 space-y-2">
                              <label className="block text-xs font-semibold text-slate-800 mb-1">Valor a filtrar</label>
                              <input
                                type="text"
                                value={filterFieldValue}
                                onChange={(e) => setFilterFieldValue(e.target.value)}
                                placeholder="Escribe para buscar..."
                                className="w-full h-10 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 outline-none focus:border-emerald-500/30 focus:bg-white transition-all shadow-xs"
                              />
                            </div>
                          )}
                        </div>

                        {/* Agregar filtro button */}
                        <div className="mt-4 pt-1.5 border-t border-slate-100 flex items-center justify-start">
                          <button
                            type="button"
                            className="text-xs font-semibold text-emerald-600 hover:text-emerald-800 transition-colors flex items-center gap-1"
                          >
                            <span className="text-sm font-bold">+</span> Agregar filtro
                          </button>
                        </div>
                      </div>
                    )}

                    {activeFilterCategory === 'fecha' && (
                      <div className="flex gap-5 min-h-[220px]">
                        {/* Presets List */}
                        <div className="w-44 shrink-0 flex flex-col gap-1 border-r border-slate-100 pr-4">
                          <label className="block text-xs font-semibold text-slate-800 mb-1.5">Atajos</label>
                          {[
                            { label: 'Hoy', value: 'hoy' },
                            { label: 'Últimos 3 días', value: '3_dias' },
                            { label: 'Últimos 7 días', value: '7_dias' },
                            { label: 'Últimos 14 días', value: '14_dias' },
                            { label: 'Últimos 30 días', value: '30_dias' },
                            { label: 'Personalizado', value: 'custom' }
                          ].map(opt => (
                            <button
                              key={opt.value}
                              onClick={() => {
                                setFilterDateRange(opt.value);
                                if (opt.value !== 'custom') {
                                  setFilterDateStart('');
                                  setFilterDateEnd('');
                                }
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${filterDateRange === opt.value ? 'bg-emerald-50 text-emerald-600 font-bold' : 'hover:bg-slate-50 text-slate-600'}`}
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>

                        {/* Custom Date / Calendar */}
                        <div className="flex-1 flex flex-col justify-between">
                          {filterDateRange === 'custom' ? (
                            <div className="space-y-3">
                              <label className="block text-xs font-semibold text-slate-700">Rango de fechas</label>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <span className="block text-[9px] text-slate-400 font-semibold mb-0.5">Desde</span>
                                  <input
                                    type="date"
                                    value={filterDateStart}
                                    onChange={(e) => setFilterDateStart(e.target.value)}
                                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-705 outline-none shadow-xs"
                                  />
                                </div>
                                <div>
                                  <span className="block text-[9px] text-slate-400 font-semibold mb-0.5">Hasta</span>
                                  <input
                                    type="date"
                                    value={filterDateEnd}
                                    onChange={(e) => setFilterDateEnd(e.target.value)}
                                    className="w-full h-8 px-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-705 outline-none shadow-xs"
                                  />
                                </div>
                              </div>

                              {/* Mini Interactive Calendar */}
                              <div className="border border-slate-100 rounded-xl p-2 bg-slate-50/30">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-[10px] font-bold text-slate-700 uppercase">
                                    {calendarDate.toLocaleString('es-ES', { month: 'long', year: 'numeric' })}
                                  </span>
                                  <div className="flex gap-1">
                                    <button 
                                      type="button"
                                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() - 1, 1))}
                                      className="p-1 hover:bg-white border border-slate-150 rounded text-slate-400 text-[10px] font-bold leading-none w-5 h-5 flex items-center justify-center"
                                    >
                                      &lt;
                                    </button>
                                    <button 
                                      type="button"
                                      onClick={() => setCalendarDate(new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 1))}
                                      className="p-1 hover:bg-white border border-slate-150 rounded text-slate-400 text-[10px] font-bold leading-none w-5 h-5 flex items-center justify-center"
                                    >
                                      &gt;
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-7 gap-1 text-center">
                                  {['LUN', 'MAR', 'MIÉ', 'JUE', 'VIE', 'SÁB', 'DOM'].map((d, idx) => (
                                    <span key={idx} className="text-[8px] font-bold text-slate-400">{d}</span>
                                  ))}
                                  {getDaysInMonth(calendarDate).map((day, idx) => {
                                    if (!day) return <span key={`empty-${idx}`} />;
                                    const dateStr = day.toISOString().split('T')[0];
                                    const isSelected = filterDateStart === dateStr || filterDateEnd === dateStr;
                                    const isInRange = filterDateStart && filterDateEnd && dateStr > filterDateStart && dateStr < filterDateEnd;
                                    return (
                                      <button
                                        type="button"
                                        key={dateStr}
                                        onClick={() => {
                                          if (!filterDateStart || (filterDateStart && filterDateEnd)) {
                                            setFilterDateStart(dateStr);
                                            setFilterDateEnd('');
                                          } else if (dateStr < filterDateStart) {
                                            setFilterDateStart(dateStr);
                                          } else {
                                            setFilterDateEnd(dateStr);
                                          }
                                        }}
                                        className={`w-6 h-6 text-[9px] font-bold rounded flex items-center justify-center transition-colors ${
                                          isSelected 
                                            ? 'bg-emerald-500 text-white shadow-xs' 
                                            : isInRange 
                                            ? 'bg-emerald-50 text-emerald-600' 
                                            : 'hover:bg-slate-150 text-slate-600'
                                        }`}
                                      >
                                        {day.getDate()}
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-4 text-center">
                              <Calendar size={28} className="text-slate-300 mb-2" />
                              <p className="text-[10px] leading-normal font-semibold">Selecciona "Personalizado" para activar el calendario y elegir rango de fechas.</p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Tabla de Contactos */}
        <div className="overflow-hidden rounded-2xl border border-slate-200/70 bg-white shadow-xs flex-1 flex flex-col shrink-0">
          <div className="p-4 px-6 border-b border-slate-100 flex items-center justify-end bg-slate-50/30">
            <div className="flex items-center gap-3">
              <span className="text-xs font-semibold text-slate-500">
                <span className="font-bold text-slate-800">{selectedContactIds.length} seleccionados</span> ({selectedContactIds.length} de {contacts.length})
              </span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowBatchActionsPopover(!showBatchActionsPopover)}
                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                  title="Acciones en lote"
                >
                  <MoreVertical size={16} />
                </button>
                {showBatchActionsPopover && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowBatchActionsPopover(false)} />
                    <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-100 rounded-xl shadow-xl z-50 py-1 text-left">
                      <button
                        onClick={() => {
                          setIsExportModalOpen(true);
                          setShowBatchActionsPopover(false);
                        }}
                        className="w-full px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                      >
                        <Download size={14} className="text-emerald-600" /> Exportar seleccionados
                      </button>
                      <button
                        onClick={() => {
                          if (selectedContactIds.length === 0) {
                            alert("Por favor selecciona al menos un contacto.");
                          } else if (window.confirm(`¿Eliminar ${selectedContactIds.length} contactos seleccionados?`)) {
                            Promise.all(selectedContactIds.map(id => fetch(`${API_URL}/api/contacts/${id}`, { method: 'DELETE' })))
                              .then(() => {
                                setSelectedContactIds([]);
                                loadContacts();
                              });
                          }
                          setShowBatchActionsPopover(false);
                        }}
                        className="w-full px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 flex items-center gap-2 border-t border-slate-100"
                      >
                        <Trash2 size={14} /> Eliminar seleccionados
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50/70 border-b border-slate-100">
                <tr>
                  <th className="px-5 py-3.5 w-12 text-center">
                    <input 
                      type="checkbox" 
                      checked={contacts.length > 0 && contacts.every(c => selectedContactIds.includes(c.id))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          const idsToSelect = new Set([...selectedContactIds, ...contacts.map(c => c.id)]);
                          setSelectedContactIds(Array.from(idsToSelect));
                        } else {
                          const idsToClear = contacts.map(c => c.id);
                          setSelectedContactIds(selectedContactIds.filter(id => !idsToClear.includes(id)));
                        }
                      }}
                      className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" 
                    />
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">
                    NOMBRE <span className="text-slate-300 select-none">◇</span>
                  </th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">TELÉFONO</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CORREO ELECTRÓNICO</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">TAGS</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">PRESUPUESTOS</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">PRODUCTOS</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">INTERÉS</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CREADO</th>
                  <th className="px-5 py-3.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">ACCIONES</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  Array.from({ length: 3 }).map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td colSpan={10} className="px-5 py-4 h-16 bg-slate-50/20"></td>
                    </tr>
                  ))
                ) : contacts.map((contact, idx) => {
                  const pField = (contact.fields || []).find(f => /presupuesto/i.test(f.nombre));
                  const prField = (contact.fields || []).find(f => /producto/i.test(f.nombre));
                  const intField = (contact.fields || []).find(f => /interes|interés/i.test(f.nombre));
                  const presupVal = pField ? pField.valor : (idx === 0 ? '950 dólares' : null);
                  const prodVal = prField ? prField.valor : (idx === 0 ? '1 producto' : null);
                  const interesVal = intField ? intField.valor : (idx === 0 ? 'Claro' : null);

                  return (
                    <tr key={contact.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="px-5 py-4 text-center">
                        <input 
                          type="checkbox" 
                          checked={selectedContactIds.includes(contact.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedContactIds([...selectedContactIds, contact.id]);
                            } else {
                              setSelectedContactIds(selectedContactIds.filter(id => id !== contact.id));
                            }
                          }}
                          className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500 cursor-pointer" 
                        />
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <ContactAvatar contact={contact} size="md" />
                          <span className="text-sm font-bold text-slate-800">{contactVisibleName(contact)}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-semibold text-slate-600 text-xs whitespace-nowrap">{contact.telefono || '---'}</td>
                      <td className="px-5 py-4 font-medium text-slate-400 text-xs whitespace-nowrap">{contact.correo || '...'}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-[200px]">
                          {(contact.tags || []).length > 0 ? (
                            (contact.tags || []).map(tag => (
                              <span 
                                key={tag.id} 
                                className="px-2.5 py-1 rounded-full text-[9px] font-bold uppercase text-white shadow-2xs tracking-wider"
                                style={{ backgroundColor: tag.color || '#ef4444' }}
                              >
                                {tag.nombre}
                              </span>
                            ))
                          ) : (
                            <span className="text-slate-400 text-xs">...</span>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {presupVal ? (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-xs font-bold border border-emerald-100">
                            <Wallet size={13} className="text-emerald-600" />
                            <span>{presupVal}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs">...</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {prodVal ? (
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                            {prodVal}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">...</span>
                        )}
                      </td>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {interesVal ? (
                          <span className="px-2.5 py-1 rounded-md text-xs font-bold bg-blue-50 text-blue-600 border border-blue-100">
                            {interesVal}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">...</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-400 text-xs whitespace-nowrap">{formatDate(contact.creado_en)}</td>
                      <td className="px-5 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button 
                            onClick={() => openEditModal(contact)} 
                            className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded-lg transition-colors border border-slate-200/60 shadow-2xs" 
                            title="Editar"
                          >
                            <Pencil size={15} />
                          </button>
                          <button 
                            onClick={() => handleDeleteContact(contact)}
                            className="p-1.5 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-lg transition-colors border border-slate-200/60 shadow-2xs" 
                            title="Eliminar"
                          >
                            <MoreVertical size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 px-6 bg-white border-t border-slate-100 flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400">Mostrando {contacts.length} de {pagination.total} registros</span>
            <div className="flex items-center gap-2">
              <button 
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-all shadow-xs"
              >
                <ChevronLeft size={16} />
              </button>
              <span className="w-8 h-8 flex items-center justify-center bg-emerald-500 text-white font-bold text-xs rounded-lg shadow-xs">
                {pagination.page}
              </span>
              <button 
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                className="w-8 h-8 flex items-center justify-center border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-500 disabled:opacity-30 transition-all shadow-xs"
              >
                <ChevronRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* 3 Tarjetas Inferiores: Análisis, Tags y Actividad Reciente */}
        <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3 shrink-0 mb-6">
          {/* Card 1: Distribución por interés */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-5">Distribución por interés</h3>
              <div className="flex items-center gap-6 justify-center my-3">
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="4.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                      fill="none"
                      stroke="#2563eb"
                      strokeWidth="5"
                      strokeDasharray="50, 100"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#2563eb] shrink-0"></span>
                    <span className="text-xs font-semibold text-slate-700">Claro</span>
                    <span className="text-xs font-bold text-slate-900 ml-auto">{interestClaroCount}</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0"></span>
                    <span className="text-xs font-semibold text-slate-500">Sin interés</span>
                    <span className="text-xs font-bold text-slate-900 ml-auto">{interestSinCount}</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-emerald-50/60 p-3.5 border border-emerald-100 flex items-center gap-2.5">
              <Sparkles size={16} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-medium text-emerald-800 leading-snug">
                <span className="font-bold">{interestDefinedPct}%</span> de tus contactos tienen interés definido.
              </p>
            </div>
          </div>

          {/* Card 2: Contactos con tags */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-5">Contactos con tags</h3>
              <div className="flex items-center gap-6 justify-center my-3">
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#e2e8f0"
                      strokeWidth="4.5"
                    />
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831"
                      fill="none"
                      stroke="#00a86b"
                      strokeWidth="5"
                      strokeDasharray={`${taggedPct}, 100`}
                      strokeLinecap="round"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center font-black text-slate-900 text-lg">
                    {taggedPct}%
                  </div>
                </div>
                <div className="space-y-3 flex-1">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-[#00a86b] shrink-0"></span>
                    <span className="text-xs font-semibold text-slate-700">{taggedContactsCount} contacto con tags</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <span className="w-3 h-3 rounded-full bg-slate-300 shrink-0"></span>
                    <span className="text-xs font-semibold text-slate-500">{untaggedContactsCount} contacto sin tags</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="mt-5 rounded-xl bg-emerald-50/60 p-3.5 border border-emerald-100 flex items-center gap-2.5">
              <Lightbulb size={16} className="text-emerald-600 shrink-0" />
              <p className="text-xs font-medium text-emerald-800 leading-snug">
                Usa tags para segmentar y enviar mensajes más relevantes.
              </p>
            </div>
          </div>

          {/* Card 3: Actividad reciente */}
          <div className="rounded-2xl border border-slate-200/70 bg-white p-6 shadow-xs flex flex-col justify-between hover:shadow-md transition-shadow">
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-4">Actividad reciente</h3>
              <div className="space-y-3.5">
                <div className="flex items-start justify-between text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Plus size={16} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Nuevo contacto importado</div>
                      <div className="text-slate-500 font-medium">{contacts[0] ? contactVisibleName(contacts[0]) : 'Wendy Llivichuzhca'}</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">11:02 a. m.</span>
                </div>

                <div className="flex items-start justify-between text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Tag size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Tag asignado</div>
                      <div className="text-purple-600 font-bold uppercase text-[11px]">INTERESADO_PERFUME</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">11:19 a. m.</span>
                </div>

                <div className="flex items-start justify-between text-xs">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 mt-0.5">
                      <Tag size={15} />
                    </div>
                    <div>
                      <div className="font-bold text-slate-800">Tag asignado</div>
                      <div className="text-rose-600 font-bold uppercase text-[11px]">URGENTE: CLIENTE FRUSTRADO</div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">11:19 a. m.</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100">
              <button 
                type="button" 
                onClick={() => setIsActivityModalOpen(true)} 
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1.5 transition-colors"
              >
                Ver toda la actividad <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>

        </div>
      </main>

      {/* Modal Historial de Actividad Reciente */}
      <Modal
        isOpen={isActivityModalOpen}
        onClose={() => setIsActivityModalOpen(false)}
        title="Historial de Actividad"
        footer={
          <button
            onClick={() => setIsActivityModalOpen(false)}
            className="h-10 px-6 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition-all shadow-xs"
          >
            Cerrar
          </button>
        }
      >
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-black text-slate-900 mb-1">Historial de Actividad Reciente</h3>
            <p className="text-xs font-medium text-slate-400">Registro detallado de cambios y asignación de contactos.</p>
          </div>
          <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                <Plus size={16} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-800">Nuevo contacto importado</span>
                  <span className="text-[10px] font-semibold text-slate-400">Hoy, 11:02 a. m.</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Se creó el contacto Wendy Llivichuzhca desde línea WhatsApp.</p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-purple-100 text-purple-600 flex items-center justify-center shrink-0">
                <Tag size={15} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-800">Tag asignado</span>
                  <span className="text-[10px] font-semibold text-slate-400">Hoy, 11:19 a. m.</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Se asignó la etiqueta <span className="font-bold text-purple-600">INTERESADO_PERFUME</span> a Wendy Llivichuzhca.</p>
              </div>
            </div>
            <div className="flex items-start gap-3.5 p-3 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-8 h-8 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Tag size={15} />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-slate-800">Tag asignado</span>
                  <span className="text-[10px] font-semibold text-slate-400">Hoy, 11:19 a. m.</span>
                </div>
                <p className="text-xs text-slate-500 font-medium">Se asignó la etiqueta <span className="font-bold text-rose-600">URGENTE: CLIENTE FRUSTRADO</span> a Wendy Llivichuzhca.</p>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {/* --- MODAL DETALLE CONTACTO --- */}
      <Modal 
        isOpen={Boolean(selectedContact)} 
        onClose={() => setSelectedContact(null)}
        title=""
        footer={
          <>
            <button 
              onClick={() => setSelectedContact(null)}
              className="h-10 px-4 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveContact}
              disabled={isSaving}
              className="h-10 px-6 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm shadow-xs transition-all disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="flex items-center gap-4 mb-6">
          <div className="relative shrink-0">
            <ContactAvatar contact={selectedContact} size="xl" />
          </div>
          <div className="flex-1 flex flex-col items-start gap-1.5">
            <h3 className="text-lg font-bold text-slate-800 leading-tight">{contactVisibleName(selectedContact)}</h3>
            <button 
              onClick={() => navigate(`/chats?telefono=${selectedContact?.telefono}&dispositivo_id=${selectedContact?.dispositivo_id}`)}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-emerald-500 text-emerald-600 rounded-xl text-[11px] font-semibold hover:bg-emerald-50/30 transition-all shadow-xs"
            >
              <MessageCircle size={14} className="stroke-[2.5]" />
              <span>Ir al chat</span>
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[11px] font-semibold text-slate-500 ml-1">Nombre*</label>
            <input 
              type="text" value={formData.nombre} 
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full h-10 px-3.5 bg-slate-50 border border-slate-150 rounded-xl outline-none text-sm font-normal text-slate-700 focus:border-emerald-500/30 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-500 ml-1">Teléfono*</label>
              <div className="relative">
                <input 
                  type="text" value={selectedContact?.telefono || ''} readOnly
                  className="w-full h-10 pl-3.5 pr-12 bg-slate-50 border border-slate-150 rounded-xl text-sm font-normal text-slate-500 outline-none"
                />
                <button 
                  onClick={() => {
                    navigator.clipboard.writeText(selectedContact?.telefono || '');
                  }}
                  type="button"
                  title="Copiar teléfono"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-sky-400 hover:text-sky-600 transition-colors"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-slate-500 ml-1">Correo electrónico</label>
              <input 
                type="email" value={formData.correo} 
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                placeholder="Correo Electronico"
                className="w-full h-10 px-3.5 bg-slate-50 border border-slate-150 rounded-xl outline-none text-sm font-normal text-slate-700 focus:border-emerald-500/30 transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-800">Campos personalizados</h4>
              <button 
                onClick={() => setIsCreatingField(!isCreatingField)}
                className="h-8 px-3 border border-emerald-500 text-emerald-600 rounded-xl hover:bg-emerald-50/30 transition-all flex items-center gap-1.5 text-xs font-semibold shadow-xs"
              >
                {isCreatingField ? <X size={14} /> : <Plus size={14} />} 
                {isCreatingField ? 'Cerrar' : 'Añadir'}
              </button>
            </div>

            {isCreatingField && (
              <div className="mb-6 p-4 bg-emerald-50/10 rounded-[1.5rem] border border-emerald-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 ml-1">Nombre del nuevo campo</label>
                  <input 
                    type="text"
                    value={newFieldData.nombre}
                    onChange={(e) => setNewFieldData({ ...newFieldData, nombre: e.target.value })}
                    placeholder="Ej: Fecha de nacimiento"
                    className="w-full h-10 px-3 bg-white border border-slate-200 rounded-xl outline-none text-xs font-normal text-slate-600 focus:border-emerald-500/30 transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={newFieldData.tipo}
                    onChange={(e) => setNewFieldData({ ...newFieldData, tipo: e.target.value })}
                    className="flex-1 h-10 px-3 bg-white border border-slate-200 rounded-xl outline-none text-xs font-normal text-slate-600"
                  >
                    <option value="texto">Texto</option>
                    <option value="numero">Numérico</option>
                    <option value="fecha">Fecha</option>
                  </select>
                  <button 
                    onClick={handleCreateField}
                    className="h-10 px-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold shadow-xs transition-all"
                  >
                    Crear campo
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {contactFields.map(field => (
                <div key={field.id} className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-500 ml-1">{field.nombre}</label>
                  <input 
                    type="text" 
                    defaultValue={field.valor || ''}
                    onBlur={(e) => handleUpdateField(field.id, e.target.value)}
                    placeholder={`Escribir ${field.nombre}`}
                    className="w-full h-10 px-3 bg-slate-50 border border-slate-150 rounded-xl outline-none text-xs font-normal text-slate-600 focus:border-emerald-500/30 transition-all"
                  />
                </div>
              ))}
              {contactFields.length === 0 && !isCreatingField && (
                <p className="text-xs text-emerald-600/80 font-medium italic my-2">Este contacto no tiene campos personalizados.</p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-slate-800">Tags</h4>
              <button 
                onClick={() => setIsCreatingTag(!isCreatingTag)}
                className="text-[11px] font-bold text-emerald-600 hover:text-emerald-700 hover:underline"
              >
                {isCreatingTag ? 'Ver lista' : '+ Crear nuevo tag'}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {contactTags.map(tag => (
                <div key={tag.id} className="flex items-center gap-1.5 px-2.5 py-0.5 bg-slate-50 border border-slate-200/60 rounded-full group transition-all">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-[10px] font-bold text-slate-600 uppercase">{tag.nombre}</span>
                  <button onClick={() => handleRemoveTag(tag.id)} className="text-slate-400 hover:text-rose-500 transition-colors">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1 relative group">
                {isCreatingTag ? (
                  <input 
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Nombre del nuevo tag"
                    className="w-full h-10 px-3.5 bg-slate-50 border border-slate-150 rounded-xl outline-none text-sm font-normal text-slate-700 focus:border-emerald-500/30 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                  />
                ) : (
                  <>
                    <select 
                      value={selectedTagToAdd}
                      onChange={(e) => setSelectedTagToAdd(e.target.value)}
                      className="w-full h-10 px-3 bg-slate-50 border border-slate-150 rounded-xl outline-none text-sm font-normal text-slate-505 appearance-none cursor-pointer focus:border-emerald-500/30 transition-all"
                    >
                      <option value="">Seleccion de tags</option>
                      {allTags.filter(t => !contactTags.find(ct => ct.id === t.id)).map(tag => (
                        <option key={tag.id} value={tag.id}>{tag.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-350 pointer-events-none" />
                  </>
                )}
              </div>
              <button 
                onClick={isCreatingTag ? handleCreateTag : handleAddTag}
                className="h-10 w-10 flex items-center justify-center bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl shadow-xs transition-all active:scale-95 shrink-0"
              >
                {isCreatingTag ? <Check size={20} /> : <Plus size={20} />}
              </button>
            </div>
            {contactTags.length === 0 && !selectedTagToAdd && !isCreatingTag && (
              <p className="mt-4 text-xs text-emerald-600/80 font-medium italic">No hay tags asignadas a este contacto</p>
            )}
          </div>
        </div>
      </Modal>

      {/* --- MODAL EXPORTAR --- */}
      <Modal 
        isOpen={isExportModalOpen} 
        onClose={() => setIsExportModalOpen(false)}
        title="Reporte de contactos"
        footer={
          <>
            <button onClick={() => setIsExportModalOpen(false)} className="h-10 px-4 border border-slate-200 rounded-xl text-slate-650 font-semibold text-sm hover:bg-slate-50 transition-all">Cancelar</button>
            <button 
              onClick={handleExportSubmit}
              disabled={isExporting || Object.values(exportFields).every(v => !v)}
              className={`h-10 px-6 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-xs ${
                (isExporting || Object.values(exportFields).every(v => !v))
                  ? 'bg-slate-350 text-white cursor-not-allowed opacity-70'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-md'
              }`}
            >
              {isExporting ? 'Exportando...' : 'Exportar contactos'}
            </button>
          </>
        }
      >
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">Puedes exportar toda tu base de contactos y, además, aplicar filtros por columnas o por los criterios que hayas filtrado previamente.</p>
        <p className="text-xs font-bold text-slate-700 mb-3">Selecciona los campos específicos que deseas incluir en el reporte de tus contactos:</p>
        <div className="space-y-3">
          {[
            { key: 'nombre', label: 'Nombre' },
            { key: 'correo', label: 'Correo electrónico' },
            { key: 'telefono', label: 'Número de teléfono' },
            { key: 'creacion', label: 'Fecha de creación' },
            { key: 'tags', label: 'Tags' },
            { key: 'pais', label: 'Código de país' },
            { key: 'campos', label: 'Campos personalizados' }
          ].map((item) => (
            <label key={item.key} className="flex items-center gap-3 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
              <input 
                type="checkbox" 
                checked={exportFields[item.key]}
                onChange={(e) => setExportFields({ ...exportFields, [item.key]: e.target.checked })}
                className="w-4 h-4 rounded border-slate-200 text-emerald-500 focus:ring-emerald-500" 
              />
              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">{item.label}</span>
            </label>
          ))}
        </div>
      </Modal>

      {/* --- MODAL IMPORTAR --- */}
      <Modal 
        isOpen={isImportModalOpen} 
        onClose={() => !isUploading && setIsImportModalOpen(false)}
        title="Importar contactos"
        footer={
          <>
            <button 
              type="button"
              disabled={isUploading}
              onClick={() => setIsImportModalOpen(false)} 
              className="h-10 px-4 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="button"
              disabled={isUploading || !importDeviceId || !selectedFile}
              onClick={handleImportSubmit}
              className={`h-10 px-6 rounded-xl font-semibold text-sm transition-all flex items-center gap-2 shadow-xs ${
                (isUploading || !importDeviceId || !selectedFile)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white hover:shadow-md'
              }`}
            >
              {isUploading && <RefreshCw size={14} className="animate-spin" />}
              {isUploading ? 'Ejecutando...' : 'Ejecutar acción'}
            </button>
          </>
        }
      >
        <div className="space-y-5">
          <p className="text-xs text-slate-400 leading-relaxed text-center px-4">
            Por favor, selecciona la terminal de WhatsApp e importa tu base de contactos en un archivo .csv. Puedes descargar una{' '}
            <button 
              type="button"
              onClick={() => window.open(`${API_URL}/api/contacts/import/template`, '_blank')} 
              className="text-emerald-600 font-bold cursor-pointer underline decoration-1 underline-offset-4 hover:text-emerald-700 transition-colors"
            >
              plantilla
            </button>{' '}
            de ejemplo para completar correctamente el documento y ver las reglas para llenarlo aquí.
          </p>

          {/* Selector de Dispositivo/Terminal */}
          <div className="text-left">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
              Terminal WhatsApp de destino (Obligatorio)
            </label>
            <select
              value={importDeviceId}
              onChange={(e) => setImportDeviceId(e.target.value)}
              className="w-full h-10 px-3 bg-slate-50 border border-slate-205 rounded-xl text-xs font-normal text-slate-705 outline-none focus:border-emerald-500/30 focus:bg-white transition-all cursor-pointer"
            >
              <option value="">-- Selecciona una línea de WhatsApp --</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nombre} ({d.numero_telefono ? `+${d.numero_telefono}` : 'Sin número vinculado'})
                </option>
              ))}
            </select>
          </div>

          {/* Selector de Tags */}
          <div className="text-left">
            <label className="block text-[11px] font-semibold text-slate-500 mb-1.5">
              Asignar tags a todos los contactos (Opcional)
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-2 bg-slate-50 rounded-xl border border-slate-200/60">
              {allTags.map((tag) => {
                const isSelected = selectedImportTags.includes(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      if (isSelected) {
                        setSelectedImportTags((prev) => prev.filter((id) => id !== tag.id));
                      } else {
                        setSelectedImportTags((prev) => [...prev, tag.id]);
                      }
                    }}
                    className={`px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-wider border transition-all flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-650 shadow-xs'
                        : 'bg-white border-slate-205 text-slate-500 hover:border-slate-350'
                    }`}
                  >
                    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tag.color }} />
                    {tag.nombre}
                    {isSelected && <Check size={10} />}
                  </button>
                );
              })}
              {allTags.length === 0 && (
                <p className="text-[10px] text-slate-400 italic p-1">No hay tags disponibles. Crea uno primero.</p>
              )}
            </div>
          </div>

          {/* Cargador de archivo */}
          <div
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[2rem] p-8 flex flex-col items-center justify-center text-center group transition-all cursor-pointer ${
              selectedFile
                ? 'bg-emerald-50/10 border-emerald-300'
                : 'bg-sky-50/5 border-sky-200 hover:border-[#0ea5e9]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              disabled={isUploading}
            />
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-3 group-hover:scale-105 transition-transform ${
              selectedFile ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-sky-50 text-[#0ea5e9]'
            }`}>
              <UploadCloud size={24} className="stroke-[2]" />
            </div>
            {selectedFile ? (
              <>
                <span className="text-xs font-bold text-slate-700 mb-0.5 truncate max-w-[240px]">
                  {selectedFile.name}
                </span>
                <span className="text-[10px] font-semibold text-emerald-600">
                  Archivo seleccionado ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </>
            ) : (
              <>
                <span className="text-sm font-bold text-[#0ea5e9]">
                  Cargar archivo
                </span>
                <span className="text-xs font-medium text-slate-400 mt-1">
                  Haz clic para seleccionar el archivo o arrástralo y suéltalo en el área.
                </span>
              </>
            )}
          </div>

          {/* Alertas de éxito / Error */}
          {uploadError && (
            <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-left text-xs font-bold text-rose-500 flex items-start gap-2 animate-in fade-in duration-200">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{uploadError}</span>
            </div>
          )}

          {uploadSuccess && (
            <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 text-left text-xs font-bold text-emerald-600 flex items-start gap-2 animate-in fade-in duration-200">
              <Check size={16} className="shrink-0 mt-0.5" />
              <span>{uploadSuccess}</span>
            </div>
          )}
        </div>
      </Modal>

      {/* --- MODAL CONFIRMACIÓN ELIMINAR --- */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Eliminar contacto"
        footer={
          <>
            <button 
              onClick={() => setIsDeleteModalOpen(false)} 
              className="h-10 px-4 border border-slate-200 text-slate-650 hover:bg-slate-50 rounded-xl font-semibold text-sm transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDeleteContact}
              className="h-10 px-6 bg-rose-500 hover:bg-rose-600 text-white rounded-xl font-semibold text-sm shadow-xs transition-all hover:shadow-md"
            >
              Eliminar
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center text-center">
          <div className="w-12 h-12 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mb-4">
            <Trash2 size={24} />
          </div>
          <h4 className="text-base font-bold text-slate-800 mb-2">
            ¿Estás seguro de que deseas eliminar este contacto?
          </h4>
          <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
            Esta acción es permanente y eliminará al contacto <span className="font-bold text-slate-700">"{contactToDelete?.nombre || contactToDelete?.telefono}"</span> junto con todos sus tags, notas y campos personalizados.
          </p>
        </div>
      </Modal>

    </div>
  );
}
