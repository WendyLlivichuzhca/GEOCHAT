// frontend/src/components/Dashboard.jsx
import React from 'react';
import { Bell, CheckCircle2, Smartphone, User, Plus, MoreVertical, Users } from 'lucide-react';
import Sidebar from './Sidebar';

export default function Dashboard({ user, onLogout }) {
  return (
    <div className="flex min-h-screen bg-[#f8f9fd] font-sans">
      {/* PASAMOS 'user' Y 'onLogout' AL SIDEBAR */}
      <Sidebar onLogout={onLogout} user={user} />

      <main className="flex-1 ml-20 lg:ml-24">
        {/* HEADER */}
        <header className="h-16 bg-[#1e1e2d] text-white flex items-center justify-between px-8 sticky top-0 z-20 shadow-md">
          <div className="flex items-center gap-2">
            <span className="font-bold tracking-tighter text-lg uppercase">GEOCHAT</span>
          </div>
          
          <div className="flex items-center gap-6">
            <span className="text-sm font-medium opacity-80 hover:opacity-100 cursor-pointer">Academy</span>
            <Bell size={18} className="opacity-70 cursor-pointer hover:opacity-100" />
            <div className="flex items-center gap-3 border-l border-white/10 pl-6">
              <div className="w-8 h-8 bg-indigo-600 rounded-full flex items-center justify-center font-bold text-white text-xs uppercase">
                {user?.nombre?.charAt(0) || 'W'}
              </div>
              <div className="flex flex-col">
                <span className="font-semibold text-xs leading-none mb-0.5">
                  {user?.nombre || 'Wendy'}
                </span>
                <span className="text-[10px] opacity-50 font-medium uppercase">Admin</span>
              </div>
            </div>
          </div>
        </header>

        {/* CONTENIDO PRINCIPAL */}
        <div className="p-8 space-y-10 max-w-7xl mx-auto">
          
          {/* SECCIÓN: Detalles del plan */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-slate-800">Detalles del plan</h3>
              <button className="text-xs font-bold text-indigo-600 hover:underline">Ver facturación</button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Card: Plan Activo */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-slate-800 text-sm tracking-tight">STARTER*</span>
                  <CheckCircle2 size={16} className="text-green-500" />
                </div>
                <div className="text-[11px] text-slate-400 font-medium space-y-1">
                  <p>Último pago: 10 febrero 2026</p>
                  <p className="text-indigo-500 font-bold">Vencimiento: 10 marzo 2026</p>
                </div>
              </div>

              {/* Card: Contactos */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-4 bg-slate-50 rounded-xl text-slate-300">
                  <Users size={26} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Contactos</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">5001 / 10000</p>
                </div>
              </div>

              {/* Card: Agentes */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-4 bg-slate-50 rounded-xl text-slate-300">
                  <User size={26} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Total agentes</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">0 / 0</p>
                </div>
              </div>

              {/* Card: Dispositivos */}
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-5">
                <div className="p-4 bg-slate-50 rounded-xl text-slate-300">
                  <Smartphone size={26} />
                </div>
                <div>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Dispositivos</p>
                  <p className="text-2xl font-black text-slate-800 tracking-tighter">2 / 2</p>
                </div>
              </div>
            </div>
          </section>

          {/* SECCIÓN: Conexiones */}
          <section>
            <h3 className="text-lg font-bold text-slate-800 mb-6">Mis Conexiones</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              
              {/* Conexión: Sin asignar */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 flex flex-col items-center shadow-sm hover:shadow-xl transition-all group">
                <div className="w-24 h-24 bg-slate-100 rounded-full mb-5 flex items-center justify-center text-slate-300">
                  <Smartphone size={44} />
                </div>
                <h4 className="font-bold text-sm uppercase tracking-tighter text-slate-800">Sin asignar</h4>
                <div className="bg-slate-50 text-slate-500 text-[10px] px-8 py-2 rounded-full font-bold my-6 uppercase tracking-widest border border-slate-100">
                  Sin uso
                </div>
                <button className="w-full py-3 border border-slate-200 text-slate-600 text-[11px] font-bold rounded-2xl hover:bg-slate-50 transition-colors uppercase tracking-tighter">
                  Conectar número
                </button>
              </div>

              {/* Conexión: DiinNovate */}
              <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 flex flex-col items-center shadow-sm relative hover:shadow-xl transition-all group">
                <button className="absolute top-6 right-6 text-slate-300 hover:text-slate-500">
                  <MoreVertical size={18} />
                </button>
                
                <div className="w-24 h-24 bg-indigo-50 rounded-full mb-5 flex items-center justify-center border-4 border-white shadow-md">
                  <User size={44} className="text-indigo-500" />
                </div>
                
                <h4 className="font-bold text-sm uppercase tracking-tighter text-slate-800">DiinNovate</h4>
                <p className="text-xs text-indigo-500 font-bold mt-1">+593 98 613 0956</p>
                
                <div className="bg-green-100 text-green-700 text-[10px] px-8 py-2 rounded-full font-bold my-6 uppercase tracking-widest border border-green-200">
                  Conectado
                </div>
                
                <button className="w-full py-3 bg-red-50 text-red-500 text-[11px] font-bold rounded-2xl hover:bg-red-100 transition-colors border border-red-100 uppercase tracking-tighter">
                  Desconectar número
                </button>
              </div>

              {/* Botón: Mejorar plan */}
              <div className="border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center p-8 cursor-pointer hover:border-indigo-300 hover:bg-white transition-all group min-h-[320px]">
                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform shadow-sm group-hover:bg-indigo-50">
                  <Plus size={36} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                </div>
                <span className="text-[11px] font-bold text-slate-400 mt-5 uppercase tracking-[0.25em] group-hover:text-indigo-600 transition-colors">
                  Mejorar Plan
                </span>
              </div>

            </div>
          </section>
        </div>
      </main>
    </div>
  );
}