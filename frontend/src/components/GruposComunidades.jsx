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
  Columns,
  Download,
  ExternalLink,
  Eye,
  Filter,
  Link as LinkIcon,
  Loader2,
  Maximize2,
  MoreHorizontal,
  Pause,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  Trash2,
  Users,
  Upload,
  X,
  Lock,
} from 'lucide-react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';
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

const getDeviceProfilePhoto = (device) => (
  device?.fotoPerfil
  || device?.foto_perfil
  || device?.profilePictureUrl
  || device?.profile_picture_url
  || device?.avatar_url
  || device?.imagen_url
  || ''
);

const DeviceAvatar = ({ device }) => {
  const [imageFailed, setImageFailed] = useState(false);
  const photoUrl = getDeviceProfilePhoto(device);
  const initial = (device?.nombre || 'D').charAt(0).toUpperCase();
  const shouldShowPhoto = photoUrl && !imageFailed;

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-slate-100 text-sm font-semibold text-slate-700">
      {shouldShowPhoto ? (
        <img
          src={photoUrl}
          alt={device?.nombre || 'Dispositivo'}
          className="h-full w-full object-cover"
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        initial
      )}
    </div>
  );
};

const formatDateInputValue = (date) => {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const parseDateInputValue = (value) => {
  if (!value) return null;
  const normalized = String(value).includes('T') || String(value).includes(' ')
    ? String(value).replace(' ', 'T')
    : `${value}T00:00:00`;
  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const ParticipantCalendar = ({ value, monthDate, onMonthChange, onSelect }) => {
  const selected = parseDateInputValue(value);
  const monthStart = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
  const firstDay = monthStart.getDay();
  const daysInMonth = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0).getDate();
  const daysInPreviousMonth = new Date(monthDate.getFullYear(), monthDate.getMonth(), 0).getDate();
  const cells = [];

  for (let index = 0; index < 42; index += 1) {
    const dayOffset = index - firstDay + 1;
    let date;
    let muted = false;

    if (dayOffset < 1) {
      date = new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, daysInPreviousMonth + dayOffset);
      muted = true;
    } else if (dayOffset > daysInMonth) {
      date = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, dayOffset - daysInMonth);
      muted = true;
    } else {
      date = new Date(monthDate.getFullYear(), monthDate.getMonth(), dayOffset);
    }

    cells.push({ date, muted });
  }

  const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(monthDate);

  return (
    <div className="absolute top-12 z-[70] w-[260px] rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl">
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => onMonthChange(new Date(monthDate.getFullYear(), monthDate.getMonth() - 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-sm font-semibold text-slate-800">{monthLabel}</p>
        <button
          type="button"
          onClick={() => onMonthChange(new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 1))}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-xs text-slate-500">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map((day) => (
          <div key={day} className="py-1 font-medium">{day}</div>
        ))}
        {cells.map(({ date, muted }) => {
          const isSelected = selected && formatDateInputValue(selected) === formatDateInputValue(date);
          return (
            <button
              key={formatDateInputValue(date)}
              type="button"
              onClick={() => onSelect(formatDateInputValue(date))}
              className={`flex h-8 items-center justify-center rounded-full text-sm transition ${isSelected
                  ? 'bg-slate-100 font-semibold text-[#151a33]'
                  : muted
                    ? 'text-slate-300 hover:bg-slate-50'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
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
  { key: 'telefono', label: 'Teléfono' },
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
    className={`w-[340px] rounded-2xl border px-4 py-4 shadow-xl ${toast.type === 'error'
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
  const [currentPage, setCurrentPage] = useState(1);
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
  const [activeParticipantDropdown, setActiveParticipantDropdown] = useState(null);
  const [activeParticipantDatePicker, setActiveParticipantDatePicker] = useState(null);
  const [participantCalendarMonth, setParticipantCalendarMonth] = useState(() => new Date());
  const [importStep, setImportStep] = useState(null);
  const [importLoading, setImportLoading] = useState(false);
  const [importOptions, setImportOptions] = useState({ devices: [], groups: [] });
  const [importType, setImportType] = useState('grupo');
  const [importSearch, setImportSearch] = useState('');
  const [selectedDeviceId, setSelectedDeviceId] = useState(null);
  const [selectedSourceGroups, setSelectedSourceGroups] = useState([]);
  const [importGroupPickerOpen, setImportGroupPickerOpen] = useState(false);
  const [importQueueOpen, setImportQueueOpen] = useState(() => {
    try {
      return localStorage.getItem('geochat_importQueueOpen') === 'true';
    } catch {
      return false;
    }
  });
  const [importQueue, setImportQueue] = useState(() => {
    try {
      const saved = localStorage.getItem('geochat_importQueue');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [importQueuePaused, setImportQueuePaused] = useState(false);
  const [importQueueRunning, setImportQueueRunning] = useState(false);
  const [importQueueCountdown, setImportQueueCountdown] = useState(3);
  const [exportChoice, setExportChoice] = useState({ open: false, group: null });
  const [exportsPanel, setExportsPanel] = useState(() => {
    try {
      const saved = localStorage.getItem('geochat_exportsPanel');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [exportsPanelOpen, setExportsPanelOpen] = useState(() => {
    try {
      return localStorage.getItem('geochat_exportsPanelOpen') === 'true';
    } catch {
      return false;
    }
  });

  const [allowsIAGrupos, setAllowsIAGrupos] = useState(false);
  const [activeDetailTab, setActiveDetailTab] = useState('info');
  const [iaActivo, setIaActivo] = useState(false);
  const [iaInstrucciones, setIaInstrucciones] = useState('');
  const [iaPersonalidad, setIaPersonalidad] = useState('');
  const [moderacionActiva, setModeracionActiva] = useState(false);
  const [antiBloqueo, setAntiBloqueo] = useState(false);
  const [savingIA, setSavingIA] = useState(false);

  const [filterValues, setFilterValues] = useState({
    tipo: 'todos',
    estado: 'todos',
    dispositivo: 'todos',
  });
  const [toasts, setToasts] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: 'creadoEn', direction: 'descending' });
  const [activeDropdownFilter, setActiveDropdownFilter] = useState(null); // 'tipo' | 'estado' | 'dispositivo' | null
  const [bulkSyncing, setBulkSyncing] = useState(false);

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
    const fetchPlan = async () => {
      try {
        const response = await fetch(`${API_URL}/api/dashboard/${user?.id}`, {
          headers: buildAuthHeaders(user),
        });
        const result = await response.json();
        if (result.success) {
          setAllowsIAGrupos(result.dashboard?.plan?.features?.ia_grupos === 1 || result.dashboard?.plan?.features?.ia_grupos === true);
        }
      } catch (err) {
        console.error("Error fetching plan features:", err);
      }
    };
    if (user?.id) fetchPlan();
  }, [user?.id]);

  useEffect(() => {
    if (selectedDetail?.group) {
      setIaActivo(selectedDetail.group.ia_activo === 1 || selectedDetail.group.ia_activo === true);
      setIaInstrucciones(selectedDetail.group.ia_instrucciones || '');
      setIaPersonalidad(selectedDetail.group.ia_personalidad || '');
      setModeracionActiva(selectedDetail.group.moderacion_activa === 1 || selectedDetail.group.moderacion_activa === true);
      setAntiBloqueo(selectedDetail.group.anti_bloqueo === 1 || selectedDetail.group.anti_bloqueo === true);
      setActiveDetailTab('info'); // Reset tab to info on group change
    }
  }, [selectedDetail]);

  const saveGroupIASettings = async () => {
    if (!selectedDetail?.group?.id) return;
    setSavingIA(true);
    try {
      const response = await fetch(`${API_URL}/api/groups/${selectedDetail.group.id}/ia`, {
        method: 'PUT',
        headers: buildAuthHeaders(user, { 'Content-Type': 'application/json' }),
        body: JSON.stringify({
          ia_activo: iaActivo,
          ia_instrucciones: iaInstrucciones,
          ia_personalidad: iaPersonalidad,
          moderacion_activa: moderacionActiva,
          anti_bloqueo: antiBloqueo,
        }),
      });
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.message || 'No se pudo guardar la configuración');
      }
      pushToast('Configuración de IA del grupo guardada con éxito');

      setSelectedDetail(prev => ({
        ...prev,
        group: {
          ...prev.group,
          ia_activo: iaActivo ? 1 : 0,
          ia_instrucciones: iaInstrucciones,
          ia_personalidad: iaPersonalidad,
          moderacion_activa: moderacionActiva ? 1 : 0,
          anti_bloqueo: antiBloqueo ? 1 : 0,
        }
      }));
    } catch (err) {
      console.error(err);
      pushToast(err.message || 'Error al guardar la configuración de IA', 'error');
    } finally {
      setSavingIA(false);
    }
  };

  useEffect(() => {
    try {
      localStorage.setItem('geochat_importQueue', JSON.stringify(importQueue));
    } catch (e) {
      console.error(e);
    }
  }, [importQueue]);

  useEffect(() => {
    try {
      localStorage.setItem('geochat_importQueueOpen', String(importQueueOpen));
    } catch (e) {
      console.error(e);
    }
  }, [importQueueOpen]);

  useEffect(() => {
    try {
      localStorage.setItem('geochat_exportsPanel', JSON.stringify(exportsPanel));
    } catch (e) {
      console.error(e);
    }
  }, [exportsPanel]);

  useEffect(() => {
    try {
      localStorage.setItem('geochat_exportsPanelOpen', String(exportsPanelOpen));
    } catch (e) {
      console.error(e);
    }
  }, [exportsPanelOpen]);

  useEffect(() => {
    const handleOutside = (event) => {
      if (filtersRef.current && !filtersRef.current.contains(event.target)) {
        setFiltersOpen(false);
        setActiveDropdownFilter(null);
      }
      if (columnsRef.current && !columnsRef.current.contains(event.target)) {
        setColumnsOpen(false);
      }
      if (rowMenuRef.current && !rowMenuRef.current.contains(event.target)) {
        setRowMenuId(null);
      }
      if (participantFiltersRef.current && !participantFiltersRef.current.contains(event.target)) {
        setParticipantFiltersOpen(false);
        setActiveParticipantDropdown(null);
        setActiveParticipantDatePicker(null);
      }
      if (participantColumnsRef.current && !participantColumnsRef.current.contains(event.target)) {
        setParticipantColumnsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, []);

  useEffect(() => {
    if (!importQueueRunning || importQueuePaused) {
      return undefined;
    }

    const intervalId = window.setInterval(() => {
      setImportQueueCountdown((current) => (current <= 1 ? 6 : current - 1));
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [importQueueRunning, importQueuePaused]);

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

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterValues.tipo, filterValues.estado, filterValues.dispositivo, pageSize]);

  const pendingSync = useMemo(
    () => items.filter((item) => item.hasPendingSync),
    [items],
  );

  const sortedItems = useMemo(() => {
    let sortableItems = [...items];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue = a[sortConfig.key];
        let bValue = b[sortConfig.key];

        if (sortConfig.key === 'creadoEn' || sortConfig.key === 'actualizadoEn' || sortConfig.key === 'ultimaSincronizacion') {
          aValue = aValue ? new Date(String(aValue).replace(' ', 'T')) : new Date(0);
          bValue = bValue ? new Date(String(bValue).replace(' ', 'T')) : new Date(0);
        } else if (typeof aValue === 'string') {
          aValue = aValue.toLowerCase();
          bValue = bValue.toLowerCase();
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [items, sortConfig]);

  const totalPages = useMemo(() => {
    return Math.ceil(sortedItems.length / pageSize) || 1;
  }, [sortedItems, pageSize]);

  const visibleItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const renderSortIndicator = (key) => {
    if (sortConfig.key !== key) return ' ?';
    return sortConfig.direction === 'ascending' ? ' ?' : ' ?';
  };

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

  const filteredImportDevices = useMemo(() => {
    const query = importSearch.trim().toLowerCase();
    return (importOptions.devices || []).filter((device) => {
      if (!query) return true;
      return `${device.nombre || ''} ${device.numero_telefono || ''}`.toLowerCase().includes(query);
    });
  }, [importOptions.devices, importSearch]);

  const sourceGroupsForCurrentSelection = useMemo(() => {
    return (importOptions.groups || []).filter((group) => {
      const matchesDevice = selectedDeviceId ? Number(group.dispositivoId) === Number(selectedDeviceId) : true;
      const groupType = group.tipo || 'grupo';
      return matchesDevice && groupType === importType;
    });
  }, [importOptions.groups, selectedDeviceId, importType]);

  const selectedImportGroups = useMemo(() => {
    return (importOptions.groups || []).filter((group) => {
      const matchesDevice = selectedDeviceId ? Number(group.dispositivoId) === Number(selectedDeviceId) : true;
      return matchesDevice && selectedSourceGroups.includes(group.id);
    });
  }, [importOptions.groups, selectedDeviceId, selectedSourceGroups]);

  const visibleSelectableImportGroups = useMemo(
    () => importCandidates,
    [importCandidates],
  );

  const allVisibleImportGroupsSelected = visibleSelectableImportGroups.length > 0
    && visibleSelectableImportGroups.every((group) => selectedSourceGroups.includes(group.id));

  const importTypePluralLabel = typeOptions.find((option) => option.value === importType)?.label.toLowerCase() || 'grupos';

  const loadImportOptions = async () => {
    setImportLoading(true);
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
      setSelectedDeviceId(null);
      if (Array.isArray(data.warnings) && data.warnings.length > 0) {
        data.warnings.forEach((warning) => pushToast(warning, 'info'));
      }
    } catch (error) {
      pushToast(error.message || 'No se pudieron cargar los grupos de origen', 'error');
    } finally {
      setImportLoading(false);
    }
  };

  const openImportFlow = async () => {
    setImportType('grupo');
    setImportSearch('');
    setSelectedSourceGroups([]);
    setImportGroupPickerOpen(false);
    setImportStep('device');
    await loadImportOptions();
  };

  const continueToGroupSelection = () => {
    setSelectedSourceGroups(sourceGroupsForCurrentSelection.filter((group) => group.canImport).map((group) => group.id));
    setImportSearch('');
    setImportGroupPickerOpen(false);
    setImportStep('select-groups');
  };

  const toggleVisibleImportSelection = () => {
    const visibleIds = visibleSelectableImportGroups.map((group) => group.id);
    setSelectedSourceGroups((current) => {
      if (allVisibleImportGroupsSelected) {
        return current.filter((id) => !visibleIds.includes(id));
      }
      const importableIds = visibleSelectableImportGroups.filter((group) => group.canImport).map((group) => group.id);
      return Array.from(new Set([...current, ...importableIds]));
    });
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
    setImportQueueCountdown(3);
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
          item.status === 'En cola' ? { ...item, status: 'Cancelado', message: 'Importación cancelada por el usuario' } : item
        )));
        break;
      }

      while (importQueuePauseRef.current && !importQueueCancelRef.current) {
        await new Promise((resolve) => window.setTimeout(resolve, 250));
      }

      if (importQueueCancelRef.current) {
        setImportQueue((current) => current.map((item) => (
          item.status === 'En cola' ? { ...item, status: 'Cancelado', message: 'Importación cancelada por el usuario' } : item
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
    pushToast(importQueueCancelRef.current ? 'Importación cancelada' : 'Proceso de importación ejecutado', 'info');
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
    setActiveParticipantDropdown(null);
    setActiveParticipantDatePicker(null);
    setParticipantCalendarMonth(parseDateInputValue(item.creadoEn) || new Date());
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

  const syncAllPending = async () => {
    if (bulkSyncing || pendingSync.length === 0) return;
    setBulkSyncing(true);
    pushToast(`Iniciando sincronización masiva de ${pendingSync.length} grupos...`, 'info');

    let successCount = 0;
    let errorCount = 0;

    for (let index = 0; index < pendingSync.length; index += 1) {
      const item = pendingSync[index];
      try {
        const response = await fetch(`${API_URL}/api/groups/${item.id}/sync?user_id=${user.id}`, {
          method: 'POST',
          headers: buildAuthHeaders(user),
        });
        const result = await response.json();
        if (!result.success) {
          throw new Error(result.message || 'Error');
        }
        successCount += 1;
      } catch (error) {
        console.error(`Error al sincronizar ${item.nombre}:`, error);
        errorCount += 1;
      }

      if (index < pendingSync.length - 1) {
        // Esperar 1.5 segundos para evitar sobrecargar WhatsApp
        await new Promise((resolve) => setTimeout(resolve, 1500));
      }
    }

    setBulkSyncing(false);
    if (successCount > 0) {
      pushToast(`Sincronización masiva finalizada: ${successCount} exitosos, ${errorCount} errores.`);
    } else {
      pushToast(`No se pudo sincronizar ningún grupo. ${errorCount} errores.`, 'error');
    }
    await loadGroups();
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
        pushToast('Se verificara si es necesario crear grupos de respaldo automáticamente.', 'info');
      } else {
        pushToast('El grupo volvera a estar disponible para recibir redirecciones.', 'info');
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
    <div className="flex h-screen bg-[#eef3f8] font-sans text-slate-900 overflow-hidden">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-80 mr-5 mt-2 mb-2 flex h-[calc(100vh-16px)] flex-1 flex-col overflow-hidden rounded-[2rem] bg-white shadow-[0_20px_70px_rgba(15,23,42,0.06)] ml-80">
        <div className="flex-1 overflow-y-auto">
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
                <Upload size={17} />
                Importar
              </button>
            </div>

            {/* Tabs de tipo de grupo (Todos, Grupos, Comunidades, Canales) */}
            <div className="mb-6 border-b border-slate-100">
              <div className="flex gap-8">
                {[
                  { value: 'todos', label: 'Todos' },
                  { value: 'grupo', label: 'Grupos' },
                  { value: 'comunidad', label: 'Comunidades' },
                  { value: 'canal', label: 'Canales' },
                ].map((tab) => {
                  const isActive = filterValues.tipo === tab.value;
                  return (
                    <button
                      key={tab.value}
                      type="button"
                      onClick={() => setFilterValues((prev) => ({ ...prev, tipo: tab.value }))}
                      className={`relative pb-3 text-[15px] font-semibold transition-colors ${isActive ? 'text-[#5d57db]' : 'text-slate-400 hover:text-slate-600'
                        }`}
                    >
                      {tab.label}
                      {isActive && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#5d57db]" />
                      )}
                    </button>
                  );
                })}
              </div>
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
                    <Columns size={18} />
                    Columnas
                  </button>

                  {columnsOpen && (
                    <PopupCard className="absolute right-0 top-14 z-40 w-[192px] rounded-xl p-2">
                      <div className="space-y-1">
                        {columnsCatalog.map((column) => (
                          <button
                            key={column.key}
                            type="button"
                            onClick={() => setVisibleColumns((current) => ({ ...current, [column.key]: !current[column.key] }))}
                            className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-50"
                          >
                            <span className="w-4 text-slate-800">{visibleColumns[column.key] ? <Check size={16} /> : null}</span>
                            <span>{column.label}</span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setVisibleColumns(initialVisibleColumns)}
                          className="mt-2 flex w-full items-center gap-2 rounded-lg border-t border-slate-100 px-2 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <Eye size={16} />
                          Mostrar todas
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            pushToast('Anchos de columna restablecidos', 'info');
                          }}
                          className="flex w-full items-center gap-2 rounded-lg px-2 py-2.5 text-left text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          <RotateCcw size={16} />
                          Restablecer anchos
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
                    <PopupCard className="absolute right-0 top-14 z-40 w-[288px] rounded-xl p-3">
                      <div className="space-y-4">
                        <div>
                          <p className="mb-2 text-sm font-semibold text-slate-600">Tipo</p>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveDropdownFilter(activeDropdownFilter === 'tipo' ? null : 'tipo')}
                              className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#918cff]"
                            >
                              <span>{typeOptions.find(o => o.value === filterValues.tipo)?.label || 'Todos'}</span>
                              <ChevronDown size={16} className={`text-slate-400 transition-transform ${activeDropdownFilter === 'tipo' ? 'rotate-180' : ''}`} />
                            </button>

                            {activeDropdownFilter === 'tipo' && (
                              <div className="absolute left-0 right-0 top-11 z-50 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">
                                {typeOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setFilterValues(prev => ({ ...prev, tipo: option.value }));
                                      setActiveDropdownFilter(null);
                                    }}
                                    className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${filterValues.tipo === option.value ? 'bg-[#d4d4d8] text-slate-700' : 'text-slate-600'
                                      }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-sm font-semibold text-slate-600">Estado</p>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveDropdownFilter(activeDropdownFilter === 'estado' ? null : 'estado')}
                              className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#918cff]"
                            >
                              <span>{statusOptions.find(o => o.value === filterValues.estado)?.label || 'Todos los estados'}</span>
                              <ChevronDown size={16} className={`text-slate-400 transition-transform ${activeDropdownFilter === 'estado' ? 'rotate-180' : ''}`} />
                            </button>

                            {activeDropdownFilter === 'estado' && (
                              <div className="absolute left-0 right-0 top-11 z-50 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                {statusOptions.map((option) => (
                                  <button
                                    key={option.value}
                                    type="button"
                                    onClick={() => {
                                      setFilterValues(prev => ({ ...prev, estado: option.value }));
                                      setActiveDropdownFilter(null);
                                    }}
                                    className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${filterValues.estado === option.value ? 'bg-[#d4d4d8] text-slate-700' : 'text-slate-600'
                                      }`}
                                  >
                                    {option.label}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="mb-2 text-sm font-semibold text-slate-600">Dispositivo</p>
                          <div className="relative">
                            <button
                              type="button"
                              onClick={() => setActiveDropdownFilter(activeDropdownFilter === 'dispositivo' ? null : 'dispositivo')}
                              className="flex h-10 w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition focus:border-[#918cff]"
                            >
                              <span className="truncate">{filterValues.dispositivo === 'todos' ? 'Todos los dispositivos' : (devices.find(d => String(d.id) === String(filterValues.dispositivo))?.nombre || 'Todos los dispositivos')}</span>
                              <ChevronDown size={16} className={`text-slate-400 transition-transform ${activeDropdownFilter === 'dispositivo' ? 'rotate-180' : ''}`} />
                            </button>

                            {activeDropdownFilter === 'dispositivo' && (
                              <div className="absolute left-0 right-0 top-11 z-50 max-h-60 overflow-y-auto rounded-xl border border-slate-200 bg-white shadow-xl">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setFilterValues(prev => ({ ...prev, dispositivo: 'todos' }));
                                    setActiveDropdownFilter(null);
                                  }}
                                  className={`flex w-full items-center px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${filterValues.dispositivo === 'todos' ? 'bg-[#d4d4d8] text-slate-700' : 'text-slate-600'
                                    }`}
                                >
                                  Todos los dispositivos
                                </button>
                                {devices.map((device) => {
                                  const isConnected = (device.estado || '').toLowerCase() === 'conectado';
                                  return (
                                    <button
                                      key={device.id}
                                      type="button"
                                      onClick={() => {
                                        setFilterValues(prev => ({ ...prev, dispositivo: String(device.id) }));
                                        setActiveDropdownFilter(null);
                                      }}
                                      className={`flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm transition hover:bg-slate-50 ${String(filterValues.dispositivo) === String(device.id) ? 'bg-[#d4d4d8] text-slate-700' : 'text-slate-600'
                                        }`}
                                    >
                                      <span className={`h-2 w-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                                      {device.nombre}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>
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
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="mt-1 flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-100 text-sky-600">
                      <RefreshCw size={20} className={bulkSyncing ? 'animate-spin' : ''} />
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
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      disabled={bulkSyncing}
                      onClick={syncAllPending}
                      className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-sky-700 disabled:opacity-50"
                    >
                      {bulkSyncing ? (
                        <>
                          <RefreshCw size={15} className="animate-spin" />
                          Sincronizando...
                        </>
                      ) : (
                        <>
                          <RefreshCw size={15} />
                          Sincronizar todos
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      disabled={bulkSyncing}
                      onClick={() => setFilterValues((current) => ({ ...current, estado: 'pendiente_sync' }))}
                      className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100 disabled:opacity-50"
                    >
                      Ver afectados
                    </button>
                  </div>
                </div>
              </div>
            )}

            <section className="rounded-[1.8rem] border border-slate-200 bg-white">
              <div className="overflow-x-auto">
                <table className="min-w-[1350px] w-full">
                  <thead>
                    <tr className="border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                      <th className="px-4 py-4"><input type="checkbox" className="h-4 w-4 rounded border-slate-300" /></th>
                      <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('nombre')}>
                        Nombre {renderSortIndicator('nombre')}
                      </th>
                      {visibleColumns.origen && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('origen')}>
                          Origen {renderSortIndicator('origen')}
                        </th>
                      )}
                      {visibleColumns.clicks && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('clicks')}>
                          Clicks {renderSortIndicator('clicks')}
                        </th>
                      )}
                      {visibleColumns.admins && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('admins')}>
                          Admins {renderSortIndicator('admins')}
                        </th>
                      )}
                      {visibleColumns.participantes && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('participantes')}>
                          Participantes {renderSortIndicator('participantes')}
                        </th>
                      )}
                      {visibleColumns.mensajesProgramados && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('mensajesProgramados')}>
                          Msg. Programados {renderSortIndicator('mensajesProgramados')}
                        </th>
                      )}
                      {visibleColumns.tipo && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('tipo')}>
                          Tipo {renderSortIndicator('tipo')}
                        </th>
                      )}
                      {visibleColumns.capacidad && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('lleno')}>
                          Capacidad {renderSortIndicator('lleno')}
                        </th>
                      )}
                      {visibleColumns.creadoEn && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('creadoEn')}>
                          Creado {renderSortIndicator('creadoEn')}
                        </th>
                      )}
                      {visibleColumns.actualizadoEn && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('actualizadoEn')}>
                          Actualización {renderSortIndicator('actualizadoEn')}
                        </th>
                      )}
                      {visibleColumns.ultimaSincronizacion && (
                        <th className="px-4 py-4 cursor-pointer select-none hover:bg-slate-50 transition" onClick={() => requestSort('ultimaSincronizacion')}>
                          Última sincronización {renderSortIndicator('ultimaSincronizacion')}
                        </th>
                      )}
                      <th className="px-4 py-4" />
                    </tr>
                  </thead>
                  <tbody>
                    {!loading && visibleItems.length === 0 && (
                      <tr>
                        <td colSpan={2 + Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-20 text-center">
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
                    {loading && (
                      <tr>
                        <td colSpan={2 + Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-16 text-center text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            Cargando grupos...
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex flex-col md:flex-row items-center justify-between border-t border-slate-100 px-6 py-4 bg-white rounded-b-3xl gap-4">
                {/* Left: Elements per page & Count */}
                <div className="flex items-center gap-6 text-sm text-slate-500 font-semibold font-sans">
                  <div className="flex items-center gap-2">
                    <span>Elementos por página</span>
                    <select
                      value={pageSize}
                      onChange={(event) => {
                        setPageSize(Number(event.target.value));
                        setCurrentPage(1);
                      }}
                      className="rounded-full border border-slate-200 px-3 py-1.5 text-sm text-slate-700 outline-none bg-white transition hover:border-slate-300 focus:border-[#918cff]"
                    >
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  {sortedItems.length > 0 && (
                    <div>
                      Mostrando <span className="text-slate-800">{(currentPage - 1) * pageSize + 1}</span> a{' '}
                      <span className="text-slate-800">{Math.min(sortedItems.length, currentPage * pageSize)}</span> de{' '}
                      <span className="text-slate-800">{sortedItems.length}</span> registros
                    </div>
                  )}
                </div>

                {/* Right: Pagination Buttons */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-2 select-none font-sans">
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Anterior
                    </button>

                    {(() => {
                      const pageNumbers = [];
                      const maxVisiblePages = 5;
                      let startPage = Math.max(1, currentPage - 2);
                      let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);

                      if (endPage - startPage + 1 < maxVisiblePages) {
                        startPage = Math.max(1, endPage - maxVisiblePages + 1);
                      }

                      for (let i = startPage; i <= endPage; i++) {
                        pageNumbers.push(i);
                      }

                      return (
                        <>
                          {startPage > 1 && (
                            <>
                              <button
                                type="button"
                                onClick={() => setCurrentPage(1)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${currentPage === 1
                                    ? 'bg-[#0ea5e9] text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50 border border-slate-200 bg-white'
                                  }`}
                              >
                                1
                              </button>
                              {startPage > 2 && <span className="text-slate-400 text-xs px-1">...</span>}
                            </>
                          )}

                          {pageNumbers.map(page => (
                            <button
                              key={page}
                              type="button"
                              onClick={() => setCurrentPage(page)}
                              className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${currentPage === page
                                  ? 'bg-[#0ea5e9] text-white shadow-sm'
                                  : 'text-slate-600 hover:bg-slate-50 border border-slate-200 bg-white'
                                }`}
                            >
                              {page}
                            </button>
                          ))}

                          {endPage < totalPages && (
                            <>
                              {endPage < totalPages - 1 && <span className="text-slate-400 text-xs px-1">...</span>}
                              <button
                                type="button"
                                onClick={() => setCurrentPage(totalPages)}
                                className={`w-8 h-8 rounded-xl text-xs font-bold flex items-center justify-center transition-all ${currentPage === totalPages
                                    ? 'bg-[#0ea5e9] text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50 border border-slate-200 bg-white'
                                  }`}
                              >
                                {totalPages}
                              </button>
                            </>
                          )}
                        </>
                      );
                    })()}

                    <button
                      type="button"
                      disabled={currentPage === totalPages}
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>

        {selectedDetail && (
          <>
            <button
              type="button"
              aria-label="Cerrar detalle"
              onClick={() => setSelectedDetail(null)}
              className="fixed inset-0 z-[100] bg-black/75"
            />
            <aside className="fixed right-0 top-0 z-[101] h-screen w-full max-w-[520px] overflow-y-auto border-l border-slate-200 bg-white px-6 py-6 shadow-[-20px_0_60px_rgba(15,23,42,0.18)]">
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

              {/* Pestañas de detalle */}
              <div className="mb-6 flex gap-2 border-b border-slate-100 pb-px">
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('info')}
                  className={`pb-3 text-sm font-bold tracking-tight border-b-2 transition-all px-2 ${activeDetailTab === 'info'
                      ? 'border-[#4f56d8] text-[#4f56d8]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                  Información del Grupo
                </button>
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('ia')}
                  className={`pb-3 text-sm font-bold tracking-tight border-b-2 transition-all px-2 flex items-center gap-1.5 ${activeDetailTab === 'ia'
                      ? 'border-[#4f56d8] text-[#4f56d8]'
                      : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                >
                  ?? Inteligencia Artificial y Moderación
                </button>
              </div>

              {detailLoading ? (
                <div className="flex items-center gap-3 text-slate-500">
                  <Loader2 size={18} className="animate-spin" />
                  Cargando detalle...
                </div>
              ) : (
                <>
                  {activeDetailTab === 'info' ? (
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
                                : 'Los datos de participantes pueden estar desactualizados. Sincroniza para obtener la información mas reciente.'}
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
                                    <p className="font-medium text-slate-800">{admin.nombre || admin.telefono || 'Sin nombre'}</p>
                                    <p className="text-sm text-slate-500">{admin.telefono && admin.telefono !== admin.nombre ? admin.telefono : 'WhatsApp'}</p>
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
                  ) : (
                    <>
                      {!allowsIAGrupos ? (
                        <div className="flex flex-col items-center justify-center p-8 border border-slate-100 rounded-3xl bg-slate-50/50 mt-4 text-center select-none">
                          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 mb-4 border border-amber-100">
                            <Lock size={28} />
                          </div>
                          <h3 className="text-lg font-bold text-slate-800">IA de Grupos Desactivada</h3>
                          <p className="mt-2 text-xs text-slate-500 max-w-[340px] leading-relaxed">
                            El asistente de Inteligencia Artificial para responder menciones y la moderación automática de enlaces y comentarios en grupos y comunidades son exclusivos del <strong>Plan Advanced</strong>.
                          </p>
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedDetail(null);
                              window.location.hash = '#pricing';
                            }}
                            className="mt-6 px-5 py-2.5 bg-[#4f56d8] hover:bg-[#4047c2] text-white rounded-xl text-xs font-black uppercase tracking-wider transition-colors shadow-sm"
                          >
                            Mejorar mi plan
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-6 mt-4">
                          {/* A. Activar Bot de IA */}
                          <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">Asistente de IA en el Grupo</h4>
                              <p className="text-xs text-slate-500 mt-1">El bot respondera de forma automática cuando sea mencionado en el grupo.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={iaActivo}
                                onChange={(e) => setIaActivo(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4f56d8]"></div>
                            </label>
                          </div>

                          {iaActivo && (
                            <div className="space-y-4 animate-fadeIn">
                              {/* Instrucciones */}
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Instrucciones y Contexto del Negocio</label>
                                <textarea
                                  value={iaInstrucciones}
                                  onChange={(e) => setIaInstrucciones(e.target.value)}
                                  placeholder="Ej: Eres el asistente oficial de ventas del grupo. Ayuda a los clientes con información sobre precios, envíos y horarios."
                                  rows={4}
                                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#4f56d8] focus:ring-1 focus:ring-[#4f56d8] placeholder:text-slate-400"
                                />
                              </div>

                              {/* Personalidad */}
                              <div>
                                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Personalidad y Tono del Bot</label>
                                <textarea
                                  value={iaPersonalidad}
                                  onChange={(e) => setIaPersonalidad(e.target.value)}
                                  placeholder="Ej: Mantén un tono sumamente amable, formal y profesional. Usa emojis de forma moderada."
                                  rows={3}
                                  className="w-full rounded-2xl border border-slate-200 p-3.5 text-sm outline-none transition focus:border-[#4f56d8] focus:ring-1 focus:ring-[#4f56d8] placeholder:text-slate-400"
                                />
                              </div>
                            </div>
                          )}

                          {/* B. Moderación de Comentarios */}
                          <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">Moderación de Enlaces y Spam</h4>
                              <p className="text-xs text-slate-500 mt-1">Bloquea de forma automática enlaces promocionales o mensajes de spam enviados al grupo.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={moderacionActiva}
                                onChange={(e) => setModeracionActiva(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4f56d8]"></div>
                            </label>
                          </div>

                          {/* C. Anti-bloqueos */}
                          <div className="flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                            <div>
                              <h4 className="font-bold text-slate-800 text-sm">Protección Anti-bloqueos</h4>
                              <p className="text-xs text-slate-500 mt-1">Introduce variaciones y retrasos inteligentes en las respuestas del bot para resguardar la línea.</p>
                            </div>
                            <label className="relative inline-flex items-center cursor-pointer select-none">
                              <input
                                type="checkbox"
                                checked={antiBloqueo}
                                onChange={(e) => setAntiBloqueo(e.target.checked)}
                                className="sr-only peer"
                              />
                              <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#4f56d8]"></div>
                            </label>
                          </div>

                          {/* Botón Guardar */}
                          <button
                            type="button"
                            disabled={savingIA}
                            onClick={saveGroupIASettings}
                            className="w-full py-4 bg-[#4f56d8] hover:bg-[#4047c2] text-white rounded-2xl font-black text-xs uppercase tracking-wider transition-colors shadow-md hover:shadow-lg disabled:opacity-50 flex items-center justify-center gap-2"
                          >
                            {savingIA ? (
                              <>
                                <Loader2 size={14} className="animate-spin" />
                                Guardando configuración...
                              </>
                            ) : (
                              'Guardar Configuración'
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </aside>
          </>
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
                        onClick={() => {
                          setImportType(option.value);
                          setSelectedSourceGroups([]);
                        }}
                        className={`inline-flex items-center gap-2 rounded-2xl border px-4 py-3 text-base font-medium transition ${importType === option.value ? 'border-[#8f88ff] bg-[#f2f1ff] text-[#1f2340]' : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
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
                  {importLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-[#5d57db]" />
                      <p className="mt-4 text-sm text-slate-500 font-medium">Cargando números y chats desde WhatsApp...</p>
                    </div>
                  ) : (
                    <>
                      {importOptions.devices.length === 0 && (
                        <div className="rounded-[1.4rem] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                          No hay números de WhatsApp conectados para importar.
                        </div>
                      )}
                      {importOptions.devices.length > 0 && filteredImportDevices.length === 0 && (
                        <div className="rounded-[1.4rem] border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                          No se encontraron números para esta búsqueda.
                        </div>
                      )}
                      {filteredImportDevices.map((device) => (
                        <button
                          key={device.id}
                          type="button"
                          onClick={() => {
                            setSelectedDeviceId(device.id);
                            setSelectedSourceGroups([]);
                          }}
                          className={`flex w-full items-center justify-between rounded-2xl border px-3 py-3 text-left transition ${Number(selectedDeviceId) === Number(device.id)
                              ? 'border-[#8f88ff] bg-[#f2f4ff]'
                              : 'border-slate-200 hover:bg-slate-50'
                            }`}
                        >
                          <div className="flex min-w-0 items-center gap-3">
                            <span className={`h-4 w-4 rounded-full border ${Number(selectedDeviceId) === Number(device.id) ? 'border-[#1f2340] bg-[#1f2340]' : 'border-slate-300'}`} />
                            <DeviceAvatar device={device} />
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-800">{device.nombre}</p>
                              <p className="text-sm text-slate-500">{device.numero_telefono || 'Sin número'}</p>
                            </div>
                          </div>
                          <span className="ml-3 shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-600">
                            {(device.estado || '').toLowerCase() === 'conectado' ? 'Conectado' : 'Desconectado'}
                          </span>
                        </button>
                      ))}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={continueToGroupSelection}
                  disabled={!selectedDeviceId || importLoading}
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
                    <h3 className="text-[1.8rem] font-semibold tracking-[-0.03em] text-[#151a33]">Seleccionar {importTypePluralLabel}</h3>
                    <p className="mt-2 text-[15px] text-slate-500">Selecciona {importType === 'comunidad' ? 'las comunidades' : importType === 'canal' ? 'los canales' : 'los grupos'} que deseas importar</p>
                  </div>
                  <button onClick={() => setImportStep(null)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                    <X size={18} />
                  </button>
                </div>

                <div className="hidden">
                  <p className="text-sm font-medium text-slate-500">
                    {selectedImportGroups.length} de {sourceGroupsForCurrentSelection.length} seleccionados
                  </p>
                  <button
                    type="button"
                    onClick={toggleVisibleImportSelection}
                    disabled={visibleSelectableImportGroups.length === 0}
                    className="rounded-full border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {allVisibleImportGroupsSelected ? 'Quitar visibles' : 'Seleccionar visibles'}
                  </button>
                </div>

                <div className="mb-4 rounded-xl border border-slate-300 bg-white p-2">
                  <p className="mb-2 text-xs font-semibold text-slate-700">Seleccionar {importTypePluralLabel}</p>
                  <div className="max-h-[410px] min-h-[260px] overflow-y-auto pr-1">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedImportGroups.map((group) => (
                        <span key={group.id} className="inline-flex max-w-full items-center gap-1 rounded bg-slate-100 px-2 py-1 text-[11px] leading-none text-slate-600">
                          <span className="max-w-[175px] truncate">{group.nombre}</span>
                          <button type="button" onClick={() => setSelectedSourceGroups((current) => current.filter((id) => id !== group.id))} className="text-slate-400 transition hover:text-slate-700">
                            <X size={10} />
                          </button>
                        </span>
                      ))}
                      {selectedImportGroups.length === 0 && (
                        <span className="px-1 py-2 text-xs text-slate-400">No hay {importTypePluralLabel} seleccionados</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2 flex items-center justify-end gap-2 border-t border-slate-100 pt-2">
                    <button type="button" onClick={() => setSelectedSourceGroups([])} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                      <X size={14} />
                    </button>
                    <button type="button" onClick={() => setImportGroupPickerOpen((current) => !current)} className="rounded-full p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700">
                      <ChevronDown size={15} className={`transition-transform ${importGroupPickerOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {importGroupPickerOpen && (
                    <div className="mt-2 max-h-[180px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-lg">
                      <button
                        type="button"
                        onClick={toggleVisibleImportSelection}
                        disabled={visibleSelectableImportGroups.length === 0}
                        className="mb-2 w-full rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {allVisibleImportGroupsSelected ? 'Quitar visibles' : 'Seleccionar visibles'}
                      </button>
                      {sourceGroupsForCurrentSelection.map((group) => {
                        const selected = selectedSourceGroups.includes(group.id);
                        const disabled = !group.canImport;
                        return (
                          <button
                            key={group.id}
                            type="button"
                            disabled={disabled}
                            onClick={() => {
                              setSelectedSourceGroups((current) => selected ? current.filter((id) => id !== group.id) : [...current, group.id]);
                            }}
                            className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs transition ${selected
                                ? 'bg-[#f2f4ff] text-slate-800'
                                : disabled
                                  ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400'
                                  : 'text-slate-600 hover:bg-slate-50'
                              }`}
                          >
                            <span className="truncate">
                              {group.nombre} {disabled && <span className="text-[10px] text-amber-500 font-semibold ml-1">(Requiere admin)</span>}
                            </span>
                            {selected ? <Check size={13} className="text-[#5d57db]" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <div className="hidden">
                  {importCandidates.length === 0 && (
                    <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                      No se encontraron grupos para esta búsqueda.
                    </div>
                  )}
                  {importCandidates.map((group) => {
                    const selected = selectedSourceGroups.includes(group.id);
                    return (
                      <button
                        key={group.id}
                        type="button"
                        onClick={() => {
                          setSelectedSourceGroups((current) => selected ? current.filter((id) => id !== group.id) : [...current, group.id]);
                        }}
                        className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${selected
                            ? 'border-[#8f88ff] bg-[#f2f4ff]'
                            : group.canImport
                              ? 'border-slate-200 hover:bg-slate-50'
                              : 'border-amber-100 bg-amber-50/40 hover:bg-amber-50'
                          }`}
                      >
                        <div>
                          <p className="font-medium text-slate-700">{group.nombre}</p>
                          <p className="text-xs text-slate-400">{group.dispositivoNombre}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          {!group.canImport ? (
                            <span className="rounded-full bg-amber-50 px-2 py-1 text-xs text-amber-600">Requiere admin</span>
                          ) : null}
                          {selected ? <Check size={15} className="text-[#5d57db]" /> : null}
                        </div>
                      </button>
                    );
                  })}
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
                    <Upload size={16} />
                    Importar {selectedImportGroups.length} {importTypePluralLabel}
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
                    <button
                      type="button"
                      onClick={() => {
                        setParticipantColumnsOpen((current) => !current);
                        setParticipantFiltersOpen(false);
                        setActiveParticipantDropdown(null);
                      }}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#1f2340] shadow-sm transition hover:bg-slate-50"
                    >
                      <Columns size={18} />
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
                    <button
                      type="button"
                      onClick={() => {
                        setParticipantFiltersOpen((current) => !current);
                        setActiveParticipantDropdown(null);
                        setParticipantColumnsOpen(false);
                      }}
                      className="inline-flex h-11 items-center gap-2 rounded-full border border-slate-200 bg-white px-5 text-[15px] font-medium text-[#1f2340] shadow-sm transition hover:bg-slate-50"
                    >
                      <Filter size={18} />
                      Filtrar
                    </button>
                    {participantFiltersOpen && (
                      <PopupCard className="absolute right-0 top-14 z-40 w-[320px] overflow-visible p-4">
                        <h4 className="mb-4 text-lg font-semibold text-slate-700">Filtros</h4>
                        <div className="space-y-4">
                          <div>
                            <p className="mb-2 text-sm font-semibold text-slate-600">Estado</p>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveParticipantDatePicker(null);
                                  setActiveParticipantDropdown(activeParticipantDropdown === 'estado' ? null : 'estado');
                                }}
                                className={`flex h-11 w-full items-center justify-between rounded-2xl border bg-white px-4 text-sm text-slate-700 outline-none transition ${activeParticipantDropdown === 'estado' ? 'border-[#7c72ff] ring-2 ring-[#eceaff]' : 'border-slate-200'
                                  }`}
                              >
                                <span>{participantStatusOptions.find((option) => option.value === participantStatusFilter)?.label || 'Todos los estados'}</span>
                                <ChevronDown size={16} className={`text-slate-500 transition-transform ${activeParticipantDropdown === 'estado' ? 'rotate-180' : ''}`} />
                              </button>
                              {activeParticipantDropdown === 'estado' && (
                                <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                  {participantStatusOptions.map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        setParticipantStatusFilter(option.value);
                                        setActiveParticipantDropdown(null);
                                      }}
                                      className={`flex w-full px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${participantStatusFilter === option.value ? 'bg-[#d4d4d8] text-slate-700' : 'text-slate-600'
                                        }`}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div>
                            <p className="mb-2 text-sm font-semibold text-slate-600">Rango de fechas</p>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveParticipantDatePicker(null);
                                  setActiveParticipantDropdown(activeParticipantDropdown === 'fechas' ? null : 'fechas');
                                }}
                                className={`flex h-11 w-full items-center justify-between rounded-2xl border bg-white px-4 text-sm text-slate-700 outline-none transition ${activeParticipantDropdown === 'fechas' ? 'border-[#7c72ff] ring-2 ring-[#eceaff]' : 'border-slate-200'
                                  }`}
                              >
                                <span>{participantDateFilter === 'ingreso' ? 'Solo ingreso' : participantDateFilter === 'salida' ? 'Solo salida' : 'Ambas fechas'}</span>
                                <ChevronDown size={16} className={`text-slate-500 transition-transform ${activeParticipantDropdown === 'fechas' ? 'rotate-180' : ''}`} />
                              </button>
                              {activeParticipantDropdown === 'fechas' && (
                                <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
                                  {[
                                    { value: 'ambas', label: 'Ambas fechas' },
                                    { value: 'ingreso', label: 'Solo ingreso' },
                                    { value: 'salida', label: 'Solo salida' },
                                  ].map((option) => (
                                    <button
                                      key={option.value}
                                      type="button"
                                      onClick={() => {
                                        setParticipantDateFilter(option.value);
                                        setActiveParticipantDropdown(null);
                                      }}
                                      className={`flex w-full px-4 py-3 text-left text-sm transition hover:bg-slate-50 ${participantDateFilter === option.value ? 'bg-[#d4d4d8] text-slate-700' : 'text-slate-600'
                                        }`}
                                    >
                                      {option.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveParticipantDropdown(null);
                                  setActiveParticipantDatePicker(activeParticipantDatePicker === 'from' ? null : 'from');
                                  setParticipantCalendarMonth(parseDateInputValue(participantDateRange.from) || parseDateInputValue(participantsModal.group?.creadoEn) || new Date());
                                }}
                                className={`inline-flex h-11 w-full items-center gap-2 rounded-2xl border px-4 text-sm transition ${activeParticipantDatePicker === 'from' ? 'border-[#7c72ff] text-slate-700 ring-2 ring-[#eceaff]' : 'border-slate-200 text-slate-500'
                                  }`}
                              >
                                <Calendar size={16} />
                                <span className="truncate">{participantDateRange.from || 'Desde'}</span>
                              </button>
                              {activeParticipantDatePicker === 'from' && (
                                <ParticipantCalendar
                                  value={participantDateRange.from}
                                  monthDate={participantCalendarMonth}
                                  onMonthChange={setParticipantCalendarMonth}
                                  onSelect={(value) => {
                                    setParticipantDateRange((current) => ({ ...current, from: value }));
                                    setActiveParticipantDatePicker(null);
                                  }}
                                />
                              )}
                            </div>
                            <div className="relative">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveParticipantDropdown(null);
                                  setActiveParticipantDatePicker(activeParticipantDatePicker === 'to' ? null : 'to');
                                  setParticipantCalendarMonth(parseDateInputValue(participantDateRange.to) || parseDateInputValue(participantsModal.group?.creadoEn) || new Date());
                                }}
                                className={`inline-flex h-11 w-full items-center gap-2 rounded-2xl border px-4 text-sm transition ${activeParticipantDatePicker === 'to' ? 'border-[#7c72ff] text-slate-700 ring-2 ring-[#eceaff]' : 'border-slate-200 text-slate-500'
                                  }`}
                              >
                                <Calendar size={16} />
                                <span className="truncate">{participantDateRange.to || 'Hasta'}</span>
                              </button>
                              {activeParticipantDatePicker === 'to' && (
                                <ParticipantCalendar
                                  value={participantDateRange.to}
                                  monthDate={participantCalendarMonth}
                                  onMonthChange={setParticipantCalendarMonth}
                                  onSelect={(value) => {
                                    setParticipantDateRange((current) => ({ ...current, to: value }));
                                    setActiveParticipantDatePicker(null);
                                  }}
                                />
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setParticipantStatusFilter('todos');
                              setParticipantDateFilter('ambas');
                              setParticipantDateRange({ from: '', to: '' });
                              setActiveParticipantDropdown(null);
                              setActiveParticipantDatePicker(null);
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
                      {participantVisibleColumns.telefono && <th className="px-4 py-4">Participante</th>}
                      {participantVisibleColumns.origen && <th className="px-4 py-4">Origen</th>}
                      {participantVisibleColumns.fechaIngreso && <th className="px-4 py-4">Fecha ingreso</th>}
                      {participantVisibleColumns.fechaSalida && <th className="px-4 py-4">Fecha salida</th>}
                      {participantVisibleColumns.estado && <th className="px-4 py-4">Estado</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {participantsModal.loading && (
                      <tr>
                        <td colSpan={1 + Object.values(participantVisibleColumns).filter(Boolean).length} className="px-6 py-16 text-center text-slate-500">
                          <span className="inline-flex items-center gap-2">
                            <Loader2 size={18} className="animate-spin" />
                            Cargando participantes...
                          </span>
                        </td>
                      </tr>
                    )}
                    {!participantsModal.loading && filteredParticipants.length === 0 && (
                      <tr>
                        <td colSpan={1 + Object.values(participantVisibleColumns).filter(Boolean).length} className="px-6 py-20 text-center">
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
                        {participantVisibleColumns.telefono && (
                          <td className="px-4 py-4">
                            <div className="min-w-0">
                              <p className="truncate text-sm font-medium text-slate-700">{participant.nombre || participant.telefono || 'Sin nombre'}</p>
                              <p className="truncate text-xs text-slate-500">{participant.telefono || 'Sin teléfono'}</p>
                            </div>
                          </td>
                        )}
                        {participantVisibleColumns.origen && <td className="px-4 py-4 text-sm text-slate-500">{participant.origen}</td>}
                        {participantVisibleColumns.fechaIngreso && <td className="px-4 py-4 text-sm text-slate-500">{participant.fechaIngreso || '-'}</td>}
                        {participantVisibleColumns.fechaSalida && <td className="px-4 py-4 text-sm text-slate-500">{participant.fechaSalida || '-'}</td>}
                        {participantVisibleColumns.estado && (
                          <td className="px-4 py-4">
                            <span className={`rounded-full px-3 py-1 text-sm font-medium ${participant.estado === 'salio'
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
                <p className="mt-2 text-[15px] text-slate-500">Elige que participantes deseas exportar de 1 grupo.</p>
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
        <aside className="fixed bottom-2 right-2 top-2 z-[90] flex w-[360px] max-w-[calc(100vw-16px)] flex-col overflow-hidden rounded-l-2xl border border-slate-200 bg-white shadow-[-20px_0_60px_rgba(15,23,42,0.08)]">
          <div className="shrink-0 border-b border-slate-200 px-4 py-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold tracking-[-0.02em] text-[#151a33]">Importando {importTypePluralLabel}</h3>
              <div className="flex items-center gap-1">
                <button type="button" className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                  <Maximize2 size={16} />
                </button>
                <button onClick={() => setImportQueueOpen(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                  <X size={17} />
                </button>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-sm">
              <span className="text-slate-500">
                {importQueue.filter((item) => ['Exitoso', 'Error', 'Cancelado'].includes(item.status)).length} de {importQueue.length}
              </span>
              <span className="font-semibold text-[#151a33]">
                {importQueue.length ? Math.round((importQueue.filter((item) => ['Exitoso', 'Error', 'Cancelado'].includes(item.status)).length / importQueue.length) * 100) : 0}%
              </span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-100">
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

          <div className="shrink-0 border-b border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
            <span className="inline-flex items-center gap-2">
              <Clock3 size={15} className="text-slate-500" />
              {importQueueRunning && !importQueuePaused ? `Siguiente en ${importQueueCountdown}s` : importQueuePaused ? 'Importación pausada' : 'Importación finalizada'}
            </span>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 py-2">
            {importQueue.map((entry) => (
              <div key={entry.id} className="mb-2 rounded-xl border border-slate-200 px-3 py-3">
                <div className="flex items-center gap-3">
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-500">{entry.order}</span>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-[#151a33]">{entry.name}</p>
                    <p className={`text-xs ${entry.status === 'Error'
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

          <div className="shrink-0 border-t border-slate-200 bg-white p-4">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  if (!importQueueRunning) return;
                  const nextPaused = !importQueuePaused;
                  setImportQueuePaused(nextPaused);
                  importQueuePauseRef.current = nextPaused;
                }}
                className="inline-flex flex-1 items-center justify-center gap-2 rounded-full border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Pause size={14} />
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
        <>
          <button
            type="button"
            aria-label="Cerrar exportaciones"
            onClick={() => setExportsPanelOpen(false)}
            className="fixed inset-0 z-[94] bg-black/25"
          />
          <aside className="fixed right-0 top-0 z-[95] h-screen w-[330px] border-l border-slate-200 bg-white shadow-[-20px_0_60px_rgba(15,23,42,0.08)]">
            <div className="flex items-center justify-between border-b border-slate-200 px-5 py-5">
              <h3 className="inline-flex items-center gap-2 text-lg font-semibold tracking-[-0.02em] text-[#151a33]">
                <Download size={18} />
                Exportaciones ({exportsPanel.length}/15)
              </h3>
              <button onClick={() => setExportsPanelOpen(false)} className="rounded-full p-2 text-slate-500 transition hover:bg-slate-100">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="space-y-3 p-4">
              {exportsPanel.map((job) => (
                <div key={job.id} className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="mb-2 flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold uppercase tracking-[0.02em] text-[#151a33]">{job.name}</p>
                      <p className="text-sm text-slate-500">
                        Grupo <span className="rounded bg-[#e8ebff] px-2 py-0.5 text-xs text-[#4f56d8]">{job.scope === 'active' ? 'Activos' : 'Todos'}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Check size={16} className="text-emerald-600" />
                      <button onClick={() => setExportsPanel((current) => current.filter((item) => item.id !== job.id))} className="text-slate-400 transition hover:text-slate-700">
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                  <p className="mb-2 text-sm text-slate-400">{job.count} / {job.count} registros</p>
                  <div className="mb-3 h-2 rounded-full bg-emerald-100">
                    <div className="h-2 w-full rounded-full bg-emerald-300" />
                  </div>
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
        </>
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

      <div className={`fixed bottom-6 z-[130] max-w-[calc(100vw-32px)] space-y-3 transition-all ${importQueueOpen ? 'right-[386px]' : exportsPanelOpen ? 'right-[356px]' : 'right-6'}`}>
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={(toastId) => setToasts((current) => current.filter((item) => item.id !== toastId))} />
        ))}
      </div>
    </div>
  );
};

export default GruposComunidades;

