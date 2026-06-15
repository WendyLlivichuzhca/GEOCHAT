import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronDown, Image as ImageIcon, Loader2, Plus, Settings2, Smile, Sparkles, Users, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const buildAuthHeaders = (user, extras = {}) => {
  const headers = { ...extras };
  if (user?.token) headers.Authorization = `Bearer ${user.token}`;
  return headers;
};

const typeLimits = {
  grupo: 1000,
  comunidad: 5000,
  canal: 10000,
};

const typeLabel = {
  grupo: 'Grupo',
  comunidad: 'Comunidad',
  canal: 'Canal',
};

const CrearCampana = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const [automaticCreation, setAutomaticCreation] = useState(true);
  const [tipo, setTipo] = useState('grupo');
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [devices, setDevices] = useState([]);
  const [selectedAdminId, setSelectedAdminId] = useState('');
  const [adminDropdownOpen, setAdminDropdownOpen] = useState(false);
  const [backupCountry, setBackupCountry] = useState('+57');
  const [backupPhone, setBackupPhone] = useState('');
  const [admins, setAdmins] = useState([]);
  const [messagePermission, setMessagePermission] = useState('admins');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const imageInputRef = useRef(null);

  useEffect(() => {
    const loadOptions = async () => {
      if (!user?.id) return;
      try {
        const response = await fetch(`${API_URL}/api/campanas/options?user_id=${user.id}`, {
          headers: buildAuthHeaders(user),
        });
        const result = await response.json();
        if (result.success) {
          setDevices(result.data?.devices || []);
        }
      } catch (err) {
        console.error('Error cargando opciones de campañas:', err);
      }
    };
    loadOptions();
  }, [user?.id]);

  const connectedDevices = useMemo(
    () => devices.filter((device) => device.estado === 'conectado'),
    [devices],
  );

  const selectedAdmin = useMemo(
    () => devices.find((device) => String(device.id) === String(selectedAdminId)),
    [devices, selectedAdminId],
  );

  const progress = useMemo(() => {
    let score = 0;
    if (nombre.trim()) score += 25;
    if (descripcion.trim()) score += 25;
    if (admins.length > 0) score += 35;
    if (messagePermission) score += 15;
    return score;
  }, [nombre, descripcion, admins.length, messagePermission]);

  const addConnectedAdmin = () => {
    if (!selectedAdmin || admins.some((admin) => admin.id === selectedAdmin.id)) return;
    setAdmins((current) => [...current, {
      id: selectedAdmin.id,
      nombre: selectedAdmin.nombre,
      telefono: selectedAdmin.numero_telefono,
      conectado: true,
    }]);
    setSelectedAdminId('');
  };

  const addBackupAdmin = () => {
    const phone = backupPhone.trim();
    if (!phone || admins.length === 0) return;
    const fullPhone = `${backupCountry}${phone}`.replace(/\s/g, '');
    setAdmins((current) => [...current, {
      id: `backup-${Date.now()}`,
      nombre: 'Backup',
      telefono: fullPhone,
      conectado: false,
    }]);
    setBackupPhone('');
  };

  const removeAdmin = (adminId) => {
    setAdmins((current) => current.filter((admin) => admin.id !== adminId));
  };

  const handleImageUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('user_id', user.id);
      const response = await fetch(`${API_URL}/api/campanas/upload-image?user_id=${user.id}`, {
        method: 'POST',
        headers: buildAuthHeaders(user),
        body: formData,
      });
      const result = await response.json();
      if (result.success) {
        setImageUrl(result.url);
      } else {
        setError(result.message || 'No se pudo subir la imagen.');
      }
    } catch (err) {
      console.error('Error subiendo imagen de campana:', err);
      setError('Error de red al subir la imagen.');
    } finally {
      setUploadingImage(false);
      if (event.target) event.target.value = '';
    }
  };

  const handleSubmit = async () => {
    setError('');
    if (!nombre.trim()) {
      setError('Escribe el nombre de la campaña.');
      return;
    }
    if (!descripcion.trim()) {
      setError('Agrega una descripción para la campaña.');
      return;
    }
    if (admins.length === 0) {
      setError('Debes agregar al menos 1 número conectado como administrador.');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${API_URL}/api/campanas?user_id=${user.id}`, {
        method: 'POST',
        headers: buildAuthHeaders(user, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          nombre: nombre.trim(),
          descripcion: descripcion.trim(),
          tipo,
          imagen_url: imageUrl || null,
          creacion_automatica: automaticCreation,
          mensajes_permiso: messagePermission,
          admins,
          dispositivo_id: admins.find((admin) => admin.conectado)?.id,
          max_participantes: typeLimits[tipo],
          estrategia: 'Paralelo',
        }),
      });
      const result = await response.json();
      if (result.success) {
        navigate('/campanas');
      } else {
        setError(result.message || 'No se pudo crear la campaña.');
      }
    } catch (err) {
      console.error('Error creando campaña:', err);
      setError('Error de red al crear la campaña.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f6] text-slate-950">
      <Sidebar onLogout={onLogout} user={user} />
      <main className="ml-24 min-h-screen rounded-l-[1.5rem] bg-white">
        <div className="flex min-h-screen flex-col px-8 py-8">
          <div className="mb-8 flex items-center justify-between">
            <button type="button" onClick={() => navigate('/campanas')} className="inline-flex items-center gap-2 text-lg font-bold">
              <ArrowLeft size={18} />
              Nueva campaña
            </button>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold">{progress} %</span>
              <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                <div className="h-full rounded-full bg-[#111114]" style={{ width: `${progress}%` }} />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 xl:grid-cols-[1fr_300px]">
            <div className="space-y-6">
              <section className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-5 py-4 shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200 text-slate-500">
                    <Users size={22} />
                  </div>
                  <div>
                    <p className="font-bold">Creación automática de grupos</p>
                    <p className="text-sm text-slate-500">Los grupos se crearán automáticamente cuando se vayan llenando</p>
                  </div>
                </div>
                <button type="button" onClick={() => setAutomaticCreation((value) => !value)} className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${automaticCreation ? 'bg-[#111124]' : 'bg-slate-300'}`}>
                  <span className={`h-5 w-5 rounded-full bg-white shadow transition ${automaticCreation ? 'translate-x-5' : ''}`} />
                </button>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex gap-5">
                  <div>
                    <input ref={imageInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                    <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploadingImage} className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-slate-200 text-xs text-slate-500 disabled:opacity-60">
                      {uploadingImage ? <Loader2 size={18} className="animate-spin" /> : <ImageIcon size={18} />}
                      Subir imagen
                      <span className="text-[10px]">Max. 8MB</span>
                    </button>
                    {imageUrl && <img src={imageUrl} alt="" className="mt-2 h-20 w-20 rounded-xl object-cover" />}
                  </div>
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {['grupo', 'comunidad', 'canal'].map((value) => (
                        <button key={value} type="button" onClick={() => setTipo(value)} className={`inline-flex h-10 items-center gap-2 rounded-full border px-4 text-sm font-bold transition ${tipo === value ? 'border-slate-200 bg-slate-100' : 'border-slate-200 bg-white'}`}>
                          {value === 'canal' ? '▻' : <Users size={15} />}
                          {typeLabel[value]}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold">Nombre *</label>
                      <div className="relative">
                        <input value={nombre} onChange={(event) => setNombre(event.target.value)} placeholder="Ej: Comunidad Funnelchat" className="h-10 w-full rounded-full border border-slate-200 px-4 pr-20 outline-none focus:border-[#625dde]" />
                        <Smile size={16} className="absolute right-12 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Sparkles size={16} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" />
                      </div>
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold">Descripción *</label>
                  <div className="relative">
                    <textarea value={descripcion} onChange={(event) => setDescripcion(event.target.value)} placeholder="Describe brevemente el propósito de esta campaña..." className="h-16 w-full resize-none rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[#625dde]" />
                    <Smile size={16} className="absolute right-12 top-5 text-slate-400" />
                    <Sparkles size={16} className="absolute right-5 top-5 text-slate-400" />
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-4 font-bold">Administradores *</p>
                {admins.length === 0 && (
                  <div className="mb-5 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                    <X size={17} className="rounded-full bg-red-500 p-0.5 text-white" />
                    Debes agregar al menos 1 número conectado como administrador.
                  </div>
                )}
                {admins.length > 0 && (
                  <div className="mb-5 flex flex-wrap gap-2">
                    {admins.map((admin) => (
                      <span key={admin.id} className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-semibold">
                        {admin.nombre} · {admin.telefono}
                        <button type="button" onClick={() => removeAdmin(admin.id)} className="text-slate-400 hover:text-red-500"><X size={14} /></button>
                      </span>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Números conectados</p>
                    <div className="relative">
                      <button type="button" onClick={() => setAdminDropdownOpen((open) => !open)} className="flex h-10 w-full items-center justify-between rounded-full border border-slate-200 px-4 text-left text-sm text-slate-500">
                        {selectedAdmin ? `${selectedAdmin.nombre} (${selectedAdmin.numero_telefono || 'sin número'})` : 'Seleccionar número'}
                        <ChevronDown size={16} />
                      </button>
                      {adminDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
                          {connectedDevices.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-slate-500">No hay números conectados</p>
                          ) : connectedDevices.map((device) => (
                            <button key={device.id} type="button" onClick={() => { setSelectedAdminId(device.id); setAdminDropdownOpen(false); }} className="block w-full px-4 py-3 text-left text-sm hover:bg-slate-50">
                              {device.nombre} · {device.numero_telefono}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-orange-500">Los administradores deben estar en los contactos del número creador</p>
                    {selectedAdmin && <button type="button" onClick={addConnectedAdmin} className="mt-3 rounded-full bg-[#111114] px-4 py-2 text-sm font-bold text-white">Agregar administrador</button>}
                  </div>
                  <div>
                    <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Añadir backup</p>
                    <div className="flex gap-2">
                      <select value={backupCountry} onChange={(event) => setBackupCountry(event.target.value)} className="h-10 rounded-full border border-slate-200 px-3 text-sm text-slate-500">
                        <option value="+57">+57</option>
                        <option value="+593">+593</option>
                        <option value="+52">+52</option>
                        <option value="+51">+51</option>
                      </select>
                      <input value={backupPhone} onChange={(event) => setBackupPhone(event.target.value)} disabled={admins.length === 0} placeholder="Primero agrega un admin conectado" className="h-10 flex-1 rounded-full border border-slate-200 px-4 text-sm outline-none disabled:bg-slate-50" />
                      <button type="button" onClick={addBackupAdmin} disabled={admins.length === 0 || !backupPhone.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white disabled:bg-slate-300"><Plus size={18} /></button>
                    </div>
                    <p className="mt-2 text-xs text-orange-500">Primero selecciona un número conectado para poder añadir backups</p>
                  </div>
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <p className="mb-3 font-bold">¿Quién puede enviar mensajes?</p>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {[
                    ['admins', 'Solo admins'],
                    ['todos', 'Todos'],
                  ].map(([value, label]) => (
                    <button key={value} type="button" onClick={() => setMessagePermission(value)} className={`flex h-12 items-center gap-3 rounded-xl border px-4 text-left font-semibold ${messagePermission === value ? 'bg-slate-100' : 'bg-white'}`}>
                      <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${messagePermission === value ? 'border-black bg-black text-white' : 'border-slate-200'}`}>
                        {messagePermission === value && <Check size={12} />}
                      </span>
                      {label}
                    </button>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="flex w-full items-center justify-between px-5 py-4 font-bold">
                  <span className="flex items-center gap-3"><Settings2 size={18} />Configuración avanzada <span className="text-xs font-normal text-slate-500">(opcional)</span></span>
                  <ChevronDown size={18} className={advancedOpen ? 'rotate-180' : ''} />
                </button>
                {advancedOpen && (
                  <div className="border-t border-slate-100 px-5 py-4 text-sm text-slate-500">
                    La estrategia inicial se guardará como Paralelo. Las reglas avanzadas se conectarán cuando agreguemos las siguientes pantallas.
                  </div>
                )}
              </section>

              {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">{error}</div>}
            </div>

            <aside className="hidden xl:block">
              <div className="sticky top-8 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="bg-[#1f5b51] p-4 text-white">
                  <div className="flex items-start gap-3">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-emerald-500">
                      <Users size={24} />
                    </div>
                    <div>
                      <p className="font-bold">{nombre || 'Comunidad Funnelchat #1'}</p>
                      <p className="text-xs font-semibold">{typeLabel[tipo]} · {typeLimits[tipo]} participantes</p>
                    </div>
                  </div>
                  {imageUrl && <img src={imageUrl} alt="" className="mt-4 h-24 w-full rounded-lg object-cover" />}
                  <div className="my-5 border-t border-white/70" />
                  <p className="text-xs font-bold uppercase">Descripción</p>
                  <p className="mt-2 text-sm font-semibold">{descripcion || 'Agrega una descripción para tu grupo...'}</p>
                </div>
                <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
                  <span className="font-semibold">Numeración:</span> Al final
                  <span className="float-right">Máx. {typeLimits[tipo]}</span>
                </div>
                <div className="p-4">
                  <p className="mb-4 font-bold">Información</p>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Tipo</span><b>{typeLabel[tipo]}</b></div>
                    <div className="flex justify-between"><span className="text-slate-500">Admins</span><b>{admins.length}</b></div>
                    <div className="flex justify-between"><span className="text-slate-500">Máx. participantes</span><b>{typeLimits[tipo]}</b></div>
                    <div className="flex justify-between"><span className="text-slate-500">Estrategia</span><b>Paralelo</b></div>
                  </div>
                </div>
              </div>
            </aside>
          </div>

          <div className="mt-8 flex items-center justify-end gap-6 border-t border-slate-200 pt-6">
            <button type="button" onClick={() => navigate('/campanas')} className="font-semibold">Cancelar</button>
            <button type="button" disabled={saving} onClick={handleSubmit} className="inline-flex h-10 items-center gap-2 rounded-full bg-[#111114] px-6 font-bold text-white disabled:opacity-60">
              {saving && <Loader2 size={16} className="animate-spin" />}
              Crear campaña
            </button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CrearCampana;
