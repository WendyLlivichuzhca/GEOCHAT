import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Check,
  Upload,
  X,
  ChevronDown,
  Image,
  Film,
  FileText,
  Link as LinkIcon,
  CheckCircle,
  AlertCircle,
  Loader2,
  Sparkles,
  Layers,
  Sliders,
  Smartphone
} from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import { getAuthHeaders } from '../utils/authHeaders';

const MAX_FILE_SIZE = 16 * 1024 * 1024;

const formatDate = (value) => {
  if (!value) return '-';
  try {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const readFileAsDataURL = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const headerOptions = [
  { value: 'Ninguna', label: 'Ninguna' },
  { value: 'Mensaje de texto', label: 'Mensaje de texto' },
  { value: 'Mensaje de imagen', label: 'Mensaje de imagen' },
  { value: 'Mensaje de video', label: 'Mensaje de video' },
  { value: 'Mensaje de documento', label: 'Mensaje de documento' }
];

const categoryOptions = ['Marketing', 'Utilidad'];

const initialTemplate = {
  nombre: '',
  categoria: 'Marketing',
  cabecera: 'Ninguna',
  cabeceraTexto: '',
  cabeceraArchivo: null,
  cuerpo: '',
  pie: '',
  botones: [],
  dispositivoId: '',
  dispositivo_nombre: '',
  tipo: 'Texto',
  estado: 'Borrador',
  fechaCreacion: ''
};

export default function CrearPlantilla({ user, onLogout }) {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditing = Boolean(id);
  const [devices, setDevices] = useState([]);
  const [template, setTemplate] = useState(initialTemplate);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [buttonMenuOpen, setButtonMenuOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModalMessage, setAlertModalMessage] = useState('');

  useEffect(() => {
    const loadDevices = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/dashboard/${user.id}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && Array.isArray(data.dashboard?.dispositivos)) {
          setDevices(data.dashboard.dispositivos);
          if (!isEditing && data.dashboard.dispositivos.length > 0) {
            setTemplate((prev) => ({
              ...prev,
              dispositivoId: prev.dispositivoId || data.dashboard.dispositivos[0].id,
              dispositivo_nombre: prev.dispositivo_nombre || data.dashboard.dispositivos[0].nombre || ''
            }));
          }
        }
      } catch (err) {
        console.warn('Error al cargar dispositivos:', err);
      }
    };
    loadDevices();
  }, [user?.id, isEditing]);

  useEffect(() => {
    if (!isEditing || !user?.id) return;
    const loadTemplate = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/plantillas/${id}?user_id=${user.id}`, {
          headers: getAuthHeaders(),
        });
        const data = await res.json();
        if (data.success && data.plantilla) {
          setTemplate((prev) => ({
            ...prev,
            ...data.plantilla,
            dispositivoId: data.plantilla.dispositivo_id,
            dispositivo_nombre: data.plantilla.dispositivo_nombre || prev.dispositivo_nombre || '',
            cabeceraArchivo: data.plantilla.cabecera_archivo || null,
            botones: Array.isArray(data.plantilla.botones) ? data.plantilla.botones : [],
          }));
        }
      } catch (err) {
        console.error('Error cargando plantilla:', err);
      }
    };
    loadTemplate();
  }, [id, isEditing, user?.id]);

  useEffect(() => {
    if (!devices.length || !template.dispositivoId) return;
    const selected = devices.find((device) => String(device.id) === String(template.dispositivoId));
    if (selected) {
      setTemplate((prev) => ({ ...prev, dispositivo_nombre: selected.nombre || prev.dispositivo_nombre }));
    }
  }, [devices, template.dispositivoId]);

  const handleChange = (name, value) => {
    setTemplate((prev) => ({ ...prev, [name]: value }));
    setSuccess('');
    setError('');
  };

  const handleHeaderUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_FILE_SIZE) {
      setError('Los archivos no pueden pesar más de 16mb.');
      return;
    }

    try {
      const dataUrl = await readFileAsDataURL(file);
      setTemplate((prev) => ({
        ...prev,
        cabeceraArchivo: {
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl
        }
      }));
      setError('');
    } catch {
      setError('No se pudo cargar el archivo.');
    }
  };

  const handleAddButton = (type) => {
    setTemplate((prev) => ({
      ...prev,
      botones: [
        ...prev.botones,
        {
          id: `btn-${Date.now()}`,
          type,
          label: '',
          value: ''
        }
      ]
    }));
    setButtonMenuOpen(false);
  };

  const updateButton = (id, field, value) => {
    setTemplate((prev) => ({
      ...prev,
      botones: prev.botones.map((button) => (button.id === id ? { ...button, [field]: value } : button))
    }));
  };

  const removeButton = (id) => {
    setTemplate((prev) => ({
      ...prev,
      botones: prev.botones.filter((button) => button.id !== id)
    }));
  };

  const selectedDevice = devices.find((device) => String(device.id) === String(template.dispositivoId));

  const availableDevices = devices.map((device) => {
    const esOficial = device.color === 'cloud';
    const esEstadoCompatible = !String(device.estado || '').toLowerCase().includes('no compat');
    return {
      ...device,
      compatible: esOficial && esEstadoCompatible
    };
  });

  const handleSave = async () => {
    if (!template.nombre.trim()) {
      setError('El nombre de la plantilla es obligatorio.');
      return;
    }
    if (!template.cuerpo.trim()) {
      setError('El cuerpo de la plantilla es obligatorio.');
      return;
    }
    if (!template.dispositivoId) {
      setError('Debes seleccionar un dispositivo.');
      return;
    }
    if (template.cabecera === 'Mensaje de texto' && !template.cabeceraTexto.trim()) {
      setError('El texto de cabecera es obligatorio cuando se selecciona cabecera de texto.');
      return;
    }
    if (
      ['Mensaje de imagen', 'Mensaje de video', 'Mensaje de documento'].includes(template.cabecera) &&
      !template.cabeceraArchivo
    ) {
      setError('Debes cargar un archivo para la cabecera seleccionada.');
      return;
    }

    setIsSaving(true);
    setError('');

    const payload = {
      nombre: template.nombre,
      categoria: template.categoria,
      cabecera: template.cabecera,
      cabeceraTexto: template.cabeceraTexto,
      cabeceraArchivo: template.cabeceraArchivo,
      cuerpo: template.cuerpo,
      pie: template.pie,
      botones: template.botones,
      tipo: template.cabecera === 'Ninguna' ? 'Texto' : template.cabecera,
      estado: template.estado || 'Activo',
      fechaCreacion: template.fechaCreacion || new Date().toISOString(),
      dispositivoId: template.dispositivoId,
      dispositivo_nombre: template.dispositivo_nombre || selectedDevice?.nombre || '',
      user_id: user?.id
    };

    try {
      const url = isEditing
        ? `${import.meta.env.VITE_API_URL || ''}/api/plantillas/${id}`
        : `${import.meta.env.VITE_API_URL || ''}/api/plantillas`;
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!data.success) {
        setError(data.message || 'No se pudo guardar la plantilla.');
        return;
      }

      if (data.plantilla) {
        setTemplate((prev) => ({
          ...prev,
          ...data.plantilla,
          dispositivoId: data.plantilla.dispositivo_id,
          dispositivo_nombre: data.plantilla.dispositivo_nombre || prev.dispositivo_nombre || ''
        }));
      }
      setSuccess(isEditing ? 'Plantilla actualizada correctamente.' : 'Plantilla creada correctamente.');
      setTimeout(() => navigate('/plantillas'), 700);
    } catch (err) {
      console.error(err);
      setError('No se pudo guardar la plantilla.');
    } finally {
      setIsSaving(false);
    }
  };

  const headerFileLabel = useMemo(() => {
    if (!template.cabeceraArchivo) return 'Seleccionar archivo';
    return template.cabeceraArchivo.name;
  }, [template.cabeceraArchivo]);

  return (
    <div className="flex min-h-screen bg-transparent font-sans selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-24 mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col min-w-0 space-y-5">

          {/* Cabecera Principal */}
          <div className="flex flex-col gap-2 shrink-0 mb-1">
            <button
              type="button"
              onClick={() => navigate('/plantillas')}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-slate-600 hover:text-slate-900 text-xs font-semibold shadow-2xs transition-all w-fit group mb-1.5"
            >
              <ArrowLeft size={14} className="text-slate-400 group-hover:-translate-x-0.5 group-hover:text-slate-600 transition-transform" />
              <span>Regresar a plantillas</span>
            </button>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
                {isEditing ? 'Editar plantilla' : 'Crear plantilla'}
              </h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Crea las plantillas para tus mensajes de WhatsApp.
              </p>
            </div>
          </div>

          {/* Grid Layout Formulario + Simulador */}
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)] items-start">
            {/* Formulario Estructurado en Tarjetas */}
            <div className="space-y-4 min-w-0">

              {/* Paso 1: Información Básica */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs space-y-3.5 transition-all hover:border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100/60 shadow-2xs">
                      <FileText size={14} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-800">1. Información Básica</h3>
                  </div>
                  <span className="text-[10px] text-emerald-600 font-bold uppercase tracking-wider bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-100/60">Paso 01</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-0.5">
                    <label className="text-xs font-bold text-slate-700">Nombre de la plantilla<span className="text-rose-500 ml-0.5">*</span></label>
                    <span className="text-[10px] font-medium text-slate-400">{template.nombre.length}/512</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Escribe el nombre de la plantilla"
                    value={template.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    className="w-full px-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs text-xs font-medium text-slate-700 placeholder:text-slate-400"
                  />
                </div>

                <div className="grid gap-4 lg:grid-cols-2">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block px-0.5">Categoría<span className="text-rose-500 ml-0.5">*</span></label>
                    <div className="relative">
                      <select
                        value={template.categoria}
                        onChange={(e) => handleChange('categoria', e.target.value)}
                        className="w-full px-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 appearance-none font-semibold text-xs text-slate-700 cursor-pointer transition-all shadow-2xs"
                      >
                        {categoryOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-700 block px-0.5">Cabecera (Opcional)</label>
                    <div className="relative">
                      <select
                        value={template.cabecera}
                        onChange={(e) => {
                          const next = e.target.value;
                          handleChange('cabecera', next);
                          if (next === 'Ninguna') {
                            handleChange('cabeceraTexto', '');
                            handleChange('cabeceraArchivo', null);
                          }
                        }}
                        className="w-full px-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 appearance-none font-semibold text-xs text-slate-700 cursor-pointer transition-all shadow-2xs"
                      >
                        {headerOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {template.cabecera === 'Mensaje de texto' && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-bold text-slate-700 block px-0.5">Texto de cabecera<span className="text-rose-500 ml-0.5">*</span></label>
                    <textarea
                      value={template.cabeceraTexto}
                      onChange={(e) => handleChange('cabeceraTexto', e.target.value)}
                      placeholder="Escribe el texto que aparecerá en la cabecera"
                      className="min-h-[80px] w-full p-3 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs text-xs font-medium text-slate-700 placeholder:text-slate-400"
                    />
                  </div>
                )}

                {['Mensaje de imagen', 'Mensaje de video', 'Mensaje de documento'].includes(template.cabecera) && (
                  <div className="space-y-1 pt-1">
                    <label className="text-xs font-bold text-slate-700 block px-0.5">Archivo de cabecera<span className="text-rose-500 ml-0.5">*</span></label>
                    <div className="relative">
                      <label className="group flex h-20 cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 text-center text-xs text-slate-500 transition hover:border-emerald-500/40 hover:bg-emerald-50/10">
                        <div className="flex items-center gap-2 font-semibold text-xs">
                          {template.cabecera === 'Mensaje de imagen' && <Image size={16} className="text-emerald-500" />}
                          {template.cabecera === 'Mensaje de video' && <Film size={16} className="text-emerald-500" />}
                          {template.cabecera === 'Mensaje de documento' && <FileText size={16} className="text-emerald-500" />}
                          <span>{template.cabeceraArchivo ? headerFileLabel : 'Haz clic para seleccionar archivo'}</span>
                        </div>
                        <span className="text-[10px] text-slate-400 mt-1 font-medium">Límite de tamaño: 16mb</span>
                        <input
                          type="file"
                          accept={template.cabecera === 'Mensaje de imagen' ? 'image/*' : template.cabecera === 'Mensaje de video' ? 'video/*' : '*/*'}
                          onChange={handleHeaderUpload}
                          className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Paso 2: Mensaje */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs space-y-3.5 transition-all hover:border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 border border-indigo-100/60 shadow-2xs">
                      <Sparkles size={14} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-800">2. Mensaje</h3>
                  </div>
                  <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100/60">Paso 02</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-0.5">
                    <label className="text-xs font-bold text-slate-700">Cuerpo del mensaje<span className="text-rose-500 ml-0.5">*</span></label>
                    <span className="text-[10px] font-medium text-slate-400">{template.cuerpo.length}/1024</span>
                  </div>
                  <textarea
                    maxLength={1024}
                    value={template.cuerpo}
                    onChange={(e) => handleChange('cuerpo', e.target.value)}
                    placeholder="Escribe el cuerpo del mensaje..."
                    className="min-h-[120px] w-full p-3 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs text-xs font-medium text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Paso 3: Detalles Finales */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs space-y-3.5 transition-all hover:border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-50 text-blue-600 border border-blue-100/60 shadow-2xs">
                      <Layers size={14} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-800">3. Detalles Finales</h3>
                  </div>
                  <span className="text-[10px] text-blue-600 font-bold uppercase tracking-wider bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100/60">Paso 03</span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-center px-0.5">
                    <label className="text-xs font-bold text-slate-700">Pie de página (Opcional)</label>
                    <span className="text-[10px] font-medium text-slate-400">{template.pie.length}/60</span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    value={template.pie}
                    onChange={(e) => handleChange('pie', e.target.value)}
                    placeholder="Escribe un pie de página o firma de tu empresa"
                    className="w-full px-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition-all shadow-2xs text-xs font-medium text-slate-700 placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Paso 4: Botones */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs space-y-3.5 transition-all hover:border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-50 text-purple-600 border border-purple-100/60 shadow-2xs">
                      <Plus size={14} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-800">4. Botones (Opcional)</h3>
                  </div>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setButtonMenuOpen((prev) => !prev)}
                      className="h-8 px-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
                    >
                      <Plus size={13} /> Añadir botón
                      <ChevronDown size={12} className="text-slate-400" />
                    </button>
                    {buttonMenuOpen && (
                      <div className="absolute right-0 top-[calc(100%+0.3rem)] z-20 w-44 rounded-xl border border-slate-200 bg-white shadow-xl py-1 overflow-hidden text-xs">
                        <button
                          type="button"
                          onClick={() => handleAddButton('personalizado')}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >Personalizado</button>
                        <button
                          type="button"
                          onClick={() => handleAddButton('web')}
                          className="w-full px-3.5 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                        >Ir al sitio web</button>
                      </div>
                    )}
                  </div>
                </div>

                {template.botones.length === 0 ? (
                  <p className="text-xs font-medium text-slate-400 px-0.5">No has añadido botones a esta plantilla.</p>
                ) : (
                  <div className="space-y-2.5">
                    {template.botones.map((button) => (
                      <div key={button.id} className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 relative">
                        <button
                          type="button"
                          onClick={() => removeButton(button.id)}
                          className="absolute top-3.5 right-3.5 text-slate-400 hover:text-rose-500 transition-colors p-1 hover:bg-slate-100 rounded-lg"
                        >
                          <X size={14} />
                        </button>
                        <div className="grid gap-3 max-w-[85%]">
                          <div>
                            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                              Tipo: {button.type === 'web' ? 'Ir al sitio web' : 'Personalizado'}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-700 block">Texto del botón</label>
                            <input
                              type="text"
                              value={button.label}
                              onChange={(e) => updateButton(button.id, 'label', e.target.value)}
                              className="w-full px-3 h-8 bg-white border border-slate-200/80 rounded-lg outline-none focus:border-emerald-500 transition-all text-xs font-medium text-slate-700"
                            />
                          </div>

                          {button.type === 'web' && (
                            <div className="space-y-1">
                              <label className="text-xs font-bold text-slate-700 block">URL del botón</label>
                              <input
                                type="url"
                                value={button.value}
                                onChange={(e) => updateButton(button.id, 'value', e.target.value)}
                                placeholder="https://"
                                className="w-full px-3 h-8 bg-white border border-slate-200/80 rounded-lg outline-none focus:border-emerald-500 transition-all text-xs font-medium text-slate-700"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Paso 5: Configuración del Dispositivo */}
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-2xs space-y-3.5 transition-all hover:border-slate-200/80">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-600 border border-amber-100/60 shadow-2xs">
                      <Sliders size={14} />
                    </div>
                    <h3 className="text-xs font-bold text-slate-800">5. Configuración del Dispositivo</h3>
                  </div>
                  <span className="text-[10px] text-amber-600 font-bold uppercase tracking-wider bg-amber-50 px-2 py-0.5 rounded-md border border-amber-100/60">Paso 05</span>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-bold text-slate-700 block px-0.5">Dispositivo<span className="text-rose-500 ml-0.5">*</span></label>
                  <div className="relative">
                    <select
                      value={template.dispositivoId}
                      onChange={(e) => {
                        const selected = devices.find((device) => String(device.id) === String(e.target.value));
                        handleChange('dispositivoId', e.target.value);
                        handleChange('dispositivo_nombre', selected?.nombre || '');
                      }}
                      className="w-full px-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 appearance-none font-semibold text-xs text-slate-700 cursor-pointer transition-all shadow-2xs"
                    >
                      <option value="">Selecciona un dispositivo</option>
                      {availableDevices.map((device) => (
                        <option key={device.id} value={device.id} disabled={!device.compatible}>
                          {device.nombre} {device.compatible ? '' : '- Número no compatible'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {template.dispositivoId && (
                  <div className="mt-1 px-0.5">
                    {(() => {
                      const sel = devices.find((d) => String(d.id) === String(template.dispositivoId));
                      const compatible = sel ? !String(sel.estado || '').toLowerCase().includes('no compat') : true;
                      return (
                        <span className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-0.5 border text-[11px] font-bold ${compatible ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60' : 'bg-rose-50 text-rose-700 border-rose-200/60'
                          }`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${compatible ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {compatible ? 'Número compatible' : 'Número no compatible'}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              {error && <div className="rounded-xl bg-rose-50 border border-rose-200/80 px-3.5 py-2.5 text-xs font-semibold text-rose-700 shadow-2xs leading-normal">{error}</div>}
              {success && <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 text-xs font-semibold text-emerald-800 shadow-2xs leading-normal">{success}</div>}

              {/* Botones del Pie de Formulario */}
              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => navigate('/plantillas')}
                  className="h-9 px-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 shadow-2xs transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check size={14} />
                      <span>{isEditing ? 'Actualizar Plantilla' : 'Crear Plantilla'}</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Simulador WhatsApp Premium */}
            <div className="border border-slate-200/80 bg-gradient-to-b from-slate-50/80 via-white to-slate-50/50 p-5 rounded-3xl flex flex-col items-center justify-center min-w-0 xl:sticky xl:top-6 shadow-2xs max-w-sm mx-auto w-full">
              
              {/* Header de la Tarjeta del Simulador */}
              <div className="w-full flex items-center justify-between mb-4 pb-3 border-b border-slate-100 px-1">
                <div className="flex items-center gap-2">
                  <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 border border-emerald-100/60 shadow-2xs">
                    <Smartphone size={13} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-800">Vista previa en vivo</p>
                    <p className="text-[10px] font-medium text-slate-400">Simulador de mensaje WhatsApp</p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100/60 text-emerald-600 text-[10px] font-bold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>En vivo</span>
                </div>
              </div>

              {/* Teléfono Físico */}
              <div className="relative w-[285px] h-[515px] bg-slate-900 border-[8px] border-slate-800 rounded-[40px] shadow-[0_20px_50px_-12px_rgba(15,23,42,0.25)] overflow-hidden shrink-0 flex flex-col">

                {/* Dynamic Island / Notch */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-4 bg-slate-800 rounded-b-xl z-20 flex items-center justify-center">
                  <div className="w-3 h-3 rounded-full bg-slate-900/80" />
                </div>

                {/* Header de WhatsApp */}
                <div className="h-11 bg-gradient-to-r from-[#075e54] to-[#128c7e] flex items-center gap-2.5 px-3.5 pt-2 text-white shrink-0 shadow-sm relative z-10">
                  <div className="w-6 h-6 rounded-full bg-white/20 text-xs font-bold flex items-center justify-center uppercase select-none border border-white/20">
                    {template.nombre ? template.nombre.charAt(0) : 'W'}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-bold text-xs truncate leading-tight">{template.nombre || 'Vista previa'}</div>
                    <div className="text-[9px] opacity-80 leading-none">WhatsApp Business</div>
                  </div>
                </div>

                {/* Chat screen con patrón sutil */}
                <div className="flex-1 bg-[#efeae2] p-3.5 overflow-y-auto space-y-2.5 relative">
                  <div className="flex flex-col max-w-[94%] space-y-1 mx-auto">

                    {/* Header bubble */}
                    {template.cabecera !== 'Ninguna' && (
                      <div className="bg-white rounded-xl p-2.5 text-xs font-medium text-slate-700 shadow-2xs border border-slate-200/50 animate-in fade-in duration-200">
                        {template.cabecera === 'Mensaje de texto' ? (
                          <div className="leading-normal break-words font-semibold text-slate-800 text-xs">{template.cabeceraTexto || 'Texto de cabecera'}</div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-slate-600 font-semibold break-all leading-normal text-[11px]">
                            {template.cabecera === 'Mensaje de imagen' && <Image size={15} className="text-emerald-500 shrink-0" />}
                            {template.cabecera === 'Mensaje de video' && <Film size={15} className="text-emerald-500 shrink-0" />}
                            {template.cabecera === 'Mensaje de documento' && <FileText size={15} className="text-emerald-500 shrink-0" />}
                            <span>{template.cabeceraArchivo?.name || 'Archivo adjunto de cabecera'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cuerpo del Mensaje */}
                    <div className="rounded-xl bg-[#d9fdd3] p-2.5 text-xs text-slate-800 shadow-2xs border-b border-black/5 leading-relaxed break-words font-medium animate-in fade-in duration-200">
                      <p className="whitespace-pre-wrap">{template.cuerpo || 'Escribe un mensaje en el formulario para visualizar la vista previa...'}</p>

                      {template.pie && (
                        <p className="text-[10px] text-slate-400 mt-1 border-t border-slate-200/50 pt-1 leading-normal break-words">
                          {template.pie}
                        </p>
                      )}
                    </div>

                    {/* Botones interactivos de WhatsApp */}
                    {template.botones.length > 0 && (
                      <div className="space-y-1 pt-0.5 animate-in fade-in duration-200">
                        {template.botones.map((btn) => (
                          <button
                            key={btn.id}
                            type="button"
                            className="w-full h-7 bg-white text-emerald-600 border border-slate-100 hover:bg-slate-50 rounded-lg text-xs font-bold shadow-2xs active:scale-[0.98] transition flex items-center justify-center gap-1 leading-none"
                          >
                            {btn.type === 'web' && <LinkIcon size={11} className="shrink-0" />}
                            <span>{btn.label || 'Botón sin etiqueta'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Home Indicator */}
                <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center z-20">
                  <div className="h-1 w-16 rounded-full bg-white/30" />
                </div>
              </div>
            </div>

          </div>
        </div>
      </main>

      {/* Custom Alert Modal */}
      {alertModalMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 text-xl">
              ⚠️
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1.5">Atención</h4>
            <p className="text-[12px] text-slate-550 leading-relaxed mb-6 font-medium">
              {alertModalMessage}
            </p>
            <button
              type="button"
              onClick={() => setAlertModalMessage('')}
              className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold transition active:scale-95 shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}