// frontend/src/components/Perfil.jsx
import React, { useState } from 'react';
import { ChevronLeft, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const Perfil = ({ user, onUpdateProfile }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    nombre: user?.nombre || 'Angel Oswaldo Espinoza Veintimilla',
    correo: user?.correo || 'geodiinnovate@gmail.com',
    whatsapp: '+593 986 130 956',
    zonaHoraria: 'America/Guayaquil'
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Aquí llamas a tu API para guardar los cambios
    console.log('Guardando perfil:', formData);
    if (onUpdateProfile) onUpdateProfile(formData);
    navigate('/'); // regresa al dashboard
  };

  return (
    <div className="min-h-screen bg-[#f8f9fd] py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Botón para volver */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-slate-600 hover:text-indigo-600 mb-6 transition-colors"
        >
          <ChevronLeft size={20} />
          <span>Volver al Dashboard</span>
        </button>

        {/* Tarjeta de perfil */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-indigo-600 px-6 py-4">
            <h1 className="text-2xl font-bold text-white">Configuración de perfil</h1>
            <p className="text-indigo-100 text-sm mt-1">Actualiza tus datos personales y configuraciones de tu cuenta.</p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Avatar y datos resumen */}
            <div className="flex items-center gap-4 pb-4 border-b">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-2xl font-bold">
                {formData.nombre.charAt(0)}
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-lg">{formData.nombre}</h3>
                <p className="text-slate-500">{formData.correo}</p>
              </div>
            </div>

            {/* Campos del formulario */}
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
                <label className="block text-sm font-bold text-slate-700 mb-1">Correo electrónico</label>
                <input
                  type="email"
                  name="correo"
                  value={formData.correo}
                  onChange={handleChange}
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

            {/* Botones */}
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
                className="px-6 py-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition flex items-center gap-2"
              >
                <Save size={16} />
                Guardar cambios
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Perfil;