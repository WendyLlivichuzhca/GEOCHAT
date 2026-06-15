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
      setSaveStatus({ type: 'success', text: data.message || (isEditing ? 'Whalink actualizado.' : 'Whalink creado con éxito.') });
      if (!isEditing) setTimeout(() => navigate('/whalink'), 1500);
    } catch (err) {
      console.error(err);
      setSaveStatus({ type: 'error', text: err.message || 'Error al guardar el Whalink.' });
    } finally { setLoading(false); }
  };

  const inputClass = "w-full h-11 rounded-xl bg-white border border-[#e2e8f0] px-4 text-[14px] text-[#1e293b] placeholder:text-[#cbd5e1] focus:outline-none focus:border-[#6366f1] focus:ring-1 focus:ring-indigo-100 transition-all shadow-sm";

  const isSubmitDisabled = loading || !formData.deviceId || !formData.nombre.trim() || !formData.mensaje.trim();

  return (
    <div className="flex min-h-screen bg-[#f5f5f6] font-sans text-[#1e293b] selection:bg-indigo-100">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex min-h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col">
          <div className="flex items-start justify-between px-2 mb-6">
            <div className="flex flex-col gap-1">
              <button 
                onClick={() => navigate('/whalink')}
                className="flex items-center gap-1.5 text-[14px] font-bold text-[#6366f1] hover:opacity-80 transition-opacity mb-1"
              >
                <ArrowLeft size={14} /> Regresar
              </button>
              <h1 className="text-2xl font-black text-[#1e293b]">
                {isEditing ? 'Actualizar link directo' : 'Crear link directo'}
              </h1>
            </div>
          </div>

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
              {activeTab === 'general' ? (
                <>
                  {/* Columna Izquierda: Opciones generales */}
                  <div className="flex-1 space-y-6">
                    {/* Dispositivo */}
                    <div className="px-2">
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">
                        Número de WhatsApp<span className="text-red-500">*</span>
                      </label>
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
                          <div className="flex items-center gap-2">
                            <span className="text-[#e2e8f0] font-light">|</span>
                            <div className={`transition-transform duration-200 ${showDeviceSelector ? 'rotate-180' : ''}`}>
                              <svg className="w-4 h-4 text-[#94a3b8]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                            </div>
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
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">
                        Nombre<span className="text-red-500">*</span>
                      </label>
                      <div className="relative flex items-center">
                        <input
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleChange}
                          maxLength={100}
                          placeholder="Escribe el nombre"
                          className={`${inputClass} pr-16`}
                          required
                        />
                        <span className="absolute right-4 text-[12px] text-[#cbd5e1] font-bold">
                          {formData.nombre.length}/100
                        </span>
                      </div>
                    </div>

                    {/* Mensaje */}
                    <div className="px-2">
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">
                        Mensaje predeterminado<span className="text-red-500">*</span>
                      </label>
                      <div className="relative">
                        <textarea
                          name="mensaje"
                          value={formData.mensaje}
                          onChange={handleChange}
                          rows={5}
                          maxLength={250}
                          placeholder="Escribe el mensaje"
                          className="w-full rounded-xl bg-white border border-[#e2e8f0] p-4 pr-16 text-[14px] text-[#1e293b] placeholder:text-[#cbd5e1] outline-none focus:border-[#6366f1] transition-all resize-none shadow-sm leading-relaxed"
                          required
                        />
                        <span className="absolute top-4 right-4 text-[12px] text-[#cbd5e1] font-bold">
                          {formData.mensaje.length}/250
                        </span>
                      </div>
                      <div className="mt-4 p-4 bg-[#f0f0ff] rounded-xl">
                        <p className="text-[12px] text-[#6366f1] leading-relaxed">
                          Mensaje predeterminado que redirecciona al contacto a iniciar una conversación en WhatsApp. Las palabras de este mensaje se utilizarán para ejecutar acciones automáticas.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Columna Derecha: Vista previa (Mockup) */}
                  <div className="w-full lg:w-[420px] bg-[#f4f6f9] rounded-[2rem] p-8 flex flex-col items-center justify-center gap-6">
                    {/* Phone mockup */}
                    <div className="w-[260px] h-[500px] bg-white rounded-[2.5rem] border-[10px] border-white shadow-2xl relative overflow-hidden flex flex-col ring-1 ring-slate-200">
                      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-28 h-5 bg-white rounded-b-xl z-30 flex items-center justify-center">
                        <div className="w-12 h-3 bg-black/10 rounded-full" />
                      </div>
                      
                      <div className="bg-[#075e54] pt-8 pb-3 px-4 text-white flex items-center justify-between shrink-0">
                        <div className="flex items-center gap-2">
                          <ArrowLeft size={16} className="text-white cursor-pointer" />
                          <div className="w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-[14px] overflow-hidden shrink-0">
                            <span>👤</span>
                          </div>
                          <div>
                            <p className="text-[12px] font-bold leading-none">WhatsApp</p>
                            <p className="text-[8px] opacity-75 flex items-center gap-1 mt-0.5">
                              <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" /> en línea
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5 opacity-80 text-xs">
                          <span>📹</span>
                          <span>📞</span>
                          <span>⋮</span>
                        </div>
                      </div>

                      <div className="flex-1 bg-[#efeae2] relative overflow-hidden p-3"
                        style={{ backgroundImage: `url('https://user-images.githubusercontent.com/15075759/28719144-86dc0f70-73b1-11e7-911d-60d70fcded21.png')`, backgroundSize: '400px' }}>
                        {formData.mensaje ? (
                          <div className="bg-[#e2ffc7] p-2.5 rounded-lg rounded-tr-none text-[11px] shadow-sm self-end ml-auto max-w-[85%] border border-black/5 float-right">
                            <p className="text-slate-800 leading-snug whitespace-pre-wrap">{formData.mensaje}</p>
                            <div className="text-[8px] text-slate-400 text-right mt-1">ahora ✓✓</div>
                          </div>
                        ) : null}
                      </div>

                      <div className="shrink-0 bg-[#f0f0f0] p-2">
                        <div className="flex items-center gap-2 px-1">
                          <div className="flex-1 bg-white h-8 rounded-full flex items-center px-3 justify-between border border-slate-200 shadow-sm">
                            <div className="flex items-center gap-2 text-slate-300">
                              <Smile size={14} className="text-slate-400" />
                              <span className="text-[10px] text-slate-400">Mensaje</span>
                            </div>
                            <div className="flex gap-2 text-slate-400">
                              <Paperclip size={13} className="rotate-45" />
                              <Camera size={13} />
                            </div>
                          </div>
                          <div className="w-8 h-8 bg-[#075e54] rounded-full flex items-center justify-center text-white shrink-0 shadow-sm">
                            <Mic size={14} />
                          </div>
                        </div>
                        <div className="w-20 h-1 bg-black/10 rounded-full mx-auto mt-2 mb-0.5" />
                      </div>
                    </div>

                    {/* Link corto generado */}
                    {shortLink && (
                      <div className="w-full bg-white rounded-2xl border border-[#e2e8f0] p-4 shadow-sm animate-in fade-in duration-200">
                        <label className="block text-[10px] font-black text-[#9ca3af] uppercase tracking-widest mb-2">Enlace corto generado</label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            readOnly
                            value={shortLink}
                            className="flex-1 min-w-0 h-10 px-3 bg-[#f8fafc] border border-[#e2e8f0] rounded-xl text-[12px] text-[#6b7280] outline-none"
                          />
                          <button
                            type="button"
                            onClick={handleCopyLink}
                            className="h-10 px-4 bg-[#6366f1] text-white rounded-xl text-[12px] font-bold hover:bg-[#4f46e5] transition-all flex items-center gap-2 shadow-sm"
                          >
                            {copyStatus === 'copied' ? <Check size={13} /> : <Copy size={13} />}
                            {copyStatus === 'copied' ? 'Copiado' : 'Copiar'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Opciones avanzadas: Dos columnas */
                <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-x-10 gap-y-6">
                  {/* Columna Izquierda */}
                  <div className="space-y-6">
                    {/* Imagen */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">Imagen</label>
                      <label className="flex w-24 h-24 cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#6366f1] bg-[#f8fafc] hover:bg-[#f5f3ff] p-4 text-center transition-all group relative overflow-hidden">
                        {formData.imagen_url ? (
                          <img src={formData.imagen_url} alt="Portada" className="w-full h-full object-cover rounded-lg" />
                        ) : (
                          <>
                            <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center mb-1 group-hover:bg-[#6366f1]/10 border border-[#e2e8f0]">
                              <Upload size={16} className="text-[#6366f1]" />
                            </div>
                            <span className="text-[11px] font-bold text-[#6366f1]">Imagen</span>
                          </>
                        )}
                        <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                      </label>
                      {imageUploading && <p className="mt-2 text-[11px] text-[#6366f1]">Subiendo...</p>}
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

                    {/* Pixel de seguimiento */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">pixel de seguimiento</label>
                      <textarea
                        name="pixel_tracking"
                        value={formData.pixel_tracking}
                        onChange={handleChange}
                        placeholder="Escribe pixel seguimiento"
                        className="w-full h-32 rounded-xl bg-white border border-[#e2e8f0] p-4 text-[14px] text-[#1e293b] placeholder:text-[#cbd5e1] outline-none focus:border-[#6366f1] transition-all resize-none shadow-sm font-mono text-[12px]"
                      />
                    </div>
                  </div>

                  {/* Columna Derecha */}
                  <div className="space-y-6">
                    {/* Descripción */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#475569] mb-2">Descripción</label>
                      <textarea
                        name="descripcion"
                        value={formData.descripcion}
                        onChange={handleChange}
                        placeholder="Escribe descripción"
                        className="w-full h-24 rounded-xl bg-white border border-[#e2e8f0] p-4 text-[14px] text-[#1e293b] placeholder:text-[#cbd5e1] outline-none focus:border-[#6366f1] transition-all resize-none shadow-sm"
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
                  </div>
                </div>
              )}
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
                type="button"
                onClick={() => navigate('/whalink')}
                className="h-11 px-10 rounded-xl border border-[#cbd5e1] text-[14px] font-bold text-[#475569] hover:bg-[#f8fafc] transition-all"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitDisabled}
                className={`h-11 px-10 rounded-xl text-[14px] font-bold transition-all flex items-center justify-center gap-2 min-w-[160px] ${
                  isSubmitDisabled
                    ? 'bg-[#e2e8f0] text-[#94a3b8] cursor-not-allowed shadow-none'
                    : 'bg-[#6366f1] hover:bg-[#4f46e5] text-white shadow-lg shadow-indigo-100'
                }`}
              >
                {loading ? 'Guardando...' : (isEditing ? 'Guardar cambios' : 'Crear link')}
              </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WhalinkConfig;
