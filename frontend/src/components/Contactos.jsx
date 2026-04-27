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
  'bg-[#059669]',
  'bg-[#0891b2]',
  'bg-[#0d9488]',
  'bg-[#047857]',
  'bg-[#065f46]',
  'bg-[#0e7490]',
  'bg-[#10b981]',
  'bg-[#0f766e]',
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
        <div className={`absolute -inset-1 bg-gradient-to-tr from-[#10b981]/20 to-[#0891b2]/20 rounded-full blur-md opacity-0 group-hover/avatar:opacity-100 transition-opacity`}></div>
        <div className={`relative ${sizeClass} rounded-full ${bgColor} border-2 border-white/20 flex items-center justify-center font-black text-white shadow-lg overflow-hidden`}>
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
        <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-[#10b981] border-2 border-white rounded-full"></div>
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
    <div className="flex min-h-screen bg-[#f0fdf9] font-sans selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0 h-[calc(100vh-32px)] overflow-hidden">
        {/* Header */}
        <header className="h-[72px] bg-white rounded-3xl border border-[#d1fae5] shadow-sm flex items-center justify-between px-8 z-50 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#ecfdf5] rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-[#a7f3d0] shrink-0">
              <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div className="flex flex-col">
              <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
              <span className="text-[9px] font-bold text-[#9ca3af] uppercase tracking-[0.3em] mt-0.5">Directorio de Contactos</span>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <button type="button" onClick={loadContacts} className="text-[#9ca3af] hover:text-[#10b981] transition-colors">
              <RefreshCw size={18} className={isLoading ? 'animate-spin text-[#10b981]' : ''} />
            </button>
            <Bell size={18} className="text-[#9ca3af] cursor-pointer hover:text-[#10b981] transition-colors" />
            <div className="flex items-center gap-3 border-l border-[#d1fae5] pl-5">
              <div className="w-8 h-8 bg-gradient-to-br from-[#10b981] to-[#0891b2] rounded-full flex items-center justify-center font-bold text-white text-xs uppercase shadow-sm">
                {user?.nombre?.charAt(0) || 'U'}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs text-[#134e4a] leading-none mb-0.5">{user?.nombre || 'Usuario'}</span>
                <span className="text-[10px] text-[#9ca3af] font-medium uppercase">{roleLabel}</span>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto pb-8">
          {/* Hero de búsqueda */}
          <section className="mb-6 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="bg-white border border-[#d1fae5] p-6 rounded-[2rem] shadow-sm flex flex-col lg:flex-row items-center justify-between gap-6">
              <div>
                <h1 className="text-2xl font-black text-[#134e4a] tracking-tight leading-none mb-1">
                  Directorio de <span className="geopulse-text-gradient">contactos</span>
                </h1>
                <p className="text-[11px] font-medium text-[#9ca3af] uppercase tracking-[0.2em]">
                  {formatNumber(pagination.total)} contactos registrados
                </p>
              </div>
              <div className="flex flex-col md:flex-row gap-3 w-full lg:w-auto">
                <div className="relative group flex-1 lg:w-72">
                  <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af] group-focus-within:text-[#10b981] transition-colors" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, teléfono..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-11 pr-4 h-11 bg-[#f0fdf9] border border-[#d1fae5] rounded-xl outline-none text-[#374151] font-medium placeholder:text-[#9ca3af] focus:border-[#10b981] focus:ring-2 focus:ring-emerald-50 transition-all text-sm"
                  />
                </div>
                <select
                  value={estado}
                  onChange={(event) => { setEstado(event.target.value); setPagination((c) => ({ ...c, page: 1 })); }}
                  className="px-4 h-11 bg-[#f0fdf9] border border-[#d1fae5] rounded-xl outline-none text-[#374151] font-bold appearance-none cursor-pointer hover:border-[#10b981] transition-all text-xs uppercase tracking-wide min-w-[140px]"
                >
                  {leadStates.map((state) => (
                    <option key={state.value} value={state.value}>{state.label}</option>
                  ))}
                </select>
                <button className="h-11 px-5 bg-gradient-to-r from-[#10b981] to-[#0d9488] rounded-xl text-white font-black uppercase tracking-wide text-[11px] hover:shadow-md shadow-emerald-200 transition-all flex items-center gap-2 active:scale-95">
                  <Filter size={15} /> Filtrar
                </button>
              </div>
            </div>
          </section>

          {/* Alertas */}
          {(error || success) && (
            <div className={`mb-6 rounded-2xl p-4 flex items-center gap-3 text-sm font-bold border ${
              error ? 'bg-red-50 border-red-200 text-red-600' : 'bg-[#ecfdf5] border-[#a7f3d0] text-[#059669]'
            }`}>
              <AlertCircle size={18} /> {error || success}
            </div>
          )}

          <div className="grid grid-cols-1 xl:grid-cols-[1fr_380px] gap-6 items-start max-w-[1800px] mx-auto w-full">
            {/* Lista */}
            <div className="space-y-3">
              {isLoading ? (
                <div className="space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => <SkeletonContactCard key={i} />)}
                </div>
              ) : contacts.length > 0 ? (
                contacts.map((contact) => (
                  <div
                    key={contact.id}
                    onClick={() => selectContact(contact)}
                    className={`geo-hover bg-white p-5 rounded-2xl flex flex-col md:flex-row items-center justify-between cursor-pointer group transition-all duration-300 border ${
                      selectedContact?.id === contact.id
                      ? 'border-[#10b981] shadow-md shadow-emerald-100'
                      : 'border-[#d1fae5]'
                    }`}
                  >
                    <div className="flex items-center gap-5 w-full md:w-auto">
                      <ContactAvatar contact={contact} size="md" />
                      <div className="min-w-0">
                        <h3 className={`text-sm font-black tracking-tight truncate transition-colors ${
                          selectedContact?.id === contact.id ? 'text-[#059669]' : 'text-[#134e4a] group-hover:text-[#10b981]'
                        }`}>
                          {contactVisibleName(contact)}
                        </h3>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-[#9ca3af] font-medium flex items-center gap-1.5">
                            <Phone size={11} className="text-[#10b981]" />
                            {contact.telefono || 'Sin número'}
                          </span>
                          {contact.empresa && (
                            <span className="text-[9px] bg-[#ecfdf5] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full text-[#059669] font-bold uppercase tracking-wide">
                              {contact.empresa}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-5 mt-4 md:mt-0 w-full md:w-auto justify-between md:justify-end border-t md:border-t-0 border-[#f0fdf9] pt-3 md:pt-0">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[9px] font-black uppercase tracking-wide ${leadBadgeClasses[contact.estado_lead] || leadBadgeClasses.nuevo}`}>
                        {leadLabels[contact.estado_lead] || 'Nuevo'}
                      </span>
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all border ${
                        selectedContact?.id === contact.id
                        ? 'bg-[#10b981] text-white border-[#10b981] shadow-sm'
                        : 'bg-[#f0fdf9] text-[#9ca3af] border-[#d1fae5]'
                      }`}>
                        <ChevronRight size={18} />
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white border border-dashed border-[#a7f3d0] rounded-[2rem] p-16 flex flex-col items-center text-center">
                  <User size={44} className="text-[#a7f3d0] mb-4" />
                  <p className="font-black text-[11px] uppercase tracking-widest text-[#9ca3af]">Sin contactos encontrados</p>
                </div>
              )}

              {/* Paginación */}
              <div className="flex items-center justify-between px-5 py-4 bg-white rounded-2xl border border-[#d1fae5] shadow-sm mt-4">
                <p className="text-[10px] font-bold text-[#9ca3af] uppercase tracking-wide">
                  Página {pagination.page} de {pagination.total_pages || 1}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    className="w-9 h-9 bg-[#f0fdf9] border border-[#d1fae5] flex items-center justify-center rounded-xl disabled:opacity-30 hover:border-[#10b981] hover:text-[#10b981] transition-all text-[#6b7280]"
                  >
                    <ChevronLeft size={17} />
                  </button>
                  <button
                    type="button"
                    onClick={() => goToPage(pagination.page + 1)}
                    disabled={pagination.page >= (pagination.total_pages || 1)}
                    className="w-9 h-9 bg-[#f0fdf9] border border-[#d1fae5] flex items-center justify-center rounded-xl disabled:opacity-30 hover:border-[#10b981] hover:text-[#10b981] transition-all text-[#6b7280]"
                  >
                    <ChevronRight size={17} />
                  </button>
                </div>
              </div>
            </div>

            {/* Panel de detalle */}
            <aside className="bg-white rounded-[2rem] overflow-hidden border border-[#d1fae5] shadow-sm min-h-[600px] animate-in zoom-in-95 duration-400">
              {selectedContact ? (
                <form onSubmit={saveContact} className="flex flex-col h-full">
                  <div className="p-7 bg-[#f0fdf9] flex flex-col items-center text-center border-b border-[#d1fae5] relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-[#10b981] via-[#0d9488] to-[#0891b2]" />
                    <ContactAvatar contact={selectedContact} size="lg" />
                    <div className="mt-5">
                      <h3 className="text-lg font-black text-[#134e4a] tracking-tight mb-1">{contactVisibleName(selectedContact)}</h3>
                      <div className="flex items-center justify-center gap-2 text-[#0d9488]">
                        <MessageCircle size={13} />
                        <span className="text-[9px] font-black tracking-[0.25em] uppercase">Contacto activo</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 space-y-4 flex-1">
                    {[
                      { label: 'Nombre', name: 'nombre', type: 'text', icon: User, placeholder: 'Nombre del contacto' },
                      { label: 'Correo', name: 'correo', type: 'email', icon: AtSign, placeholder: 'correo@ejemplo.com' },
                      { label: 'Empresa', name: 'empresa', type: 'text', icon: Building, placeholder: 'Empresa u organización' },
                    ].map(({ label, name, type, icon: Icon, placeholder }) => (
                      <div key={name} className="space-y-1.5">
                        <label className="text-[9px] font-black text-[#9ca3af] uppercase tracking-widest ml-1">{label}</label>
                        <div className="relative">
                          <Icon size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#a7f3d0]" />
                          <input
                            type={type} name={name} value={formData[name]} onChange={handleChange}
                            className="w-full pl-10 pr-4 h-11 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] text-sm font-bold text-[#134e4a] outline-none focus:border-[#10b981] focus:ring-2 focus:ring-emerald-50 transition-all placeholder:text-[#9ca3af]"
                            placeholder={placeholder}
                          />
                        </div>
                      </div>
                    ))}

                    <div className="space-y-1.5">
                      <label className="text-[9px] font-black text-[#9ca3af] uppercase tracking-widest ml-1">Estado Lead</label>
                      <select
                        name="estado_lead" value={formData.estado_lead} onChange={handleChange}
                        className="w-full px-4 h-11 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] text-sm font-bold text-[#134e4a] outline-none focus:border-[#10b981] appearance-none cursor-pointer"
                      >
                        {leadStates.filter((s) => s.value !== 'todos').map((s) => (
                          <option key={s.value} value={s.value}>{s.label}</option>
                        ))}
                      </select>
                    </div>

                    {selectedContact.ultimo_mensaje && (
                      <div className="bg-[#f0fdf9] border border-[#d1fae5] rounded-xl p-4">
                        <p className="text-[9px] font-black text-[#9ca3af] uppercase tracking-widest mb-2">Último mensaje</p>
                        <p className="text-xs text-[#6b7280] leading-relaxed font-medium italic line-clamp-2">
                          "{selectedContact.ultimo_mensaje}"
                        </p>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full h-11 rounded-xl bg-gradient-to-r from-[#10b981] to-[#0d9488] hover:from-[#059669] hover:to-[#0f766e] text-white font-black text-[10px] uppercase tracking-widest shadow-md shadow-emerald-200 flex items-center justify-center gap-2 disabled:opacity-70 active:scale-95 transition-all"
                    >
                      <Save size={16} />
                      {isSaving ? 'Guardando...' : 'Guardar cambios'}
                    </button>
                  </div>
                </form>
              ) : (
                <div className="flex flex-col items-center justify-center h-full text-center p-12">
                  <div className="w-16 h-16 bg-[#ecfdf5] rounded-2xl flex items-center justify-center text-[#a7f3d0] border border-[#d1fae5] mb-5">
                    <User size={32} />
                  </div>
                  <h3 className="text-base font-black text-[#134e4a] tracking-tight mb-3">Selecciona un contacto</h3>
                  <p className="text-[11px] text-[#9ca3af] font-medium leading-relaxed max-w-[200px]">
                    Haz clic en cualquier contacto para ver y editar sus datos.
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
