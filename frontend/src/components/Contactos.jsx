// frontend/src/components/Contactos.jsx
import React, { useEffect, useMemo, useState, useRef } from 'react';
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
  Bell,
  BarChart3,
  Filter,
  MessageCircle,
  Building,
  AtSign,
  Download,
  Upload,
  X,
  ExternalLink,
  Plus,
  MoreVertical,
  Trash2,
  Check,
  Copy,
  Calendar,
  FileText
} from 'lucide-react';
import Sidebar from './Sidebar';
import { SkeletonContactCard } from './Skeleton';

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
  const date = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(date.getTime())) return value;
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

  // Prefijos de 4 dígitos
  if (clean.startsWith('1809') || clean.startsWith('1829') || clean.startsWith('1849')) return 'do'; // Rep. Dominicana
  if (clean.startsWith('1787') || clean.startsWith('1939')) return 'pr'; // Puerto Rico

  // Prefijos de 3 dígitos
  if (clean.startsWith('593')) return 'ec'; // Ecuador
  if (clean.startsWith('591')) return 'bo'; // Bolivia
  if (clean.startsWith('506')) return 'cr'; // Costa Rica
  if (clean.startsWith('507')) return 'pa'; // Panamá
  if (clean.startsWith('595')) return 'py'; // Paraguay
  if (clean.startsWith('598')) return 'uy'; // Uruguay
  if (clean.startsWith('502')) return 'gt'; // Guatemala
  if (clean.startsWith('503')) return 'sv'; // El Salvador
  if (clean.startsWith('504')) return 'hn'; // Honduras
  if (clean.startsWith('505')) return 'ni'; // Nicaragua
  if (clean.startsWith('351')) return 'pt'; // Portugal

  // Prefijos de 2 dígitos
  if (clean.startsWith('57')) return 'co'; // Colombia
  if (clean.startsWith('58')) return 've'; // Venezuela
  if (clean.startsWith('51')) return 'pe'; // Perú
  if (clean.startsWith('52')) return 'mx'; // México
  if (clean.startsWith('34')) return 'es'; // España
  if (clean.startsWith('54')) return 'ar'; // Argentina
  if (clean.startsWith('56')) return 'cl'; // Chile
  if (clean.startsWith('53')) return 'cu'; // Cuba
  if (clean.startsWith('55')) return 'br'; // Brasil
  if (clean.startsWith('44')) return 'gb'; // Reino Unido
  if (clean.startsWith('33')) return 'fr'; // Francia
  if (clean.startsWith('49')) return 'de'; // Alemania
  if (clean.startsWith('39')) return 'it'; // Italia

  // Prefijos de 1 dígito
  if (clean.startsWith('1')) return 'us'; // USA / Canadá

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
        {/* Header con solo el botón cerrar como en la imagen */}
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

