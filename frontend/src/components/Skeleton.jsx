// Skeleton.jsx — Componente de carga animada reutilizable
import React from 'react';

/* ── Bloque de skeleton base ── */
export function SkeletonBlock({ className = '' }) {
  return <div className={`skeleton ${className}`} />;
}

/* ── Skeleton para una tarjeta de estadística (Dashboard) ── */
export function SkeletonStatCard() {
  return (
    <div className="skeleton-card flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <SkeletonBlock className="h-10 w-10 rounded-2xl" />
        <SkeletonBlock className="h-4 w-16 rounded-full" />
      </div>
      <SkeletonBlock className="h-7 w-20 mt-1" />
      <SkeletonBlock className="h-3 w-24 rounded-full" />
      <SkeletonBlock className="h-1.5 w-full rounded-full mt-1" />
    </div>
  );
}

/* ── Skeleton para fila de tabla ── */
export function SkeletonTableRow({ cols = 5 }) {
  const widths = ['w-40', 'w-28', 'w-20', 'w-24', 'w-16', 'w-12'];
  return (
    <tr className="border-b border-[#f0fdf9]">
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-6 py-4">
          <SkeletonBlock className={`h-4 ${widths[i % widths.length]} rounded-full`} />
        </td>
      ))}
    </tr>
  );
}

/* ── Skeleton para tarjeta de contacto ── */
export function SkeletonContactCard() {
  return (
    <div className="skeleton-card flex items-center gap-4">
      <SkeletonBlock className="w-12 h-12 rounded-full shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <SkeletonBlock className="h-3 w-20 rounded-full" />
      </div>
      <SkeletonBlock className="h-5 w-16 rounded-full shrink-0" />
    </div>
  );
}

/* ── Skeleton para item de chat ── */
export function SkeletonChatItem() {
  return (
    <div className="flex items-center gap-3 px-4 py-3 border-b border-[#f0fdf9]">
      <SkeletonBlock className="w-11 h-11 rounded-full shrink-0" />
      <div className="flex-1 space-y-2 min-w-0">
        <div className="flex justify-between">
          <SkeletonBlock className="h-3.5 w-28 rounded-full" />
          <SkeletonBlock className="h-3 w-10 rounded-full" />
        </div>
        <SkeletonBlock className="h-3 w-44 rounded-full" />
      </div>
    </div>
  );
}

/* ── Skeleton para tarjeta de carpeta/automatización ── */
export function SkeletonFolderCard() {
  return (
    <div className="skeleton-card flex items-center gap-3">
      <SkeletonBlock className="w-11 h-11 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-32 rounded-full" />
        <SkeletonBlock className="h-3 w-20 rounded-full" />
      </div>
      <SkeletonBlock className="w-8 h-8 rounded-xl shrink-0" />
    </div>
  );
}

/* ── Skeleton para metric chip ── */
export function SkeletonMetricChip() {
  return (
    <div className="skeleton-card flex flex-col gap-3 py-4 px-5">
      <SkeletonBlock className="h-3 w-28 rounded-full" />
      <SkeletonBlock className="h-8 w-16" />
    </div>
  );
}

/* ── Skeleton para kanban card ── */
export function SkeletonKanbanCard() {
  return (
    <div className="skeleton-card space-y-3 mb-3">
      <SkeletonBlock className="h-4 w-3/4 rounded-full" />
      <SkeletonBlock className="h-3 w-1/2 rounded-full" />
      <div className="flex gap-2 pt-1">
        <SkeletonBlock className="h-5 w-16 rounded-full" />
        <SkeletonBlock className="h-5 w-12 rounded-full" />
      </div>
    </div>
  );
}

/* ── Skeleton para tarjeta de whalink ── */
export function SkeletonWhalinkCard() {
  return (
    <div className="skeleton-card flex items-center gap-4">
      <SkeletonBlock className="w-12 h-12 rounded-2xl shrink-0" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-36 rounded-full" />
        <SkeletonBlock className="h-3 w-48 rounded-full" />
      </div>
      <SkeletonBlock className="h-6 w-16 rounded-full shrink-0" />
    </div>
  );
}

export default SkeletonBlock;
