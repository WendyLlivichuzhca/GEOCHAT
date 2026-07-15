import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Check, ChevronDown, Hash, Image as ImageIcon, Link as LinkIcon, Loader2, Plus, RotateCcw, Send, Settings2, Shield, ShieldCheck, Smile, Sparkles, Tag, Trash2, Users, X, Zap, Lock } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';
import PhoneInput from 'react-phone-input-2';
import 'react-phone-input-2/lib/style.css';
import EmojiPicker from 'emoji-picker-react';

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
  const [backupPhone, setBackupPhone] = useState('');
  const [admins, setAdmins] = useState([]);
  const [nameVariations, setNameVariations] = useState([]);
  const [showNameVariations, setShowNameVariations] = useState(false);
  const [messagePermission, setMessagePermission] = useState('admins');
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [maxParticipants, setMaxParticipants] = useState(typeLimits.grupo);
  const [maxClicks, setMaxClicks] = useState(1000);
  const [visitDistribution, setVisitDistribution] = useState('equilibrado');
  const [rememberVisitorGroup, setRememberVisitorGroup] = useState(true);
  const [reserveGroups, setReserveGroups] = useState(0);
  const [numberPosition, setNumberPosition] = useState('final');
  const [numberStart, setNumberStart] = useState(1);
  const [customDomain, setCustomDomain] = useState('groups.funnelchat.com');
  const [customPath, setCustomPath] = useState('');
  const [tagEntry, setTagEntry] = useState('');
  const [tagExit, setTagExit] = useState('');
  const [trackingCode, setTrackingCode] = useState('');
  const [silentProtection, setSilentProtection] = useState(false);
  const [commentModeration, setCommentModeration] = useState(false);
  const [allowsIAGrupos, setAllowsIAGrupos] = useState(false);
  const [imageUrl, setImageUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const imageInputRef = useRef(null);

  const [showNameEmoji, setShowNameEmoji] = useState(false);
  const [showDescEmoji, setShowDescEmoji] = useState(false);
  const nameEmojiRef = useRef(null);
  const descEmojiRef = useRef(null);
  const nameInputRef = useRef(null);
  const descTextareaRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (nameEmojiRef.current && !nameEmojiRef.current.contains(event.target)) {
        setShowNameEmoji(false);
      }
      if (descEmojiRef.current && !descEmojiRef.current.contains(event.target)) {
        setShowDescEmoji(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const insertEmoji = (inputElement, currentVal, setVal, emoji) => {
    if (!inputElement) {
      setVal((prev) => prev + emoji);
      return;
    }
    const start = inputElement.selectionStart || 0;
    const end = inputElement.selectionEnd || 0;
    const before = currentVal.substring(0, start);
    const after = currentVal.substring(end);
    setVal(before + emoji + after);
    
    setTimeout(() => {
      inputElement.focus();
      inputElement.setSelectionRange(start + emoji.length, start + emoji.length);
    }, 0);
  };

  const [availableTags, setAvailableTags] = useState([]);

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

        const resDash = await fetch(`${API_URL}/api/dashboard/${user.id}`, {
          headers: buildAuthHeaders(user),
        });
        if (resDash.ok) {
          const dataDash = await resDash.json();
          setAllowsIAGrupos(dataDash.plan?.features?.ia_grupos || false);
        }

        const tagsResp = await fetch(`${API_URL}/api/tags`, {
          headers: buildAuthHeaders(user),
        });
        const tagsResult = await tagsResp.json();
        if (tagsResult.success) {
          setAvailableTags(tagsResult.tags || []);
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

  const typePlural = {
    grupo: 'grupos',
    comunidad: 'comunidades',
    canal: 'canales',
  }[tipo];
  const typeArticlePlural = tipo === 'comunidad' ? 'Las' : 'Los';

  const createPermissionLabel = {
    grupo: 'Crear grupos',
    comunidad: 'Crear comunidades',
    canal: 'Crear canales',
  }[tipo];

  const creatorAdmin = useMemo(
    () => admins.find((admin) => admin.conectado),
    [admins],
  );

  useEffect(() => {
    setMaxParticipants(typeLimits[tipo]);
  }, [tipo]);

  const progress = useMemo(() => {
    let score = 0;
    if (nombre.trim()) score += 33;
    if (descripcion.trim()) score += 34;
    if (tipo === 'canal' ? creatorAdmin : admins.length >= 2) score += 33;
    return Math.min(score, 100);
  }, [nombre, descripcion, admins.length, creatorAdmin, tipo]);

  const generateNameVariations = () => {
    const cleanName = nombre.trim();
    if (!cleanName) return;
    const words = cleanName.split(/\s+/);
    const mainWord = words[0] || cleanName;
    const tail = words.slice(1).join(' ');
    
    const variants = [];
    if (tail) {
      variants.push(`${tail} Conexión`);
      variants.push(`Red ${tail}`);
      variants.push(`${mainWord} Geográfica`);
      variants.push(`Grupo ${tail}`);
    } else {
      variants.push(`${mainWord} Conexión`);
      variants.push(`Red ${mainWord}`);
      variants.push(`${mainWord} Geográfica`);
    }
    setNameVariations([...new Set(variants.filter((item) => item !== cleanName))].slice(0, 3));
    setShowNameVariations(true);
  };

  const removeNameVariation = (index) => {
    setNameVariations((current) => current.filter((_, itemIndex) => itemIndex !== index));
  };

  const generateDescription = () => {
    const cleanName = nombre.trim() || `${typeLabel[tipo]} Funnelchat`;
    const itemLabel = typeLabel[tipo].toLowerCase();
    setDescripcion(`Espacio oficial de ${cleanName} para compartir novedades, recursos y acompañamiento con todos los miembros del ${itemLabel}.`);
  };

  const addConnectedAdmin = (device = selectedAdmin) => {
    if (!device || admins.some((admin) => admin.id === device.id)) return;
    const adminPayload = {
      id: device.id,
      nombre: device.nombre,
      telefono: device.numero_telefono,
      conectado: true,
      permisos: { crear_grupos: true, enviar_mensajes: true, acciones: true },
    };
    if (tipo === 'canal') {
      setAdmins([adminPayload]);
    } else {
      setAdmins((current) => [...current, adminPayload]);
    }
    setSelectedAdminId('');
  };

  const addBackupAdmin = () => {
    const phone = backupPhone.trim();
    if (!phone || admins.length === 0) return;
    const fullPhone = phone.startsWith('+') ? phone : `+${phone}`;
    setAdmins((current) => [...current, {
      id: `backup-${Date.now()}`,
      nombre: 'Backup',
      telefono: fullPhone,
      conectado: false,
      permisos: { crear_grupos: true, enviar_mensajes: true, acciones: true },
    }]);
    setBackupPhone('');
  };

  const removeAdmin = (adminId) => {
    setAdmins((current) => current.filter((admin) => admin.id !== adminId));
  };

  const toggleAdminPermission = (adminId, permission) => {
    setAdmins((current) => current.map((admin) => {
      if (admin.id !== adminId) return admin;
      return {
        ...admin,
        permisos: {
          ...admin.permisos,
          [permission]: !admin.permisos?.[permission],
        },
      };
    }));
  };

  const adminsMissingPermissions = admins.filter((admin) => (
    !admin.permisos?.crear_grupos || !admin.permisos?.enviar_mensajes || !admin.permisos?.acciones
  ));

  const linkPreview = useMemo(() => {
    const cleanPath = customPath.trim().replace(/^\/+/, '');
    return `https://${customDomain || 'go.wha.link'}/${cleanPath || 'auto-generado'}`;
  }, [customDomain, customPath]);

  const numberedExample = useMemo(() => {
    const baseName = nombre.trim() || 'Geo Conexiones';
    const index = Number(numberStart) || 1;
    return numberPosition === 'inicio' ? `# ${index} ${baseName}` : `${baseName} # ${index}`;
  }, [nombre, numberPosition, numberStart]);

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
    if (tipo === 'canal') {
      if (!creatorAdmin) {
        setError('Selecciona el número creador que administrará el canal.');
        return;
      }
    } else {
      if (admins.length < 2) {
        setError('Agrega mínimo 2 administradores. Puede ser 2 conectados o 1 conectado + 1 backup.');
        return;
      }
      if (adminsMissingPermissions.length > 0) {
        setError(`Todos los administradores deben tener permisos de ${createPermissionLabel}, Enviar mensajes y Acciones.`);
        return;
      }
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
          link: linkPreview,
          nombre_variaciones: nameVariations,
          configuracion_avanzada: {
            max_participantes: Number(maxParticipants) || typeLimits[tipo],
            max_clicks: Number(maxClicks) || 1000,
            distribucion_visitas: visitDistribution,
            recordar_grupo_visitante: rememberVisitorGroup,
            grupos_reserva: Number(reserveGroups) || 0,
            numeracion: {
              posicion: numberPosition,
              comienza_en: Number(numberStart) || 1,
              ejemplo: numberedExample,
            },
            link_personalizado: {
              dominio: allowsIAGrupos ? customDomain : 'go.wha.link',
              ruta: allowsIAGrupos ? customPath.trim().replace(/^\/+/, '') : '',
              preview: allowsIAGrupos ? linkPreview : `https://go.wha.link/${short_code || 'auto-generado'}`,
            },
            tags_seguimiento: {
              entrada: tagEntry,
              salida: tagExit,
            },
            codigo_seguimiento: trackingCode,
            proteccion_silenciosa: allowsIAGrupos ? silentProtection : false,
            moderacion_comentarios: allowsIAGrupos ? commentModeration : false,
          },
          dispositivo_id: admins.find((admin) => admin.conectado)?.id,
          max_participantes: Number(maxParticipants) || typeLimits[tipo],
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
    <div className="flex min-h-screen bg-[#f5f5f6] text-slate-950">
      <Sidebar onLogout={onLogout} user={user} />
      <main className="ml-28 mr-5 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="flex min-h-full flex-col overflow-y-auto px-8 py-7">
          <div className="mb-6 flex items-center justify-between">
            <button type="button" onClick={() => navigate('/campanas')} className="inline-flex items-center gap-2 text-base font-bold">
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
                    <p className="font-bold">Creación automática de {typePlural}</p>
                    <p className="text-sm text-slate-500">{typeArticlePlural} {typePlural} se crearán automáticamente cuando se vayan llenando</p>
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
                          {value === 'canal' ? <Send size={15} /> : <Users size={15} />}
                          {typeLabel[value]}
                        </button>
                      ))}
                    </div>
                    <div>
                      <label className="mb-2 block text-sm font-bold">Nombre *</label>
                      <div className="relative" ref={nameEmojiRef}>
                        <input
                          ref={nameInputRef}
                          value={nombre}
                          onChange={(event) => { setNombre(event.target.value); setShowNameVariations(false); }}
                          placeholder="Ej: Comunidad Funnelchat"
                          className="h-10 w-full rounded-full border border-slate-200 px-4 pr-20 outline-none focus:border-[#625dde]"
                        />
                        <button
                          type="button"
                          onClick={() => setShowNameEmoji((prev) => !prev)}
                          className="absolute right-12 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#625dde] transition-colors"
                          title="Insertar emoji"
                        >
                          <Smile size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={generateNameVariations}
                          className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#625dde]"
                          title="Generar variaciones con IA para evitar bloqueos"
                        >
                          <Sparkles size={16} />
                        </button>

                        {showNameEmoji && (
                          <div className="absolute right-0 top-full z-50 mt-2 shadow-2xl border border-slate-200 rounded-2xl overflow-hidden bg-white">
                            <EmojiPicker
                              onEmojiClick={(emojiData) => {
                                insertEmoji(nameInputRef.current, nombre, setNombre, emojiData.emoji);
                                setShowNameEmoji(false);
                              }}
                              width={320}
                              height={380}
                              searchDisabled
                              skinTonesDisabled
                              previewConfig={{ showPreview: false }}
                            />
                          </div>
                        )}
                      </div>
                      {showNameVariations && nameVariations.length > 0 && (
                        <div className="mt-3 space-y-3">
                          <div className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                            <ShieldCheck size={18} className="mt-0.5" />
                            <div>
                              <p className="text-sm font-bold">Protección anti-bloqueo activa</p>
                              <p className="text-xs">Cada {tipo} usará una variación diferente del nombre, reduciendo el riesgo de que WhatsApp bloquee tu cuenta por crear {typePlural} con nombres idénticos.</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between text-sm text-slate-600">
                            <span>{nameVariations.length + 1} variaciones ({nameVariations.length} + original)</span>
                            <div className="flex items-center gap-2">
                              <button type="button" onClick={generateNameVariations} className="text-slate-500 hover:text-[#625dde]" title="Regenerar variaciones"><RotateCcw size={16} /></button>
                              <button type="button" onClick={() => { setShowNameVariations(false); setNameVariations([]); }} className="text-slate-500 hover:text-red-500" title="Quitar variaciones"><X size={16} /></button>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">ORIGINAL</span>
                              <span>{nombre}</span>
                            </div>
                            {nameVariations.map((variation, index) => (
                              <div key={`${variation}-${index}`} className="flex h-10 items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm">
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-700">#{index + 1}</span>
                                  <span>{variation}</span>
                                </div>
                                <button type="button" onClick={() => removeNameVariation(index)} className="text-red-300 hover:text-red-500" title="Eliminar variación"><Trash2 size={14} /></button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="mt-5">
                  <label className="mb-2 block text-sm font-bold">Descripción *</label>
                  <div className="relative" ref={descEmojiRef}>
                    <textarea
                      ref={descTextareaRef}
                      value={descripcion}
                      onChange={(event) => setDescripcion(event.target.value)}
                      placeholder="Describe brevemente el propósito de esta campaña..."
                      className="h-16 w-full resize-none rounded-2xl border border-slate-200 px-4 py-4 outline-none focus:border-[#625dde] pr-20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowDescEmoji((prev) => !prev)}
                      className="absolute right-12 top-5 text-slate-400 hover:text-[#625dde] p-1 rounded-full hover:bg-slate-100 transition-colors"
                      title="Insertar emoji"
                    >
                      <Smile size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={generateDescription}
                      className="absolute right-4 top-4 flex h-7 w-7 items-center justify-center rounded-full text-slate-400 hover:bg-slate-100 hover:text-[#625dde]"
                      title="Generar descripción con IA"
                    >
                      <Sparkles size={16} />
                    </button>

                    {showDescEmoji && (
                      <div className="absolute right-0 top-full z-50 mt-2 shadow-2xl border border-slate-200 rounded-2xl overflow-hidden bg-white">
                        <EmojiPicker
                          onEmojiClick={(emojiData) => {
                            insertEmoji(descTextareaRef.current, descripcion, setDescripcion, emojiData.emoji);
                            setShowDescEmoji(false);
                          }}
                          width={320}
                          height={380}
                          searchDisabled
                          skinTonesDisabled
                          previewConfig={{ showPreview: false }}
                        />
                      </div>
                    )}
                  </div>
                </div>
                {(nombre.trim() || descripcion.trim()) && (
                  <div className="mt-4 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-emerald-700">
                    <Check size={17} className="mt-0.5 rounded-full border border-emerald-500 p-0.5" />
                    <div>
                      <p className="text-sm font-bold">Contenido válido</p>
                      <p className="text-xs">{descripcion.trim() ? 'Contenido cumple con las políticas de WhatsApp.' : 'Análisis sin problemas detectados.'}</p>
                    </div>
                  </div>
                )}
              </section>

              <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                {tipo === 'canal' ? (
                  <>
                    <p className="mb-2 font-bold">Número creador *</p>
                    <p className="mb-4 text-sm text-slate-500">Selecciona el número conectado que creará y administrará los canales</p>
                    {creatorAdmin && (
                      <div className="mb-5 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">GEO</div>
                            <div>
                              <div className="flex items-center gap-2">
                                <p className="font-bold">{creatorAdmin.nombre}</p>
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                              </div>
                              <p className="text-xs text-slate-500">{creatorAdmin.telefono}</p>
                            </div>
                          </div>
                          <button type="button" onClick={() => removeAdmin(creatorAdmin.id)} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
                        </div>
                      </div>
                    )}
                    <div className="max-w-xl">
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
                              <button key={device.id} type="button" onClick={() => { addConnectedAdmin(device); setAdminDropdownOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50">
                                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                <span>
                                  <span className="block font-semibold text-slate-900">{device.nombre} ({String(device.numero_telefono || '').slice(-4)})</span>
                                  <span className="text-[11px] font-extrabold uppercase text-emerald-600">Conectado</span>
                                </span>
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="mb-4 font-bold">Administradores *</p>
                    <div className={`mb-5 flex items-center gap-3 rounded-lg border px-4 py-3 text-sm font-semibold ${admins.length === 0 ? 'border-red-200 bg-red-50 text-red-600' : admins.length < 2 ? 'border-orange-200 bg-orange-50 text-orange-600' : 'border-emerald-200 bg-emerald-50 text-emerald-700'}`}>
                      {admins.length < 2 ? <AlertTriangle size={17} /> : <Check size={17} />}
                      {admins.length === 0 ? 'Debes agregar al menos 1 número conectado como administrador.' : admins.length < 2 ? 'Mínimo 2 administradores (pueden ser 2 conectados o 1 conectado + 1 backup)' : 'Administradores completos'}
                    </div>
                    {adminsMissingPermissions.length > 0 && (
                      <div className="mb-5 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                        <AlertTriangle size={17} />
                        Falta al menos 1 admin con: {createPermissionLabel}, Enviar mensajes, Acciones
                      </div>
                    )}
                    {admins.length > 0 && (
                      <div className="mb-5 space-y-3">
                        {admins.map((admin) => (
                          <div key={admin.id} className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-xs font-bold text-slate-500 shadow-sm">
                                  {admin.conectado ? 'GEO' : 'BK'}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-bold">{admin.nombre}</p>
                                    <span className={`h-2 w-2 rounded-full ${admin.conectado ? 'bg-emerald-500' : 'bg-orange-400'}`} />
                                  </div>
                                  <p className="text-xs text-slate-500">{admin.telefono}</p>
                                </div>
                              </div>
                              <button type="button" onClick={() => removeAdmin(admin.id)} className="text-slate-400 hover:text-red-500"><X size={16} /></button>
                            </div>
                            <div className="mt-3 flex flex-wrap gap-2">
                              {[
                                ['crear_grupos', createPermissionLabel],
                                ['enviar_mensajes', 'Enviar mensajes'],
                                ['acciones', 'Acciones'],
                              ].map(([permission, label]) => (
                                <button key={permission} type="button" onClick={() => toggleAdminPermission(admin.id, permission)} className={`inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-semibold ${admin.permisos?.[permission] ? 'bg-slate-200 text-slate-950' : 'bg-white text-slate-400 ring-1 ring-slate-200'}`}>
                                  <span className={`flex h-3 w-3 items-center justify-center rounded-sm border ${admin.permisos?.[permission] ? 'border-slate-800 bg-slate-800 text-white' : 'border-slate-300'}`}>
                                    {admin.permisos?.[permission] && <Check size={9} />}
                                  </span>
                                  {label}
                                </button>
                              ))}
                            </div>
                          </div>
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
                                <button key={device.id} type="button" onClick={() => { addConnectedAdmin(device); setAdminDropdownOpen(false); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm hover:bg-slate-50 disabled:opacity-50" disabled={admins.some((admin) => admin.id === device.id)}>
                                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                  <span>
                                    <span className="block font-semibold text-slate-900">{device.nombre} ({String(device.numero_telefono || '').slice(-4)})</span>
                                    <span className="text-[11px] font-extrabold uppercase text-emerald-600">Conectado</span>
                                  </span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-xs text-orange-500">Los administradores deben estar en los contactos del número creador</p>
                      </div>
                      <div>
                        <p className="mb-2 text-xs font-semibold uppercase text-slate-500">Añadir backup</p>
                        <div className="flex gap-2">
                          <div className="flex-1 phone-input-container">
                            <PhoneInput
                              country={'co'}
                              preferredCountries={['co', 'ec', 'pe', 'mx', 'ar', 'es', 'us']}
                              value={backupPhone}
                              onChange={(phone) => setBackupPhone(phone)}
                              disabled={admins.length === 0}
                              placeholder="Primero agrega un admin conectado"
                              inputStyle={{
                                width: '100%',
                                height: '40px',
                                borderRadius: '9999px',
                                border: '1px solid #e2e8f0',
                                fontSize: '14px',
                                fontWeight: '600',
                                backgroundColor: admins.length === 0 ? '#f8fafc' : '#ffffff',
                                color: '#0f172a',
                                paddingLeft: '48px'
                              }}
                              buttonStyle={{
                                backgroundColor: admins.length === 0 ? '#f8fafc' : '#ffffff',
                                border: '1px solid #e2e8f0',
                                borderRight: '0',
                                borderRadius: '9999px 0 0 9999px',
                                paddingLeft: '8px',
                                zIndex: 10
                              }}
                              dropdownStyle={{
                                borderRadius: '12px',
                                marginTop: '4px',
                                boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                                border: '1px solid #e2e8f0',
                                width: '280px',
                                textAlign: 'left'
                              }}
                            />
                          </div>
                          <button type="button" onClick={addBackupAdmin} disabled={admins.length === 0 || !backupPhone.trim()} className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-700 text-white disabled:bg-slate-300"><Plus size={18} /></button>
                        </div>
                        <p className="mt-2 text-xs text-orange-500">Primero selecciona un número conectado para poder añadir backups</p>
                      </div>
                    </div>
                  </>
                )}
              </section>

              {tipo === 'comunidad' && (
                <section className="flex items-center justify-between rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                      <Shield size={17} />
                    </div>
                    <p className="font-bold">Moderación de comentarios</p>
                    {!allowsIAGrupos && (
                      <span className="bg-amber-50 text-amber-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border border-amber-100/50 tracking-wide uppercase select-none flex items-center gap-0.5">
                        <Lock size={8} /> Pro
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!allowsIAGrupos) {
                        alert("La moderación automática de comentarios con IA es exclusiva de los planes Advanced. Mejora tu plan.");
                        return;
                      }
                      setCommentModeration((value) => !value);
                    }}
                    className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${commentModeration && allowsIAGrupos ? 'bg-[#111124]' : 'bg-slate-300'}`}
                  >
                    <span className={`h-5 w-5 rounded-full bg-white shadow transition ${commentModeration && allowsIAGrupos ? 'translate-x-5' : ''}`} />
                  </button>
                </section>
              )}

              {tipo !== 'canal' && (
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
              )}

              <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
                <button type="button" onClick={() => setAdvancedOpen((open) => !open)} className="flex w-full items-center justify-between px-5 py-4 font-bold">
                  <span className="flex items-center gap-3"><Settings2 size={18} />Configuración avanzada <span className="text-xs font-normal text-slate-500">(opcional)</span></span>
                  <ChevronDown size={18} className={advancedOpen ? 'rotate-180' : ''} />
                </button>
                {advancedOpen && (
                  <div className="space-y-7 border-t border-slate-100 px-5 py-5 text-sm">
                    {tipo !== 'canal' && (
                      <>
                        <div>
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Users size={17} /></div>
                            <div>
                              <p className="font-bold">Límites de capacidad</p>
                              <p className="text-xs text-slate-500">Define cuántas personas pueden unirse a cada {tipo}</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <label className="block">
                              <span className="mb-2 block text-xs font-bold">Máximo de participantes por {tipo}</span>
                              <input type="number" min="1" value={maxParticipants} onChange={(event) => setMaxParticipants(event.target.value)} className="h-10 w-full rounded-full border border-slate-200 px-4 outline-none focus:border-[#625dde]" />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-xs font-bold">Máximo de clics por {tipo}</span>
                              <input type="number" min="1" value={maxClicks} onChange={(event) => setMaxClicks(event.target.value)} className="h-10 w-full rounded-full border border-slate-200 px-4 outline-none focus:border-[#625dde]" />
                            </label>
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Zap size={17} /></div>
                            <div>
                              <p className="font-bold">Distribución de visitas</p>
                              <p className="text-xs text-slate-500">Controla cómo se llenan tus {typePlural} cuando llegan nuevos participantes</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                            {[
                              ['equilibrado', 'Equilibrado', `Las personas se distribuyen entre todos los ${typePlural} para mantenerlos balanceados`],
                              ['uno_a_la_vez', 'Uno a la vez', `Llena un ${tipo} completamente antes de pasar al siguiente`],
                            ].map(([value, label, help]) => (
                              <button key={value} type="button" onClick={() => setVisitDistribution(value)} className={`rounded-xl border px-4 py-4 text-left ${visitDistribution === value ? 'bg-slate-100' : 'bg-white'}`}>
                                <span className="flex items-center gap-3 font-bold">
                                  <span className={`flex h-5 w-5 items-center justify-center rounded-full border ${visitDistribution === value ? 'border-black bg-black text-white' : 'border-slate-200'}`}>{visitDistribution === value && <Check size={12} />}</span>
                                  {label}
                                </span>
                                <span className="mt-2 block pl-8 text-xs text-slate-500">{help}</span>
                              </button>
                            ))}
                          </div>
                          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4">
                            <div>
                              <p className="font-bold">Recordar {tipo} del visitante</p>
                              <p className="text-xs text-slate-500">Si alguien visita el link otra vez, lo enviamos al mismo {tipo} donde entró antes</p>
                            </div>
                            <button type="button" onClick={() => setRememberVisitorGroup((value) => !value)} className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${rememberVisitorGroup ? 'bg-[#111124]' : 'bg-slate-300'}`}>
                              <span className={`h-5 w-5 rounded-full bg-white shadow transition ${rememberVisitorGroup ? 'translate-x-5' : ''}`} />
                            </button>
                          </div>
                          <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4">
                            <div>
                              <p className="font-bold">{typeLabel[tipo]} de reserva</p>
                              <p className="text-xs text-slate-500">Cuando un {tipo} se llena, el siguiente ya estará listo sin demoras</p>
                            </div>
                            <input type="number" min="0" value={reserveGroups} onChange={(event) => setReserveGroups(event.target.value)} className="h-10 w-20 rounded-full border border-slate-200 px-4 text-center outline-none focus:border-[#625dde]" />
                          </div>
                        </div>

                        <div className="border-t border-slate-200 pt-6">
                          <div className="mb-4 flex items-center gap-3">
                            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Hash size={17} /></div>
                            <div>
                              <p className="font-bold">Numeración automática</p>
                              <p className="text-xs text-slate-500">Tus {typePlural} se nombran solos con un número correlativo</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_1fr]">
                            <div>
                              <p className="mb-2 text-xs font-bold">Posición del número</p>
                              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200">
                                <button type="button" onClick={() => setNumberPosition('inicio')} className={`h-10 font-bold ${numberPosition === 'inicio' ? 'bg-black text-white' : 'bg-white'}`}>Al inicio</button>
                                <button type="button" onClick={() => setNumberPosition('final')} className={`h-10 font-bold ${numberPosition === 'final' ? 'bg-black text-white' : 'bg-white'}`}>Al final</button>
                              </div>
                            </div>
                            <label className="block">
                              <span className="mb-2 block text-xs font-bold">Comienza en</span>
                              <input type="number" min="1" value={numberStart} onChange={(event) => setNumberStart(event.target.value)} className="h-10 w-full rounded-lg border border-slate-200 px-4 outline-none focus:border-[#625dde]" />
                            </label>
                            <label className="block">
                              <span className="mb-2 block text-xs font-bold">Ejemplo</span>
                              <input value={numberedExample} readOnly className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-4" />
                            </label>
                          </div>
                        </div>
                      </>
                    )}

                    <div className="border-t border-slate-200 pt-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><LinkIcon size={17} /></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold">Link personalizado</p>
                            {!allowsIAGrupos && (
                              <span className="bg-amber-50 text-amber-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border border-amber-100/50 tracking-wide uppercase select-none flex items-center gap-0.5">
                                <Lock size={8} /> Pro
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">Usa tu propio dominio en lugar del link genérico de Funnelchat</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <label>
                          <span className="mb-2 block text-xs font-bold">Dominio</span>
                          <input
                            disabled={!allowsIAGrupos}
                            value={allowsIAGrupos ? customDomain : 'go.wha.link'}
                            onChange={(event) => setCustomDomain(event.target.value)}
                            className={`h-10 w-full rounded-lg border border-slate-200 px-4 outline-none focus:border-[#625dde] ${!allowsIAGrupos ? 'bg-slate-50 opacity-60 cursor-not-allowed' : ''}`}
                          />
                        </label>
                        <label>
                          <span className="mb-2 block text-xs font-bold">Ruta personalizada</span>
                          <div className={`flex h-10 items-center rounded-lg border border-slate-200 px-3 focus-within:border-[#625dde] ${!allowsIAGrupos ? 'bg-slate-50 opacity-60 cursor-not-allowed' : ''}`}>
                            <span className="mr-2 text-slate-400">/</span>
                            <input
                              disabled={!allowsIAGrupos}
                              value={allowsIAGrupos ? customPath : ''}
                              onChange={(event) => setCustomPath(event.target.value)}
                              placeholder={`mi-${tipo}`}
                              className="w-full outline-none bg-transparent"
                            />
                          </div>
                        </label>
                      </div>
                      <div className="mt-4 rounded-lg border border-dashed border-slate-200 bg-slate-50 px-4 py-4">
                        <p className="mb-3 text-xs font-bold uppercase">Tu link será</p>
                        <code className="text-sm text-slate-500">{allowsIAGrupos ? linkPreview : `https://go.wha.link/auto-generado`}</code>
                      </div>
                    </div>

                    {tipo !== 'canal' && (
                      <div className="border-t border-slate-200 pt-6">
                        <div className="mb-4 flex items-center gap-3">
                          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Tag size={17} /></div>
                          <div>
                            <p className="font-bold">Tags de seguimiento</p>
                            <p className="text-xs text-slate-500">Vincula tags para identificar entrada y salida de usuarios</p>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <label className="block">
                            <span className="mb-2 block text-xs font-bold">Tag de entrada</span>
                            <select
                              value={tagEntry}
                              onChange={(event) => setTagEntry(event.target.value)}
                              className="h-10 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#625dde]"
                            >
                              <option value="">Seleccionar Tag</option>
                              {availableTags.map((tag) => (
                                <option key={tag.id} value={tag.nombre}>{tag.nombre}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-2 block text-xs font-bold">Tag de salida</span>
                            <select
                              value={tagExit}
                              onChange={(event) => setTagExit(event.target.value)}
                              className="h-10 w-full rounded-full border border-slate-200 bg-white px-4 text-sm text-slate-700 outline-none focus:border-[#625dde]"
                            >
                              <option value="">Seleccionar Tag</option>
                              {availableTags.map((tag) => (
                                <option key={tag.id} value={tag.nombre}>{tag.nombre}</option>
                              ))}
                            </select>
                          </label>
                        </div>
                      </div>
                    )}

                    <div className="border-t border-slate-200 pt-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Sparkles size={17} /></div>
                        <div>
                          <p className="font-bold">Seguimiento de conversiones</p>
                          <p className="text-xs text-slate-500">Conecta píxeles y scripts de analytics para saber quién entra a tus {typePlural}</p>
                        </div>
                      </div>
                      <label>
                        <span className="mb-2 block text-xs font-bold">Código de seguimiento</span>
                        <textarea value={trackingCode} onChange={(event) => setTrackingCode(event.target.value)} placeholder="<!-- Pega aquí tu código de seguimiento -->" className="h-20 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 font-mono text-xs outline-none focus:border-[#625dde]" />
                      </label>
                    </div>

                    <div className="border-t border-slate-200 pt-6">
                      <div className="mb-4 flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-500"><Shield size={17} /></div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="font-bold">Seguridad Anti-bots</p>
                            {!allowsIAGrupos && (
                              <span className="bg-amber-50 text-amber-600 text-[9px] font-extrabold px-1.5 py-0.5 rounded-md border border-amber-100/50 tracking-wide uppercase select-none flex items-center gap-0.5">
                                <Lock size={8} /> Pro
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500">Protege tu campaña del tráfico automatizado y spam</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 px-4 py-4">
                        <div>
                          <p className="font-bold">Protección silenciosa</p>
                          <p className="text-xs text-slate-500">Valida si el visitante es un humano real sin mostrar CAPTCHA visible.</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            if (!allowsIAGrupos) {
                              alert("La protección anti-bots inteligente es exclusiva de los planes Advanced. Mejora tu plan.");
                              return;
                            }
                            setSilentProtection((value) => !value);
                          }}
                          className={`flex h-6 w-11 items-center rounded-full p-0.5 transition ${silentProtection && allowsIAGrupos ? 'bg-[#111124]' : 'bg-slate-300'}`}
                        >
                          <span className={`h-5 w-5 rounded-full bg-white shadow transition ${silentProtection && allowsIAGrupos ? 'translate-x-5' : ''}`} />
                        </button>
                      </div>
                    </div>
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
                      <p className="text-xs font-semibold">{typeLabel[tipo]} - {maxParticipants || typeLimits[tipo]} participantes</p>
                    </div>
                  </div>
                  {imageUrl && <img src={imageUrl} alt="" className="mt-4 h-24 w-full rounded-lg object-cover" />}
                  <div className="my-5 border-t border-white/70" />
                  <p className="text-xs font-bold uppercase">Descripción</p>
                  <p className="mt-2 text-sm font-semibold">{descripcion || `Agrega una descripción para tu ${tipo}...`}</p>
                </div>
                {tipo !== 'canal' && (
                  <div className="border-b border-slate-100 px-4 py-3 text-xs text-slate-500">
                    <span className="font-semibold">Numeración:</span> Al final
                    <span className="float-right">Máx. {maxParticipants || typeLimits[tipo]}</span>
                  </div>
                )}
                <div className="p-4">
                  <p className="mb-4 font-bold">Información</p>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between"><span className="text-slate-500">Tipo</span><b>{typeLabel[tipo]}</b></div>
                    <div className="flex justify-between"><span className="text-slate-500">Admins</span><b>{admins.length}</b></div>
                    {tipo !== 'canal' && (
                      <>
                        <div className="flex justify-between"><span className="text-slate-500">Máx. participantes</span><b>{maxParticipants || typeLimits[tipo]}</b></div>
                        <div className="flex justify-between"><span className="text-slate-500">Estrategia</span><b>{visitDistribution === 'equilibrado' ? 'Paralelo' : 'Uno a la vez'}</b></div>
                      </>
                    )}
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

