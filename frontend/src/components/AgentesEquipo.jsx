import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Trash2,
  AlertCircle,
  X,
  Shield,
  Eye,
  Activity,
  Mail,
  Lock,
  UserPlus,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2
} from 'lucide-react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function AgentesEquipo({ user, onLogout }) {
  const [miembros, setMiembros] = useState([]);
  const [planLimits, setPlanLimits] = useState({ max_accesos: 1 });
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  // Modal form state
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [password, setPassword] = useState('');
  const [rol, setRol] = useState('agente');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModalMessage, setAlertModalMessage] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // 1. Cargar colaboradores
      const resMiembros = await fetch(`${API_URL}/api/miembros`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!resMiembros.ok) throw new Error('Error al cargar la lista de colaboradores');
      const dataMiembros = await resMiembros.json();
      setMiembros(dataMiembros.miembros || []);

      // 2. Cargar límites de plan desde el dashboard
      const resDash = await fetch(`${API_URL}/api/dashboard/${user.id}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (resDash.ok) {
        const dataDash = await resDash.json();
        const maxAccesos = dataDash.dashboard?.plan?.limits?.accesos_multiagente || dataDash.dashboard?.plan?.limits?.agentes || 1;
        setPlanLimits({ max_accesos: maxAccesos });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nombre || !correo || !password || !rol) return;

    setIsSaving(true);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/miembros`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ nombre, correo, password, rol })
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Error al agregar el colaborador');

      setSuccessMsg('Colaborador añadido exitosamente');
      setNombre('');
      setCorreo('');
      setPassword('');
      setRol('agente');
      setShowModal(false);
      loadData();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (miembroId) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este colaborador? Perderá el acceso inmediatamente.')) return;
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`${API_URL}/api/miembros/${miembroId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Error al eliminar al colaborador');

      setSuccessMsg('Colaborador eliminado exitosamente');
      loadData();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredMiembros = miembros.filter(m =>
    m.nombre.toLowerCase().includes(search.toLowerCase()) ||
    m.correo.toLowerCase().includes(search.toLowerCase())
  );

  // Límite de colaboradores adicionales permitidos (Límite total - 1 de la cuenta admin principal)
  const totalSlotsAdicionales = planLimits.max_accesos - 1;
  const slotsUsados = miembros.length;

  return (
    <div className="flex min-h-screen bg-transparent font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-[21rem] mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-7 flex flex-col min-w-0 space-y-6">

          {/* Cabecera */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Miembros del Equipo</h1>
              <p className="text-[13px] text-slate-400 font-medium mt-1">
                Invita y administra los accesos multiagente para tu equipo de soporte humano.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setShowModal(true);
              }}
              disabled={slotsUsados >= totalSlotsAdicionales}
              className={`px-4 h-10 rounded-xl font-semibold text-[13px] flex items-center gap-1.5 transition-all shadow-xs ${slotsUsados >= totalSlotsAdicionales
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
                  : 'bg-emerald-500 text-white hover:bg-emerald-600 active:scale-95'
                }`}
            >
              <UserPlus size={16} />
              Agregar Colaborador
            </button>
          </div>

          {/* Estado de Slots y Alerts */}
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 flex items-center gap-3 w-fit min-w-[240px] shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-500 border border-emerald-100/50 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Capacidad del Plan</p>
                <h4 className="text-[14px] font-bold text-slate-800 mt-0.5">
                  {slotsUsados} de {totalSlotsAdicionales} ranuras usadas
                </h4>
              </div>
            </div>

            <div className="flex-1 w-full space-y-2">
              {error && (
                <div className="bg-rose-50/50 border border-rose-100/50 rounded-xl p-3.5 flex items-start gap-3 text-rose-700 shadow-xs">
                  <AlertCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold flex-1 leading-normal">
                    {error}
                  </div>
                  <button onClick={() => setError(null)} className="hover:text-rose-900">
                    <X size={14} />
                  </button>
                </div>
              )}

              {successMsg && !error && (
                <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-xl p-3.5 flex items-start gap-3 text-emerald-700 shadow-xs">
                  <CheckCircle size={16} className="shrink-0 mt-0.5" />
                  <div className="text-xs font-semibold flex-1 leading-normal">
                    {successMsg}
                  </div>
                  <button onClick={() => setSuccessMsg(null)} className="hover:text-emerald-900">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Listado de Miembros */}
          <div className="bg-white rounded-2xl border border-slate-150 shadow-xs overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Filtros */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/20">
              <div className="relative max-w-sm w-full">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Search size={16} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar colaborador por nombre o correo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 h-10 bg-slate-50 border border-slate-100 focus:bg-white focus:border-emerald-500/30 rounded-xl text-[12px] font-normal text-slate-700 placeholder-slate-350 focus:outline-none transition shadow-xs"
                />
              </div>
            </div>

            {/* Tabla */}
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 min-h-[300px]">
                <Loader2 size={32} className="animate-spin text-emerald-500 mb-3" />
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cargando colaboradores...</span>
              </div>
            ) : filteredMiembros.length === 0 ? (
              <div className="p-0 flex-1 flex items-center justify-center">
                <div className="flex min-h-[340px] flex-col items-center justify-center text-center p-8">
                  <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center border border-emerald-100/50 mb-5 shadow-xs">
                    <UserPlus size={28} />
                  </div>
                  <h3 className="text-[14px] font-bold text-slate-800">No hay colaboradores agregados</h3>
                  <p className="text-[11px] text-slate-400 mt-1.5 max-w-xs leading-normal font-medium">
                    Invita a tu equipo de soporte para que puedan chatear con tus clientes.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/85 text-[10px] font-bold uppercase tracking-wider text-slate-450 border-b border-slate-150">
                      <th className="px-6 py-4 rounded-tl-2xl">Nombre</th>
                      <th className="px-6 py-4">Correo</th>
                      <th className="px-6 py-4">Rol / Permisos</th>
                      <th className="px-6 py-4">Fecha de Alta</th>
                      <th className="px-6 py-4 text-right rounded-tr-2xl">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMiembros.map((miembro) => (
                      <tr key={miembro.id} className="hover:bg-slate-50/40 transition duration-150 group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/50 flex items-center justify-center font-bold text-[13px] uppercase">
                              {miembro.nombre.charAt(0)}
                            </div>
                            <span className="text-[13px] font-bold text-slate-700">{miembro.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-[12px] font-medium text-slate-500">
                          {miembro.correo}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase border ${miembro.rol === 'agente'
                              ? 'bg-emerald-50/80 border-emerald-100/50 text-emerald-600'
                              : 'bg-slate-50 border-slate-200/50 text-slate-500'
                            }`}>
                            {miembro.rol === 'agente' ? <Shield size={11} /> : <Eye size={11} />}
                            {miembro.rol === 'agente' ? 'Agente de Soporte' : 'Visor (Solo Lectura)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-[11px] font-medium text-slate-400">
                          {new Date(miembro.creado_en).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(miembro.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-150 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition duration-150 opacity-40 group-hover:opacity-100"
                            title="Eliminar colaborador"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </main>

      {/* MODAL: Agregar Colaborador */}
      {showModal && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-md rounded-3xl overflow-hidden border border-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400 hover:text-slate-650"
            >
              <X size={16} />
            </button>

            <div className="px-8 pt-8 pb-4 bg-slate-50/50 border-b border-slate-100/60">
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Agregar Nuevo Colaborador
              </h3>
              <p className="text-[11px] text-slate-400">
                El colaborador recibiráá los permisos asignados de inmediato.
              </p>
            </div>

            <form onSubmit={handleCreate} className="px-8 pb-8 pt-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider block px-1">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition-all font-medium text-[12px] text-slate-700 placeholder:text-slate-350"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-455 uppercase tracking-wider block px-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="correo@empresa.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full pl-11 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition-all font-medium text-[12px] text-slate-700 placeholder:text-slate-350"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-455 uppercase tracking-wider block px-1">
                  Contraseña de Acceso
                </label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-3.5 text-slate-400" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-11 pr-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition-all font-medium text-[12px] text-slate-700 placeholder:text-slate-350"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-455 uppercase tracking-wider block px-1">
                  Rol y Permisos
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRol('agente')}
                    className={`p-3 border rounded-2xl text-left transition-all flex flex-col justify-between min-h-[84px] ${rol === 'agente'
                        ? 'border-emerald-500 bg-emerald-50/30 text-emerald-600'
                        : 'border-slate-150 bg-slate-50 hover:bg-slate-100/40 text-slate-500'
                      }`}
                  >
                    <Shield size={16} />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide">Agente</p>
                      <p className="text-[9px] font-medium text-slate-400 mt-0.5 leading-tight">
                        Escribe y responde
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRol('visor')}
                    className={`p-3 border rounded-2xl text-left transition-all flex flex-col justify-between min-h-[84px] ${rol === 'visor'
                        ? 'border-emerald-500 bg-emerald-50/30 text-emerald-600'
                        : 'border-slate-150 bg-slate-50 hover:bg-slate-100/40 text-slate-500'
                      }`}
                  >
                    <Eye size={16} />
                    <div>
                      <p className="text-[11px] font-bold uppercase tracking-wide">Visor</p>
                      <p className="text-[9px] font-medium text-slate-400 mt-0.5 leading-tight">
                        Solo Lectura
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full h-11 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 disabled:cursor-not-allowed rounded-2xl font-bold text-[12px] text-white transition-all shadow-xs flex items-center justify-center gap-1.5"
                >
                  {isSaving ? 'Guardando...' : 'Crear Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center mx-auto mb-4 text-xl">
              ❓
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1.5">{confirmModal.title}</h4>
            <p className="text-[12px] text-slate-500 leading-relaxed mb-6 font-medium">
              {confirmModal.message}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setConfirmModal(null)}
                className="flex-1 h-10 rounded-xl border border-slate-200 text-[12px] font-semibold text-slate-500 hover:bg-slate-100 transition bg-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  confirmModal.onConfirm();
                  setConfirmModal(null);
                }}
                className="flex-1 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold transition active:scale-95 shadow-xs"
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Alert Modal */}
      {alertModalMessage && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-sm shadow-2xl p-6 text-center animate-in fade-in zoom-in-95 duration-200 border border-slate-100">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-500 flex items-center justify-center mx-auto mb-4 text-xl">
              ⚠️
            </div>
            <h4 className="text-sm font-bold text-slate-800 mb-1.5">Atención</h4>
            <p className="text-[12px] text-slate-550 leading-relaxed mb-6 font-medium">
              {alertModalMessage}
            </p>
            <button
              type="button"
              onClick={() => setAlertModalMessage('')}
              className="w-full h-10 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-[12px] font-semibold transition active:scale-95 shadow-xs"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

    </div>
  );
}