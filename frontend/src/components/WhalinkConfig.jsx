import React, { useState, useEffect } from 'react';
import { Save, Bell, ChevronLeft, Send, Smile, Paperclip, Camera, Mic, Copy, Check, Upload, Code2, KeyRound, ArrowLeft } from 'lucide-react';
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
  const [showDeviceSelector, setShowDeviceSelector] = useState(false);

  const getDeviceColor = (index) => {
    const colors = ['#ec4899', '#f59e0b', '#10b981', '#6366f1', '#8b5cf6'];
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
      if (!user?.id || !id) return;
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
          clave_nombre: link.clave_nombre || 'nombre',
          clave_correo: link.clave_correo || 'correo',
          pixel_tracking: link.pixel_tracking || ''
        });
        setShortLink(link.short_url || '');
      } catch (err) {
        console.error(err);
        setSaveStatus({ type: 'error', text: err.message || 'Error al cargar el Whalink.' });
      } finally { setLoading(false); }
    };
    fetchWhalink();
  }, [user?.id, id]);

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
      setSaveStatus({ type: 'success', text: data.message || (isEditing ? 'Whalink actualizado.' : 'Whalink creado con éxito.') });
      if (!isEditing) setTimeout(() => navigate('/whalink'), 1500);
    } catch (err) {
      console.error(err);
      setSaveStatus({ type: 'error', text: err.message || 'Error al guardar el Whalink.' });
    } finally { setLoading(false); }
  };

  const inputClass = "w-full h-11 rounded-xl bg-white border border-[#e2e8f0] px-4 text-[14px] text-[#1e293b] placeholder:text-[#94a3b8] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-indigo-100 transition-all shadow-sm";

  return (
    <div className="flex min-h-screen bg-[#f0fdf9] font-sans text-[#134e4a] selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0">
        {/* Header */}
        <header className="h-[72px] bg-white border border-[#d1fae5] shadow-sm rounded-3xl flex items-center justify-between px-8 sticky top-0 z-50 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#ecfdf5] rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-[#a7f3d0] shrink-0">
              <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
            </div>
            <span className="text-[20px] font-black tracking-tight uppercase geopulse-text-gradient">GeoCHAT</span>
          </div>
          <div className="flex items-center gap-5">
            <Bell size={20} className="text-[#9ca3af]" />
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[#10b981] to-[#0891b2] flex items-center justify-center text-[13px] font-black text-white">
              {user?.nombre?.charAt(0) || 'W'}
            </div>
          </div>
        </header>

        <div className="flex-1 flex flex-col">
          <div className="flex items-start justify-between px-2 mb-6">
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => navigate('/whalink')}
                className="flex items-center gap-2 text-[13px] font-bold text-[#6366f1] hover:opacity-80 transition-opacity mb-1"
              >
                <ArrowLeft size={14} /> Regresar al listado
              </button>
              <h1 className="text-2xl font-black text-[#134e4a]">
                {isEditing ? 'Actualizar link directo' : 'Crear nuevo link'}
              </h1>
              <p className="text-[14px] text-[#64748b]">Configure los parámetros de su enlace de WhatsApp y visualice el resultado en tiempo real.</p>
            </div>
          </div>

          <div className="bg-white border border-[#d1fae5] rounded-[2rem] shadow-sm p-8 lg:p-12 flex-1 flex flex-col mb-8 overflow-visible">
            <div className="flex border-b border-[#e2e8f0] mb-10 gap-10">
              <button
                onClick={() => setActiveTab('general')}
                className={`pb-4 text-[14px] font-bold transition-all border-b-2 ${activeTab === 'general' ? 'border-[#6366f1] text-[#6366f1]' : 'border-transparent text-[#94a3b8] hover:text-[#64748b]'}`}
              >
                Opciones generales
              </button>
              <button
                onClick={() => setActiveTab('advanced')}
                className={`pb-4 text-[14px] font-bold transition-all border-b-2 ${activeTab === 'advanced' ? 'border-[#6366f1] text-[#6366f1]' : 'border-transparent text-[#94a3b8] hover:text-[#64748b]'}`}
              >
                Opciones avanzadas
              </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-10 flex-1">
              {/* Columna Izquierda */}
              <div className="flex-1 space-y-5">
                {activeTab === 'general' && (
                  <div className="space-y-6">
                    {/* Dispositivo */}
                    <div className="px-2">
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">Número de WhatsApp *</label>
                      <div className="relative">
                        <button
                          type="button"
                          onClick={() => setShowDeviceSelector(!showDeviceSelector)}
                          className={`${inputClass} flex items-center justify-between text-left`}
                        >
                          {selectedDevice ? (
                            <div className="flex items-center gap-3">
                              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getDeviceColor(devices.indexOf(selectedDevice)) }} />
                              <span>{selectedDevice.nombre} ({selectedDevice.numero_telefono ? String(selectedDevice.numero_telefono).slice(-4) : 'S/N'})</span>
                            </div>
                          ) : (
                            <span className="text-[#94a3b8]">Selecciona un dispositivo</span>
                          )}
                          <div className={`transition-transform duration-200 ${showDeviceSelector ? 'rotate-180' : ''}`}>
                            <svg className="w-4 h-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                          </div>
                        </button>

                        {showDeviceSelector && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowDeviceSelector(false)} />
                            <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-[#e2e8f0] rounded-xl shadow-xl z-[60] py-2 max-h-[240px] overflow-y-auto custom-scrollbar animate-in fade-in zoom-in duration-200">
                              {devices.length === 0 && (
                                <p className="px-4 py-3 text-[13px] text-[#94a3b8] italic">No hay dispositivos conectados</p>
                              )}
                              {devices.map((d, i) => (
                                <button
                                  key={d.id}
                                  type="button"
                                  onClick={() => {
                                    setFormData(prev => ({ ...prev, deviceId: d.id }));
                                    setShowDeviceSelector(false);
                                  }}
                                  className={`w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[#f8fafc] transition-colors ${String(formData.deviceId) === String(d.id) ? 'bg-[#f1f5f9]' : ''}`}
                                >
                                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: getDeviceColor(i) }} />
                                  <div className="flex flex-col">
                                    <span className={`text-[14px] font-bold ${String(formData.deviceId) === String(d.id) ? 'text-[#1e293b]' : 'text-[#475569]'}`}>{d.nombre}</span>
                                    <span className="text-[12px] text-[#94a3b8]">({d.numero_telefono ? String(d.numero_telefono).slice(-4) : 'S/N'})</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Nombre */}
                    <div className="px-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[13px] font-bold text-[#475569]">Nombre *</label>
                        <span className="text-[11px] text-[#94a3b8] font-bold">{formData.nombre.length}/100</span>
                      </div>
                      <input
                        type="text"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        maxLength={100}
                        placeholder="Escribe el nombre"
                        className={inputClass}
                        required
                      />
                    </div>

                    {/* Mensaje */}
                    <div className="px-2">
                      <div className="flex items-center justify-between mb-2">
                        <label className="text-[13px] font-bold text-[#475569]">Mensaje predeterminado *</label>
                        <span className="text-[11px] text-[#94a3b8] font-bold">{formData.mensaje.length}/250</span>
                      </div>
                      <textarea
                        name="mensaje"
                        value={formData.mensaje}
                        onChange={handleChange}
                        rows={5}
                        maxLength={250}
                        placeholder="Escribe el mensaje"
                        className="w-full rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-4 text-[14px] text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-indigo-100 transition-all resize-none shadow-sm leading-relaxed"
                        required
                      />
                      <div className="mt-4 p-4 bg-[#f5f3ff] rounded-xl border border-[#e0e7ff]">
                        <p className="text-[12px] text-[#6366f1] leading-relaxed">
                          Mensaje predeterminado que redirecciona al contacto a iniciar una conversación en WhatsApp. Las palabras de este mensaje se utilizarán para ejecutar acciones automáticas.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'advanced' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6 px-2">
                    {/* Imagen */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">Imagen</label>
                      <label className="flex w-32 h-32 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#6366f1] bg-[#f8fafc] hover:bg-[#f5f3ff] p-4 text-center transition-all group">
                        {formData.imagen_url ? (
                          <img src={formData.imagen_url} alt="Portada" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <>
                            <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center mb-2 group-hover:bg-[#6366f1]/10 border border-[#e2e8f0]">
                              <Upload size={18} className="text-[#6366f1]" />
                            </div>
                            <span className="text-[12px] font-bold text-[#6366f1]">Imagen</span>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      {imageUploading && <p className="mt-2 text-[11px] text-[#6366f1]">Subiendo...</p>}
                    </div>

                    {/* Descripción */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">Descripción</label>
                      <textarea
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleChange}
                        placeholder="Escribe descripción"
                        className="w-full h-32 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-4 text-[14px] text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#6366f1] transition-all resize-none shadow-sm"
                      />
                    </div>

                    {/* Clave Correo */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">Clave de correo electrónico</label>
                      <input
                        type="text"
                        name="clave_correo"
                        value={formData.clave_correo}
                        onChange={handleChange}
                        placeholder="Escribe Clave de correo electrónico"
                        className={inputClass}
                      />
                    </div>

                    {/* Clave Nombre */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">Clave de nombre</label>
                      <input
                        type="text"
                        name="clave_nombre"
                        value={formData.clave_nombre}
                        onChange={handleChange}
                        placeholder="Escribe clave de nombre"
                        className={inputClass}
                      />
                    </div>

                    {/* Pixel */}
                    <div className="lg:col-span-2">
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">pixel de seguimiento</label>
                      <textarea
                        name="pixel_tracking"
                        value={formData.pixel_tracking}
                        onChange={handleChange}
                        placeholder="Escribe pixel seguimiento"
                        className="w-full h-32 rounded-xl bg-[#f8fafc] border border-[#e2e8f0] p-4 text-[14px] text-[#1e293b] placeholder:text-[#94a3b8] outline-none focus:border-[#6366f1] transition-all resize-none shadow-sm font-mono text-[12px]"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Columna Derecha: Mockup */}
              <div className="w-full lg:w-[420px] bg-[#f8fafc] border border-[#e2e8f0] rounded-[2.5rem] p-8 flex flex-col items-center gap-6 shadow-inner">
                <p className="text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">Vista previa</p>

                {/* Phone mockup */}
                <div className="w-[260px] h-[500px] bg-[#e5e7eb] rounded-[3rem] border-[10px] border-white shadow-2xl relative overflow-hidden flex flex-col ring-1 ring-slate-200">
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-6 bg-[#d1d5db] rounded-b-2xl z-30" />
                  <div className="bg-[#005e54] pt-8 pb-3 px-4 text-white flex items-center gap-3 shrink-0">
                    <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-[16px]">👤</div>
                    <div>
                      <p className="text-[13px] font-bold leading-none">WhatsApp</p>
                      <p className="text-[9px] opacity-70 flex items-center gap-1 mt-1">
                        <span className="w-1.5 h-1.5 bg-green-400 rounded-full" /> en línea
                      </p>
                    </div>
                  </div>
                  <div className="flex-1 bg-[#e5ddd5] relative overflow-hidden p-3"
                    style={{ backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`, backgroundSize: '400px' }}>
                    {formData.mensaje ? (
                      <div className="bg-[#e2ffc7] p-3 rounded-lg rounded-tr-none text-[12px] shadow-sm self-end ml-auto max-w-[90%] border border-black/5 float-right">
                        <p className="text-slate-800 leading-snug whitespace-pre-wrap">{formData.mensaje}</p>
                        <div className="text-[9px] text-slate-500 text-right mt-1">ahora ✓✓</div>
                      </div>
                    ) : (
                      <div className="mx-auto mt-20 bg-white/60 backdrop-blur-sm p-4 rounded-xl text-center text-slate-500 text-[11px] italic border border-white/40">
                        Vista previa del mensaje...
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 bg-[#f0f0f0] p-2">
                    <div className="flex items-center gap-2 px-1">
                      <div className="flex-1 bg-white h-8 rounded-full flex items-center px-3 justify-between border border-slate-200">
                        <span className="text-[10px] text-slate-300">Mensaje...</span>
                        <div className="flex gap-1.5 text-slate-400"><Smile size={13} /><Paperclip size={13} className="rotate-45" /><Camera size={13} /></div>
                      </div>
                      <div className="w-8 h-8 bg-[#00897b] rounded-full flex items-center justify-center text-white shrink-0">
                        <Mic size={14} />
                      </div>
                    </div>
                    <div className="w-20 h-1 bg-black/10 rounded-full mx-auto mt-2 mb-0.5" />
                  </div>
                </div>

                {/* Link corto */}
                <div className="w-full bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm">
                  <label className="block text-[10px] font-black text-[#9ca3af] uppercase tracking-widest mb-2">Enlace corto generado</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      readOnly
                      value={shortLink || 'Guarda para generar el link'}
                      className="flex-1 min-w-0 h-10 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[12px] text-[#6b7280] outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleCopyLink}
                      disabled={!shortLink}
                      className="h-10 px-4 bg-[#10b981] disabled:bg-[#f1f5f9] disabled:text-[#9ca3af] text-white rounded-xl text-[12px] font-bold hover:opacity-90 transition-all flex items-center gap-2 shadow-sm"
                    >
                      {copyStatus === 'copied' ? <Check size={13} /> : <Copy size={13} />}
                      {copyStatus === 'copied' ? 'Copiado' : 'Copiar'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Status mensaje */}
            {saveStatus && (
              <div className={`mt-8 rounded-xl border px-5 py-3 text-[13px] font-semibold ${saveStatus.type === 'success' ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#059669]' : 'bg-red-50 border-red-200 text-red-600'}`}>
                {saveStatus.text}
              </div>
            )}

            {/* Botones */}
            <div className="flex justify-end gap-3 mt-10 pt-8 border-t border-[#e2e8f0]">
              <button
                onClick={() => navigate('/whalink')}
                className="h-11 px-10 rounded-xl border border-[#cbd5e1] text-[14px] font-bold text-[#475569] hover:bg-[#f8fafc] transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="h-11 px-10 rounded-xl bg-[#6366f1] disabled:opacity-60 text-white text-[14px] font-bold hover:opacity-90 shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 min-w-[160px]"
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
