import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Copy,
  ChevronDown,
  Camera,
  User,
  Mail,
  Globe,
  Phone,
  Bell,
  Shield,
  Lock,
  HelpCircle,
  CheckCircle2,
  Info,
  Clock,
  Laptop,
  MapPin,
  Sparkles,
  MessageCircle,
  X,
  Upload,
  Key
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

const API_URL = import.meta.env.VITE_API_URL || '';

const Perfil = ({ user, onLogout, onUpdateProfile }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    correo: user?.correo || '',
    whatsapp: user?.whatsapp_personal || '',
    zonaHoraria: user?.zona_horaria || 'America/Guayaquil',
    fotoPerfil: user?.foto_perfil || null,
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Preference switches state
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifWhatsapp, setNotifWhatsapp] = useState(true);
  const [notifSystem, setNotifSystem] = useState(true);

  // Password modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passData, setPassData] = useState({ actual: '', nueva: '', confirmar: '' });
  const [passError, setPassError] = useState('');
  const [passSuccess, setPassSuccess] = useState('');
  const [isChangingPass, setIsChangingPass] = useState(false);

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const getToken = () => user?.token || localStorage.getItem('token') || localStorage.getItem('jwt_token') || '';

  // Cargar datos completos del perfil desde el backend
  const loadProfile = () => {
    if (!user?.id) return;
    const token = getToken();
    setIsLoadingProfile(true);
    fetch(`${API_URL}/api/profile/${user.id}`, {
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    })
      .then(res => res.json())
      .then(data => {
        if (data.success && data.user) {
          const u = data.user;
          setFormData(prev => ({
            ...prev,
            nombre: u.nombre || prev.nombre,
            correo: u.correo || prev.correo,
            whatsapp: u.whatsapp_personal || prev.whatsapp,
            zonaHoraria: u.zona_horaria || prev.zonaHoraria,
            fotoPerfil: u.foto_perfil || prev.fotoPerfil
          }));
          setNotifEmail(u.notif_email ?? true);
          setNotifWhatsapp(u.notif_whatsapp ?? true);
          setNotifSystem(u.notif_system ?? true);
        }
      })
      .catch(err => console.error('Error fetching profile:', err))
      .finally(() => setIsLoadingProfile(false));
  };

  useEffect(() => {
    loadProfile();
  }, [user]);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formData.correo);
    setSuccessMsg('Correo copiado al portapapeles');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  // Subir foto de perfil desde el disco
  const handlePhotoSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    const fileData = new FormData();
    fileData.append('foto', file);

    setIsUploadingPhoto(true);
    setError('');

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/profile/${user.id}/photo`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: fileData
      });
      const data = await res.json();
      if (data.success) {
        setFormData(prev => ({ ...prev, fotoPerfil: data.foto_perfil }));
        if (onUpdateProfile) onUpdateProfile({ ...user, foto_perfil: data.foto_perfil });
        setSuccessMsg('Foto de perfil actualizada correctamente.');
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        setError(data.message || 'Error al subir la foto');
      }
    } catch {
      setError('Error de conexión al subir la foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  // Guardar cambios en la BD
  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!user?.id) {
      setError('No se encontró el usuario activo.');
      return;
    }

    setIsSaving(true);

    try {
      const token = getToken();
      const response = await fetch(`${API_URL}/api/profile/${user.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          nombre: formData.nombre,
          whatsapp_personal: formData.whatsapp,
          zona_horaria: formData.zonaHoraria,
          foto_perfil: formData.fotoPerfil,
          notif_email: notifEmail,
          notif_whatsapp: notifWhatsapp,
          notif_system: notifSystem
        }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'No se pudo guardar el perfil.');
        return;
      }

      if (onUpdateProfile) onUpdateProfile(data.user);
      setSuccessMsg('Perfil guardado exitosamente.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Error de conexión con el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  // Cambiar contraseña en el backend
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPassError('');
    setPassSuccess('');

    if (passData.nueva !== passData.confirmar) {
      setPassError('Las contraseñas nuevas no coinciden');
      return;
    }
    if (passData.nueva.length < 6) {
      setPassError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    setIsChangingPass(true);

    try {
      const token = getToken();
      const res = await fetch(`${API_URL}/api/profile/${user.id}/password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          password_actual: passData.actual,
          password_nueva: passData.nueva
        })
      });
      const data = await res.json();
      if (data.success) {
        setPassSuccess('Contraseña cambiada con éxito.');
        setPassData({ actual: '', nueva: '', confirmar: '' });
        setTimeout(() => {
          setShowPasswordModal(false);
          setPassSuccess('');
        }, 1500);
      } else {
        setPassError(data.message || 'No se pudo cambiar la contraseña');
      }
    } catch {
      setPassError('Error de conexión con el servidor');
    } finally {
      setIsChangingPass(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans text-slate-900 selection:bg-emerald-200/50">
      {/* -- MENÚ LATERAL -- */}
      <Sidebar onLogout={onLogout} user={user} />

      {/* -- CONTENIDO PRINCIPAL -- */}
      <main className="ml-20 flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={onLogout} title="GeoChat" onRefresh={loadProfile} isLoading={isLoadingProfile} />

        <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl bg-white shadow-[0_4px_20px_rgba(15,23,42,0.04)] border border-slate-100">
        
        {/* Header */}
        <header className="px-8 py-5 border-b border-slate-100 flex items-center justify-between shrink-0">
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900">Configuración de perfil</h1>
            <p className="text-xs font-medium text-slate-400 mt-0.5">Actualiza tus datos personales y configuraciones de tu cuenta.</p>
          </div>
        </header>

        {/* Scrollable Content Container */}
        <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col min-w-0 custom-scrollbar">
          
          {/* Input oculto para cargar foto de perfil */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handlePhotoSelect}
            accept="image/*"
            className="hidden"
          />

          {/* Top Banner Box */}
          <div className="p-5 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-center justify-between mb-6 shadow-2xs">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center text-slate-800 shadow-2xs border border-slate-200/80 shrink-0 overflow-hidden relative group">
                {formData.fotoPerfil ? (
                  <img
                    src={formData.fotoPerfil.startsWith('http') ? formData.fotoPerfil : `${API_URL}${formData.fotoPerfil}`}
                    alt="Foto de perfil"
                    className="w-full h-full object-cover rounded-2xl"
                  />
                ) : (
                  <Bot size={28} />
                )}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-black/40 flex items-center justify-center text-white">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  </div>
                )}
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">{formData.nombre || 'Usuario'}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                    <span>{formData.correo}</span>
                    <button
                      type="button"
                      onClick={handleCopy}
                      className="text-slate-400 hover:text-emerald-600 transition-colors cursor-pointer p-0.5"
                      title="Copiar correo"
                    >
                      <Copy size={13} />
                    </button>
                  </div>
                  <span className="bg-emerald-50 text-emerald-600 border border-emerald-200 px-2.5 py-0.5 rounded-full text-[10px] font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Cuenta activa
                  </span>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingPhoto}
              className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-2xs cursor-pointer disabled:opacity-50"
            >
              <Camera size={15} />
              {isUploadingPhoto ? 'Subiendo...' : 'Cambiar foto'}
            </button>
          </div>

          {/* Main Grid Layout: Left Column (Form) & Right Column (Summary Cards) */}
          <form id="perfil-form" onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            
            {/* Left Column (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* Sección 1: Información personal */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                  <User size={16} className="text-[#5b5fd8]" />
                  <h3 className="text-sm font-bold text-slate-900">Información personal</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Nombre completo */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800">
                      Nombre completo <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      name="nombre"
                      value={formData.nombre}
                      onChange={handleChange}
                      required
                      placeholder="Ingresa tu nombre completo"
                      className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs bg-white placeholder:text-slate-400"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Este será el nombre visible en tu cuenta.</p>
                  </div>

                  {/* Correo electrónico */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Mail size={13} className="text-[#5b5fd8]" />
                      Correo electrónico
                    </label>
                    <input
                      type="email"
                      name="correo"
                      value={formData.correo}
                      disabled
                      className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-medium text-slate-400 bg-slate-50 outline-none cursor-not-allowed"
                    />
                    <p className="text-[10px] text-slate-400 font-medium">Usa un correo válido para recibir notificaciones.</p>
                  </div>

                  {/* WhatsApp personal */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <MessageCircle size={13} className="text-emerald-500" />
                      WhatsApp personal
                    </label>
                    <div className="flex h-10 border border-slate-200 rounded-xl overflow-hidden focus-within:border-emerald-500 focus-within:ring-2 focus-within:ring-emerald-100 transition-all shadow-2xs bg-white">
                      <div className="flex items-center gap-1.5 px-3 bg-slate-50 border-r border-slate-200 shrink-0">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" className="w-5 h-auto rounded-xs shadow-2xs">
                          <rect width="3" height="2" fill="#FFD100" />
                          <rect width="3" height="1" y="1" fill="#0072CE" />
                          <rect width="3" height="0.5" y="1.5" fill="#EF3340" />
                          <circle cx="1.5" cy="1" r="0.25" fill="#0072CE" />
                        </svg>
                      </div>
                      <input
                        type="tel"
                        name="whatsapp"
                        value={formData.whatsapp}
                        onChange={handleChange}
                        placeholder="593959709519"
                        className="flex-1 px-3.5 h-full outline-none text-xs font-bold text-slate-800 bg-white placeholder:text-slate-400"
                      />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Utilizaremos este número para contactarte.</p>
                  </div>

                  {/* Zona horaria */}
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Globe size={13} className="text-[#5b5fd8]" />
                      Zona horaria
                    </label>
                    <div className="relative">
                      <select
                        name="zonaHoraria"
                        value={formData.zonaHoraria}
                        onChange={handleChange}
                        className="w-full h-10 pl-3.5 pr-10 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 appearance-none bg-white transition-all cursor-pointer shadow-2xs"
                      >
                        <option value="UTC">UTC</option>
                        <option value="Pacific/Midway">Pacific/Midway</option>
                        <option value="Pacific/Niue">Pacific/Niue</option>
                        <option value="Pacific/Pago_Pago">Pacific/Pago_Pago</option>
                        <option value="America/Adak">America/Adak</option>
                        <option value="Pacific/Honolulu">Pacific/Honolulu</option>
                        <option value="America/Guayaquil">America/Guayaquil</option>
                      </select>
                      <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                    <p className="text-[10px] text-slate-400 font-medium">Selecciona tu zona horaria actual.</p>
                  </div>
                </div>
              </div>

              {/* Sección 2: Preferencias de comunicación */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Bell size={16} className="text-[#5b5fd8]" />
                    <h3 className="text-sm font-bold text-slate-900">Preferencias de comunicación</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Elige cómo y cuándo quieres recibir notificaciones.</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {/* Option 1: Correo */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#5b5fd8] flex items-center justify-center">
                        <Mail size={16} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Notificaciones por correo</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                        Recibe actualizaciones importantes en tu correo electrónico.
                      </p>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setNotifEmail(!notifEmail)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${notifEmail ? 'bg-[#5b5fd8]' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${notifEmail ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Option 2: WhatsApp */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-emerald-50/30 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                        <MessageCircle size={16} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Notificaciones por WhatsApp</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                        Recibe alertas y novedades en tu WhatsApp.
                      </p>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setNotifWhatsapp(!notifWhatsapp)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${notifWhatsapp ? 'bg-[#5b5fd8]' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${notifWhatsapp ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Option 3: Recordatorios */}
                  <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/50 flex flex-col justify-between space-y-3">
                    <div className="space-y-1.5">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                        <Bell size={16} />
                      </div>
                      <h4 className="text-xs font-bold text-slate-900">Recordatorios del sistema</h4>
                      <p className="text-[11px] text-slate-400 font-medium leading-relaxed">
                        Recibe recordatorios sobre tus actividades y tareas.
                      </p>
                    </div>
                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setNotifSystem(!notifSystem)}
                        className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${notifSystem ? 'bg-[#5b5fd8]' : 'bg-slate-300'}`}
                      >
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-1 transition-transform ${notifSystem ? 'left-6' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Sección 3: Seguridad de la cuenta */}
              <div className="space-y-3 pt-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Shield size={16} className="text-[#5b5fd8]" />
                    <h3 className="text-sm font-bold text-slate-900">Seguridad de la cuenta</h3>
                  </div>
                  <p className="text-xs text-slate-400 font-medium mt-0.5">Mantén tu cuenta segura con estas recomendaciones.</p>
                </div>

                <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/80 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100/70 text-[#5b5fd8] flex items-center justify-center shrink-0">
                      <Lock size={18} />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Tu contraseña está segura</h4>
                      <p className="text-[11px] text-slate-500 font-medium mt-0.5">Último cambio: 12 de mayo de 2024</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(true)}
                    className="bg-white border border-indigo-200 hover:bg-indigo-50 text-[#5b5fd8] text-xs font-bold px-3.5 py-1.5 rounded-xl transition-all cursor-pointer shadow-2xs"
                  >
                    Cambiar contraseña
                  </button>
                </div>
              </div>

              {/* Toast Error / Success */}
              {error && (
                <div className="text-rose-600 text-xs font-bold bg-rose-50 border border-rose-200 px-4 py-2.5 rounded-xl inline-flex items-center gap-2">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="text-emerald-700 text-xs font-bold bg-emerald-50 border border-emerald-200 px-4 py-2.5 rounded-xl inline-flex items-center gap-2">
                  {successMsg}
                </div>
              )}
            </div>

            {/* Right Column: Profile Summary & Account Activity (4 cols) */}
            <div className="lg:col-span-4 space-y-5">
              
              {/* Card 1: Resumen de tu perfil */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-2xs flex flex-col items-center">
                <div className="w-14 h-14 rounded-full bg-purple-50 text-[#5b5fd8] flex items-center justify-center mb-3 relative">
                  <Sparkles size={24} />
                </div>
                <h3 className="text-sm font-bold text-slate-900">Resumen de tu perfil</h3>
                <p className="text-[11px] text-slate-400 font-medium mb-5">Así se verá tu información básica.</p>

                <div className="w-full space-y-3 text-xs">
                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60">
                    <div className="w-7 h-7 rounded-lg bg-purple-100/70 text-[#5b5fd8] flex items-center justify-center shrink-0">
                      <User size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Nombre</p>
                      <p className="font-bold text-slate-800 truncate">{formData.nombre || 'Sin especificar'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60">
                    <div className="w-7 h-7 rounded-lg bg-indigo-100/70 text-indigo-600 flex items-center justify-center shrink-0">
                      <Mail size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Correo</p>
                      <p className="font-bold text-slate-800 truncate">{formData.correo}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60">
                    <div className="w-7 h-7 rounded-lg bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
                      <Phone size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">WhatsApp</p>
                      <p className="font-bold text-slate-800 truncate">+{formData.whatsapp || '593959709519'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-50/60">
                    <div className="w-7 h-7 rounded-lg bg-purple-100/70 text-[#5b5fd8] flex items-center justify-center shrink-0">
                      <Globe size={14} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Zona horaria</p>
                      <p className="font-bold text-slate-800 truncate">{formData.zonaHoraria}</p>
                    </div>
                  </div>
                </div>

                <div className="w-full mt-4 p-3 rounded-xl bg-emerald-50/60 border border-emerald-100 flex items-start gap-2.5">
                  <CheckCircle2 size={16} className="text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-emerald-900">Tu información está segura</h4>
                    <p className="text-[10px] text-emerald-700 font-medium leading-relaxed mt-0.5">
                      Tus datos están protegidos y solo tú puedes modificarlos.
                    </p>
                  </div>
                </div>
              </div>

              {/* Card 2: Actividad de la cuenta */}
              <div className="p-5 rounded-2xl border border-slate-100 bg-white shadow-2xs space-y-4">
                <div className="flex items-center gap-2 border-b border-slate-100 pb-2.5">
                  <Clock size={15} className="text-[#5b5fd8]" />
                  <h3 className="text-xs font-bold text-slate-900">Actividad de la cuenta</h3>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex items-start gap-2.5">
                    <Clock size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Último inicio de sesión</p>
                      <p className="font-bold text-slate-800">16 de mayo de 2024, 09:45 AM</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <Laptop size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Dispositivo</p>
                      <p className="font-bold text-slate-800">Windows • Chrome</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <MapPin size={14} className="text-slate-400 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">IP aproximada</p>
                      <p className="font-bold text-slate-800">190.152.XX.XXX</p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => alert('Mostrando historial completo de sesiones.')}
                  className="w-full py-2 border border-purple-200 hover:bg-purple-50 text-[#5b5fd8] text-xs font-bold rounded-xl transition-all text-center cursor-pointer"
                >
                  Ver actividad reciente
                </button>
              </div>

            </div>
          </form>
        </div>

        {/* Footer Bar */}
        <footer className="px-8 py-4 border-t border-slate-100 flex items-center justify-between bg-white rounded-b-2xl shrink-0">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
            <Info size={14} />
            <span>Los cambios se guardarán automáticamente al confirmar.</span>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="perfil-form"
              disabled={isSaving}
              className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold uppercase tracking-wider transition-all shadow-md shadow-emerald-100 disabled:opacity-70 cursor-pointer active:scale-95 flex items-center gap-2"
            >
              {isSaving ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Lock size={13} />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </footer>
        {/* Modal para Cambiar Contraseña */}
        {showPasswordModal && (
          <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#5b5fd8] flex items-center justify-center">
                    <Key size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">Cambiar contraseña</h3>
                    <p className="text-[11px] text-slate-400 font-medium">Ingresa tu nueva contraseña para actualizarla.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handlePasswordSubmit} className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Nueva contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Mínimo 6 caracteres"
                    value={passData.nueva}
                    onChange={e => setPassData({ ...passData, nueva: e.target.value })}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Confirmar nueva contraseña</label>
                  <input
                    type="password"
                    required
                    minLength={6}
                    placeholder="Repite la nueva contraseña"
                    value={passData.confirmar}
                    onChange={e => setPassData({ ...passData, confirmar: e.target.value })}
                    className="w-full h-10 px-3.5 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all bg-white"
                  />
                </div>

                {passError && (
                  <p className="text-xs font-bold text-rose-500 bg-rose-50 border border-rose-200 p-2.5 rounded-xl">{passError}</p>
                )}
                {passSuccess && (
                  <p className="text-xs font-bold text-emerald-600 bg-emerald-50 border border-emerald-200 p-2.5 rounded-xl">{passSuccess}</p>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPasswordModal(false)}
                    className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isChangingPass}
                    className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-md shadow-emerald-100 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {isChangingPass ? 'Actualizando...' : 'Actualizar contraseña'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        </div>
        </div>
      </main>
    </div>
  );
};

export default Perfil;
