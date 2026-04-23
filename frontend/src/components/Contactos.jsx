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
  const sizeClass = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-12 h-12 text-[15px]';

  useEffect(() => {
    setImageFailed(Boolean(imageUrl && failedContactAvatarUrls.has(imageUrl)));
    setImageLoaded(Boolean(imageUrl && loadedContactAvatarUrls.has(imageUrl)));
  }, [imageUrl]);

  if (imageUrl && !imageFailed) {
    return (
      <div className={`${sizeClass} rounded-full ${avatarColor(contact)} text-white flex items-center justify-center font-black shadow-sm shrink-0 overflow-hidden relative border border-slate-200`}>
        {!imageLoaded && avatarText(contact)}
        <img
          src={imageUrl}
          alt={displayName}
          onLoad={() => {
            loadedContactAvatarUrls.add(imageUrl);
            failedContactAvatarUrls.delete(imageUrl);
            setImageLoaded(true);
          }}
          onError={() => {
            failedContactAvatarUrls.add(imageUrl);
            setImageFailed(true);
          }}
          className={`absolute inset-0 ${sizeClass} rounded-full object-cover transition-opacity duration-200 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
        />
      </div>
    );
  }

  return (
    <div className={`${sizeClass} rounded-full ${avatarColor(contact)} text-white flex items-center justify-center font-black shadow-sm shrink-0`}>
      {avatarText(contact)}
    </div>
  );
}, (prevProps, nextProps) => (
  prevProps.size === nextProps.size
  && prevProps.contact?.id === nextProps.contact?.id
  && prevProps.contact?.jid === nextProps.contact?.jid
  && prevProps.contact?.foto_perfil === nextProps.contact?.foto_perfil
  && contactVisibleName(prevProps.contact) === contactVisibleName(nextProps.contact)
));

function ContactRow({ contact, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left grid grid-cols-[80px_minmax(250px,1fr)_140px_160px] gap-4 items-center px-6 py-5 border-b border-slate-100 transition-all ${
        isSelected ? 'bg-indigo-50/50 border-l-4 border-l-[#5d5fef]' : 'hover:bg-slate-50 border-l-4 border-l-transparent'
      }`}
    >
      <ContactAvatar contact={contact} />

      <div className="flex flex-col min-w-0">
        <p className="font-black text-slate-800 text-[15px] truncate leading-tight mb-1">{contactVisibleName(contact)}</p>
        <div className="flex items-center gap-2 text-slate-400">
           <Phone size={12} className="shrink-0" />
           <span className="text-[12px] font-bold">{contact.telefono || 'Sin número'}</span>
        </div>
      </div>

      <div className="flex flex-col items-start translate-y-[-2px]">
        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[10px] font-black uppercase tracking-wider ${leadBadgeClasses[contact.estado_lead] || leadBadgeClasses.nuevo}`}>
          {leadLabel(contact.estado_lead)}
        </span>
      </div>

      <div className="text-[12px] text-slate-400 flex flex-col items-end">
        <p className="font-black text-slate-500 uppercase tracking-tighter text-[10px] mb-1">{contact.dispositivo_nombre || 'WhatsApp'}</p>
        <p className="font-bold opacity-70 italic">{formatDate(contact.actualizado_en)}</p>
      </div>
    </button>
  );
}

export default function Contactos({ user, onLogout }) {
  const [contacts, setContacts] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, total_pages: 1 });
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [estado, setEstado] = useState('todos');
  const [selectedContact, setSelectedContact] = useState(null);
  const [formData, setFormData] = useState({ nombre: '', correo: '', empresa: '', estado_lead: 'nuevo' });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPagination((current) => ({ ...current, page: 1 }));
    }, 300);

    return () => clearTimeout(timeout);
  }, [search]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams({
      page: String(pagination.page),
      limit: String(pagination.limit),
    });

    if (debouncedSearch) params.set('q', debouncedSearch);
    if (estado !== 'todos') params.set('estado', estado);

    return params.toString();
  }, [debouncedSearch, estado, pagination.page, pagination.limit]);

  const loadContacts = async ({ silent = false } = {}) => {
    if (!user?.id) {
      setError('No se encontro el usuario activo.');
      if (!silent) setIsLoading(false);
      return;
    }

    if (!silent) {
      setIsLoading(true);
      setError('');
    }

    try {
      const response = await fetch(`${API_URL}/api/contacts/${user.id}?${queryParams}`);
      const data = await response.json();

      if (!data.success) {
        if (!silent) setError(data.message || 'No se pudieron cargar los contactos.');
        return;
      }

      setContacts(data.contacts || []);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, total_pages: 1 });
      setSelectedContact((current) => {
        if (!current) return null;
        return (data.contacts || []).find((contact) => contact.id === current.id) || null;
      });
    } catch {
      if (!silent) setError('Error de conexion al cargar contactos.');
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, [queryParams, user?.id]);

  useEffect(() => {
    if (!user?.id) {
      return undefined;
    }

    const interval = setInterval(() => {
      loadContacts({ silent: true });
    }, 6000);

    return () => clearInterval(interval);
  }, [queryParams, user?.id]);

  const selectContact = (contact) => {
    setSelectedContact(contact);
    setSuccess('');
    setError('');
    setFormData({
      nombre: contact.nombre || '',
      correo: contact.correo || '',
      empresa: contact.empresa || '',
      estado_lead: contact.estado_lead || 'nuevo',
    });
  };

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const saveContact = async (event) => {
    event.preventDefault();
    if (!selectedContact || !user?.id) return;

    setIsSaving(true);
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${API_URL}/api/contacts/${user.id}/${selectedContact.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'No se pudo guardar el contacto.');
        return;
      }

      setContacts((current) => current.map((contact) => (contact.id === data.contact.id ? data.contact : contact)));
      setSelectedContact(data.contact);
      setFormData({
        nombre: data.contact.nombre || '',
        correo: data.contact.correo || '',
        empresa: data.contact.empresa || '',
        estado_lead: data.contact.estado_lead || 'nuevo',
      });
      setSuccess('Contacto actualizado correctamente.');
    } catch {
      setError('Error de conexion al guardar el contacto.');
    } finally {
      setIsSaving(false);
    }
  };

  const goToPage = (nextPage) => {
    setPagination((current) => ({
      ...current,
      page: Math.min(Math.max(nextPage, 1), current.total_pages || 1),
    }));
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fd] font-sans">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-20 lg:ml-24">
        <header className="h-[72px] bg-[#1e1e2d] text-white flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm shrink-0">
          <div className="flex items-center gap-4">
              <div className="bg-white/95 rounded-full p-2 w-11 h-11 flex items-center justify-center shadow-lg shadow-black/30 shrink-0">
                  <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[20px] font-black tracking-tight uppercase leading-none text-white/95">GeoCHAT</span>
              </div>
          </div>

          <div className="flex items-center gap-6">
              <div className="hidden lg:flex items-center gap-2 text-[14px] font-bold text-white/80">
                  <BarChart3 size={18} />
                  GEOCHAT Academy
              </div>
              <Bell size={22} className="text-white/80" />
              <button
                  type="button"
                  onClick={() => loadContacts()}
                  className="h-10 w-10 rounded-full flex items-center justify-center text-white/75 hover:bg-white/10 hover:text-white transition-colors"
                  title="Actualizar"
              >
                  <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
              </button>
              <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-full bg-[#5d5fef] flex items-center justify-center text-sm font-black text-white">
                      {user?.nombre?.charAt(0) || 'W'}
                  </div>
                  <div className="hidden sm:block max-w-[140px]">
                      <p className="truncate text-[14px] font-bold text-white leading-tight">{user?.nombre || 'Wendy'}</p>
                      <p className="text-[11px] text-white/45 font-medium">{user?.rol || 'admin'}</p>
                  </div>
              </div>
          </div>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <section className="flex flex-col xl:flex-row xl:items-start justify-between gap-4 border-b border-slate-200 pb-8">
            <div>
              <h2 className="text-3xl font-black text-slate-800 tracking-tight">Directorio de contactos</h2>
              <p className="text-[15px] text-slate-400 font-medium mt-1">
                Gestiona y clasifica tus <span className="text-[#5d5fef] font-black">{formatNumber(pagination.total)}</span> contactos registrados.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-4 w-full xl:w-auto">
              <div className="relative flex-1 xl:w-[420px]">
                <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, teléfono o empresa..."
                  className="w-full pl-12 pr-4 h-12 bg-white border border-slate-200 rounded-xl focus:border-[#5d5fef] focus:ring-4 focus:ring-indigo-50 outline-none text-[15px] font-medium transition-all shadow-sm shadow-slate-100/50"
                />
              </div>

              <div className="flex gap-3">
                <select
                  value={estado}
                  onChange={(event) => {
                    setEstado(event.target.value);
                    setPagination((current) => ({ ...current, page: 1 }));
                  }}
                  className="px-4 h-12 bg-white border border-slate-200 rounded-xl focus:border-[#5d5fef] focus:ring-4 focus:ring-indigo-50 outline-none text-[14px] font-black text-slate-600 transition-all shadow-sm"
                >
                  {leadStates.map((state) => (
                    <option key={state.value} value={state.value}>{state.label}</option>
                  ))}
                </select>
                <button className="inline-flex h-12 items-center gap-2 rounded-xl bg-slate-50 px-5 text-[15px] font-black text-slate-800 hover:bg-slate-100 transition-colors">
                    <Filter size={18} /> Filtrar
                </button>
              </div>
            </div>
          </section>

          {(error || success) && (
            <div className={`rounded-2xl p-4 flex items-center gap-3 text-sm font-semibold border ${
              error ? 'bg-red-50 border-red-100 text-red-600' : 'bg-green-50 border-green-100 text-green-700'
            }`}>
              <AlertCircle size={18} />
              {error || success}
            </div>
          )}

          <section className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
              <div className="hidden lg:grid grid-cols-[80px_minmax(250px,1fr)_140px_160px] gap-4 px-6 py-4 bg-slate-50/50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Avatar</span>
                <span>Nombre y Teléfono</span>
                <span>Estado actual</span>
                <span className="text-right">Última actividad</span>
              </div>

              {isLoading ? (
                <div className="p-10 text-center text-slate-400 font-bold">Cargando contactos...</div>
              ) : contacts.length > 0 ? (
                <div className="max-h-[650px] overflow-auto">
                  {contacts.map((contact) => (
                    <ContactRow
                      key={contact.id}
                      contact={contact}
                      isSelected={selectedContact?.id === contact.id}
                      onClick={() => selectContact(contact)}
                    />
                  ))}
                </div>
              ) : (
                <div className="p-10 text-center">
                  <User size={42} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-slate-700 font-bold">No hay contactos para mostrar</p>
                  <p className="text-sm text-slate-400 mt-1">Prueba limpiando la busqueda o cambiando el filtro.</p>
                </div>
              )}

              <div className="flex items-center justify-between px-5 py-4 border-t border-slate-100 bg-white">
                <p className="text-xs font-bold text-slate-400">
                  Pagina {pagination.page} de {pagination.total_pages || 1}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronLeft size={18} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= (pagination.total_pages || 1)}
                    className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center disabled:opacity-40 hover:bg-slate-50"
                  >
                    <ChevronRight size={18} />
                  </button>
                </div>
              </div>
            </div>

            <aside className="bg-white rounded-2xl border border-slate-100 shadow-xl shadow-slate-200/40 p-0 overflow-hidden sticky top-24 transform transition-all">
              {selectedContact ? (
                <form onSubmit={saveContact} className="flex flex-col h-full">
                  <div className="p-8 bg-slate-50/50 flex flex-col items-center text-center border-b border-slate-100">
                    <ContactAvatar contact={selectedContact} size="lg" />
                    <div className="mt-4 min-w-0">
                      <h3 className="text-[20px] font-black text-slate-800 leading-tight truncate">{contactVisibleName(selectedContact)}</h3>
                      <div className="flex items-center justify-center gap-2 mt-1 text-[#5d5fef]">
                         <MessageCircle size={14} />
                         <span className="text-xs font-black tracking-widest uppercase">Chat Activo</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-8 space-y-6">
                    <div className="grid grid-cols-1 gap-5">
                      <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Nombre Completo</label>
                        <div className="relative">
                          <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            name="nombre"
                            value={formData.nombre}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 h-12 rounded-xl border border-slate-200 bg-white text-[14px] font-bold outline-none transition-all focus:border-[#5d5fef] focus:ring-4 focus:ring-indigo-50"
                            placeholder="Ej: Juan Pérez"
                          />
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Correo Electrónico</label>
                        <div className="relative">
                          <AtSign size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            type="email"
                            name="correo"
                            value={formData.correo}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 h-12 rounded-xl border border-slate-200 bg-white text-[14px] font-bold outline-none transition-all focus:border-[#5d5fef] focus:ring-4 focus:ring-indigo-50"
                            placeholder="correo@ejemplo.com"
                          />
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Empresa / Origen</label>
                        <div className="relative">
                          <Building size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                          <input
                            name="empresa"
                            value={formData.empresa}
                            onChange={handleChange}
                            className="w-full pl-11 pr-4 h-12 rounded-xl border border-slate-200 bg-white text-[14px] font-bold outline-none transition-all focus:border-[#5d5fef] focus:ring-4 focus:ring-indigo-50"
                            placeholder="Nombre de la empresa"
                          />
                        </div>
                      </div>

                      <div className="relative">
                        <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 ml-1">Fase del Embudo (Lead)</label>
                        <select
                          name="estado_lead"
                          value={formData.estado_lead}
                          onChange={handleChange}
                          className="w-full px-4 h-12 rounded-xl border border-slate-200 bg-white text-[14px] font-black text-slate-600 outline-none transition-all focus:border-[#5d5fef] focus:ring-4 focus:ring-indigo-50 appearance-none"
                        >
                          {leadStates.filter((state) => state.value !== 'todos').map((state) => (
                            <option key={state.value} value={state.value}>{state.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="bg-slate-50/70 border border-slate-100 rounded-2xl p-5">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Último mensaje recibido</p>
                      <p className="text-[13px] text-slate-600 leading-relaxed font-medium line-clamp-3">
                        {selectedContact.ultimo_mensaje || 'Aún no se han registrado mensajes recientes.'}
                      </p>
                    </div>

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full h-14 rounded-xl bg-[#5d5fef] text-white font-black text-[15px] hover:bg-[#4a4ce0] transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-70 active:scale-[0.98]"
                    >
                      <Save size={19} />
                      {isSaving ? 'Guardando...' : 'Actualizar Perfil'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="text-center py-24 px-8">
                  <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-200 border-2 border-dashed border-slate-200">
                    <User size={40} />
                  </div>
                  <h3 className="text-[18px] font-black text-slate-800">Perfil de Contacto</h3>
                  <p className="text-[14px] text-slate-400 mt-3 font-medium leading-relaxed">
                    Selecciona un usuario de la lista para gestionar su información, ver su historial y cambiar su estado de venta.
                  </p>
                </div>
              )}
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
