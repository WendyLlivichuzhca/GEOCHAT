import React, { useState, useEffect, useMemo } from 'react';
import {
    Tag as TagIcon, Plus, Search, Filter, MoreHorizontal,
    Trash2, Edit2, X, AlertCircle, Check, ChevronDown, ChevronUp,
    ChevronsUpDown, Users, Calendar, Columns, Lightbulb, Activity,
    ArrowRight, ChevronLeft, ChevronRight, CheckCircle2, Star,
    RotateCcw, Info, Copy, Sparkles
} from 'lucide-react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const PALETTE_COLORS = [
    '#22C55E', '#10B981', '#3B82F6', '#2563EB', '#EF4444',
    '#F59E0B', '#F97316', '#A855F7', '#6366F1', '#EC4899',
    '#06B6D4', '#64748B'
];

const INITIAL_DEMO_TAGS = [
    {
        id: 1,
        nombre: 'Interesado_Perfume',
        descripcion: 'Clientes interesados en perfumes y fragancias.',
        total_contactos: 1,
        color: '#22C55E',
        activa: true,
        creado_en: '2026-07-24T09:43:00'
    },
    {
        id: 2,
        nombre: 'Hola',
        descripcion: 'Etiqueta de saludo inicial.',
        total_contactos: 0,
        color: '#EF4444',
        activa: true,
        creado_en: '2026-07-24T08:38:00'
    },
    {
        id: 3,
        nombre: 'URGENTE: Cliente Frustrado',
        descripcion: 'Conversaciones de clientes con problemas urgentes.',
        total_contactos: 1,
        color: '#EF4444',
        activa: true,
        creado_en: '2026-07-14T06:33:00'
    }
];

const INITIAL_ACTIVITIES = [
    {
        id: 1,
        texto: 'Tag "Interesado_Perfume" creada',
        fecha: '24 jul 2026, 09:43',
        usuario: 'Wendy L.',
        color: '#22C55E'
    },
    {
        id: 2,
        texto: 'Tag "Hola" creada',
        fecha: '24 jul 2026, 08:38',
        usuario: 'Wendy L.',
        color: '#3B82F6'
    },
    {
        id: 3,
        texto: 'Tag "URGENTE: Cliente Frustrado" creada',
        fecha: '14 jul 2026, 06:33',
        usuario: 'Wendy L.',
        color: '#EF4444'
    }
];

const getColorName = (hex) => {
    if (!hex) return 'Gris';
    const upper = hex.toUpperCase();
    if (['#EF4444', '#F87171', '#FCA5A5', '#EC4899', '#DC2626'].includes(upper)) return 'Rojo';
    if (['#22C55E', '#10B981', '#34D399', '#00B074', '#84CC16', '#16A34A'].includes(upper)) return 'Verde';
    if (['#3B82F6', '#2563EB', '#0EA5E9', '#06B6D4', '#0D9488'].includes(upper)) return 'Azul';
    if (['#F59E0B', '#FACC15', '#EAB308'].includes(upper)) return 'Amarillo';
    if (['#F97316', '#EA580C'].includes(upper)) return 'Naranja';
    if (['#A855F7', '#D946EF', '#6366F1', '#8B5CF6'].includes(upper)) return 'Violeta';
    return 'Gris';
};

const Modal = ({ isOpen, onClose, title, children, maxWidth = 'max-w-md' }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs animate-in fade-in duration-200">
            <div className={`bg-white w-full ${maxWidth} rounded-2xl shadow-2xl overflow-hidden border border-slate-100 animate-in zoom-in-95 duration-200`}>
                <div className="px-6 py-4 flex justify-between items-center border-b border-slate-100">
                    <h3 className="font-bold text-slate-900 text-base">{title}</h3>
                    <button
                        type="button"
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition p-1 hover:bg-slate-50 rounded-lg cursor-pointer"
                    >
                        <X size={18} />
                    </button>
                </div>
                <div className="p-6">{children}</div>
            </div>
        </div>
    );
};

