
import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Trash2,
  FileText,
  AlertCircle,
  CheckCircle,
  X,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
  Loader2
} from 'lucide-react';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function CustomFields({ user, onLogout }) {
  const [fields, setFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState(null);

  // Modal state
  const [nombre, setNombre] = useState('');
  const [tipo, setTipo] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [alertModalMessage, setAlertModalMessage] = useState('');

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/campos-customizados?user_id=${user.id}`, {
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error('Error al cargar campos');
      const data = await res.json();
      setFields(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!nombre || !tipo) return;

    console.log("DEBUG: Creating field. User object:", user);
    console.log("DEBUG: Token being sent:", user?.token);

    setIsSaving(true);
    try {
      const res = await fetch(`${API_URL}/api/campos-customizados`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user.token}`
        },
        body: JSON.stringify({ usuario_id: user.id, nombre, tipo })
      });
      if (!res.ok) throw new Error('Error al crear el campo');

      setShowModal(false);
      setNombre('');
      setTipo('');
      loadFields();
    } catch (err) {
      setError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('¿Estás seguro de eliminar este campo?')) return;
    try {
      const res = await fetch(`${API_URL}/api/campos-customizados/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user.token}` }
      });
      if (!res.ok) throw new Error('Error al eliminar');
      loadFields();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredFields = fields.filter(f =>
    f.nombre.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-transparent font-sans">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-[21rem] mr-4 mt-3 mb-3 flex h-[calc(100vh-24px)] flex-1 flex-col overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-7 pb-8 pt-7 flex flex-col min-w-0">

          {/* Titulo y Botón */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-xl font-bold text-slate-800">Campos Customizados</h1>
              <p className="text-[13px] text-slate-400 font-medium mt-1">Crea campos personalizados para ampliar la información de tus contactos.</p>
            </div>
            <button
              onClick={() => setShowModal(true)}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-xl font-semibold text-[13px] flex items-center gap-1.5 shadow-xs transition-all active:scale-95 h-10"
            >
              <Plus size={16} /> Crear campo
            </button>
          </div>

          {/* Barra de búsqueda y Filtro */}
          <div className="flex gap-4 mb-6">
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar por nombre"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-11 pr-4 h-10 bg-slate-50 border border-slate-100 hover:border-slate-200 rounded-xl outline-none focus:bg-white focus:border-emerald-500/30 transition shadow-xs text-[12px] font-normal text-slate-700"
              />
            </div>
            <button className="flex items-center gap-1.5 px-4 h-10 bg-white border border-slate-200/85 rounded-xl text-slate-500 font-bold text-xs hover:bg-slate-50 transition shadow-xs">
              <Filter size={14} /> Filtrar
            </button>
          </div>

          {/* Tabla */}
          <div className="flex-1 overflow-y-auto min-h-0 border border-slate-150 rounded-2xl mb-4 overflow-hidden shadow-xs bg-white">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-150 bg-slate-50/85 text-[10px] font-bold uppercase tracking-wider text-slate-450">
                    <th className="px-6 py-4 rounded-tl-2xl">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" className="rounded border-slate-200 text-emerald-500 focus:ring-emerald-500/30 h-4 w-4 transition-colors cursor-pointer" />
                        <span>Nombre</span>
                        <span className="inline-flex items-center justify-center p-0.5 rounded-md ml-1 bg-emerald-50 text-emerald-600 border border-emerald-100/50">
                          <ChevronDown size={11} />
                        </span>
                      </div>
                    </th>
                    <th className="px-6 py-4">Tipo</th>
                    <th className="px-6 py-4 text-right rounded-tr-2xl">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    <tr>
                      <td colSpan="3" className="px-6 py-20 text-center">
                        <div className="flex flex-col items-center gap-3">
                          <Loader2 size={32} className="animate-spin text-emerald-500" />
                          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Cargando campos...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredFields.length > 0 ? (
                    filteredFields.map((field) => (
                      <tr key={field.id} className="border-b border-slate-100 hover:bg-slate-50/40 transition duration-150 last:border-b-0 group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <input type="checkbox" className="rounded border-slate-200 text-emerald-500 focus:ring-emerald-500/30 h-4 w-4 transition-colors cursor-pointer" />
                            <span className="text-[13px] font-bold text-slate-700">{field.nombre}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-50 text-slate-500 border border-slate-200/50">
                            {field.tipo}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(field.id)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-150 text-slate-400 hover:text-rose-500 hover:bg-rose-50 hover:border-rose-100 transition duration-150 opacity-40 group-hover:opacity-100"
                            title="Eliminar campo"
                          >
                            <Trash2 size={15} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="p-0">
                        <div className="flex min-h-[340px] flex-col items-center justify-center text-center p-8">
                          <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-3xl flex items-center justify-center border border-emerald-100/50 mb-5 shadow-xs">
                            <FileText size={28} />
                          </div>
                          <h3 className="text-[14px] font-bold text-slate-800">No hay campos personalizados</h3>
                          <p className="text-[11px] text-slate-400 mt-1.5 max-w-xs leading-normal font-medium">
                            Comienza creando tu primer campo personalizado para guardar información adicional de tus contactos.
                          </p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer tabla */}
            <div className="mt-auto px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Mostrando {filteredFields.length} de {fields.length} registros
              </span>
            </div>
          </div>
        </div>
      </main>

      {/* Modal Crear Campo */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>

          <div className="relative bg-white rounded-3xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
            {/* Header Modal */}
            <div className="px-8 pt-8 pb-4 flex justify-between items-start bg-slate-50/50 border-b border-slate-100/60">
              <div>
                <h2 className="text-sm font-bold text-slate-800 mb-1">Crear campo personalizado</h2>
                <p className="text-[11px] text-slate-400">Asigna el nombre y el tipo de campo para ampliar la información de tus contactos.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={16} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-8 pb-8 pt-6 space-y-5">
              {/* Input Nombre */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold text-slate-450 uppercase tracking-wider">Nombre*</label>
                  <span className="text-[10px] text-slate-300">{nombre.length}/50</span>
                </div>
                <input
                  type="text"
                  maxLength={50}
                  required
                  placeholder="Escribe el nombre del campo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 transition-all font-medium text-[12px] text-slate-700 placeholder:text-slate-350"
                />
              </div>

              {/* Select Tipo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-455 uppercase tracking-wider px-1">Tipo de campo personalizado*</label>
                <div className="relative">
                  <select
                    required
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-4 h-11 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:bg-white focus:border-emerald-500/30 appearance-none font-medium text-[12px] text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="" disabled>Selecciona una opción</option>
                    <option value="Texto">Texto</option>
                    <option value="Numérico">Numérico</option>
                    <option value="Fecha">Fecha</option>
                    <option value="URL">URL</option>
                    <option value="Alfanumérico">Alfanumérico</option>
                  </select>
                  <ChevronDown size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-11 border border-slate-200 text-slate-500 font-bold rounded-2xl hover:bg-slate-100 transition-all active:scale-95 bg-white text-[12px]"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={!nombre || !tipo || isSaving}
                  className={`flex-1 h-11 font-bold rounded-2xl transition-all active:scale-95 text-white bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-200 text-[12px] ${!nombre || !tipo || isSaving
                      ? 'cursor-not-allowed opacity-50'
                      : 'shadow-xs'
                    }`}
                >
                  {isSaving ? 'Creando...' : 'Crear Campo'}
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