// frontend/src/components/Perfil.jsx
import React, { useState } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const API_URL = import.meta.env.VITE_API_URL || '';
const Perfil = ({ user, onUpdateProfile }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: user?.nombre || 'Angel Oswaldo Espinoza Veintimilla',
    correo: user?.correo || 'geodiinnovate@gmail.com',
    whatsapp: user?.whatsapp_personal || '',
    zonaHoraria: user?.zona_horaria || 'America/Guayaquil',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (event) => {
    setFormData({ ...formData, [event.target.name]: event.target.value });
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (!user?.id) {
      setError('No se encontro el usuario activo.');
      return;
    }

    setIsSaving(true);

    try {
      const response = await fetch(`${API_URL}/api/profile/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombre: formData.nombre,
          whatsapp_personal: formData.whatsapp,
          zona_horaria: formData.zonaHoraria,
          foto_perfil: user?.foto_perfil || null,
        }),
      });
      const data = await response.json();

      if (!data.success) {
        setError(data.message || 'No se pudo guardar el perfil.');
        return;
      }

      if (onUpdateProfile) onUpdateProfile(data.user);
      navigate('/');
    } catch {
      setError('Error de conexion con el servidor.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f8f9fd] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 mb-6 transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Volver al Dashboard</span>
        </button>

        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Configuracion de perfil</h1>
            <p className="text-indigo-100 text-sm mt-1">
              Actualiza tus datos personales y configuraciones de tu cuenta.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-2xl font-bold">
                {formData.nombre.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{formData.nombre}</h3>
                <p className="text-slate-500">{formData.correo}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Nombre *</label>
                <input
                  type="text"
                  name="nombre"
                  value={formData.nombre}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400 outline-none transition"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Correo electronico</label>
                <input
                  type="email"
                  name="correo"
                  value={formData.correo}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl bg-slate-50"
                  disabled
                />
                <p className="text-xs text-slate-400 mt-1">El correo no se puede cambiar</p>
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">WhatsApp personal</label>
                <input
                  type="tel"
                  name="whatsapp"
                  value={formData.whatsapp}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-slate-700 mb-1">Zona horaria</label>
                <select
                  name="zonaHoraria"
                  value={formData.zonaHoraria}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-200 outline-none"
                >
                  <option>America/Guayaquil</option>
                  <option>America/New_York</option>
                  <option>Europe/Madrid</option>
                  <option>Europe/London</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-xl border border-red-100 font-semibold">
                {error}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="px-6 py-2 border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-50 transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2 disabled:opacity-70"
              >
                <Save size={16} />
                {isSaving ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Perfil;
