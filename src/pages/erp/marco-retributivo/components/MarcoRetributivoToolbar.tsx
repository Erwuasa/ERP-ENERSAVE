import { Coins, Filter, Plus } from "lucide-react"
import { MARCO_COMPANIAS_LUZ } from "@/data/marco-retributivo-catalog"

type Props = {
  supabaseConfigured: boolean
  canEdit: boolean
  tipoFilter: "luz" | "gas" | "todos"
  setTipoFilter: (tipo: "luz" | "gas" | "todos") => void
  onCreate: () => void
  companiaFilter: string
  setCompaniaFilter: (value: string) => void
  countsByCompania: Record<string, number>
  peajeOptions: string[]
  peajeFilter: string
  setPeajeFilter: (value: string) => void
}

export function MarcoRetributivoToolbar({
  supabaseConfigured,
  canEdit,
  tipoFilter,
  setTipoFilter,
  onCreate,
  companiaFilter,
  setCompaniaFilter,
  countsByCompania,
  peajeOptions,
  peajeFilter,
  setPeajeFilter,
}: Props) {
  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-brand-border pb-4">
        <div className="flex items-center space-x-3">
          <span className="p-2 rounded-xl bg-blue-600/10 text-blue-600">
            <Coins className="w-6 h-6" />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-brand-text tracking-wide uppercase">
              Marco Retributivo
            </h3>
            {!supabaseConfigured && (
              <p className="text-[9px] font-mono text-amber-600 mt-0.5">
                Catálogo local (Supabase no configurado)
              </p>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canEdit && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva entrada
            </button>
          )}
          <span className="text-[9px] font-mono uppercase text-slate-500 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Suministro
          </span>
          {(["luz", "gas", "todos"] as const).map((tipo) => (
            <button
              key={tipo}
              type="button"
              onClick={() => setTipoFilter(tipo)}
              className={`px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition-all cursor-pointer ${
                tipoFilter === tipo
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-brand-panel border-brand-border text-brand-text hover:border-slate-300"
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
                  : "bg-brand-surface border-brand-border text-brand-text hover:border-slate-300 dark:hover:border-white/15"
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
              className={`px-2.5 py-1 text-[9px] font-mono rounded-md border cursor-pointer ${
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
    </>
  )
}
