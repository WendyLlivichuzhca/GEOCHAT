import React, { useState } from 'react';
import { Search, Plus, RefreshCw, FileText } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Plantillas({ user, onLogout }) {
  const [search, setSearch] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCreate = () => {
    console.log('Crear plantilla');
  };

  return (
    <div className="flex min-h-screen bg-[#f8fafc] font-sans">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-6 flex flex-col min-w-0 h-[calc(100vh-48px)]">
        <div className="flex flex-col gap-6 mb-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Plantillas de mensaje</h1>
              <p className="text-sm text-slate-500 mt-1">Gestiona las plantillas para tus mensajes y sincronízalas con tu dispositivo.</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={handleSync}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 font-bold text-sm shadow-sm hover:bg-slate-50 transition-all"
              >
                <RefreshCw size={16} /> {isSyncing ? 'Sincronizando...' : 'Sincronizar'}
              </button>
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#6366f1] text-white font-bold text-sm shadow-sm hover:bg-[#4f46e5] transition-all"
              >
                <Plus size={16} /> Crear plantilla
              </button>
            </div>
          </div>

          <div className="relative max-w-md">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar por nombre"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-2xl outline-none focus:border-[#6366f1] focus:ring-4 focus:ring-indigo-50 transition-all text-sm"
            />
          </div>
        </div>

        <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden flex flex-col flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70">
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Nombre</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Categoría</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-4 text-[11px] font-bold text-slate-400 uppercase tracking-wider">Estado</th>
                  <th className="px-6 py-4"></th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td colSpan="5" className="px-6 py-24 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-20 h-20 rounded-3xl bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-300">
                        <FileText size={32} />
                      </div>
                      <div className="space-y-1">
                        <p className="text-base font-bold text-slate-600">Ningún elemento encontrado</p>
                        <p className="text-xs text-slate-400">No se encontraron registros</p>
                      </div>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
