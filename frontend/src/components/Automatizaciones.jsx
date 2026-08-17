import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  Calendar,
  Check,
  ChevronRight,
  Copy,
  Download,
  Edit3,
  ExternalLink,
  Folder,
  FolderPlus,
  Link2,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Trash2,
  UploadCloud,
  Workflow,
  X,
} from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';
import { SkeletonTableRow } from './Skeleton';

const API_URL = import.meta.env.VITE_API_URL || '';

const DISPARADOR_LABELS = {
  palabra_clave: 'Palabra clave',
  nuevo_contacto: 'Nuevo contacto',
  horario: 'Horario',
  cualquier_mensaje: 'Cualquier mensaje',
};

const initialAutomationForm = {
  id: null,
  nombre: '',
  tipo_disparador: 'palabra_clave',
  palabra_clave: '',
  activo: true,
};

function formatDate(value) {
  if (!value) return 'Sin fecha';
  let parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    parsed = new Date(String(value).replace(' ', 'T'));
  }
  if (Number.isNaN(parsed.getTime())) return String(value);
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function MetricChip({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-slate-150/80 rounded-2xl p-4 shadow-2xs flex items-center gap-3.5 hover:border-slate-300 transition-all">
      <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-emerald-600 flex items-center justify-center shrink-0">
        <Icon size={18} />
      </div>
      <div>
        <div className="text-2xl font-black text-slate-900 leading-none">{value}</div>
        <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">{label}</div>
      </div>
    </div>
  );
}

function ModalShell({ isOpen, title, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
              Automatizaciones
            </p>
            <h3 className="text-lg font-black tracking-tight text-slate-900 mt-0.5">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-slate-200 bg-white p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className="px-6 py-6">{children}</div>
      </div>
    </div>
  );
}

