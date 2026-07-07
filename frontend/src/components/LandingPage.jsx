import React from 'react';
import PublicLayout from './PublicLayout';

export default function LandingPage() {
  return (
    <PublicLayout>
      <div className="py-20 text-center bg-white min-h-[60vh] flex flex-col items-center justify-center">
        <h2 className="text-3xl font-black text-[#1e1b4b]">
          Bienvenido a GeoChat
        </h2>
        <p className="text-slate-500 mt-2 max-w-md mx-auto font-medium text-sm">
          Esta sección está lista para el rediseño. Puedes comenzar a estructurar la página de inicio desde aquí.
        </p>
      </div>
    </PublicLayout>
  );
}
