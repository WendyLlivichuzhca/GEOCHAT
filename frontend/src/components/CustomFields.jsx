
import React, { useEffect, useState } from 'react';
import {
  Search,
  Plus,
  Filter,
  Trash2,
  FileText,
  AlertCircle,
  X,
  ChevronDown
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

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/campos-customizados?user_id=${user.id}`);
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
        headers: { 'Content-Type': 'application/json' },
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
        method: 'DELETE'
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
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-6 flex flex-col min-w-0 h-[calc(100vh-48px)]">
        
        {/* Titulo y Botón */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">Campos Customizados</h1>
            <p className="text-sm text-slate-500 mt-1">Crea campos personalizados para ampliar la información de tus contactos.</p>
          </div>
          <button 
            onClick={() => setShowModal(true)}
            className="bg-[#6366f1] hover:bg-[#4f46e5] text-white px-5 py-2.5 rounded-xl font-bold text-sm flex items-center gap-2 shadow-sm transition-all active:scale-95"
          >
            <Plus size={18} /> Crear campo
          </button>
        </div>

        {/* Barra de búsqueda y Filtro */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1 max-w-sm">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text" 
              placeholder="Buscar por nombre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-indigo-50 transition-all text-sm"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold text-xs hover:bg-slate-50 transition-all">
            <Filter size={16} /> Filtrar
          </button>
        </div>

        {/* Tabla */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/50">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    <div className="flex items-center gap-2">
                      <input type="checkbox" className="rounded border-slate-300 text-[#6366f1] focus:ring-[#6366f1]" />
                      Nombre <ChevronDown size={12} />
                    </div>
                  </th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan="3" className="px-6 py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-10 h-10 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin"></div>
                        <span className="text-sm font-medium text-slate-400 uppercase tracking-widest">Cargando campos...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredFields.length > 0 ? (
                  filteredFields.map((field) => (
                    <tr key={field.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors group">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <input type="checkbox" className="rounded border-slate-300 text-[#6366f1] focus:ring-[#6366f1]" />
                          <span className="text-sm font-semibold text-slate-700">{field.nombre}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-medium text-slate-500 bg-slate-100 px-2 py-1 rounded-md">
                          {field.tipo}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button 
                          onClick={() => handleDelete(field.id)}
                          className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="px-6 py-24 text-center">
                      <div className="flex flex-col items-center gap-4">
                        <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-200">
                          <FileText size={32} />
                        </div>
                        <div className="space-y-1">
                          <p className="text-base font-bold text-slate-600">Ningún elemento encontrado</p>
                          <p className="text-xs text-slate-400">No se encontraron registros</p>
                        </div>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {/* Footer tabla */}
          <div className="mt-auto px-6 py-4 border-t border-slate-100 bg-slate-50/30 flex justify-between items-center">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Mostrando {filteredFields.length} de {fields.length} registros
            </span>
          </div>
        </div>

      </main>

      {/* Modal Crear Campo */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={() => setShowModal(false)}></div>
          
          <div className="relative bg-white rounded-[2rem] w-full max-w-md shadow-2xl animate-in zoom-in-95 duration-200 overflow-hidden">
            {/* Header Modal */}
            <div className="px-8 pt-8 pb-4 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-slate-800 mb-1">Crear campo personalizado</h2>
                <p className="text-sm text-slate-400">Asigna el nombre y el tipo de campo para ampliar la información de tus contactos.</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} className="text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="px-8 pb-8 pt-4 space-y-6">
              {/* Input Nombre */}
              <div className="space-y-1.5">
                <div className="flex justify-between items-center px-1">
                  <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Nombre*</label>
                  <span className="text-[10px] text-slate-300">{nombre.length}/50</span>
                </div>
                <input 
                  type="text" 
                  maxLength={50}
                  required
                  placeholder="Escribe el nombre"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-4 h-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-indigo-50 transition-all font-medium text-slate-700 placeholder:text-slate-300"
                />
              </div>

              {/* Select Tipo */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">Tipo de campo personalizado*</label>
                <div className="relative">
                  <select 
                    required
                    value={tipo}
                    onChange={(e) => setTipo(e.target.value)}
                    className="w-full px-4 h-12 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:border-[#6366f1] appearance-none font-medium text-slate-700 cursor-pointer transition-all"
                  >
                    <option value="" disabled>selecciona una opción</option>
                    <option value="Texto">Texto</option>
                    <option value="Numérico">Numérico</option>
                    <option value="Fecha">Fecha</option>
                    <option value="URL">URL</option>
                    <option value="Alfanumérico">Alfanumérico</option>
                  </select>
                  <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Acciones */}
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 h-12 border border-indigo-200 text-[#6366f1] font-bold rounded-2xl hover:bg-indigo-50 transition-all active:scale-95"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={!nombre || !tipo || isSaving}
                  className={`flex-1 h-12 font-bold rounded-2xl transition-all active:scale-95 text-white ${
                    !nombre || !tipo || isSaving 
                    ? 'bg-slate-200 cursor-not-allowed' 
                    : 'bg-[#6366f1] hover:bg-[#4f46e5] shadow-lg shadow-indigo-100'
                  }`}
                >
                  {isSaving ? 'Creando...' : 'Ejecutar acción'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
