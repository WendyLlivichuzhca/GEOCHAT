import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Building2,
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
  Megaphone,
  MoreHorizontal,
  Pause,
  Phone,
  RefreshCw,
  RotateCcw,
  Search,
  ShieldCheck,
  Trash2,
  TrendingUp,
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
  const [rowMenuPos, setRowMenuPos] = useState({ top: 0, left: 0 });
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

  const tabCounts = useMemo(() => {
    return {
      todos: items.length,
      grupo: items.filter(i => (i.tipo || 'grupo') === 'grupo').length,
      comunidad: items.filter(i => i.tipo === 'comunidad').length,
      canal: items.filter(i => i.tipo === 'canal').length,
    };
  }, [items]);


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
    if (sortConfig.key !== key) return <span className="ml-1 inline-block text-slate-300 font-normal">↕</span>;
    return sortConfig.direction === 'ascending' ? (
      <span className="ml-1 inline-block text-emerald-600 font-bold">↑</span>
    ) : (
      <span className="ml-1 inline-block text-emerald-600 font-bold">↓</span>
    );
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
    <div className="flex h-screen bg-transparent font-sans selection:bg-emerald-100/50 overflow-hidden">
      <Sidebar user={user} onLogout={onLogout} />

      <main className="ml-[21rem] mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto">
          <div className="px-8 pt-8 pb-8">
            <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-slate-900">Grupos, Comunidades y Canales</h1>
                <p className="text-xs text-slate-400 font-medium mt-1">Administra y gestiona tus grupos de WhatsApp, comunidades y canales integrados.</p>
              </div>

              <button
                type="button"
                onClick={openImportFlow}
                className="bg-emerald-500 hover:bg-emerald-600 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 active:scale-95 shadow-md shadow-emerald-100 cursor-pointer"
              >
                <Upload size={16} />
                Importar
              </button>
            </div>

            {/* 4 Tarjetas de resumen métrico */}
            <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {/* Card 1: Grupos */}
              <div className="flex items-center justify-between min-h-[110px] rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.06)] transition-all">
                <div className="flex items-center gap-4.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100/80 shadow-2xs">
                    <Users size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Grupos</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1.5">{tabCounts.grupo}</h3>
                    <p className="text-[11px] font-bold text-emerald-600 mt-1.5">
                      {tabCounts.todos ? Math.round((tabCounts.grupo / tabCounts.todos) * 100) : 0}% del total
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-emerald-500 opacity-80 pl-2">
                  <svg className="w-16 h-10" viewBox="0 0 60 30" fill="none">
                    <path d="M2 22 Q 15 10, 30 18 T 58 6" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>

              {/* Card 2: Comunidades */}
              <div className="flex items-center justify-between min-h-[110px] rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.06)] transition-all">
                <div className="flex items-center gap-4.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100/80 shadow-2xs">
                    <Building2 size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Comunidades</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1.5">{tabCounts.comunidad}</h3>
                    <p className="text-[11px] font-bold text-blue-600 mt-1.5">
                      {tabCounts.todos ? Math.round((tabCounts.comunidad / tabCounts.todos) * 100) : 0}% del total
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-blue-400 opacity-60 pl-2">
                  <div className="w-16 h-0.5 rounded-full bg-blue-200" />
                </div>
              </div>

              {/* Card 3: Canales */}
              <div className="flex items-center justify-between min-h-[110px] rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.06)] transition-all">
                <div className="flex items-center gap-4.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 border border-purple-100/80 shadow-2xs">
                    <Megaphone size={24} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Canales</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1.5">{tabCounts.canal}</h3>
                    <p className="text-[11px] font-bold text-purple-600 mt-1.5">
                      {tabCounts.todos ? Math.round((tabCounts.canal / tabCounts.todos) * 100) : 0}% del total
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-purple-400 opacity-60 pl-2">
                  <div className="w-16 h-0.5 rounded-full bg-purple-200" />
                </div>
              </div>

              {/* Card 4: Sincronizados */}
              <div className="flex items-center justify-between min-h-[110px] rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_4px_20px_rgba(15,23,42,0.03)] hover:shadow-[0_8px_25px_rgba(15,23,42,0.06)] transition-all">
                <div className="flex items-center gap-4.5">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 border border-amber-100/80 shadow-2xs">
                    <RefreshCw size={22} className={pendingSync.length > 0 ? 'animate-spin' : ''} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Sincronizados</p>
                    <h3 className="text-3xl font-black text-slate-900 tracking-tight leading-none mt-1.5">
                      {tabCounts.todos ? Math.round(((tabCounts.todos - pendingSync.length) / tabCounts.todos) * 100) : 100}%
                    </h3>
                    <p className="text-[11px] font-bold text-slate-500 mt-1.5">
                      {pendingSync.length === 0 ? 'Todos al día' : `${pendingSync.length} pendientes`}
                    </p>
                  </div>
                </div>
                <div className="shrink-0 text-emerald-500 opacity-80 pl-2">
                  <svg className="w-16 h-10" viewBox="0 0 60 30" fill="none">
                    <path d="M2 24 Q 20 8, 38 18 T 58 4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Banner de Estado del Sistema */}
            <div className="mb-7 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-2xl border border-emerald-200/80 bg-emerald-50/40 px-5 py-3.5 shadow-2xs">
              <div className="flex items-center gap-3">
                <ShieldCheck size={20} className="text-emerald-600 shrink-0" />
                <p className="text-xs font-bold text-slate-800">
                  Estado del sistema: <span className="text-emerald-700 font-extrabold">Todos los grupos están sincronizados correctamente.</span>
                </p>
              </div>
              <div className="flex items-center gap-4 text-xs font-semibold text-slate-600">
                <span>Última sincronización: <span className="text-emerald-600 font-bold">● Hace 12 minutos</span></span>
                <button
                  type="button"
                  onClick={handleSyncAll}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 transition shadow-2xs cursor-pointer"
                >
                  <RotateCcw size={13} /> Ver historial
                </button>
              </div>
            </div>

            {/* Tabs de tipo de grupo (Todos, Grupos, Comunidades, Canales) estilo pastillas */}
            <div className="flex items-center gap-3 mb-7">
              {[
                { value: 'todos', label: 'Todos', count: tabCounts.todos, icon: null },
                { value: 'grupo', label: 'Grupos', count: tabCounts.grupo, icon: <Users size={14} /> },
                { value: 'comunidad', label: 'Comunidades', count: tabCounts.comunidad, icon: <Building2 size={14} /> },
                { value: 'canal', label: 'Canales', count: tabCounts.canal, icon: <Megaphone size={14} /> },
              ].map((tab) => {
                const isActive = filterValues.tipo === tab.value;
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setFilterValues((prev) => ({ ...prev, tipo: tab.value }))}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-100'
                        : 'bg-slate-100/80 text-slate-600 hover:bg-slate-200/80 hover:text-slate-900'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                        isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {tab.count}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="mb-7 flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="relative w-full max-w-[430px]">
                <Search size={18} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Buscar por nombre, palabra clave o enlace..."
                  className="h-11 w-full rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
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
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
                  >
                    <Columns size={16} />
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
                    className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 shadow-2xs transition hover:bg-slate-50 cursor-pointer"
                  >
                    <Filter size={16} />
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

            <section className="bg-white rounded-2xl border border-slate-200/80 overflow-hidden shadow-2xs">
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full min-w-[1200px] border-collapse text-left">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="px-4 py-3.5 w-10">
                        <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20" />
                      </th>
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('nombre')}>
                        <div className="flex items-center gap-1.5">
                          <span>Nombre</span>
                          {renderSortIndicator('nombre')}
                        </div>
                      </th>
                      {visibleColumns.origen && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('origen')}>
                          <div className="flex items-center gap-1.5">
                            <span>Origen</span>
                            {renderSortIndicator('origen')}
                          </div>
                        </th>
                      )}
                      {visibleColumns.clicks && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('clicks')}>
                          <div className="flex items-center gap-1.5">
                            <span>Clicks</span>
                            {renderSortIndicator('clicks')}
                          </div>
                        </th>
                      )}
                      {visibleColumns.admins && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('admins')}>
                          <div className="flex items-center gap-1.5">
                            <span>Admins</span>
                            {renderSortIndicator('admins')}
                          </div>
                        </th>
                      )}
                      {visibleColumns.participantes && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('participantes')}>
                          <div className="flex items-center gap-1.5">
                            <span>Participantes</span>
                            {renderSortIndicator('participantes')}
                          </div>
                        </th>
                      )}
                      {visibleColumns.mensajesProgramados && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('mensajesProgramados')}>
                          <div className="flex items-center gap-1.5">
                            <span>Msg. Programados</span>
                            {renderSortIndicator('mensajesProgramados')}
                          </div>
                        </th>
                      )}
                      {visibleColumns.tipo && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('tipo')}>
                          <div className="flex items-center gap-1.5">
                            <span>Tipo</span>
                            {renderSortIndicator('tipo')}
                          </div>
                        </th>
                      )}
                      {visibleColumns.capacidad && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('lleno')}>
                          <div className="flex items-center gap-1.5">
                            <span>Capacidad</span>
                            {renderSortIndicator('lleno')}
                          </div>
                        </th>
                      )}
                      {visibleColumns.creadoEn && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('creadoEn')}>
                          <div className="flex items-center gap-1.5">
                            <span>Creado</span>
                            {renderSortIndicator('creadoEn')}
                          </div>
                        </th>
                      )}
                      {visibleColumns.actualizadoEn && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('actualizadoEn')}>
                          <div className="flex items-center gap-1.5">
                            <span>Actualización</span>
                            {renderSortIndicator('actualizadoEn')}
                          </div>
                        </th>
                      )}
                      {visibleColumns.ultimaSincronizacion && (
                        <th className="px-4 py-3.5 text-xs font-bold text-slate-800 cursor-pointer select-none hover:text-emerald-600 transition" onClick={() => requestSort('ultimaSincronizacion')}>
                          <div className="flex items-center gap-1.5">
                            <span>Última Sincronización</span>
                            {renderSortIndicator('ultimaSincronizacion')}
                          </div>
                        </th>
                      )}
                      <th className="px-4 py-3.5 text-xs font-bold text-slate-800 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {!loading && visibleItems.length === 0 && (
                      <tr>
                        <td colSpan={2 + Object.values(visibleColumns).filter(Boolean).length} className="py-16 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-3 text-slate-400">
                            <Users size={24} />
                          </div>
                          <p className="text-slate-800 font-bold text-sm">No se encontraron grupos</p>
                          <p className="text-slate-400 text-xs mt-0.5 font-medium">Intenta ajustar los filtros o importa nuevos grupos</p>
                        </td>
                      </tr>
                    )}

                    {visibleItems.map((item) => (
                      <tr key={item.id} className="group hover:bg-slate-50/70 transition-colors">
                        <td className="px-5 py-4">
                          <input type="checkbox" className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500/20" />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <span className={`w-2 h-2 rounded-full shrink-0 ${item.hasPendingSync ? 'bg-amber-500' : 'bg-emerald-500'}`} />
                            <div className="w-7 h-7 rounded-full bg-emerald-100/80 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {(item.nombre || 'G').charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <button type="button" onClick={() => openDetail(item)} className="font-bold text-slate-900 text-xs leading-snug hover:text-emerald-600 transition-colors text-left cursor-pointer block">
                                {item.nombre}
                              </button>
                              <p className="text-[11px] text-slate-400 font-medium">Link principal</p>
                            </div>
                          </div>
                        </td>

                        {visibleColumns.origen && (
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-slate-700">
                              <Download size={12} className="text-slate-400" />
                              {item.origen}
                            </span>
                          </td>
                        )}

                        {visibleColumns.clicks && (
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 border border-emerald-200/60 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                              <TrendingUp size={12} />
                              {item.clicks || 0}
                            </span>
                          </td>
                        )}

                        {visibleColumns.admins && (
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => openDetail(item)}
                              className="inline-flex items-center gap-1 rounded-full bg-slate-100 hover:bg-slate-200 px-2.5 py-0.5 text-xs font-bold text-slate-700 transition cursor-pointer"
                            >
                              <Phone size={12} className="text-slate-500" />
                              <span>{item.admins} admins</span>
                            </button>
                          </td>
                        )}

                        {visibleColumns.participantes && (
                          <td className="px-5 py-4">
                            <button
                              type="button"
                              onClick={() => openParticipantsModal(item)}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-800 hover:text-emerald-600 transition cursor-pointer"
                            >
                              <Users size={13} className="text-slate-400" />
                              {item.participantes}
                            </button>
                          </td>
                        )}

                        {visibleColumns.mensajesProgramados && (
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 text-xs font-medium text-slate-600">
                              <AlertCircle size={13} className="text-slate-400" />
                              {item.mensajesProgramados}
                            </span>
                          </td>
                        )}

                        {visibleColumns.tipo && (
                          <td className="px-5 py-4">
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                              {item.tipoLabel}
                            </span>
                          </td>
                        )}

                        {visibleColumns.capacidad && (
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => toggleCapacity(item, !item.lleno)}
                                className={`relative h-5 w-9 rounded-full transition ${item.lleno ? 'bg-amber-500' : 'bg-slate-200'}`}
                              >
                                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${item.lleno ? 'left-4.5' : 'left-0.5'}`} />
                              </button>
                              {item.lleno ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                  Lleno
                                </span>
                              ) : (
                                <span className="text-xs text-slate-400 font-medium">Disponible</span>
                              )}
                            </div>
                          </td>
                        )}

                        {visibleColumns.creadoEn && <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">{formatDateTime(item.creadoEn)}</td>}
                        {visibleColumns.actualizadoEn && <td className="px-4 py-3.5 text-xs text-slate-600 font-medium">{formatDateTime(item.actualizadoEn)}</td>}
                        {visibleColumns.ultimaSincronizacion && (
                          <td className="px-4 py-3.5 text-xs italic text-slate-400 font-medium">
                            {item.ultimaSincronizacion === 'Nunca sincronizado' ? 'Nunca sincronizado' : formatDateTime(item.ultimaSincronizacion)}
                          </td>
                        )}

                        <td className="relative px-4 py-3.5 text-right" ref={rowMenuId === item.id ? rowMenuRef : null}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openDetail(item)}
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                              title="Ver detalle"
                            >
                              <Eye size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={() => syncGroup(item)}
                              className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                              title="Sincronizar"
                            >
                              <RefreshCw size={13} />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (rowMenuId === item.id) {
                                  setRowMenuId(null);
                                } else {
                                  const rect = e.currentTarget.getBoundingClientRect();
                                  setRowMenuPos({
                                    top: rect.bottom + 6,
                                    left: rect.right - 220,
                                  });
                                  setRowMenuId(item.id);
                                }
                              }}
                              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
                              title="Más opciones"
                            >
                              <MoreHorizontal size={13} />
                            </button>
                          </div>

                          {rowMenuId === item.id && (
                            <div
                              style={{
                                position: 'fixed',
                                top: `${rowMenuPos.top}px`,
                                left: `${Math.max(10, rowMenuPos.left)}px`,
                                zIndex: 9999,
                              }}
                              ref={rowMenuRef}
                            >
                              <PopupCard className="w-[220px] overflow-hidden py-1.5 shadow-2xl">
                                <button onClick={() => { setRowMenuId(null); openDetail(item); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                                  <Eye size={14} className="text-slate-400" /> Ver detalle
                                </button>
                                <button onClick={() => { setRowMenuId(null); syncGroup(item); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                                  <RefreshCw size={14} className="text-slate-400" /> Sincronizar
                                </button>
                                <button onClick={() => { setRowMenuId(null); updateInviteLink(item); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                                  <LinkIcon size={14} className="text-slate-400" /> Actualizar link
                                </button>
                                <button onClick={() => { setRowMenuId(null); setExportChoice({ open: true, group: item }); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-50">
                                  <Download size={14} className="text-slate-400" /> Exportar participantes
                                </button>
                                <button onClick={() => { setRowMenuId(null); deleteGroup(item); }} className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-xs font-semibold text-red-600 transition hover:bg-red-50">
                                  <Trash2 size={14} className="text-red-500" /> Eliminar
                                </button>
                              </PopupCard>
                            </div>
                          )}

                        </td>
                      </tr>
                    ))}
                    {loading && (
                      <tr>
                        <td colSpan={2 + Object.values(visibleColumns).filter(Boolean).length} className="px-6 py-12 text-center text-slate-500">
                          <span className="inline-flex items-center gap-2 text-xs font-bold">
                            <Loader2 size={16} className="animate-spin text-emerald-600" />
                            Cargando grupos...
                          </span>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* FOOTER PAGINATION MATCHING WHALINK DESIGN */}
              <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-white text-xs">
                <div className="text-slate-400 font-medium">
                  Mostrando <span className="text-slate-800 font-bold">{sortedItems.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</span> a{' '}
                  <span className="text-slate-800 font-bold">{Math.min(currentPage * pageSize, sortedItems.length)}</span> de{' '}
                  <span className="text-slate-800 font-bold">{sortedItems.length}</span> registros
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={currentPage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="w-7 h-7 rounded-full bg-emerald-500 text-white font-bold flex items-center justify-center text-xs shadow-xs">
                    {currentPage}
                  </span>
                  <button
                    type="button"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
                    className="px-3 py-1.5 rounded-lg border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition disabled:opacity-40 cursor-pointer"
                  >
                    Siguiente
                  </button>
                </div>
              </div>
            </section>

            {/* 3 Tarjetas Inferiores: Actividad reciente, Estado de sincronización, Resumen rápido */}
            <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              {/* Card 1: Actividad reciente */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
                <div>
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <Activity size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Actividad reciente</h3>
                  </div>

                  <div className="space-y-3.5">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-semibold text-slate-700"><span className="font-bold text-slate-900">GRUPO TRABAJO</span> sincronizado correctamente</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">Hace 10 min</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-semibold text-slate-700"><span className="font-bold text-slate-900">Lanzamiento Masterclass</span> sincronizado correctamente</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">Hace 2 horas</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                        <span className="font-semibold text-slate-700"><span className="font-bold text-slate-900">Curso de Inteligencia Artificial 2026</span> sincronizado</span>
                      </div>
                      <span className="text-[11px] font-medium text-slate-400 shrink-0 ml-2">Hace 4 horas</span>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => pushToast('Mostrando todas las actividades', 'info')}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                >
                  Ver todas las actividades <ArrowRight size={14} />
                </button>
              </div>

              {/* Card 2: Estado de sincronización */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
                <div>
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                      <ShieldCheck size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Estado de sincronización</h3>
                  </div>

                  <div className="flex items-center gap-5 my-2">
                    {/* Gauge donut SVG */}
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center">
                      <svg className="h-full w-full -rotate-90 transform" viewBox="0 0 36 36">
                        <path
                          className="text-slate-100"
                          strokeWidth="3.5"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                        <path
                          className="text-emerald-500"
                          strokeDasharray="100, 100"
                          strokeWidth="3.5"
                          strokeLinecap="round"
                          stroke="currentColor"
                          fill="none"
                          d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                        />
                      </svg>
                      <span className="absolute text-base font-black text-slate-900">100%</span>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-slate-900">Todo funcionando correctamente</h4>
                      <p className="mt-1 text-[11px] font-medium text-slate-500 leading-relaxed">
                        Todos los grupos, comunidades y canales están sincronizados y al día.
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => pushToast('Historial de sincronización actualizado', 'info')}
                  className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition cursor-pointer"
                >
                  Ver historial de sincronización <ArrowRight size={14} />
                </button>
              </div>

              {/* Card 3: Resumen rápido */}
              <div className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-2xs">
                <div>
                  <div className="mb-4 flex items-center gap-2.5">
                    <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
                      <Clock3 size={18} />
                    </div>
                    <h3 className="text-sm font-bold text-slate-900">Resumen rápido</h3>
                  </div>

                  <div className="space-y-3 text-xs font-semibold text-slate-700">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Users size={15} />
                        <span>Grupos</span>
                      </div>
                      <span className="font-bold text-slate-900">{tabCounts.grupo}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Users size={15} />
                        <span>Participantes totales</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {items.reduce((acc, curr) => acc + (curr.participantes_count || curr.miembros || 0), 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <Clock3 size={15} />
                        <span>Mensajes programados</span>
                      </div>
                      <span className="font-bold text-slate-900">0</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-slate-500">
                        <RefreshCw size={15} />
                        <span>Sincronizados</span>
                      </div>
                      <span className="font-bold text-slate-900">
                        {tabCounts.todos ? Math.round(((tabCounts.todos - pendingSync.length) / tabCounts.todos) * 100) : 100}%
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
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

        <div className="fixed inset-0 z-[100] flex items-center justify-center lg:pl-[21rem] bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-150">
          <PopupCard className="w-full max-w-[500px] p-6 rounded-2xl border border-slate-200/80 bg-white shadow-2xl">
            {importStep === 'device' ? (
              <>
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">Seleccionar número</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">Selecciona el número de WhatsApp para importar grupos</p>
                  </div>
                  <button onClick={() => setImportStep(null)} className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-4">
                  <p className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-wider">Tipo</p>
                  <div className="flex flex-wrap gap-2.5">
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
                        className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition cursor-pointer ${importType === option.value
                            ? 'border-emerald-500 bg-emerald-50/80 text-emerald-800 ring-1 ring-emerald-500/30'
                            : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                          }`}
                      >
                        <span className={`h-3.5 w-3.5 rounded-full border ${importType === option.value ? 'border-emerald-600 bg-emerald-600' : 'border-slate-300'}`} />
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative mb-4">
                  <Search size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={importSearch}
                    onChange={(event) => setImportSearch(event.target.value)}
                    placeholder="Buscar por nombre o número..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs font-medium text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div className="max-h-[340px] space-y-2.5 overflow-y-auto pr-1 custom-scrollbar">
                  {importLoading ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-600" />
                      <p className="mt-4 text-xs text-slate-500 font-bold">Cargando números y chats desde WhatsApp...</p>
                    </div>
                  ) : (
                    <>
                      {importOptions.devices.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs font-medium text-slate-500">
                          No hay números de WhatsApp conectados para importar.
                        </div>
                      )}
                      {importOptions.devices.length > 0 && filteredImportDevices.length === 0 && (
                        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-xs font-medium text-slate-500">
                          No se encontraron números para esta búsqueda.
                        </div>
                      )}
                      {filteredImportDevices.map((device) => {
                        const isSelected = Number(selectedDeviceId) === Number(device.id);
                        return (
                          <button
                            key={device.id}
                            type="button"
                            onClick={() => {
                              setSelectedDeviceId(device.id);
                              setSelectedSourceGroups([]);
                            }}
                            className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition cursor-pointer ${isSelected
                                ? 'border-emerald-500 bg-emerald-50/40 ring-1 ring-emerald-500/30'
                                : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                              }`}
                          >
                            <div className="flex min-w-0 items-center gap-3">
                              <span className={`h-4 w-4 rounded-full border flex items-center justify-center ${isSelected ? 'border-emerald-600 bg-emerald-600 text-white' : 'border-slate-300 bg-white'}`}>
                                {isSelected && <Check size={10} />}
                              </span>
                              <DeviceAvatar device={device} />
                              <div className="min-w-0">
                                <p className="truncate text-xs font-bold text-slate-900">{device.nombre}</p>
                                <p className="text-[11px] font-medium text-slate-400">{device.numero_telefono || 'Sin número'}</p>
                              </div>
                            </div>
                            <span className={`ml-3 shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold ${(device.estado || '').toLowerCase() === 'conectado'
                                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                                : 'border-slate-200 bg-slate-100 text-slate-500'
                              }`}>
                              {(device.estado || '').toLowerCase() === 'conectado' ? 'Conectado' : 'Desconectado'}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  )}
                </div>

                <button
                  type="button"
                  onClick={continueToGroupSelection}
                  disabled={!selectedDeviceId || importLoading}
                  className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-md shadow-emerald-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
                >
                  Continuar
                  <ChevronRight size={16} />
                </button>
              </>
            ) : (

              <>
                <div className="mb-5 flex items-start justify-between">
                  <div>
                    <h3 className="text-xl font-black tracking-tight text-slate-900">Seleccionar {importTypePluralLabel}</h3>
                    <p className="mt-1 text-xs font-medium text-slate-400">Selecciona {importType === 'comunidad' ? 'las comunidades' : importType === 'canal' ? 'los canales' : 'los grupos'} que deseas importar</p>
                  </div>
                  <button onClick={() => setImportStep(null)} className="rounded-xl p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer">
                    <X size={18} />
                  </button>
                </div>

                <div className="mb-4 rounded-2xl border border-slate-200 bg-white p-3.5 shadow-2xs">
                  <p className="mb-2 text-xs font-bold text-slate-700 uppercase tracking-wider">Seleccionar {importTypePluralLabel}</p>
                  <div className="max-h-[300px] min-h-[140px] overflow-y-auto pr-1 custom-scrollbar">
                    <div className="flex flex-wrap gap-1.5">
                      {selectedImportGroups.map((group) => (
                        <span key={group.id} className="inline-flex max-w-full items-center gap-1.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200/80 px-2.5 py-1 text-xs font-bold shadow-2xs">
                          <span className="max-w-[200px] truncate">{group.nombre}</span>
                          <button type="button" onClick={() => setSelectedSourceGroups((current) => current.filter((id) => id !== group.id))} className="text-emerald-500 hover:text-emerald-700 transition cursor-pointer">
                            <X size={12} />
                          </button>
                        </span>
                      ))}
                      {selectedImportGroups.length === 0 && (
                        <span className="px-1 py-2 text-xs font-medium text-slate-400">No hay {importTypePluralLabel} seleccionados</span>
                      )}
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                    {selectedSourceGroups.length > 0 && (
                      <button type="button" onClick={() => setSelectedSourceGroups([])} title="Limpiar selección" className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                        <X size={14} />
                      </button>
                    )}
                    <button type="button" onClick={() => setImportGroupPickerOpen((current) => !current)} className="rounded-lg p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer">
                      <ChevronDown size={16} className={`transition-transform ${importGroupPickerOpen ? 'rotate-180' : ''}`} />
                    </button>
                  </div>

                  {importGroupPickerOpen && (
                    <div className="mt-2 max-h-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 shadow-xl custom-scrollbar">
                      <button
                        type="button"
                        onClick={toggleVisibleImportSelection}
                        disabled={visibleSelectableImportGroups.length === 0}
                        className="mb-2 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-100 transition disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
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
                            className={`mb-1 flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-xs font-bold transition cursor-pointer ${selected
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : disabled
                                  ? 'opacity-50 cursor-not-allowed bg-slate-50 text-slate-400'
                                  : 'text-slate-700 hover:bg-slate-50'
                              }`}
                          >
                            <span className="truncate">
                              {group.nombre} {disabled && <span className="text-[10px] text-amber-600 font-bold ml-1">(Requiere admin)</span>}
                            </span>
                            {selected ? <Check size={14} className="text-emerald-600 shrink-0" /> : null}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                <p className="text-xs font-semibold text-slate-500 mb-4">{selectedImportGroups.length} {importTypePluralLabel} seleccionados</p>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setImportStep('device')}
                    className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <ArrowLeft size={16} />
                    Volver
                  </button>
                  <button
                    type="button"
                    onClick={handleImportProgress}
                    disabled={selectedImportGroups.length === 0}
                    className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold transition shadow-md shadow-emerald-100 disabled:bg-slate-200 disabled:text-slate-400 disabled:shadow-none disabled:cursor-not-allowed cursor-pointer"
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
        <div className="fixed bottom-6 right-6 z-[95] flex w-[400px] max-w-[calc(100vw-32px)] flex-col overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-[0_20px_60px_rgba(15,23,42,0.18)] animate-in fade-in slide-in-from-bottom-4 duration-200">
          <div className="border-b border-slate-100 p-5 bg-white">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Upload size={18} />
                </div>
                <div>
                  <h4 className="text-sm font-black tracking-tight text-slate-900">Importando {importTypePluralLabel}</h4>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5 inline-flex items-center gap-1">
                    <Clock3 size={12} className="text-slate-400" />
                    {importQueueRunning && !importQueuePaused
                      ? `Siguiente en ${importQueueCountdown}s`
                      : importQueuePaused
                        ? 'Importación pausada'
                        : 'Importación finalizada'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setImportQueueOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4">
              <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                <span className="text-slate-500">
                  {importQueue.filter((item) => ['Exitoso', 'Error', 'Cancelado'].includes(item.status)).length} de {importQueue.length}
                </span>
                <span className="text-slate-900">
                  {importQueue.length
                    ? Math.round(
                      (importQueue.filter((item) => ['Exitoso', 'Error', 'Cancelado'].includes(item.status)).length / importQueue.length) * 100
                    )
                    : 0}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                <div
                  className="h-2 rounded-full bg-emerald-500 transition-all duration-300"
                  style={{
                    width: `${importQueue.length
                        ? (importQueue.filter((item) => ['Exitoso', 'Error', 'Cancelado'].includes(item.status)).length / importQueue.length) * 100
                        : 0
                      }%`,
                  }}
                />
              </div>
              <div className="mt-3 flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 text-[11px] font-bold">
                  {importQueue.filter((item) => item.status === 'Exitoso').length} exitosos
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200/80 px-2.5 py-0.5 text-[11px] font-bold">
                  {importQueue.filter((item) => item.status === 'Error').length} errores
                </span>
              </div>
            </div>
          </div>

          <div className="max-h-[260px] overflow-y-auto p-3 space-y-2 bg-slate-50/50 custom-scrollbar">
            {importQueue.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-slate-200/80 bg-white p-3 shadow-2xs">
                <div className="flex items-start gap-3">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-bold text-slate-600 mt-0.5">
                    {entry.order}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-bold text-slate-900">{entry.name}</p>
                    <p className={`text-[11px] font-bold mt-0.5 ${entry.status === 'Error'
                        ? 'text-rose-600'
                        : entry.status === 'Exitoso'
                          ? 'text-emerald-600'
                          : entry.status === 'Cancelado'
                            ? 'text-amber-600'
                            : 'text-slate-400'
                      }`}>
                      {entry.status}
                    </p>
                    {entry.message ? <p className="mt-1 text-[11px] font-medium text-slate-500 leading-tight">{entry.message}</p> : null}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-100 bg-white p-3 flex gap-2">
            {importQueueRunning && (
              <button
                type="button"
                onClick={() => {
                  const nextPaused = !importQueuePaused;
                  setImportQueuePaused(nextPaused);
                  importQueuePauseRef.current = nextPaused;
                }}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                <Pause size={14} />
                {importQueuePaused ? 'Reanudar' : 'Pausar'}
              </button>
            )}
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
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 transition cursor-pointer"
            >
              {importQueueRunning ? 'Cancelar' : 'Cerrar'}
            </button>
          </div>
        </div>
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

