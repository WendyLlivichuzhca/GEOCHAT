
import React, { useEffect, useState, useMemo } from 'react';
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
  Loader2,
  Hash,
  Calendar,
  Link as LinkIcon,
  Sliders,
  Layers,
  Sparkles,
  Tag
} from 'lucide-react';
import Sidebar from './Sidebar';
import Header from './Header';

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

  const textFieldsCount = useMemo(() => fields.filter(f => ['Texto', 'Alfanumérico'].includes(f.tipo)).length, [fields]);
  const numberFieldsCount = useMemo(() => fields.filter(f => f.tipo === 'Numérico').length, [fields]);
  const dateFieldsCount = useMemo(() => fields.filter(f => ['Fecha', 'URL'].includes(f.tipo)).length, [fields]);

  const getTypeIcon = (fieldType) => {
    switch (fieldType) {
      case 'Numérico': return <Hash size={13} className="text-blue-500" />;
      case 'Fecha': return <Calendar size={13} className="text-amber-500" />;
      case 'URL': return <LinkIcon size={13} className="text-purple-500" />;
      default: return <FileText size={13} className="text-emerald-500" />;
    }
  };

  return (
    <div className="flex min-h-screen bg-transparent font-sans selection:bg-emerald-200/50">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="ml-20 flex-1 h-screen flex flex-col min-w-0 overflow-hidden">
        <Header user={user} onLogout={onLogout} title="GeoChat" onRefresh={loadFields} isLoading={isLoading} />

        <div className="p-3.5 flex-1 flex flex-col min-h-0 overflow-hidden">
        <div className="flex-1 flex flex-col min-h-0 overflow-hidden rounded-2xl bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-100/50">
        <div className="flex-1 overflow-y-auto px-8 py-7 flex flex-col min-w-0 space-y-5">

          {/* Cabecera Principal */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0">
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">Campos Customizados</h1>
              <p className="text-xs font-semibold text-slate-400 mt-0.5">
                Crea campos personalizados para ampliar la información de tus contactos.
              </p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="h-9 px-4 rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white transition-all shadow-xs active:scale-95 shrink-0"
            >
              <Plus size={15} />
              <span>Crear campo</span>
            </button>
          </div>

          {/* 4 Tarjetas KPI Resumen Superior (Tonos Pastel con Bordes de Color de Impacto) */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 shrink-0">
            
            {/* KPI 1: Total Campos */}
            <div className="rounded-2xl border-t-4 border-t-indigo-500 border-x border-b border-indigo-100/70 bg-gradient-to-br from-indigo-50/70 via-white to-slate-50/50 p-4 shadow-2xs transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-indigo-900/60">Total Campos</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-500 text-white shadow-xs">
                  <Sliders size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-indigo-950">{fields.length}</span>
                <span className="text-xs font-bold text-slate-400">creados</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Campos personalizados activos</p>
            </div>

            {/* KPI 2: Campos de Texto */}
            <div className="rounded-2xl border-t-4 border-t-emerald-500 border-x border-b border-emerald-100/70 bg-gradient-to-br from-emerald-50/70 via-white to-slate-50/50 p-4 shadow-2xs transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-900/60">De Texto</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-500 text-white shadow-xs">
                  <FileText size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-emerald-600">{textFieldsCount}</span>
                <span className="text-xs font-bold text-slate-400">campos</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Texto / Alfanumérico</p>
            </div>

            {/* KPI 3: Campos Numéricos */}
            <div className="rounded-2xl border-t-4 border-t-blue-500 border-x border-b border-blue-100/70 bg-gradient-to-br from-blue-50/70 via-white to-slate-50/50 p-4 shadow-2xs transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-900/60">Numéricos</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-blue-500 text-white shadow-xs">
                  <Hash size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-blue-600">{numberFieldsCount}</span>
                <span className="text-xs font-bold text-slate-400">campos</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Valores numéricos</p>
            </div>

            {/* KPI 4: Fechas y Enlaces */}
            <div className="rounded-2xl border-t-4 border-t-amber-500 border-x border-b border-amber-100/70 bg-gradient-to-br from-amber-50/70 via-white to-slate-50/50 p-4 shadow-2xs transition-all hover:shadow-md hover:-translate-y-0.5">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-900/60">Fechas y URLs</span>
                <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                  <Calendar size={15} />
                </div>
              </div>
              <div className="mt-2.5 flex items-baseline gap-2">
                <span className="text-2xl font-black tracking-tight text-amber-600">{dateFieldsCount}</span>
                <span className="text-xs font-bold text-slate-400">campos</span>
              </div>
              <p className="mt-1 text-[11px] font-medium text-slate-500">Especiales (Fechas/Links)</p>
            </div>

          </div>

          {/* Banner de Errores */}
          {error && (
            <div className="rounded-xl bg-rose-50 border border-rose-200/80 px-3.5 py-2.5 flex items-center justify-between text-xs font-semibold text-rose-700 shadow-2xs shrink-0">
              <div className="flex items-center gap-2">
                <AlertCircle size={15} className="shrink-0" />
                <span>{error}</span>
              </div>
              <button onClick={() => setError(null)} className="hover:text-rose-900 transition p-0.5">
                <X size={14} />
              </button>
            </div>
          )}

          {/* Listado y Tabla */}
          <div className="flex-1 flex flex-col min-h-0 rounded-2xl border border-slate-100/90 bg-white shadow-2xs overflow-hidden">
            
            {/* Barra de Filtros y Búsqueda */}
            <div className="p-3.5 border-b border-slate-100 flex items-center justify-between gap-3 bg-slate-50/40 shrink-0">
              <div className="relative max-w-sm w-full">
                <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Buscar por nombre de campo..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full h-9 pl-10 pr-4 bg-white border border-slate-200/80 rounded-xl outline-none focus:border-emerald-500/50 text-xs font-medium text-slate-700 placeholder:text-slate-400 transition shadow-2xs"
                />
              </div>

              <div className="text-[11px] font-semibold text-slate-400">
                Mostrando <span className="font-extrabold text-slate-700">{filteredFields.length}</span> de <span className="font-extrabold text-slate-700">{fields.length}</span> registros
              </div>
            </div>

            {/* Tabla Principal */}
            {isLoading ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
                <Loader2 size={28} className="animate-spin text-emerald-500 mb-2.5" />
                <span className="text-xs font-bold text-slate-400">Cargando los campos personalizados...</span>
              </div>
            ) : filteredFields.length === 0 ? (
              <div className="flex-1 p-6 flex items-center justify-center bg-slate-50/30">
                
                {/* Hero Card Estado Vacío */}
                <div className="relative w-full max-w-lg rounded-3xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/40 p-8 text-center shadow-xs overflow-hidden">
                  
                  {/* Resplandor decorativo de fondo */}
                  <div className="absolute -right-10 -bottom-10 h-40 w-40 rounded-full bg-emerald-200/30 blur-2xl pointer-events-none" />
                  <div className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-teal-200/30 blur-2xl pointer-events-none" />

                  {/* Icono central de gran impacto */}
                  <div className="relative mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 text-white shadow-lg shadow-emerald-500/25">
                    <Tag size={28} />
                  </div>

                  <h3 className="text-base font-extrabold text-slate-800">Crea tus Campos Customizados</h3>
                  <p className="text-xs font-medium text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Personaliza los datos de tus contactos guardando información específica para tus campañas y plantillas.
                  </p>

                  {/* Chips de Características */}
                  <div className="my-5 flex flex-wrap items-center justify-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs border border-slate-100">
                      <FileText size={13} className="text-emerald-500" /> Texto / Alfanumérico
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs border border-slate-100">
                      <Hash size={13} className="text-blue-500" /> Numérico
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-700 shadow-2xs border border-slate-100">
                      <Calendar size={13} className="text-amber-500" /> Fechas y URLs
                    </span>
                  </div>

                  {/* Botón de Llamada a la Acción */}
                  <button
                    type="button"
                    onClick={() => setShowModal(true)}
                    className="h-10 px-5 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold inline-flex items-center gap-2 transition-all shadow-xs active:scale-95"
                  >
                    <Plus size={16} />
                    <span>Crear Primer Campo</span>
                  </button>
                </div>

              </div>
            ) : (
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/70 border-b border-slate-100">
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">NOMBRE DEL CAMPO</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest whitespace-nowrap">TIPO DE DATO</th>
                      <th className="px-4 py-2.5 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right whitespace-nowrap">ACCIONES</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100/80">
                    {filteredFields.map((field) => (
                      <tr key={field.id} className="hover:bg-slate-50/50 transition-colors group">
                        
                        {/* Nombre del Campo */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-slate-50 text-slate-600 border border-slate-200/60 flex items-center justify-center font-extrabold text-xs shadow-2xs">
                              {getTypeIcon(field.tipo)}
                            </div>
                            <span className="text-xs font-bold text-slate-800">{field.nombre}</span>
                          </div>
                        </td>

                        {/* Tipo de Campo */}
                        <td className="px-4 py-3 whitespace-nowrap">
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md border text-[11px] font-bold bg-slate-50 text-slate-700 border-slate-200/60">
                            {getTypeIcon(field.tipo)}
                            <span>{field.tipo}</span>
                          </span>
                        </td>

                        {/* Acciones */}
                        <td className="px-4 py-3 whitespace-nowrap text-right">
                          <button
                            type="button"
                            onClick={() => handleDelete(field.id)}
                            className="h-8 w-8 rounded-lg border border-slate-200/80 bg-white hover:bg-rose-50 text-slate-400 hover:text-rose-600 transition-all inline-flex items-center justify-center shadow-2xs"
                            title="Eliminar campo"
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
        </div>
        </div>
      </main>

      {/* Modal Crear Campo */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>

          <div className="relative bg-white rounded-2xl w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden border border-slate-100">
            {/* Header Modal */}
            <div className="px-6 pt-6 pb-4 flex justify-between items-start bg-slate-50/60 border-b border-slate-100">
              <div>
                <h2 className="text-sm font-extrabold text-slate-800">Crear campo personalizado</h2>
                <p className="text-xs font-medium text-slate-400 mt-0.5">Asigna el nombre y el tipo de campo para tus contactos.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors text-slate-400 hover:text-slate-700">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-6 py-5 space-y-4">
              {/* Input Nombre */}
              <div className="space-y-1">
                <div className="flex justify-between items-center px-0.5">
                  <label className="text-xs font-bold text-slate-700 block">Nombre del campo<span className="text-rose-500 ml-0.5">*</span></label>
                  <span className="text-[10px] font-medium text-slate-400">{nombre.length}/50</span>
                </div>
                <input
                  type="text"
                  maxLength={50}
                  required
                  placeholder="Escribe el nombre del campo"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 transition-all font-medium text-xs text-slate-700 placeholder:text-slate-400 shadow-2xs"
                />
              </div>

              {/* Select Tipo */}
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700 block px-0.5">Tipo de campo personalizado<span className="text-rose-500 ml-0.5">*</span></label>
                <div className="relative">
                  <select
                    required
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-3.5 h-9 bg-slate-50 border border-slate-200/80 rounded-xl outline-none focus:bg-white focus:border-emerald-500 appearance-none font-semibold text-xs text-slate-700 cursor-pointer transition-all shadow-2xs"
                  >
                    <option value="" disabled>Selecciona una opción</option>
                    <option value="Texto">Texto</option>
                    <option value="Numérico">Numérico</option>
                    <option value="Fecha">Fecha</option>
                    <option value="URL">URL</option>
                    <option value="Alfanumérico">Alfanumérico</option>
                  </select>
                  <ChevronDown size={15} className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Acciones */}
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
                  disabled={!nombre || !tipo || isSaving}
                  className="h-9 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-semibold shadow-xs transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <Plus size={14} />
                      <span>Crear Campo</span>
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
            <p className="text-[12px] text-slate-550 leading-relaxed mb-6 font-medium">
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