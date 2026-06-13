import { useMemo, useState, type ReactNode } from "react"
import { Coins, Filter } from "lucide-react"
import {
  MARCO_COMPANIAS_LUZ,
  formatMarcoComisionBase,
  formatMarcoComisionUsuario,
  marcoRetributivoCatalog,
} from "../data/marco-retributivo-catalog"

interface MarcoRetributivoPanelProps {
  commissionPercentage: number
  formatCurrency: (val: number) => string
  renderCompaniaLogo: (brandName: string) => ReactNode
}

export function MarcoRetributivoPanel({
  commissionPercentage,
  formatCurrency,
  renderCompaniaLogo,
}: MarcoRetributivoPanelProps) {
  const [companiaFilter, setCompaniaFilter] = useState<string>("Todos")
  const [tipoFilter, setTipoFilter] = useState<"luz" | "gas" | "todos">("luz")
  const [peajeFilter, setPeajeFilter] = useState<string>("todos")

  const peajeOptions = useMemo(() => {
    const set = new Set(
      marcoRetributivoCatalog
        .filter((e) => tipoFilter === "todos" || e.tipo === tipoFilter)
        .map((e) => e.peaje)
    )
    return ["todos", ...Array.from(set).sort()]
  }, [tipoFilter])

  const filteredRows = useMemo(() => {
    return marcoRetributivoCatalog.filter((entry) => {
      if (tipoFilter !== "todos" && entry.tipo !== tipoFilter) return false
      if (companiaFilter !== "Todos" && entry.compania !== companiaFilter) return false
      if (peajeFilter !== "todos" && !entry.peaje.includes(peajeFilter)) return false
      return true
    })
  }, [companiaFilter, tipoFilter, peajeFilter])

  const countsByCompania = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const tab of MARCO_COMPANIAS_LUZ) {
      if (tab === "Todos") {
        counts[tab] = marcoRetributivoCatalog.filter(
          (e) => tipoFilter === "todos" || e.tipo === tipoFilter
        ).length
      } else {
        counts[tab] = marcoRetributivoCatalog.filter(
          (e) =>
            e.compania === tab && (tipoFilter === "todos" || e.tipo === tipoFilter)
        ).length
      }
    }
    return counts
  }, [tipoFilter])

  return (
    <div className="space-y-6 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="bg-brand-panel p-6 sm:p-8 rounded-3xl border border-brand-border space-y-5 relative shadow-sm dark:shadow-none bg-white dark:bg-[#0f172a]">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-brand-border pb-4">
          <div className="flex items-center space-x-3">
            <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
              <Coins className="w-6 h-6" />
            </span>
            <div>
              <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
                Marco Retributivo
              </h3>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-mono uppercase text-slate-500 flex items-center gap-1">
              <Filter className="w-3 h-3" />
              Suministro
            </span>
            {(["luz", "gas", "todos"] as const).map((tipo) => (
              <button
                key={tipo}
                type="button"
                onClick={() => {
                  setTipoFilter(tipo)
                  setPeajeFilter("todos")
                }}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all ${
                  tipoFilter === tipo
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white dark:bg-slate-950 border-brand-border text-brand-text hover:border-slate-300"
                }`}
              >
                {tipo === "todos" ? "Todos" : tipo}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {MARCO_COMPANIAS_LUZ.map((tab) => {
            const count = countsByCompania[tab] ?? 0
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setCompaniaFilter(tab)}
                className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg transition-all cursor-pointer border ${
                  companiaFilter === tab
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-slate-50 dark:bg-slate-950 border-brand-border text-brand-text hover:border-slate-300 dark:hover:border-white/15"
                }`}
              >
                {tab}
                {count > 0 && (
                  <span
                    className={`ml-1 px-1 text-[8px] font-bold rounded-full ${
                      companiaFilter === tab
                        ? "bg-white/20 text-white"
                        : "bg-amber-500/20 text-amber-600"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>

        {peajeOptions.length > 2 && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[9px] font-mono uppercase text-slate-500 w-full sm:w-auto">
              Peaje / ATR
            </span>
            {peajeOptions.map((peaje) => (
              <button
                key={peaje}
                type="button"
                onClick={() => setPeajeFilter(peaje)}
                className={`px-2.5 py-1 text-[9px] font-mono rounded-md border ${
                  peajeFilter === peaje
                    ? "bg-slate-800 text-white border-slate-800 dark:bg-slate-700"
                    : "border-brand-border text-brand-subtext"
                }`}
              >
                {peaje === "todos" ? "Todos los peajes" : peaje}
              </button>
            ))}
          </div>
        )}

        <div className="overflow-x-auto rounded-2xl border border-brand-border">
          <table className="w-full min-w-[880px] text-left text-xs">
            <thead>
              <tr className="bg-slate-100 dark:bg-slate-950/80 border-b border-brand-border">
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  Compañía
                </th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  Tarifa
                </th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  Peaje
                </th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold min-w-[200px]">
                  Condiciones
                </th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  Permanencia
                </th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right">
                  Comisión base
                </th>
                <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-amber-600 font-bold text-right">
                  Tu comisión
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-border">
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-brand-subtext font-mono text-[11px]">
                    No hay tarifas para los filtros seleccionados.
                  </td>
                </tr>
              ) : (
                filteredRows.map((entry) => (
                  <tr
                    key={entry.id}
                    className="bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <td className="px-4 py-3 align-top">
                      {renderCompaniaLogo(entry.compania)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span className="font-semibold text-brand-text block">{entry.tarifa}</span>
                      <span
                        className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                          entry.tipo === "luz"
                            ? "bg-blue-500/10 text-blue-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {entry.tipo}
                      </span>
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-[10px] text-brand-subtext whitespace-nowrap">
                      {entry.peaje}
                    </td>
                    <td className="px-4 py-3 align-top text-[11px] text-brand-subtext leading-relaxed max-w-xs">
                      {entry.condiciones}
                    </td>
                    <td className="px-4 py-3 align-top font-mono text-[10px] text-brand-subtext whitespace-nowrap">
                      {entry.vigenciaMeses === 0
                        ? "Sin permanencia"
                        : `${entry.vigenciaMeses} meses`}
                    </td>
                    <td className="px-4 py-3 align-top text-right font-mono text-[11px] text-brand-text whitespace-nowrap">
                      {formatMarcoComisionBase(entry)}
                    </td>
                    <td className="px-4 py-3 align-top text-right font-mono text-[11px] font-bold text-amber-600 dark:text-amber-500 whitespace-nowrap">
                      {formatMarcoComisionUsuario(entry, commissionPercentage, formatCurrency)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p className="text-[9px] font-mono text-slate-400 text-right">
          {filteredRows.length} tarifa{filteredRows.length !== 1 ? "s" : ""} · actualizado Mayo 2026
        </p>
      </div>
    </div>
  )
}
