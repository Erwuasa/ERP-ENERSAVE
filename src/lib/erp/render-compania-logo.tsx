import type { ReactNode } from "react"

export function renderCompaniaLogo(brandName: string): ReactNode {
  const brand = (brandName || '').toLowerCase().trim();
  
  if (brand.includes('niba')) {
    return (
      <span className="inline-flex items-center bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Niba EnergÃ­a">
        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block mr-1 shrink-0" />
        NIBA
      </span>
    );
  } else if (brand.includes('connect') || brand.includes('global')) {
    return (
      <span className="inline-flex items-center bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Global Connect">
        <span className="w-2 h-2 rounded-full bg-teal-450 inline-block mr-1 shrink-0 animate-pulse" />
        GLOBAL CONNECT
      </span>
    );
  } else if (brand.includes('axpo')) {
    return (
      <span className="inline-flex items-center bg-red-600/10 text-red-600 dark:text-red-450 border border-red-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Axpo Iberia">
        <span className="w-2 h-2 rounded bg-red-600 inline-block mr-1 shrink-0" />
        AXPO
      </span>
    );
  } else if (brand.includes('endesa')) {
    return (
      <span className="inline-flex items-center bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Endesa">
        <span className="w-2 h-2 rounded-full bg-cyan-400 inline-block mr-1 shrink-0 animate-ping" style={{ animationDuration: '3s' }} />
        ENDESA
      </span>
    );
  } else if (brand.includes('repsol')) {
    return (
      <span className="inline-flex items-center bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Repsol">
        <span className="w-2 h-2 rounded-full bg-gradient-to-r from-orange-400 to-red-500 inline-block mr-1 shrink-0" />
        REPSOL
      </span>
    );
  } else if (brand.includes('naturgy')) {
    return (
      <span className="inline-flex items-center bg-yellow-600/10 text-yellow-600 dark:text-yellow-400 border border-yellow-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Naturgy">
        <span className="w-2 h-2 rounded bg-amber-500 inline-block mr-1 shrink-0" />
        NATURGY
      </span>
    );
  } else if (brand.includes('octopus')) {
    return (
      <span className="inline-flex items-center bg-pink-500/10 text-pink-600 dark:text-pink-400 border border-pink-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Octopus Energy">
        <span className="w-2 h-2 rounded-full bg-pink-500 inline-block mr-1 shrink-0" />
        OCTOPUS
      </span>
    );
  } else if (brand.includes('factor')) {
    return (
      <span className="inline-flex items-center bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Factorenergia">
        <span className="w-2 h-2 rounded bg-emerald-500 inline-block mr-1 shrink-0" />
        FACTOR ENERGÃA
      </span>
    );
  } else if (brand.includes('ignis')) {
    return (
      <span className="inline-flex items-center bg-purple-600/10 text-purple-600 dark:text-purple-400 border border-purple-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider" title="Ignis">
        <span className="w-2 h-2 rounded-full bg-purple-500 inline-block mr-1 shrink-0" />
        IGNIS
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/25 px-2 py-0.5 rounded text-[9px] font-extrabold font-mono tracking-wider">
        <span className="w-2 h-2 rounded-full bg-slate-400 inline-block mr-1 shrink-0" />
        {brandName.toUpperCase()}
      </span>
    );
  }
};
