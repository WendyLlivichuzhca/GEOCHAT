import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  Bell,
  CheckSquare,
  Copy,
  Download,
  Edit3,
  Filter,
  Link2,
  MessageCircle,
  Plus,
  RefreshCw,
  Search,
  Square,
  Trash2,
  Upload,
  Link as LinkIcon,
  ExternalLink
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import Sidebar from './Sidebar';

const API_URL = import.meta.env.VITE_API_URL || '';
const formatDate = (value) => {
  if (!value) return 'Sin fecha';

  try {
    return new Intl.DateTimeFormat('es-EC', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(value));
  } catch {
    return value;
  }
};

const normalizeText = (value) => String(value || '').toLowerCase().trim();

const WhalinkList = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [links, setLinks] = useState([]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('todos');
  const [selectedIds, setSelectedIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [copiedId, setCopiedId] = useState(null);

  const loadLinks = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_URL}/api/whalink/list?user_id=${user.id}`);
      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudieron cargar los links.');
      }

      setLinks(data.links || []);
      setSelectedIds([]);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al cargar los Whalinks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLinks();
  }, [user?.id]);

  const filteredLinks = useMemo(() => {
    const query = normalizeText(search);

    return links.filter((link) => {
      const matchesSearch = !query || [
        link.nombre,
        link.short_url,
        link.dispositivo_nombre,
        link.numero_telefono,
        link.descripcion,
      ].some((value) => normalizeText(value).includes(query));

      const matchesFilter =
        filter === 'todos'
        || (filter === 'con_clicks' && Number(link.total_clics || 0) > 0)
        || (filter === 'sin_clicks' && Number(link.total_clics || 0) === 0);

      return matchesSearch && matchesFilter;
    });
  }, [links, search, filter]);

  const allVisibleSelected = filteredLinks.length > 0 && filteredLinks.every((link) => selectedIds.includes(link.id));

  const toggleAllVisible = () => {
    if (allVisibleSelected) {
      setSelectedIds((current) => current.filter((id) => !filteredLinks.some((link) => link.id === id)));
      return;
    }

    setSelectedIds((current) => Array.from(new Set([...current, ...filteredLinks.map((link) => link.id)])));
  };

  const toggleSelected = (id) => {
    setSelectedIds((current) => (
      current.includes(id)
        ? current.filter((selectedId) => selectedId !== id)
        : [...current, id]
    ));
  };

  const copyLink = async (link) => {
    if (!link?.short_url) return;

    try {
      await navigator.clipboard.writeText(link.short_url);
      setCopiedId(link.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch (err) {
      console.error(err);
      setError('No se pudo copiar el enlace.');
    }
  };

  const csvEscape = (value) => {
    const text = String(value ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  };

  const exportLinks = () => {
    const rows = filteredLinks.map((link) => ({
      nombre: link.nombre || '',
      short_url: link.short_url || '',
      dispositivo: link.dispositivo_nombre || '',
      numero_telefono: link.numero_telefono || '',
      clicks: Number(link.total_clics || 0),
      creado: link.fecha_creacion || '',
      mensaje: link.mensaje || '',
      descripcion: link.descripcion || ''
    }));

    const headers = ['nombre', 'short_url', 'dispositivo', 'numero_telefono', 'clicks', 'creado', 'mensaje', 'descripcion'];
    const csv = [
      headers.join(','),
      ...rows.map((row) => headers.map((header) => csvEscape(row[header])).join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'geochat-whalinks.csv';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const parseCsvLine = (line) => {
    const values = [];
    let current = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index];
      const next = line[index + 1];

      if (char === '"' && quoted && next === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = !quoted;
      } else if (char === ',' && !quoted) {
        values.push(current);
        current = '';
      } else {
        current += char;
      }
    }

    values.push(current);
    return values;
  };

  const parseCsv = (text) => {
    const lines = String(text || '').split(/\r?\n/).filter((line) => line.trim());
    if (lines.length < 2) return [];

    const headers = parseCsvLine(lines[0]).map((header) => header.trim());
    return lines.slice(1).map((line) => {
      const values = parseCsvLine(line);
      return headers.reduce((row, header, index) => {
        row[header] = values[index] || '';
        return row;
      }, {});
    });
  };

  const importLinks = async (event) => {
    const file = event.target.files?.[0];
    if (!file || !user?.id) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const text = await file.text();
      const rows = parseCsv(text);

      if (!rows.length) {
        throw new Error('El archivo CSV no tiene filas para importar.');
      }

      const response = await fetch(`${API_URL}/api/whalink/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, rows })
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudieron importar los links.');
      }

      await loadLinks();
      setNotice(data.message || 'Importacion completada.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al importar los links.');
    } finally {
      setLoading(false);
      event.target.value = '';
    }
  };

  const deleteLink = async (link) => {
    if (!link?.id || !user?.id) return;

    const confirmed = window.confirm(`Eliminar el whalink "${link.nombre || link.short_url}"?`);
    if (!confirmed) return;

    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await fetch(`${API_URL}/api/whalink/${link.id}?user_id=${user.id}`, {
        method: 'DELETE'
      });
      const data = await response.json().catch(() => ({}));

      if (!response.ok || !data.success) {
        throw new Error(data.message || 'No se pudo eliminar el link.');
      }

      await loadLinks();
      setNotice(data.message || 'Whalink eliminado correctamente.');
    } catch (err) {
      console.error(err);
      setError(err.message || 'Error al eliminar el link.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#0a0b10] font-sans text-slate-100 selection:bg-indigo-500/30">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-28 lg:ml-32 mr-6 my-4 flex flex-col min-w-0">
        <header className="h-[72px] geopulse-glass rounded-3xl text-white flex items-center justify-between px-8 sticky top-0 z-50 mb-6 shadow-indigo-500/5 shrink-0">
          <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-md rounded-2xl p-2 w-11 h-11 flex items-center justify-center border border-white/10 shrink-0">
                  <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[20px] font-black tracking-tight uppercase leading-none geopulse-text-gradient">GeoCHAT</span>
              </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:flex items-center gap-2 text-[14px] font-bold">
              <BarChart3 size={18} />
              GEOCHAT Academy
            </div>
            <Bell size={22} className="text-white/80" />
            <button
              type="button"
              onClick={loadLinks}
              className="h-10 w-10 rounded-full flex items-center justify-center text-white/75 hover:bg-white/10 hover:text-white transition-colors"
              title="Actualizar"
            >
              <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            </button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#5d5fef] flex items-center justify-center text-sm font-black">
                {user?.nombre?.charAt(0) || 'W'}
              </div>
              <div className="hidden sm:block max-w-[140px]">
                <p className="truncate text-[14px] font-bold">{user?.nombre || 'Wendy'}</p>
                <p className="text-[11px] text-white/45">{user?.rol || 'admin'}</p>
              </div>
            </div>
          </div>
        </header>

        <section className="px-8 py-7 space-y-8 max-w-7xl mx-auto">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-6">
              <div>
                <h1 className="text-3xl font-black geopulse-text-gradient tracking-tight">Whalinks</h1>
                <p className="mt-2 text-[15px] text-slate-500 font-medium">
                  Centraliza y monitorea el rendimiento de tus enlaces directos de WhatsApp.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={importLinks}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={exportLinks}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl geopulse-glass px-5 text-[13px] font-black text-slate-300 hover:text-white transition-all border-white/5"
                >
                  <Download size={16} /> Exportar
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl geopulse-glass px-5 text-[13px] font-black text-slate-300 hover:text-white transition-all border-white/5"
                >
                  <Upload size={16} /> Importar
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/whalink/crear')}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 text-[13px] font-black text-white shadow-lg shadow-indigo-500/20 hover:bg-indigo-500 transition-all active:scale-95"
                >
                  <Plus size={18} /> Crear Link
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative w-full md:max-w-[420px]">
                <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar whalink por nombre o alias..."
                  className="h-14 w-full rounded-2xl geopulse-glass pl-12 pr-4 text-[15px] outline-none border-white/5 focus:border-indigo-500/50 transition-all text-slate-200"
                />
              </div>

              <div className="flex gap-3">
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="h-14 rounded-2xl geopulse-glass px-6 text-[14px] font-black text-slate-300 outline-none appearance-none cursor-pointer hover:bg-white/5 transition-all border-white/5"
                >
                  <option value="todos">Todos los Estados</option>
                  <option value="con_clicks">Con Clicks</option>
                  <option value="sin_clicks">Sin Clicks</option>
                </select>
                <button
                  type="button"
                  className="inline-flex h-14 items-center gap-2 rounded-2xl geopulse-glass px-6 text-[15px] font-black text-slate-400 hover:text-white transition-all border-white/5"
                >
                  <Filter size={18} /> Filtrar
                </button>
              </div>
            </div>
          </div>

          {(error || notice) && (
            <div className={`rounded-2xl px-6 py-4 text-[13px] font-black uppercase tracking-widest border ${
              error ? 'bg-red-500/10 border-red-500/20 text-red-400' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
            }`}>
              {error || notice}
            </div>
          )}

          <div className="geopulse-glass rounded-[2rem] overflow-hidden border-white/5 shadow-2xl">
            <div className="p-8 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-white/5 bg-white/5">
              <h2 className="text-sm font-black text-slate-100 uppercase tracking-[0.2em]">Listado de Direccionamientos</h2>
              <div className="text-[11px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-3">
                <span className="bg-white/5 px-3 py-1 rounded-lg border border-white/5">{filteredLinks.length} TOTAL</span>
                <span className="text-indigo-400">{selectedIds.length} SELECCIONADOS</span>
              </div>
            </div>

            <div className="w-full overflow-x-auto custom-scrollbar">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="text-[10px] text-slate-500 font-black uppercase tracking-[0.2em] border-b border-white/5">
                    <th className="w-16 py-6 px-8">
                      <button
                        type="button"
                        onClick={toggleAllVisible}
                        className="flex h-6 w-6 items-center justify-center text-slate-600 hover:text-indigo-400 transition-colors"
                      >
                        {allVisibleSelected ? <CheckSquare size={22} className="text-indigo-500" /> : <Square size={22} />}
                      </button>
                    </th>
                    <th className="px-3 py-6">Nombre del Enlace</th>
                    <th className="px-3 py-6">Meta Dato / URL</th>
                    <th className="px-3 py-6">Dispositivo</th>
                    <th className="px-3 py-6">Analítica</th>
                    <th className="px-3 py-6">Registro</th>
                    <th className="px-8 py-6 text-right">Acción</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/5">
                  {filteredLinks.map((link) => {
                    const selected = selectedIds.includes(link.id);

                    return (
                      <tr key={link.id} className="hover:bg-white/[0.02] transition-colors group">
                        <td className="py-6 px-8">
                          <button
                            type="button"
                            onClick={() => toggleSelected(link.id)}
                            className={`flex h-6 w-6 items-center justify-center transition-all ${selected ? 'text-indigo-500 scale-110' : 'text-slate-700 hover:text-indigo-400'}`}
                          >
                            {selected ? <CheckSquare size={22} /> : <Square size={22} />}
                          </button>
                        </td>
                        <td className="px-3 py-6">
                            <p className="font-black text-slate-100 group-hover:text-indigo-400 transition-colors">{link.nombre}</p>
                            <p className="text-[10px] text-slate-600 font-bold mt-1 uppercase tracking-widest">{link.codigo}</p>
                        </td>
                        <td className="px-3 py-6">
                            <div className="flex items-center gap-2 text-slate-500 font-medium">
                                <LinkIcon size={14} className="text-indigo-500/50" />
                                <span className="text-xs truncate max-w-[200px]">{link.url_final || link.whalink}</span>
                            </div>
                        </td>
                        <td className="px-3 py-6">
                            <span className="inline-flex h-8 items-center px-3 rounded-lg bg-white/5 border border-white/5 text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">
                                {link.dispositivo_nombre || 'S/D'}
                            </span>
                        </td>
                        <td className="px-3 py-6">
                            <div className="flex items-center gap-3">
                                <div className="text-xl font-black text-slate-100 tracking-tighter">{link.clicks || 0}</div>
                                <div className="text-[9px] font-black text-slate-600 uppercase leading-tight">Interacciones<br/>Únicas</div>
                            </div>
                        </td>
                        <td className="px-3 py-6">
                            <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{formatDate(link.created_at)}</p>
                        </td>
                        <td className="px-8 py-6 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                                className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-white transition-all border border-white/5"
                                title="Copiar Link"
                            >
                                <ExternalLink size={16} />
                            </button>
                            <button
                                className="h-9 w-9 rounded-xl bg-white/5 flex items-center justify-center text-slate-500 hover:text-emerald-400 transition-all border border-white/5"
                                title="Clonar"
                            >
                                <Copy size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="p-8 bg-white/5 border-t border-white/5 flex items-center justify-between">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">GeoCHAT Direction Management</p>
              <div className="flex items-center gap-4">
                  <button className="h-10 px-4 rounded-xl geopulse-glass text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all border-white/5">Anterior</button>
                  <button className="h-10 px-4 rounded-xl geopulse-glass text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-white transition-all border-white/5">Siguiente</button>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WhalinkList;
