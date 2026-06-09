import React, { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Plus, Check, Upload, X, ChevronDown, Image, Film, FileText, Link as LinkIcon } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from './Sidebar';
import { getAuthHeaders } from '../utils/authHeaders';

const MAX_FILE_SIZE = 16 * 1024 * 1024;

const formatDate = (value) => {
  if (!value) return '—';
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
            dispositivo_nombre: data.plantilla.dispositivo_nombre || data.plantilla.dispositivo_nombre || '',
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

  const availableDevices = devices.map((device) => ({
    ...device,
    compatible: !String(device.estado || '').toLowerCase().includes('no compat')
  }));

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
    <div className="flex h-screen bg-[#f5f7fb] font-sans text-slate-900 overflow-hidden">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-6 flex flex-col min-w-0 max-w-full max-h-[calc(100vh-3rem)] overflow-hidden">
        <div className="mb-6 flex flex-col gap-4">
          <button
            type="button"
            onClick={() => navigate('/plantillas')}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#6366f1] hover:text-[#4f46e5]"
          >
            <ArrowLeft size={16} /> Regresar
          </button>
          <div className="flex flex-col gap-1">
            <h1 className="text-3xl font-black tracking-[-0.03em] text-slate-900">{isEditing ? 'Editar plantilla' : 'Crear plantilla'}</h1>
            <p className="text-sm text-slate-500">Crea las plantillas para tus mensajes.</p>
          </div>
        </div>

        <div className="flex-1 min-w-0 overflow-y-auto pb-6">
          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.9fr)] max-w-full">
            <div className="space-y-6 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm min-w-0">
            <div className="grid gap-6 min-w-0">
              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Nombre de la plantilla*
                <input
                  type="text"
                  maxLength={512}
                  value={template.nombre}
                  onChange={(e) => handleChange('nombre', e.target.value)}
                  placeholder="Escribe el nombre"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef2ff]"
                />
                <div className="text-right text-[11px] text-slate-400">{template.nombre.length}/512</div>
              </label>

              <div className="grid gap-6 lg:grid-cols-2">
                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Categoría*
                  <select
                    value={template.categoria}
                    onChange={(e) => handleChange('categoria', e.target.value)}
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef2ff]"
                  >
                    {categoryOptions.map((option) => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </label>
                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Cabecera (Opcional)
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
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef2ff]"
                  >
                    {headerOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              {template.cabecera === 'Mensaje de texto' && (
                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Texto de cabecera*
                  <textarea
                    value={template.cabeceraTexto}
                    onChange={(e) => handleChange('cabeceraTexto', e.target.value)}
                    className="min-h-[100px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef2ff]"
                  />
                </label>
              )}

              {['Mensaje de imagen', 'Mensaje de video', 'Mensaje de documento'].includes(template.cabecera) && (
                <label className="space-y-2 text-sm font-semibold text-slate-700">
                  Archivo
                  <div className="relative">
                    <label className="group flex h-28 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed border-[#c7d2fe] bg-[#f8fbff] px-4 text-center text-sm text-[#4f46e5] transition hover:border-[#6366f1] hover:bg-[#eef2ff]">
                      <div className="flex items-center gap-2">
                        {template.cabecera === 'Mensaje de imagen' && <Image size={20} />}
                        {template.cabecera === 'Mensaje de video' && <Film size={20} />}
                        {template.cabecera === 'Mensaje de documento' && <FileText size={20} />}
                        <span>{template.cabeceraArchivo ? headerFileLabel : template.cabecera}</span>
                      </div>
                      <span className="text-xs text-slate-400 mt-1">Los archivos no pueden pesar más de 16mb.</span>
                      <input
                        type="file"
                        accept={template.cabecera === 'Mensaje de imagen' ? 'image/*' : template.cabecera === 'Mensaje de video' ? 'video/*' : '*/*'}
                        onChange={handleHeaderUpload}
                        className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
                      />
                    </label>
                  </div>
                </label>
              )}

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Cuerpo*
                <textarea
                  maxLength={1024}
                  value={template.cuerpo}
                  onChange={(e) => handleChange('cuerpo', e.target.value)}
                  placeholder="Escribe un mensaje..."
                  className="min-h-[160px] w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef2ff]"
                />
                <div className="text-right text-[11px] text-slate-400">{template.cuerpo.length}/1024</div>
              </label>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Pie de página (Opcional)
                <input
                  type="text"
                  maxLength={60}
                  value={template.pie}
                  onChange={(e) => handleChange('pie', e.target.value)}
                  placeholder="Escribe el pie de página"
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef2ff]"
                />
                <div className="text-right text-[11px] text-slate-400">{template.pie.length}/60</div>
              </label>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-slate-700">Botones (Opcional)</p>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setButtonMenuOpen((prev) => !prev)}
                      className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-[#6366f1] hover:text-[#1e40af]"
                    >
                      <Plus size={16} /> Añadir botón
                      <ChevronDown size={14} />
                    </button>
                    {buttonMenuOpen && (
                      <div className="absolute right-0 top-[calc(100%+0.5rem)] z-20 w-48 rounded-3xl border border-slate-200 bg-white shadow-lg">
                        <button
                          type="button"
                          onClick={() => handleAddButton('personalizado')}
                          className="w-full px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                        >Personalizado</button>
                        <button
                          type="button"
                          onClick={() => handleAddButton('web')}
                          className="w-full px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                        >Ir al sitio web</button>
                      </div>
                    )}
                  </div>
                </div>
                {template.botones.length === 0 ? (
                  <div className="rounded-3xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-sm text-slate-500">
                    Agrega botones para mejorar tu plantilla.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {template.botones.map((button) => (
                      <div key={button.id} className="rounded-3xl border border-slate-200 bg-slate-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-slate-800">{button.type === 'web' ? 'Botón web' : 'Botón personalizado'}</div>
                          <button
                            type="button"
                            onClick={() => removeButton(button.id)}
                            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition hover:bg-slate-100 hover:text-rose-600"
                          >
                            <X size={16} />
                          </button>
                        </div>
                        <div className="mt-4 grid gap-4 md:grid-cols-2">
                          <label className="space-y-2 text-sm text-slate-700">
                            Texto del botón
                            <input
                              type="text"
                              value={button.label}
                              onChange={(e) => updateButton(button.id, 'label', e.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef2ff]"
                            />
                          </label>
                          {button.type === 'web' && (
                            <label className="space-y-2 text-sm text-slate-700">
                              URL del botón
                              <input
                                type="url"
                                value={button.value}
                                onChange={(e) => updateButton(button.id, 'value', e.target.value)}
                                placeholder="https://"
                                className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef2ff]"
                              />
                            </label>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <label className="space-y-2 text-sm font-semibold text-slate-700">
                Dispositivo*
                <select
                  value={template.dispositivoId}
                  onChange={(e) => {
                    const selected = devices.find((device) => String(device.id) === String(e.target.value));
                    handleChange('dispositivoId', e.target.value);
                    handleChange('dispositivo_nombre', selected?.nombre || '');
                  }}
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-[#6366f1] focus:ring-2 focus:ring-[#eef2ff]"
                >
                  <option value="">Selecciona un dispositivo</option>
                  {availableDevices.map((device) => (
                    <option key={device.id} value={device.id} disabled={!device.compatible}>
                      {device.nombre} {device.compatible ? '' : '- Número no compatible'}
                    </option>
                  ))}
                </select>
              </label>

              {template.dispositivoId && (
                <div className="mt-2">
                  {(() => {
                    const sel = devices.find((d) => String(d.id) === String(template.dispositivoId));
                    const compatible = sel ? !String(sel.estado || '').toLowerCase().includes('no compat') : true;
                    return (
                      <span className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-semibold ${compatible ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                        <span className={`inline-block h-2 w-2 rounded-full ${compatible ? 'bg-emerald-600' : 'bg-rose-600'}`} />
                        {compatible ? 'Número compatible' : 'Número no compatible'}
                      </span>
                    );
                  })()}
                </div>
              )}

              {error && <div className="rounded-3xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}
              {success && <div className="rounded-3xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{success}</div>}

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => navigate('/plantillas')}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-slate-300 bg-white px-6 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={isSaving}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#6366f1] px-6 text-sm font-semibold text-white transition hover:bg-[#4f46e5] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <Check size={16} /> {isSaving ? 'Guardando...' : isEditing ? 'Actualizar plantilla' : 'Crear plantilla'}
                </button>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-[#f8fafc] p-6 shadow-sm min-w-0 xl:sticky xl:top-24 xl:self-start xl:max-h-[calc(100vh-6rem)] xl:overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-slate-500">Vista previa de la plantilla</p>
              </div>
              <div className="text-xs text-slate-400">{formatDate(template.fechaCreacion)}</div>
            </div>

            <div className="mx-auto max-w-[360px] rounded-[2rem] border border-slate-200 bg-white shadow-sm">
              <div className="rounded-t-[2rem] bg-[#0f9d58] px-4 py-4 text-white">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white/15 text-sm font-black">W</span>
                  <div>
                    <p className="font-semibold">WhatsApp</p>
                    <p className="text-[11px] text-white/80">Vista en móvil</p>
                  </div>
                </div>
              </div>
              <div className="p-5 space-y-3">
                {template.cabecera !== 'Ninguna' && (
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                        {template.cabecera === 'Mensaje de texto' ? (
                          <div className="text-sm text-slate-700">{template.cabeceraTexto || 'Texto de cabecera'}</div>
                        ) : template.cabeceraArchivo ? (
                          <div className="flex items-center gap-3">
                            {template.cabecera === 'Mensaje de imagen' && template.cabeceraArchivo?.dataUrl ? (
                              <img src={template.cabeceraArchivo.dataUrl} alt={template.cabeceraArchivo.name} className="max-h-28 rounded-lg object-cover" />
                            ) : template.cabecera === 'Mensaje de imagen' ? (
                              <div className="inline-flex items-center gap-3"><Image size={20} /><span className="text-sm font-semibold text-slate-700">{template.cabeceraArchivo.name}</span></div>
                            ) : template.cabecera === 'Mensaje de video' && template.cabeceraArchivo?.dataUrl ? (
                              <video src={template.cabeceraArchivo.dataUrl} controls className="max-h-32 rounded-md" />
                            ) : template.cabecera === 'Mensaje de video' ? (
                              <div className="inline-flex items-center gap-3"><Film size={20} /><span className="text-sm font-semibold text-slate-700">{template.cabeceraArchivo.name}</span></div>
                            ) : template.cabecera === 'Mensaje de documento' && template.cabeceraArchivo?.dataUrl ? (
                              <a href={template.cabeceraArchivo.dataUrl} download={template.cabeceraArchivo.name} className="inline-flex items-center gap-3 text-sm font-semibold text-slate-700">
                                <FileText size={20} />{template.cabeceraArchivo.name}
                              </a>
                            ) : (
                              <div className="inline-flex items-center gap-3"><FileText size={20} /><span className="text-sm font-semibold text-slate-700">{template.cabeceraArchivo.name}</span></div>
                            )}
                          </div>
                        ) : (
                          <div className="text-sm text-slate-400">Archivo pendiente</div>
                        )}
                  </div>
                )}

                <div className="rounded-[2rem] bg-[#ecfdf5] p-4 text-sm text-slate-900">
                  <p className="text-sm font-semibold text-slate-800">{template.cuerpo || 'Escribe un mensaje para ver la vista previa.'}</p>
                </div>

                {template.pie && (
                  <div className="text-xs text-slate-400">{template.pie}</div>
                )}

                {template.botones.length > 0 && (
                  <div className="space-y-2">
                    {template.botones.map((button) => (
                      <button
                        key={button.id}
                        type="button"
                        className="flex w-full items-center justify-between rounded-2xl bg-[#eef2ff] px-4 py-3 text-left text-sm font-semibold text-[#1e3a8a] transition hover:bg-[#dbeafe]"
                      >
                        <span>{button.label || (button.type === 'web' ? 'Ir al sitio web' : 'Botón personalizado')}</span>
                        {button.type === 'web' ? <LinkIcon size={16} /> : <Check size={16} />}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
