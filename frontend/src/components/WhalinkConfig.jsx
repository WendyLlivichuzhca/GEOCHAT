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

  const inputClass = "w-full bg-[#f0fdf9] border border-[#d1fae5] rounded-xl px-4 py-3 text-[14px] text-[#134e4a] placeholder:text-[#9ca3af] focus:outline-none focus:border-[#10b981] focus:ring-1 focus:ring-emerald-100 transition-all";

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

        <div className="max-w-6xl mx-auto w-full pb-8">
          {/* Breadcrumb */}
          <button onClick={() => navigate('/whalink')} className="mb-4 flex items-center gap-1.5 text-[13px] font-bold text-[#10b981] hover:text-[#059669] transition-colors">
            <ChevronLeft size={15} strokeWidth={3} /> Regresar a Whalinks
          </button>
          <h1 className="text-2xl font-black geopulse-text-gradient mb-6">
            {isEditing ? 'Editar link directo' : 'Crear link directo'}
          </h1>

          {/* Tabs */}
          <div className="flex gap-1 bg-white border border-[#d1fae5] rounded-2xl p-1 mb-8 w-fit">
            {[{ key: 'general', label: 'Opciones generales' }, { key: 'advanced', label: 'Opciones avanzadas' }].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`px-6 py-2.5 rounded-xl text-[14px] font-bold transition-all ${activeTab === tab.key ? 'bg-gradient-to-r from-[#10b981] to-[#0d9488] text-white shadow-lg shadow-emerald-200' : 'text-[#6b7280] hover:text-[#134e4a] hover:bg-[#f0fdf9]'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="flex flex-col lg:flex-row gap-8">
            {/* Columna Izquierda */}
            <div className="flex-1 space-y-5">
              {activeTab === 'general' ? (
                <>
                  <div className="bg-white border border-[#d1fae5] rounded-2xl p-6 space-y-5 shadow-sm">
                    {/* Dispositivo */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#6b7280] mb-2 uppercase tracking-wide">Número de WhatsApp *</label>
                      <select
                        name="deviceId"
                        value={formData.deviceId}
                        onChange={handleChange}
                        className={inputClass}
                        style={{ appearance: 'none' }}
                      >
                        <option value="">Selecciona un dispositivo</option>
                        {devices.map(d => (
                          <option key={d.id} value={d.id}>{d.nombre} ({d.numero_telefono})</option>
                        ))}
                      </select>
                    </div>

                    {/* Nombre */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#6b7280] mb-2 uppercase tracking-wide">Nombre *</label>
                      <div className="relative">
                        <input
                          type="text"
                          name="nombre"
                          value={formData.nombre}
                          onChange={handleChange}
                          placeholder="Ej: Clase gratuita"
                          maxLength={100}
                          className={inputClass}
                        />
                        <span className="absolute right-4 top-3.5 text-[11px] text-[#9ca3af]">{formData.nombre.length}/100</span>
                      </div>
                    </div>

                    {/* Mensaje */}
                    <div>
                      <label className="block text-[13px] font-bold text-[#6b7280] mb-2 uppercase tracking-wide">Mensaje predeterminado *</label>
                      <div className="relative">
                        <textarea
                          name="mensaje"
                          value={formData.mensaje}
                          onChange={handleChange}
                          rows={5}
                          maxLength={250}
                          className={`${inputClass} resize-none leading-relaxed`}
                          placeholder="Escribe el mensaje que enviará el contacto al hacer clic..."
                        />
                        <span className="absolute right-4 bottom-3 text-[11px] text-[#9ca3af]">{formData.mensaje.length}/250</span>
                      </div>
                      <div className="mt-3 p-4 bg-[#ecfdf5] rounded-xl border border-[#a7f3d0]">
                        <p className="text-[12px] text-[#059669] leading-relaxed">
                          <span className="font-bold">Mensaje predeterminado</span> que redirecciona al contacto a iniciar una conversación en WhatsApp. Las palabras de este mensaje se utilizarán para ejecutar acciones automáticas.
                        </p>
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white border border-[#d1fae5] rounded-2xl p-6 space-y-5 shadow-sm">
                  {/* Subir imagen */}
                  <div>
                    <label className="block text-[13px] font-bold text-[#6b7280] mb-2 uppercase tracking-wide">Imagen de portada</label>
                    <label className="flex min-h-[120px] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-[#a7f3d0] hover:border-[#10b981] bg-[#f0fdf9] hover:bg-[#ecfdf5] p-4 text-center transition-all">
                      {formData.imagen_url ? (
                        <img src={formData.imagen_url} alt="Vista previa" className="h-20 w-20 rounded-xl object-cover" />
                      ) : (
                        <>
                          <Upload size={22} className="text-[#10b981] mb-2" />
                          <span className="text-[13px] font-bold text-[#6b7280]">Seleccionar imagen</span>
                          <span className="text-[11px] text-[#9ca3af]">PNG, JPG o WEBP</span>
                        </>
                      )}
                      <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    </label>
                    {imageUploading && <p className="mt-2 text-[12px] text-[#10b981]">Subiendo imagen...</p>}
                  </div>

                  {/* Descripción */}
                  <div>
                    <label className="block text-[13px] font-bold text-[#6b7280] mb-2 uppercase tracking-wide">Descripción</label>
                    <textarea
                      name="descripcion"
                      value={formData.descripcion}
                      onChange={handleChange}
                      rows={3}
                      className={`${inputClass} resize-none`}
                      placeholder="Para qué sirve este link..."
                    />
                  </div>

                  {/* Claves */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#6b7280] mb-2 uppercase tracking-wide">
                        <KeyRound size={13} /> Clave nombre
                      </label>
                      <input type="text" name="clave_nombre" value={formData.clave_nombre} onChange={handleChange} className={inputClass} placeholder="nombre" />
                    </div>
                    <div>
                      <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#6b7280] mb-2 uppercase tracking-wide">
                        <KeyRound size={13} /> Clave correo
                      </label>
                      <input type="text" name="clave_correo" value={formData.clave_correo} onChange={handleChange} className={inputClass} placeholder="correo" />
                    </div>
                  </div>

                  {/* Pixel */}
                  <div>
                    <label className="flex items-center gap-1.5 text-[13px] font-bold text-[#6b7280] mb-2 uppercase tracking-wide">
                      <Code2 size={13} /> Pixel de seguimiento
                    </label>
                    <textarea
                      name="pixel_tracking"
                      value={formData.pixel_tracking}
                      onChange={handleChange}
                      rows={5}
                      className={`${inputClass} resize-none font-mono text-[12px]`}
                      placeholder="<script>...</script>"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Columna Derecha: Mockup */}
            <div className="w-full lg:w-[440px] bg-white border border-[#d1fae5] rounded-[2rem] p-8 flex flex-col items-center gap-6 shadow-sm">
              <p className="text-[11px] font-black text-[#9ca3af] uppercase tracking-widest">Vista previa</p>

              {/* Phone mockup */}
              <div className="w-[260px] h-[500px] bg-[#e5e7eb] rounded-[3rem] border-[10px] border-[#d1fae5] shadow-2xl relative overflow-hidden flex flex-col ring-2 ring-[#a7f3d0]">
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
              <div className="w-full bg-[#f0fdf9] rounded-2xl border border-[#d1fae5] p-4">
                <label className="block text-[10px] font-black text-[#9ca3af] uppercase tracking-widest mb-2">Enlace corto generado</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shortLink || 'Guarda para generar el link'}
                    className="flex-1 min-w-0 h-10 px-3 bg-white border border-[#d1fae5] rounded-xl text-[12px] text-[#6b7280] outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    disabled={!shortLink}
                    className="h-10 px-4 bg-gradient-to-r from-[#10b981] to-[#0d9488] disabled:bg-[#f0fdf9] disabled:text-[#9ca3af] text-white rounded-xl text-[12px] font-bold hover:opacity-90 transition-all flex items-center gap-2"
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
            <div className={`mt-6 rounded-xl border px-5 py-3 text-[13px] font-semibold ${saveStatus.type === 'success' ? 'bg-[#ecfdf5] border-[#a7f3d0] text-[#059669]' : 'bg-red-50 border-red-200 text-red-600'}`}>
              {saveStatus.text}
            </div>
          )}

          {/* Botones */}
          <div className="flex justify-end gap-3 mt-8 pt-6 border-t border-[#d1fae5]">
            <button
              onClick={() => navigate('/whalink')}
              className="px-8 py-3 rounded-xl bg-[#f0fdf9] border border-[#d1fae5] text-[14px] font-bold text-[#374151] hover:bg-[#ecfdf5] transition-all"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={loading}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-[#10b981] to-[#0d9488] disabled:opacity-60 text-white text-[14px] font-bold hover:opacity-90 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
            >
              <Save size={16} /> {loading ? 'Guardando...' : (isEditing ? 'Actualizar link' : 'Crear link')}
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default WhalinkConfig;
