import React, { useEffect, useState, useMemo } from 'react';
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
  Loader2,
  Users,
  UserCheck,
  Zap,
  Sparkles
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
  const agentesActivosCount = useMemo(() => miembros.filter(m => m.rol === 'agente').length, [miembros]);
  const visoresCount = useMemo(() => miembros.filter(m => m.rol === 'visor').length, [miembros]);
  const slotsDisponibles = Math.max(0, totalSlotsAdicionales - slotsUsados);

  return (
    <div className="flex min-h-screen bg-transparent font-sans selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-24 mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col min-w-0 space-y-5">

          {/* Cabecera Principal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Agentes Humanos</h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
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
              className={`h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 transition-all shadow-xs ${slotsUsados >= totalSlotsAdicionales
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200/80'
                  : 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95'
                }`}
            >
              <UserPlus size={15} />
              <span>Agregar Colaborador</span>
            </button>
          </div>

          {/* 4 Tarjetas KPI Resumen Superior (Tonos Pastel con Bordes de Color de Impacto) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
            
            {/* KPI 1: Ranuras Usadas */}
            <div className="rounded-2xl border-t-4 border-t-indigo-500 border-x border-b border-indigo-100/70 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/50 p-4 shadow-2xs transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900/60">Ranuras Usadas</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-xs">
                  <Users size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-indigo-950">{slotsUsados}</span>
                <span className="text-xs font-bold text-slate-400">de {totalSlotsAdicionales} límite</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Accesos multiagente creados</p>
            </div>

            {/* KPI 2: Agentes de Soporte */}
            <div className="rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-emerald-100/70 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50/50 p-4 shadow-2xs transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900/60">Agentes Activos</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                  <Shield size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-emerald-600">{agentesActivosCount}</span>
                <span className="text-xs font-bold text-slate-400">agentes</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Con permiso de chatear</p>
            </div>

            {/* KPI 3: Visores de Lectura */}
            <div className="rounded-2xl border-t-4 border-t-blue-500 border-x border-b border-blue-100/70 bg-gradient-to-br from-blue-50/70 via-white to-slate-50/50 p-4 shadow-2xs transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-900/60">Visores</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500 text-white shadow-xs">
                  <Eye size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-blue-600">{visoresCount}</span>
                <span className="text-xs font-bold text-slate-400">visores</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Acceso de solo lectura</p>
            </div>

            {/* KPI 4: Ranuras Disponibles */}
            <div className="rounded-2xl border-t-4 border-t-amber-500 border-x border-b border-amber-100/70 bg-gradient-to-br from-amber-50/70 via-white to-slate-50/50 p-4 shadow-2xs transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900/60">Ranuras Libres</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Zap size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-amber-600">{slotsDisponibles}</span>
                <span className="text-xs font-bold text-slate-400">disponibles</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Cupo libre en tu plan</p>
            </div>

          </div>

          {/* Banner de Estado y Alertas */}
          {(error || successMsg) && (
            <div className="space-y-2 shrink-0">
              {error && (
                <div className="rounded-xl bg-rose-50 border border-rose-200/80 px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-rose-700 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={15} className="shrink-0" />
                    <span>{error}</span>
                  </div>
                  <button onClick={() => setError(null)} className="hover:text-rose-900 transition p-0.5">
                    <X size={14} />
                  </button>
                </div>
              )}

              {successMsg && !error && (
                <div className="rounded-xl bg-emerald-50 border border-emerald-200/80 px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-emerald-800 shadow-2xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={15} className="shrink-0" />
                    <span>{successMsg}</span>
                  </div>
                  <button onClick={() => setSuccessMsg(null)} className="hover:text-emerald-950 transition p-0.5">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Listado de Miembros y Tabla */}
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-slate-100/90 bg-white shadow-2xs overflow-hidden">
            
            {/* Barra de Filtros y Búsqueda */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40 shrink-0">
              <div className="relative max-w-sm w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-10 pr-4 bg-white border border-slate-200/80 rounded-xl outline-none focus:border-emerald-500/50 text-xs font-medium text-slate-700 placeholder:text-slate-400 transition shadow-2xs"
                />
              </div>

              <div className="text-[11px] font-semibold text-slate-400">
                Mostrando <span className="font-extrabold text-slate-700">{filteredMiembros.length}</span> colaboradores
              </div>
            </div>

            {/* Tabla Principal */}
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Loader2 size={28} className="animate-spin text-emerald-500 mb-2.5" />
                <span className="text-xs font-bold text-slate-400">Cargando la lista de agentes humanos...</span>
              </div>
            ) : filteredMiembros.length === 0 ? (
              <div className="flex-1 p-6 flex items-center justify-center bg-slate-50/30">
                
                {/* Hero Card Estado Vacío */}
                <div className="relative w-full max-w-lg rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-8 text-center shadow-xs overflow-hidden">
                  
                  {/* Resplandor decorativo de fondo */}
                  <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-200/30 blur-2xl pointer-events-none" />
                  <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-teal-200/30 blur-2xl pointer-events-none" />

                  {/* Icono central de gran impacto */}
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/25">
                    <UserPlus size={28} />
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800">Crea tu Equipo de Agentes Humanos</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Asigna accesos a tu equipo de soporte para chatear con tus clientes en tiempo real y brindar atención multiagente simultánea.
                  </p>

                  {/* Chips de Características */}
                  <div className="my-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs border border-slate-100">
                      <Shield size={13} className="text-emerald-500" /> Control de Roles
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs border border-slate-100">
                      <Zap size={13} className="text-amber-500" /> Chat en Tiempo Real
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs border border-slate-100">
                      <Users size={13} className="text-indigo-500" /> Multiagente
                    </span>
                  </div>

                  {/* Botón de Llamada a la Acción */}
                  <button
                    type="button"
                    onClick={() => {
                      setError(null);
                      setSuccessMsg(null);
                      setShowModal(true);
                    }}
                    disabled={slotsUsados >= totalSlotsAdicionales}
                    className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-2 transition-all shadow-xs active:scale-95 disabled:opacity-50"
                  >
                    <UserPlus size={16} />
                    <span>Agregar Primer Colaborador</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">COLABORADOR</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">CORREO ELECTRÓNICO</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">ROL Y PERMISOS</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">FECHA DE REGISTRO</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {filteredMiembros.map((miembro) => (
                      <tr key={miembro.id} className="hover:bg-slate-50/50 transition-colors group">
                        
                        {/* Nombre del Colaborador */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100/60 flex items-center justify-center font-extrabold text-xs uppercase shadow-2xs">
                              {miembro.nombre.charAt(0)}
                            </div>
                            <span className="text-xs font-bold text-slate-800">{miembro.nombre}</span>
                          </div>
                        </td>

                        {/* Correo Electrónico */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-600">
                          {miembro.correo}
                        </td>

                        {/* Rol y Permisos */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-bold ${miembro.rol === 'agente'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200/60'
                              : 'bg-blue-50 text-blue-700 border-blue-200/60'
                            }`}>
                            {miembro.rol === 'agente' ? <Shield size={12} /> : <Eye size={12} />}
                            <span>{miembro.rol === 'agente' ? 'Agente de Soporte' : 'Visor (Solo Lectura)'}</span>
                          </span>
                        </td>

                        {/* Fecha de Registro */}
                        <td className="px-4 py-3 whitespace-nowrap text-xs font-medium text-slate-400">
                          {new Date(miembro.creado_en).toLocaleDateString()}
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(miembro.id)}
                            className="h-8 w-8 rounded-lg border border-slate-200/80 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all inline-flex items-center justify-center shadow-2xs"
                            title="Eliminar colaborador"
                          >
                            <Trash2 size={14} />
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
          <div className="bg-white w-full max-w-md rounded-2xl overflow-hidden border border-slate-100 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-5 right-5 p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700"
            >
              <X size={16} />
            </button>

            <div className="px-6 pt-6 pb-4 bg-slate-50/60 border-b border-slate-100">
              <h3 className="text-sm font-extrabold text-slate-800">
                Agregar Nuevo Colaborador
              </h3>
              <p className="text-xs font-medium text-slate-400 mt-0.5">
                Asigna las credenciales de acceso para tu equipo humano.
              </p>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Nombre Completo<span className="text-rose-500 ml-0.5">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium text-xs text-slate-700 placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Correo Electrónico<span className="text-rose-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="email"
                    required
                    placeholder="correo@empresa.com"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full pl-10 pr-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium text-xs text-slate-700 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Contraseña de Acceso<span className="text-rose-500 ml-0.5">*</span>
                </label>
                <div className="relative">
                  <Lock size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  <input
                    type="password"
                    required
                    placeholder="Mínimo 6 caracteres"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium text-xs text-slate-700 placeholder:text-slate-400 shadow-2xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block">
                  Rol y Permisos<span className="text-rose-500 ml-0.5">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => setRol('agente')}
                    className={`p-3 border rounded-xl text-left transition-all flex flex-col justify-between h-20 ${rol === 'agente'
                        ? 'border-emerald-500 bg-emerald-50/40 text-emerald-700'
                        : 'border-slate-200/80 bg-slate-50 hover:bg-slate-100/50 text-slate-600'
                      }`}
                  >
                    <Shield size={16} />
                    <div>
                      <p className="text-xs font-bold">Agente de Soporte</p>
                      <p className="text-[10px] font-medium text-slate-400 leading-none mt-0.5">Escribe y responde</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRol('visor')}
                    className={`p-3 border rounded-xl text-left transition-all flex flex-col justify-between h-20 ${rol === 'visor'
                        ? 'border-blue-500 bg-blue-50/40 text-blue-700'
                        : 'border-slate-200/80 bg-slate-50 hover:bg-slate-100/50 text-slate-600'
                      }`}
                  >
                    <Eye size={16} />
                    <div>
                      <p className="text-xs font-bold">Visor de Lectura</p>
                      <p className="text-[10px] font-medium text-slate-400 leading-none mt-0.5">Solo lectura</p>
                    </div>
                  </button>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="h-9 px-4 rounded-xl border border-slate-200/80 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-all shadow-2xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <UserPlus size={14} />
                      <span>Crear Colaborador</span>
                    </>
                  )}
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