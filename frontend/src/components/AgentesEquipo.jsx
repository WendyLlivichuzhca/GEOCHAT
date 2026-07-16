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
  UserPlus
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
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 pl-72 pr-6 py-6 min-w-0">
        <div className="max-w-[1400px] mx-auto space-y-6">
          
          {/* Cabecera */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm">
            <div>
              <h1 className="text-2xl font-black text-slate-800 tracking-tight">MIEMBROS DEL EQUIPO</h1>
              <p className="text-sm text-slate-400 font-semibold mt-1">
                Invita y administra los accesos multiagente para tu equipo de soporte humano.
              </p>
            </div>
            
            <button
              onClick={() => {
                setError(null);
                setSuccessMsg(null);
                setShowModal(true);
              }}
              disabled={slotsUsados >= totalSlotsAdicionales}
              className={`px-5 py-3 rounded-2xl font-bold text-sm flex items-center gap-2 transition-all shadow-md ${
                slotsUsados >= totalSlotsAdicionales
                  ? 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none border border-slate-200'
                  : 'bg-[#5d57db] text-white hover:bg-[#4943c2] hover:shadow-lg'
              }`}
            >
              <UserPlus size={16} />
              Agregar Colaborador
            </button>
          </div>

          {/* Estado de Slots y Alerts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-[2rem] p-6 border border-slate-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 flex items-center justify-center text-[#5d57db] border border-sky-100">
                <Activity size={20} />
              </div>
              <div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Capacidad del Plan</p>
                <h4 className="text-xl font-black text-slate-800 mt-1">
                  {slotsUsados} de {totalSlotsAdicionales} ranuras usadas
                </h4>
              </div>
            </div>

            {error && (
              <div className="md:col-span-2 bg-rose-50 border border-rose-100 rounded-[2rem] p-6 flex items-start gap-3 text-rose-700">
                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                <div className="text-sm font-semibold flex-1">
                  {error}
                </div>
                <button onClick={() => setError(null)} className="hover:text-rose-900">
                  <X size={16} />
                </button>
              </div>
            )}

            {successMsg && !error && (
              <div className="md:col-span-2 bg-emerald-50 border border-emerald-100 rounded-[2rem] p-6 flex items-start gap-3 text-emerald-700">
                <Activity size={20} className="shrink-0 mt-0.5" />
                <div className="text-sm font-semibold flex-1">
                  {successMsg}
                </div>
                <button onClick={() => setSuccessMsg(null)} className="hover:text-emerald-900">
                  <X size={16} />
                </button>
              </div>
            )}
          </div>

          {/* Listado de Miembros */}
          <div className="bg-white rounded-[2rem] border border-slate-100 shadow-sm overflow-hidden">
            {/* Filtros */}
            <div className="p-6 border-b border-slate-50 flex items-center justify-between gap-4">
              <div className="relative max-w-md w-full">
                <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                  <Search size={18} />
                </span>
                <input
                  type="text"
                  placeholder="Buscar colaborador por nombre o correo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 focus:border-sky-300 focus:bg-white rounded-2xl text-sm font-semibold text-slate-700 placeholder-slate-400 focus:outline-none transition-all"
                />
              </div>
            </div>

            {/* Tabla */}
            {isLoading ? (
              <div className="py-20 text-center text-slate-400 font-semibold">
                Cargando miembros del equipo...
              </div>
            ) : filteredMiembros.length === 0 ? (
              <div className="py-20 text-center text-slate-400 font-semibold">
                No se encontraron colaboradores agregados.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 text-[10px] font-black uppercase tracking-wider text-slate-400 border-b border-slate-100">
                      <th className="px-6 py-4">Nombre</th>
                      <th className="px-6 py-4">Correo</th>
                      <th className="px-6 py-4">Rol / Permisos</th>
                      <th className="px-6 py-4">Fecha de Alta</th>
                      <th className="px-6 py-4 text-right">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredMiembros.map((miembro) => (
                      <tr key={miembro.id} className="hover:bg-slate-50/30 transition-colors">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[#5d57db]/10 flex items-center justify-center text-[#5d57db] font-black text-sm uppercase">
                              {miembro.nombre.charAt(0)}
                            </div>
                            <span className="text-sm font-bold text-slate-800">{miembro.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-sm font-semibold text-slate-500">
                          {miembro.correo}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-black uppercase border ${
                            miembro.rol === 'agente'
                              ? 'bg-sky-50 border-sky-100 text-sky-700'
                              : 'bg-amber-50 border-amber-100 text-amber-700'
                          }`}>
                            {miembro.rol === 'agente' ? <Shield size={12} /> : <Eye size={12} />}
                            {miembro.rol === 'agente' ? 'Agente de Soporte' : 'Visor (Solo Lectura)'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-xs font-semibold text-slate-400">
                          {new Date(miembro.creado_en).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleDelete(miembro.id)}
                            className="p-2 text-slate-400 hover:text-red-500 rounded-xl hover:bg-red-50 transition-all"
                            title="Eliminar colaborador"
                          >
                            <Trash2 size={16} />
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
          <div className="bg-white w-full max-w-md rounded-[2.5rem] p-8 border border-slate-100 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-6 right-6 text-slate-400 hover:text-slate-600 transition-colors"
            >
              <X size={20} />
            </button>

            <h3 className="text-xl font-black text-slate-800 tracking-tight mb-2">
              Agregar Nuevo Colaborador
            </h3>
            <p className="text-xs text-slate-400 font-semibold mb-6">
              El colaborador recibirá los permisos asignados de inmediato.
            </p>

            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Nombre Completo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Juan Pérez"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 py-3 bg-slate-50 border border-slate-100 focus:border-sky-300 focus:bg-white rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 focus:border-sky-300 focus:bg-white rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
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
                    className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 focus:border-sky-300 focus:bg-white rounded-2xl text-sm font-semibold text-slate-700 focus:outline-none transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-2">
                  Rol y Permisos
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRol('agente')}
                    className={`p-4 border rounded-2xl text-left transition-all flex flex-col justify-between min-h-[90px] ${
                      rol === 'agente'
                        ? 'border-[#5d57db] bg-sky-50/50 text-[#5d57db]'
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50 text-slate-500'
                    }`}
                  >
                    <Shield size={18} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">Agente</p>
                      <p className="text-[9px] font-semibold text-slate-400 mt-0.5 leading-tight">
                        Escribe y responde
                      </p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setRol('visor')}
                    className={`p-4 border rounded-2xl text-left transition-all flex flex-col justify-between min-h-[90px] ${
                      rol === 'visor'
                        ? 'border-[#5d57db] bg-sky-50/50 text-[#5d57db]'
                        : 'border-slate-100 bg-slate-50 hover:bg-slate-100/50 text-slate-500'
                    }`}
                  >
                    <Eye size={18} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide">Visor</p>
                      <p className="text-[9px] font-semibold text-slate-400 mt-0.5 leading-tight">
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
                  className="w-full py-3.5 bg-[#5d57db] text-white hover:bg-[#4943c2] disabled:bg-slate-300 rounded-2xl font-bold text-sm transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2"
                >
                  {isSaving ? 'Guardando...' : 'Crear Colaborador'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
