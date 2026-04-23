// frontend/src/components/Contactos.jsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  RefreshCw,
  Save,
  Search,
  Smartphone,
  User,
  Bell,
  BarChart3,
  Filter,
  MessageCircle,
  Building,
  AtSign
} from 'lucide-react';
import Sidebar from './Sidebar';

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

const leadBadgeClasses = {
  nuevo: 'bg-slate-100 text-slate-600 border-slate-200',
  interesado: 'bg-indigo-50 text-[#5d5fef] border-indigo-100',
  en_negociacion: 'bg-amber-50 text-amber-600 border-amber-100',
  cerrado: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  perdido: 'bg-rose-50 text-rose-600 border-rose-100',
};

const leadLabels = {
  nuevo: 'Nuevo',
  interesado: 'Interesado',
  en_negociacion: 'Negociando',
  cerrado: 'Cerrado',
  perdido: 'Perdido',
};

const avatarColors = [
  'bg-indigo-600',
  'bg-emerald-600',
  'bg-sky-600',
  'bg-rose-600',
  'bg-amber-500',
  'bg-violet-600',
  'bg-teal-600',
  'bg-slate-700',
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

function leadLabel(value) {
  return leadStates.find((state) => state.value === value)?.label || value || 'Nuevo';
}

function contactVisibleName(contact) {
  return contact?.display_name || contact?.telefono || 'Contacto de WhatsApp';
}

function avatarText(contact) {
  const value = contactVisibleName(contact).trim();
  const words = value.split(/\s+/).filter(Boolean);

  if (words.length === 1) {
    return words[0].slice(0, 2).toUpperCase();
  }

  return `${words[0].charAt(0)}${words[1].charAt(0)}`.toUpperCase();
}

function avatarColor(contact) {
  const source = `${contact.id || ''}${contact.jid || ''}${contactVisibleName(contact)}`;
  const index = Array.from(source).reduce((total, char) => total + char.charCodeAt(0), 0) % avatarColors.length;
  return avatarColors[index];
}

const ContactAvatar = React.memo(function ContactAvatar({ contact, size = 'md' }) {
  const imageUrl = mediaUrl(contact?.foto_perfil);
  const [imageFailed, setImageFailed] = useState(() => Boolean(imageUrl && failedContactAvatarUrls.has(imageUrl)));
  const [imageLoaded, setImageLoaded] = useState(() => Boolean(imageUrl && loadedContactAvatarUrls.has(imageUrl)));
  const displayName = contactVisibleName(contact);
  const sizeClass = size === 'lg' ? 'w-20 h-20 text-xl' : 'w-14 h-14 text-[15px]';

  useEffect(() => {
    setImageFailed(Boolean(imageUrl && failedContactAvatarUrls.has(imageUrl)));
    setImageLoaded(Boolean(imageUrl && loadedContactAvatarUrls.has(imageUrl)));
  }, [imageUrl]);

  const initials = avatarText(contact);
  const bgColor = avatarColor(contact);

  return (
    <div className={`relative group/avatar ${sizeClass}`}>
        <div className={`absolute -inset-1 bg-gradient-to-tr from-indigo-500/30 to-purple-500/30 rounded-full blur-md opacity-0 group-hover/avatar:opacity-100 transition-opacity`}></div>
        <div className={`relative ${sizeClass} rounded-full ${bgColor} border-2 border-white/10 flex items-center justify-center font-black text-white shadow-2xl overflow-hidden geopulse-glass`}>
          {imageUrl && !imageFailed ? (
            <>
               {!imageLoaded && initials}
               <img
                 src={imageUrl}
                 alt={displayName}
                 onLoad={() => {
                   loadedContactAvatarUrls.add(imageUrl);
                   setImageLoaded(true);
                 }}
                 onError={() => {
                   failedContactAvatarUrls.add(imageUrl);
                   setImageFailed(true);
                 }}
                 className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
               />
            </>
          ) : initials}
        </div>
        <div className="absolute bottom-0 right-0 w-4 h-4 bg-emerald-500 border-2 border-[#0a0b10] rounded-full shadow-[0_0_10px_#10b981]"></div>
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.size === nextProps.size
  && prevProps.contact?.id === nextProps.contact?.id
));

export default function Contactos({ user, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estado, setEstado] = useState('todos');
  const [selectedContact, setSelectedContact] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    empresa: '',
    estado_lead: 'nuevo',
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
    }, 500);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    loadContacts();
  }, [debouncedSearch, estado, pagination.page]);

  const loadContacts = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        search: debouncedSearch,
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

  const selectContact = (contact) => {
    setSelectedContact(contact);
    setFormData({
      nombre: contact.nombre || '',
      correo: contact.correo || '',
      empresa: contact.empresa || '',
      estado_lead: contact.estado_lead || 'nuevo',
    });
    setError(null);
    setSuccess(null);
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const saveContact = async (e) => {
    e.preventDefault();
    if (!selectedContact) return;
    setIsSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`${API_URL}/api/contacts/${user.id}/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (!res.ok) throw new Error('Error al actualizar contacto');
      setSuccess('Contacto actualizado exitosamente');
      loadContacts();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const goToPage = (page) => {
    setPagination((current) => ({ ...current, page }));
  };

  const roleLabel = user?.rol === 'admin' ? 'ADMIN' : 'AGENTE';

  return (
    <div className="flex min-h-screen bg-[#0a0b10] font-sans text-slate-100 selection:bg-indigo-500/30">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0 h-[calc(100vh-32px)] overflow-hidden">
        <header className="h-[72px] geopulse-glass rounded-3xl text-white flex items-center justify-between px-8 z-50 mb-6 shadow-indigo-500/5 shrink-0">
          <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-white/10 shrink-0">
                  <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
                  <span className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] ml-0.5 mt-1">Directorio de Contactos</span>
              </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={loadContacts}
              className="text-white/70 hover:text-white transition-colors"
            >
              <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
            </button>
            <Bell size={18} className="opacity-70 cursor-pointer hover:opacity-100" />
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-white text-xs uppercase">
                {user?.nombre?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs leading-none mb-0.5">
                  {user?.nombre || 'Usuario'}
                </span>
                <span className="text-[10px] opacity-50 font-medium uppercase">{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar pr-2 pb-10">
          {/* --- ATMOSFERA VISUAL --- */}
          <div className="fixed inset-0 pointer-events-none overflow-hidden">
            <div className="absolute top-[-5%] left-[20%] w-[35%] h-[35%] bg-indigo-600/10 blur-[120px] rounded-full rotate-12"></div>
            <div className="absolute bottom-[-10%] left-[-5%] w-[40%] h-[40%] bg-purple-600/10 blur-[120px] rounded-full -rotate-12"></div>
          </div>

          <section className="relative mb-8 animate-in fade-in slide-in-from-top-4 duration-700">
             <div className="geopulse-glass border-white/5 p-8 rounded-[3.5rem] geopulse-shimmer overflow-hidden flex flex-col lg:flex-row items-center justify-between gap-12">
                <div className="max-w-md">
                   <h1 className="text-3xl md:text-4xl font-black text-white tracking-tighter leading-none mb-4">
                      Directorio de <span className="geopulse-text-gradient">contactos</span>
                   </h1>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] leading-relaxed">
                      Gestiona y clasifica tus <span className="text-indigo-400">{formatNumber(pagination.total)}</span> contactos registrados.
                   </p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto">
                   <div className="relative group/search flex-1 lg:w-80">
                      <Search size={20} className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/search:text-indigo-400 transition-colors" />
                      <input
                        type="text"
                        placeholder="Buscar por nombre, teléfono o empresa..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-16 pr-8 h-14 bg-white/[0.03] border border-white/5 rounded-3xl outline-none text-white font-bold placeholder:text-slate-600 focus:border-indigo-500/30 focus:bg-white/[0.05] transition-all"
                      />
                   </div>
                   <div className="flex gap-4">
                      <select
                        value={estado}
                        onChange={(event) => {
                          setEstado(event.target.value);
                          setPagination((current) => ({ ...current, page: 1 }));
                        }}
                        className="px-6 h-14 bg-white/[0.03] border border-white/5 rounded-3xl outline-none text-slate-300 font-bold appearance-none cursor-pointer hover:bg-white/5 transition-all text-[12px] uppercase tracking-widest min-w-[160px]"
                      >
                        {leadStates.map((state) => (
                          <option key={state.value} value={state.value} className="bg-[#12131a]">{state.label}</option>
                        ))}
                      </select>
                      <button className="h-14 shadow-2xl shadow-indigo-500/20 px-6 bg-indigo-600 rounded-3xl text-white font-black uppercase tracking-widest text-[10px] hover:bg-indigo-500 transition-all flex items-center gap-3 active:scale-95">
                         <Filter size={18} /> Filtrar
                      </button>
                   </div>
                </div>
             </div>
          </section>

          {(error || success) && (
            <div className={`relative mb-8 rounded-[2rem] p-6 flex items-center gap-4 text-sm font-black uppercase tracking-widest border animate-in slide-in-from-left-4 duration-500 ${
              error ? 'geopulse-glass border-red-500/20 text-red-400' : 'geopulse-glass border-emerald-500/20 text-emerald-400'
            }`}>
              <AlertCircle size={24} />
              {error || success}
            </div>
          )}

          <div className="relative grid grid-cols-1 xl:grid-cols-[1fr_400px] gap-10 items-start max-w-[1800px] mx-auto w-full">
            <div className="space-y-6">
              {isLoading ? (
                <div className="py-24 geopulse-glass rounded-[3rem] flex flex-col items-center gap-6 text-slate-600 border-white/5">
                  <div className="w-14 h-14 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin"></div>
                  <p className="font-black tracking-[0.5em] text-[10px] uppercase opacity-50">Sincronizando Base de Datos...</p>
                </div>
              ) : contacts.length > 0 ? (
                <div className="grid grid-cols-1 gap-4">
                  {contacts.map((contact) => (
                    <div 
                      key={contact.id}
                      onClick={() => selectContact(contact)}
                      className={`geopulse-glass p-5 rounded-[2rem] flex flex-col md:flex-row items-center justify-between cursor-pointer group transition-all duration-500 border-white/5 ${selectedContact?.id === contact.id ? 'geopulse-glow-indigo border-indigo-500/40 bg-white/[0.05]' : 'hover:bg-white/[0.02] hover:border-white/10'}`}
                    >
                        <div className="flex items-center gap-6 w-full md:w-auto">
                            <ContactAvatar contact={contact} size="md" />
                            <div className="min-w-0">
                                <h3 className={`text-base font-black tracking-tight transition-colors truncate ${selectedContact?.id === contact.id ? 'text-indigo-400' : 'text-slate-100 group-hover:text-white'}`}>
                                   {contactVisibleName(contact)}
                                </h3>
                                <div className="flex items-center gap-4 mt-1">
                                    <span className="text-[11px] text-slate-500 font-black tracking-widest flex items-center gap-2 uppercase">
                                        <Phone size={12} className="text-indigo-500/50" />
                                        {contact.telefono || 'Sin número'}
                                    </span>
                                    {contact.empresa && (
                                        <span className="text-[9px] bg-white/5 border border-white/5 px-3 py-0.5 rounded-full text-slate-400 font-black uppercase tracking-[0.2em]">
                                            {contact.empresa}
                                        </span>
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-8 mt-5 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-white/5 pt-3 md:pt-0">
                            <div className="text-right">
                                <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-1">Categoría Lead</p>
                                <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-[0.2em] ${leadBadgeClasses[contact.estado_lead] || leadBadgeClasses.nuevo} bg-opacity-10`}>
                                    {leadLabels[contact.estado_lead] || 'Nuevo'}
                                </span>
                            </div>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all border ${selectedContact?.id === contact.id ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg shadow-indigo-500/30' : 'bg-white/5 text-slate-600 border-white/5'}`}>
                                <ChevronRight size={20} className={selectedContact?.id === contact.id ? 'translate-x-0.5' : 'group-hover:translate-x-0.5 transition-transform'} />
                            </div>
                        </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="geopulse-glass border-dashed border-white/10 rounded-[3rem] p-24 flex flex-col items-center text-center opacity-30">
                  <User size={54} className="text-slate-700 mb-6" />
                  <p className="font-black text-[11px] uppercase tracking-[0.5em]">Sin coincidencias en el sistema</p>
                </div>
              )}

              {/* PAGINATION */}
              <div className="flex items-center justify-between px-8 py-6 geopulse-glass rounded-[2rem] border-white/5 mt-8">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em]">
                  Frecuencia {pagination.page} de {pagination.total_pages || 1}
                </p>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="w-12 h-12 geopulse-glass flex items-center justify-center rounded-2xl disabled:opacity-20 hover:bg-white/10 transition-all border-white/5 shadow-xl active:scale-90"
                  >
                    <ChevronLeft size={20} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= (pagination.total_pages || 1)}
                    className="w-12 h-12 geopulse-glass flex items-center justify-center rounded-2xl disabled:opacity-20 hover:bg-white/10 transition-all border-white/5 shadow-xl active:scale-90"
                  >
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            </div>

            {/* DETAIL ASIDE */}
            <aside className="geopulse-glass rounded-[3rem] p-0 overflow-hidden border-white/5 shadow-2xl geopulse-glow-indigo min-h-[650px] animate-in zoom-in-95 duration-500">
              {selectedContact ? (
                <form onSubmit={saveContact} className="flex flex-col h-full">
                  <div className="p-8 bg-white/[0.02] flex flex-col items-center text-center border-b border-white/5 relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-cyan-500"></div>
                    <ContactAvatar contact={selectedContact} size="lg" />
                    <div className="mt-6">
                       <h3 className="text-xl font-black text-white tracking-tighter mb-1">{contactVisibleName(selectedContact)}</h3>
                       <div className="flex items-center justify-center gap-2 text-indigo-400">
                          <MessageCircle size={14} />
                          <span className="text-[9px] font-black tracking-[0.3em] uppercase">Estatus de Enlace Activo</span>
                       </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 gap-5">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre Maestro</label>
                        <div className="relative group/input">
                          <User size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-indigo-400 transition-colors" />
                          <input
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className="w-full pl-14 pr-6 h-14 rounded-2xl bg-white/[0.03] border border-white/5 text-[14px] font-bold text-white outline-none transition-all focus:border-indigo-500/30 focus:bg-white/[0.05]"
                            placeholder="Ej: Terminal Ariel"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Canal de Comunicación</label>
                        <div className="relative group/input">
                          <AtSign size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-indigo-400 transition-colors" />
                          <input
                            type="email"
                            name="correo"
                            value={formData.correo}
                            onChange={handleChange}
                            className="w-full pl-14 pr-6 h-14 rounded-2xl bg-white/[0.03] border border-white/5 text-[14px] font-bold text-white outline-none transition-all focus:border-indigo-500/30 focus:bg-white/[0.05]"
                            placeholder="correo@terminal.com"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Sede / Organización</label>
                        <div className="relative group/input">
                          <Building size={16} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-600 group-focus-within/input:text-indigo-400 transition-colors" />
                          <input
                            name="empresa"
                            value={formData.empresa}
                            onChange={handleChange}
                            className="w-full pl-14 pr-6 h-14 rounded-2xl bg-white/[0.03] border border-white/5 text-[14px] font-bold text-white outline-none transition-all focus:border-indigo-500/30 focus:bg-white/[0.05]"
                            placeholder="Nombre de la Institución"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Prioridad del Objetivo</label>
                        <div className="relative">
                            <select
                                name="estado_lead"
                                value={formData.estado_lead}
                                onChange={handleChange}
                                className="w-full px-5 h-14 rounded-2xl bg-white/[0.03] border border-white/5 text-[14px] font-black text-slate-300 outline-none transition-all focus:border-indigo-500/30 focus:bg-white/[0.05] appearance-none cursor-pointer"
                            >
                                {leadStates.filter((state) => state.value !== 'todos').map((state) => (
                                    <option key={state.value} value={state.value} className="bg-[#12131a]">{state.label}</option>
                                ))}
                            </select>
                            <div className="absolute right-5 top-1/2 -translate-y-1/2 pointer-events-none text-slate-600">
                                <ChevronRight size={16} className="rotate-90" />
                            </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-white/[0.02] border border-white/5 rounded-2xl p-6 geopulse-shimmer overflow-hidden">
                      <p className="text-[9px] font-black text-slate-500 uppercase tracking-[0.4em] mb-3">Última Transmisión</p>
                      <p className="text-xs text-slate-400 leading-relaxed font-medium italic line-clamp-2">
                        "{selectedContact.ultimo_mensaje || 'Frecuencia en espera de datos...'}"
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full h-14 rounded-2xl bg-indigo-600 text-white font-black text-[10px] uppercase tracking-[0.3em] hover:bg-indigo-500 transition-all shadow-2xl shadow-indigo-500/20 flex items-center justify-center gap-3 disabled:opacity-70 active:scale-95 group"
                    >
                      <Save size={18} className="group-hover:rotate-12 transition-transform" />
                      {isSaving ? 'Actualizando Nodo...' : 'Sincronizar Perfil'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                  <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center text-slate-800 border-2 border-dashed border-white/10 mb-6 animate-pulse">
                    <User size={40} />
                  </div>
                  <h3 className="text-lg font-black text-white tracking-tighter mb-4 uppercase">Consola de Perfil</h3>
                  <p className="text-[10px] text-slate-500 font-bold leading-relaxed uppercase tracking-widest opacity-60">
                    Selecciona un contacto del registro maestro para inicializar el análisis de datos.
                  </p>
                </div>
              )}
            </aside>
          </div>
        </div>
      </main>
    </div>
  );
}
