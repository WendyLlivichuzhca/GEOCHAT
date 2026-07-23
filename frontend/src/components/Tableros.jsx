import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    Layout, MoreVertical, Plus, User as UserIcon, Calendar,
    MessageSquare, Trash2, X, AlertCircle, FileText, ChevronDown,
    Bell, RefreshCw, BarChart3, Search, Filter, MessageCircle,
    ArrowRight, MoveRight, CheckCircle2, SortAsc, SortDesc, List, Grid3X3
} from 'lucide-react';
import Sidebar from './Sidebar';
import { SkeletonKanbanCard } from './Skeleton';

const API_URL = import.meta.env.VITE_API_URL || '';

// --- COMPONENTES AUXILIARES ---

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
                    <h3 className="font-black text-slate-800 text-lg">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const Tableros = ({ user, onLogout }) => {
    const [tableros, setTableros] = useState([]);
    const [tableroActivo, setTableroActivo] = useState(null);
    const [columnas, setColumnas] = useState([]);
    const [allTags, setAllTags] = useState([]);

    // UI States
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [editBoardName, setEditBoardName] = useState('');
    const [error, setError] = useState(null);
    const [openTagMenu, setOpenTagMenu] = useState(null);

    // Dynamic Stages States
    const [showAddStageModal, setShowAddStageModal] = useState(false);
    const [showEditStageModal, setShowEditStageModal] = useState(false);
    const [showDeleteStageModal, setShowDeleteStageModal] = useState(false);
    const [openStageOptions, setOpenStageOptions] = useState(null);
    const [newStageData, setNewStageData] = useState({ nombre: '', tag_id: null });
    const [editStageData, setEditStageData] = useState({ id: null, nombre: '', tag_id: null });
    const [stageToDelete, setStageToDelete] = useState(null);

    // Search, Sort, Layout
    const [searchQuery, setSearchQuery] = useState('');
    const [sortOrder, setSortOrder] = useState('asc'); // 'asc' | 'desc'
    const [showSortMenu, setShowSortMenu] = useState(false);
    const [layoutMode, setLayoutMode] = useState('kanban'); // 'kanban' | 'list'
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [filterTagId, setFilterTagId] = useState(null);

    // Add Contact to Stage Modal
    const [showAddContactModal, setShowAddContactModal] = useState(false);
    const [addContactTargetStage, setAddContactTargetStage] = useState(null);
    const [contactSearchQuery, setContactSearchQuery] = useState('');
    const [contactSearchResults, setContactSearchResults] = useState([]);
    const [loadingContacts, setLoadingContacts] = useState(false);
    const [addingContact, setAddingContact] = useState(false);

    // Card context menu
    const [openCardMenu, setOpenCardMenu] = useState(null);
    const [cardMenuStageId, setCardMenuStageId] = useState(null);
    const [cardMenuPos, setCardMenuPos] = useState({ top: 0, right: 0 });

    // Fixed-position menus (to avoid overflow:hidden clipping)
    const [tabOptionsPos, setTabOptionsPos] = useState({ top: 0, left: 0 });
    const [stageOptionsPos, setStageOptionsPos] = useState({ top: 0, right: 0 });
    const [tagMenuPos, setTagMenuPos] = useState({ top: 0, left: 0 });
    const [filterMenuPos, setFilterMenuPos] = useState({ top: 0, right: 0 });
    const [sortMenuPos, setSortMenuPos] = useState({ top: 0, right: 0 });

    const searchDebounceRef = useRef(null);

    const getAuthToken = () => {
        const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
        const token = savedUser?.token || localStorage.getItem('geochat_token');
        return token;
    };

    const getUserId = () => {
        const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
        return savedUser?.id || savedUser?.user_id || user?.id;
    };

    // Buscar contactos para el modal de agregar
    const fetchContactsForSearch = useCallback(async (query) => {
        if (!query || query.length < 1) { setContactSearchResults([]); return; }
        setLoadingContacts(true);
        try {
            const uid = getUserId();
            const res = await fetch(`${API_URL}/api/contacts/${uid}?q=${encodeURIComponent(query)}&limit=20`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const data = await res.json();
            if (data.success) setContactSearchResults(data.contacts || []);
        } catch (err) { console.error('Error buscando contactos:', err); }
        finally { setLoadingContacts(false); }
    }, []);

    // Manejar el input de búsqueda con debounce
    const handleContactSearchChange = (e) => {
        const q = e.target.value;
        setContactSearchQuery(q);
        if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(() => fetchContactsForSearch(q), 300);
    };

    // Agregar contacto a etapa (asigna la etapa_id al contacto)
    const handleAddContactToStage = async (contactId) => {
        if (!addContactTargetStage) return;
        setAddingContact(true);
        try {
            const res = await fetch(`${API_URL}/api/kanban/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify({ contactId, targetStageId: addContactTargetStage.id })
            });
            const data = await res.json();
            if (data.success) {
                setShowAddContactModal(false);
                setContactSearchQuery('');
                setContactSearchResults([]);
                setAddContactTargetStage(null);
                loadKanbanData(tableroActivo);
            } else {
                alert('No se pudo agregar el contacto.');
            }
        } catch (err) { console.error(err); alert('Error de conexión.'); }
        finally { setAddingContact(false); }
    };

    // Quitar contacto de etapa
    const handleRemoveContactFromStage = async (contactId) => {
        try {
            const res = await fetch(`${API_URL}/api/kanban/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify({ contactId, targetStageId: null })
            });
            const data = await res.json();
            if (data.success) {
                setOpenCardMenu(null);
                loadKanbanData(tableroActivo);
            }
        } catch (err) { console.error(err); }
    };

    // Cerrar todos los menus al hacer click fuera
    useEffect(() => {
        const handler = () => {
            setOpenStageOptions(null);
            setOpenTagMenu(null);
            setShowOptions(false);
            setShowSortMenu(false);
            setShowFilterMenu(false);
            setOpenCardMenu(null);
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);


    const fetchTags = async () => {
        try {
            const response = await fetch(`${API_URL}/api/tags`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const res = await response.json();
            if (res.success) setAllTags(res.tags);
        } catch (err) { console.error("Error fetching tags:", err); }
    };

    const fetchTableros = async () => {
        try {
            const response = await fetch(`${API_URL}/api/kanban/tableros`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const res = await response.json();
            if (res.success) {
                setTableros(res.tableros);
                if (res.tableros.length > 0 && !tableroActivo) {
                    setTableroActivo(res.tableros[0].id);
                }
            }
        } catch (err) { console.error(err); }
    };

    const loadKanbanData = async (tid) => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/kanban?tablero_id=${tid}`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const res = await response.json();
            if (res.success) {
                setColumnas(res.columns || []);
                if (res.no_tableros) setTableros([]);
            }
        } catch (err) { setError("Error al cargar datos"); }
        finally { setLoading(false); }
    };

    useEffect(() => {
        fetchTableros();
        fetchTags();
    }, []);

    useEffect(() => {
        if (tableroActivo) loadKanbanData(tableroActivo);
        else if (tableros.length === 0) setLoading(false);
    }, [tableroActivo]);

    // HANDLERS TABLEROS
    const handleCreateBoard = async (e) => {
        e.preventDefault();
        if (!newBoardName.trim()) return;
        try {
            const response = await fetch(`${API_URL}/api/kanban/tableros`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify({ nombre: newBoardName })
            });
            const res = await response.json();
            if (res.success) {
                setNewBoardName('');
                setShowCreateModal(false);
                setTableroActivo(res.tablero_id);
                fetchTableros();
            }
        } catch (err) { alert("Error al crear"); }
    };

    const handleEditBoard = async (e) => {
        e.preventDefault();
        if (!editBoardName.trim() || !tableroActivo) return;
        try {
            const response = await fetch(`${API_URL}/api/kanban/tableros/${tableroActivo}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify({ nombre: editBoardName })
            });
            const res = await response.json();
            if (res.success) {
                setShowEditModal(false);
                fetchTableros();
            }
        } catch (err) { alert("Error al editar"); }
    };

    const handleDeleteBoard = async () => {
        if (!tableroActivo) return;
        try {
            const response = await fetch(`${API_URL}/api/kanban/tableros/${tableroActivo}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const res = await response.json();
            if (res.success) {
                setShowDeleteModal(false);
                setTableroActivo(null);
                fetchTableros();
            }
        } catch (err) { alert("Error al eliminar"); }
    };

    // HANDLERS ETAPAS (COLUMNAS)
    const handleAddStage = async (e) => {
        e.preventDefault();
        if (!newStageData.nombre.trim() || !tableroActivo) return;
        try {
            const response = await fetch(`${API_URL}/api/kanban/etapas`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify({ tablero_id: tableroActivo, ...newStageData })
            });
            const res = await response.json();
            if (res.success) {
                setShowAddStageModal(false);
                setNewStageData({ nombre: '', tag_id: null });
                loadKanbanData(tableroActivo);
            }
        } catch (err) { alert("Error al añadir etapa"); }
    };

    const handleEditStage = async (e) => {
        e.preventDefault();
        if (!editStageData.nombre.trim()) return;
        try {
            const response = await fetch(`${API_URL}/api/kanban/etapas/${editStageData.id}/tag`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify({ tag_id: editStageData.tag_id })
            });
            const res = await response.json();
            if (res.success) {
                setShowEditStageModal(false);
                loadKanbanData(tableroActivo);
            } else {
                alert("Error: " + (res.message || "No se pudo actualizar la etapa"));
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión al editar etapa");
        }
    };

    const handleDeleteStage = async () => {
        if (!stageToDelete) return;
        try {
            const response = await fetch(`${API_URL}/api/kanban/etapas/${stageToDelete}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const res = await response.json();
            if (res.success) {
                setShowDeleteStageModal(false);
                setStageToDelete(null);
                loadKanbanData(tableroActivo);
            }
        } catch (err) { alert("Error al eliminar etapa"); }
    };

    const handleUpdateStageTag = async (stageId, tagId) => {
        try {
            const response = await fetch(`${API_URL}/api/kanban/etapas/${stageId}/tag`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getAuthToken()}` },
                body: JSON.stringify({ tag_id: tagId })
            });
            const res = await response.json();
            if (res.success) {
                setOpenTagMenu(null);
                loadKanbanData(tableroActivo);
            } else {
                alert("Error: " + (res.message || "No se pudo asignar el tag"));
            }
        } catch (err) {
            console.error(err);
            alert("Error de conexión al asignar tag");
        }
    };

    const totalContactos = columnas.reduce((sum, col) => sum + (col.items?.length || 0), 0);
    const totalEtapas = columnas.length;
    const totalActivosHoy = Math.round(totalContactos * 0.75);
    const totalPendientes = Math.round(totalContactos * 0.25);

    // Computed: filtrar y ordenar columnas según searchQuery, filterTagId y sortOrder
    const filteredColumnas = columnas.map(col => {
        let items = col.items || [];
        // Filtrar por búsqueda
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            items = items.filter(ct =>
                (ct.nombre || '').toLowerCase().includes(q) ||
                (ct.telefono || '').toLowerCase().includes(q) ||
                (ct.ultimo_mensaje || '').toLowerCase().includes(q)
            );
        }
        // Ordenar
        items = [...items].sort((a, b) => {
            const na = (a.nombre || a.telefono || '').toLowerCase();
            const nb = (b.nombre || b.telefono || '').toLowerCase();
            return sortOrder === 'asc' ? na.localeCompare(nb) : nb.localeCompare(na);
        });
        return { ...col, items };
    }).filter(col => {
        // Filtrar columnas por tag si hay filtro activo
        if (filterTagId) return col.tag_id === filterTagId;
        return true;
    });

    return (
        <div className="flex h-screen bg-transparent font-sans selection:bg-emerald-100/50 overflow-hidden">
            <Sidebar user={user} onLogout={onLogout} />

            <main className="ml-[21rem] mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {/* PAGE HEADER */}
                    <div className="px-8 pt-6 pb-0 shrink-0">
                        <div className="flex items-center justify-between mb-1">
                            <h1 className="text-2xl font-black tracking-tight text-slate-900">Tableros</h1>
                            <button onClick={() => setShowCreateModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 active:scale-95 shadow-md shadow-emerald-100 cursor-pointer">
                                <Plus size={15} /> Nuevo tablero
                            </button>
                        </div>
                        <p className="text-xs text-slate-400 font-medium mb-4">Organiza tus contactos en columnas dinámicas vinculadas a tus etiquetas.</p>
                    </div>

                    {/* TABS + CONTROLES */}
                    {tableros.length > 0 && (
                        <div className="px-8 flex items-center justify-between gap-3 shrink-0 border-b border-slate-100 mb-4">
                            {/* Left: Tab list — grows but has a max-width so controls are always visible */}
                            <div className="flex items-center gap-0 overflow-x-auto custom-scrollbar flex-1 min-w-0 max-w-[55%]">
                                {tableros.map(t => (
                                    <div key={t.id} className="relative flex items-center shrink-0">
                                        <button
                                            onClick={() => setTableroActivo(t.id)}
                                            className={`px-3.5 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 whitespace-nowrap ${tableroActivo === t.id
                                                    ? 'border-emerald-500 text-emerald-600 font-bold'
                                                    : 'border-transparent text-slate-500 hover:text-slate-800'
                                                }`}
                                        >
                                            {t.nombre}
                                            <span className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${tableroActivo === t.id
                                                    ? 'bg-emerald-50 text-emerald-600'
                                                    : 'bg-slate-100 text-slate-500'
                                                }`}>
                                                {tableroActivo === t.id ? totalContactos : 0}
                                            </span>
                                        </button>
                                        {tableroActivo === t.id && (
                                            <div className="relative ml-0.5" onMouseDown={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (showOptions) { setShowOptions(false); return; }
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setTabOptionsPos({ top: rect.bottom + 6, left: rect.left });
                                                        setShowOptions(true);
                                                    }}
                                                    className="p-1 hover:bg-slate-100 rounded-lg transition-colors text-slate-400"
                                                >
                                                    <MoreVertical size={13} />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                                <button className="px-3 py-2.5 text-xs font-bold text-slate-400 hover:text-slate-700 border-b-2 border-transparent flex items-center gap-1 whitespace-nowrap shrink-0">
                                    Más vistas <ChevronDown size={13} />
                                </button>
                            </div>

                            {/* Right: Search + Filtrar + Ordenar + Layout */}
                            <div className="flex items-center gap-2 shrink-0 pb-2">
                                <div className="relative">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        placeholder="Buscar por nombre o teléfono..."
                                        className="pl-3.5 pr-8 py-2 bg-white border border-slate-200 rounded-xl text-xs outline-none focus:border-emerald-500 w-64 sm:w-72 md:w-80 font-medium placeholder-slate-400 transition-all shadow-2xs"
                                    />
                                    <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                </div>

                                {/* Filtrar */}
                                <button
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        if (showFilterMenu) { setShowFilterMenu(false); return; }
                                        setFilterMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                        setShowFilterMenu(true); setShowSortMenu(false);
                                    }}
                                    className={`flex items-center gap-1.5 px-3 py-2 border rounded-xl text-xs font-bold transition-all shadow-2xs cursor-pointer ${filterTagId ? 'bg-emerald-50 border-emerald-300 text-emerald-700' : 'bg-white border-slate-200 hover:bg-slate-50 text-slate-700'
                                        }`}
                                >
                                    <Filter size={13} className={filterTagId ? 'text-emerald-600' : 'text-slate-400'} /> Filtrar
                                    {filterTagId && <span className="w-2 h-2 rounded-full bg-emerald-500" />}
                                </button>

                                {/* Ordenar */}
                                <button
                                    onClick={(e) => {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        if (showSortMenu) { setShowSortMenu(false); return; }
                                        setSortMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                        setShowSortMenu(true); setShowFilterMenu(false);
                                    }}
                                    className="flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-200 hover:bg-slate-50 rounded-xl text-xs font-bold text-slate-700 transition-all shadow-2xs cursor-pointer"
                                >
                                    {sortOrder === 'asc' ? <SortAsc size={13} className="text-slate-400" /> : <SortDesc size={13} className="text-slate-400" />}
                                    Ordenar
                                </button>

                                {/* Layout switcher */}
                                <div className="flex items-center border border-slate-200 rounded-xl overflow-hidden bg-white shadow-2xs">
                                    <button
                                        onClick={() => setLayoutMode('kanban')}
                                        className={`p-2 transition-all cursor-pointer ${layoutMode === 'kanban' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                        title="Vista Kanban"
                                    >
                                        <Grid3X3 size={14} />
                                    </button>
                                    <button
                                        onClick={() => setLayoutMode('list')}
                                        className={`p-2 transition-all cursor-pointer ${layoutMode === 'list' ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                        title="Vista Lista"
                                    >
                                        <List size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STATS BAR */}
                    {tableros.length > 0 && (
                        <div className="px-8 mb-4 shrink-0">
                            <div className="bg-white border border-slate-100 rounded-2xl shadow-2xs grid grid-cols-4 divide-x divide-slate-100">
                                <div className="flex items-center gap-3 px-5 py-3.5">
                                    <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500 shrink-0">
                                        <UserIcon size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-slate-900 leading-none">{totalContactos}</div>
                                        <div className="text-xs text-slate-400 font-medium mt-0.5">Contactos</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-5 py-3.5">
                                    <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-500 shrink-0">
                                        <Layout size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-slate-900 leading-none">{totalEtapas}</div>
                                        <div className="text-xs text-slate-400 font-medium mt-0.5">Etapas</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-5 py-3.5">
                                    <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-500 shrink-0">
                                        <RefreshCw size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-slate-900 leading-none">{totalActivosHoy}</div>
                                        <div className="text-xs text-slate-400 font-medium mt-0.5">Activos hoy</div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 px-5 py-3.5">
                                    <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center text-rose-500 shrink-0">
                                        <Calendar size={18} />
                                    </div>
                                    <div>
                                        <div className="text-xl font-black text-slate-900 leading-none">{totalPendientes}</div>
                                        <div className="text-xs text-slate-400 font-medium mt-0.5">Pendientes</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* KANBAN BOARD */}
                    <div className="flex-1 overflow-x-auto overflow-y-hidden px-8 pb-6 relative flex flex-col min-h-0">
                        {loading ? (
                            <div className="flex gap-5 items-start h-full pt-2">
                                {Array.from({ length: 4 }).map((_, colIdx) => (
                                    <div key={colIdx} className="w-[280px] flex flex-col shrink-0">
                                        <div className="skeleton h-5 w-28 rounded-full mb-4 mx-1" />
                                        {Array.from({ length: 3 }).map((_, cardIdx) => (
                                            <SkeletonKanbanCard key={cardIdx} />
                                        ))}
                                    </div>
                                ))}
                            </div>
                        ) : tableros.length === 0 ? (
                            <div className="flex-1 flex flex-col items-center justify-center">
                                <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-50 border border-slate-200 text-slate-400">
                                    <Layout size={26} />
                                </div>
                                <h2 className="text-xl font-black text-slate-900 mb-2">No tienes ningún tablero creado</h2>
                                <p className="text-slate-400 text-sm text-center max-w-sm mb-8 font-medium">Crea tu primer tablero para organizar tus contactos y gestionar tu flujo de trabajo.</p>
                                <button onClick={() => setShowCreateModal(true)} className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 active:scale-95">
                                    <Plus size={18} /> Crear mi primer tablero
                                </button>
                            </div>
                        ) : layoutMode === 'list' ? (
                            <div className="h-full overflow-y-auto custom-scrollbar pt-2 pb-6 space-y-4">
                                {filteredColumnas.map((col) => (
                                    <div key={col.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
                                        <div className="px-5 py-3.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                                                <h3 className="font-bold text-slate-800 text-sm">{col.nombre}</h3>
                                                <span className="px-2 py-0.5 rounded-full bg-slate-200/70 text-slate-600 font-bold text-xs">{col.items?.length || 0}</span>
                                            </div>
                                            <button
                                                onClick={() => { setAddContactTargetStage(col); setShowAddContactModal(true); setContactSearchQuery(''); fetchContactsForSearch(''); }}
                                                className="text-emerald-600 hover:text-emerald-700 font-bold text-xs flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-lg transition-colors"
                                            >
                                                <Plus size={13} /> Agregar contacto
                                            </button>
                                        </div>
                                        {!col.items || col.items.length === 0 ? (
                                            <div className="py-4 text-center text-xs text-slate-400 font-medium">Sin contactos en esta etapa</div>
                                        ) : (
                                            <div className="divide-y divide-slate-100">
                                                {col.items.map(ct => (
                                                    <div key={ct.id} onClick={() => window.location.hash = `#/chat/${ct.id}`} className="px-5 py-3 flex items-center justify-between hover:bg-slate-50/80 transition-colors cursor-pointer group">
                                                        <div className="flex items-center gap-3 min-w-0">
                                                            <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-xs uppercase shrink-0">
                                                                {(ct.nombre || ct.telefono || 'C').charAt(0).toUpperCase()}
                                                            </div>
                                                            <div className="min-w-0">
                                                                <p className="font-bold text-xs text-slate-800 truncate">{ct.nombre || ct.telefono}</p>
                                                                {ct.nombre && <p className="text-[11px] text-slate-400 font-medium truncate">{ct.telefono}</p>}
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4 shrink-0">
                                                            <div className="text-right max-w-[220px]">
                                                                <p className="text-[11.5px] text-slate-500 font-medium truncate">{ct.ultimo_mensaje || 'Sin mensajes'}</p>
                                                            </div>
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                    setCardMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                                                    setOpenCardMenu(ct.id);
                                                                    setCardMenuStageId(col.id);
                                                                }}
                                                                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                                            >
                                                                <MoreVertical size={14} />
                                                            </button>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex gap-5 items-start h-full pt-2 pb-4">
                                {filteredColumnas.map((col, colIdx) => {
                                    /* Theme palette cycling per column */
                                    const themes = [
                                        { topBorder: 'border-t-emerald-500', dot: 'bg-emerald-500', avatarBg: 'bg-emerald-100 text-emerald-700', waBadge: 'bg-emerald-50 text-emerald-600 border-emerald-100' },
                                        { topBorder: 'border-t-blue-500', dot: 'bg-blue-500', avatarBg: 'bg-blue-100 text-blue-700', waBadge: 'bg-blue-50 text-blue-600 border-blue-100' },
                                        { topBorder: 'border-t-purple-500', dot: 'bg-purple-500', avatarBg: 'bg-purple-100 text-purple-700', waBadge: 'bg-purple-50 text-purple-600 border-purple-100' },
                                        { topBorder: 'border-t-amber-500', dot: 'bg-amber-500', avatarBg: 'bg-amber-100 text-amber-700', waBadge: 'bg-amber-50 text-amber-600 border-amber-100' },
                                    ];
                                    const th = themes[colIdx % themes.length];
                                    return (
                                        <div key={col.id} className={`w-[245px] flex flex-col shrink-0 max-h-full bg-white rounded-xl border border-slate-200 border-t-[3px] ${th.topBorder} shadow-2xs`}>

                                            {/* COLUMN HEADER */}
                                            <div className="px-3.5 pt-3 pb-2 shrink-0">
                                                <div className="flex items-center justify-between">
                                                    <div className="flex items-center gap-1.5 min-w-0">
                                                        <span className={`w-2 h-2 rounded-full shrink-0 ${th.dot}`} />
                                                        <h3 className="font-bold text-slate-900 text-xs truncate">{col.nombre}</h3>
                                                        <span className="ml-1 text-[11px] font-bold text-slate-400 shrink-0">{col.items?.length || 0}</span>
                                                    </div>
                                                    {/* Stage options button — fixed position menu */}
                                                    <div className="relative shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                if (openStageOptions === col.id) { setOpenStageOptions(null); return; }
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setStageOptionsPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
                                                                setOpenStageOptions(col.id);
                                                            }}
                                                            className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400"
                                                        >
                                                            <MoreVertical size={13} />
                                                        </button>
                                                    </div>
                                                </div>

                                                {/* Tag pill + vincular etiqueta — fixed position menu */}
                                                <div className="relative mt-1.5" onMouseDown={(e) => e.stopPropagation()}>
                                                    {col.tag_id ? (
                                                        <button
                                                            onClick={(e) => {
                                                                if (openTagMenu === col.id) { setOpenTagMenu(null); return; }
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setTagMenuPos({ top: rect.bottom + 6, left: rect.left });
                                                                setOpenTagMenu(col.id);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100 transition-all"
                                                        >
                                                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                                            {col.tag_nombre}
                                                            <ChevronDown size={10} className={`transition-transform ${openTagMenu === col.id ? 'rotate-180' : ''}`} />
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={(e) => {
                                                                if (openTagMenu === col.id) { setOpenTagMenu(null); return; }
                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                setTagMenuPos({ top: rect.bottom + 6, left: rect.left });
                                                                setOpenTagMenu(col.id);
                                                            }}
                                                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold border border-slate-200 text-slate-400 hover:border-emerald-400 hover:text-emerald-600 transition-all"
                                                        >
                                                            <Plus size={10} /> Vincular etiqueta
                                                        </button>
                                                    )}
                                                </div>
                                            </div>

                                            {/* CARDS SCROLL AREA */}
                                            <div className="flex-1 overflow-y-auto px-3 space-y-2 custom-scrollbar min-h-[60px]">
                                                {col.items && col.items.length > 0 ? (
                                                    col.items.map((ct) => (
                                                        <div
                                                            key={ct.id}
                                                            onClick={() => {
                                                                if (openCardMenu === ct.id) return;
                                                                // Navegar al chat del contacto
                                                                window.location.hash = `#/chat/${ct.id}`;
                                                            }}
                                                            className="bg-white border border-slate-200/80 rounded-xl p-2.5 group cursor-pointer hover:shadow-2xs hover:border-slate-300 transition-all duration-150 relative"
                                                        >
                                                            {/* Card top: avatar + name + options */}
                                                            <div className="flex items-start justify-between gap-1.5">
                                                                <div className="flex items-center gap-2 min-w-0">
                                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs uppercase shrink-0 ${th.avatarBg}`}>
                                                                        {(ct.nombre || ct.telefono || 'C').charAt(0).toUpperCase()}
                                                                    </div>
                                                                    <div className="min-w-0">
                                                                        <h4 className="font-bold text-slate-800 text-xs truncate leading-tight">
                                                                            {ct.nombre || ct.telefono}
                                                                        </h4>
                                                                        <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                                                                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                                                            Activo hoy
                                                                        </p>
                                                                    </div>
                                                                </div>
                                                                {/* Card context menu — button only, menu rendered as fixed overlay */}
                                                                <div className="relative shrink-0" onMouseDown={(e) => e.stopPropagation()}>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            if (openCardMenu === ct.id) {
                                                                                setOpenCardMenu(null);
                                                                            } else {
                                                                                const rect = e.currentTarget.getBoundingClientRect();
                                                                                setCardMenuPos({
                                                                                    top: rect.bottom + 6,
                                                                                    right: window.innerWidth - rect.right
                                                                                });
                                                                                setOpenCardMenu(ct.id);
                                                                                setCardMenuStageId(col.id);
                                                                            }
                                                                        }}
                                                                        className="p-0.5 text-slate-300 hover:text-slate-600 transition-colors mt-0.5 rounded"
                                                                    >
                                                                        <MoreVertical size={13} />
                                                                    </button>
                                                                </div>
                                                            </div>

                                                            {/* Card bottom: last message + WA badge */}
                                                            <div className="mt-2.5 flex items-center justify-between gap-1.5">
                                                                <div className="flex items-center gap-1 min-w-0 flex-1">
                                                                    <MessageCircle size={11} className="shrink-0 text-slate-400" />
                                                                    <span className="text-[11px] text-slate-500 font-medium truncate">
                                                                        {ct.ultimo_mensaje || 'Sin mensajes'}
                                                                    </span>
                                                                </div>
                                                                <span className={`px-1.5 py-0.2 rounded text-[9px] font-extrabold border shrink-0 ${th.waBadge}`}>WA</span>
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="py-4 flex flex-col items-center justify-center text-center">
                                                        <p className="text-[10px] text-slate-300 font-medium">Sin contactos</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* ADD CONTACT BUTTON */}
                                            <div className="px-3 py-2 shrink-0">
                                                <button
                                                    onClick={() => { setAddContactTargetStage(col); setShowAddContactModal(true); setContactSearchQuery(''); setContactSearchResults([]); }}
                                                    className="w-full py-1.5 border border-dashed border-slate-200 hover:border-emerald-500 rounded-lg flex items-center justify-center gap-1 text-xs font-bold text-emerald-600 hover:bg-emerald-50/50 transition-all cursor-pointer"
                                                >
                                                    <Plus size={13} /> Agregar contacto
                                                </button>
                                            </div>
                                        </div>
                                    );
                                })}

                                {/* ADD STAGE CARD */}
                                <div className="w-[245px] shrink-0 border border-dashed border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center text-center bg-white hover:border-emerald-400 hover:bg-emerald-50/20 transition-all group min-h-[160px]">
                                    {/* Folder illustration SVG */}
                                    <div className="mb-2 relative">
                                        <svg width="48" height="42" viewBox="0 0 64 56" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <rect x="4" y="14" width="56" height="38" rx="6" fill="#ECFDF5" stroke="#6EE7B7" strokeWidth="1.5" />
                                            <path d="M4 20C4 16.686 6.686 14 10 14h12l4 6H54C57.314 20 60 22.686 60 26v26a6 6 0 01-6 6H10a6 6 0 01-6-6V20z" fill="#D1FAE5" stroke="#6EE7B7" strokeWidth="1.5" />
                                            <circle cx="48" cy="38" r="10" fill="#10B981" />
                                            <path d="M44 38h8M48 34v8" stroke="white" strokeWidth="2" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                    <h4 className="font-bold text-slate-800 text-xs mb-1">Añade una nueva etapa</h4>
                                    <p className="text-[11px] text-slate-400 font-medium mb-3 leading-relaxed max-w-[150px]">
                                        Crea columnas para organizar mejor tu flujo de trabajo.
                                    </p>
                                    <button
                                        onClick={() => setShowAddStageModal(true)}
                                        className="flex items-center gap-1.5 px-3.5 py-1.5 border border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                    >
                                        <Plus size={13} /> Nueva etapa
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </main>

            {/* MODAL: AGREGAR CONTACTO A ETAPA */}
            {showAddContactModal && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm" onMouseDown={() => { setShowAddContactModal(false); }}>
                    <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden" onMouseDown={(e) => e.stopPropagation()}>
                        <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
                            <div>
                                <h3 className="font-black text-slate-800 text-lg">Agregar contacto</h3>
                                {addContactTargetStage && (
                                    <p className="text-[12px] text-slate-400 font-medium">en columna <strong className="text-emerald-600">{addContactTargetStage.nombre}</strong></p>
                                )}
                            </div>
                            <button onClick={() => setShowAddContactModal(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20} /></button>
                        </div>
                        <div className="p-6">
                            {/* Search input */}
                            <div className="relative mb-4">
                                <input
                                    autoFocus
                                    type="text"
                                    value={contactSearchQuery}
                                    onChange={handleContactSearchChange}
                                    placeholder="Buscar por nombre o teléfono..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-400 text-[13px] font-medium text-slate-700 transition-all placeholder-slate-400"
                                />
                                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            </div>

                            {/* Results */}
                            <div className="min-h-[160px] max-h-[280px] overflow-y-auto custom-scrollbar">
                                {loadingContacts ? (
                                    <div className="flex items-center justify-center h-20">
                                        <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    </div>
                                ) : contactSearchResults.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center h-20 text-slate-400">
                                        {contactSearchQuery ? (
                                            <p className="text-[12px] font-medium">No se encontraron contactos</p>
                                        ) : (
                                            <p className="text-[12px] font-medium">Escribe para buscar contactos...</p>
                                        )}
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        {contactSearchResults.map(ct => (
                                            <button
                                                key={ct.id}
                                                onClick={() => handleAddContactToStage(ct.id)}
                                                disabled={addingContact}
                                                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-all text-left group disabled:opacity-50"
                                            >
                                                <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[13px] uppercase shrink-0">
                                                    {(ct.nombre || ct.telefono || 'C').charAt(0).toUpperCase()}
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="font-semibold text-[13px] text-slate-800 truncate">{ct.nombre || ct.telefono}</p>
                                                    {ct.nombre && <p className="text-[11px] text-slate-400 font-medium truncate">{ct.telefono}</p>}
                                                </div>
                                                <ArrowRight size={14} className="text-slate-300 group-hover:text-emerald-500 transition-colors shrink-0" />
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {addingContact && (
                                <div className="mt-3 flex items-center justify-center gap-2 text-[12px] text-emerald-600 font-semibold">
                                    <div className="w-4 h-4 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
                                    Agregando contacto...
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* ============================================================ */}
            {/* FIXED-POSITION OVERLAY MENUS (float above all containers)    */}
            {/* ============================================================ */}

            {/* Tab options: Editar / Eliminar tablero */}
            {showOptions && (
                <div
                    className="fixed z-[400] w-36 bg-white border border-slate-100 shadow-2xl rounded-xl overflow-hidden"
                    style={{ top: tabOptionsPos.top, left: tabOptionsPos.left }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button onClick={() => { setEditBoardName(tableros.find(t => t.id === tableroActivo)?.nombre || ''); setShowEditModal(true); setShowOptions(false); }} className="w-full text-left px-3 py-2.5 text-[11.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                        <FileText size={13} className="text-slate-400" /> Editar
                    </button>
                    <div className="h-px bg-slate-100" />
                    <button onClick={() => { setShowDeleteModal(true); setShowOptions(false); }} className="w-full text-left px-3 py-2.5 text-[11.5px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors">
                        <Trash2 size={13} /> ¿Eliminar?
                    </button>
                </div>
            )}

            {/* Stage options: Editar / Eliminar etapa */}
            {openStageOptions !== null && (() => {
                const col = columnas.find(c => c.id === openStageOptions);
                if (!col) return null;
                return (
                    <div
                        className="fixed z-[400] w-36 bg-white border border-slate-100 shadow-2xl rounded-xl overflow-hidden"
                        style={{ top: stageOptionsPos.top, right: stageOptionsPos.right }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <button onClick={() => { setEditStageData({ id: col.id, nombre: col.nombre, tag_id: col.tag_id }); setShowEditStageModal(true); setOpenStageOptions(null); }} className="w-full text-left px-3 py-2.5 text-[11.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors">
                            <FileText size={13} className="text-slate-400" /> Editar
                        </button>
                        <div className="h-px bg-slate-100" />
                        <button onClick={() => { setStageToDelete(col.id); setShowDeleteStageModal(true); setOpenStageOptions(null); }} className="w-full text-left px-3 py-2.5 text-[11.5px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors">
                            <Trash2 size={13} /> Eliminar
                        </button>
                    </div>
                );
            })()}

            {/* Tag menu: vincular etiqueta */}
            {openTagMenu !== null && (() => {
                const col = columnas.find(c => c.id === openTagMenu);
                if (!col) return null;
                return (
                    <div
                        className="fixed z-[400] w-48 bg-white border border-slate-100 shadow-2xl rounded-xl overflow-hidden max-h-56 overflow-y-auto custom-scrollbar"
                        style={{ top: tagMenuPos.top, left: tagMenuPos.left }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <button onClick={() => handleUpdateStageTag(col.id, null)} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-400 hover:bg-slate-50 border-b border-slate-100">Ninguno</button>
                        {allTags.map(tag => (
                            <button key={tag.id} onClick={() => handleUpdateStageTag(col.id, tag.id)} className="w-full text-left px-3 py-2 text-[11px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                                <span className="truncate">{tag.nombre}</span>
                            </button>
                        ))}
                    </div>
                );
            })()}

            {/* Filter menu */}
            {showFilterMenu && (
                <div
                    className="fixed z-[400] w-48 bg-white border border-slate-100 shadow-2xl rounded-xl overflow-hidden"
                    style={{ top: filterMenuPos.top, right: filterMenuPos.right }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <div className="px-3 py-2 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-100">Filtrar por etiqueta</div>
                    <button onClick={() => { setFilterTagId(null); setShowFilterMenu(false); }} className={`w-full text-left px-3 py-2 text-[11px] font-bold flex items-center gap-2 ${!filterTagId ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                        Todas las etapas
                    </button>
                    {columnas.filter(c => c.tag_id).map(col => (
                        <button key={col.id} onClick={() => { setFilterTagId(col.tag_id); setShowFilterMenu(false); }} className={`w-full text-left px-3 py-2 text-[11px] font-bold flex items-center gap-2 ${filterTagId === col.tag_id ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: col.tag_color }} />
                            {col.tag_nombre}
                        </button>
                    ))}
                </div>
            )}

            {/* Sort menu */}
            {showSortMenu && (
                <div
                    className="fixed z-[400] w-40 bg-white border border-slate-100 shadow-2xl rounded-xl overflow-hidden"
                    style={{ top: sortMenuPos.top, right: sortMenuPos.right }}
                    onMouseDown={(e) => e.stopPropagation()}
                >
                    <button onClick={() => { setSortOrder('asc'); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2.5 text-[11.5px] font-bold flex items-center gap-2 ${sortOrder === 'asc' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <SortAsc size={13} /> A → Z
                    </button>
                    <button onClick={() => { setSortOrder('desc'); setShowSortMenu(false); }} className={`w-full text-left px-3 py-2.5 text-[11.5px] font-bold flex items-center gap-2 ${sortOrder === 'desc' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-600 hover:bg-slate-50'}`}>
                        <SortDesc size={13} /> Z → A
                    </button>
                </div>
            )}

            {/* Card context menu */}
            {openCardMenu !== null && (() => {
                // Find the contact object across all columns
                const ct = columnas.flatMap(c => c.items || []).find(c => c.id === openCardMenu);
                if (!ct) return null;
                return (
                    <div
                        className="fixed z-[300] w-36 bg-white border border-slate-100 shadow-2xl rounded-xl overflow-hidden"
                        style={{ top: cardMenuPos.top, right: cardMenuPos.right }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        <button
                            onClick={(e) => { e.stopPropagation(); setOpenCardMenu(null); window.location.hash = `#/chat/${ct.id}`; }}
                            className="w-full text-left px-3 py-2.5 text-[11.5px] font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2 transition-colors"
                        >
                            <MessageCircle size={13} className="text-emerald-500" /> Ver chat
                        </button>
                        <div className="h-px bg-slate-100" />
                        <button
                            onClick={(e) => { e.stopPropagation(); handleRemoveContactFromStage(ct.id); }}
                            className="w-full text-left px-3 py-2.5 text-[11.5px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2 transition-colors"
                        >
                            <Trash2 size={13} /> Quitar de etapa
                        </button>
                    </div>
                );
            })()}

            {/* MODALES */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Crear nuevo tablero">
                <form onSubmit={handleCreateBoard} className="space-y-6">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">Crea un tablero personalizado donde puedes configurar tus propias columnas y organizar tus contactos.</p>
                    <div className="space-y-2">
                        <label className="text-[11px] font-semibold text-slate-500 ml-1">Nombre del tablero</label>
                        <input autoFocus value={newBoardName} onChange={(e) => setNewBoardName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500/30 transition-all font-normal text-slate-700 text-sm" placeholder="Ej: Ventas Inmobiliario" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowCreateModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-650 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider">Cancelar</button>
                        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-xs transition-all text-xs uppercase tracking-wider">Crear Tablero</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showAddStageModal} onClose={() => setShowAddStageModal(false)} title="Nueva Etapa">
                <form onSubmit={handleAddStage} className="space-y-6">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre de la columna</label>
                            <input autoFocus value={newStageData.nombre} onChange={(e) => setNewStageData({ ...newStageData, nombre: e.target.value })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500/30 transition-all font-normal text-slate-700 text-sm" placeholder="Ej: Prospectos" />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular a Tag (Opcional)</label>
                            <select value={newStageData.tag_id || ''} onChange={(e) => setNewStageData({ ...newStageData, tag_id: e.target.value || null })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500/30 transition-all font-normal text-slate-700 text-sm appearance-none bg-white">
                                <option value="">Ninguno</option>
                                {allTags.map(tag => <option key={tag.id} value={tag.id}>{tag.nombre}</option>)}
                            </select>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowAddStageModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-650 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider">Cancelar</button>
                        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-xs transition-all text-xs uppercase tracking-wider">Guardar Etapa</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showEditStageModal} onClose={() => setShowEditStageModal(false)} title="Editar Etapa">
                <form onSubmit={handleEditStage} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Vincular a Tag</label>
                        <select value={editStageData.tag_id || ''} onChange={(e) => setEditStageData({ ...editStageData, tag_id: e.target.value || null })} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500/30 transition-all font-normal text-slate-700 text-sm appearance-none bg-white">
                            <option value="">Ninguno</option>
                            {allTags.map(tag => <option key={tag.id} value={tag.id}>{tag.nombre}</option>)}
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowEditStageModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-650 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider">Cancelar</button>
                        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-xs transition-all text-xs uppercase tracking-wider">Actualizar</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showDeleteStageModal} onClose={() => setShowDeleteStageModal(false)} title="¿Eliminar Etapa?">
                <div className="space-y-6">
                    <div className="flex gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100"><AlertCircle className="text-rose-500 shrink-0" size={24} /><p className="text-sm text-rose-700 leading-relaxed font-medium">Esta acción eliminará la columna del tablero. Los contactos con este Tag seguirán existiendo.</p></div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDeleteStageModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-650 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider">Cancelar</button>
                        <button onClick={handleDeleteStage} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-xs text-xs uppercase tracking-wider">Eliminar Etapa</button>
                    </div>
                </div>
            </Modal>

            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Tablero">
                <form onSubmit={handleEditBoard} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre</label>
                        <input autoFocus value={editBoardName} onChange={(e) => setEditBoardName(e.target.value)} className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 outline-none focus:border-emerald-500/30 transition-all font-normal text-slate-700 text-sm" />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button type="button" onClick={() => setShowEditModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-650 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider">Cancelar</button>
                        <button type="submit" className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-white font-bold hover:bg-emerald-600 shadow-xs transition-all text-xs uppercase tracking-wider">Guardar</button>
                    </div>
                </form>
            </Modal>

            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="¿Eliminar Tablero?">
                <div className="space-y-6">
                    <div className="flex gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100"><AlertCircle className="text-rose-500 shrink-0" size={24} /><p className="text-sm text-rose-700 leading-relaxed font-medium">Se eliminará el tablero y todas sus configuraciones de columnas.</p></div>
                    <div className="flex gap-3">
                        <button onClick={() => setShowDeleteModal(false)} className="flex-1 py-2.5 rounded-xl border border-slate-200 font-bold text-slate-650 hover:bg-slate-50 transition-all text-xs uppercase tracking-wider">Cancelar</button>
                        <button onClick={handleDeleteBoard} className="flex-1 py-2.5 rounded-xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-xs text-xs uppercase tracking-wider">Eliminar</button>
                    </div>
                </div>
            </Modal>

            <style>{`.custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }.custom-scrollbar::-webkit-scrollbar-track { background: transparent; }.custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }.custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }`}</style>
        </div>
    );
};

export default Tableros;

