import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Calendar,
  Check,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  Clock3,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Link as LinkIcon,
  Loader2,
  MoreHorizontal,
  Phone,
  RefreshCw,
  Search,
  Settings2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';
const LEGACY_VIEW_STORAGE_KEY = 'groups_legacy_view';

const buildAuthHeaders = (user, extras = {}) => {
  const headers = { ...extras };
  if (user?.token) {
    headers.Authorization = `Bearer ${user.token}`;
  }
  return headers;
};

const formatDateTime = (value) => {
  if (!value || value === 'Nunca sincronizado') return value || 'Nunca sincronizado';
  const parsed = new Date(String(value).replace(' ', 'T'));
  if (Number.isNaN(parsed.getTime())) return value;
  return new Intl.DateTimeFormat('es-EC', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsed);
};

const statusTone = {
  activo: 'bg-emerald-50 text-emerald-700 border-emerald-100',
  sin_admin: 'bg-amber-50 text-amber-700 border-amber-100',
  error: 'bg-red-50 text-red-600 border-red-100',
  pendiente_sync: 'bg-sky-50 text-sky-700 border-sky-100',
  sincronizando: 'bg-violet-50 text-violet-700 border-violet-100',
};

const typeOptions = [
  { value: 'todos', label: 'Todos' },
  { value: 'grupo', label: 'Grupos' },
  { value: 'comunidad', label: 'Comunidades' },
  { value: 'canal', label: 'Canales' },
];

const statusOptions = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'activo', label: 'Activo' },
  { value: 'sin_admin', label: 'Sin admin' },
  { value: 'error', label: 'Error' },
  { value: 'pendiente_sync', label: 'Pendiente de sincronización' },
  { value: 'sincronizando', label: 'Sincronizando' },
];

const participantStatusOptions = [
  { value: 'todos', label: 'Todos los estados' },
  { value: 'activo', label: 'Activos' },
  { value: 'salieron', label: 'Salieron' },
];

const participantColumnsCatalog = [
  { key: 'telefono', label: 'Telefono' },
  { key: 'origen', label: 'Origen' },
  { key: 'fechaIngreso', label: 'Fecha ingreso' },
  { key: 'fechaSalida', label: 'Fecha salida' },
  { key: 'estado', label: 'Estado' },
];

const columnsCatalog = [
  { key: 'origen', label: 'Origen' },
  { key: 'clicks', label: 'Clicks' },
  { key: 'admins', label: 'Admins' },
  { key: 'participantes', label: 'Participantes' },
  { key: 'mensajesProgramados', label: 'Msg. programados' },
  { key: 'tipo', label: 'Tipo' },
  { key: 'capacidad', label: 'Capacidad' },
  { key: 'creadoEn', label: 'Creado' },
  { key: 'actualizadoEn', label: 'Actualización' },
  { key: 'ultimaSincronizacion', label: 'Última sincronización' },
];

const initialVisibleColumns = columnsCatalog.reduce((acc, column) => {
  acc[column.key] = true;
  return acc;
}, {});

const initialParticipantVisibleColumns = participantColumnsCatalog.reduce((acc, column) => {
  acc[column.key] = true;
  return acc;
}, {});

