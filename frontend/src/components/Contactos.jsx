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
} from 'lucide-react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const leadStates = [
  { value: 'todos', label: 'Todos' },
  { value: 'nuevo', label: 'Nuevo' },
  { value: 'interesado', label: 'Interesado' },
  { value: 'en_negociacion', label: 'En negociacion' },
  { value: 'cerrado', label: 'Cerrado' },
  { value: 'perdido', label: 'Perdido' },
];

const leadBadgeClasses = {
  nuevo: 'bg-slate-100 text-slate-700 border-slate-200',
  interesado: 'bg-blue-50 text-blue-700 border-blue-100',
  en_negociacion: 'bg-amber-50 text-amber-700 border-amber-100',
  cerrado: 'bg-green-50 text-green-700 border-green-100',
  perdido: 'bg-red-50 text-red-700 border-red-100',
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

function ContactAvatar({ contact, size = 'md' }) {
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = contact.foto_perfil;
  const sizeClass = size === 'lg' ? 'w-14 h-14 text-xl' : 'w-11 h-11 text-sm';

  useEffect(() => {
    setImageFailed(false);
  }, [imageUrl]);

  if (imageUrl && !imageFailed) {
    return (
      <img
        src={imageUrl}
        alt={contactVisibleName(contact)}
        onError={() => setImageFailed(true)}
        className={`${sizeClass} rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0 shadow-sm`}
      />
    );
  }

  return (
    <div className={`${sizeClass} rounded-full ${avatarColor(contact)} text-white flex items-center justify-center font-black shadow-sm shrink-0`}>
      {avatarText(contact)}
    </div>
  );
}

function ContactRow({ contact, isSelected, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left grid grid-cols-[72px_minmax(220px,1.4fr)_minmax(170px,1fr)_150px_170px] gap-4 items-center px-5 py-4 border-b border-slate-100 transition-colors ${
        isSelected ? 'bg-indigo-50' : 'hover:bg-slate-50'
      }`}
    >
      <ContactAvatar contact={contact} />

      <div className="flex items-center gap-4 min-w-0">
        <div className="min-w-0">
          <p className="font-bold text-slate-800 truncate">{contactVisibleName(contact)}</p>
          <p className="text-xs text-slate-400 truncate">{contact.jid}</p>
        </div>
      </div>

      <div className="min-w-0">
        <p className="text-sm font-semibold text-slate-700 truncate">{contact.telefono || 'Sin telefono'}</p>
        <p className="text-xs text-slate-400 truncate">{contact.correo || contact.empresa || 'Sin datos adicionales'}</p>
      </div>

      <div>
        <span className={`inline-flex items-center px-3 py-1 rounded-full border text-[11px] font-bold uppercase ${leadBadgeClasses[contact.estado_lead] || leadBadgeClasses.nuevo}`}>
          {leadLabel(contact.estado_lead)}
        </span>
      </div>

      <div className="text-xs text-slate-400 min-w-0">
        <p className="font-semibold text-slate-500 truncate">{contact.dispositivo_nombre || 'Sin dispositivo'}</p>
        <p className="truncate">{formatDate(contact.actualizado_en)}</p>
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

  const loadContacts = async () => {
    if (!user?.id) {
      setError('No se encontro el usuario activo.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/api/contacts/${user.id}?${queryParams}`);
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'No se pudieron cargar los contactos.');
        return;
      }

      setContacts(data.contacts || []);
      setPagination(data.pagination || { page: 1, limit: 25, total: 0, total_pages: 1 });
      setSelectedContact((current) => {
        if (!current) return null;
        return (data.contacts || []).find((contact) => contact.id === current.id) || null;
      });
    } catch {
      setError('Error de conexion al cargar contactos.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
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
        <header className="h-16 bg-[#1e1e2d] text-white flex items-center justify-between px-8 sticky top-0 z-20 shadow-md">
          <div>
            <h1 className="font-bold tracking-tighter text-lg uppercase">Contactos</h1>
            <p className="text-xs text-white/45">Directorio real conectado a tu base MariaDB</p>
          </div>
          <button
            type="button"
            onClick={loadContacts}
            className="w-10 h-10 rounded-xl flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition-colors"
            title="Actualizar contactos"
          >
            <RefreshCw size={18} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </header>

        <div className="p-8 max-w-7xl mx-auto space-y-6">
          <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight">Directorio de contactos</h2>
              <p className="text-sm text-slate-500 font-medium">
                {formatNumber(pagination.total)} registros encontrados en tus dispositivos.
              </p>
            </div>

            <div className="flex flex-col md:flex-row gap-3 w-full xl:w-auto">
              <div className="relative flex-1 xl:w-96">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar nombre, telefono, correo, empresa..."
                  className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none text-sm"
                />
              </div>

              <select
                value={estado}
                onChange={(event) => {
                  setEstado(event.target.value);
                  setPagination((current) => ({ ...current, page: 1 }));
                }}
                className="px-4 py-3 bg-white border border-slate-200 rounded-2xl focus:border-indigo-400 focus:ring-4 focus:ring-indigo-50 outline-none text-sm font-bold text-slate-600"
              >
                {leadStates.map((state) => (
                  <option key={state.value} value={state.value}>{state.label}</option>
                ))}
              </select>
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
              <div className="hidden lg:grid grid-cols-[72px_minmax(220px,1.4fr)_minmax(170px,1fr)_150px_170px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                <span>Imagen</span>
                <span>Nombre</span>
                <span>Contacto</span>
                <span>Estado lead</span>
                <span>Dispositivo</span>
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

            <aside className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 sticky top-24">
              {selectedContact ? (
                <form onSubmit={saveContact} className="space-y-5">
                  <div className="flex items-center gap-4 pb-5 border-b border-slate-100">
                    <ContactAvatar contact={selectedContact} size="lg" />
                    <div className="min-w-0">
                      <h3 className="font-black text-slate-900 truncate">{contactVisibleName(selectedContact)}</h3>
                      <p className="text-xs text-slate-400 truncate">{selectedContact.jid}</p>
                    </div>
                  </div>

                  <div className="space-y-3 text-sm">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Phone size={16} />
                      <span>{selectedContact.telefono || 'Sin telefono'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Smartphone size={16} />
                      <span>{selectedContact.dispositivo_nombre || 'Sin dispositivo'}</span>
                    </div>
                    <div className="flex items-center gap-2 text-slate-500">
                      <Mail size={16} />
                      <span>{selectedContact.correo || 'Sin correo'}</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Nombre</label>
                      <input
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                        placeholder="Nombre visible"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Correo</label>
                      <input
                        type="email"
                        name="correo"
                        value={formData.correo}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                        placeholder="correo@empresa.com"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Empresa</label>
                      <input
                        name="empresa"
                        value={formData.empresa}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                        placeholder="Empresa o institucion"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Estado lead</label>
                      <select
                        name="estado_lead"
                        value={formData.estado_lead}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400"
                      >
                        {leadStates.filter((state) => state.value !== 'todos').map((state) => (
                          <option key={state.value} value={state.value}>{state.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4">
                    <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-2">Ultimo mensaje</p>
                    <p className="text-sm text-slate-600 leading-relaxed line-clamp-4">
                      {selectedContact.ultimo_mensaje || 'Sin ultimo mensaje registrado.'}
                    </p>
                  </div>

                  <button
                    type="submit"
                    disabled={isSaving}
                    className="w-full py-3 rounded-2xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
                  >
                    <Save size={17} />
                    {isSaving ? 'Guardando...' : 'Guardar contacto'}
                  </button>
                </form>
              ) : (
                <div className="text-center py-12">
                  <User size={48} className="mx-auto text-slate-300 mb-4" />
                  <h3 className="font-black text-slate-800">Selecciona un contacto</h3>
                  <p className="text-sm text-slate-400 mt-2">
                    Podras editar nombre, correo, empresa y estado lead.
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
