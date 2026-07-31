import React, { useState, useEffect } from 'react';
import { Save, Bell, ChevronLeft, Send, Smile, Paperclip, Camera, Mic, Copy, Check, Upload, Code2, KeyRound, ArrowLeft } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';

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
    clave_nombre: '',
    clave_correo: '',
    pixel_tracking: ''
  });
  const [loading, setLoading] = useState(false);
  const [generatedLink, setGeneratedLink] = useState('');
  const [shortLink, setShortLink] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [saveStatus, setSaveStatus] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const getDeviceColor = (index) => {
    const colors = ['#ec4899', '#f59e0b', '#10b981', '#0ea5e9', '#0ea5e9'];
    return colors[index % colors.length];
  };

  const selectedDevice = devices.find(d => String(d.id) === String(formData.deviceId));
  const selectedPhone = selectedDevice?.numero_telefono || '';

  const cleanPhoneNumber = (value) => String(value || '').replace(/\D/g, '');
  const buildWhalink = (phoneNumber, message) => {
    const cleanNumber = cleanPhoneNumber(phoneNumber);
    if (!cleanNumber) return '';
    const encodedMessage = encodeURIComponent(message || '');
    return encodedMessage ? `https://wa.me/${cleanNumber}?text=${encodedMessage}` : `https://wa.me/${cleanNumber}`;
  };

  useEffect(() => {
    const fetchDevices = async () => {
      try {
        const res = await fetch(`${API_URL}/api/dashboard/${user.id}`);
        const data = await res.json();
        if (data.success && data.dashboard.dispositivos) {
          setDevices(data.dashboard.dispositivos);
          if (data.dashboard.dispositivos.length > 0 && !isEditing) {
            setFormData(prev => prev.deviceId ? prev : ({ ...prev, deviceId: data.dashboard.dispositivos[0].id }));
          }
        }
      } catch (err) { console.error(err); }
    };
    if (user?.id) fetchDevices();
  }, [user, isEditing]);

  useEffect(() => {
    const fetchWhalink = async () => {
      if (!user?.id) return;
      if (!id) {
        setFormData(prev => ({
          deviceId: prev.deviceId || devices[0]?.id || '',
          nombre: '',
          mensaje: '',
          imagen_url: '',
          descripcion: '',
          clave_nombre: '',
          clave_correo: '',
          pixel_tracking: ''
        }));
        setShortLink('');
        setSaveStatus(null);
        setCopyStatus('');
        return;
      }
      setLoading(true); setSaveStatus(null);
      try {
        const res = await fetch(`${API_URL}/api/whalink/${id}?user_id=${user.id}`);
        const data = await res.json();
        if (!res.ok || !data.success) throw new Error(data.message || 'No se pudo cargar el Whalink.');
        const link = data.link || {};
        setFormData({
          deviceId: link.device_id || '',
          nombre: link.nombre || '',
          mensaje: link.mensaje || '',
          imagen_url: link.imagen_url || '',
          descripcion: link.descripcion || '',
          clave_nombre: link.clave_nombre || '',
          clave_correo: link.clave_correo || '',
          pixel_tracking: link.pixel_tracking || ''
        });
        setShortLink(link.short_url || '');
      } catch (err) {
        console.error(err);
        setSaveStatus({ type: 'error', text: err.message || 'Error al cargar el Whalink.' });
      } finally { setLoading(false); }
    };
    fetchWhalink();
  }, [user?.id, id, devices]);

  useEffect(() => {
    setGeneratedLink(buildWhalink(selectedPhone, formData.mensaje));
  }, [selectedPhone, formData.mensaje]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setShortLink(''); setCopyStatus(''); setSaveStatus(null);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageUploading(true); setSaveStatus(null);
    try {
      const payload = new FormData();
      payload.append('user_id', user.id);
      payload.append('image', file);
      const res = await fetch(`${API_URL}/api/whalink/upload-image`, { method: 'POST', body: payload });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.success) throw new Error(data.message || 'No se pudo subir la imagen.');
      setFormData(prev => ({ ...prev, imagen_url: data.imagen_url || '' }));
    } catch (err) {
      console.error(err);
      setSaveStatus({ type: 'error', text: err.message || 'Error al subir la imagen.' });
    } finally { setImageUploading(false); e.target.value = ''; }
  };

  const handleCopyLink = async () => {
    if (!shortLink) return;
    try {
      await navigator.clipboard.writeText(shortLink);
      setCopyStatus('copied'); setTimeout(() => setCopyStatus(''), 1800);
    } catch (err) { setCopyStatus('error'); setTimeout(() => setCopyStatus(''), 2500); }
  };

  const handleSubmit = async () => {
    if (!user?.id) { setSaveStatus({ type: 'error', text: 'No se pudo identificar el usuario.' }); return; }
    if (!formData.deviceId || !formData.nombre.trim() || !formData.mensaje.trim() || !generatedLink) {
      setSaveStatus({ type: 'error', text: 'Completa el dispositivo, nombre y mensaje.' }); return;
    }
    setLoading(true); setSaveStatus(null);
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
      if (!res.ok || !data.success) throw new Error(data.message || 'No se pudo guardar el Whalink.');
      const nextShortLink = data.short_url || data.link?.short_url || '';
      setShortLink(nextShortLink);
      navigate('/whalink');
    } catch (err) {
      console.error(err);
      setSaveStatus({ type: 'error', text: err.message || 'Error al guardar el Whalink.' });
    } finally { setLoading(false); }
  };

  const inputClass = "w-full h-10 rounded-xl bg-white border border-slate-200 px-3.5 text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs";

  const isSubmitDisabled = loading || !formData.deviceId || !formData.nombre.trim() || !formData.mensaje.trim();

  return (
    <div className="flex h-screen bg-transparent font-sans text-slate-900 selection:bg-emerald-100/50 overflow-hidden">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-20 h-screen flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
        <Header
          user={user}
          onLogout={onLogout}
          title="GeoChat"
        />

        <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-5 flex-1 flex flex-col min-h-0 overflow-y-auto custom-scrollbar">
          
          {/* HEADER SECTION WITH PILL BACK BUTTON & SPACIOUS MARGINS */}
          <div className="mb-6 shrink-0 pb-5 border-b border-slate-100">
            <div className="mb-6">
              <button
                onClick={() => navigate('/whalink')}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-100/80 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 font-bold text-xs border border-slate-200/60 hover:border-emerald-200/80 transition-all shadow-2xs hover:shadow-xs group cursor-pointer"
              >
                <div className="w-5 h-5 rounded-lg bg-white group-hover:bg-emerald-500 text-slate-500 group-hover:text-white flex items-center justify-center transition-colors shadow-2xs">
                  <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
                </div>
                <span>Volver al listado</span>
              </button>
            </div>

            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {isEditing ? 'Actualizar link directo' : 'Crear link directo'}
            </h1>
          </div>

          {/* TAB BAR */}
          <div className="flex border-b border-slate-100 mb-8 gap-8 shrink-0">
            <button
              onClick={() => setActiveTab('general')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'general' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              Opciones generales
            </button>
            <button
              onClick={() => setActiveTab('advanced')}
              className={`pb-3 text-xs font-bold transition-all border-b-2 cursor-pointer ${
                activeTab === 'advanced' ? 'border-emerald-500 text-emerald-600' : 'border-transparent text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              Opciones avanzadas
            </button>
          </div>

          <div className="flex flex-col lg:flex-row gap-8 flex-1">
            {activeTab === 'general' ? (
              <>
                {/* Columna Izquierda: Opciones generales */}
                <div className="flex-1 space-y-5">
                  {/* Dispositivo / Número de WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Número de WhatsApp<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                        className={`${inputClass} flex items-center justify-between text-left cursor-pointer`}
                      >
                        {selectedDevice ? (
                          <div className="flex items-center gap-2.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getDeviceColor(devices.indexOf(selectedDevice)) }} />
                            <span className="font-semibold text-slate-800">{selectedDevice.nombre} ({selectedDevice.numero_telefono ? String(selectedDevice.numero_telefono) : 'S/N'})</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 font-medium">Selecciona un dispositivo</span>
                        )}
                        <div className="flex items-center gap-2">
                          <span className="text-slate-200">|</span>
                          <div className={`transition-transform duration-200 ${showDeviceSelector ? 'rotate-180' : ''}`}>
                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </div>
                      </button>

                      {showDeviceSelector && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowDeviceSelector(false)} />
                          <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-xl shadow-xl z-[60] py-1.5 max-h-[240px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-150">
                            {devices.length === 0 && (
                              <p className="px-4 py-3 text-xs text-slate-400 italic">No hay dispositivos conectados</p>
                            )}
                            {devices.map((d, i) => (
                              <button
                                key={d.id}
                                type="button"
                                onClick={() => {
                                  setFormData(prev => ({ ...prev, deviceId: d.id }));
                                  setShowDeviceSelector(false);
                                }}
                                className={`w-full text-left px-3.5 py-2.5 flex items-center gap-3 hover:bg-slate-50 transition-colors ${String(formData.deviceId) === String(d.id) ? 'bg-emerald-50/60' : ''}`}
                              >
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: getDeviceColor(i) }} />
                                <div className="flex flex-col">
                                  <span className={`text-xs font-bold ${String(formData.deviceId) === String(d.id) ? 'text-emerald-700' : 'text-slate-800'}`}>{d.nombre}</span>
                                  <span className="text-[11px] text-slate-400">({d.numero_telefono ? String(d.numero_telefono) : 'S/N'})</span>
                                </div>
                              </button>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Nombre */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Nombre<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        maxLength={100}
                        placeholder="Ej. Promoción Verano"
                        className={`${inputClass} pr-16`}
                        required
                      />
                      <span className="absolute right-3.5 text-[11px] text-slate-300 font-bold">
                        {formData.nombre.length}/100
                      </span>
                    </div>
                  </div>

                  {/* Mensaje predeterminado */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">
                      Mensaje predeterminado<span className="text-rose-500 ml-0.5">*</span>
                    </label>
                    <div className="relative">
                      <textarea
                        name="mensaje"
                        value={formData.mensaje}
                        onChange={handleChange}
                        rows={4}
                        maxLength={250}
                        placeholder="Escribe el mensaje con el que tus clientes se contactarán..."
                        className="w-full rounded-xl bg-white border border-slate-200 p-3.5 pr-16 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all resize-none shadow-2xs leading-relaxed"
                        required
                      />
                      <span className="absolute top-3.5 right-3.5 text-[11px] text-slate-300 font-bold">
                        {formData.mensaje.length}/250
                      </span>
                    </div>
                    <div className="mt-3 p-3 bg-emerald-50/60 border border-emerald-100/80 rounded-xl">
                      <p className="text-[11.5px] text-emerald-700 font-medium leading-relaxed">
                        Mensaje predeterminado que enviará el contacto al iniciar la conversación en WhatsApp.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Columna Derecha: Vista previa (Mockup WhatsApp) */}
                <div className="w-full lg:w-[320px] bg-gradient-to-b from-slate-50 to-slate-100/60 border border-slate-100 rounded-2xl p-5 flex flex-col items-center justify-center gap-4 shrink-0">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Vista previa</p>
                  {/* Phone mockup */}
                  <div className="w-[210px] h-[390px] bg-white rounded-[2.2rem] border-[7px] border-slate-700 shadow-[0_20px_60px_rgba(0,0,0,0.18)] relative overflow-hidden flex flex-col">
                    {/* Notch */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-16 h-3 bg-slate-700 rounded-b-xl z-30 flex items-center justify-center">
                      <div className="w-7 h-1.5 bg-slate-900 rounded-full" />
                    </div>

                    {/* WhatsApp Header */}
                    <div className="bg-[#075e54] pt-5 pb-2 px-2.5 text-white flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-1.5">
                        <ArrowLeft size={11} className="text-white shrink-0" />
                        <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center text-[9px] font-bold uppercase shrink-0">
                          {selectedDevice?.nombre?.charAt(0) || 'W'}
                        </div>
                        <div>
                          <p className="text-[9px] font-bold leading-none">{selectedDevice?.nombre || 'WhatsApp'}</p>
                          <p className="text-[7px] text-emerald-200 flex items-center gap-0.5 mt-0.5">
                            <span className="w-1 h-1 bg-emerald-400 rounded-full animate-pulse" /> en línea
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* WhatsApp Chat Body */}
                    <div className="flex-1 bg-[#efeae2] relative overflow-hidden p-2 flex flex-col justify-end"
                      style={{ backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`, backgroundSize: '280px' }}>
                      {formData.mensaje ? (
                        <div className="bg-[#dcf8c6] p-2 rounded-lg rounded-tr-none text-[9.5px] shadow-2xs self-end ml-auto max-w-[90%] border border-emerald-200/40">
                          <p className="text-slate-800 leading-snug whitespace-pre-wrap">{formData.mensaje}</p>
                          <div className="text-[7px] text-slate-400 text-right mt-0.5 font-medium">10:38</div>
                        </div>
                      ) : (
                        <div className="bg-white/80 p-2 rounded-lg text-[9px] text-slate-400 italic text-center mx-auto shadow-2xs">
                          Escribe un mensaje para ver la vista previa
                        </div>
                      )}
                    </div>

                    {/* WhatsApp Input Bar */}
                    <div className="shrink-0 bg-[#f0f0f0] p-1 border-t border-slate-200">
                      <div className="flex items-center gap-1 px-0.5">
                        <div className="flex-1 bg-white h-6 rounded-full flex items-center px-2 justify-between border border-slate-200 shadow-2xs">
                          <div className="flex items-center gap-1 text-slate-400">
                            <Smile size={10} />
                            <span className="text-[8px]">Mensaje</span>
                          </div>
                          <div className="flex gap-1 text-slate-400">
                            <Paperclip size={9} className="rotate-45" />
                            <Camera size={9} />
                          </div>
                        </div>
                        <div className="w-6 h-6 bg-[#075e54] rounded-full flex items-center justify-center text-white shrink-0 shadow-2xs">
                          <Mic size={10} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </>
            ) : (
              /* Opciones avanzadas: Dos columnas */
              <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
                {/* Columna Izquierda */}
                <div className="space-y-5">
                  {/* Imagen */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Imagen de portada</label>
                    <label className="flex w-28 h-28 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-emerald-300 bg-emerald-50/40 hover:bg-emerald-50 p-3 text-center transition-all group relative overflow-hidden shadow-2xs">
                      {formData.imagen_url ? (
                        <img src={formData.imagen_url} alt="Portada" className="w-full h-full object-cover rounded-lg" />
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-1 group-hover:bg-emerald-100 border border-emerald-200 transition-colors">
                            <Upload size={14} className="text-emerald-600" />
                          </div>
                          <span className="text-xs font-bold text-emerald-700">Subir imagen</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {imageUploading && <p className="mt-1.5 text-xs text-emerald-600 font-bold">Subiendo imagen...</p>}
                  </div>

                  {/* Clave Correo */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Clave de correo electrónico</label>
                    <input
                      type="text"
                      name="clave_correo"
                      value={formData.clave_correo}
                      onChange={handleChange}
                      placeholder="Escribe clave de correo electrónico"
                      className={inputClass}
                    />
                  </div>

                  {/* Pixel de seguimiento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Pixel de seguimiento</label>
                    <textarea
                      name="pixel_tracking"
                      value={formData.pixel_tracking}
                      onChange={handleChange}
                      placeholder="Pega aquí el código del Pixel de seguimiento (Meta / Google)"
                      className="w-full h-28 rounded-xl bg-white border border-slate-200 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all resize-none shadow-2xs font-mono"
                    />
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-5">
                  {/* Descripción */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Descripción</label>
                    <textarea
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      placeholder="Escribe una breve descripción del enlace..."
                      className="w-full h-28 rounded-xl bg-white border border-slate-200 p-3.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all resize-none shadow-2xs"
                    />
                  </div>

                  {/* Clave Nombre */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Clave de nombre</label>
                    <input
                      type="text"
                      name="clave_nombre"
                      value={formData.clave_nombre}
                      onChange={handleChange}
                      placeholder="Escribe clave de nombre"
                      className={inputClass}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Status mensaje */}
          {saveStatus && (
            <div className={`mt-6 rounded-xl border px-4 py-3 text-xs font-bold ${
              saveStatus.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}>
              {saveStatus.text}
            </div>
          )}

          {/* Botones de acción inferior */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={() => navigate('/whalink')}
              className="px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitDisabled}
              className={`px-6 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 min-w-[140px] cursor-pointer ${
                isSubmitDisabled
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white shadow-2xs active:scale-95'
              }`}
            >
              {loading ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear link')}
            </button>
          </div>
        </div>
      </div>
    </main>
    </div>
  );
};

export default WhalinkConfig;
