import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  HelpCircle,
  Image as ImageIcon,
  MessageSquare,
  Sparkles,
  Users,
  AlertCircle,
  CheckCircle2,
  Loader2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const buildAuthHeaders = (user) => {
  const headers = {};
  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`;
  }
  return headers;
};

const CrearEnvioMasivo = ({ user, onLogout }) => {
  const navigate = useNavigate();

  // Form State
  const [nombre, setNombre] = useState('');
  const [dispositivoId, setDispositivoId] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [urlMedia, setUrlMedia] = useState('');
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

  // Preview Count State
  const [previewCount, setPreviewCount] = useState(0);
  const [loadingCount, setLoadingCount] = useState(false);

  // Form Action State
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // 1. Load configuration options (devices, tags, stages)
  useEffect(() => {
    const fetchOptions = async () => {
      if (!user?.id) return;
      setLoadingOptions(true);
      try {
        // Devices and groups/campaigns options
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

        // Tags options
        const tagsResp = await fetch(`${API_URL}/api/tags?user_id=${user.id}`, {
          headers: buildAuthHeaders(user)
        });
        const tagsData = await tagsResp.json();
        if (Array.isArray(tagsData)) {
          setTags(tagsData);
        } else if (tagsData.success && Array.isArray(tagsData.data)) {
          setTags(tagsData.data);
        }

        // Stages options (Kanban board stages)
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

  // 2. Fetch matched contact count preview dynamically
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

    // Debounce a bit to avoid rapid API requests
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

  // 3. Handle Form Submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!nombre.trim()) {
      setErrorMsg('Por favor escribe un nombre para la campaña.');
      return;
    }
    if (!dispositivoId) {
      setErrorMsg('Por favor selecciona una terminal de envío.');
      return;
    }
    if (!mensaje.trim()) {
      setErrorMsg('El cuerpo del mensaje no puede estar vacío.');
      return;
    }
    if (targetType === 'tags' && selectedTags.length === 0) {
      setErrorMsg('Debes seleccionar al menos una etiqueta de contacto.');
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
      // Build program datetime
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
        setSuccessMsg(result.message || 'Campaña guardada e iniciada con éxito.');
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

  // Mock message formatting in preview
  const formattedPreviewText = useMemo(() => {
    let text = mensaje || 'Tu mensaje aparecerá aquí. Escribe algo en el editor...';
    // Dummy values for previews
    text = text.replace(/{nombre}/g, 'Wendy Llivichuzhca');
    text = text.replace(/{name}/g, 'Wendy Llivichuzhca');
    text = text.replace(/{telefono}/g, '+593986038755');
    text = text.replace(/{phone}/g, '+593986038755');

    // Bold formatting *text*
    text = text.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
    // Italic formatting _text_
    text = text.replace(/_(.*?)_/g, '<em>$1</em>');
    // Strikethrough ~text~
    text = text.replace(/~(.*?)~/g, '<del>$1</del>');

    return text;
  }, [mensaje]);

  return (
    <div className="flex min-h-screen bg-[#f5f7fb] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-3 mb-3 flex min-h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.05)] lg:ml-32">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-7">
          
          {/* Header */}
          <div className="mb-8 flex items-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/envios-masivos')}
              className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-700"
            >
              <ArrowLeft size={18} />
            </button>
            <div>
              <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-slate-900">
                Crear envío masivo
              </h1>
              <p className="text-[14px] text-slate-500">
                Define el remitente, segmenta tus contactos y configura el mensaje masivo.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-8">
            
            {/* Editor Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* Alert Messages */}
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

              {/* 1. Datos Generales */}
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Sparkles size={16} className="text-[#5c5dfb]" />
                  Información de la Campaña
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Nombre de la Campaña
                    </label>
                    <input
                      type="text"
                      value={nombre}
                      onChange={(e) => setNombre(e.target.value)}
                      placeholder="Ej. Campaña Promocional Junio"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[14px] outline-none focus:border-[#8f88ff]"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Terminal de WhatsApp (Remitente)
                    </label>
                    <select
                      value={dispositivoId}
                      onChange={(e) => setDispositivoId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-[14px] outline-none focus:border-[#8f88ff]"
                      required
                    >
                      {devices.length === 0 ? (
                        <option value="">Cargando terminales...</option>
                      ) : (
                        devices.map((dev) => (
                          <option key={dev.id} value={dev.id}>
                            {dev.nombre} ({dev.numero_telefono || 'Sin número'})
                          </option>
                        ))
                      )}
                    </select>
                  </div>
                </div>
              </div>

              {/* 2. Segmentación / Destinatarios */}
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Users size={16} className="text-[#5c5dfb]" />
                  Segmentar Destinatarios
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

                {/* Sub-panels based on type */}
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

                {/* matched contacts indicator */}
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

              {/* 3. Composición del Mensaje */}
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#5c5dfb]" />
                    Redactor del Mensaje
                  </h3>
                  
                  {/* Variables selector */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-400 mr-1">Insertar:</span>
                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{nombre}')}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#eef2ff] hover:text-[#5c5dfb] text-xs font-bold text-slate-600 transition"
                      title="Inserta el nombre del contacto"
                    >
                      {`{nombre}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => handleInsertVariable('{telefono}')}
                      className="px-2.5 py-1 rounded bg-slate-100 hover:bg-[#eef2ff] hover:text-[#5c5dfb] text-xs font-bold text-slate-600 transition"
                      title="Inserta el teléfono del contacto"
                    >
                      {`{teléfono}`}
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <textarea
                      rows={5}
                      value={mensaje}
                      onChange={(e) => setMensaje(e.target.value)}
                      placeholder="Escribe tu mensaje aquí... Puedes usar *negrita*, _cursiva_ o ~tachado~."
                      className="w-full rounded-2xl border border-slate-200 p-4 text-[14px] leading-relaxed outline-none focus:border-[#8f88ff] focus:ring-4 focus:ring-[#edeafe] transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-1.5">
                      <ImageIcon size={14} />
                      Archivo Adjunto (Imagen, Vídeo, Documento PDF, Audio) - URL
                    </label>
                    <input
                      type="text"
                      value={urlMedia}
                      onChange={(e) => setUrlMedia(e.target.value)}
                      placeholder="Ej. https://tuservidor.com/imagen.jpg o ruta local"
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-[13px] outline-none focus:border-[#8f88ff]"
                    />
                  </div>
                </div>
              </div>

              {/* 4. Tiempo / Planificación */}
              <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm space-y-4">
                <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
                  <Calendar size={16} className="text-[#5c5dfb]" />
                  Programación de Envío
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

              {/* Submit Button */}
              <div className="flex items-center gap-3 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => navigate('/envios-masivos')}
                  className="h-12 px-6 rounded-full border border-slate-200 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#5c5dfb] px-8 text-sm font-bold text-white transition hover:bg-[#4748db] shadow-md shadow-indigo-100 disabled:opacity-50"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Procesando...
                    </>
                  ) : envioTipo === 'ahora' ? (
                    'Iniciar Envío'
                  ) : (
                    'Programar Envío'
                  )}
                </button>
              </div>

            </form>

            {/* Live WhatsApp Mockup Preview */}
            <div className="hidden lg:block">
              <div className="sticky top-6 rounded-[3rem] border-[12px] border-slate-900 bg-slate-950 p-4 shadow-xl w-[320px] mx-auto min-h-[560px] flex flex-col overflow-hidden select-none">
                
                {/* Phone Notch/Speaker */}
                <div className="mx-auto h-4 w-32 rounded-full bg-slate-900 mb-4 flex items-center justify-center">
                  <div className="h-1.5 w-1.5 rounded-full bg-slate-800" />
                </div>

                {/* Phone Header */}
                <div className="bg-[#075e54] text-white px-3.5 py-3.5 rounded-t-2xl flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-slate-200 flex-shrink-0 flex items-center justify-center text-[#075e54] font-black text-xs">
                    W
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">Wendy Llivichuzhca</p>
                    <p className="text-[9px] text-[#128c7e] font-semibold">En línea</p>
                  </div>
                </div>

                {/* Phone Chat Body */}
                <div className="flex-1 bg-[#ece5dd] p-3 rounded-b-2xl overflow-y-auto max-h-[380px] space-y-3 flex flex-col justify-end">
                  
                  {/* WhatsApp Message Bubble */}
                  <div className="bg-white rounded-xl rounded-tr-none p-2.5 shadow-sm max-w-[85%] self-end text-xs leading-relaxed text-slate-800 relative space-y-1.5">
                    
                    {/* Media Preview if URL is set */}
                    {urlMedia && (
                      <div className="rounded-lg overflow-hidden border border-slate-100 bg-slate-50 max-h-[140px] flex items-center justify-center">
                        <img
                          src={urlMedia}
                          alt="Previsualización de imagen"
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                          className="w-full object-cover"
                        />
                        {/* Fallback description in case it's not a displayable image */}
                        <div className="p-2 text-center text-[10px] text-slate-400 font-semibold flex flex-col items-center gap-1">
                          <ImageIcon size={16} />
                          <span>Archivo adjunto</span>
                        </div>
                      </div>
                    )}

                    <p
                      className="whitespace-pre-wrap font-sans text-slate-700"
                      dangerouslySetInnerHTML={{ __html: formattedPreviewText }}
                    />
                    
                    <span className="block text-[9px] text-slate-400 text-right mt-1 font-medium">
                      12:00
                    </span>
                  </div>

                </div>

                {/* Phone Input Bar */}
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
    </div>
  );
};

export default CrearEnvioMasivo;