export default function Automatizaciones({ user, onLogout }) {
  const navigate = useNavigate();
  const [folders, setFolders] = useState([]);
  const [automations, setAutomations] = useState([]);
  const [breadcrumbs, setBreadcrumbs] = useState([{ id: null, nombre: 'Mis automatizaciones' }]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [showCreateFolderModal, setShowCreateFolderModal] = useState(false);
  const [showDeleteFolderModal, setShowDeleteFolderModal] = useState(false);
  const [showAutomationModal, setShowAutomationModal] = useState(false);

  const [folderName, setFolderName] = useState('');
  const [folderMenuId, setFolderMenuId] = useState(null);
  const [editingFolderId, setEditingFolderId] = useState(null);
  const [editingFolderName, setEditingFolderName] = useState('');
  const [folderToDelete, setFolderToDelete] = useState(null);
  const [automationForm, setAutomationForm] = useState(initialAutomationForm);
  const [automationMenuId, setAutomationMenuId] = useState(null);

  // Estados para Exportar / Importar Plantillas
  const [devices, setDevices] = useState([]);
  const [exportingId, setExportingId] = useState(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState(null);
  const [importDeviceId, setImportDeviceId] = useState('');
  const [importCreateWhalink, setImportCreateWhalink] = useState(true);
  const [importSubmitting, setImportSubmitting] = useState(false);
  const [importError, setImportError] = useState('');
  const [showImportSuccessModal, setShowImportSuccessModal] = useState(false);
  const [importSuccessData, setImportSuccessData] = useState(null);
  const [copiedWhalink, setCopiedWhalink] = useState(false);
  const fileInputRef = React.useRef(null);

  // Cargar dispositivos del usuario
  useEffect(() => {
    const fetchDevices = async () => {
      if (!user?.id) return;
      try {
        const res = await fetch(`${API_URL}/api/dashboard/${user.id}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.dashboard?.dispositivos)) {
          setDevices(data.dashboard.dispositivos);
          const connected = data.dashboard.dispositivos.find((d) => d.estado === 'conectado') || data.dashboard.dispositivos[0];
          if (connected) setImportDeviceId(String(connected.id));
        }
      } catch (err) {
        console.error('Error cargando dispositivos:', err);
      }
    };
    fetchDevices();
  }, [user?.id]);

  const handleExportAutomation = async (automation, e) => {
    e?.stopPropagation();
    if (!automation?.id) return;
    setExportingId(automation.id);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/automatizaciones/${automation.id}/export`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'No se pudo exportar la automatización.');
      }

      const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data.template, null, 2))}`;
      const downloadAnchor = document.createElement('a');
      const cleanName = (automation.nombre || 'automatizacion').replace(/[^a-zA-Z0-9_-]/g, '_');
      downloadAnchor.setAttribute('href', jsonString);
      downloadAnchor.setAttribute('download', `plantilla_${cleanName}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      setError(err.message || 'Error al exportar la automatización');
    } finally {
      setExportingId(null);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        const autoData = parsed.automation || parsed;
        if (!autoData || (!autoData.nodos && !Array.isArray(autoData.nodos))) {
          throw new Error('El archivo no tiene el formato válido de una plantilla de automatización.');
        }
        setImportPreview(parsed);
        setImportError('');
        setShowImportModal(true);
      } catch (err) {
        setError('Archivo inválido: ' + err.message);
      } finally {
        e.target.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmImport = async () => {
    if (!importPreview || !user?.id) return;
    setImportSubmitting(true);
    setImportError('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_URL}/api/automatizaciones/import`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: user.id,
          template: importPreview,
          dispositivo_id: importDeviceId ? Number(importDeviceId) : undefined,
          create_whalink: importCreateWhalink,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Error al importar la plantilla.');
      }

      setShowImportModal(false);
      await loadOverview(currentFolderId, search);

      if (data.whalink) {
        setImportSuccessData(data);
        setShowImportSuccessModal(true);
      }
    } catch (err) {
      setImportError(err.message || 'Error al importar la plantilla.');
    } finally {
      setImportSubmitting(false);
    }
  };

  // Sorting state for table columns
  const [sortField, setSortField] = useState('nombre');
  const [sortOrder, setSortOrder] = useState('asc');

  const handleSort = (field) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const sortedAutomations = useMemo(() => {
    return [...automations].sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];

      if (sortField === 'ejecuciones') {
        aVal = Number(aVal || 0);
        bVal = Number(bVal || 0);
      } else if (sortField === 'creado_en') {
        aVal = new Date(aVal || 0).getTime();
        bVal = new Date(bVal || 0).getTime();
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [automations, sortField, sortOrder]);

  const loadOverview = useCallback(
    async (folderId = currentFolderId, searchValue = search) => {
      if (!user?.id) return;
      setLoading(true);
      setError('');

      try {
        const params = new URLSearchParams({ user_id: String(user.id) });
        if (folderId) params.set('folder_id', String(folderId));
        if (searchValue.trim()) params.set('search', searchValue.trim());

        const response = await fetch(`${API_URL}/api/automatizaciones/overview?${params.toString()}`);
        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'No se pudo cargar el módulo de automatizaciones.');
        }

        setFolders(data.folders || []);
        setAutomations(data.automations || []);
        setBreadcrumbs(data.breadcrumbs || [{ id: null, nombre: 'Mis automatizaciones' }]);
        setCurrentFolder(data.current_folder || null);
        setCurrentFolderId(folderId || null);
      } catch (err) {
        setError(err.message || 'No se pudo cargar el módulo de automatizaciones.');
      } finally {
        setLoading(false);
      }
    },
    [currentFolderId, search, user?.id]
  );

  useEffect(() => {
    if (user?.id) {
      loadOverview(null, '');
    }
  }, [user?.id]);

  const refreshOverviewSilent = useCallback(async () => {
    if (!user?.id) return;
    try {
      const params = new URLSearchParams({ user_id: String(user.id) });
      if (currentFolderId) params.set('folder_id', String(currentFolderId));
      if (search.trim()) params.set('search', search.trim());

      const response = await fetch(`${API_URL}/api/automatizaciones/overview?${params.toString()}`);
      const data = await response.json();
      if (data.success) {
        setFolders(data.folders || []);
        setAutomations(data.automations || []);
      }
    } catch (err) {
      // Ignorar errores en segundo plano
    }
  }, [currentFolderId, search, user?.id]);

  // Actualización en tiempo real (SSE + Polling de respaldo cada 5s sin parpadear)
  useEffect(() => {
    if (!user?.id) return;

    let eventSource = null;
    if (typeof EventSource !== 'undefined') {
      try {
        eventSource = new EventSource(`${API_URL}/api/realtime/whatsapp?user_id=${user.id}`);
        eventSource.onmessage = (e) => {
          try {
            const data = JSON.parse(e.data);
            if (['automation-executed', 'chat-update', 'message-new'].includes(data.event_type)) {
              refreshOverviewSilent();
            }
          } catch (err) {}
        };
      } catch (err) {}
    }

    const interval = setInterval(() => {
      refreshOverviewSilent();
    }, 5000);

    return () => {
      if (eventSource) eventSource.close();
      clearInterval(interval);
    };
  }, [user?.id, refreshOverviewSilent]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadOverview(currentFolderId, search);
    }, 250);
    return () => clearTimeout(timer);
  }, [currentFolderId, search, loadOverview]);


  const totalExecutions = useMemo(
    () => automations.reduce((acc, item) => acc + Number(item.ejecuciones || 0), 0),
    [automations]
  );

  const currentScopeLabel = currentFolder?.nombre || 'Raíz';
  const showFolderControls = breadcrumbs.length < 3;

  const resetFolderUI = () => {
    setFolderMenuId(null);
    setEditingFolderId(null);
    setEditingFolderName('');
    setFolderToDelete(null);
  };

  const handleCreateFolder = async (event) => {
    event.preventDefault();
    if (!folderName.trim() || !user?.id) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/automatizaciones/folders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          nombre: folderName.trim(),
          parent_id: currentFolderId,
        }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo crear la carpeta.');
      }

      setFolderName('');
      setShowCreateFolderModal(false);
      await loadOverview(currentFolderId, search);
    } catch (err) {
      setError(err.message || 'No se pudo crear la carpeta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveFolderEdit = async () => {
    if (!editingFolderId || !editingFolderName.trim() || !user?.id) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(`${API_URL}/api/automatizaciones/folders/${editingFolderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, nombre: editingFolderName.trim() }),
      });
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo actualizar la carpeta.');
      }

      resetFolderUI();
      await loadOverview(currentFolderId, search);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar la carpeta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteFolder = async () => {
    if (!folderToDelete?.id || !user?.id) return;

    setSubmitting(true);
    setError('');
    try {
      const response = await fetch(
        `${API_URL}/api/automatizaciones/folders/${folderToDelete.id}?user_id=${user.id}`,
        { method: 'DELETE' }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo eliminar la carpeta.');
      }

      setShowDeleteFolderModal(false);
      resetFolderUI();
      await loadOverview(currentFolderId, search);
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la carpeta.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveAutomation = async (event) => {
    event.preventDefault();
    if (!user?.id) return;

    const payload = {
      user_id: user.id,
      nombre: automationForm.nombre.trim(),
      tipo_disparador: automationForm.tipo_disparador,
      palabra_clave:
        automationForm.tipo_disparador === 'palabra_clave'
          ? automationForm.palabra_clave.trim()
          : '',
      activo: automationForm.activo,
      carpeta_id: currentFolderId,
    };

    if (!payload.nombre) {
      setError('El nombre de la automatización es obligatorio.');
      return;
    }

    setSubmitting(true);
    setError('');
    try {
      const isEditing = Boolean(automationForm.id);
      const response = await fetch(
        `${API_URL}/api/automatizaciones${isEditing ? `/${automationForm.id}` : ''}`,
        {
          method: isEditing ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo guardar la automatización.');
      }

      setShowAutomationModal(false);
      setAutomationForm(initialAutomationForm);
      await loadOverview(currentFolderId, search);
    } catch (err) {
      setError(err.message || 'No se pudo guardar la automatización.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAutomation = async (automationId) => {
    if (!user?.id || !window.confirm('¿Quieres eliminar esta automatización?')) return;

    setSubmitting(true);
    setError('');
    try {
      const token = (() => {
        const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
        return savedUser?.token || localStorage.getItem('geochat_token') || '';
      })();

      const response = await fetch(
        `${API_URL}/api/automatizaciones/${automationId}?user_id=${user.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo eliminar la automatización.');
      }

      setAutomationMenuId(null);
      await loadOverview(currentFolderId, search);
    } catch (err) {
      setError(err.message || 'No se pudo eliminar la automatización.');
    } finally {
      setSubmitting(false);
    }
  };

  const openCreateAutomationModal = async (e) => {
    if (e) e.preventDefault();
    try {
      const response = await fetch(`${API_URL}/api/automatizaciones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(() => {
            const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
            return savedUser?.token || localStorage.getItem('geochat_token') || '';
          })()}`
        },
        body: JSON.stringify({
          nombre: `Flujo sin título`,
          tipo_disparador: 'palabra_clave',
          palabra_clave: 'disparador_temporal',
          activo: false,
          carpeta_id: currentFolder ? currentFolder.id : null,
          nodos: [
            {
              id: 'trigger-1',
              type: 'triggerNode',
              position: { x: 250, y: 150 },
              data: { label: 'Inicio' }
            }
          ],
          conexiones: []
        })
      });
      const data = await response.json();
      if (data.success && data.automation_id) {
        navigate(`/automatizaciones/editar/${data.automation_id}`);
      } else {
        navigate('/automatizaciones/crear');
      }
    } catch (err) {
      console.error("Error al crear borrador", err);
      navigate('/automatizaciones/crear');
    }
  };

  const openEditAutomationModal = (automation) => {
    navigate(`/automatizaciones/editar/${automation.id}`);
  };

  return (
    <div className="flex h-screen bg-transparent font-sans text-slate-900 selection:bg-emerald-100/50 overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="flex-1 ml-20 h-screen flex flex-col min-w-0 overflow-hidden bg-slate-50/50">
        <Header
          user={user}
          onLogout={onLogout}
          title="GeoChat"
          onRefresh={() => loadOverview(currentFolderId, search)}
          isLoading={loading}
        />

        {/* CONTENEDOR TARJETA ESTÁNDAR */}
        <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
          <div className="bg-white rounded-2xl border border-slate-100/80 shadow-[0_8px_30px_rgba(15,23,42,0.06)] p-5 flex-1 flex flex-col min-h-0 overflow-hidden">
            <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col custom-scrollbar">
          
          {/* HEADER SECTION (MATCHING TABLEROS / WHALINKS) */}
          <div className="flex items-center justify-between mb-4 shrink-0 pb-4 border-b border-slate-100">
            <div>
              {breadcrumbs.length > 1 && (
                <div className="mb-1.5 flex flex-wrap items-center gap-1.5 text-xs font-bold text-slate-400">
                  {breadcrumbs.map((item, index) => (
                    <React.Fragment key={`${item.id ?? 'root'}-${index}`}>
                      {index > 0 && <ChevronRight size={13} className="text-slate-300" />}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentFolderId(item.id ?? null);
                          setFolderMenuId(null);
                        }}
                        className={`transition hover:text-emerald-600 ${
                          index === breadcrumbs.length - 1 ? 'text-emerald-600 font-bold' : 'text-slate-500'
                        }`}
                      >
                        {item.nombre}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}
              <h1 className="text-2xl font-extrabold text-slate-800 tracking-tight mb-0.5">
                {currentFolder ? currentFolder.nombre : 'Mis automatizaciones'}
              </h1>
              <p className="text-xs font-medium text-slate-400">
                Administra y gestiona todas tus automatizaciones creadas en la aplicación.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {showFolderControls && (
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(true)}
                  className="h-9 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                >
                  <FolderPlus size={14} />
                  {currentFolder ? 'Crear subcarpeta' : 'Crear carpeta'}
                </button>
              )}
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileSelect}
                accept=".json"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="h-9 px-3.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                title="Importar automatización desde archivo .json"
              >
                <UploadCloud size={15} className="text-slate-500" />
                Importar plantilla
              </button>
              <button
                type="button"
                onClick={openCreateAutomationModal}
                className="h-9 px-3.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-xs font-semibold hover:shadow-md transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Plus size={15} />
                Crear automatización
              </button>
            </div>
          </div>

          {/* STAT CARDS (PRESERVED "TARJETITAS" AS REQUESTED BY USER) */}
          {showFolderControls && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 shrink-0">
              <MetricChip
                icon={Folder}
                label={currentFolder ? 'Subcarpetas visibles' : 'Carpetas visibles'}
                value={folders.length}
              />
              <MetricChip icon={Workflow} label="Flujos visibles" value={automations.length} />
              <MetricChip icon={Sparkles} label={`Ejecuciones en ${currentScopeLabel}`} value={totalExecutions} />
            </div>
          )}

          {/* SEARCH BAR */}
          <div className="mb-6 shrink-0">
            <div className="relative max-w-md">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Buscar por nombre, palabra clave o disparador..."
                className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 font-medium text-slate-800 placeholder-slate-400 transition-all shadow-2xs"
              />
            </div>
          </div>

          {error && (
            <div className="mb-5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs font-bold text-rose-600 flex items-start gap-2 shrink-0">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* SECTION 1: CARPETAS */}
          {showFolderControls && (
            <div className="mb-8 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-bold text-slate-800">Carpetas</h2>
                {folders.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCreateFolderModal(true)}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 hover:bg-slate-200/80 text-slate-700 font-bold text-[11px] rounded-lg border border-slate-200/60 transition cursor-pointer"
                  >
                    <FolderPlus size={13} /> Nueva carpeta
                  </button>
                )}
              </div>

              {folders.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-4 text-xs font-medium text-slate-400">
                  No tienes carpetas creadas, crea una nueva para organizar tus archivos.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {folders.map((folder) => {
                    const isEditing = editingFolderId === folder.id;
                    const isOpen = folderMenuId === folder.id;

                    return (
                      <div
                        key={folder.id}
                        className="relative rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs hover:border-emerald-300 transition-all flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <div className="w-9 h-9 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                            <Folder size={17} />
                          </div>
                          <div className="min-w-0 flex-1">
                            {isEditing ? (
                              <input
                                autoFocus
                                value={editingFolderName}
                                onChange={(event) => setEditingFolderName(event.target.value)}
                                onBlur={handleSaveFolderEdit}
                                onKeyDown={(event) => {
                                  if (event.key === 'Enter') {
                                    event.preventDefault();
                                    handleSaveFolderEdit();
                                  }
                                  if (event.key === 'Escape') {
                                    resetFolderUI();
                                  }
                                }}
                                className="h-8 w-full rounded-lg border border-emerald-300 bg-white px-2 text-xs font-bold text-slate-900 outline-none"
                              />
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentFolderId(folder.id);
                                  setFolderMenuId(null);
                                }}
                                className="block truncate text-left text-xs font-bold text-slate-900 hover:text-emerald-600 transition cursor-pointer"
                              >
                                {folder.nombre}
                              </button>
                            )}
                            <p className="text-[11px] text-slate-400 font-medium">Creada {formatDate(folder.creado_en)}</p>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => setFolderMenuId((prev) => (prev === folder.id ? null : folder.id))}
                          className="w-7 h-7 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:bg-slate-50 flex items-center justify-center transition cursor-pointer shrink-0"
                        >
                          <MoreVertical size={14} />
                        </button>

                        {isOpen && (
                          <div className="absolute right-3 top-full mt-1 z-30 w-36 rounded-xl border border-slate-200 bg-white shadow-xl overflow-hidden text-left py-1 animate-in fade-in duration-100">
                            <button
                              type="button"
                              onClick={() => {
                                setCurrentFolderId(folder.id);
                                setFolderMenuId(null);
                              }}
                              className="block w-full px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                              Abrir
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setEditingFolderId(folder.id);
                                setEditingFolderName(folder.nombre);
                                setFolderMenuId(folder.id);
                              }}
                              className="block w-full px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition"
                            >
                              {isEditing ? 'Dejar de editar' : 'Editar'}
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFolderToDelete(folder);
                                setShowDeleteFolderModal(true);
                                setFolderMenuId(null);
                              }}
                              className="block w-full px-3 py-1.5 text-xs font-bold text-rose-500 hover:bg-rose-50 transition"
                            >
                              Eliminar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* SECTION 2: FLUJOS / TABLA DE AUTOMATIZACIONES */}
          <div className="flex-1 flex flex-col min-h-0">
            <h2 className="text-sm font-bold text-slate-800 mb-3">Flujos</h2>

            <div className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs flex-1 flex flex-col">
              <div className="overflow-x-auto custom-scrollbar flex-1">
                <table className="w-full min-w-[720px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100 select-none">
                      <th
                        onClick={() => handleSort('nombre')}
                        className="px-6 py-3.5 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100/70 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          Nombre
                          <span className={`text-[12px] ${sortField === 'nombre' ? 'text-emerald-600 font-black' : 'text-slate-400'}`}>
                            {sortField === 'nombre' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                          </span>
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort('ejecuciones')}
                        className="px-6 py-3.5 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100/70 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          Ejecuciones
                          <span className={`text-[12px] ${sortField === 'ejecuciones' ? 'text-emerald-600 font-black' : 'text-slate-400'}`}>
                            {sortField === 'ejecuciones' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                          </span>
                        </span>
                      </th>
                      <th
                        onClick={() => handleSort('creado_en')}
                        className="px-6 py-3.5 text-xs font-bold text-slate-800 cursor-pointer hover:bg-slate-100/70 transition-colors"
                      >
                        <span className="flex items-center gap-1.5">
                          Fecha de creación
                          <span className={`text-[12px] ${sortField === 'creado_en' ? 'text-emerald-600 font-black' : 'text-slate-400'}`}>
                            {sortField === 'creado_en' ? (sortOrder === 'asc' ? '↑' : '↓') : '⇅'}
                          </span>
                        </span>
                      </th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-800">Estado</th>
                      <th className="px-6 py-3.5 text-xs font-bold text-slate-800 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <>
                        {Array.from({ length: 4 }).map((_, i) => <SkeletonTableRow key={i} cols={5} />)}
                      </>
                    ) : sortedAutomations.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-16 text-center">
                          {/* EMPTY STATE ILLUSTRATION (MATCHING MOCKUP IMAGE 1) */}
                          <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                            <div className="w-16 h-16 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center mb-4 text-purple-600 shadow-2xs">
                              <Sparkles size={28} />
                            </div>
                            <h3 className="font-black text-slate-900 text-base mb-1">No se encontraron resultados</h3>
                            <p className="text-xs text-slate-400 font-medium mb-6 text-center leading-relaxed">
                              Aún no tienes automatizaciones creadas.<br />Crea tu primera automatización para comenzar.
                            </p>
                            <button
                              type="button"
                              onClick={openCreateAutomationModal}
                              className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-2xs cursor-pointer"
                            >
                              <Plus size={15} /> Crear automatización
                            </button>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      sortedAutomations.map((automation) => (
                        <tr key={automation.id} className="group hover:bg-slate-50/70 transition-colors">
                          <td className="px-6 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-xl bg-purple-100/70 text-purple-600 flex items-center justify-center shrink-0">
                                <Bot size={16} />
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openEditAutomationModal(automation)}
                                  className="font-bold text-slate-900 text-xs hover:text-emerald-600 transition truncate text-left cursor-pointer"
                                >
                                  {automation.nombre}
                                </button>
                                {automation.palabra_clave && (
                                  <p className="text-[11px] text-slate-400 font-medium truncate">
                                    {DISPARADOR_LABELS[automation.tipo_disparador] || automation.tipo_disparador}: {automation.palabra_clave}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-3.5 text-xs font-bold text-slate-800">
                            {automation.ejecuciones || 0}
                          </td>
                          <td className="px-6 py-3.5 text-xs font-medium text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-slate-400 shrink-0" />
                              {formatDate(automation.creado_en)}
                            </div>
                          </td>
                          <td className="px-6 py-3.5">
                            <span
                              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                                automation.activo
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                                  : 'bg-slate-100 text-slate-500 border border-slate-200/60'
                              }`}
                            >
                              <span className={`w-1.5 h-1.5 rounded-full ${automation.activo ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                              {automation.activo ? 'Activa' : 'Pausada'}
                            </span>
                          </td>
                          <td className="px-6 py-3.5 text-right">
                            <div className="relative inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => handleExportAutomation(automation, e)}
                                disabled={exportingId === automation.id}
                                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-purple-50 hover:text-purple-600 hover:border-purple-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                title="Exportar plantilla (.json)"
                              >
                                <Download size={14} className={exportingId === automation.id ? 'animate-bounce text-purple-600' : ''} />
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditAutomationModal(automation)}
                                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                title="Editar automatización"
                              >
                                <Edit3 size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteAutomation(automation.id)}
                                className="w-7 h-7 rounded-lg border border-slate-200 text-slate-500 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 flex items-center justify-center transition-all cursor-pointer shadow-2xs"
                                title="Eliminar automatización"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </main>

      {/* MODAL CREAR CARPETA */}
      <ModalShell
        isOpen={showCreateFolderModal}
        title={currentFolder ? 'Crear subcarpeta' : 'Crear carpeta'}
        onClose={() => {
          setShowCreateFolderModal(false);
          setFolderName('');
        }}
      >
        <form onSubmit={handleCreateFolder} className="space-y-5">
          <p className="text-xs text-slate-500 leading-relaxed font-medium">
            {currentFolder
              ? `Crea una subcarpeta dentro de "${currentFolder.nombre}" para seguir organizando tus automatizaciones.`
              : 'Crea una carpeta para agrupar tus automatizaciones por objetivo o proceso.'}
          </p>
          <input
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Nombre de la carpeta"
            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-2xs font-medium"
            required
          />
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowCreateFolderModal(false);
                setFolderName('');
              }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* MODAL ELIMINAR CARPETA */}
      <ModalShell
        isOpen={showDeleteFolderModal}
        title="Eliminar carpeta"
        onClose={() => {
          setShowDeleteFolderModal(false);
          setFolderToDelete(null);
        }}
      >
        <div className="space-y-5">
          <div className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-xs font-medium text-rose-600 leading-relaxed">
            Antes de eliminar esta carpeta, verifica que no tenga subcarpetas ni flujos activos.
          </div>
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowDeleteFolderModal(false);
                setFolderToDelete(null);
              }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteFolder}
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-white font-bold text-xs transition shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </ModalShell>

      {/* MODAL CREAR/EDITAR AUTOMATIZACION */}
      <ModalShell
        isOpen={showAutomationModal}
        title={automationForm.id ? 'Editar automatización' : 'Crear automatización'}
        onClose={() => {
          setShowAutomationModal(false);
          setAutomationForm(initialAutomationForm);
        }}
      >
        <form onSubmit={handleSaveAutomation} className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Nombre
            </label>
            <input
              value={automationForm.nombre}
              onChange={(event) =>
                setAutomationForm((prev) => ({ ...prev, nombre: event.target.value }))
              }
              placeholder="Ej: Bienvenida automática"
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-100 transition shadow-2xs font-medium"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-bold text-slate-700">
              Disparador
            </label>
            <select
              value={automationForm.tipo_disparador}
              onChange={(event) =>
                setAutomationForm((prev) => ({
                  ...prev,
                  tipo_disparador: event.target.value,
                  palabra_clave: event.target.value === 'palabra_clave' ? prev.palabra_clave : '',
                }))
              }
              className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 outline-none focus:border-emerald-500 font-medium cursor-pointer"
            >
              {Object.entries(DISPARADOR_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {automationForm.tipo_disparador === 'palabra_clave' && (
            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Palabra clave
              </label>
              <input
                value={automationForm.palabra_clave}
                onChange={(event) =>
                  setAutomationForm((prev) => ({ ...prev, palabra_clave: event.target.value }))
                }
                placeholder="Ej: precio"
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 outline-none focus:border-emerald-500 font-medium"
              />
            </div>
          )}

          <label className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={automationForm.activo}
              onChange={(event) =>
                setAutomationForm((prev) => ({ ...prev, activo: event.target.checked }))
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <div>
              <p className="text-xs font-bold text-slate-800">Automatización activa</p>
              <p className="text-[11px] text-slate-400 font-medium">Si la apagas, se guarda pero no se ejecuta.</p>
            </div>
          </label>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => {
                setShowAutomationModal(false);
                setAutomationForm(initialAutomationForm);
              }}
              className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition shadow-2xs disabled:opacity-60 cursor-pointer"
            >
              {submitting ? 'Guardando...' : automationForm.id ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </ModalShell>

      {/* MODAL IMPORTAR PLANTILLA */}
      <ModalShell
        isOpen={showImportModal}
        title="Importar plantilla de automatización"
        onClose={() => {
          setShowImportModal(false);
          setImportPreview(null);
          setImportError('');
        }}
      >
        {importPreview && (
          <div className="space-y-4">
            {importError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-bold text-rose-600 flex items-start gap-2">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{importError}</span>
              </div>
            )}

            <div className="rounded-xl border border-slate-150 bg-slate-50/80 p-3.5 space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
                  <Workflow size={16} />
                </div>
                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-800 truncate">
                    {importPreview.automation?.nombre || importPreview.nombre || 'Automatización'}
                  </h4>
                  <p className="text-[11px] text-slate-400 font-medium">
                    {importPreview.automation?.nodos?.length || 0} nodos en el flujo
                  </p>
                </div>
              </div>

              {(importPreview.automation?.palabra_clave || importPreview.palabra_clave) && (
                <div className="bg-white rounded-lg border border-slate-200/80 p-2.5 text-[11px]">
                  <span className="font-bold text-slate-600">Frase disparadora: </span>
                  <span className="text-slate-800 italic">
                    "{importPreview.automation?.palabra_clave || importPreview.palabra_clave}"
                  </span>
                </div>
              )}
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-bold text-slate-700">
                Dispositivo de WhatsApp a asignar
              </label>
              <select
                value={importDeviceId}
                onChange={(e) => setImportDeviceId(e.target.value)}
                className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-xs text-slate-800 outline-none focus:border-emerald-500 font-medium cursor-pointer"
              >
                {devices.length === 0 ? (
                  <option value="">No hay dispositivos conectados</option>
                ) : (
                  devices.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.nombre || 'Dispositivo'} {d.numero_telefono ? `(${d.numero_telefono})` : ''} - {d.estado}
                    </option>
                  ))
                )}
              </select>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-emerald-150 bg-emerald-50/50 p-3 cursor-pointer">
              <input
                type="checkbox"
                checked={importCreateWhalink}
                onChange={(e) => setImportCreateWhalink(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-emerald-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
              />
              <div>
                <p className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                  <Link2 size={13} className="text-emerald-600" />
                  Auto-crear enlace Whalink de WhatsApp
                </p>
                <p className="text-[11px] text-emerald-800/80 font-medium">
                  Genera automáticamente un enlace corto único listo para compartir que activa este flujo.
                </p>
              </div>
            </label>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportModal(false);
                  setImportPreview(null);
                  setImportError('');
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={importSubmitting}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition shadow-2xs disabled:opacity-60 cursor-pointer flex items-center justify-center gap-1.5"
              >
                <UploadCloud size={14} />
                {importSubmitting ? 'Importando...' : 'Importar ahora'}
              </button>
            </div>
          </div>
        )}
      </ModalShell>

      {/* MODAL ÉXITO DE IMPORTACIÓN CON WHALINK */}
      <ModalShell
        isOpen={showImportSuccessModal}
        title="¡Automatización importada con éxito!"
        onClose={() => {
          setShowImportSuccessModal(false);
          setImportSuccessData(null);
          setCopiedWhalink(false);
        }}
      >
        {importSuccessData && (
          <div className="space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-2xs">
              <Sparkles size={24} />
            </div>

            <div>
              <h4 className="text-sm font-bold text-slate-900">
                Tu flujo y tu enlace están listos
              </h4>
              <p className="text-xs text-slate-500 font-medium mt-1">
                La automatización ha sido configurada y vinculada a tu cuenta.
              </p>
            </div>

            {importSuccessData.whalink?.short_url && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-left space-y-2">
                <p className="text-[11px] font-bold text-emerald-900 flex items-center gap-1.5">
                  <Link2 size={13} className="text-emerald-600" />
                  Tu enlace de WhatsApp (Whalink):
                </p>
                <div className="flex items-center gap-2">
                  <input
                    readOnly
                    value={importSuccessData.whalink.short_url}
                    className="w-full bg-white border border-emerald-200 rounded-lg px-3 py-1.5 text-xs text-emerald-950 font-mono font-medium outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(importSuccessData.whalink.short_url);
                      setCopiedWhalink(true);
                      setTimeout(() => setCopiedWhalink(false), 2000);
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center gap-1 shrink-0 cursor-pointer"
                  >
                    {copiedWhalink ? <Check size={13} /> : <Copy size={13} />}
                    {copiedWhalink ? 'Copiado' : 'Copiar'}
                  </button>
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowImportSuccessModal(false);
                  setImportSuccessData(null);
                }}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-xs text-slate-600 hover:bg-slate-50 transition cursor-pointer"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  const autoId = importSuccessData.automation_id;
                  setShowImportSuccessModal(false);
                  setImportSuccessData(null);
                  if (autoId) navigate(`/automatizaciones/editar/${autoId}`);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-2xs"
              >
                <Edit3 size={13} />
                Editar flujo en el lienzo
              </button>
            </div>
          </div>
        )}
      </ModalShell>
    </div>
  );
}
