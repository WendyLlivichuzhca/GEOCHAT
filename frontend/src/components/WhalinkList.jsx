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
    <div className="flex min-h-screen bg-white font-sans text-slate-900">
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-20 lg:ml-24">
        <header className="h-[72px] bg-[#1e1e2d] text-white flex items-center justify-between px-8 sticky top-0 z-50 shadow-sm">
          <div className="flex items-center gap-4">
              <div className="bg-white/95 rounded-full p-2 w-11 h-11 flex items-center justify-center shadow-lg shadow-black/30 shrink-0">
                  <img src="/logo_geochat.png" alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div className="flex flex-col">
                  <span className="text-[20px] font-black tracking-tight uppercase leading-none text-white/95">GeoCHAT</span>
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

        <section className="px-8 py-7">
          <div className="flex flex-col gap-5 border-b border-slate-200 pb-6">
            <div className="flex flex-col xl:flex-row xl:items-start xl:justify-between gap-4">
              <div>
                <h1 className="text-[26px] font-black tracking-tight text-slate-900">Whalinks</h1>
                <p className="mt-3 text-[15px] text-slate-500">
                  Gestiona todos tus links directos de WhatsApp creados por la aplicacion.
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
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-[#5d5fef] px-5 text-[14px] font-semibold text-[#5d5fef] hover:bg-indigo-50 transition-colors"
                >
                  <Download size={16} /> Exportar links
                </button>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-slate-200 px-5 text-[14px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <Upload size={16} /> Importar links
                </button>
                <button
                  type="button"
                  onClick={() => navigate('/whalink/crear')}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#5d5fef] px-5 text-[14px] font-semibold text-white shadow-sm hover:bg-[#4a4ce0] transition-colors"
                >
                  <Plus size={17} /> Crear link
                </button>
              </div>
            </div>

            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative w-full md:max-w-[360px]">
                <Search size={19} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar por whalink"
                  className="h-11 w-full rounded-md border border-slate-200 bg-white pl-12 pr-4 text-[15px] outline-none transition-all focus:border-[#5d5fef] focus:ring-4 focus:ring-indigo-50"
                />
              </div>

              <div className="flex gap-3">
                <select
                  value={filter}
                  onChange={(event) => setFilter(event.target.value)}
                  className="h-11 rounded-md border border-slate-200 bg-white px-4 text-[14px] font-semibold text-slate-600 outline-none transition-all focus:border-[#5d5fef] focus:ring-4 focus:ring-indigo-50"
                >
                  <option value="todos">Todos</option>
                  <option value="con_clicks">Con clicks</option>
                  <option value="sin_clicks">Sin clicks</option>
                </select>
                <button
                  type="button"
                  className="inline-flex h-11 items-center gap-2 rounded-md bg-slate-50 px-5 text-[15px] font-bold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <Filter size={18} /> Filtrar
                </button>
              </div>
            </div>
          </div>

          {error && (
            <div className="mt-5 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-[13px] font-semibold text-red-600">
              {error}
            </div>
          )}
          {notice && (
            <div className="mt-5 rounded-md border border-emerald-100 bg-emerald-50 px-4 py-3 text-[13px] font-semibold text-emerald-700">
              {notice}
            </div>
          )}

          <div className="mt-6">
            <div className="mb-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <h2 className="text-[20px] font-black text-slate-900">Total de whalinks {filteredLinks.length}</h2>
              <p className="text-[15px] font-semibold text-slate-900">
                {selectedIds.length} seleccionado del total {filteredLinks.length}
              </p>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[14px] text-slate-900">
                    <th className="w-12 py-3 pr-3">
                      <button
                        type="button"
                        onClick={toggleAllVisible}
                        className="flex h-6 w-6 items-center justify-center text-slate-400 hover:text-[#5d5fef]"
                        title="Seleccionar todos"
                      >
                        {allVisibleSelected ? <CheckSquare size={21} /> : <Square size={21} />}
                      </button>
                    </th>
                    <th className="px-3 py-3 font-black">Nombre</th>
                    <th className="px-3 py-3 font-black">Link</th>
                    <th className="px-3 py-3 font-black">Dispositivo</th>
                    <th className="px-3 py-3 font-black">Clicks</th>
                    <th className="px-3 py-3 font-black">Creado</th>
                    <th className="px-3 py-3 text-right font-black"> </th>
                  </tr>
                </thead>

                <tbody>
                  {filteredLinks.map((link) => {
                    const selected = selectedIds.includes(link.id);

                    return (
                      <tr key={link.id} className="border-b border-slate-100 hover:bg-slate-50/70">
                        <td className="w-12 py-4 pr-3">
                          <button
                            type="button"
                            onClick={() => toggleSelected(link.id)}
                            className={`flex h-6 w-6 items-center justify-center ${selected ? 'text-[#5d5fef]' : 'text-slate-300 hover:text-[#5d5fef]'}`}
                            title="Seleccionar"
                          >
                            {selected ? <CheckSquare size={21} /> : <Square size={21} />}
                          </button>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-3">
                            <div className="h-9 w-9 shrink-0 rounded-full bg-slate-100 overflow-hidden flex items-center justify-center text-[#5d5fef]">
                              {link.imagen_url ? (
                                <img src={link.imagen_url} alt={link.nombre || 'Whalink'} className="h-full w-full object-cover" />
                              ) : (
                                <Link2 size={17} />
                              )}
                            </div>
                            <div className="min-w-0">
                              <p className="truncate text-[14px] font-black text-slate-700">{link.nombre || 'Sin nombre'}</p>
                              <p className="truncate text-[12px] text-slate-400">{link.descripcion || 'Link directo de WhatsApp'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => copyLink(link)}
                              className="max-w-[360px] truncate text-[14px] font-medium text-slate-500 hover:text-[#5d5fef]"
                              title={link.short_url}
                            >
                              {link.short_url || 'Sin link'}
                            </button>
                            <button
                              type="button"
                              onClick={() => copyLink(link)}
                              className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-indigo-50 hover:text-[#5d5fef]"
                              title="Copiar link"
                            >
                              <Copy size={16} />
                            </button>
                            {copiedId === link.id && (
                              <span className="text-[11px] font-bold text-emerald-600">Copiado</span>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4">
                          <p className="text-[14px] font-semibold text-slate-600">{link.dispositivo_nombre || 'Sin dispositivo'}</p>
                          <p className="text-[12px] text-slate-400">{link.numero_telefono || 'Sin telefono'}</p>
                        </td>
                        <td className="px-3 py-4 text-[14px] font-semibold text-slate-600">
                          {Number(link.total_clics || 0)}
                        </td>
                        <td className="px-3 py-4 text-[14px] text-slate-500">
                          {formatDate(link.fecha_creacion)}
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex items-center justify-end gap-2 text-slate-700">
                            <button
                              type="button"
                              onClick={() => navigate(`/whalink/${link.id}`)}
                              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-indigo-50 hover:text-[#5d5fef]"
                              title="Ver estadisticas"
                            >
                              <BarChart3 size={19} />
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/whalink/${link.id}/editar`)}
                              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-indigo-50 hover:text-[#5d5fef]"
                              title="Editar"
                            >
                              <Edit3 size={19} />
                            </button>
                            <button
                              type="button"
                              onClick={() => copyLink(link)}
                              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-indigo-50 hover:text-[#5d5fef]"
                              title="Copiar"
                            >
                              <MessageCircle size={19} />
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteLink(link)}
                              className="flex h-9 w-9 items-center justify-center rounded-md hover:bg-red-50 hover:text-red-500"
                              title="Eliminar"
                            >
                              <Trash2 size={19} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {!loading && filteredLinks.length === 0 && (
                    <tr>
                      <td colSpan="7" className="py-14 text-center">
                        <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Link2 size={22} />
                        </div>
                        <p className="text-[15px] font-black text-slate-800">No hay whalinks para mostrar</p>
                        <p className="mt-1 text-[13px] text-slate-400">Crea tu primer link para que aparezca en esta tabla.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6 text-[15px] font-black text-slate-900">
              Mostrando {filteredLinks.length} de {links.length} registros
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default WhalinkList;
