import React, { useState, useEffect } from 'react';
import { 
    Layout, MoreVertical, Plus, User as UserIcon, Calendar, 
    MessageSquare, Trash2, X, AlertCircle, FileText, ChevronDown,
    Bell, RefreshCw, BarChart3, Search, Filter 
} from 'lucide-react';
import Sidebar from './Sidebar';

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
        <div className="flex h-screen bg-[#f8fafc] font-sans selection:bg-indigo-100 overflow-hidden">
            <Sidebar user={user} onLogout={onLogout} />
            
            <div className="flex-1 ml-20 lg:ml-24 flex flex-col min-w-0">
                {/* Header Premium Limpio */}
                <header className="h-[72px] bg-[#1e1e2d] text-white flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/90 rounded-full p-1.5 w-11 h-11 flex items-center justify-center shadow-lg shadow-black/30 shrink-0">
                            <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[20px] font-black tracking-tight uppercase leading-none text-white/95">GeoCHAT</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => fetchTableros()}
                            className="h-10 w-10 rounded-full flex items-center justify-center text-white/75 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            <RefreshCw size={18} className={loading && tableros.length === 0 ? 'animate-spin' : ''} />
                        </button>
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-[#5d5fef] flex items-center justify-center text-sm font-black text-white">
                                {user?.nombre?.charAt(0) || 'W'}
                            </div>
                            <div className="hidden sm:block max-w-[140px]">
                                <p className="truncate text-[14px] font-bold text-white leading-tight">{user?.nombre || 'Wendy'}</p>
                                <p className="text-[11px] text-white/45 font-medium">{user?.rol || 'admin'}</p>
                            </div>
                        </div>
                    </div>
                </header>

                <div className="p-8 pb-0 shrink-0">
                    <div className="flex items-center justify-between mb-2">
                        <h1 className="text-[28px] font-black tracking-tight text-slate-800">Tableros</h1>
                        <button 
                            onClick={() => setShowCreateModal(true)}
                            className="bg-[#5d5fef] hover:bg-[#4a4ce0] text-white px-5 py-2.5 rounded-lg text-sm font-black shadow-lg shadow-indigo-100 transition-all flex items-center gap-2 active:scale-95"
                        >
                            <Plus size={18} />
                            Nuevo tablero
                        </button>
                    </div>
                    <p className="text-[15px] text-slate-400 font-medium mb-6">Organiza tus contactos en columnas por tags y personaliza su flujo según tus necesidades.</p>
                </div>

                {/* Tabs de Tableros - Directamente debajo del texto */}
                {tableros.length > 0 && (
                    <div className="px-8 flex items-center gap-1 shrink-0 z-10 border-b border-slate-100">
                        {tableros.map(t => (
                            <div key={t.id} className="relative flex items-center group">
                                <button 
                                    onClick={() => setTableroActivo(t.id)}
                                    className={`px-4 py-3 text-sm font-bold transition-all border-b-2 flex items-center gap-2 whitespace-nowrap ${
                                        tableroActivo === t.id 
                                        ? 'border-[#5d5fef] text-[#5d5fef]' 
                                        : 'border-transparent text-slate-400 hover:text-slate-600'
                                    }`}
                                >
                                    {t.nombre}
                                </button>
                                {tableroActivo === t.id && (
                                    <div className="relative">
                                        <button 
                                            onClick={(e) => { e.stopPropagation(); setShowOptions(!showOptions); }}
                                            className="p-1 hover:bg-slate-100 rounded-md transition-colors text-slate-400"
                                        >
                                            <MoreVertical size={14} />
                                        </button>
                                        
                                        {showOptions && (
                                            <div className="absolute top-full left-0 mt-1 w-32 bg-white border border-slate-100 shadow-xl rounded-lg z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                                                <button 
                                                    onClick={() => { 
                                                        setEditBoardName(t.nombre); 
                                                        setShowEditModal(true); 
                                                        setShowOptions(false); 
                                                    }}
                                                    className="w-full text-left px-3 py-2 text-[12px] font-bold text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                                                >
                                                    <FileText size={14}/> Editar
                                                </button>
                                                <button 
                                                    onClick={() => { setShowDeleteModal(true); setShowOptions(false); }}
                                                    className="w-full text-left px-3 py-2 text-[12px] font-bold text-rose-500 hover:bg-rose-50 flex items-center gap-2"
                                                >
                                                    <Trash2 size={14}/> Eliminar
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}

                <main className="flex-1 overflow-x-auto p-8 relative flex flex-col min-h-0">
                    {loading ? (
                        /* CARGA INTERNA SUAVE */
                        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                            <div className="w-10 h-10 border-4 border-[#5d5fef] border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-400 font-bold uppercase tracking-tighter text-[10px]">Cargando tablero...</p>
                        </div>
                    ) : tableros.length === 0 ? (
                        /* ESTADO VACÍO ESTILO WHALINKS */
                        <div className="flex-1 flex flex-col items-center justify-center -mt-20">
                            <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-300">
                                <Layout size={28} />
                            </div>
                            <h2 className="text-[20px] font-black text-slate-800 mb-2">Tu tablero está vacío</h2>
                            <p className="text-slate-400 text-[14px] text-center max-w-sm mb-8 font-medium">
                                Crea tu primer tablero personalizado para empezar a organizar tus contactos por etapas de venta.
                            </p>
                            <button 
                                onClick={() => setShowCreateModal(true)}
                                className="bg-[#5d5fef] text-white px-8 py-3.5 rounded-lg text-[14px] font-black hover:bg-[#4a4ce0] shadow-xl shadow-indigo-100 transition-all flex items-center gap-2"
                            >
                                <Plus size={20} />
                                Crear mi primer tablero
                            </button>
                        </div>
                    ) : (
                        /* KANBAN VIEW */
                        <div className="flex gap-6 items-start h-full pb-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            {columnas.map(col => (
                                <div key={col.id} className="w-[320px] flex flex-col shrink-0 max-h-full">
                                    <div className="flex items-center justify-between mb-5 px-1">
                                        <div className="flex items-center gap-3">
                                            <div className="w-2.5 h-2.5 rounded-full bg-[#5d5fef] shadow-[0_0_8px_rgba(93,95,239,0.5)]" />
                                            <h3 className="font-black text-slate-800 text-[13px] uppercase tracking-wider">{col.nombre}</h3>
                                            <span className="bg-slate-100 px-2 py-0.5 rounded-md text-[10px] font-black text-slate-500">
                                                {col.items?.length || 0}
                                            </span>
                                        </div>
                                        <button className="text-slate-300 hover:text-slate-500"><MoreVertical size={16}/></button>
                                    </div>

                                    <div className="space-y-4 overflow-y-auto px-1 pb-4 custom-scrollbar flex-1 min-h-0">
                                        {col.items && col.items.map(ct => (
                                            <div key={ct.id} className="bg-white p-5 rounded-xl shadow-sm border border-slate-100 hover:border-indigo-200 hover:shadow-lg transition-all group cursor-grab active:cursor-grabbing">
                                                <div className="flex items-center gap-4 mb-4">
                                                    <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-lg flex items-center justify-center text-[#5d5fef] font-black text-[13px] uppercase shrink-0">
                                                        {(ct.nombre || 'C').charAt(0)}
                                                    </div>
                                                    <div className="min-w-0">
                                                        <h4 className="font-black text-slate-800 text-[14px] truncate leading-tight">{ct.nombre || ct.telefono}</h4>
                                                        <p className="text-[11px] text-slate-400 font-bold mt-0.5">Activo hoy</p>
                                                    </div>
                                                </div>
                                                
                                                <div className="pt-4 border-t border-slate-50 flex items-center justify-between gap-4">
                                                    <div className="flex items-center gap-2 text-slate-500 min-w-0">
                                                        <MessageSquare size={14} className="shrink-0 text-slate-300" />
                                                        <span className="text-[11px] font-medium truncate pt-0.5 leading-none">{ct.ultimo_mensaje || 'Sin mensajes'}</span>
                                                    </div>
                                                    <div className="px-2 py-1 bg-slate-50 rounded text-[9px] font-black text-slate-400 border border-slate-100">WA</div>
                                                </div>
                                            </div>
                                        ))}
                                        <button className="w-full py-3.5 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center gap-2 text-slate-400 hover:text-[#5d5fef] hover:border-indigo-200 transition-all font-black text-[11px] uppercase tracking-widest mt-2 hover:bg-white group">
                                            <Plus size={16} className="group-hover:scale-110 transition-transform" />
                                            Mover aquí
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
                            className="flex-1 py-3.5 rounded-2xl bg-[#5d5fef] text-white font-black hover:bg-[#4a4ce0] shadow-lg shadow-indigo-100 transition-all"
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
                            className="h-11 w-full rounded-md border border-slate-200 bg-white px-4 text-[15px] outline-none transition-all focus:border-[#5d5fef] focus:ring-4 focus:ring-indigo-50 font-semibold"
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
                            className="flex-1 py-3.5 rounded-2xl bg-[#5d5fef] text-white font-black hover:bg-[#4a4ce0] shadow-lg shadow-indigo-100 transition-all"
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
