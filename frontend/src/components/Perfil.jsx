// frontend/src/components/Perfil.jsx
import React, { useState } from 'react';
import { Bot, Copy, ChevronDown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const Perfil = ({ user, onLogout, onUpdateProfile }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: user?.nombre || '',
    correo: user?.correo || '',
    whatsapp: user?.whatsapp_personal || '',
    zonaHoraria: user?.zona_horaria || 'UTC',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Sincronizar estado si el objeto user cambia
  React.useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        nombre: user.nombre || '',
        correo: user.correo || '',
        whatsapp: user.whatsapp_personal || prev.whatsapp || '',
        zonaHoraria: user.zona_horaria || 'UTC',
      }));

      // Si no tiene whatsapp personal, intentar obtenerlo del dispositivo conectado
      if (!user.whatsapp_personal) {
        fetch(`${API_URL}/api/dashboard/${user.id}`)
          .then(res => res.json())
          .then(data => {
            if (data.success && data.dashboard?.dispositivos?.length > 0) {
              const devicePhone = data.dashboard.dispositivos[0].numero_telefono;
              if (devicePhone) {
                setFormData(prev => ({ ...prev, whatsapp: devicePhone }));
              }
            }
          })
          .catch(err => console.error('Error fetching dashboard devices:', err));
      }
    }
  }, [user]);

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(formData.correo);
    setSuccessMsg('Correo copiado al portapapeles');
    setTimeout(() => setSuccessMsg(''), 3000);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!user?.id) {
      setError('No se encontro el usuario activo.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          whatsapp_personal: formData.whatsapp,
          zona_horaria: formData.zonaHoraria,
          foto_perfil: user?.foto_perfil || null,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'No se pudo guardar el perfil.');
        return;
      }

      if (onUpdateProfile) onUpdateProfile(data.user);
      setSuccessMsg('Perfil actualizado correctamente.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch {
      setError('Error de conexion con el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      {/* ── MENÚ LATERAL ── */}
      <Sidebar onLogout={onLogout} user={user} />

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden p-4 lg:p-8 ml-20 lg:ml-24">
        <div className="flex-1 bg-white rounded-3xl shadow-sm border border-slate-100 flex flex-col relative">
          
          <div className="flex-1 overflow-y-auto p-10">
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Configuración de perfil</h1>
            <p className="text-sm text-slate-500 mb-10">Actualiza tus datos personales y configuraciones de tu cuenta.</p>

            <form id="perfil-form" onSubmit={handleSubmit}>
              {/* Avatar e Info */}
              <div className="flex items-center gap-4 mb-10">
                <div className="w-14 h-14 bg-slate-100 rounded-xl flex items-center justify-center">
                  <Bot size={30} className="text-slate-700" />
                </div>
                <div>
                  <h2 className="text-[15px] font-bold text-slate-800 mb-0.5">{formData.nombre}</h2>
                  <div className="flex items-center gap-2 text-[#5b5fd8]">
                    <span className="text-sm">{formData.correo}</span>
                    <button type="button" onClick={handleCopy} className="hover:text-[#4a4ec4] transition-colors cursor-pointer">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              </div>

              {/* Grid 2x2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8 max-w-4xl">
                {/* Nombre */}
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-2">
                    Nombre<span className="text-red-500 ml-0.5">*</span>
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    required
                    className="w-full h-11 px-4 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:border-[#5b5fd8] focus:ring-1 focus:ring-[#5b5fd8] transition-all"
                  />
                </div>

                {/* Correo */}
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-2">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    name="correo"
                    value={formData.correo}
                    disabled
                    className="w-full h-11 px-4 border border-slate-200 rounded-lg text-[13px] text-slate-500 bg-[#f8fafc] outline-none"
                  />
                </div>

                {/* WhatsApp */}
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-2">
                    WhatsApp personal
                  </label>
                  <div className="flex h-11 border border-slate-200 rounded-lg overflow-hidden focus-within:border-[#5b5fd8] focus-within:ring-1 focus-within:ring-[#5b5fd8] transition-all">
                    <div className="flex items-center gap-2 px-3 bg-[#f8fafc] border-r border-slate-200">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 3 2" className="w-5 h-auto rounded-sm shadow-sm">
                        <rect width="3" height="2" fill="#FFD100"/>
                        <rect width="3" height="1" y="1" fill="#0072CE"/>
                        <rect width="3" height="0.5" y="1.5" fill="#EF3340"/>
                        <circle cx="1.5" cy="1" r="0.25" fill="#0072CE"/>
                      </svg>
                    </div>
                    <input
                      type="tel"
                      name="whatsapp"
                      value={formData.whatsapp}
                      onChange={handleChange}
                      placeholder="+593 999 999 999"
                      className="flex-1 px-3 h-full outline-none text-[13px] text-slate-700 bg-white"
                    />
                  </div>
                </div>

                {/* Zona horaria */}
                <div>
                  <label className="block text-[13px] font-bold text-slate-700 mb-2">
                    Zona horaria
                  </label>
                  <div className="relative">
                    <select
                      name="zonaHoraria"
                      value={formData.zonaHoraria}
                      onChange={handleChange}
                      className="w-full h-11 pl-4 pr-10 border border-slate-200 rounded-lg text-[13px] text-slate-700 focus:outline-none focus:border-[#5b5fd8] focus:ring-1 focus:ring-[#5b5fd8] appearance-none bg-white transition-all cursor-pointer"
                    >
                      <option value="UTC">UTC</option>
                      <option value="Pacific/Midway">Pacific/Midway</option>
                      <option value="Pacific/Niue">Pacific/Niue</option>
                      <option value="Pacific/Pago_Pago">Pacific/Pago_Pago</option>
                      <option value="America/Adak">America/Adak</option>
                      <option value="Pacific/Honolulu">Pacific/Honolulu</option>
                      <option value="America/Guayaquil">America/Guayaquil</option>
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {error && (
                <div className="mt-8 text-red-500 text-sm font-semibold">
                  {error}
                </div>
              )}
              {successMsg && (
                <div className="mt-8 text-[#5b5fd8] text-sm font-semibold">
                  {successMsg}
                </div>
              )}
            </form>
          </div>

          {/* Footer fijo al final */}
          <div className="px-10 py-5 border-t border-slate-100 flex justify-end gap-4 bg-white rounded-b-3xl">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-6 py-2.5 rounded-lg border border-[#5b5fd8] text-[#5b5fd8] text-sm font-bold hover:bg-[#f0f1ff] transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="perfil-form"
              disabled={isSaving}
              className="px-6 py-2.5 rounded-lg bg-[#5b5fd8] text-white text-sm font-bold hover:bg-[#4a4ec4] transition-colors disabled:opacity-70 shadow-sm"
            >
              {isSaving ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Perfil;
