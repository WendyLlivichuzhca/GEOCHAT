import React, { useState, useEffect } from 'react';
import { 
    Tag as TagIcon, Plus, Search, Filter, MoreVertical, 
    Trash2, Edit2, X, AlertCircle, Check, ChevronDown,
    Layout, MessageSquare, User as UserIcon, Calendar,
    RefreshCw, BarChart3
} from 'lucide-react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

const COLORS = [
    '#EF4444', '#F87171', '#FCA5A5', '#F97316', '#FACC15', 
    '#F59E0B', '#84CC16', '#22C55E', '#34D399', '#10B981',
    '#0D9488', '#06B6D4', '#3B82F6', '#2563EB', '#6366F1',
    '#8B5CF6', '#A855F7', '#D946EF', '#EC4899', '#F472B6',
    '#F2F2F7', '#E5E7EB', '#94A3B8', '#1E293B'
];

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-md rounded-[1.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="px-6 py-5 flex justify-between items-center border-b border-slate-100">
                    <h3 className="font-black text-slate-800 text-xl tracking-tight">{title}</h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors p-1 hover:bg-slate-50 rounded-lg">
                        <X size={20}/>
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
    
    // UI States
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [selectedTag, setSelectedTag] = useState(null);
    
    // Form States
    const [formData, setFormData] = useState({
        nombre: '',
        descripcion: '',
        color: '#EF4444'
    });

    const getAuthToken = () => {
        const savedUser = JSON.parse(localStorage.getItem('geochat_user') || '{}');
        const token = savedUser?.token || localStorage.getItem('geochat_token');
        if (!token) console.warn("KANBAN: No se encontró token en localStorage");
        return token;
    };

    const fetchTags = async () => {
        setLoading(true);
        try {
            const response = await fetch(`${API_URL}/api/tags`, {
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const res = await response.json();
            if (res.success) setTags(res.tags);
        } catch (err) { console.error("Error al cargar tags:", err); }
        finally { setLoading(false); }
    };

    useEffect(() => { fetchTags(); }, []);

    const handleCreateTag = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim()) return;
        try {
            const response = await fetch(`${API_URL}/api/tags`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(formData)
            });
            const res = await response.json();
            if (res.success) {
                setShowCreateModal(false);
                setFormData({ nombre: '', descripcion: '', color: '#EF4444' });
                fetchTags();
            }
        } catch (err) { alert("Error al crear"); }
    };

    const handleUpdateTag = async (e) => {
        e.preventDefault();
        if (!formData.nombre.trim() || !selectedTag) return;
        try {
            const response = await fetch(`${API_URL}/api/tags/${selectedTag.id}`, {
                method: 'PUT',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
                body: JSON.stringify(formData)
            });
            const res = await response.json();
            if (res.success) {
                setShowEditModal(false);
                fetchTags();
            }
        } catch (err) { alert("Error al actualizar"); }
    };

    const handleDeleteTag = async () => {
        if (!selectedTag) return;
        try {
            const response = await fetch(`${API_URL}/api/tags/${selectedTag.id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getAuthToken()}` }
            });
            const res = await response.json();
            if (res.success) {
                setShowDeleteModal(false);
                fetchTags();
            }
        } catch (err) { alert("Error al eliminar"); }
    };

    const filteredTags = tags.filter(t => 
        t.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.descripcion || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="flex h-screen bg-[#f8fafc] font-sans selection:bg-emerald-200/50 overflow-hidden">
            <Sidebar user={user} onLogout={onLogout} />

            <div className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-[72px] bg-white rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between px-8 sticky top-0 z-50 shrink-0 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-emerald-50 rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-emerald-100 shrink-0">
                            <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={fetchTags} className="h-9 w-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 transition-colors">
                            <RefreshCw size={17} className={loading ? 'animate-spin text-emerald-500' : ''} />
                        </button>
                        <div className="flex items-center gap-3 border-l border-slate-100 pl-4">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-sm font-black text-white shadow-sm">
                                {user?.nombre?.charAt(0) || 'W'}
                            </div>
                            <div className="hidden sm:block max-w-[140px]">
                                <p className="truncate text-[13px] font-bold text-slate-800 leading-tight">{user?.nombre || 'Wendy'}</p>
                                <p className="text-[11px] text-slate-400 font-medium">{user?.rol || 'admin'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="px-2 pb-0 shrink-0">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                        <div>
                            <h1 className="text-[26px] font-black tracking-tight text-slate-800">Tags</h1>
                            <p className="text-sm text-slate-400 font-medium mt-1">Crea etiquetas para agrupar a tus contactos, en base a acciones o segmentos.</p>
                        </div>
                        <button
                            onClick={() => {
                                setFormData({ nombre: '', descripcion: '', color: '#EF4444' });
                                setShowCreateModal(true);
                            }}
                            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-6 py-3 rounded-xl text-sm font-black shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 active:scale-95 whitespace-nowrap"
                        >
                            <Plus size={18} strokeWidth={3} /> Crear Tag
                        </button>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 mt-6 mb-8">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Buscar por nombre"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full pl-11 pr-4 py-3 bg-white border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 transition-all font-medium text-slate-700 shadow-sm"
                            />
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button className="flex-1 sm:flex-none px-4 py-3 text-slate-400 hover:text-emerald-600 font-bold text-sm transition-colors whitespace-nowrap">
                                Limpiar todos los filtros
                            </button>
                            <button className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-white border border-slate-100 rounded-2xl text-slate-600 font-bold text-sm shadow-sm hover:bg-slate-50 transition-all">
                                <Filter size={16} /> Filtrar
                            </button>
                        </div>
                    </div>
                    
                    <div className="mb-6">
                        <p className="text-[15px] font-black text-slate-800 tracking-tight">Total de Tags {tags.length}</p>
                    </div>
                </div>

                <div className="flex-1 bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col mb-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-50 bg-slate-50/30">
                                    <th className="px-6 py-4 w-12"><input type="checkbox" className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" /></th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600 transition-colors">
                                            Nombre <ChevronDown size={14} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Descripción</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">Contactos</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest text-center">Color</th>
                                    <th className="px-6 py-4 text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                        <div className="flex items-center gap-1 cursor-pointer hover:text-slate-600 transition-colors">
                                            Creado <ChevronDown size={14} />
                                        </div>
                                    </th>
                                    <th className="px-6 py-4 w-16"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-50">
                                {loading ? (
                                    Array.from({ length: 3 }).map((_, i) => (
                                        <tr key={i} className="animate-pulse">
                                            <td className="px-6 py-5"><div className="h-4 w-4 bg-slate-100 rounded" /></td>
                                            <td className="px-6 py-5"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                                            <td className="px-6 py-5"><div className="h-4 w-48 bg-slate-100 rounded" /></td>
                                            <td className="px-6 py-5"><div className="h-4 w-12 bg-slate-100 rounded mx-auto" /></td>
                                            <td className="px-6 py-5"><div className="h-6 w-6 bg-slate-100 rounded-full mx-auto" /></td>
                                            <td className="px-6 py-5"><div className="h-4 w-32 bg-slate-100 rounded" /></td>
                                            <td className="px-6 py-5"></td>
                                        </tr>
                                    ))
                                ) : filteredTags.length > 0 ? (
                                    filteredTags.map((tag) => (
                                        <tr key={tag.id} className="hover:bg-slate-50/50 transition-colors group">
                                            <td className="px-6 py-5"><input type="checkbox" className="rounded border-slate-300 text-emerald-500 focus:ring-emerald-500" /></td>
                                            <td className="px-6 py-5">
                                                <span className="font-bold text-slate-700 text-[13px]">{tag.nombre}</span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-slate-400 text-[13px] font-medium truncate max-w-xs block">{tag.descripcion || '-'}</span>
                                            </td>
                                            <td className="px-6 py-5 text-center">
                                                <span className="inline-flex items-center justify-center px-2.5 py-1 bg-slate-100 text-slate-600 rounded-lg text-[12px] font-black">
                                                    {tag.total_contactos || 0}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="w-5 h-5 rounded-full mx-auto shadow-sm border border-white" style={{ backgroundColor: tag.color }} />
                                            </td>
                                            <td className="px-6 py-5">
                                                <span className="text-slate-400 text-[13px] font-medium">
                                                    {tag.creado_en ? new Date(tag.creado_en).toLocaleString('es-ES', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '-'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-5">
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedTag(tag);
                                                            setFormData({ nombre: tag.nombre, descripcion: tag.descripcion || '', color: tag.color });
                                                            setShowEditModal(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-lg transition-all"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button 
                                                        onClick={() => {
                                                            setSelectedTag(tag);
                                                            setShowDeleteModal(true);
                                                        }}
                                                        className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-20 text-center">
                                            <div className="flex flex-col items-center justify-center">
                                                <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200 mb-4 border border-slate-100">
                                                    <TagIcon size={32} />
                                                </div>
                                                <h3 className="font-black text-slate-800 text-lg">No se encontraron registros</h3>
                                                <p className="text-slate-400 text-sm font-medium mt-1">Intenta ajustar tu búsqueda o crea un nuevo tag.</p>
                                            </div>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="mt-auto px-6 py-4 border-t border-slate-50 bg-slate-50/10 flex items-center justify-between">
                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                            Mostrando {filteredTags.length} de {tags.length} registros
                        </p>
                    </div>
                </div>
            </div>

            {/* --- MODALES --- */}

            {/* Crear Tag */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Crear tag">
                <form onSubmit={handleCreateTag} className="space-y-6">
                    <p className="text-sm text-slate-400 font-medium leading-relaxed">
                        Asigna el nombre de la etiqueta con la que agruparás tus contactos, en base a acciones o segmentos.
                    </p>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Nombre del tag<span className="text-rose-500">*</span></label>
                            <span className="text-[10px] font-bold text-slate-300">{formData.nombre.length}/100</span>
                        </div>
                        <input 
                            autoFocus
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                            maxLength={100}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 transition-all font-bold text-slate-700 text-sm"
                            placeholder="Escribe el nombre"
                        />
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between items-center ml-1">
                            <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Descripción (opcional)</label>
                            <span className="text-[10px] font-bold text-slate-300">{formData.descripcion.length}/500</span>
                        </div>
                        <textarea 
                            value={formData.descripcion}
                            onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                            maxLength={500}
                            rows={4}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 transition-all font-bold text-slate-700 text-sm resize-none"
                            placeholder="Escribe una descripción"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Color del tag</label>
                        <div className="grid grid-cols-8 gap-2 pb-2">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({...formData, color})}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border-2 ${
                                        formData.color === color ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: color }}
                                >
                                    {formData.color === color && <Check size={14} className={color === '#F2F2F7' || color === '#E5E7EB' ? 'text-slate-800' : 'text-white'} strokeWidth={4} />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="flex-1 py-4 rounded-2xl border border-slate-100 font-black text-slate-400 text-sm hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
                        >
                            Guardar Tag
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Editar Tag */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar tag">
                <form onSubmit={handleUpdateTag} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del tag</label>
                        <input 
                            autoFocus
                            value={formData.nombre}
                            onChange={(e) => setFormData({...formData, nombre: e.target.value})}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 transition-all font-bold text-slate-700 text-sm"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Descripción</label>
                        <textarea 
                            value={formData.descripcion}
                            onChange={(e) => setFormData({...formData, descripcion: e.target.value})}
                            rows={3}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:ring-4 focus:ring-emerald-50 focus:border-emerald-200 transition-all font-bold text-slate-700 text-sm resize-none"
                        />
                    </div>
                    <div className="space-y-3">
                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest ml-1">Color del tag</label>
                        <div className="grid grid-cols-8 gap-2">
                            {COLORS.map(color => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData({...formData, color})}
                                    className={`w-7 h-7 rounded-full flex items-center justify-center transition-all border-2 ${
                                        formData.color === color ? 'border-slate-800 scale-110' : 'border-transparent hover:scale-105'
                                    }`}
                                    style={{ backgroundColor: color }}
                                >
                                    {formData.color === color && <Check size={14} className={color === '#F2F2F7' || color === '#E5E7EB' ? 'text-slate-800' : 'text-white'} strokeWidth={4} />}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={() => setShowEditModal(false)}
                            className="flex-1 py-4 rounded-2xl border border-slate-100 font-black text-slate-400 text-sm hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-4 rounded-2xl bg-emerald-500 text-white font-black text-sm hover:bg-emerald-600 shadow-lg shadow-emerald-100 transition-all"
                        >
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Eliminar Tag */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="¿Eliminar tag?">
                <div className="space-y-6">
                    <div className="flex gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <AlertCircle className="text-rose-500 shrink-0" size={24} />
                        <p className="text-sm text-rose-700 leading-relaxed font-medium">
                            ¿Estás seguro de que deseas eliminar la etiqueta <span className="font-black">"{selectedTag?.nombre}"</span>? Esta acción quitará la etiqueta de todos los contactos asociados.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1 py-4 rounded-2xl border border-slate-100 font-black text-slate-400 text-sm hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleDeleteTag}
                            className="flex-1 py-4 rounded-2xl bg-rose-500 text-white font-black text-sm hover:bg-rose-600 shadow-xl shadow-rose-100"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>

            <style>{`
                .geopulse-text-gradient {
                    background: linear-gradient(to right, #10b981, #06b6d4, #3b82f6);
                    -webkit-background-clip: text;
                    -webkit-text-fill-color: transparent;
                }
            `}</style>
        </div>
    );
};

export default Tags;
