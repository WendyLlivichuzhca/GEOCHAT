import React, { useState, useEffect } from 'react';
import { 
    Layout, MoreVertical, Plus, User as UserIcon, Calendar, 
    MessageSquare, Trash2, X, AlertCircle, FileText, ChevronDown,
    Bell, RefreshCw, BarChart3, Search, Filter, MessageCircle 
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
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors"><X size={20}/></button>
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
    
    // UI States
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showOptions, setShowOptions] = useState(false);
    const [newBoardName, setNewBoardName] = useState('');
    const [editBoardName, setEditBoardName] = useState('');
    const [error, setError] = useState(null);

    const getAuthToken = () => {
        const savedUser = JSON.parse(localStorage.getItem('geochat_user'));
        return savedUser?.token;
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
    }, []);

    useEffect(() => {
        if (tableroActivo) loadKanbanData(tableroActivo);
        else if (tableros.length === 0) setLoading(false);
    }, [tableroActivo]);

    const handleCreateBoard = async (e) => {
        e.preventDefault();
        if (!newBoardName.trim()) return;
        try {
            const response = await fetch(`${API_URL}/api/kanban/tableros`, {
                method: 'POST',
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
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
                headers: { 
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getAuthToken()}`
                },
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

    // --- RENDER ---

    return (
        <div className="flex h-screen bg-[#f0fdf9] font-sans selection:bg-emerald-200/50 overflow-hidden">
            <Sidebar user={user} onLogout={onLogout} />

            <div className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0">
                {/* Header */}
                <header className="h-[72px] bg-white rounded-3xl border border-[#d1fae5] shadow-sm flex items-center justify-between px-8 sticky top-0 z-50 shrink-0 mb-6">
                    <div className="flex items-center gap-4">
                        <div className="bg-[#ecfdf5] rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-[#a7f3d0] shrink-0">
                            <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => fetchTableros()} className="h-9 w-9 rounded-xl flex items-center justify-center text-[#9ca3af] hover:text-[#10b981] hover:bg-[#f0fdf9] transition-colors">
                            <RefreshCw size={17} className={loading && tableros.length === 0 ? 'animate-spin text-[#10b981]' : ''} />
                        </button>
                        <div className="flex items-center gap-3 border-l border-[#d1fae5] pl-4">
                            <div className="h-9 w-9 rounded-full bg-gradient-to-br from-[#10b981] to-[#0891b2] flex items-center justify-center text-sm font-black text-white shadow-sm">
                                {user?.nombre?.charAt(0) || 'W'}
                            </div>
                            <div className="hidden sm:block max-w-[140px]">
                                <p className="truncate text-[13px] font-bold text-[#134e4a] leading-tight">{user?.nombre || 'Wendy'}</p>
                                <p className="text-[11px] text-[#9ca3af] font-medium">{user?.rol || 'admin'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="px-2 pb-0 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-[24px] font-black tracking-tight text-[#134e4a]">Tableros</h1>
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-gradient-to-r from-[#10b981] to-[#0d9488] hover:from-[#059669] hover:to-[#0f766e] text-white px-5 py-2.5 rounded-xl text-sm font-black shadow-md shadow-emerald-200 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Plus size={17} /> Nuevo tablero
                        </button>
                    </div>
                    <p className="text-sm text-[#9ca3af] font-medium mb-5">Organiza tus contactos en columnas por etapas y personaliza su flujo.</p>
                </div>

                {/* Tabs */}
                {tableros.length > 0 && (
                    <div className="px-2 flex items-center gap-1 shrink-0 z-10 border-b border-[#d1fae5]">
                        {tableros.map(t => (
                            <div key={t.id} className="relative flex items-center group">
                                <button
                                    onClick={() => setTableroActivo(t.id)}
                                    className={`px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                                        tableroActivo === t.id
                                        ? 'border-[#10b981] text-[#059669]'
                                        : 'border-transparent text-[#9ca3af] hover:text-[#374151]'
                                    }`}
                                >
                                    {t.nombre}
                                </button>
                                {tableroActivo === t.id && (
                                    <div className="relative">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
                                            className="p-1 hover:bg-[#f0fdf9] rounded-md transition-colors text-[#9ca3af]"
                                        >
                                            <MoreVertical size={14} />
                                        </button>
                                        {showOptions && (
                                            <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-[#d1fae5] shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                <button
                                                    onClick={() => { setEditBoardName(t.nombre); setShowEditModal(true); setShowOptions(false); }}
                                                    className="w-full text-left px-3 py-2.5 text-[12px] font-bold text-[#374151] hover:bg-[#f0fdf9] flex items-center gap-2"
                                                >
                                                    <FileText size={13}/> Editar
                                                </button>
                                                <button
                                                    onClick={() => { setShowDeleteModal(true); setShowOptions(false); }}
                                                    className="w-full text-left px-3 py-2.5 text-[12px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2"
                                                >
                                                    <Trash2 size={13}/> Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <main className="flex-1 overflow-x-auto p-4 relative flex flex-col min-h-0">
                    {loading ? (
                        <div className="flex gap-5 items-start h-full pb-4">
                            {Array.from({ length: 4 }).map((_, colIdx) => (
                                <div key={colIdx} className="w-[300px] flex flex-col shrink-0">
                                    <div className="skeleton h-5 w-28 rounded-full mb-4 mx-1" />
                                    {Array.from({ length: 3 }).map((_, cardIdx) => (
                                        <SkeletonKanbanCard key={cardIdx} />
                                    ))}
                                </div>
                            ))}
                        </div>
                    ) : tableros.length === 0 ? (
                        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#ecfdf5] border border-[#a7f3d0] text-[#10b981]">
                                <Layout size={26} />
                            </div>
                            <h2 className="text-xl font-black text-[#134e4a] mb-2">Tu tablero está vacío</h2>
                            <p className="text-[#9ca3af] text-sm text-center max-w-sm mb-8 font-medium">
                                Crea tu primer tablero para organizar tus contactos por etapas de venta.
                            </p>
                            <button
                                onClick={() => setShowCreateModal(true)}
                                className="bg-gradient-to-r from-[#10b981] to-[#0d9488] text-white px-8 py-3 rounded-xl text-sm font-black hover:from-[#059669] hover:to-[#0f766e] shadow-md shadow-emerald-200 transition-all flex items-center gap-2"
                            >
                                <Plus size={18} /> Crear mi primer tablero
                            </button>
                        </div>
                    ) : (
                        <div className="flex gap-5 items-start h-full pb-4 animate-in fade-in slide-in-from-bottom-2 duration-400">
                            {columnas.map((col) => (
                                <div key={col.id} className="w-[300px] flex flex-col shrink-0 max-h-full">
                                    <div className="flex items-center justify-between mb-4 px-1 shrink-0">
                                        <div className="flex items-center gap-2.5">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#10b981]" />
                                            <h3 className="font-black text-[#134e4a] text-[13px] uppercase tracking-wide">{col.nombre}</h3>
                                            <span className="bg-[#ecfdf5] px-2 py-0.5 rounded-md text-[10px] font-black text-[#059669] border border-[#a7f3d0]">
                                                {col.items?.length || 0}
                                            </span>
                                        </div>
                                        <button className="text-[#9ca3af] hover:text-[#10b981] transition-colors p-1">
                                            <MoreVertical size={15}/>
                                        </button>
                                    </div>

                                    <div className="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar min-h-[150px]">
                                        {col.items && col.items.length > 0 ? (
                                            col.items.map((ct) => (
                                                <div key={ct.id} className="bg-white border border-[#d1fae5] rounded-2xl p-4 group cursor-grab active:cursor-grabbing hover:border-[#10b981] hover:shadow-sm transition-all">
                                                    <div className="flex items-center gap-3 mb-3">
                                                        <div className="w-9 h-9 bg-gradient-to-br from-[#d1fae5] to-[#cffafe] border border-[#a7f3d0] rounded-xl flex items-center justify-center text-[#059669] font-black text-sm uppercase shrink-0">
                                                            {(ct.nombre || 'C').charAt(0)}
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h4 className="font-black text-[#134e4a] text-sm truncate leading-tight group-hover:text-[#10b981] transition-colors">{ct.nombre || ct.telefono}</h4>
                                                            <p className="text-[10px] text-[#9ca3af] font-medium mt-0.5">Activo hoy</p>
                                                        </div>
                                                    </div>
                                                    <div className="pt-3 border-t border-[#f0fdf9] flex items-center justify-between gap-3">
                                                        <div className="flex items-center gap-2 text-[#9ca3af] min-w-0">
                                                            <MessageCircle size={13} className="shrink-0 text-[#10b981]" />
                                                            <span className="text-[11px] font-medium truncate">{ct.ultimo_mensaje || 'Sin mensajes'}</span>
                                                        </div>
                                                        <span className="px-2 py-0.5 bg-[#ecfdf5] rounded text-[8px] font-black text-[#059669] border border-[#a7f3d0]">WA</span>
                                                    </div>
                                                </div>
                                            ))
                                        ) : (
                                            <div className="py-10 border-2 border-dashed border-[#a7f3d0] rounded-2xl flex flex-col items-center justify-center text-center bg-[#f9fffe]">
                                                <Plus size={20} className="mb-1.5 text-[#a7f3d0]" />
                                                <p className="text-[10px] font-black uppercase tracking-widest text-[#9ca3af]">Vacío</p>
                                            </div>
                                        )}

                                        <button className="w-full py-3.5 border-2 border-dashed border-[#a7f3d0] rounded-xl flex items-center justify-center gap-2 text-[#9ca3af] hover:text-[#10b981] hover:border-[#10b981] hover:bg-[#f0fdf9] transition-all font-bold text-[11px] uppercase tracking-wide mt-2 group">
                                            <Plus size={14} className="group-hover:scale-110 transition-transform" /> Mover aquí
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </main>
            </div>

            {/* --- MODALES --- */}

            {/* Crear Tablero */}
            <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Crear nuevo tablero">
                <form onSubmit={handleCreateBoard} className="space-y-6">
                    <p className="text-sm text-slate-500 font-medium leading-relaxed">
                        Crea un tablero personalizado donde puedes configurar tus propias columnas y organizar tus contactos.
                    </p>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del tablero</label>
                        <input 
                            autoFocus
                            value={newBoardName}
                            onChange={(e) => setNewBoardName(e.target.value)}
                            className="w-full px-5 py-4 rounded-2xl border border-slate-200 outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-400 transition-all font-medium text-slate-700"
                            placeholder="Ej: Ventas Inmobiliario"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={() => setShowCreateModal(false)}
                            className="flex-1 py-3.5 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-3.5 rounded-2xl bg-[#10b981] text-white font-black hover:bg-[#059669] shadow-lg shadow-emerald-100 transition-all"
                        >
                            Crear
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Editar Tablero */}
            <Modal isOpen={showEditModal} onClose={() => setShowEditModal(false)} title="Editar nombre del tablero">
                <form onSubmit={handleEditBoard} className="space-y-6">
                    <p className="text-[15px] text-slate-500 font-medium leading-relaxed">
                        Ingresa el nuevo nombre para este tablero. Los cambios se guardarán instantáneamente.
                    </p>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nombre del tablero</label>
                        <input 
                            autoFocus
                            value={editBoardName}
                            onChange={(e) => setEditBoardName(e.target.value)}
                            className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-[15px] outline-none transition-all focus:border-[#10b981] focus:ring-4 focus:ring-emerald-50 font-semibold"
                            placeholder="Ej: Nuevo nombre de ventas"
                        />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <button 
                            type="button"
                            onClick={() => setShowEditModal(false)}
                            className="flex-1 py-3.5 rounded-2xl border border-slate-200 font-black text-slate-500 hover:bg-slate-50 transition-all"
                        >
                            Cancelar
                        </button>
                        <button 
                            type="submit"
                            className="flex-1 py-3.5 rounded-2xl bg-[#10b981] text-white font-black hover:bg-[#059669] shadow-lg shadow-emerald-100 transition-all"
                        >
                            Guardar cambios
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Eliminar Tablero */}
            <Modal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} title="¿Estás seguro de que deseas eliminar este tablero?">
                <div className="space-y-6">
                    <div className="flex gap-4 p-4 bg-rose-50 rounded-2xl border border-rose-100">
                        <AlertCircle className="text-rose-500 shrink-0" size={24} />
                        <p className="text-sm text-rose-700 leading-relaxed font-medium">
                            Esta acción no afecta la información de tus contactos, tags ni automatizaciones. Solo se eliminará la vista personalizada de este tablero.
                        </p>
                    </div>
                    <div className="flex gap-3">
                        <button 
                            onClick={() => setShowDeleteModal(false)}
                            className="flex-1 py-3.5 rounded-2xl border border-slate-200 font-bold text-slate-500 hover:bg-slate-50"
                        >
                            Cancelar
                        </button>
                        <button 
                            onClick={handleDeleteBoard}
                            className="flex-1 py-3.5 rounded-2xl bg-rose-500 text-white font-bold hover:bg-rose-600 shadow-xl shadow-rose-100"
                        >
                            Eliminar
                        </button>
                    </div>
                </div>
            </Modal>

            <style>{`
                .custom-scrollbar::-webkit-scrollbar { width: 6px; height: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #cbd5e1; }
            `}</style>
        </div>
    );
};

export default Tableros;
