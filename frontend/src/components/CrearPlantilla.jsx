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
  Loader2
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
    <div className="flex min-h-screen bg-transparent font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-24 mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-7 flex flex-col min-w-0 space-y-6">

          {/* Cabecera */}
          <div className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => navigate('/plantillas')}
              className="text-emerald-500 hover:text-emerald-600 transition inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider w-fit"
            >
              <ArrowLeft size={14} /> Regresar
            </button>
            <div className="flex flex-col gap-1">
              <h1 className="text-xl font-bold text-slate-800">
                {isEditing ? 'Editar plantilla' : 'Crear plantilla'}
              </h1>
              <p className="text-[13px] text-slate-400 font-medium mt-1">Crea las plantillas para tus mensajes.</p>
            </div>
          </div>

          {/* Grid Layout Formulario + Simulador */}
          <div className="grid gap-8 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,0.9fr)] items-start">

            {/* Formulario */}
            <div className="space-y-6 min-w-0">

              {/* 1. Información Básica */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>1. Información Básica</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Paso 01</span>
                </h3>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Nombre de la plantilla*</label>
                    <span className="text-[10px] text-slate-300">{template.nombre.length}/512</span>
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="Escribe el nombre de la plantilla"
                    value={template.nombre}
                    onChange={(e) => handleChange('nombre', e.target.value)}
                    className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition shadow-xs text-[12px] font-medium text-slate-700 placeholder:text-slate-350"
                  />
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider px-1">Categoría*</label>
                    <div className="relative">
                      <select
                        value={template.categoria}
                        onChange={(e) => handleChange('categoria', e.target.value)}
                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 appearance-none font-medium text-[12px] text-slate-700 cursor-pointer transition shadow-xs"
                      >
                        {categoryOptions.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-455 uppercase tracking-wider px-1">Cabecera (Opcional)</label>
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
                        className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 appearance-none font-medium text-[12px] text-slate-700 cursor-pointer transition shadow-xs"
                      >
                        {headerOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                      <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                    </div>
                  </div>
                </div>

                {template.cabecera === 'Mensaje de texto' && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider px-1">Texto de cabecera*</label>
                    <textarea
                      value={template.cabeceraTexto}
                      onChange={(e) => handleChange('cabeceraTexto', e.target.value)}
                      placeholder="Escribe el texto que aparecerá en la cabecera"
                      className="min-h-[90px] w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition shadow-xs text-[12px] font-medium text-slate-700 placeholder:text-slate-350"
                    />
                  </div>
                )}

                {['Mensaje de imagen', 'Mensaje de video', 'Mensaje de documento'].includes(template.cabecera) && (
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider px-1">Archivo de cabecera*</label>
                    <div className="relative">
                      <label className="group flex h-24 cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50 px-4 text-center text-xs text-slate-500 transition hover:border-emerald-500/40 hover:bg-emerald-50/10">
                        <div className="flex items-center gap-2 font-semibold text-[11px]">
                          {template.cabecera === 'Mensaje de imagen' && <Image size={18} className="text-emerald-500" />}
                          {template.cabecera === 'Mensaje de video' && <Film size={18} className="text-emerald-500" />}
                          {template.cabecera === 'Mensaje de documento' && <FileText size={18} className="text-emerald-500" />}
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

              {/* 2. Mensaje */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>2. Mensaje</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Paso 02</span>
                </h3>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Cuerpo*</label>
                    <span className="text-[10px] text-slate-300">{template.cuerpo.length}/1024</span>
                  </div>
                  <textarea
                    maxLength={1024}
                    value={template.cuerpo}
                    onChange={(e) => handleChange('cuerpo', e.target.value)}
                    placeholder="Escribe el cuerpo del mensaje..."
                    className="min-h-[140px] w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition shadow-xs text-[12px] font-medium text-slate-700 placeholder:text-slate-350"
                  />
                </div>
              </div>

              {/* 3. Detalles Finales */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>3. Detalles Finales</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Paso 03</span>
                </h3>

                <div className="space-y-1.5">
                  <div className="flex justify-between items-center px-1">
                    <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Pie de página (Opcional)</label>
                    <span className="text-[10px] text-slate-300">{template.pie.length}/60</span>
                  </div>
                  <input
                    type="text"
                    maxLength={60}
                    value={template.pie}
                    onChange={(e) => handleChange('pie', e.target.value)}
                    placeholder="Escribe un pie de página o firma de tu empresa"
                    className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition shadow-xs text-[12px] font-medium text-slate-700 placeholder:text-slate-350"
                  />
                </div>
              </div>

              {/* 4. Botones */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                  <h3 className="text-sm font-bold text-slate-800">4. Botones (Opcional)</h3>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setButtonMenuOpen((prev) => !prev)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-xs font-semibold text-slate-500 hover:bg-slate-50 transition active:scale-95 shadow-xs"
                    >
                      <Plus size={14} /> Añadir botón
                      <ChevronDown size={12} className="text-slate-400" />
                    </button>
                    {buttonMenuOpen && (
                      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-44 rounded-2xl border border-slate-150 bg-white shadow-lg py-1.5 overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
                        <button
                          type="button"
                          onClick={() => handleAddButton('personalizado')}
                          className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-650 hover:bg-slate-50 transition"
                        >Personalizado</button>
                        <button
                          type="button"
                          onClick={() => handleAddButton('web')}
                          className="w-full px-4 py-2.5 text-left text-xs font-semibold text-slate-650 hover:bg-slate-50 transition"
                        >Ir al sitio web</button>
                      </div>
                    )}
                  </div>
                </div>

                {template.botones.length === 0 ? (
                  <p className="text-[11px] text-slate-400 px-1 font-medium">No has añadido botones a esta plantilla.</p>
                ) : (
                  <div className="space-y-3.5">
                    {template.botones.map((button) => (
                      <div key={button.id} className="bg-slate-50/50 border border-slate-200/60 rounded-2xl p-4 relative">
                        <button
                          type="button"
                          onClick={() => removeButton(button.id)}
                          className="absolute top-4 right-4 text-slate-400 hover:text-rose-500 transition-colors p-1.5 hover:bg-slate-100 rounded-full"
                        >
                          <X size={14} />
                        </button>
                        <div className="grid gap-4 max-w-[85%]">
                          <div className="space-y-1">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                              Tipo: {button.type === 'web' ? 'Ir al sitio web' : 'Personalizado'}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block px-1">Texto del botón</label>
                            <input
                              type="text"
                              value={button.label}
                              onChange={(e) => updateButton(button.id, 'label', e.target.value)}
                              className="w-full px-4 h-11 bg-white border border-slate-200 rounded-2xl outline-none focus:border-emerald-500/30 transition text-[12px] font-medium text-slate-700"
                            />
                          </div>

                          {button.type === 'web' && (
                            <div className="space-y-1.5">
                              <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block px-1">URL del botón</label>
                              <input
                                type="url"
                                value={button.value}
                                onChange={(e) => updateButton(button.id, 'value', e.target.value)}
                                placeholder="https://"
                                className="w-full px-4 h-11 bg-white border border-slate-200 rounded-2xl outline-none focus:border-emerald-500/30 transition text-[12px] font-medium text-slate-700"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Configuración del Dispositivo */}
              <div className="space-y-4">
                <h3 className="text-sm font-bold text-slate-800 flex items-center justify-between border-b border-slate-100 pb-2">
                  <span>5. Configuración del Dispositivo</span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">Paso 05</span>
                </h3>

                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block px-1">Dispositivo*</label>
                  <div className="relative">
                    <select
                      value={template.dispositivoId}
                      onChange={(e) => {
                        const selected = devices.find((device) => String(device.id) === String(e.target.value));
                        handleChange('dispositivoId', e.target.value);
                        handleChange('dispositivo_nombre', selected?.nombre || '');
                      }}
                      className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 appearance-none font-medium text-[12px] text-slate-700 cursor-pointer transition shadow-xs"
                    >
                      <option value="">Selecciona un dispositivo</option>
                      {availableDevices.map((device) => (
                        <option key={device.id} value={device.id} disabled={!device.compatible}>
                          {device.nombre} {device.compatible ? '' : '- Número no compatible'}
                        </option>
                      ))}
                    </select>
                    <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {template.dispositivoId && (
                  <div className="mt-2 px-1">
                    {(() => {
                      const sel = devices.find((d) => String(d.id) === String(template.dispositivoId));
                      const compatible = sel ? !String(sel.estado || '').toLowerCase().includes('no compat') : true;
                      return (
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 border text-[10.5px] font-bold uppercase ${compatible ? 'bg-emerald-50/80 border-emerald-100/50 text-emerald-600' : 'bg-rose-50 border border-rose-100/50 text-rose-600'
                          }`}>
                          <span className={`inline-block h-1.5 w-1.5 rounded-full ${compatible ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {compatible ? 'Número compatible' : 'Número no compatible'}
                        </span>
                      );
                    })()}
                  </div>
                )}
              </div>

              {error && <div className="rounded-2xl bg-rose-50 border border-rose-100/50 px-4 py-3 text-xs font-semibold text-rose-700 shadow-xs leading-normal">{error}</div>}
              {success && <div className="rounded-2xl bg-emerald-50 border border-emerald-100/50 px-4 py-3 text-xs font-semibold text-emerald-700 shadow-xs leading-normal">{success}</div>}

              {/* Botones del Pie de Formulario */}
              <div className="pt-4 flex items-center justify-center gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => navigate('/plantillas')}
                  className="flex-1 h-11 border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition duration-150 active:scale-95 bg-white text-[12px] max-w-[140px]"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 h-11 font-bold rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white transition duration-150 active:scale-95 text-[12px] max-w-[200px] flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed shadow-xs"
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

            {/* Simulador WhatsApp */}
            <div className="border border-slate-150 bg-slate-50/40 p-6 rounded-2xl flex flex-col items-center justify-center min-w-0 xl:sticky xl:top-6 shadow-xs max-w-sm mx-auto">
              <div className="w-full flex items-center justify-between mb-4 px-1 text-slate-400">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Vista previa del mensaje</p>
                <div className="text-[10px] font-medium">{formatDate(template.fechaCreacion)}</div>
              </div>

              {/* Teléfono Físico */}
              <div className="relative w-[300px] h-[550px] bg-slate-900 border-[8px] border-slate-800 rounded-[38px] shadow-2xl overflow-hidden shrink-0 flex flex-col">

                {/* Header de WhatsApp */}
                <div className="h-11 bg-[#075e54] flex items-center gap-2.5 px-4 text-white shrink-0 shadow-sm relative">
                  <div className="w-7 h-7 rounded-full bg-white/20 text-xs font-bold flex items-center justify-center uppercase select-none">
                    {template.nombre ? template.nombre.charAt(0) : 'W'}
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-[12px] truncate">{template.nombre || 'Vista previa'}</div>
                    <div className="text-[9px] opacity-80 mt-0.5">Vista en móvil</div>
                  </div>
                </div>

                {/* Chat screen */}
                <div className="flex-1 bg-[#efeae2] p-4 overflow-y-auto space-y-3">
                  <div className="flex flex-col max-w-[90%] space-y-1 mx-auto">

                    {/* Header bubble */}
                    {template.cabecera !== 'Ninguna' && (
                      <div className="bg-white rounded-2xl p-3 text-[11px] font-medium text-slate-700 shadow-xs border border-slate-150/50">
                        {template.cabecera === 'Mensaje de texto' ? (
                          <div className="leading-normal break-words font-semibold text-slate-800">{template.cabeceraTexto || 'Texto de cabecera'}</div>
                        ) : (
                          <div className="flex items-center gap-2 text-slate-500 font-semibold break-all leading-normal text-[10px]">
                            {template.cabecera === 'Mensaje de imagen' && <Image size={14} className="text-emerald-500 shrink-0" />}
                            {template.cabecera === 'Mensaje de video' && <Film size={14} className="text-emerald-500 shrink-0" />}
                            {template.cabecera === 'Mensaje de documento' && <FileText size={14} className="text-emerald-500 shrink-0" />}
                            <span>{template.cabeceraArchivo?.name || 'Archivo de cabecera'}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Cuerpo del Mensaje */}
                    <div className="rounded-2xl bg-[#d9fdd3] p-3 text-[11.5px] text-slate-800 shadow-xs border-b border-black/5 leading-relaxed break-words font-medium">
                      <p>{template.cuerpo || 'Escribe un mensaje para ver la vista previa.'}</p>

                      {template.pie && (
                        <p className="text-[9.5px] text-slate-400 mt-1 border-t border-slate-200/50 pt-1 leading-normal break-words">
                          {template.pie}
                        </p>
                      )}
                    </div>

                    {/* Botones interactivos de WhatsApp */}
                    {template.botones.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        {template.botones.map((btn) => (
                          <button
                            key={btn.id}
                            type="button"
                            className="w-full h-8 bg-white text-emerald-600 border border-slate-100 hover:bg-slate-50 rounded-xl text-[11px] font-bold shadow-xs active:scale-[0.98] transition flex items-center justify-center gap-1 leading-none"
                          >
                            {btn.type === 'web' && <LinkIcon size={11} className="shrink-0" />}
                            <span>{btn.label || 'Botón sin etiqueta'}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Línea inferior del simulador */}
                <div className="absolute bottom-2 left-0 right-0 flex items-center justify-center">
                  <div className="h-1 w-20 rounded-full bg-white/20" />
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