const parseComparableDate = (value) => {
  if (!value) return null;
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const Toast = ({ toast, onClose }) => (
  <div
    className={`w-[340px] rounded-2xl border px-4 py-4 shadow-xl ${
      toast.type === 'error'
        ? 'border-red-100 bg-red-50 text-red-700'
        : toast.type === 'info'
          ? 'border-sky-100 bg-sky-50 text-sky-700'
          : 'border-emerald-100 bg-emerald-50 text-emerald-700'
    }`}
  >
    <div className="flex items-start justify-between gap-4">
      <p className="text-sm font-medium">{toast.message}</p>
      <button onClick={() => onClose(toast.id)} className="text-current/70 transition hover:text-current">
        <X size={16} />
      </button>
    </div>
  </div>
);

const PopupCard = ({ className = '', children }) => (
  <div className={`rounded-[1.5rem] border border-slate-200 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.12)] ${className}`}>
    {children}
  </div>
);

const GruposComunidades = ({ user, onLogout }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [items, setItems] = useState([]);
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [pageSize, setPageSize] = useState(25);
  const [legacyView, setLegacyView] = useState(() => {
    try {
      return window.localStorage.getItem(LEGACY_VIEW_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [visibleColumns, setVisibleColumns] = useState(initialVisibleColumns);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [columnsOpen, setColumnsOpen] = useState(false);
  const [rowMenuId, setRowMenuId] = useState(null);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [participantsModal, setParticipantsModal] = useState({ open: false, group: null, loading: false, data: null });
  const [participantFiltersOpen, setParticipantFiltersOpen] = useState(false);
  const [participantColumnsOpen, setParticipantColumnsOpen] = useState(false);
  const [participantVisibleColumns, setParticipantVisibleColumns] = useState(initialParticipantVisibleColumns);
  const [participantSearch, setParticipantSearch] = useState('');
  const [participantStatusFilter, setParticipantStatusFilter] = useState('todos');
  const [participantDateFilter, setParticipantDateFilter] = useState('ambas');
  const [participantDateRange, setParticipantDateRange] = useState({ from: '', to: '' });
  const [importStep, setImportStep] = useState(null);
  const [importOptions, setImportOptions] = useState({ devices: [], groups: [] });
  const [importType, setImportType] = useState('grupo');
  const [importSearch, setImportSearch] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedSourceGroups, setSelectedSourceGroups] = useState([]);
  const [importQueueOpen, setImportQueueOpen] = useState(false);
  const [importQueue, setImportQueue] = useState([]);
  const [importQueuePaused, setImportQueuePaused] = useState(false);
  const [importQueueRunning, setImportQueueRunning] = useState(false);
  const [exportChoice, setExportChoice] = useState({ open: false, group: null });
  const [exportsPanel, setExportsPanel] = useState([]);
  const [exportsPanelOpen, setExportsPanelOpen] = useState(false);
  const [filterValues, setFilterValues] = useState({
    tipo: 'todos',
    estado: 'todos',
    dispositivo: 'todos',
  });
  const [toasts, setToasts] = useState([]);

  const filtersRef = useRef(null);
  const columnsRef = useRef(null);
  const rowMenuRef = useRef(null);
  const participantFiltersRef = useRef(null);
  const participantColumnsRef = useRef(null);
  const importQueueCancelRef = useRef(false);
  const importQueuePauseRef = useRef(false);

  const pushToast = (message, type = 'success') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((current) => [...current, { id, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== id));
    }, 5500);
  };

  useEffect(() => {
    const handleOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setFiltersOpen(false);
      }
      if (columnsRef.current && !columnsRef.current.contains(event.target)) {
        setColumnsOpen(false);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(event.target)) {
        setRowMenuId(null);
      }
      if (participantFiltersRef.current && !participantFiltersRef.current.contains(event.target)) {
        setParticipantFiltersOpen(false);
      }
      if (participantColumnsRef.current && !participantColumnsRef.current.contains(event.target)) {
        setParticipantColumnsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  const loadGroups = async () => {
    if (!user?.id) return;

    setLoading(true);
    try {
      const query = new URLSearchParams({
        user_id: String(user.id),
        q: searchTerm,
        tipo: filterValues.tipo,
        estado: filterValues.estado,
        dispositivo_id: filterValues.dispositivo,
      });
      const response = await fetch(`${API_URL}/api/groups?${query.toString()}`, {
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'No se pudo cargar el módulo');
      }
      setItems(result.data?.items || []);
      setDevices(result.data?.devices || []);
    } catch (error) {
      console.error(error);
      pushToast(error.message || 'No se pudo cargar grupos y comunidades', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, [user?.id, searchTerm, filterValues.tipo, filterValues.estado, filterValues.dispositivo]);

  const handleLegacyToggle = () => {
    setLegacyView((current) => {
      const nextValue = !current;
      try {
        window.localStorage.setItem(LEGACY_VIEW_STORAGE_KEY, nextValue ? '1' : '0');
      } catch {
        // noop
      }
      pushToast(
        nextValue ? 'Vista anterior activada para este modulo' : 'Regresaste al nuevo diseno del modulo',
        'info',
      );
      return nextValue;
    });
  };

  const pendingSync = useMemo(
    () => items.filter((item) => item.hasPendingSync),
    [items],
  );

  const visibleItems = useMemo(() => items.slice(0, pageSize), [items, pageSize]);

  const importCandidates = useMemo(() => {
    return (importOptions.groups || []).filter((group) => {
      const matchesDevice = selectedDeviceId ? Number(group.dispositivoId) === Number(selectedDeviceId) : true;
      const groupType = group.tipo || 'grupo';
      const matchesType = groupType === importType;
      const text = `${group.nombre} ${group.dispositivoNombre} ${group.jid}`.toLowerCase();
      const matchesSearch = importSearch.trim() ? text.includes(importSearch.trim().toLowerCase()) : true;
      return matchesDevice && matchesType && matchesSearch;
    });
  }, [importOptions.groups, selectedDeviceId, importType, importSearch]);

  const selectedImportGroups = useMemo(() => {
    return importCandidates.filter((group) => selectedSourceGroups.includes(group.id) && group.canImport);
  }, [importCandidates, selectedSourceGroups]);

  const loadImportOptions = async () => {
    try {
      const response = await fetch(`${API_URL}/api/groups/import-options?user_id=${user.id}`, {
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'No se pudo cargar opciones de importación');
      }
      const data = result.data || { devices: [], groups: [] };
      setImportOptions(data);
      setSelectedDeviceId(data.devices?.[0]?.id || null);
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        data.warnings.forEach((warning) => pushToast(warning, 'info'));
      }
    } catch (error) {
      pushToast(error.message || 'No se pudieron cargar los grupos de origen', 'error');
    }
  };

  const openImportFlow = async () => {
    await loadImportOptions();
    setImportType('grupo');
    setImportSearch('');
    setSelectedSourceGroups([]);
    setImportStep('device');
  };

  const handleImportProgress = async () => {
    const selectedGroups = selectedImportGroups;
    if (selectedGroups.length === 0) {
      pushToast('Debes seleccionar al menos un grupo para importar', 'error');
      return;
    }

    setImportStep(null);
    setImportQueueOpen(true);
    setImportQueuePaused(false);
    setImportQueueRunning(true);
    setExportsPanelOpen(false);
    importQueueCancelRef.current = false;
    importQueuePauseRef.current = false;

    const queueSeed = selectedGroups.map((group, index) => ({
      id: group.id,
      name: group.nombre,
      order: index + 1,
      status: 'En cola',
      message: '',
    }));
    setImportQueue(queueSeed);

    for (const group of selectedGroups) {
      if (importQueueCancelRef.current) {
        setImportQueue((current) => current.map((item) => (
          item.status === 'En cola' ? { ...item, status: 'Cancelado', message: 'Importacion cancelada por el usuario' } : item
        )));
        break;
      }

      while (importQueuePauseRef.current && !importQueueCancelRef.current) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }

      if (importQueueCancelRef.current) {
        setImportQueue((current) => current.map((item) => (
          item.status === 'En cola' ? { ...item, status: 'Cancelado', message: 'Importacion cancelada por el usuario' } : item
        )));
        break;
      }

      setImportQueue((current) => current.map((item) => (
        item.id === group.id ? { ...item, status: 'Importando...' } : item
      )));

      try {
        const response = await fetch(`${API_URL}/api/groups/import`, {
          method: 'POST',
          headers: buildAuthHeaders(user, { 'Content-Type': 'application/json' }),
          body: JSON.stringify({
            user_id: user.id,
            group_ids: [group.id],
            device_id: selectedDeviceId,
            tipo: importType,
          }),
        });
        const result = await response.json();
        const entry = result.data?.results?.[0];
        if (!result.success || !entry?.success) {
          throw new Error(entry?.message || result.message || 'No se pudo importar el grupo');
        }

        setImportQueue((current) => current.map((item) => (
          item.id === group.id ? { ...item, status: 'Exitoso', message: entry.message || '' } : item
        )));
        await loadGroups();
      } catch (error) {
        setImportQueue((current) => current.map((item) => (
          item.id === group.id ? { ...item, status: 'Error', message: error.message || 'No se pudo importar' } : item
        )));
      }
    }

    setImportQueueRunning(false);
    pushToast(importQueueCancelRef.current ? 'Importacion cancelada' : 'Proceso de importación ejecutado', 'info');
    await loadGroups();
  };

  const openDetail = async (item) => {
    setSelectedDetail(null);
    setDetailLoading(true);
    try {
      const response = await fetch(`${API_URL}/api/groups/${item.id}?user_id=${user.id}`, {
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'No se pudo cargar el detalle');
      }
      setSelectedDetail(result.data);
    } catch (error) {
      pushToast(error.message || 'No se pudo abrir el detalle', 'error');
    } finally {
      setDetailLoading(false);
    }
  };

  const openParticipantsModal = async (item) => {
    setParticipantsModal({ open: true, group: item, loading: true, data: null });
    setParticipantSearch('');
    setParticipantStatusFilter('todos');
    setParticipantDateFilter('ambas');
    setParticipantDateRange({ from: '', to: '' });
    setParticipantVisibleColumns(initialParticipantVisibleColumns);
    setParticipantFiltersOpen(false);
    setParticipantColumnsOpen(false);
    try {
      const response = await fetch(`${API_URL}/api/groups/${item.id}/participants?user_id=${user.id}`, {
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'No se pudieron cargar participantes');
      }
      setParticipantsModal({ open: true, group: item, loading: false, data: result.data });
    } catch (error) {
      setParticipantsModal({ open: true, group: item, loading: false, data: { participants: [], summary: { total: 0, activos: 0, salieron: 0 } } });
      pushToast(error.message || 'No se pudieron cargar participantes', 'error');
    }
  };

  const filteredParticipants = useMemo(() => {
    const source = participantsModal.data?.participants || [];
    return source.filter((participant) => {
      const searchable = `${participant.nombre} ${participant.telefono}`.toLowerCase();
      const matchesSearch = participantSearch.trim() ? searchable.includes(participantSearch.trim().toLowerCase()) : true;
      const matchesStatus = participantStatusFilter === 'todos' ? true : participant.estado === participantStatusFilter || (participantStatusFilter === 'salieron' && participant.estado === 'salio');
      const ingresoDate = parseComparableDate(participant.fechaIngreso);
      const salidaDate = parseComparableDate(participant.fechaSalida);
      const fromDate = participantDateRange.from ? parseComparableDate(`${participantDateRange.from}T00:00:00`) : null;
      const toDate = participantDateRange.to ? parseComparableDate(`${participantDateRange.to}T23:59:59`) : null;

      let referenceDates = [];
      if (participantDateFilter === 'ingreso') {
        referenceDates = ingresoDate ? [ingresoDate] : [];
      } else if (participantDateFilter === 'salida') {
        referenceDates = salidaDate ? [salidaDate] : [];
      } else {
        referenceDates = [ingresoDate, salidaDate].filter(Boolean);
      }

      const matchesDate = (!fromDate && !toDate)
        ? true
        : referenceDates.length > 0 && referenceDates.some((date) => {
          if (fromDate && date < fromDate) return false;
          if (toDate && date > toDate) return false;
          return true;
        });

      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [participantsModal.data, participantSearch, participantStatusFilter, participantDateFilter, participantDateRange]);

  const syncGroup = async (item) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${item.id}/sync?user_id=${user.id}`, {
        method: 'POST',
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'No se pudo sincronizar');
      }
      pushToast(`Grupo "${item.nombre}" sincronizado correctamente`);
      await loadGroups();
      if (selectedDetail?.group?.id === item.id) {
        openDetail(item);
      }
    } catch (error) {
      pushToast(error.message || 'No se pudo sincronizar', 'error');
    }
  };

  const toggleCapacity = async (item, nextValue) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${item.id}/capacity`, {
        method: 'POST',
        headers: buildAuthHeaders(user, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({ user_id: user.id, lleno: nextValue }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'No se pudo actualizar la capacidad');
      }
      pushToast(nextValue ? 'Grupo marcado como lleno' : 'Grupo desmarcado como lleno');
      if (nextValue) {
        pushToast('Se verificará si es necesario crear grupos de respaldo automáticamente.', 'info');
      } else {
        pushToast('El grupo volverá a estar disponible para recibir redirecciones.', 'info');
      }
      await loadGroups();
      if (selectedDetail?.group?.id === item.id) {
        await openDetail(item);
      }
    } catch (error) {
      pushToast(error.message || 'No se pudo cambiar el estado de capacidad', 'error');
    }
  };

  const deleteGroup = async (item) => {
    if (!window.confirm(`¿Eliminar "${item.nombre}" del módulo?`)) {
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/groups/${item.id}?user_id=${user.id}`, {
        method: 'DELETE',
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'No se pudo eliminar');
      }
      setSelectedDetail(null);
      pushToast(`Grupo "${item.nombre}" eliminado del módulo`);
      await loadGroups();
    } catch (error) {
      pushToast(error.message || 'No se pudo eliminar el grupo', 'error');
    }
  };

  const exportParticipants = async (group, scope) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${group.id}/export?user_id=${user.id}&scope=${scope}`, {
        headers: buildAuthHeaders(user),
      });
      if (!response.ok) {
        const errorResult = await response.json();
        throw new Error(errorResult.message || 'No se pudo exportar');
      }

      const blob = await response.blob();
      const disposition = response.headers.get('Content-Disposition') || '';
      const match = disposition.match(/filename=([^;]+)/i);
      const filename = match ? match[1].replace(/["']/g, '') : `${group.nombre}-participantes.csv`;
      const url = window.URL.createObjectURL(blob);

      setExportsPanel((current) => [
        {
          id: `${Date.now()}-${Math.random()}`,
          name: group.nombre,
          scope,
          filename,
          url,
          count: Number(response.headers.get('X-Export-Count') || 0),
          downloaded: false,
        },
        ...current,
      ]);
      setExportsPanelOpen(true);

      setExportChoice({ open: false, group: null });
      pushToast(`Exportación "${group.nombre}" lista para descargar`);
    } catch (error) {
      pushToast(error.message || 'No se pudo exportar participantes', 'error');
    }
  };

  const updateInviteLink = async (item) => {
    try {
      const response = await fetch(`${API_URL}/api/groups/${item.id}/refresh-invite?user_id=${user.id}`, {
        method: 'POST',
        headers: buildAuthHeaders(user),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'No se pudo actualizar el link');
      }
      pushToast('Link de invitación actualizado');
      await loadGroups();
      if (selectedDetail?.group?.id === item.id) {
        await openDetail(item);
      }
    } catch (error) {
      pushToast(error.message || 'No se pudo actualizar el link', 'error');
    }
  };

  const pendingSummaryLabel = pendingSync.length === 1
    ? '1 grupo pendiente de sincronización'
    : `${pendingSync.length} grupos pendientes de sincronización`;

  return (
    <div className="flex min-h-screen bg-[#eef3f8] font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-28 mr-5 mt-2 mb-2 flex min-h-[calc(100vh-16px)] flex-1 overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)] lg:ml-32">
        <div className="flex-1 overflow-y-auto">
          <div className="flex items-center justify-between bg-[#c9c3fb] px-8 py-3 text-[#2a2b55]">
            <div>
              <p className="text-sm font-semibold">Estás en el nuevo diseño de Comunidades</p>
              <p className="text-sm text-[#56588a]">Tus comunidades están intactas. Nada se pausa ni se pierde. Puedes volver cuando quieras.</p>
            </div>
            <label className="flex items-center gap-3 text-sm font-medium">
              <button
                type="button"
                onClick={handleLegacyToggle}
                className={`relative h-8 w-14 rounded-full transition ${legacyView ? 'bg-[#5e5adb]' : 'bg-[#6b63ea]'}`}
              >
                <span className={`absolute top-1 h-6 w-6 rounded-full bg-white transition ${legacyView ? 'left-1' : 'left-7'}`} />
              </button>
              Volver al anterior
            </label>
          </div>

          <div className="px-8 py-7">
            <div className="mb-7 flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
              <div>
                <h1 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#131733]">Grupos, Comunidades y Canales</h1>
                <p className="mt-2 text-[15px] text-slate-500">{items.length} registros en total</p>
              </div>

              <button
                type="button"
                onClick={openImportFlow}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-[#15161d] px-7 text-base font-semibold text-white transition hover:bg-black"
              >
                <Download size={17} />
                Importar
              </button>
            </div>

            <div className="mb-6 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full max-w-[430px]">
                <Search size={18} className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre..."
                  className="h-12 w-full rounded-full border border-slate-200 bg-white pl-14 pr-5 text-[15px] text-slate-700 outline-none transition placeholder:text-slate-300 focus:border-[#918cff] focus:ring-4 focus:ring-[#edeafe]"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <div className="relative" ref={columnsRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setColumnsOpen((current) => !current);
                      setFiltersOpen(false);
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#1f2340] shadow-sm transition hover:bg-slate-50"
                  >
                    <Settings2 size={18} />
                    Columnas
                  </button>

                  {columnsOpen && (
                    <PopupCard className="absolute right-0 top-14 z-40 w-[250px] p-3">
                      <div className="space-y-1">
                        {columnsCatalog.map((column) => (
                          <button
                            key={column.key}
                            type="button"
                            onClick={() => setVisibleColumns((current) => ({ ...current, [column.key]: !current[column.key] }))}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <span className="w-4 text-slate-800">{visibleColumns[column.key] ? <Check size={16} /> : null}</span>
                            <span>{column.label}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setVisibleColumns(initialVisibleColumns)}
                          className="mt-2 flex w-full items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye size={16} />
                          Mostrar todas
                        </button>
                      </div>
                    </PopupCard>
                  )}
                </div>

                <div className="relative" ref={filtersRef}>
                  <button
                    type="button"
                    onClick={() => {
                      setFiltersOpen((current) => !current);
                      setColumnsOpen(false);
                    }}
                    className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#1f2340] shadow-sm transition hover:bg-slate-50"
                  >
                    <Filter size={18} />
                    Filtrar
                  </button>

                  {filtersOpen && (
                    <PopupCard className="absolute right-0 top-14 z-40 w-[290px] p-4">
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-sm font-semibold text-slate-600">Tipo</p>
                          <select
                            value={filterValues.tipo}
                            onChange={(event) => setFilterValues((current) => ({ ...current, tipo: event.target.value }))}
                            className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-[#918cff]"
                          >
                            {typeOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <p className="mb-2 text-sm font-semibold text-slate-600">Estado</p>
                          <select
                            value={filterValues.estado}
                            onChange={(event) => setFilterValues((current) => ({ ...current, estado: event.target.value }))}
                            className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-[#918cff]"
                          >
                            {statusOptions.map((option) => (
                              <option key={option.value} value={option.value}>{option.label}</option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <p className="mb-2 text-sm font-semibold text-slate-600">Dispositivo</p>
                          <select
                            value={filterValues.dispositivo}
                            onChange={(event) => setFilterValues((current) => ({ ...current, dispositivo: event.target.value }))}
                            className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm text-slate-700 outline-none focus:border-[#918cff]"
                          >
                            <option value="todos">Todos los dispositivos</option>
                            {devices.map((device) => (
                              <option key={device.id} value={device.id}>{device.nombre}</option>
                            ))}
                          </select>
                        </div>

                        <div className="border-t border-slate-100 pt-3 text-sm text-slate-400">{items.length} grupos</div>
                      </div>
                    </PopupCard>
                  )}
                </div>
              </div>
            </div>

            {pendingSync.length > 0 && (
              <div className="mb-5 rounded-[1.7rem] border border-sky-100 bg-sky-50 px-6 py-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex gap-4">
                    <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                      <RefreshCw size={20} />
                    </div>
                    <div>
                      <p className="text-xl font-semibold text-sky-700">{pendingSummaryLabel}</p>
                      <p className="mt-1 text-sm text-sky-600">Hay grupos que aún no han completado su sincronización. Este proceso puede tardar unos minutos.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {pendingSync.slice(0, 4).map((item) => (
                          <span key={item.id} className="rounded-full border border-sky-200 bg-white px-3 py-1 text-xs font-medium text-sky-700">
                            {item.nombre}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFilterValues((current) => ({ ...current, estado: 'pendiente_sync' }))}
                    className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100"
                  >
                    Ver afectados
                  </button>
                </div>
              </div>
            )}

            <section className="rounded-[1.8rem] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-[1350px] w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <th className="px-4 py-4"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" /></th>
                      <th className="px-4 py-4">Nombre</th>
                      {visibleColumns.origen && <th className="px-4 py-4">Origen</th>}
                      {visibleColumns.clicks && <th className="px-4 py-4">Clicks</th>}
                      {visibleColumns.admins && <th className="px-4 py-4">Admins</th>}
                      {visibleColumns.participantes && <th className="px-4 py-4">Participantes</th>}
                      {visibleColumns.mensajesProgramados && <th className="px-4 py-4">Msg. Programados</th>}
                      {visibleColumns.tipo && <th className="px-4 py-4">Tipo</th>}
                      {visibleColumns.capacidad && <th className="px-4 py-4">Capacidad</th>}
                      {visibleColumns.creadoEn && <th className="px-4 py-4">Creado</th>}
                      {visibleColumns.actualizadoEn && <th className="px-4 py-4">Actualización</th>}
                      {visibleColumns.ultimaSincronizacion && <th className="px-4 py-4">Última sincronización</th>}
                      <th className="px-4 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && visibleItems.length === 0 && (
                      <tr>
                        <td colSpan={13} className="px-6 py-20 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center">
                            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                              <Users size={34} />
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">No se encontraron grupos</p>
                            <p className="mt-3 text-[17px] text-slate-500">Intenta ajustar los filtros o importa nuevos grupos</p>
                          </div>
                        </td>
                      </tr>
                    )}

                    {visibleItems.map((item) => (
                      <tr key={item.id} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-4 align-middle">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300" />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-4">
                            <div className="relative flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-lg font-bold text-slate-700">
                              {(item.nombre || 'G').charAt(0).toUpperCase()}
                              <span className={`absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white ${item.hasPendingSync ? 'bg-blue-500' : 'bg-emerald-500'}`} />
                            </div>
                            <div>
                              <button type="button" onClick={() => openDetail(item)} className="text-left text-xl font-semibold text-[#151a33] transition hover:text-[#5d57db]">
                                {item.nombre}
                              </button>
                              <p className="text-sm text-slate-500">Sin campaña asignada</p>
                            </div>
                          </div>
                        </td>

                        {visibleColumns.origen && (
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-2 rounded-xl border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-600">
                              <Download size={14} />
                              {item.origen}
                            </span>
                          </td>
                        )}

                        {visibleColumns.clicks && <td className="px-4 py-4 text-lg text-slate-700">{item.clicks}</td>}

                        {visibleColumns.admins && (
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => openDetail(item)}
                              className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-full bg-emerald-50 px-3 text-sm font-semibold text-emerald-600"
                            >
                              <Phone size={14} />
                              <span className="sr-only">{item.admins} admins</span>
                            </button>
                          </td>
                        )}

                        {visibleColumns.participantes && (
                          <td className="px-4 py-4">
                            <button
                              type="button"
                              onClick={() => openParticipantsModal(item)}
                              className="inline-flex items-center gap-2 text-lg font-medium text-slate-700 transition hover:text-[#5d57db]"
                            >
                              <Users size={15} />
                              {item.participantes}
                            </button>
                          </td>
                        )}

                        {visibleColumns.mensajesProgramados && (
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-2 text-lg text-slate-700">
                              <AlertCircle size={14} />
                              {item.mensajesProgramados}
                            </span>
                          </td>
                        )}

                        {visibleColumns.tipo && (
                          <td className="px-4 py-4">
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-base text-slate-700">
                              <Users size={16} />
                              {item.tipoLabel}
                            </span>
                          </td>
                        )}

                        {visibleColumns.capacidad && (
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => toggleCapacity(item, !item.lleno)}
                                className={`relative h-7 w-14 rounded-full transition ${item.lleno ? 'bg-[#191933]' : 'bg-slate-200'}`}
                              >
                                <span className={`absolute top-1 h-5 w-5 rounded-full bg-white transition ${item.lleno ? 'left-8' : 'left-1'}`} />
                              </button>
                              {item.lleno ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                                  <AlertCircle size={12} />
                                  Lleno
                                </span>
                              ) : null}
                            </div>
                          </td>
                        )}

                        {visibleColumns.creadoEn && <td className="px-4 py-4 text-[15px] text-slate-600">{formatDateTime(item.creadoEn)}</td>}
                        {visibleColumns.actualizadoEn && <td className="px-4 py-4 text-[15px] text-slate-600">{formatDateTime(item.actualizadoEn)}</td>}
                        {visibleColumns.ultimaSincronizacion && (
                          <td className="px-4 py-4 text-[15px] italic text-slate-400">
                            {item.ultimaSincronizacion === 'Nunca sincronizado' ? 'Nunca sincronizado' : formatDateTime(item.ultimaSincronizacion)}
                          </td>
                        )}

                        <td className="relative px-4 py-4 text-right" ref={rowMenuId === item.id ? rowMenuRef : null}>
                          <button
                            type="button"
                            onClick={() => setRowMenuId((current) => current === item.id ? null : item.id)}
                            className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                          >
                            <MoreHorizontal size={18} />
                          </button>

                          {rowMenuId === item.id && (
                            <PopupCard className="absolute right-2 top-12 z-40 w-[230px] overflow-hidden py-2">
                              <button onClick={() => { setRowMenuId(null); openDetail(item); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                <Eye size={16} /> Ver detalle
                              </button>
                              <button onClick={() => { setRowMenuId(null); syncGroup(item); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                <RefreshCw size={16} /> Sincronizar
                              </button>
                              <button onClick={() => { setRowMenuId(null); updateInviteLink(item); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                <LinkIcon size={16} /> Actualizar link de invitación
                              </button>
                              <button onClick={() => { setRowMenuId(null); setExportChoice({ open: true, group: item }); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50">
                                <Download size={16} /> Exportar participantes
                              </button>
                              <button onClick={() => { setRowMenuId(null); deleteGroup(item); }} className="flex w-full items-center gap-3 px-4 py-3 text-left text-sm text-red-500 transition hover:bg-red-50">
                                <Trash2 size={16} /> Eliminar
                              </button>
                            </PopupCard>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-end gap-3 px-6 py-5 text-sm text-slate-500">
                <span>Elementos por página</span>
                <select
                  value={pageSize}
                  onChange={(event) => setPageSize(Number(event.target.value))}
                  className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
            </section>
          </div>
        </div>

        {selectedDetail && (
          <aside className="w-[460px] shrink-0 border-l border-slate-200 bg-white px-6 py-6">
            <div className="mb-8 flex items-start justify-between gap-4">
              <div>
                <div className="mb-2 flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl font-bold text-slate-700">
                    {(selectedDetail.group.nombre || 'G').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#151a33]">{selectedDetail.group.nombre}</h2>
                    <div className="flex items-center gap-2 text-sm text-slate-500">
                      <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1">{selectedDetail.group.tipoLabel}</span>
                      <span className="inline-flex items-center gap-2">
                        <LinkIcon size={14} />
                        {selectedDetail.group.inviteLink ? (
                          <a href={selectedDetail.group.inviteLink} target="_blank" rel="noreferrer" className="truncate text-[#4f56d8] hover:underline">
                            {selectedDetail.group.inviteLink}
                          </a>
                        ) : (
                          'Sin link disponible'
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <button onClick={() => setSelectedDetail(null)} className="rounded-full border border-slate-200 p-2 text-slate-500 transition hover:bg-slate-50">
                <X size={18} />
              </button>
            </div>

            {detailLoading ? (
              <div className="flex items-center gap-3 text-slate-500">
                <Loader2 size={18} className="animate-spin" />
                Cargando detalle...
              </div>
            ) : (
              <>
                <h3 className="mb-4 text-lg font-semibold text-slate-700">Información del grupo</h3>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-slate-100 text-slate-600"><Users size={18} /></div>
                    <p className="text-3xl font-semibold text-[#151a33]">{selectedDetail.group.participantes}</p>
                    <p className="text-sm text-slate-500">Participantes</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600"><ArrowRight size={18} /></div>
                    <p className="text-3xl font-semibold text-[#151a33]">{selectedDetail.group.clicks}</p>
                    <p className="text-sm text-slate-500">Clicks</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600"><Phone size={18} /></div>
                    <p className="text-3xl font-semibold text-[#151a33]">
                      {(selectedDetail.admins || []).filter((admin) => String(admin.estado || '').toLowerCase() === 'conectado').length}/{selectedDetail.group.admins}
                    </p>
                    <p className="text-sm text-slate-500">Admins conectados</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Calendar size={18} /></div>
                    <p className="text-lg font-semibold text-[#151a33]">{formatDateTime(selectedDetail.group.creadoEn)}</p>
                    <p className="text-sm text-slate-500">Creado</p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 p-4">
                    <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-50 text-amber-600"><AlertCircle size={18} /></div>
                    <p className="text-3xl font-semibold text-[#151a33]">{selectedDetail.group.mensajesProgramados}</p>
                    <p className="text-sm text-slate-500">Msg. programados</p>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start gap-3">
                    <Clock3 size={18} className="mt-0.5 text-slate-500" />
                    <div>
                      <p className="font-semibold text-slate-700">{selectedDetail.group.sincronizadoEn ? 'Sincronizado recientemente' : 'Sin sincronización registrada'}</p>
                      <p className="text-sm text-slate-500">
                        {selectedDetail.group.sincronizadoEn
                          ? `Última sincronización: ${formatDateTime(selectedDetail.group.sincronizadoEn)}`
                          : 'Los datos de participantes pueden estar desactualizados. Sincroniza para obtener la información más reciente.'}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="mb-3 text-sm font-bold uppercase tracking-[0.16em] text-slate-400">Administradores</h3>
                  <div className="space-y-3">
                    {(selectedDetail.admins || []).length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 p-4 text-sm text-slate-500">No hay administradores detectados todavía.</div>
                    ) : (
                      selectedDetail.admins.map((admin, index) => (
                        <div key={`${admin.telefono}-${index}`} className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-emerald-600">
                              <Phone size={18} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-800">{admin.telefono || admin.nombre}</p>
                              <p className="text-sm text-slate-500">{admin.nombre}</p>
                            </div>
                          </div>
                          <span className="rounded-full border border-emerald-200 bg-white px-3 py-1 text-sm font-medium text-emerald-600">{admin.estado}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className="mt-8">
                  <h3 className="text-xl font-semibold text-slate-700">Historial de acciones</h3>
                  <p className="text-sm text-slate-500">Registro de cambios en el grupo</p>
                  <div className="mt-4 space-y-3">
                    {(selectedDetail.history || []).length === 0 ? (
                      <div className="rounded-2xl border border-slate-200 p-5 text-center text-sm text-slate-500">No hay acciones registradas</div>
                    ) : (
                      selectedDetail.history.map((entry, index) => (
                        <div key={`${entry.accion}-${index}`} className="rounded-2xl border border-slate-200 p-4">
                          <p className="font-medium text-slate-700">{entry.accion}</p>
                          <p className="mt-1 text-sm text-slate-500">{entry.detalle || 'Sin detalle adicional'}</p>
                          <p className="mt-2 text-xs uppercase tracking-[0.16em] text-slate-400">{formatDateTime(entry.creadoEn)}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </aside>
        )}
      </main>

      {importStep && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <PopupCard className="w-full max-w-[520px] p-6">
            {importStep === 'device' ? (
              <>
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h3 className="text-[2rem] font-semibold tracking-[-0.03em] text-[#151a33]">Seleccionar número</h3>
                    <p className="mt-2 text-[15px] text-slate-500">Selecciona el número de WhatsApp para importar grupos</p>
                  </div>
                  <button onClick={() => setImportStep(null)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-sm font-semibold text-slate-600">Tipo</p>
                  <div className="flex gap-3">
                    {[
                      { value: 'grupo', label: 'Grupos' },
                      { value: 'comunidad', label: 'Comunidades' },
                      { value: 'canal', label: 'Canales' },
                    ].map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setImportType(option.value)}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-base font-medium transition ${
                          importType === option.value ? 'border-[#8f88ff] bg-[#f2f1ff] text-[#1f2340]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        <span className={`h-4 w-4 rounded-full border ${importType === option.value ? 'border-[#1f2340] bg-[#1f2340]' : 'border-slate-300'}`} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={importSearch}
                    onChange={(event) => setImportSearch(event.target.value)}
                    placeholder="Buscar por nombre o número..."
                    className="h-11 w-full rounded-2xl border border-slate-200 pl-12 pr-4 text-sm outline-none focus:border-[#918cff]"
                  />
                </div>

                <div className="max-h-[360px] space-y-3 overflow-y-auto pr-1">
                  {importOptions.devices.map((device) => (
                    <button
                      key={device.id}
                      type="button"
                      onClick={() => setSelectedDeviceId(device.id)}
                      className={`flex w-full items-center justify-between rounded-[1.4rem] border px-4 py-3 text-left transition ${
                        Number(selectedDeviceId) === Number(device.id)
                          ? 'border-[#8f88ff] bg-[#f2f4ff]'
                          : 'border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <span className={`h-4 w-4 rounded-full border ${Number(selectedDeviceId) === Number(device.id) ? 'border-[#1f2340] bg-[#1f2340]' : 'border-slate-300'}`} />
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-base font-semibold text-slate-700">
                          {(device.nombre || 'D').charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-2xl font-medium text-slate-800">{device.nombre}</p>
                          <p className="text-sm text-slate-500">{device.numero_telefono || 'Sin número'}</p>
                        </div>
                      </div>
                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-600">
                        {(device.estado || '').toLowerCase() === 'conectado' ? 'Conectado' : 'Desconectado'}
                      </span>
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setImportStep('select-groups')}
                  disabled={!selectedDeviceId}
                  className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#1a1c22] text-base font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Continuar
                  <ChevronRight size={18} />
                </button>
              </>
            ) : (
              <>
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h3 className="text-[1.8rem] font-semibold tracking-[-0.03em] text-[#151a33]">Seleccionar grupos</h3>
                    <p className="mt-2 text-[15px] text-slate-500">Selecciona los grupos que deseas importar</p>
                  </div>
                  <button onClick={() => setImportStep(null)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-4 max-h-[420px] overflow-y-auto rounded-2xl border border-slate-200 p-3">
                  <div className="mb-3 flex flex-wrap gap-2">
                    {selectedImportGroups.map((group) => (
                      <span key={group.id} className="inline-flex items-center gap-2 rounded-lg bg-slate-100 px-2 py-1 text-xs text-slate-600">
                        {group.nombre}
                        <button type="button" onClick={() => setSelectedSourceGroups((current) => current.filter((id) => id !== group.id))}>
                          <X size={12} />
                        </button>
                      </span>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {importCandidates.map((group) => {
                      const selected = selectedSourceGroups.includes(group.id);
                      const disabled = !group.canImport;
                      return (
                        <button
                          key={group.id}
                          type="button"
                          onClick={() => {
                            if (disabled) return;
                            setSelectedSourceGroups((current) => selected ? current.filter((id) => id !== group.id) : [...current, group.id]);
                          }}
                          className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                            disabled
                              ? 'cursor-not-allowed border-red-100 bg-red-50/40 opacity-75'
                              : selected
                                ? 'border-[#8f88ff] bg-[#f2f4ff]'
                                : 'border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          <div>
                            <p className="font-medium text-slate-700">{group.nombre}</p>
                            <p className="text-xs text-slate-400">{group.dispositivoNombre}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            {!group.canImport ? (
                              <span className="rounded-full bg-red-50 px-2 py-1 text-xs text-red-500">Sin admin</span>
                            ) : null}
                            {selected ? <Check size={15} className="text-[#5d57db]" /> : null}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <p className="text-sm text-slate-500">{selectedImportGroups.length} grupos seleccionados</p>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => setImportStep('device')}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-slate-200 px-5 text-base font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    <ArrowLeft size={16} />
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleImportProgress}
                    disabled={selectedImportGroups.length === 0}
                    className="inline-flex h-12 flex-1 items-center justify-center gap-2 rounded-full bg-[#1a1c22] text-base font-semibold text-white transition hover:bg-black disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <Download size={16} />
                    Importar {selectedImportGroups.length} grupos
                  </button>
                </div>
              </>
            )}
          </PopupCard>
        </div>
      )}

      {participantsModal.open && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <PopupCard className="w-full max-w-[1180px] p-0">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
              <div className="flex items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Users size={20} /></div>
                <div>
                  <h3 className="text-3xl font-semibold tracking-[-0.03em] text-[#151a33]">Participantes</h3>
                  <p className="text-sm text-slate-500">{participantsModal.group?.nombre}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className="flex h-10 min-w-[40px] items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-base font-semibold text-slate-700">
                  {participantsModal.data?.summary?.total || 0}
                </span>
                <button onClick={() => setParticipantsModal({ open: false, group: null, loading: false, data: null })} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6">
              <div className="mb-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 p-5">
                  <p className="mb-2 text-base text-slate-500">Total</p>
                  <p className="text-4xl font-semibold text-[#151a33]">{participantsModal.data?.summary?.total || 0}</p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                  <p className="mb-2 text-base text-emerald-600">Activos</p>
                  <p className="text-4xl font-semibold text-emerald-600">{participantsModal.data?.summary?.activos || 0}</p>
                </div>
                <div className="rounded-2xl border border-red-100 bg-red-50 p-5">
                  <p className="mb-2 text-base text-red-500">Salieron</p>
                  <p className="text-4xl font-semibold text-red-500">{participantsModal.data?.summary?.salieron || 0}</p>
                </div>
              </div>

              <div className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                <div className="relative w-full max-w-[420px]">
                  <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                  <input
                    type="text"
                    value={participantSearch}
                    onChange={(event) => setParticipantSearch(event.target.value)}
                    placeholder="Buscar por teléfono..."
                    className="h-11 w-full rounded-2xl border border-slate-200 pl-12 pr-4 text-sm outline-none focus:border-[#918cff]"
                  />
                </div>

                <div className="flex items-center gap-3">
                  <div className="relative" ref={participantColumnsRef}>
                    <button type="button" onClick={() => setParticipantColumnsOpen((current) => !current)} className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#1f2340] shadow-sm transition hover:bg-slate-50">
                      <Settings2 size={18} />
                      Columnas
                    </button>
                    {participantColumnsOpen && (
                      <PopupCard className="absolute right-0 top-14 z-40 w-[200px] p-2">
                        {participantColumnsCatalog.map((column) => (
                          <button
                            key={column.key}
                            type="button"
                            onClick={() => setParticipantVisibleColumns((current) => ({ ...current, [column.key]: !current[column.key] }))}
                            className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <span className="w-4 text-slate-800">{participantVisibleColumns[column.key] ? <Check size={16} /> : null}</span>
                            {column.label}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setParticipantVisibleColumns(initialParticipantVisibleColumns)}
                          className="mt-2 flex w-full items-center gap-3 rounded-xl border-t border-slate-100 px-3 py-3 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye size={16} />
                          Mostrar todas
                        </button>
                      </PopupCard>
                    )}
                  </div>

                  <button type="button" onClick={() => setExportChoice({ open: true, group: participantsModal.group })} className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#1f2340] shadow-sm transition hover:bg-slate-50">
                    <Download size={18} />
                    Exportar
                  </button>

                  <div className="relative" ref={participantFiltersRef}>
                    <button type="button" onClick={() => setParticipantFiltersOpen((current) => !current)} className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#1f2340] shadow-sm transition hover:bg-slate-50">
                      <Filter size={18} />
                      Filtrar
                    </button>
                    {participantFiltersOpen && (
                      <PopupCard className="absolute right-0 top-14 z-40 w-[320px] p-4">
                        <h4 className="mb-4 text-lg font-semibold text-slate-700">Filtros</h4>
                        <div className="space-y-4">
                          <div>
                            <p className="mb-2 text-sm font-semibold text-slate-600">Estado</p>
                            <select value={participantStatusFilter} onChange={(event) => setParticipantStatusFilter(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-[#918cff]">
                              {participantStatusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <p className="mb-2 text-sm font-semibold text-slate-600">Rango de fechas</p>
                            <select value={participantDateFilter} onChange={(event) => setParticipantDateFilter(event.target.value)} className="h-11 w-full rounded-2xl border border-slate-200 px-4 text-sm outline-none focus:border-[#918cff]">
                              <option value="ambas">Ambas fechas</option>
                              <option value="ingreso">Solo ingreso</option>
                              <option value="salida">Solo salida</option>
                            </select>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm text-slate-500">
                              <Calendar size={16} />
                              <input
                                type="date"
                                value={participantDateRange.from}
                                onChange={(event) => setParticipantDateRange((current) => ({ ...current, from: event.target.value }))}
                                className="min-w-0 bg-transparent outline-none"
                              />
                            </label>
                            <label className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 px-4 text-sm text-slate-500">
                              <Calendar size={16} />
                              <input
                                type="date"
                                value={participantDateRange.to}
                                onChange={(event) => setParticipantDateRange((current) => ({ ...current, to: event.target.value }))}
                                className="min-w-0 bg-transparent outline-none"
                              />
                            </label>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setParticipantStatusFilter('todos');
                              setParticipantDateFilter('ambas');
                              setParticipantDateRange({ from: '', to: '' });
                            }}
                            className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Limpiar filtros
                          </button>
                          <div className="border-t border-slate-100 pt-3 text-sm text-slate-400">{filteredParticipants.length} participantes</div>
                        </div>
                      </PopupCard>
                    )}
                  </div>
                </div>
              </div>

              <div className="overflow-hidden rounded-[1.5rem] border border-slate-200">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <th className="px-4 py-4"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" /></th>
                      {participantVisibleColumns.telefono && <th className="px-4 py-4">Teléfono</th>}
                      {participantVisibleColumns.origen && <th className="px-4 py-4">Origen</th>}
                      {participantVisibleColumns.fechaIngreso && <th className="px-4 py-4">Fecha ingreso</th>}
                      {participantVisibleColumns.fechaSalida && <th className="px-4 py-4">Fecha salida</th>}
                      {participantVisibleColumns.estado && <th className="px-4 py-4">Estado</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {!participantsModal.loading && filteredParticipants.length === 0 && (
                      <tr>
                        <td colSpan={6} className="px-6 py-20 text-center">
                          <div className="mx-auto flex max-w-md flex-col items-center">
                            <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-400">
                              <Phone size={34} />
                            </div>
                            <p className="text-2xl font-semibold text-slate-800">No se encontraron participantes</p>
                            <p className="mt-3 text-[17px] text-slate-500">Este grupo aún no tiene participantes registrados</p>
                          </div>
                        </td>
                      </tr>
                    )}
                    {filteredParticipants.map((participant, index) => (
                      <tr key={`${participant.telefono}-${index}`} className="border-b border-slate-100 last:border-b-0">
                        <td className="px-4 py-4"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" /></td>
                        {participantVisibleColumns.telefono && <td className="px-4 py-4 text-sm font-medium text-slate-700">{participant.telefono || '-'}</td>}
                        {participantVisibleColumns.origen && <td className="px-4 py-4 text-sm text-slate-500">{participant.origen}</td>}
                        {participantVisibleColumns.fechaIngreso && <td className="px-4 py-4 text-sm text-slate-500">{participant.fechaIngreso || '-'}</td>}
                        {participantVisibleColumns.fechaSalida && <td className="px-4 py-4 text-sm text-slate-500">{participant.fechaSalida || '-'}</td>}
                        {participantVisibleColumns.estado && (
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-3 py-1 text-sm font-medium ${
                              participant.estado === 'salio'
                                ? 'border border-red-100 bg-red-50 text-red-500'
                                : 'border border-emerald-100 bg-emerald-50 text-emerald-600'
                            }`}>
                              {participant.estado === 'salio' ? 'Salió' : 'Activo'}
                            </span>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </PopupCard>
        </div>
      )}

      {exportChoice.open && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
          <PopupCard className="w-full max-w-[420px] p-6">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="text-[1.9rem] font-semibold tracking-[-0.03em] text-[#151a33]">Exportar participantes</h3>
                <p className="mt-2 text-[15px] text-slate-500">Elige qué participantes deseas exportar de 1 grupo.</p>
              </div>
              <button onClick={() => setExportChoice({ open: false, group: null })} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <button type="button" onClick={() => exportParticipants(exportChoice.group, 'all')} className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:bg-slate-50">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Users size={20} /></div>
                <div>
                  <p className="text-lg font-semibold text-[#151a33]">Todos los participantes</p>
                  <p className="text-sm text-slate-500">Incluye activos e inactivos</p>
                </div>
              </button>
              <button type="button" onClick={() => exportParticipants(exportChoice.group, 'active')} className="flex w-full items-center gap-4 rounded-2xl border border-slate-200 px-4 py-4 text-left transition hover:bg-slate-50">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><BadgeCheck size={20} /></div>
                <div>
                  <p className="text-lg font-semibold text-[#151a33]">Solo participantes activos</p>
                  <p className="text-sm text-slate-500">Únicamente los activos en el grupo</p>
                </div>
              </button>
            </div>
          </PopupCard>
        </div>
      )}

      {importQueueOpen && (
        <aside className="fixed right-0 top-0 z-[90] h-screen w-[360px] border-l border-slate-200 bg-white shadow-[-20px_0_60px_rgba(15,23,42,0.08)]">
          <div className="border-b border-slate-200 px-5 py-5">
            <div className="flex items-center justify-between">
              <h3 className="text-2xl font-semibold tracking-[-0.03em] text-[#151a33]">Importando grupos</h3>
              <button onClick={() => setImportQueueOpen(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>
            <p className="mt-3 text-sm text-slate-500">
              {importQueue.filter((item) => ['Exitoso', 'Error', 'Cancelado'].includes(item.status)).length} de {importQueue.length}
            </p>
            <div className="mt-3 h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-[#171923] transition-all"
                style={{
                  width: `${importQueue.length ? (importQueue.filter((item) => ['Exitoso', 'Error', 'Cancelado'].includes(item.status)).length / importQueue.length) * 100 : 0}%`,
                }}
              />
            </div>
            <div className="mt-3 flex items-center gap-4 text-sm">
              <span className="text-emerald-600">{importQueue.filter((item) => item.status === 'Exitoso').length} exitosos</span>
              <span className="text-red-500">{importQueue.filter((item) => item.status === 'Error').length} errores</span>
            </div>
          </div>

          <div className="h-[calc(100vh-170px)] overflow-y-auto px-3 py-3">
            {importQueue.map((entry) => (
              <div key={entry.id} className="mb-2 rounded-2xl border border-slate-200 px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{entry.order}</span>
                  <div className="min-w-0">
                    <p className="truncate text-lg font-medium text-[#151a33]">{entry.name}</p>
                    <p className={`text-sm ${
                      entry.status === 'Error'
                        ? 'text-red-500'
                        : entry.status === 'Exitoso'
                          ? 'text-emerald-600'
                          : entry.status === 'Cancelado'
                            ? 'text-amber-600'
                          : 'text-slate-400'
                    }`}>
                      {entry.status}
                    </p>
                    {entry.message ? <p className="mt-1 text-xs text-slate-400">{entry.message}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 p-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!importQueueRunning) return;
                  const nextPaused = !importQueuePaused;
                  setImportQueuePaused(nextPaused);
                  importQueuePauseRef.current = nextPaused;
                }}
                className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                {importQueuePaused ? 'Reanudar' : 'Pausar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (importQueueRunning) {
                    importQueueCancelRef.current = true;
                    importQueuePauseRef.current = false;
                    setImportQueuePaused(false);
                  } else {
                    setImportQueueOpen(false);
                  }
                }}
                className="flex-1 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Cancelar
              </button>
            </div>
          </div>
        </aside>
      )}

      {importQueue.length > 0 && !importQueueOpen && (
        <button
          type="button"
          onClick={() => setImportQueueOpen(true)}
          className="fixed right-0 top-1/2 z-[89] flex h-20 w-10 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-slate-200 bg-white text-slate-500 shadow-[-10px_0_30px_rgba(15,23,42,0.08)] transition hover:bg-slate-50 hover:text-slate-800"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      {exportsPanel.length > 0 && exportsPanelOpen && (
        <aside className="fixed right-0 top-0 z-[95] h-screen w-[330px] border-l border-slate-200 bg-white shadow-[-20px_0_60px_rgba(15,23,42,0.08)]">
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
            <h3 className="text-xl font-semibold tracking-[-0.03em] text-[#151a33]">Exportaciones ({exportsPanel.length})</h3>
            <button onClick={() => setExportsPanelOpen(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
              <ChevronRight size={18} />
            </button>
          </div>
          <div className="space-y-3 p-4">
            {exportsPanel.map((job) => (
              <div key={job.id} className="rounded-2xl border border-slate-200 bg-emerald-50/50 p-4">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xl font-semibold text-[#151a33]">{job.name}</p>
                    <p className="text-sm text-slate-500">
                      Grupo <span className="rounded bg-[#e8ebff] px-2 py-0.5 text-xs text-[#4f56d8]">{job.scope === 'active' ? 'Activos' : 'Todos'}</span>
                    </p>
                  </div>
                  <button onClick={() => setExportsPanel((current) => current.filter((item) => item.id !== job.id))} className="text-slate-400 transition hover:text-slate-700">
                    <X size={16} />
                  </button>
                </div>
                <p className="mb-4 text-sm text-slate-400">{job.count} / {job.count} registros</p>
                <a
                  href={job.url}
                  download={job.filename}
                  onClick={() => setExportsPanel((current) => current.map((item) => item.id === job.id ? { ...item, downloaded: true } : item))}
                  className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-[#08a332] text-base font-semibold text-white transition hover:bg-[#02892a]"
                >
                  <Download size={16} />
                  {job.downloaded ? 'Descargado' : 'Descargar'}
                </a>
              </div>
            ))}
          </div>
        </aside>
      )}

      {exportsPanel.length > 0 && !exportsPanelOpen && (
        <button
          type="button"
          onClick={() => setExportsPanelOpen(true)}
          className="fixed right-0 top-[42%] z-[94] flex h-20 w-10 -translate-y-1/2 items-center justify-center rounded-l-2xl border border-r-0 border-emerald-100 bg-emerald-50 text-emerald-600 shadow-[-10px_0_30px_rgba(15,23,42,0.08)] transition hover:bg-emerald-100"
        >
          <ChevronLeft size={18} />
        </button>
      )}

      <div className="fixed bottom-6 right-6 z-[130] space-y-3">
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={(toastId) => setToasts((current) => current.filter((item) => item.id !== toastId))} />
        ))}
      </div>
    </div>
  );
};

export default GruposComunidades;
