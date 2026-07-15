import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, AlertTriangle, Send, User, Mail } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || '';

export default function WhalinkPublic() {
  const { shortCode } = useParams();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Whalink data from API
  const [linkData, setLinkData] = useState(null);
  
  // Form values
  const [nombre, setNombre] = useState('');
  const [correo, setCorreo] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const fetchWhalink = async () => {
      try {
        const response = await fetch(`${API_URL}/api/public/whalink/${shortCode}`);
        const result = await response.json();
        if (response.ok && result.success) {
          setLinkData(result);
          
          // Inject Pixel Tracking if present
          if (result.pixel_tracking) {
            const script = document.createElement('script');
            script.innerHTML = result.pixel_tracking;
            document.head.appendChild(script);
          }

          // If it doesn't need landing page, redirect immediately
          if (!result.has_landing && result.whatsapp_url) {
            window.location.href = result.whatsapp_url;
          } else {
            setLoading(false);
          }
        } else {
          setError(result.message || 'No se pudo cargar este enlace.');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error fetching Whalink:', err);
        setError('Error al conectar con el servidor.');
        setLoading(false);
      }
    };

    if (shortCode) {
      fetchWhalink();
    } else {
      setError('Enlace incompleto.');
      setLoading(false);
    }
  }, [shortCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!shortCode) return;
    
    // Validations
    if (linkData?.clave_nombre && !nombre.trim()) {
      alert('Por favor ingresa tu nombre.');
      return;
    }
    if (linkData?.clave_correo && !correo.trim()) {
      alert('Por favor ingresa tu correo electrónico.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch(`${API_URL}/api/public/whalink/${shortCode}/lead`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: nombre.trim(),
          correo: correo.trim()
        })
      });
      const result = await response.json();
      if (response.ok && result.success && result.whatsapp_url) {
        window.location.href = result.whatsapp_url;
      } else {
        alert(result.message || 'No se pudo completar el registro. Inténtalo de nuevo.');
        setSubmitting(false);
      }
    } catch (err) {
      console.error('Error enviando lead:', err);
      alert('Error de conexión al guardar los datos.');
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-tr from-[#f8fafc] to-[#f1f5f9] font-sans p-6 text-slate-800">
        <div className="flex flex-col items-center gap-4 text-center">
          <Loader2 size={36} className="animate-spin text-[#6366f1]" />
          <p className="text-sm font-semibold text-slate-600">Redirigiendo a WhatsApp...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-tr from-[#f8fafc] to-[#f1f5f9] font-sans p-6 text-slate-800">
        <div className="w-full max-w-md rounded-3xl border border-white/60 bg-white/80 p-8 text-center shadow-2xl backdrop-blur-md">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-rose-50 text-rose-500 mx-auto mb-5">
            <AlertTriangle size={32} />
          </div>
          <h2 className="text-lg font-black text-rose-950">Link no disponible</h2>
          <p className="mt-2 text-sm font-medium text-slate-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gradient-to-tr from-[#f8fafc] to-[#f1f5f9] font-sans p-4 text-slate-800">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/70 bg-white/70 shadow-2xl backdrop-blur-md flex flex-col">
        {/* Header Image if available */}
        {linkData?.imagen_url && (
          <img src={linkData.imagen_url} alt="" className="h-44 w-full object-cover border-b border-slate-100" />
        )}
        
        <div className="p-8">
          <h2 className="text-2xl font-black text-[#0f172a] text-center leading-tight">
            {linkData?.nombre || 'GEOCHAT'}
          </h2>
          {linkData?.descripcion && (
            <p className="mt-2 text-center text-sm font-semibold text-slate-500">
              {linkData.descripcion}
            </p>
          )}

          <form onSubmit={handleSubmit} className="mt-8 space-y-4">
            {linkData?.clave_nombre && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Nombre Completo</label>
                <div className="relative">
                  <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Escribe tu nombre"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#6366f1] transition-all"
                  />
                </div>
              </div>
            )}

            {linkData?.clave_correo && (
              <div>
                <label className="mb-1.5 block text-xs font-bold uppercase tracking-wider text-slate-500">Correo Electrónico</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    placeholder="ejemplo@correo.com"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none focus:border-[#6366f1] transition-all"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="mt-6 flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 font-bold text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-60"
            >
              {submitting ? (
                <Loader2 size={18} className="animate-spin" />
              ) : (
                <>
                  Ir al Chat de WhatsApp <Send size={15} />
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
