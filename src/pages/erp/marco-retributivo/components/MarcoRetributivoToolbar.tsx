import { Coins, Loader2, Plus, Search, Sparkles } from "lucide-react"
import { CompaniaFilterSelect } from "@/components/erp/CompaniaFilterSelect"

type Props = {
  supabaseConfigured: boolean
  canEdit: boolean
  tipoFilter: "luz" | "gas" | "todos"
  setTipoFilter: (tipo: "luz" | "gas" | "todos") => void
  segmentoFilter: "todos" | "residencial" | "pyme"
  setSegmentoFilter: (segmento: "todos" | "residencial" | "pyme") => void
  onCreate: () => void
  onDedupDuplicates?: () => void
  deduping?: boolean
  canDedup?: boolean
  companiaFilter: string
  setCompaniaFilter: (value: string) => void
  companyTabs: string[]
  countsByCompania: Record<string, number>
  peajeOptions: string[]
  peajeFilter: string
  setPeajeFilter: (value: string) => void
  search: string
  setSearch: (value: string) => void
}

export function MarcoRetributivoToolbar({
  supabaseConfigured,
  canEdit,
  tipoFilter,
  setTipoFilter,
  segmentoFilter,
  setSegmentoFilter,
  onCreate,
  onDedupDuplicates,
  deduping = false,
  canDedup = false,
  companiaFilter,
  setCompaniaFilter,
  companyTabs,
  countsByCompania,
  peajeOptions,
  peajeFilter,
  setPeajeFilter,
  search,
  setSearch,
}: Props) {
  const supplyOptions = [
    { id: "luz", label: "Luz" },
    { id: "gas", label: "Gas" },
    { id: "todos", label: "Todos" },
  ] as const
  const segmentOptions = [
    { id: "todos", label: "Todos" },
    { id: "residencial", label: "Residencial" },
    { id: "pyme", label: "PYME" },
  ] as const

  return (
    <>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-b border-brand-border pb-2.5">
        <div className="flex shrink-0 items-center gap-2">
          <span className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 shrink-0">
            <Coins className="w-5 h-5" aria-hidden />
          </span>
          <div className="shrink-0">
            <CompaniaFilterSelect
              value={companiaFilter}
              onChange={setCompaniaFilter}
              companias={companyTabs.filter((tab) => tab !== "Todos")}
              countsByCompania={countsByCompania}
              allOptionValue="Todos"
              allOptionLabel="Todos"
              fieldLabel="Marco retributivo"
              accent="blue"
              size="compact"
              showCounts
              hideEmpty={false}
            />
            {!supabaseConfigured && (
              <p className="text-[9px] font-mono text-amber-600 mt-1 pl-0.5">
                Catálogo local (Supabase no configurado)
              </p>
            )}
          </div>
        </div>

        <div
          className="flex shrink-0 items-center gap-1.5"
          role="group"
          aria-label="Suministro"
        >
          {supplyOptions.map((tipo) => (
            <button
              key={tipo.id}
              type="button"
              onClick={() => setTipoFilter(tipo.id)}
              aria-pressed={tipoFilter === tipo.id}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition-colors duration-200 cursor-pointer ${
                tipoFilter === tipo.id
                  ? "bg-blue-600 text-white border-blue-600"
                  : "bg-brand-panel border-brand-border text-brand-text hover:border-slate-300"
              }`}
            >
              {tipo.label}
            </button>
          ))}
        </div>

        <span className="hidden sm:inline w-px h-5 shrink-0 bg-brand-border" aria-hidden />

        <div
          className="flex shrink-0 flex-wrap items-center gap-1.5"
          role="group"
          aria-label="Segmento"
        >
          <span className="text-[9px] font-mono uppercase text-slate-500">Segmento</span>
          {segmentOptions.map((segmento) => (
            <button
              key={segmento.id}
              type="button"
              onClick={() => setSegmentoFilter(segmento.id)}
              aria-pressed={segmentoFilter === segmento.id}
              className={`shrink-0 whitespace-nowrap px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border transition-colors duration-200 cursor-pointer ${
                segmentoFilter === segmento.id
                  ? segmento.id === "residencial"
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : segmento.id === "pyme"
                      ? "bg-amber-600 text-white border-amber-600"
                      : "bg-blue-600 text-white border-blue-600"
                  : "bg-brand-panel border-brand-border text-brand-text hover:border-slate-300"
              }`}
            >
              {segmento.label}
            </button>
          ))}
        </div>

        <div className="ml-auto flex shrink-0 flex-wrap items-center gap-2">
          {canDedup && onDedupDuplicates ? (
            <button
              type="button"
              onClick={onDedupDuplicates}
              disabled={deduping}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border border-amber-500/40 bg-amber-500/10 text-amber-800 dark:text-amber-200 hover:bg-amber-500/15 transition-colors duration-200 cursor-pointer disabled:opacity-50"
            >
              {deduping ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Sparkles className="h-3.5 w-3.5" />
              )}
              Quitar duplicados
            </button>
          ) : null}
          {canEdit && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap px-3 py-1.5 text-[10px] font-mono font-bold uppercase rounded-lg border border-cyan-600 bg-cyan-600 text-white hover:bg-cyan-500 transition-colors duration-200 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva entrada
            </button>
          )}
        </div>
      </div>

      <label className="flex min-w-0 max-w-md items-center gap-2 rounded-xl border border-brand-border bg-brand-surface px-3 py-2 transition-colors duration-200 focus-within:border-blue-500">
        <Search className="h-3.5 w-3.5 shrink-0 text-brand-subtext" aria-hidden />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Buscar tarifa o compañía"
          aria-label="Buscar tarifa o compañía"
          className="min-w-0 flex-1 bg-transparent text-xs text-brand-text outline-none placeholder:text-brand-subtext"
        />
      </label>

      {peajeOptions.length > 1 && (
        <div className="flex w-full min-w-0 flex-wrap items-center gap-2">
          <span className="text-[9px] font-mono uppercase text-slate-500 w-full sm:w-auto">
            Peaje / ATR
          </span>
          {peajeOptions.map((peaje) => (
            <button
              key={peaje}
              type="button"
              onClick={() => setPeajeFilter(peaje)}
              className={`max-w-full shrink-0 whitespace-nowrap px-2.5 py-1 text-[9px] font-mono rounded-md border cursor-pointer transition-colors duration-200 ${
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
