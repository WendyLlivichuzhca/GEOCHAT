import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  HelpCircle,
  Image as ImageIcon,
  Video as VideoIcon,
  MessageSquare,
  Sparkles,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Check,
  Smile,
  Bold,
  Italic,
  ChevronDown,
  X
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const buildAuthHeaders = (user, extraHeaders = {}) => {
  const headers = { ...extraHeaders };
  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`;
  }
  return headers;
};

const CrearEnvioMasivo = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // Wizard Step State
  const [currentStep, setCurrentStep] = useState(1); // 1, 2, 3

  // Form State
  const [nombre, setNombre] = useState('');
  const [dispositivoId, setDispositivoId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [urlMedia, setUrlMedia] = useState('');
  const [mediaType, setMediaType] = useState(''); // 'image' or 'video'
  const [targetType, setTargetType] = useState('all'); // 'all', 'tags', 'stage'
  const [selectedTags, setSelectedTags] = useState([]);
  const [selectedStage, setSelectedStage] = useState('');
  const [envioTipo, setEnvioTipo] = useState('ahora'); // 'ahora', 'programar'
  const [fechaEnvio, setFechaEnvio] = useState('');
  const [horaEnvio, setHoraEnvio] = useState('12:00');

  // API Options State
  const [devices, setDevices] = useState([]);
  const [tags, setTags] = useState([]);
  const [stages, setStages] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(false);

  // Custom Dropdown State
  const [isDeviceDropdownOpen, setIsDeviceDropdownOpen] = useState(false);
  const deviceSelectRef = useRef(null);

  // Close device dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (deviceSelectRef.current && !deviceSelectRef.current.contains(e.target)) {
        setIsDeviceDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const formatDeviceLabel = (dev) => {
    if (!dev) return 'Seleccionar dispositivo';
    if (!dev.numero_telefono) return dev.nombre;
    const cleanNum = dev.numero_telefono.replace(/\D/g, '');
    const last4 = cleanNum.slice(-4);
    return `${dev.nombre} (${last4})`;
  };

  // Media Upload Refs and State
  const imageInputRef = useRef(null);
  const videoInputRef = useRef(null);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);

  const handleUploadFile = async (e, type) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      setErrorMsg('El archivo supera el límite de 50MB.');
      return;
    }

    setIsUploadingMedia(true);
    setErrorMsg('');
    try {
      const payload = new FormData();
      payload.append('file', file);

      const response = await fetch(`${API_URL}/api/envios_masivos/upload-media`, {
        method: 'POST',
        headers: buildAuthHeaders(user),
        body: payload
      });

      const result = await response.json();
      if (result.success && result.url) {
        setUrlMedia(result.url);
        setMediaType(type);
      } else {
        setErrorMsg(result.message || 'Error al subir el archivo.');
      }
    } catch (err) {
      console.error('Error uploading file:', err);
      setErrorMsg('Error de conexión al subir el archivo.');
    } finally {
      setIsUploadingMedia(false);
      e.target.value = '';
    }
  };

  // Preview Count State
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);

  // Action State
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Fetch options
  useEffect(() => {
    const fetchOptions = async () => {
      if (!user?.id) return;
      setLoadingOptions(true);
      try {
        const schedResp = await fetch(`${API_URL}/api/scheduled_messages/options?user_id=${user.id}`, {
          headers: buildAuthHeaders(user)
        });
        const schedData = await schedResp.json();
        if (schedData.success && schedData.data) {
          setDevices(schedData.data.devices || []);
          if (schedData.data.devices?.length > 0) {
            setDispositivoId(schedData.data.devices[0].id);
          }
        }

        const tagsResp = await fetch(`${API_URL}/api/tags?user_id=${user.id}`, {
          headers: buildAuthHeaders(user)
        });
        const tagsData = await tagsResp.json();
        if (Array.isArray(tagsData)) {
          setTags(tagsData);
        } else if (tagsData.success && Array.isArray(tagsData.data)) {
          setTags(tagsData.data);
        }

        const kanbanResp = await fetch(`${API_URL}/api/kanban`, {
          headers: buildAuthHeaders(user)
        });
        const kanbanData = await kanbanResp.json();
        if (kanbanData.success && Array.isArray(kanbanData.columns)) {
          setStages(kanbanData.columns);
        }
      } catch (err) {
        console.error('Error fetching creation options:', err);
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [user]);

  // 2. Fetch preview count
  useEffect(() => {
    const fetchPreviewCount = async () => {
      if (!dispositivoId || !user?.id) {
        setPreviewCount(0);
        return;
      }

      setLoadingCount(true);
      try {
        const payload = {
          dispositivo_id: Number(dispositivoId),
          targets: {
            type: targetType,
            tag_ids: selectedTags,
            etapa_id: selectedStage ? Number(selectedStage) : null
          }
        };

        const resp = await fetch(`${API_URL}/api/envios_masivos/preview_count`, {
          method: 'POST',
          headers: buildAuthHeaders(user, { 'Content-Type': 'application/json' }),
          body: JSON.stringify(payload)
        });
        const result = await resp.json();
        if (result.success) {
          setPreviewCount(result.count || 0);
        } else {
          setPreviewCount(0);
        }
      } catch (err) {
        console.error('Error fetching preview count:', err);
        setPreviewCount(0);
      } finally {
        setLoadingCount(false);
      }
    };

    const timeout = setTimeout(() => {
      fetchPreviewCount();
    }, 300);

    return () => clearTimeout(timeout);
  }, [dispositivoId, targetType, selectedTags, selectedStage, user]);

  const handleTagToggle = (tagId) => {
    setSelectedTags((prev) =>
      prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]
    );
  };

  const handleInsertVariable = (variable) => {
    setMensaje((prev) => `${prev}${variable}`);
  };

  // Upload/Mock Media triggers
  const handleSelectMediaMock = (type) => {
    setMediaType(type);
    if (type === 'image') {
      setUrlMedia('https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500&auto=format&fit=crop');
    } else {
      setUrlMedia('https://www.w3schools.com/html/mov_bbb.mp4');
    }
  };

  const handleRemoveMedia = () => {
    setUrlMedia('');
    setMediaType('');
  };

  // Submit campaign to API
  const handleCreateCampaign = async () => {
    setErrorMsg('');
    setSuccessMsg('');

    if (!nombre.trim()) {
      setErrorMsg('Por favor escribe un nombre para la campaña.');
      return;
    }
    if (!dispositivoId) {
      setErrorMsg('Por favor selecciona una terminal.');
      return;
    }
    if (!mensaje.trim()) {
      setErrorMsg('El cuerpo del mensaje no puede estar vacío.');
      return;
    }
    if (targetType === 'tags' && selectedTags.length === 0) {
      setErrorMsg('Debes seleccionar al menos una etiqueta.');
      return;
    }
    if (targetType === 'stage' && !selectedStage) {
      setErrorMsg('Debes seleccionar una etapa del embudo.');
      return;
    }
    if (envioTipo === 'programar' && (!fechaEnvio || !horaEnvio)) {
      setErrorMsg('Por favor especifica la fecha y hora de programación.');
      return;
    }

    setIsSaving(true);
    try {
      let programadoPara = null;
      if (envioTipo === 'programar') {
        programadoPara = `${fechaEnvio}T${horaEnvio}:00`;
      }

      const payload = {
        nombre,
        dispositivo_id: Number(dispositivoId),
        mensaje,
        url_media: urlMedia.trim() || null,
        programado_para: programadoPara,
        targets: {
          type: targetType,
          tag_ids: selectedTags,
          etapa_id: selectedStage ? Number(selectedStage) : null
        }
      };

      const resp = await fetch(`${API_URL}/api/envios_masivos`, {
        method: 'POST',
        headers: buildAuthHeaders(user, { 'Content-Type': 'application/json' }),
        body: JSON.stringify(payload)
      });
      const result = await resp.json();

      if (result.success) {
        setSuccessMsg(result.message || 'Campaña guardada con éxito.');
        setTimeout(() => {
          navigate('/envios-masivos');
        }, 1500);
      } else {
        setErrorMsg(result.message || 'Error al guardar la campaña.');
      }
    } catch (err) {
      console.error('Error submitting campaign:', err);
      setErrorMsg('Error de red. Intenta nuevamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const formattedPreviewText = useMemo(() => {
    let text = mensaje || 'Tu mensaje aparecerá aquí. Escribe algo en el editor...';
    text = text.replace(/{nombre}/g, 'Wendy Llivichuzhca');
    text = text.replace(/{name}/g, 'Wendy Llivichuzhca');
    text = text.replace(/{telefono}/g, '+593986038755');
    text = text.replace(/{phone}/g, '+593986038755');

    text = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    text = text.replace(/~(.*?)~/g, '<del>$1</del>');

    return text;
  }, [mensaje]);

  const selectedDeviceName = useMemo(() => {
    const dev = devices.find((d) => String(d.id) === String(dispositivoId));
    return dev ? `${dev.nombre} (${dev.numero_telefono || 'Sin número'})` : 'Seleccionar dispositivo';
  }, [devices, dispositivoId]);

  // Color dot helper based on state
  const getDeviceStatusColor = (estado) => {
    if (estado === 'conectado') return 'bg-emerald-500';
    if (estado === 'conectando') return 'bg-amber-400';
    return 'bg-rose-500';
  };

  const stepValid = useMemo(() => {
    if (currentStep === 1) {
      return nombre.trim() !== '' && dispositivoId !== '' && mensaje.trim() !== '';
    }
    if (currentStep === 2) {
      if (targetType === 'all') return true;
      if (targetType === 'tags') return selectedTags.length > 0;
      if (targetType === 'stage') return selectedStage !== '';
    }
    return true;
  }, [currentStep, nombre, dispositivoId, mensaje, targetType, selectedTags, selectedStage]);

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex min-h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-7 flex flex-col">
          
          {/* Header */}
          <div className="mb-4 flex items-center gap-4">
            <button
              type="button"
              onClick={() => {
                if (currentStep > 1) {
                  setCurrentStep(currentStep - 1);
                } else {
                  navigate('/envios-masivos');
                }
              }}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <span className="text-sm font-semibold text-[#5c5dfb] hover:underline cursor-pointer" onClick={() => navigate('/envios-masivos')}>
                Regresar
              </span>
              <h1 className="text-[1.8rem] font-bold tracking-[-0.03em] text-slate-900 leading-tight">
                Crear envío masivo a contactos
              </h1>
            </div>
          </div>

          {/* Step Wizard Header */}
          <div className="grid grid-cols-1 md:grid-cols-3 border border-slate-100 rounded-3xl bg-white shadow-sm overflow-hidden mb-8">
            {/* Step 1 */}
            <div
              className={`p-5 flex items-center gap-4 relative transition cursor-pointer ${
                currentStep === 1 ? 'bg-indigo-50/20' : ''
              }`}
              onClick={() => setCurrentStep(1)}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm ${
                  currentStep === 1
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : nombre && dispositivoId && mensaje
                    ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                {nombre && dispositivoId && mensaje ? <Check size={16} /> : '01'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 leading-none">Enviar mensaje</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                  Selecciona una plantilla o crea un mensaje nuevo
                </p>
              </div>
              {currentStep === 1 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600" />
              )}
            </div>

            {/* Step 2 */}
            <div
              className={`p-5 flex items-center gap-4 relative border-t md:border-t-0 md:border-l border-slate-100 transition cursor-pointer ${
                currentStep === 2 ? 'bg-indigo-50/20' : ''
              }`}
              onClick={() => {
                if (nombre && dispositivoId && mensaje) {
                  setCurrentStep(2);
                }
              }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm ${
                  currentStep === 2
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : targetType === 'tags' && selectedTags.length === 0
                    ? 'border-slate-200 bg-slate-50 text-slate-400'
                    : targetType === 'stage' && !selectedStage
                    ? 'border-slate-200 bg-slate-50 text-slate-400'
                    : 'border-indigo-600 bg-indigo-50 text-indigo-600'
                }`}
              >
                {currentStep > 2 || (currentStep === 2 && stepValid) ? '02' : '02'}
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 leading-none">Seleccionar audiencia</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                  Selecciona los contactos que recibirán el envío masivo
                </p>
              </div>
              {currentStep === 2 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600" />
              )}
            </div>

            {/* Step 3 */}
            <div
              className={`p-5 flex items-center gap-4 relative border-t md:border-t-0 md:border-l border-slate-100 transition cursor-pointer ${
                currentStep === 3 ? 'bg-indigo-50/20' : ''
              }`}
              onClick={() => {
                if (nombre && dispositivoId && mensaje && stepValid) {
                  setCurrentStep(3);
                }
              }}
            >
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border font-bold text-sm ${
                  currentStep === 3
                    ? 'border-indigo-600 bg-indigo-600 text-white'
                    : 'border-slate-200 bg-slate-50 text-slate-400'
                }`}
              >
                03
              </div>
              <div className="min-w-0">
                <h4 className="text-sm font-bold text-slate-800 leading-none">Programar envío</h4>
                <p className="text-[11px] text-slate-400 mt-1 leading-snug truncate">
                  Selecciona una fecha y hora para el envío
                </p>
              </div>
              {currentStep === 3 && (
                <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-indigo-600" />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8 flex-1">
            
            {/* Left Hand Form Area */}
            <div className="space-y-6 flex flex-col justify-between">
              <div className="space-y-6">
                
                {/* Alert Box */}
                {errorMsg && (
                  <div className="flex items-center gap-3 rounded-2xl bg-rose-50 border border-rose-100 p-4 text-rose-700 text-sm font-semibold">
                    <AlertCircle size={18} />
                    <span>{errorMsg}</span>
                  </div>
                )}
                {successMsg && (
                  <div className="flex items-center gap-3 rounded-2xl bg-emerald-50 border border-emerald-100 p-4 text-emerald-700 text-sm font-semibold">
                    <CheckCircle2 size={18} />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* STEP 1: ENVIAR MENSAJE */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    {/* Nombre input */}
                    <div>
                      <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre del envío masivo"
                        className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#8f88ff]"
                        required
                      />
                    </div>

                    {/* Dispositivo dropdown */}
                    <div className="relative" ref={deviceSelectRef}>
                      <button
                        type="button"
                        onClick={() => setIsDeviceDropdownOpen(!isDeviceDropdownOpen)}
                        className="flex h-12 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold outline-none focus:border-[#8f88ff] focus:ring-1 focus:ring-[#8f88ff] transition"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {dispositivoId ? (
                            <>
                              <span
                                className={`w-2 h-2 rounded-full flex-shrink-0 ${getDeviceStatusColor(
                                  devices.find((d) => String(d.id) === String(dispositivoId))?.estado
                                )}`}
                              />
                              <span className="text-slate-800 truncate">
                                {formatDeviceLabel(devices.find((d) => String(d.id) === String(dispositivoId)))}
                              </span>
                            </>
                          ) : (
                            <span className="text-slate-400">Seleccionar dispositivo</span>
                          )}
                        </div>
                        <div className="flex items-center">
                          {dispositivoId && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setDispositivoId('');
                                setIsDeviceDropdownOpen(false);
                              }}
                              className="p-1 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition"
                            >
                              <X size={14} />
                            </button>
                          )}
                          <div className="h-5 w-[1px] bg-slate-200 mx-2" />
                          <ChevronDown size={16} className={`text-slate-400 transition-transform duration-200 ${isDeviceDropdownOpen ? 'rotate-180' : ''}`} />
                        </div>
                      </button>

                      {isDeviceDropdownOpen && (
                        <div className="absolute left-0 right-0 top-full mt-1.5 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg z-50 max-h-60 overflow-y-auto animate-in fade-in slide-in-from-top-1 duration-150">
                          {devices.length === 0 ? (
                            <div className="p-3 text-xs text-slate-400 text-center font-medium">No hay dispositivos disponibles</div>
                          ) : (
                            devices.map((dev) => (
                              <button
                                key={dev.id}
                                type="button"
                                onClick={() => {
                                  setDispositivoId(dev.id);
                                  setIsDeviceDropdownOpen(false);
                                }}
                                className={`flex h-11 w-full items-center px-4 gap-3 text-sm font-semibold transition text-left ${
                                  String(dispositivoId) === String(dev.id)
                                    ? 'bg-indigo-50/50 text-[#5c5dfb]'
                                    : 'text-slate-700 hover:bg-slate-50'
                                }`}
                              >
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${getDeviceStatusColor(dev.estado)}`} />
                                <span className="truncate">{formatDeviceLabel(dev)}</span>
                              </button>
                            ))
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message composing (Conditional on Device Selection) */}
                    {dispositivoId && (
                      <div className="space-y-4 animate-in fade-in duration-200">
                        <div className="flex justify-between items-center">
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Crea un nuevo mensaje
                          </span>
                        </div>

                        {/* Yellow Warning Box */}
                        <div className="rounded-xl bg-[#fffbeb] border border-[#fcd34d] p-4 text-[#92400e] text-xs font-semibold leading-relaxed">
                          Evita enviar difusiones masivas a contactos que podrían considerar el mensaje como spam, para evitar que WhatsApp bloquee tu número.
                        </div>

                        {/* Media Upload Area */}
                        {isUploadingMedia ? (
                          <div className="flex border-2 border-dashed border-indigo-200 rounded-2xl h-24 bg-white items-center justify-center gap-3 text-slate-500 text-xs font-bold animate-in fade-in duration-200">
                            <Loader2 size={20} className="animate-spin text-[#5c5dfb]" />
                            <span>Subiendo archivo...</span>
                          </div>
                        ) : !urlMedia ? (
                          <div className="flex border-2 border-dashed border-indigo-200 rounded-2xl overflow-hidden h-24 bg-white">
                            <button
                              type="button"
                              onClick={() => imageInputRef.current.click()}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 hover:bg-indigo-50/20 transition text-xs font-bold text-slate-500"
                            >
                              <ImageIcon size={20} className="text-[#5c5dfb]" />
                              Imagen
                            </button>
                            <div className="w-[1.5px] bg-indigo-100 my-4" />
                            <button
                              type="button"
                              onClick={() => videoInputRef.current.click()}
                              className="flex-1 flex flex-col items-center justify-center gap-1.5 hover:bg-indigo-50/20 transition text-xs font-bold text-slate-500"
                            >
                              <VideoIcon size={20} className="text-[#5c5dfb]" />
                              Video
                            </button>
                          </div>
                        ) : (
                          <div className="relative rounded-2xl overflow-hidden border border-slate-100 max-w-[180px] h-28 bg-slate-50 flex items-center justify-center shadow-sm">
                            {mediaType === 'image' ? (
                              <img src={urlMedia} alt="Media" className="w-full h-full object-cover" />
                            ) : (
                              <video src={urlMedia} className="w-full h-full object-cover" />
                            )}
                            <button
                              type="button"
                              onClick={handleRemoveMedia}
                              className="absolute top-2 left-2 h-7 w-7 rounded-full bg-[#5c5dfb] hover:bg-[#4748db] text-white flex items-center justify-center shadow-md transition z-10"
                              title="Eliminar archivo"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        )}

                        {/* Text editor box */}
                        <div className="rounded-2xl border border-slate-200 overflow-hidden bg-slate-50/50">
                          <textarea
                            rows={6}
                            value={mensaje}
                            onChange={(e) => {
                              if (e.target.value.length <= 4000) {
                                setMensaje(e.target.value);
                              }
                            }}
                            placeholder="Escribe un mensaje..."
                            className="w-full bg-transparent p-4 text-[14px] leading-relaxed outline-none border-none resize-none"
                            required
                          />

                          {/* Editor Toolbar */}
                          <div className="border-t border-slate-100 px-4 py-2.5 flex justify-between items-center bg-white text-slate-400 text-sm">
                            <div className="flex items-center gap-4">
                              <button type="button" onClick={() => handleInsertVariable(' 😊')} className="hover:text-slate-600" title="Insertar Emoji"><Smile size={16} /></button>
                              <button type="button" onClick={() => handleInsertVariable(' *texto*')} className="hover:text-slate-600 font-bold" title="Negrita"><Bold size={16} /></button>
                              <button type="button" onClick={() => handleInsertVariable(' _texto_')} className="hover:text-slate-600 italic" title="Cursiva"><Italic size={16} /></button>
                              <button type="button" onClick={() => handleInsertVariable(' ~texto~')} className="hover:text-slate-600 flex items-center justify-center h-4 w-4" title="Tachado">
                                <span className="line-through font-bold text-sm select-none leading-none">S</span>
                              </button>
                              <button type="button" onClick={() => handleInsertVariable(' {nombre}')} className="hover:text-slate-600 flex items-center justify-center h-4 w-4" title="Insertar variable">
                                <span className="font-semibold text-sm select-none leading-none">{"{}"}</span>
                              </button>
                              <button type="button" onClick={() => handleInsertVariable(' IA')} className="hover:text-indigo-600 flex items-center justify-center h-4 w-4" title="Asistente IA">
                                <span className="font-extrabold text-[12px] text-[#5c5dfb] tracking-wider select-none leading-none">IA</span>
                              </button>
                            </div>
                            <span className="text-xs font-bold text-slate-300">
                              {mensaje.length} / 4000
                            </span>
                          </div>
                        </div>

                      </div>
                    )}
                  </div>
                )}

                {/* STEP 2: SELECCIONAR AUDIENCIA */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Users size={16} className="text-[#5c5dfb]" />
                        Segmentar Audiencia
                      </h3>

                      <div className="flex flex-wrap gap-3">
                        <button
                          type="button"
                          onClick={() => setTargetType('all')}
                          className={`h-10 px-5 rounded-full text-xs font-bold border transition ${
                            targetType === 'all'
                              ? 'bg-[#1e1b4b] border-[#1e1b4b] text-white'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Todos los contactos
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetType('tags')}
                          className={`h-10 px-5 rounded-full text-xs font-bold border transition ${
                            targetType === 'tags'
                              ? 'bg-[#1e1b4b] border-[#1e1b4b] text-white'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Por Etiquetas
                        </button>
                        <button
                          type="button"
                          onClick={() => setTargetType('stage')}
                          className={`h-10 px-5 rounded-full text-xs font-bold border transition ${
                            targetType === 'stage'
                              ? 'bg-[#1e1b4b] border-[#1e1b4b] text-white'
                              : 'border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          Por Etapa de Embudo
                        </button>
                      </div>

                      {targetType === 'tags' && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Selecciona una o más etiquetas:
                          </span>
                          {tags.length === 0 ? (
                            <p className="text-xs text-slate-400">No tienes etiquetas creadas.</p>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {tags.map((tag) => {
                                const isSelected = selectedTags.includes(tag.id);
                                return (
                                  <button
                                    key={tag.id}
                                    type="button"
                                    onClick={() => handleTagToggle(tag.id)}
                                    className={`h-8 px-3.5 rounded-full text-xs font-semibold border transition flex items-center gap-1.5 ${
                                      isSelected
                                        ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                    }`}
                                  >
                                    <span
                                      className="w-2 h-2 rounded-full"
                                      style={{ backgroundColor: tag.color || '#6366f1' }}
                                    />
                                    {tag.nombre}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}

                      {targetType === 'stage' && (
                        <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 space-y-3">
                          <span className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                            Selecciona la etapa de embudo:
                          </span>
                          {stages.length === 0 ? (
                            <p className="text-xs text-slate-400">Cargando etapas de embudo...</p>
                          ) : (
                            <select
                              value={selectedStage}
                              onChange={(e) => setSelectedStage(e.target.value)}
                              className="h-10 w-full md:w-1/2 rounded-xl border border-slate-200 bg-white px-3 text-[13px] outline-none"
                            >
                              <option value="">Seleccionar etapa...</option>
                              {stages.map((stg) => (
                                <option key={stg.id} value={stg.id}>
                                  {stg.nombre}
                                </option>
                              ))}
                            </select>
                          )}
                        </div>
                      )}

                      <div className="flex items-center gap-2 pt-2 text-xs font-bold text-[#5c5dfb] bg-indigo-50/50 p-3.5 rounded-xl border border-indigo-50">
                        <Users size={14} />
                        <span>
                          {loadingCount ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 size={10} className="animate-spin" />
                              Calculando contactos...
                            </span>
                          ) : (
                            `Se enviará a un total de: ${previewCount} contactos registrados.`
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {/* STEP 3: PROGRAMAR ENVIO */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-5">
                      <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                        <Calendar size={16} className="text-[#5c5dfb]" />
                        Planificación de Tiempo
                      </h3>

                      <div className="flex gap-4">
                        <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="envioTipo"
                            value="ahora"
                            checked={envioTipo === 'ahora'}
                            onChange={() => setEnvioTipo('ahora')}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          Enviar ahora
                        </label>

                        <label className="flex items-center gap-2.5 text-sm font-bold text-slate-700 cursor-pointer">
                          <input
                            type="radio"
                            name="envioTipo"
                            value="programar"
                            checked={envioTipo === 'programar'}
                            onChange={() => setEnvioTipo('programar')}
                            className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300"
                          />
                          Programar envío
                        </label>
                      </div>

                      {envioTipo === 'programar' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl bg-slate-50 p-4 border border-slate-100 animate-in fade-in duration-200">
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Fecha
                            </label>
                            <input
                              type="date"
                              value={fechaEnvio}
                              onChange={(e) => setFechaEnvio(e.target.value)}
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                              required
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                              Hora
                            </label>
                            <input
                              type="time"
                              value={horaEnvio}
                              onChange={(e) => setHoraEnvio(e.target.value)}
                              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm outline-none"
                              required
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

              </div>

              {/* Wizard Navigation Footer */}
              <div className="flex items-center gap-3 justify-end pt-8 mt-auto">
                <button
                  type="button"
                  onClick={() => {
                    if (currentStep > 1) {
                      setCurrentStep(currentStep - 1);
                    } else {
                      navigate('/envios-masivos');
                    }
                  }}
                  className="h-11 px-7 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50 bg-white"
                >
                  Volver
                </button>
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    disabled={!stepValid}
                    onClick={() => setCurrentStep(currentStep + 1)}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5c5dfb] px-7 text-sm font-bold text-white transition hover:bg-[#4748db] disabled:opacity-50 disabled:hover:bg-[#5c5dfb]"
                  >
                    Siguiente
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={isSaving || !stepValid}
                    onClick={handleCreateCampaign}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-[#5c5dfb] px-7 text-sm font-bold text-white transition hover:bg-[#4748db] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 size={16} className="animate-spin" />
                        Guardando...
                      </>
                    ) : envioTipo === 'ahora' ? (
                      'Iniciar Envío'
                    ) : (
                      'Programar Envío'
                    )}
                  </button>
                )}
              </div>

            </div>

            {/* Right Hand Live Phone Mockup Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-6 rounded-[3rem] border-[12px] border-slate-900 bg-slate-950 p-4 shadow-xl w-[320px] mx-auto min-h-[560px] flex flex-col overflow-hidden select-none">
                
                {/* Notch */}
                <div className="mx-auto h-4 w-32 rounded-full bg-slate-900 mb-4 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                </div>

                {/* WhatsApp Header Mock */}
                <div className="bg-[#075e54] text-white px-3.5 py-3.5 rounded-t-2xl flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[#075e54] font-black text-xs">
                    W
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Wendy Llivichuzhca</p>
                    <p className="text-[9px] text-[#128c7e] font-semibold">En línea</p>
                  </div>
                </div>

                {/* Chat Bubble Container */}
                <div className="flex-1 bg-[#ece5dd] p-3 rounded-b-2xl overflow-y-auto max-h-[380px] space-y-3 flex flex-col justify-end">
                  
                  {/* Bubble */}
                  {(urlMedia || mensaje) && (
                    <div className="bg-[#e2f7cb] rounded-xl rounded-tr-none p-2.5 shadow-sm max-w-[85%] self-end text-xs leading-relaxed text-slate-800 relative space-y-1.5 animate-in fade-in duration-200">
                      
                      {/* Media render */}
                      {urlMedia && (
                        <div className="rounded-lg overflow-hidden border border-slate-100 bg-white max-h-[140px] flex items-center justify-center">
                          {mediaType === 'video' ? (
                            <div className="relative w-full h-full flex items-center justify-center bg-slate-950 text-white text-[10px] font-bold">
                              <span className="absolute">▶ Video</span>
                              <video src={urlMedia} className="w-full opacity-60" />
                            </div>
                          ) : (
                            <img src={urlMedia} alt="Preview" className="w-full object-cover" />
                          )}
                        </div>
                      )}

                      {mensaje && (
                        <p
                          className="whitespace-pre-wrap font-sans text-slate-700 text-[11px]"
                          dangerouslySetInnerHTML={{ __html: formattedPreviewText }}
                        />
                      )}
                      
                      <span className="block text-[8px] text-slate-400 text-right mt-1 font-medium">
                        12:00
                      </span>
                    </div>
                  )}

                </div>

                {/* Input mock bar */}
                <div className="mt-4 p-2 bg-[#f0f0f0] rounded-xl flex items-center gap-2 text-[10px] text-slate-400">
                  <div className="flex-1 bg-white px-2.5 py-1.5 rounded-full border border-slate-200">
                    Escribe un mensaje...
                  </div>
                  <div className="w-6 h-6 rounded-full bg-[#075e54] flex items-center justify-center text-white">
                    ▷
                  </div>
                </div>

              </div>
            </div>

          </div>

        </div>
      </main>
      {/* Hidden File Inputs for Local Upload */}
      <input
        type="file"
        ref={imageInputRef}
        onChange={(e) => handleUploadFile(e, 'image')}
        accept="image/*"
        className="hidden"
      />
      <input
        type="file"
        ref={videoInputRef}
        onChange={(e) => handleUploadFile(e, 'video')}
        accept="video/*"
        className="hidden"
      />
    </div>
  );
};

export default CrearEnvioMasivo;
