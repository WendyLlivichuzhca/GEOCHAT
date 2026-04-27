import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Bot,
  Calendar,
  ChevronRight,
  Folder,
  FolderPlus,
  MoreVertical,
  Plus,
  Search,
  Sparkles,
  Workflow,
  X,
} from 'lucide-react';
import Sidebar from './Sidebar';
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
  const parsed = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
}

function MetricChip({ icon: Icon, label, value, tone = 'indigo' }) {
  const tones = {
    indigo: 'from-[#ecfdf5] to-[#f0fdf9] text-[#059669] border-[#a7f3d0]',
    cyan: 'from-[#ecfeff] to-[#f0fdf9] text-[#0891b2] border-[#a5f3fc]',
    emerald: 'from-[#ecfdf5] to-[#f0fdf4] text-[#10b981] border-[#6ee7b7]',
  };

  return (
    <div className={`rounded-[1.75rem] border bg-gradient-to-br px-5 py-4 ${tones[tone]}`}>
      <div className="flex items-center gap-3 text-xs font-black uppercase tracking-[0.2em] text-[#6b7280]">
        <Icon size={14} />
        {label}
      </div>
      <div className="mt-3 text-2xl font-black text-[#134e4a]">{value}</div>
    </div>
  );
}

function ModalShell({ isOpen, title, onClose, children }) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-[#134e4a]/30 p-4 backdrop-blur-md">
      <div className="w-full max-w-2xl overflow-hidden rounded-[2rem] border border-[#d1fae5] bg-white shadow-2xl shadow-emerald-100">
        <div className="flex items-center justify-between border-b border-[#d1fae5] px-8 py-6">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.25em] text-[#10b981]">
              Automatizaciones
            </p>
            <h3 className="mt-2 text-3xl font-black tracking-tight text-[#134e4a]">{title}</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] p-3 text-[#6b7280] transition hover:bg-[#ecfdf5] hover:text-[#10b981]"
          >
            <X size={22} />
          </button>
        </div>
        <div className="px-8 py-8">{children}</div>
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
    // solo carga inicial por usuario; evitar resetear a raíz al navegar carpetas
  }, [user?.id]);

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
      const response = await fetch(
        `${API_URL}/api/automatizaciones/${automationId}?user_id=${user.id}`,
        { method: 'DELETE' }
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

  const openCreateAutomationModal = () => {
    setAutomationForm(initialAutomationForm);
    setShowAutomationModal(true);
    setAutomationMenuId(null);
  };

  const openEditAutomationModal = (automation) => {
    navigate(`/automatizaciones/editar/${automation.id}`);
  };

  return (
    <div className="flex min-h-screen bg-[#f0fdf9] font-sans selection:bg-emerald-200/50">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="flex-1 ml-24 p-4 lg:p-6">
        <header className="h-[72px] bg-white rounded-3xl border border-[#d1fae5] shadow-sm flex items-center justify-between px-8 z-50 mb-6 shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-[#ecfdf5] rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-[#a7f3d0]">
              <img src="/logo_geochat.png" alt="GeoChat" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
              <p className="text-[10px] uppercase tracking-[0.15em] text-[#9ca3af] font-bold mt-0.5">Automatizaciones</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end">
              <span className="text-sm font-black text-[#134e4a]">{user?.nombre || 'Usuario'}</span>
              <span className="text-[10px] uppercase tracking-[0.15em] text-[#9ca3af] font-bold">{user?.rol || 'admin'}</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#10b981] to-[#0891b2] flex items-center justify-center text-white font-black shadow-sm">
              {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          </div>
        </header>

        <section className="flex flex-col gap-6">
          <div className="bg-white border border-[#d1fae5] rounded-[2rem] p-6 lg:p-8 shadow-sm">
            <div className="flex flex-col gap-6">
              <div className="flex flex-col xl:flex-row xl:items-center xl:justify-between gap-6">
              <div className="max-w-3xl">
                <div className="mb-5 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                  {breadcrumbs.map((item, index) => (
                    <React.Fragment key={`${item.id ?? 'root'}-${index}`}>
                      {index > 0 && <ChevronRight size={15} className="text-slate-600" />}
                      <button
                        type="button"
                        onClick={() => {
                          setCurrentFolderId(item.id ?? null);
                          setFolderMenuId(null);
                        }}
                        className={`transition hover:text-[#10b981] ${
                          index === breadcrumbs.length - 1 ? 'text-[#10b981] font-bold' : 'text-[#6b7280]'
                        }`}
                      >
                        {item.nombre}
                      </button>
                    </React.Fragment>
                  ))}
                </div>

                {showFolderControls && (
                  <>
                    <h1 className="mt-3 text-[38px] leading-none font-black tracking-tight text-[#134e4a]">
                      {currentFolder ? currentFolder.nombre : 'Mis automatizaciones'}
                    </h1>
                    <p className="mt-4 text-[#6b7280] text-[15px] leading-7 max-w-2xl">
                      {currentFolder
                        ? `Administra el contenido de ${currentFolder.nombre} y sigue creando subcarpetas o automatizaciones dentro de este mismo nivel.`
                        : 'Organiza tus flujos por carpetas, encuentra rápido cada disparador y mantén el módulo alineado con cómo ya trabajas contactos y chats.'}
                    </p>
                  </>
                )}
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                {showFolderControls && (
                  <button
                    type="button"
                    onClick={() => setShowCreateFolderModal(true)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] px-5 text-[14px] font-black text-[#059669] transition-all hover:bg-[#ecfdf5] hover:border-[#a7f3d0]"
                  >
                    <FolderPlus size={18} />
                    {currentFolder ? 'Crear subcarpeta' : 'Crear carpeta'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => navigate('/automatizaciones/crear')}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#0d9488] px-5 text-[14px] font-black text-white shadow-lg shadow-emerald-200 transition-all hover:shadow-emerald-300 hover:opacity-90"
                >
                  <Plus size={18} />
                  Crear automatización
                </button>
              </div>
            </div>
          </div>

            {showFolderControls && (
              <div className="grid gap-4 md:grid-cols-3">
                <MetricChip
                  icon={Folder}
                  label={currentFolder ? 'Subcarpetas visibles' : 'Carpetas visibles'}
                  value={folders.length}
                  tone="indigo"
                />
                <MetricChip icon={Workflow} label="Flujos visibles" value={automations.length} tone="cyan" />
                <MetricChip icon={Sparkles} label={`Ejecuciones en ${currentScopeLabel}`} value={totalExecutions} tone="emerald" />
              </div>
            )}
          </div>

          <div className={showFolderControls ? "grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]" : "flex flex-col gap-6"}>
            {showFolderControls && (
              <aside className="bg-white border border-[#d1fae5] rounded-[2.5rem] shadow-sm p-6 h-fit">
                <div className="relative mb-6">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por nombre, palabra clave o disparador..."
                  className="h-14 w-full rounded-2xl bg-[#f0fdf9] border border-[#d1fae5] pl-12 pr-4 text-[15px] outline-none focus:border-[#10b981] transition-all text-[#134e4a] placeholder:text-[#9ca3af]"
                />
              </div>

              {error && (
                <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 flex items-start gap-3">
                  <AlertCircle size={18} className="mt-0.5 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <h2 className="text-lg font-black text-[#134e4a]">{currentFolder ? 'Subcarpetas' : 'Carpetas'}</h2>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">
                      {folders.length} visibles
                    </span>
                    {!currentFolder && (
                      <button
                        type="button"
                        onClick={() => setShowCreateFolderModal(true)}
                        className="inline-flex h-9 w-9 items-center justify-center rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] text-[#059669] transition hover:bg-[#ecfdf5] hover:text-[#10b981]"
                        title="Crear carpeta"
                      >
                        <FolderPlus size={16} />
                      </button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  {folders.length === 0 ? (
                    <div className="rounded-[1.75rem] border border-dashed border-[#a7f3d0] bg-[#f0fdf9] p-5 text-sm leading-6 text-[#6b7280]">
                      {!currentFolder ? (
                        <>
                          No tienes carpetas creadas todavía. Crea una para agrupar tus flujos como en ventas, soporte o seguimiento.
                          <button
                            type="button"
                            onClick={() => setShowCreateFolderModal(true)}
                            className="mt-4 inline-flex items-center gap-2 rounded-2xl border border-[#a7f3d0] bg-[#ecfdf5] px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-[#059669] transition hover:bg-[#d1fae5]"
                          >
                            <FolderPlus size={15} />
                            Crear primera carpeta
                          </button>
                        </>
                      ) : (
                        'No hay subcarpetas en este nivel.'
                      )}
                    </div>
                  ) : (
                    folders.map((folder) => {
                      const isEditing = editingFolderId === folder.id;
                      const isOpen = folderMenuId === folder.id;

                      return (
                        <div
                          key={folder.id}
                          className="relative rounded-[1.75rem] border border-[#d1fae5] bg-white px-4 py-4 transition hover:border-[#10b981] hover:shadow-sm"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#10b981]">
                              <Folder size={20} />
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
                                  className="h-11 w-full rounded-2xl border border-[#a7f3d0] bg-[#f0fdf9] px-4 text-sm font-bold text-[#134e4a] outline-none focus:border-[#10b981]"
                                />
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setCurrentFolderId(folder.id);
                                    setFolderMenuId(null);
                                  }}
                                  className="block truncate text-left text-[15px] font-bold text-[#134e4a]"
                                >
                                  {folder.nombre}
                                </button>
                              )}
                              <p className="text-xs text-[#9ca3af] mt-1">Creada {formatDate(folder.creado_en)}</p>
                            </div>

                            <button
                              type="button"
                              onClick={() => setFolderMenuId((prev) => (prev === folder.id ? null : folder.id))}
                              className="w-10 h-10 rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] flex items-center justify-center text-[#9ca3af] hover:text-[#10b981] hover:bg-[#ecfdf5] transition"
                            >
                              <MoreVertical size={18} />
                            </button>
                          </div>

                          {isOpen && (
                            <div className="absolute right-4 top-[calc(100%+10px)] z-20 w-44 rounded-2xl border border-[#d1fae5] bg-white shadow-lg shadow-emerald-50 overflow-hidden">
                              <button
                                type="button"
                                onClick={() => {
                                  setCurrentFolderId(folder.id);
                                  setFolderMenuId(null);
                                }}
                                className="block w-full px-4 py-3 text-left text-sm text-[#374151] transition hover:bg-[#f0fdf9] hover:text-[#10b981]"
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
                                className="block w-full px-4 py-3 text-left text-sm text-[#374151] transition hover:bg-[#f0fdf9] hover:text-[#10b981]"
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
                                className="block w-full px-4 py-3 text-left text-sm text-rose-500 transition hover:bg-rose-50"
                              >
                                Eliminar
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </aside>
          )}

            <section className="bg-white border border-[#d1fae5] rounded-[2.5rem] shadow-sm overflow-hidden">
              <div className="px-8 py-6 border-b border-[#d1fae5] flex items-center justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-[#9ca3af]">
                    Flujos
                  </p>
                  <h2 className="mt-2 text-2xl font-black text-[#134e4a]">Automatizaciones guardadas</h2>
                </div>
                <div className="flex items-center gap-4">
                  {!showFolderControls && (
                    <div className="relative w-64">
                      <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9ca3af]" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar..."
                        className="h-10 w-full rounded-xl bg-[#f0fdf9] border border-[#d1fae5] pl-10 pr-4 text-xs outline-none focus:border-[#10b981] transition-all text-[#134e4a]"
                      />
                    </div>
                  )}
                  <div className="text-xs text-[#9ca3af]">
                    {currentFolderId ? `Mostrando ${currentScopeLabel}` : 'Mostrando raíz'}
                  </div>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead className="text-left">
                    <tr className="border-b border-[#d1fae5]">
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">Nombre</th>
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">Disparador</th>
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">Ejecuciones</th>
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">Fecha</th>
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#9ca3af]">Estado</th>
                      <th className="px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-[#9ca3af]"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <>
                        {Array.from({ length: 5 }).map((_, i) => <SkeletonTableRow key={i} cols={6} />)}
                      </>
                    ) : automations.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-8 py-10 text-sm text-[#9ca3af]">
                          No se encontraron resultados
                        </td>
                      </tr>
                    ) : (
                      automations.map((automation) => (
                        <tr key={automation.id} className="border-b border-[#f0fdf9] hover:bg-[#f9fffe] transition">
                          <td className="px-8 py-5">
                            <div className="flex items-center gap-3">
                              <div className="w-11 h-11 rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] flex items-center justify-center text-[#10b981]">
                                <Bot size={18} />
                              </div>
                              <div className="min-w-0">
                                <button
                                  type="button"
                                  onClick={() => openEditAutomationModal(automation)}
                                  className="truncate text-left text-[15px] font-bold text-[#134e4a] hover:text-[#10b981] transition"
                                >
                                  {automation.nombre}
                                </button>
                                {automation.palabra_clave && (
                                  <p className="text-xs text-[#9ca3af] mt-1 truncate">
                                    {automation.palabra_clave}
                                  </p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-8 py-5 text-sm text-[#374151]">
                            {DISPARADOR_LABELS[automation.tipo_disparador] || automation.tipo_disparador}
                          </td>
                          <td className="px-8 py-5 text-sm text-[#374151]">{automation.ejecuciones || 0}</td>
                          <td className="px-8 py-5 text-sm text-[#6b7280]">
                            <div className="flex items-center gap-2">
                              <Calendar size={14} />
                              {formatDate(automation.creado_en)}
                            </div>
                          </td>
                          <td className="px-8 py-5">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.14em] ${
                                automation.activo
                                  ? 'bg-[#ecfdf5] text-[#059669] border border-[#a7f3d0]'
                                  : 'bg-[#f3f4f6] text-[#9ca3af] border border-[#e5e7eb]'
                              }`}
                            >
                              {automation.activo ? 'Activa' : 'Pausada'}
                            </span>
                          </td>
                          <td className="px-8 py-5 text-right">
                            <div className="relative inline-flex">
                              <button
                                type="button"
                                onClick={() =>
                                  setAutomationMenuId((prev) => (prev === automation.id ? null : automation.id))
                                }
                                className="w-10 h-10 rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] flex items-center justify-center text-[#9ca3af] hover:text-[#10b981] hover:bg-[#ecfdf5] transition"
                              >
                                <MoreVertical size={18} />
                              </button>
                              {automationMenuId === automation.id && (
                                <div className="absolute right-0 top-[calc(100%+10px)] z-20 w-44 rounded-2xl border border-[#d1fae5] bg-white shadow-lg shadow-emerald-50 overflow-hidden text-left">
                                  <button
                                    type="button"
                                    onClick={() => openEditAutomationModal(automation)}
                                    className="block w-full px-4 py-3 text-sm text-[#374151] transition hover:bg-[#f0fdf9] hover:text-[#10b981]"
                                  >
                                    Editar
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAutomation(automation.id)}
                                    className="block w-full px-4 py-3 text-sm text-rose-500 transition hover:bg-rose-50"
                                  >
                                    Eliminar
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </section>
      </main>

      <ModalShell
        isOpen={showCreateFolderModal}
        title={currentFolder ? 'Crear subcarpeta' : 'Crear carpeta'}
        onClose={() => {
          setShowCreateFolderModal(false);
          setFolderName('');
        }}
      >
        <form onSubmit={handleCreateFolder} className="space-y-6">
          <p className="text-[#6b7280] leading-7">
            {currentFolder
              ? `Crea una subcarpeta dentro de ${currentFolder.nombre} para seguir organizando tus automatizaciones por proceso o segmento.`
              : 'Crea una carpeta para agrupar tus automatizaciones por objetivo, campaña o proceso.'}
          </p>
          <input
            value={folderName}
            onChange={(event) => setFolderName(event.target.value)}
            placeholder="Nombre de la carpeta"
            className="h-14 w-full rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] px-4 text-[#134e4a] outline-none focus:border-[#10b981] placeholder:text-[#9ca3af]"
          />
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setShowCreateFolderModal(false);
                setFolderName('');
              }}
              className="flex-1 rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] py-4 text-sm font-black text-[#374151] transition hover:bg-[#ecfdf5]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#0d9488] py-4 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Creando...' : 'Crear'}
            </button>
          </div>
        </form>
      </ModalShell>

      <ModalShell
        isOpen={showDeleteFolderModal}
        title="Eliminar carpeta"
        onClose={() => {
          setShowDeleteFolderModal(false);
          setFolderToDelete(null);
        }}
      >
        <div className="space-y-6">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-7 text-rose-600">
            Antes de eliminar esta carpeta vamos a verificar que no tenga subcarpetas ni flujos. Si todavía contiene elementos, no se podrá borrar.
          </div>
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setShowDeleteFolderModal(false);
                setFolderToDelete(null);
              }}
              className="flex-1 rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] py-4 text-sm font-black text-[#374151] transition hover:bg-[#ecfdf5]"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleDeleteFolder}
              disabled={submitting}
              className="flex-1 rounded-2xl bg-rose-500 py-4 text-sm font-black text-white transition hover:bg-rose-600 disabled:opacity-60"
            >
              {submitting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </div>
      </ModalShell>

      <ModalShell
        isOpen={showAutomationModal}
        title={automationForm.id ? 'Editar automatización' : 'Crear automatización'}
        onClose={() => {
          setShowAutomationModal(false);
          setAutomationForm(initialAutomationForm);
        }}
      >
        <form onSubmit={handleSaveAutomation} className="space-y-6">
          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">
              Nombre
            </label>
            <input
              value={automationForm.nombre}
              onChange={(event) =>
                setAutomationForm((prev) => ({ ...prev, nombre: event.target.value }))
              }
              placeholder="Ej: Bienvenida automática"
              className="h-14 w-full rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] px-4 text-[#134e4a] outline-none focus:border-[#10b981] placeholder:text-[#9ca3af]"
            />
          </div>

          <div>
            <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">
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
              className="h-14 w-full rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] px-4 text-[#134e4a] outline-none focus:border-[#10b981]"
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
              <label className="mb-2 block text-xs font-black uppercase tracking-[0.18em] text-[#6b7280]">
                Palabra clave
              </label>
              <input
                value={automationForm.palabra_clave}
                onChange={(event) =>
                  setAutomationForm((prev) => ({ ...prev, palabra_clave: event.target.value }))
                }
                placeholder="Ej: precio"
                className="h-14 w-full rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] px-4 text-[#134e4a] outline-none focus:border-[#10b981] placeholder:text-[#9ca3af]"
              />
            </div>
          )}

          <label className="flex items-center gap-3 rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] px-4 py-4">
            <input
              type="checkbox"
              checked={automationForm.activo}
              onChange={(event) =>
                setAutomationForm((prev) => ({ ...prev, activo: event.target.checked }))
              }
              className="h-4 w-4 rounded border-[#a7f3d0] bg-white text-[#10b981]"
            />
            <div>
              <p className="text-sm font-bold text-[#134e4a]">Automatización activa</p>
              <p className="text-xs text-[#9ca3af] mt-1">Si la apagas, se guarda pero no se ejecuta.</p>
            </div>
          </label>

          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => {
                setShowAutomationModal(false);
                setAutomationForm(initialAutomationForm);
              }}
              className="flex-1 rounded-2xl border border-[#d1fae5] bg-[#f0fdf9] py-4 text-sm font-black text-[#374151] transition hover:bg-[#ecfdf5]"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 rounded-2xl bg-gradient-to-r from-[#10b981] to-[#0d9488] py-4 text-sm font-black text-white transition hover:opacity-90 disabled:opacity-60"
            >
              {submitting ? 'Guardando...' : automationForm.id ? 'Guardar cambios' : 'Crear'}
            </button>
          </div>
        </form>
      </ModalShell>
    </div>
  );
}