const Tags = ({ user, onLogout }) => {
    const [tags, setTags] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedColorFilter, setSelectedColorFilter] = useState('Todos');
    const [sortField, setSortField] = useState('creado_en');
    const [sortOrder, setSortOrder] = useState('desc');
    const [selectedIds, setSelectedIds] = useState([]);
    const [activities, setActivities] = useState(INITIAL_ACTIVITIES);

    // Pagination
    const [page, setPage] = useState(1);
    const limit = 5;

    // Menus & Modals
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showFilterDropdown, setShowFilterDropdown] = useState(false);
    const [showColumnsDropdown, setShowColumnsDropdown] = useState(false);
    const [showMoreInfoModal, setShowMoreInfoModal] = useState(false);
    const [showActivitiesModal, setShowActivitiesModal] = useState(false);

    const [activeRowMenu, setActiveRowMenu] = useState(null);
    const [selectedTag, setSelectedTag] = useState(null);

    // Column visibility
    const [visibleColumns, setVisibleColumns] = useState({
        descripcion: true,
        contactos: true,
        color: true,
        creado: true
    });

    // Form state
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        color: '#22C55E'
    });

    const getAuthToken = () => {
        const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
        return savedUser?.token || localStorage.getItem('geochat_token') || '';
    };

    const fetchTags = async () => {
        setLoading(true);
        try {
            const token = getAuthToken();
            if (token) {
                const response = await fetch(`${API_URL}/api/tags`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const res = await response.json();
                if (res.success && Array.isArray(res.tags) && res.tags.length > 0) {
                    setTags(res.tags);
                    setLoading(false);
                    return;
                }
            }
        } catch (err) {
            console.log("Servidor backend respondiendo fallback local para tags");
        }
        setTags(INITIAL_DEMO_TAGS);
        setLoading(false);
    };

    useEffect(() => {
        fetchTags();
    }, []);

    // Create Tag
    const handleCreateTag = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim()) return;

        const newTag = {
            id: Date.now(),
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim(),
            color: formData.color,
            total_contactos: 0,
            activa: true,
            creado_en: new Date().toISOString()
        };

        try {
            const token = getAuthToken();
            if (token) {
                await fetch(`${API_URL}/api/tags`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });
            }
        } catch (err) {
            console.log("Creado en modo local");
        }

        setTags(prev => [newTag, ...prev]);

        // Add activity
        const nowStr = new Date().toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
        setActivities(prev => [
            {
                id: Date.now(),
                texto: `Tag "${newTag.nombre}" creada`,
                fecha: nowStr,
                usuario: user?.nombre || 'Wendy L.',
                color: newTag.color
            },
            ...prev
        ]);

        setShowCreateModal(false);
        setFormData({ nombre: '', descripcion: '', color: '#22C55E' });
    };

    // Update Tag
    const handleUpdateTag = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim() || !selectedTag) return;

        setTags(prev => prev.map(t => t.id === selectedTag.id ? {
            ...t,
            nombre: formData.nombre.trim(),
            descripcion: formData.descripcion.trim(),
            color: formData.color
        } : t));

        try {
            const token = getAuthToken();
            if (token) {
                await fetch(`${API_URL}/api/tags/${selectedTag.id}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${token}`
                    },
                    body: JSON.stringify(formData)
                });
            }
        } catch (err) {
            console.log("Actualizado localmente");
        }

        setShowEditModal(false);
        setSelectedTag(null);
    };

    // Delete Tag
    const handleDeleteTag = async () => {
        if (!selectedTag) return;

        setTags(prev => prev.filter(t => t.id !== selectedTag.id));

        try {
            const token = getAuthToken();
            if (token) {
                await fetch(`${API_URL}/api/tags/${selectedTag.id}`, {
                    method: 'DELETE',
                    headers: { 'Authorization': `Bearer ${token}` }
                });
            }
        } catch (err) {
            console.log("Eliminado localmente");
        }

        setShowDeleteModal(false);
        setSelectedTag(null);
    };

    // Duplicate Tag
    const handleDuplicateTag = (tag) => {
        const dup = {
            ...tag,
            id: Date.now(),
            nombre: `${tag.nombre}_copia`,
            creado_en: new Date().toISOString()
        };
        setTags(prev => [dup, ...prev]);
        setActiveRowMenu(null);
    };

    // Sort Handler
    const handleSort = (field) => {
        if (sortField === field) {
            setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortOrder('asc');
        }
    };

    // Filter & Sort Logic
    const filteredTags = useMemo(() => {
        return tags.filter(tag => {
            const matchesSearch = tag.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
                (tag.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase());
            const matchesColor = selectedColorFilter === 'Todos' || getColorName(tag.color) === selectedColorFilter;
            return matchesSearch && matchesColor;
        }).sort((a, b) => {
            let aVal = a[sortField] || '';
            let bVal = b[sortField] || '';
            if (typeof aVal === 'string') aVal = aVal.toLowerCase();
            if (typeof bVal === 'string') bVal = bVal.toLowerCase();

            if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
            if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });
    }, [tags, searchTerm, selectedColorFilter, sortField, sortOrder]);

    // Pagination Calculation
    const totalPages = Math.max(1, Math.ceil(filteredTags.length / limit));
    const paginatedTags = useMemo(() => {
        const start = (page - 1) * limit;
        return filteredTags.slice(start, start + limit);
    }, [filteredTags, page, limit]);

    // Stats Calculations
    const totalTagsCount = tags.length;
    const totalContactosEtiquetados = useMemo(() => {
        return tags.reduce((acc, curr) => acc + (curr.total_contactos || 0), 0);
    }, [tags]);
    const tagsActivasCount = tags.filter(t => t.activa !== false).length;
    const topTag = useMemo(() => {
        if (tags.length === 0) return null;
        return [...tags].sort((a, b) => (b.total_contactos || 0) - (a.total_contactos || 0))[0];
    }, [tags]);

    // Multi-Select Handlers
    const toggleSelectAll = () => {
        if (selectedIds.length === paginatedTags.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(paginatedTags.map(t => t.id));
        }
    };

    const toggleSelectRow = (id) => {
        setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
    };

    // Sort Indicator Helper
    const renderSortIndicator = (field) => {
        const isActive = sortField === field;
        return (
            <span className={"inline-flex items-center justify-center p-0.5 rounded-md ml-1 transition-colors " + (
                isActive ? "text-[#00965e]" : "text-slate-350"
            )}>
                {isActive ? (
                    sortOrder === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />
                ) : (
                    <ChevronsUpDown size={11} />
                )}
            </span>
        );
    };

    return (
        <div className="flex min-h-screen bg-slate-50/60 font-sans text-slate-900 selection:bg-emerald-100">
            <Sidebar onLogout={onLogout} user={user} />

            <main className="ml-[21rem] mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-200/70">
                <div className="flex-1 flex flex-col justify-between overflow-y-auto overflow-x-hidden px-9 py-8 custom-scrollbar">

                    <div>
                        {/* Header Superior Amplio y Elegante */}
                        <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div className="flex items-center gap-3.5">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#00b074] to-[#05d592] text-white flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/10">
                                    <TagIcon size={18} />
                                </div>
                                <div>
                                    <h1 className="text-xl font-bold tracking-tight text-slate-800">
                                        Tags
                                    </h1>
                                    <p className="mt-0.5 text-xs font-medium text-slate-400">
                                        Crea etiquetas para agrupar a tus contactos, en base a acciones o segmentos.
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => {
                                    setFormData({ nombre: '', descripcion: '', color: '#22C55E' });
                                    setShowCreateModal(true);
                                }}
                                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#00965e] hover:bg-[#008251] px-5 text-xs font-bold text-white transition-all shadow-sm shadow-emerald-700/10 active:scale-95 whitespace-nowrap cursor-pointer shrink-0"
                            >
                                <Plus size={15} strokeWidth={3} />
                                Crear Tag
                            </button>
                        </div>

                        {/* 4 Tarjetas KPI Exactas según Captura del Usuario */}
                        <div className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                            {/* Card 1: TAGS TOTALES */}
                            <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-full bg-[#e6f7f0] text-[#00b074] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                            <TagIcon size={20} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TAGS TOTALES</span>
                                            <div className="text-2xl font-extrabold text-slate-800 leading-none mb-1.5">{totalTagsCount}</div>
                                            <span className="text-[11px] font-medium text-slate-400 block">Etiquetas creadas</span>
                                        </div>
                                    </div>
                                    <div className="w-14 h-8 text-emerald-500 shrink-0 self-end mb-0.5">
                                        <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                                            <path d="M2 26 C 14 26, 24 16, 38 18 C 50 20, 56 6, 62 4" stroke="#00b074" strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Card 2: CONTACTOS ETIQUETADOS */}
                            <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-full bg-[#ebf3fe] text-[#1868df] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                            <Users size={20} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">CONTACTOS ETIQUETADOS</span>
                                            <div className="text-2xl font-extrabold text-slate-800 leading-none mb-1.5">{totalContactosEtiquetados}</div>
                                            <span className="text-[11px] font-medium text-slate-400 block leading-tight max-w-[110px]">Contactos con al menos una etiqueta</span>
                                        </div>
                                    </div>
                                    <div className="w-14 h-8 text-blue-500 shrink-0 self-end mb-0.5">
                                        <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                                            <path d="M2 26 C 14 26, 26 22, 38 14 C 50 6, 56 16, 62 10" stroke="#1868df" strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Card 3: TAGS ACTIVAS */}
                            <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3.5">
                                        <div className="w-12 h-12 rounded-full bg-[#e6f7f0] text-[#00b074] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                            <CheckCircle2 size={20} />
                                        </div>
                                        <div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">TAGS ACTIVAS</span>
                                            <div className="text-2xl font-extrabold text-slate-800 leading-none mb-1.5">{tagsActivasCount}</div>
                                            <span className="text-[11px] font-bold text-[#00b074] block">100% disponibles</span>
                                        </div>
                                    </div>
                                    <div className="w-14 h-8 text-emerald-500 shrink-0 self-end mb-0.5">
                                        <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                                            <path d="M2 26 C 14 26, 24 16, 38 18 C 50 20, 56 6, 62 4" stroke="#00b074" strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>

                            {/* Card 4: MÁS UTILIZADA */}
                            <div className="group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-0.5">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="flex items-center gap-3.5 min-w-0">
                                        <div className="w-12 h-12 rounded-full bg-[#fef6e6] text-[#f59e0b] flex items-center justify-center shrink-0 transition-transform duration-300 group-hover:scale-105">
                                            <Star size={20} />
                                        </div>
                                        <div className="min-w-0">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">MÁS UTILIZADA</span>
                                            <div className="text-sm font-extrabold text-slate-800 leading-tight mb-1.5 truncate max-w-[125px]" title={topTag?.nombre}>
                                                {topTag ? topTag.nombre : 'Sin tags'}
                                            </div>
                                            <span className="text-[11px] font-bold text-[#00b074] block">
                                                {topTag ? `${topTag.total_contactos || 0} contacto` : '0 contactos'}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="w-14 h-8 text-amber-500 shrink-0 self-end mb-0.5">
                                        <svg className="w-full h-full" viewBox="0 0 64 32" fill="none">
                                            <path d="M2 26 C 18 26, 28 24, 40 20 C 50 16, 56 12, 62 6" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                                        </svg>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Barra de Búsqueda y Herramientas */}
                        <div className="mb-6 flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
                            <div className="relative flex-1 min-w-[280px]">
                                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Buscar por nombre de tag..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full h-11 rounded-xl border border-slate-200/90 bg-white pl-10 pr-4 text-xs font-medium text-slate-700 placeholder:text-slate-400 outline-none focus:border-[#00b074]/40 focus:ring-2 focus:ring-[#00b074]/10 transition-all shadow-2xs"
                                />
                                {searchTerm && (
                                    <button
                                        type="button"
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                                    >
                                        <X size={14} />
                                    </button>
                                )}
                            </div>

                            <div className="flex flex-wrap items-center justify-end gap-2.5">
                                {(searchTerm || selectedColorFilter !== 'Todos') && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setSearchTerm('');
                                            setSelectedColorFilter('Todos');
                                        }}
                                        className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border border-slate-200/80 bg-white px-3.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer shrink-0"
                                    >
                                        <RotateCcw size={14} />
                                        Limpiar todos los filtros
                                    </button>
                                )}

                                {/* Columnas Selector Dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowColumnsDropdown(!showColumnsDropdown)}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer shrink-0"
                                    >
                                        <Columns size={15} />
                                        Columnas
                                    </button>

                                    {showColumnsDropdown && (
                                        <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-slate-200 bg-white p-3 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-1">Mostrar Columnas</span>
                                            <div className="space-y-2">
                                                {Object.entries(visibleColumns).map(([colKey, isVisible]) => (
                                                    <label key={colKey} className="flex items-center gap-2.5 px-1 text-xs font-medium text-slate-700 cursor-pointer hover:text-slate-900">
                                                        <input
                                                            type="checkbox"
                                                            checked={isVisible}
                                                            onChange={() => setVisibleColumns(prev => ({ ...prev, [colKey]: !prev[colKey] }))}
                                                            className="rounded border-slate-300 text-[#00b074] focus:ring-[#00b074]"
                                                        />
                                                        <span className="capitalize">{colKey}</span>
                                                    </label>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Filtrar Dropdown */}
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() => setShowFilterDropdown(!showFilterDropdown)}
                                        className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200/80 bg-white px-4 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs cursor-pointer shrink-0"
                                    >
                                        <Filter size={15} />
                                        Filtrar
                                        {selectedColorFilter !== 'Todos' && (
                                            <span className="w-2 h-2 rounded-full bg-[#00b074]"></span>
                                        )}
                                    </button>

                                    {showFilterDropdown && (
                                        <div className="absolute right-0 top-12 z-30 w-48 rounded-xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-150">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2 px-2 pt-1">Filtrar por Color</span>
                                            {['Todos', 'Verde', 'Rojo', 'Azul', 'Amarillo', 'Violeta'].map(colorOpt => (
                                                <button
                                                    key={colorOpt}
                                                    type="button"
                                                    onClick={() => {
                                                        setSelectedColorFilter(colorOpt);
                                                        setShowFilterDropdown(false);
                                                    }}
                                                    className={`w-full text-left px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center justify-between transition ${selectedColorFilter === colorOpt ? 'bg-emerald-50 text-[#00b074]' : 'text-slate-600 hover:bg-slate-50'}`}
                                                >
                                                    {colorOpt}
                                                    {selectedColorFilter === colorOpt && <Check size={14} />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tabla de Tags */}
                        <section className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-2xs mb-5">
                            <div className="overflow-x-auto custom-scrollbar">
                                <table className="w-full text-left border-collapse min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-slate-100 bg-slate-50/50">
                                            <th className="w-12 px-4 py-3.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedIds.length > 0 && selectedIds.length === paginatedTags.length}
                                                    onChange={toggleSelectAll}
                                                    className="rounded border-slate-300 text-[#00b074] focus:ring-[#00b074] cursor-pointer"
                                                />
                                            </th>

                                            <th
                                                className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition"
                                                onClick={() => handleSort('nombre')}
                                            >
                                                <div className="flex items-center">
                                                    TAG
                                                    {renderSortIndicator('nombre')}
                                                </div>
                                            </th>

                                            {visibleColumns.descripcion && (
                                                <th
                                                    className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition"
                                                    onClick={() => handleSort('descripcion')}
                                                >
                                                    <div className="flex items-center">
                                                        DESCRIPCIÓN
                                                        {renderSortIndicator('descripcion')}
                                                    </div>
                                                </th>
                                            )}

                                            {visibleColumns.contactos && (
                                                <th
                                                    className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition"
                                                    onClick={() => handleSort('total_contactos')}
                                                >
                                                    <div className="flex items-center">
                                                        CONTACTOS
                                                        {renderSortIndicator('total_contactos')}
                                                    </div>
                                                </th>
                                            )}

                                            {visibleColumns.color && (
                                                <th
                                                    className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition"
                                                    onClick={() => handleSort('color')}
                                                >
                                                    <div className="flex items-center">
                                                        COLOR
                                                        {renderSortIndicator('color')}
                                                    </div>
                                                </th>
                                            )}

                                            {visibleColumns.creado && (
                                                <th
                                                    className="px-4 py-3.5 text-[11px] font-bold text-slate-400 uppercase tracking-wider cursor-pointer hover:text-slate-600 transition"
                                                    onClick={() => handleSort('creado_en')}
                                                >
                                                    <div className="flex items-center">
                                                        CREADO
                                                        {renderSortIndicator('creado_en')}
                                                    </div>
                                                </th>
                                            )}

                                            <th className="px-4 py-3.5 text-right text-[11px] font-bold text-slate-400 uppercase tracking-wider pr-6">
                                                ACCIONES
                                            </th>
                                        </tr>
                                    </thead>

                                    <tbody className="divide-y divide-slate-100/70">
                                        {loading ? (
                                            Array.from({ length: 3 }).map((_, i) => (
                                                <tr key={i} className="animate-pulse">
                                                    <td className="px-4 py-4 text-center"><div className="h-4 w-4 bg-slate-100 rounded mx-auto" /></td>
                                                    <td className="px-4 py-4"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                                                    <td className="px-4 py-4"><div className="h-4 w-48 bg-slate-100 rounded" /></td>
                                                    <td className="px-4 py-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                                                    <td className="px-4 py-4"><div className="h-4 w-16 bg-slate-100 rounded" /></td>
                                                    <td className="px-4 py-4"><div className="h-4 w-28 bg-slate-100 rounded" /></td>
                                                    <td className="px-4 py-4"></td>
                                                </tr>
                                            ))
                                        ) : paginatedTags.length > 0 ? (
                                            paginatedTags.map((tag) => (
                                                <tr key={tag.id} className="hover:bg-slate-50/70 transition-colors group">
                                                    <td className="px-4 py-3.5 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedIds.includes(tag.id)}
                                                            onChange={() => toggleSelectRow(tag.id)}
                                                            className="rounded border-slate-300 text-[#00b074] focus:ring-[#00b074] cursor-pointer"
                                                        />
                                                    </td>

                                                    <td className="px-4 py-3.5">
                                                        <div className="flex items-center gap-2.5">
                                                            <span className="w-2.5 h-2.5 rounded-full shrink-0 shadow-2xs" style={{ backgroundColor: tag.color || '#22C55E' }}></span>
                                                            <span className="font-bold text-slate-800 text-xs tracking-tight">{tag.nombre}</span>
                                                        </div>
                                                    </td>

                                                    {visibleColumns.descripcion && (
                                                        <td className="px-4 py-3.5">
                                                            <span className="text-slate-500 text-xs font-normal max-w-sm block truncate">
                                                                {tag.descripcion || '-'}
                                                            </span>
                                                        </td>
                                                    )}

                                                    {visibleColumns.contactos && (
                                                        <td className="px-4 py-3.5">
                                                            {tag.total_contactos > 0 ? (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#e6f7f0] text-[#00b074] rounded-full text-xs font-bold">
                                                                    <Users size={13} className="text-[#00b074]" />
                                                                    {tag.total_contactos} {tag.total_contactos === 1 ? 'contacto' : 'contactos'}
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-100 text-slate-500 rounded-full text-xs font-bold">
                                                                    <Users size={13} className="text-slate-400" />
                                                                    0 contactos
                                                                </span>
                                                            )}
                                                        </td>
                                                    )}

                                                    {visibleColumns.color && (
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex items-center gap-2">
                                                                <span className="w-2.5 h-2.5 rounded-full shadow-2xs" style={{ backgroundColor: tag.color || '#22C55E' }}></span>
                                                                <span className="text-xs font-medium text-slate-600">
                                                                    {getColorName(tag.color)}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    )}

                                                    {visibleColumns.creado && (
                                                        <td className="px-4 py-3.5">
                                                            <div className="flex items-center gap-1.5 text-xs text-slate-400 font-medium">
                                                                <Calendar size={13} className="text-slate-400" />
                                                                <span>
                                                                    {tag.creado_en ? new Date(tag.creado_en).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                                </span>
                                                            </div>
                                                        </td>
                                                    )}

                                                    <td className="px-4 py-3.5 text-right pr-5">
                                                        <div className="inline-flex items-center gap-2 justify-end">
                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedTag(tag);
                                                                    setFormData({ nombre: tag.nombre, descripcion: tag.descripcion || '', color: tag.color });
                                                                    setShowEditModal(true);
                                                                }}
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-[#00965e] hover:bg-emerald-50 hover:border-emerald-100 transition cursor-pointer"
                                                                title="Editar tag"
                                                            >
                                                                <Edit2 size={15} />
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() => {
                                                                    setSelectedTag(tag);
                                                                    setShowDeleteModal(true);
                                                                }}
                                                                className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-400 hover:text-rose-600 hover:bg-rose-50 hover:border-rose-100 transition cursor-pointer"
                                                                title="Eliminar tag"
                                                            >
                                                                <Trash2 size={15} />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-16 text-center">
                                                    <div className="flex flex-col items-center justify-center">
                                                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-300 mb-3 border border-slate-100">
                                                            <TagIcon size={24} />
                                                        </div>
                                                        <h3 className="font-bold text-slate-800 text-sm">No se encontraron registros</h3>
                                                        <p className="text-slate-400 text-xs font-medium mt-1">Intenta ajustar tu búsqueda o crea un nuevo tag.</p>
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </section>

                        {/* Paginación y Contador */}
                        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-1 mb-8">
                            <div className="flex items-center gap-3 text-slate-500 text-xs font-bold">
                                {filteredTags.length === 0 ? (
                                    <span>No se encontraron registros</span>
                                ) : (
                                    <span>Mostrando {Math.min((page - 1) * limit + 1, filteredTags.length)} a {Math.min(page * limit, filteredTags.length)} de {filteredTags.length} registros</span>
                                )}
                            </div>

                            {filteredTags.length > 0 && (
                                <div className="flex items-center justify-end gap-3">
                                    <button
                                        type="button"
                                        disabled={page === 1}
                                        onClick={() => setPage(page - 1)}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                                    >
                                        Anterior
                                    </button>
                                    <span className="w-7 h-7 rounded-full bg-[#00965e] text-white font-bold text-xs flex items-center justify-center shadow-xs">
                                        {page}
                                    </span>
                                    <button
                                        type="button"
                                        disabled={page === totalPages}
                                        onClick={() => setPage(page + 1)}
                                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition cursor-pointer"
                                    >
                                        Siguiente
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* 2 Secciones Inferiores: Consejos para usar tags y Actividad reciente */}
                    <div className="mt-auto pt-4 grid grid-cols-1 md:grid-cols-2 gap-5">
                        {/* Consejos para usar tags */}
                        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-emerald-50/20 p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.08)] transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Lightbulb size={16} className="text-[#00b074]" />
                                    Consejos para usar tags
                                </h2>
                                <ul className="space-y-3">
                                    <li className="flex items-start gap-2.5 text-xs text-slate-600 font-medium leading-relaxed">
                                        <CheckCircle2 size={15} className="text-[#00b074] shrink-0 mt-0.5" />
                                        <span>Usa tags para segmentar y organizar tus contactos fácilmente.</span>
                                    </li>
                                    <li className="flex items-start gap-2.5 text-xs text-slate-600 font-medium leading-relaxed">
                                        <CheckCircle2 size={15} className="text-[#00b074] shrink-0 mt-0.5" />
                                        <span>Las tags te ayudan a personalizar tus campañas y mensajes.</span>
                                    </li>
                                    <li className="flex items-start gap-2.5 text-xs text-slate-600 font-medium leading-relaxed">
                                        <CheckCircle2 size={15} className="text-[#00b074] shrink-0 mt-0.5" />
                                        <span>Puedes aplicar múltiples tags a un mismo contacto.</span>
                                    </li>
                                </ul>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowMoreInfoModal(true)}
                                className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#00965e] hover:text-[#008251] transition cursor-pointer w-fit"
                            >
                                Más información <ArrowRight size={14} />
                            </button>
                        </div>

                        {/* Actividad reciente */}
                        <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-white via-white to-blue-50/20 p-5 sm:p-6 shadow-[0_4px_20px_-2px_rgba(15,23,42,0.03)] hover:shadow-[0_12px_28px_-4px_rgba(15,23,42,0.08)] transition-all duration-300 flex flex-col justify-between">
                            <div>
                                <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-4 flex items-center gap-2">
                                    <Activity size={16} className="text-[#00b074]" />
                                    Actividad reciente
                                </h2>
                                <div className="space-y-3">
                                    {activities.slice(0, 3).map(act => (
                                        <div key={act.id} className="flex items-center justify-between text-xs font-medium text-slate-600">
                                            <div className="flex items-center gap-2.5 truncate">
                                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: act.color || '#00b074' }}></span>
                                                <span className="truncate">{act.texto}</span>
                                            </div>
                                            <span className="text-[11px] font-bold text-[#00965e] bg-emerald-50/80 px-2 py-0.5 rounded-md shrink-0 ml-2">
                                                {act.usuario}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <button
                                type="button"
                                onClick={() => setShowActivitiesModal(true)}
                                className="mt-5 inline-flex items-center gap-1.5 text-xs font-bold text-[#00965e] hover:text-[#008251] transition cursor-pointer w-fit"
                            >
                                Ver todas las actividades <ArrowRight size={14} />
                            </button>
                        </div>
                    </div>

                </div>
            </main>

            {/* --- MODALES FUNCIONALES --- */}

            {/* Modal Crear Tag */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Crear Tag">
                <form onSubmit={handleCreateTag} className="space-y-5">
                    <p className="text-xs text-slate-500 font-medium leading-relaxed">
                        Asigna el nombre de la etiqueta con la que agruparás tus contactos, en base a acciones o segmentos.
                    </p>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre del tag<span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            placeholder="Ej: Interesado_Perfume"
                            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-[#00b074] focus:ring-2 focus:ring-[#00b074]/10 transition"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Descripción (opcional)</label>
                        <textarea
                            rows={3}
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            placeholder="Ej: Clientes interesados en promociones de temporada."
                            className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-[#00b074] focus:ring-2 focus:ring-[#00b074]/10 transition resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Color del tag</label>
                        <div className="flex flex-wrap gap-2.5 pt-1">
                            {PALETTE_COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: c })}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition border-2 cursor-pointer ${formData.color === c ? 'border-slate-800 scale-110 shadow-xs' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                >
                                    {formData.color === c && <Check size={14} className="text-white" strokeWidth={3} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3">
                        <button
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-[#00965e] hover:bg-[#008251] text-xs font-bold text-white transition shadow-sm cursor-pointer"
                        >
                            Guardar Tag
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Editar Tag */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar Tag">
                <form onSubmit={handleUpdateTag} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre del tag<span className="text-rose-500">*</span></label>
                        <input
                            type="text"
                            required
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value })}
                            className="w-full h-10 px-3.5 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-[#00b074] focus:ring-2 focus:ring-[#00b074]/10 transition"
                        />
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Descripción</label>
                        <textarea
                            rows={3}
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                            className="w-full p-3 rounded-xl border border-slate-200 text-xs font-medium text-slate-700 outline-none focus:border-[#00b074] focus:ring-2 focus:ring-[#00b074]/10 transition resize-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Color del tag</label>
                        <div className="flex flex-wrap gap-2.5 pt-1">
                            {PALETTE_COLORS.map(c => (
                                <button
                                    key={c}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, color: c })}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition border-2 cursor-pointer ${formData.color === c ? 'border-slate-800 scale-110 shadow-xs' : 'border-transparent hover:scale-105'}`}
                                    style={{ backgroundColor: c }}
                                >
                                    {formData.color === c && <Check size={14} className="text-white" strokeWidth={3} />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-2.5 pt-3">
                        <button
                            type="button"
                            onClick={() => setShowEditModal(false)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            className="px-5 py-2 rounded-xl bg-[#00965e] hover:bg-[#008251] text-xs font-bold text-white transition shadow-sm cursor-pointer"
                        >
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Modal Eliminar Tag */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="¿Eliminar Tag?">
                <div className="space-y-5">
                    <p className="text-xs font-medium text-slate-600 leading-relaxed">
                        ¿Estás seguro de que deseas eliminar la etiqueta <span className="font-bold text-slate-900">"{selectedTag?.nombre}"</span>? Esta acción removerá la etiqueta de los contactos asociados.
                    </p>

                    <div className="flex justify-end gap-2.5 pt-2">
                        <button
                            type="button"
                            onClick={() => setShowDeleteModal(false)}
                            className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cancelar
                        </button>
                        <button
                            type="button"
                            onClick={handleDeleteTag}
                            className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-xs font-bold text-white transition shadow-sm cursor-pointer"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Más Información */}
            <Modal isOpen={showMoreInfoModal} onClose={() => setShowMoreInfoModal(false)} title="Guía de Uso de Tags" maxWidth="max-w-lg">
                <div className="space-y-4">
                    <div className="p-4 bg-emerald-50/60 rounded-xl border border-emerald-100/80">
                        <h4 className="text-xs font-bold text-[#008251] flex items-center gap-1.5 mb-1.5">
                            <Sparkles size={15} /> ¿Qué son las etiquetas en GeoChat?
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed font-medium">
                            Las etiquetas te permiten categorizar a tus contactos según su comportamiento, preferencias o estado en el embudo de ventas para realizar envíos altamente personalizados.
                        </p>
                    </div>

                    <div className="space-y-2.5">
                        <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Casos de uso sugeridos</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-600 font-medium">
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="font-bold text-slate-800 block mb-0.5">🟢 Intereses de producto</span>
                                Tag "Interesado_Perfume" para clientes que consultaron por ofertas de fragancias.
                            </div>
                            <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                <span className="font-bold text-slate-800 block mb-0.5">🔴 Atención Urgente</span>
                                Tag "URGENTE" para tickets prioritarios que requieren atención directa.
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end pt-2">
                        <button
                            type="button"
                            onClick={() => setShowMoreInfoModal(false)}
                            className="px-5 py-2 rounded-xl bg-[#00965e] hover:bg-[#008251] text-xs font-bold text-white transition shadow-sm cursor-pointer"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Modal Historial de Actividades */}
            <Modal isOpen={showActivitiesModal} onClose={() => setShowActivitiesModal(false)} title="Historial Completo de Actividades" maxWidth="max-w-lg">
                <div className="space-y-4">
                    <div className="max-h-72 overflow-y-auto custom-scrollbar space-y-3 pr-1">
                        {activities.map(act => (
                            <div key={act.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: act.color || '#00b074' }}></span>
                                    <div>
                                        <p className="text-xs font-bold text-slate-800">{act.texto}</p>
                                        <span className="text-[11px] text-slate-400 font-medium">{act.fecha}</span>
                                    </div>
                                </div>
                                <span className="text-[11px] font-bold text-[#00965e] bg-emerald-50 px-2 py-1 rounded-lg shrink-0">
                                    {act.usuario}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end pt-2 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => setShowActivitiesModal(false)}
                            className="px-5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50 transition cursor-pointer"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </Modal>

        </div>
    );
};

export default Tags;
