import React, { useState, useEffect } from 'react';
import { Save, Bell, ChevronLeft, Send, Smile, Paperclip, Camera, Mic, Copy, Check, Upload, Code2, KeyRound } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';
const WhalinkConfig = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [activeTab, setActiveTab] = useState('general');
  const [devices, setDevices] = useState([]);
  const [formData, setFormData] = useState({
    deviceId: '',
    nombre: '',
    mensaje: '',
    imagen_url: '',
    descripcion: '',
    clave_nombre: 'nombre',
    clave_correo: 'correo',
    pixel_tracking: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [shortLink, setShortLink] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);

  const selectedDevice = devices.find(d => String(d.id) === String(formData.deviceId));
  const selectedPhone = selectedDevice?.numero_telefono || '';

  const cleanPhoneNumber = (value) => String(value || '').replace(/\D/g, '');

  const buildWhalink = (phoneNumber, message) => {
    const cleanNumber = cleanPhoneNumber(phoneNumber);
    if (!cleanNumber) return '';

    const encodedMessage = encodeURIComponent(message || '');
    return encodedMessage
      ? `https://wa.me/${cleanNumber}?text=${encodedMessage}`
      : `https://wa.me/${cleanNumber}`;
  };

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dashboard/${user.id}`);
        const data = await res.json();
        if (data.success && data.dashboard.devices) {
          setDevices(data.dashboard.devices);
          if (data.dashboard.devices.length > 0 && !isEditing) {
            setFormData(prev => prev.deviceId ? prev : ({ ...prev, deviceId: data.dashboard.devices[0].id }));
          }
        }
      } catch (err) { console.error(err); }
    };
    if (user?.id) fetchDevices();
  }, [user, isEditing]);

  useEffect(() => {
    const fetchWhalink = async () => {
      if (!user?.id || !id) return;

      setLoading(true);
      setSaveStatus(null);

      try {
        const res = await fetch(`${API_URL}/api/whalink/${id}?user_id=${user.id}`);
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.message || 'No se pudo cargar el Whalink.');
        }

        const link = data.link || {};
        setFormData({
          deviceId: link.device_id || '',
          nombre: link.nombre || '',
          mensaje: link.mensaje || '',
          imagen_url: link.imagen_url || '',
          descripcion: link.descripcion || '',
          clave_nombre: link.clave_nombre || 'nombre',
          clave_correo: link.clave_correo || 'correo',
          pixel_tracking: link.pixel_tracking || ''
        });
        setShortLink(link.short_url || '');
      } catch (err) {
        console.error(err);
        setSaveStatus({ type: 'error', text: err.message || 'Error al cargar el Whalink.' });
      } finally {
        setLoading(false);
      }
    };

    fetchWhalink();
  }, [user?.id, id]);

  useEffect(() => {
    setGeneratedLink(buildWhalink(selectedPhone, formData.mensaje));
  }, [selectedPhone, formData.mensaje]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setShortLink('');
    setCopyStatus('');
    setSaveStatus(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    setSaveStatus(null);

    try {
      const payload = new FormData();
      payload.append('user_id', user.id);
      payload.append('image', file);

      const res = await fetch(`${API_URL}/api/whalink/upload-image`, {
        method: 'POST',
        body: payload
      });
      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No se pudo subir la imagen.');
      }

      setFormData(prev => ({ ...prev, imagen_url: data.imagen_url || '' }));
      setShortLink('');
      setSaveStatus(null);
    } catch (err) {
      console.error(err);
      setSaveStatus({ type: 'error', text: err.message || 'Error al subir la imagen.' });
    } finally {
      setImageUploading(false);
      e.target.value = '';
    }
  };

  const handleCopyLink = async () => {
    if (!shortLink) return;

    try {
      await navigator.clipboard.writeText(shortLink);
      setCopyStatus('copied');
      setTimeout(() => setCopyStatus(''), 1800);
    } catch (err) {
      console.error(err);
      setCopyStatus('error');
      setTimeout(() => setCopyStatus(''), 2500);
    }
  };

  const handleSubmit = async () => {
    if (!user?.id) {
      setSaveStatus({ type: 'error', text: 'No se pudo identificar el usuario.' });
      return;
    }

    if (!formData.deviceId || !formData.nombre.trim() || !formData.mensaje.trim() || !generatedLink) {
      setSaveStatus({ type: 'error', text: 'Completa el dispositivo, nombre y mensaje para generar el enlace.' });
      return;
    }

    setLoading(true);
    setSaveStatus(null);

    try {
      const endpoint = isEditing ? `${API_URL}/api/whalink/${id}` : `${API_URL}/api/whalink/save`;
      const method = isEditing ? 'PUT' : 'POST';
      const res = await fetch(endpoint, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          deviceId: Number(formData.deviceId),
          nombre: formData.nombre.trim(),
          mensaje: formData.mensaje.trim(),
          url_generada: generatedLink,
          imagen_url: formData.imagen_url,
          descripcion: formData.descripcion.trim(),
          clave_nombre: formData.clave_nombre.trim(),
          clave_correo: formData.clave_correo.trim(),
          pixel_tracking: formData.pixel_tracking.trim()
        })
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No se pudo guardar el Whalink.');
      }

      const nextShortLink = data.short_url || data.link?.short_url || (data.short_code ? `${API_URL.replace(/\/$/, '')}/l/${data.short_code}` : '');
      setShortLink(nextShortLink);
      setSaveStatus({ type: 'success', text: data.message || (isEditing ? 'Whalink actualizado correctamente.' : 'Whalink corto guardado correctamente.') });
    } catch (err) {
      console.error(err);
      setSaveStatus({ type: 'error', text: err.message || 'Error al guardar el Whalink.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#f8f9fb] font-sans text-slate-800">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-20 lg:ml-24">
        {/* Header Superior */}
        <header className="h-14 bg-[#1e1e2d] text-white flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-indigo-500 rounded flex items-center justify-center font-bold text-sm">G</div>
            <span className="font-bold tracking-tight">GEOCHAT</span>
          </div>
          <div className="flex items-center gap-5">
            <Bell size={18} className="text-slate-400 cursor-pointer hover:text-white" />
            <div className="flex items-center gap-3 border-l border-slate-700 pl-5">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center text-[11px] font-bold">
                {user?.nombre?.charAt(0) || 'W'}
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[12px] font-semibold leading-none">{user?.nombre || 'Wendy'}</p>
                <p className="text-[10px] text-slate-400 uppercase mt-1">{user?.rol || 'admin'}</p>
              </div>
            </div>
          </div>
        </header>

        <div className="p-8 max-w-6xl mx-auto">
          {/* Navegación */}
          <div className="mb-6">
            <button onClick={() => navigate('/whalink')} className="flex items-center gap-1 text-[#6366f1] text-[13px] font-bold hover:underline">
              <ChevronLeft size={14} strokeWidth={3} /> Regresar
            </button>
            <h1 className="text-[24px] font-bold text-slate-800 mt-1">
              {isEditing ? 'Editar link directo' : 'Crear link directo'}
            </h1>
          </div>

          {/* Tabs */}
          <div className="flex gap-8 border-b border-slate-200 mb-8">
            {['Opciones generales', 'Opciones avanzadas'].map((tab, idx) => (
              <button
                key={tab}
                onClick={() => setActiveTab(idx === 0 ? 'general' : 'advanced')}
                className={`pb-3 text-[14px] font-bold transition-all relative ${
                  (idx === 0 && activeTab === 'general') || (idx === 1 && activeTab === 'advanced')
                    ? 'text-[#6366f1]' : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {tab}
                {((idx === 0 && activeTab === 'general') || (idx === 1 && activeTab === 'advanced')) && 
                  <div className="absolute bottom-0 left-0 w-full h-[2.5px] bg-[#6366f1] rounded-t-full" />
                }
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-10">
            {/* Columna Izquierda: Formulario */}
            <div className="flex-1 space-y-6">
              {activeTab === 'general' ? (
                <>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-slate-700">Número de WhatsApp *</label>
                <select
                  name="deviceId"
                  value={formData.deviceId}
                  onChange={handleChange}
                  className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[14px] focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none shadow-sm transition-all"
                >
                  {devices.map(d => (
                    <option key={d.id} value={d.id}>{d.nombre} ({d.numero_telefono})</option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-slate-700">Nombre *</label>
                <div className="relative">
                  <input
                    type="text"
                    name="nombre"
                    value={formData.nombre}
                    onChange={handleChange}
                    placeholder="Ej: Clase gratuita"
                    className="w-full p-2.5 border border-slate-200 rounded-lg text-[14px] focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none shadow-sm transition-all"
                  />
                  <span className="absolute right-3 top-3 text-[10px] text-slate-400 font-medium">
                    {formData.nombre.length}/100
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-[13px] font-bold text-slate-700">Mensaje predeterminado *</label>
                <div className="relative">
                  <textarea
                    name="mensaje"
                    value={formData.mensaje}
                    onChange={handleChange}
                    rows={6}
                    className="w-full p-3 border border-slate-200 rounded-lg text-[14px] focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none shadow-sm transition-all resize-none leading-relaxed"
                    placeholder="Escribe el mensaje que recibirá tu WhatsApp..."
                  />
                  <span className="absolute right-3 bottom-3 text-[10px] text-slate-400 font-medium">
                    {formData.mensaje.length}/250
                  </span>
                </div>
                <div className="mt-4 p-4 bg-[#f0f4ff] rounded-lg border border-indigo-50">
                   <p className="text-[12px] text-indigo-700 leading-relaxed">
                     <span className="font-bold underline decoration-indigo-300">Mensaje predeterminado</span> que redirecciona al contacto a iniciar una conversación en WhatsApp. Las palabras de este mensaje se utilizarán para ejecutar acciones automáticas.
                   </p>
                </div>
              </div>
                </>
              ) : (
                <div className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-bold text-slate-700">Subir imagen</label>
                    <label className="flex min-h-[118px] cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-indigo-200 bg-white p-4 text-center shadow-sm transition-all hover:border-indigo-400 hover:bg-indigo-50/40">
                      {formData.imagen_url ? (
                        <img src={formData.imagen_url} alt="Vista previa" className="h-20 w-20 rounded-2xl object-cover shadow-sm" />
                      ) : (
                        <>
                          <Upload size={24} className="text-indigo-500" />
                          <span className="mt-2 text-[13px] font-bold text-slate-700">Seleccionar imagen</span>
                          <span className="text-[11px] text-slate-400">PNG, JPG o WEBP</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {imageUploading && (
                      <p className="text-[12px] font-semibold text-indigo-600">Subiendo imagen...</p>
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-[13px] font-bold text-slate-700">DescripciÃ³n</label>
                    <textarea
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      rows={4}
                      className="w-full p-3 border border-slate-200 rounded-lg text-[14px] focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none shadow-sm transition-all resize-none leading-relaxed"
                      placeholder="Describe para quÃ© sirve este link..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
                        <KeyRound size={14} /> Clave nombre
                      </label>
                      <input
                        type="text"
                        name="clave_nombre"
                        value={formData.clave_nombre}
                        onChange={handleChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-[14px] focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none shadow-sm transition-all"
                        placeholder="nombre"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
                        <KeyRound size={14} /> Clave correo
                      </label>
                      <input
                        type="text"
                        name="clave_correo"
                        value={formData.clave_correo}
                        onChange={handleChange}
                        className="w-full p-2.5 border border-slate-200 rounded-lg text-[14px] focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none shadow-sm transition-all"
                        placeholder="correo"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="flex items-center gap-1.5 text-[13px] font-bold text-slate-700">
                      <Code2 size={14} /> Pixel de seguimiento
                    </label>
                    <textarea
                      name="pixel_tracking"
                      value={formData.pixel_tracking}
                      onChange={handleChange}
                      rows={6}
                      className="w-full p-3 border border-slate-200 rounded-lg text-[13px] font-mono focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none shadow-sm transition-all resize-none leading-relaxed"
                      placeholder="<script>...</script>"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Columna Derecha: Mockup Celular (CORREGIDO) */}
            <div className="w-full lg:w-[480px] bg-[#f1f5f9]/60 rounded-[3rem] p-8 flex flex-col justify-center items-center gap-5 border border-slate-100 shadow-inner min-h-[600px]">
               <div className="w-[280px] h-[540px] bg-white rounded-[3.5rem] border-[10px] border-[#0f172a] shadow-2xl relative overflow-hidden flex flex-col ring-4 ring-white">
                  
                  {/* Notch */}
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#0f172a] rounded-b-2xl z-30" />
                  
                  {/* Header WhatsApp */}
                  <div className="bg-[#005e54] pt-9 pb-3 px-4 text-white flex items-center gap-3 shrink-0">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-[18px]">👤</div>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold leading-none">WhatsApp</p>
                      <p className="text-[9px] opacity-70 flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> en línea
                      </p>
                    </div>
                  </div>

                  {/* Cuerpo del Chat */}
                  <div className="flex-1 bg-[#e5ddd5] relative overflow-hidden p-3" 
                       style={{ backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`, backgroundSize: '400px' }}>
                    
                    <div className="flex flex-col gap-2">
                      {formData.mensaje ? (
                        <div className="bg-[#e2ffc7] p-3 rounded-lg rounded-tr-none text-[12px] shadow-sm relative self-end ml-auto max-w-[85%] border border-black/5 animate-in fade-in slide-in-from-right-2">
                          <p className="text-slate-800 leading-snug whitespace-pre-wrap">{formData.mensaje}</p>
                          <div className="text-[9px] text-slate-500 text-right mt-1">1:47 PM ✓✓</div>
                        </div>
                      ) : (
                        <div className="mx-auto mt-20 bg-white/60 backdrop-blur-sm p-4 rounded-xl text-center text-slate-500 text-[11px] italic border border-white/40">
                          Vista previa del mensaje...
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Barra de Entrada (Corregida: Posición absoluta dentro de un área segura) */}
                  <div className="shrink-0 bg-[#f0f0f0] p-2 relative z-20">
                    <div className="flex items-center gap-2 px-1">
                      <div className="flex-1 bg-white h-9 rounded-full shadow-sm flex items-center px-4 justify-between border border-slate-200">
                        <span className="text-[11px] text-slate-300">Escribe un mensaje...</span>
                        <div className="flex gap-2 text-slate-400">
                           <Smile size={14} />
                           <Paperclip size={14} className="rotate-45" />
                           <Camera size={14} />
                        </div>
                      </div>
                      <div className="w-9 h-9 bg-[#00897b] rounded-full flex items-center justify-center text-white shadow-lg shrink-0">
                        <Mic size={16} />
                      </div>
                    </div>
                    {/* Home Indicator */}
                    <div className="w-24 h-1 bg-black/20 rounded-full mx-auto mt-3 mb-1" />
                  </div>
               </div>

               <div className="w-full max-w-[380px] bg-white rounded-2xl border border-indigo-100 shadow-sm p-3">
                 <label className="block text-[11px] font-bold uppercase tracking-wide text-slate-400 mb-2">Enlace corto final</label>
                 <div className="flex flex-col sm:flex-row gap-2">
                   <input
                     type="text"
                     readOnly
                     value={shortLink || 'Guarda cambios para generar tu link corto'}
                     className="flex-1 min-w-0 h-10 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[12px] text-slate-600 outline-none"
                   />
                   <button
                     type="button"
                     onClick={handleCopyLink}
                     disabled={!shortLink}
                     className="h-10 px-4 bg-[#5d5fef] disabled:bg-slate-300 text-white rounded-lg text-[12px] font-bold hover:bg-[#4a4ce0] transition-all flex items-center justify-center gap-2 active:scale-95"
                   >
                     {copyStatus === 'copied' ? <Check size={14} /> : <Copy size={14} />}
                     {copyStatus === 'copied' ? 'Copiado' : 'Copiar Enlace'}
                   </button>
                 </div>
                 {copyStatus === 'error' && (
                   <p className="mt-2 text-[11px] text-red-500 font-semibold">No se pudo copiar. Puedes seleccionar el enlace manualmente.</p>
                 )}
               </div>
            </div>
          </div>

          {/* Botones de Guardar */}
          {saveStatus && (
            <div className={`mt-8 rounded-lg border px-4 py-3 text-[13px] font-semibold ${
              saveStatus.type === 'success'
                ? 'bg-emerald-50 border-emerald-100 text-emerald-700'
                : 'bg-red-50 border-red-100 text-red-600'
            }`}>
              {saveStatus.text}
            </div>
          )}
          <div className="flex justify-end gap-3 mt-10 pt-6 border-t border-slate-200">
             <button onClick={() => navigate('/whalink')} className="px-10 py-2.5 border border-slate-300 rounded-lg text-[14px] font-bold text-slate-600 hover:bg-white transition-all active:scale-95">
               Cancelar
             </button>
             <button
               type="button"
               onClick={handleSubmit}
               disabled={loading}
               className="px-10 py-2.5 bg-[#5d5fef] disabled:bg-slate-300 text-white rounded-lg text-[14px] font-bold hover:bg-[#4a4ce0] shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 active:scale-95"
             >
               <Save size={16} /> {loading ? 'Guardando...' : (isEditing ? 'Actualizar cambios' : 'Guardar cambios')}
             </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WhalinkConfig;