export default function Contactos({ user, onLogout }) {
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

  // Estados para Importación CSV
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
  
  // Estados para creación rápida
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

  useEffect(() => { loadContacts(); }, [debouncedSearch, estado, pagination.page]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        q: debouncedSearch,
        estado: estado !== 'todos' ? estado : '',
      });
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
    } catch (err) { console.error("Error añadiendo tag:", err); }
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
        body: JSON.stringify({ nombre: newTagName, color: '#5d5fef' })
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

  const roleLabel = user?.rol === 'admin' ? 'ADMIN' : 'AGENTE';

  return (
    <div className="flex min-h-screen bg-[#f5f5f6] font-sans selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col">
        {/* Header Superior */}
        <div className="flex items-center justify-between mb-8 shrink-0">
          <div>
            <h1 className="text-3xl font-black text-[#134e4a] tracking-tight mb-1">Contactos</h1>
            <p className="text-sm font-medium text-slate-400">Gestiona todos tus contactos de WhatsApp importados o creados por la aplicación.</p>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="h-11 px-6 border-2 border-slate-200 rounded-2xl text-slate-600 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all flex items-center gap-2"
            >
              <Download size={16} /> Exportar contactos
            </button>
            <button 
              onClick={() => setIsImportModalOpen(true)}
              className="h-11 px-6 bg-[#5d5fef] hover:bg-[#4a4cd9] rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all flex items-center gap-2"
            >
              <Upload size={16} /> Importar contactos
            </button>
          </div>
        </div>

        {/* Filtros y Buscador */}
        <div className="mb-6 flex flex-col lg:flex-row items-center gap-4">
          <div className="relative flex-1 group">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#5d5fef] transition-colors" />
            <input 
              type="text" 
              placeholder="Buscar por contacto" 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-12 pl-12 pr-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none text-sm font-bold text-slate-700 placeholder:text-slate-300 focus:border-[#5d5fef]/20 focus:bg-white transition-all"
            />
          </div>
          <button className="h-12 px-6 flex items-center gap-2 text-slate-500 font-black text-xs uppercase tracking-widest border-2 border-slate-50 rounded-2xl hover:bg-slate-50 transition-all">
            <Filter size={16} /> Filtrar
          </button>
        </div>

        {/* Tabla de Contactos */}
        <div className="overflow-hidden flex-1 flex flex-col">
          <div className="p-6 border-b border-slate-50 flex items-center justify-between">
            <span className="text-sm font-black text-[#134e4a] uppercase tracking-widest">Total de contactos {pagination.total}</span>
            <span className="text-xs font-bold text-slate-400">0 seleccionado del total {pagination.total}</span>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-slate-50/50">
                <tr>
                  <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded-md border-slate-200 text-[#5d5fef] focus:ring-[#5d5fef]" /></th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Nombre</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Teléfono</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Correo electrónico</th>
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Tags</th>
                  {Array.from(new Set(contacts.flatMap(c => (c.fields || []).map(f => f.nombre)))).map(fieldName => (
                    <th key={fieldName} className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      {fieldName}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Creado</th>
                  <th className="px-6 py-4 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => {
                    const dynamicCols = Array.from(new Set(contacts.flatMap(c => (c.fields || []).map(f => f.nombre)))).length;
                    return (
                      <tr key={i} className="animate-pulse">
                        <td colSpan={7 + dynamicCols} className="px-6 py-4 h-16 bg-slate-50/30"></td>
                      </tr>
                    );
                  })
                ) : contacts.map((contact) => (
                  <tr key={contact.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4"><input type="checkbox" className="rounded-md border-slate-200 text-[#5d5fef]" /></td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <ContactAvatar contact={contact} size="md" />
                        <span className="text-sm font-bold text-slate-700">{contactVisibleName(contact)}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-500 text-sm">{contact.telefono || '---'}</td>
                    <td className="px-6 py-4 font-medium text-slate-500 text-sm">{contact.correo || '---'}</td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {(contact.tags || []).map(tag => (
                          <span 
                            key={tag.id} 
                            className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider text-white shadow-sm"
                            style={{ backgroundColor: tag.color }}
                          >
                            {tag.nombre}
                          </span>
                        ))}
                      </div>
                    </td>
                    {/* Columnas Dinámicas de Campos Customizados */}
                    {Array.from(new Set(contacts.flatMap(c => (c.fields || []).map(f => f.nombre)))).map(fieldName => {
                      const field = (contact.fields || []).find(f => f.nombre === fieldName);
                      return (
                        <td key={fieldName} className="px-6 py-4 font-medium text-slate-500 text-sm">
                          {field?.valor || '---'}
                        </td>
                      );
                    })}
                    <td className="px-6 py-4 font-medium text-slate-400 text-xs">{formatDate(contact.creado_en)}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEditModal(contact)} className="p-2 hover:bg-indigo-50 text-slate-400 hover:text-[#5d5fef] rounded-lg transition-all" title="Editar">
                          <FileText size={18} />
                        </button>
                        <button className="p-2 hover:bg-emerald-50 text-slate-400 hover:text-emerald-500 rounded-lg transition-all" title="Ir al chat">
                          <MessageCircle size={18} />
                        </button>
                        <button className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-500 rounded-lg transition-all" title="Eliminar">
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="p-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Mostrando {contacts.length} de {pagination.total} registros</span>
            <div className="flex items-center gap-2">
              <button 
                disabled={pagination.page <= 1}
                onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                className="w-10 h-10 flex items-center justify-center border-2 border-slate-100 rounded-xl hover:bg-white text-slate-400 disabled:opacity-30 transition-all"
              >
                <ChevronLeft size={20} />
              </button>
              <button 
                disabled={pagination.page >= pagination.total_pages}
                onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                className="w-10 h-10 flex items-center justify-center border-2 border-slate-100 rounded-xl hover:bg-white text-slate-400 disabled:opacity-30 transition-all"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          </div>
        </div>
        </div>
      </main>

      {/* --- MODAL DETALLE CONTACTO --- */}
      <Modal 
        isOpen={Boolean(selectedContact)} 
        onClose={() => setSelectedContact(null)}
        title=""
        footer={
          <>
            <button 
              onClick={() => setSelectedContact(null)}
              className="h-12 px-12 border-2 border-slate-100 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-slate-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              onClick={handleSaveContact}
              disabled={isSaving}
              className="h-12 px-14 bg-[#5d5fef] hover:bg-[#4a4cd9] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 transition-all disabled:opacity-50"
            >
              {isSaving ? 'Guardando...' : 'Guardar'}
            </button>
          </>
        }
      >
        <div className="flex flex-col items-center mb-6">
           <ContactAvatar contact={selectedContact} size="xl" />
        </div>

        <div className="flex items-center justify-between mb-8">
           <h3 className="text-2xl font-black text-slate-800 tracking-tight">{contactVisibleName(selectedContact)}</h3>
           <button className="flex items-center gap-2 px-5 py-2.5 border-2 border-slate-100 text-[#5d5fef] rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-slate-50 transition-all">
             <MessageCircle size={16} /> Ir al chat
           </button>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre*</label>
            <input 
              type="text" value={formData.nombre} 
              onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
              className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none text-sm font-bold text-slate-700 focus:border-[#5d5fef]/20 transition-all"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Teléfono*</label>
              <div className="relative">
                <input 
                  type="text" value={selectedContact?.telefono || ''} readOnly
                  className="w-full h-12 pl-4 pr-12 bg-slate-50 border-2 border-slate-50 rounded-2xl text-sm font-bold text-slate-400 outline-none"
                />
                <button className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-300 hover:text-[#5d5fef] transition-colors">
                  <Copy size={18} />
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Correo electrónico</label>
              <input 
                type="email" value={formData.correo} 
                onChange={(e) => setFormData({ ...formData, correo: e.target.value })}
                placeholder="Correo Electronico"
                className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none text-sm font-bold text-slate-700 focus:border-[#5d5fef]/20 transition-all"
              />
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black text-slate-800">Campos customizados</h4>
              <button 
                onClick={() => setIsCreatingField(!isCreatingField)}
                className="h-10 px-6 border-2 border-slate-100 rounded-2xl text-[#5d5fef] hover:bg-slate-50 transition-all flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"
              >
                {isCreatingField ? <X size={16} /> : <Plus size={16} />} 
                {isCreatingField ? 'Cerrar' : 'Añadir'}
              </button>
            </div>

            {isCreatingField && (
              <div className="mb-6 p-4 bg-indigo-50/50 rounded-[1.5rem] border border-indigo-100 space-y-3 animate-in slide-in-from-top-2 duration-300">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-indigo-400 uppercase tracking-widest ml-1">Nombre del nuevo campo</label>
                  <input 
                    type="text"
                    value={newFieldData.nombre}
                    onChange={(e) => setNewFieldData({ ...newFieldData, nombre: e.target.value })}
                    placeholder="Ej: Fecha de nacimiento"
                    className="w-full h-10 px-4 bg-white border border-indigo-100 rounded-xl outline-none text-xs font-bold text-slate-600 focus:border-[#5d5fef]/20 transition-all"
                  />
                </div>
                <div className="flex gap-2">
                  <select 
                    value={newFieldData.tipo}
                    onChange={(e) => setNewFieldData({ ...newFieldData, tipo: e.target.value })}
                    className="flex-1 h-10 px-4 bg-white border border-indigo-100 rounded-xl outline-none text-xs font-bold text-slate-600"
                  >
                    <option value="texto">Texto</option>
                    <option value="numero">Número</option>
                    <option value="fecha">Fecha</option>
                  </select>
                  <button 
                    onClick={handleCreateField}
                    className="h-10 px-6 bg-[#5d5fef] text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-md shadow-indigo-100"
                  >
                    Crear campo
                  </button>
                </div>
              </div>
            )}

            <div className="space-y-3">
              {contactFields.map(field => (
                <div key={field.id} className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{field.nombre}</label>
                  <input 
                    type="text" 
                    defaultValue={field.valor || ''}
                    onBlur={(e) => handleUpdateField(field.id, e.target.value)}
                    placeholder={`Escribir ${field.nombre}`}
                    className="w-full h-11 px-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none text-xs font-bold text-slate-600 focus:border-[#5d5fef]/20 transition-all"
                  />
                </div>
              ))}
              {contactFields.length === 0 && !isCreatingField && (
                <p className="text-xs text-indigo-300 font-medium italic">Este contacto no tiene campos personalizados configurados.</p>
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-slate-50">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-black text-slate-800">Tags</h4>
              <button 
                onClick={() => setIsCreatingTag(!isCreatingTag)}
                className="text-[10px] font-black text-[#5d5fef] uppercase tracking-widest hover:underline"
              >
                {isCreatingTag ? 'Ver lista' : '+ Crear nuevo tag'}
              </button>
            </div>
            
            <div className="flex flex-wrap gap-2 mb-4">
              {contactTags.map(tag => (
                <div key={tag.id} className="flex items-center gap-1.5 px-3 py-1 bg-indigo-50 border border-indigo-100 rounded-full group transition-all">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.color }} />
                  <span className="text-[10px] font-black text-[#5d5fef] uppercase tracking-wider">{tag.nombre}</span>
                  <button onClick={() => handleRemoveTag(tag.id)} className="text-indigo-300 hover:text-rose-500 transition-colors">
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
                    className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none text-sm font-bold text-slate-700 focus:border-[#5d5fef]/20 transition-all"
                    onKeyDown={(e) => e.key === 'Enter' && handleCreateTag()}
                  />
                ) : (
                  <>
                    <select 
                      value={selectedTagToAdd}
                      onChange={(e) => setSelectedTagToAdd(e.target.value)}
                      className="w-full h-12 px-4 bg-slate-50 border-2 border-slate-50 rounded-2xl outline-none text-sm font-bold text-slate-400 appearance-none cursor-pointer focus:border-[#5d5fef]/20 transition-all"
                    >
                      <option value="">Seleccion de tags</option>
                      {allTags.filter(t => !contactTags.find(ct => ct.id === t.id)).map(tag => (
                        <option key={tag.id} value={tag.id}>{tag.nombre}</option>
                      ))}
                    </select>
                    <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none" />
                  </>
                )}
              </div>
              <button 
                onClick={isCreatingTag ? handleCreateTag : handleAddTag}
                className="h-12 w-12 flex items-center justify-center bg-[#5d5fef] hover:bg-[#4a4cd9] text-white rounded-2xl shadow-lg shadow-indigo-100 transition-all active:scale-95"
              >
                {isCreatingTag ? <Check size={20} /> : <Plus size={20} />}
              </button>
            </div>
            {contactTags.length === 0 && !selectedTagToAdd && !isCreatingTag && (
              <p className="mt-4 text-xs text-indigo-300 font-medium italic">No hay tags asignadas a este contacto</p>
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
            <button onClick={() => setIsExportModalOpen(false)} className="h-12 px-8 border-2 border-slate-100 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-white transition-all">Cancelar</button>
            <button className="h-12 px-10 bg-slate-300 text-white rounded-2xl font-black text-xs uppercase tracking-widest cursor-not-allowed">Exportar contactos</button>
          </>
        }
      >
        <p className="text-sm text-slate-400 mb-6 leading-relaxed">Puedes exportar toda tu base de contactos y, además, aplicar filtros por columnas o por los criterios que hayas filtrado previamente.</p>
        <p className="text-[10px] font-black text-[#134e4a] uppercase tracking-widest mb-4">Selecciona los campos específicos que deseas incluir en el reporte de tus contactos:</p>
        <div className="space-y-3">
          {['Nombre', 'Correo electrónico', 'Número de teléfono', 'Fecha de creación', 'Tags', 'Código de país', 'Campos customizados'].map((field) => (
            <label key={field} className="flex items-center gap-3 p-1 hover:bg-slate-50 rounded-lg cursor-pointer transition-colors group">
              <input type="checkbox" className="w-5 h-5 rounded border-slate-200 text-[#5d5fef] focus:ring-[#5d5fef]" />
              <span className="text-sm font-bold text-slate-600 group-hover:text-slate-800 transition-colors">{field}</span>
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
              className="h-12 px-8 border-2 border-slate-100 rounded-2xl text-slate-500 font-black text-xs uppercase tracking-widest hover:bg-white hover:border-slate-200 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button 
              type="button"
              disabled={isUploading || !importDeviceId || !selectedFile}
              onClick={handleImportSubmit}
              className={`h-12 px-10 rounded-2xl font-black text-xs uppercase tracking-widest transition-all flex items-center gap-2 ${
                (isUploading || !importDeviceId || !selectedFile)
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'bg-[#5d5fef] hover:bg-[#4b4cbf] text-white shadow-sm hover:shadow-md'
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
              className="text-[#5d5fef] font-black cursor-pointer underline decoration-2 underline-offset-4 hover:text-[#4b4cbf] transition-colors"
            >
              plantilla
            </button>{' '}
            de ejemplo para completar correctamente el documento.
          </p>

          {/* Selector de Dispositivo/Terminal */}
          <div className="text-left">
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
              Terminal WhatsApp de destino (Obligatorio)
            </label>
            <select
              value={importDeviceId}
              onChange={(e) => setImportDeviceId(e.target.value)}
              className="w-full h-11 px-4 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-[#5d5fef] focus:bg-white focus:ring-1 focus:ring-[#5d5fef] transition-all cursor-pointer"
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
            <label className="block text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1.5">
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
                        ? 'bg-indigo-50 border-[#5d5fef] text-[#5d5fef] shadow-xs'
                        : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
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
                ? 'bg-emerald-50/20 border-emerald-300'
                : 'bg-indigo-50/20 border-indigo-200 hover:border-[#5d5fef]'
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
            <div className={`w-12 h-12 rounded-2xl shadow-sm flex items-center justify-center mb-3 group-hover:scale-105 transition-transform ${
              selectedFile ? 'bg-white text-emerald-600 border border-emerald-100' : 'bg-white text-[#5d5fef]'
            }`}>
              <Upload size={24} />
            </div>
            {selectedFile ? (
              <>
                <span className="text-xs font-black text-slate-700 uppercase tracking-widest mb-0.5 truncate max-w-[240px]">
                  {selectedFile.name}
                </span>
                <span className="text-[9px] font-bold text-emerald-600 uppercase tracking-widest">
                  Archivo cargado ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </>
            ) : (
              <>
                <span className="text-xs font-black text-[#5d5fef] uppercase tracking-widest mb-0.5">
                  Seleccionar archivo .csv
                </span>
                <span className="text-[9px] font-medium text-slate-400 uppercase tracking-widest">
                  Haz clic para examinar tus archivos
                </span>
              </>
            )}
          </div>

          {/* Alertas de Éxito / Error */}
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

    </div>
  );
}
