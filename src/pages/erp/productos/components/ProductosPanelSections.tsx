import { ArrowRight, FileSpreadsheet, Flame, Lightbulb, Loader2, Package, Phone, Search, X } from "lucide-react"
import type { ProductoSuministroTab, ProductoTarifa } from "@/lib/productos-catalog"
import { ProductosTable } from "@/pages/erp/productos/components/ProductosTable"

type Props = {
  title: string
  subtitle: string
  onNavigateContratos: () => void
  suministro: ProductoSuministroTab
  setSuministro: (tab: ProductoSuministroTab) => void
  compania: string
  setCompania: (value: string) => void
  companias: string[]
  countsByCompania: Record<string, number>
  totalActivas: number
  webPublishedCount: number
  supplyTabCounts: { luz: number; gas: number }
  search: string
  setSearch: (value: string) => void
  loading: boolean
  loadingMore: boolean
  filtered: ProductoTarifa[]
  totalFiltered: number
  hasMore: boolean
  onLoadMore: () => void
  canEditWeb: boolean
  onCreateContract: (product: ProductoTarifa) => void
  onEditWeb: (product: ProductoTarifa) => void
}

const SUMINISTRO_TABS = [
  { id: "luz" as const, label: "Luz", icon: Lightbulb },
  { id: "gas" as const, label: "Gas", icon: Flame },
  { id: "telefonia" as const, label: "Telefonía", icon: Phone },
]

export function ProductosPanelHeader({
  title,
  subtitle,
  onNavigateContratos,
  suministro,
  setSuministro,
  compania,
  setCompania,
  companias,
  countsByCompania,
  totalActivas,
  webPublishedCount,
  supplyTabCounts,
}: Pick<
  Props,
  | "title"
  | "subtitle"
  | "onNavigateContratos"
  | "suministro"
  | "setSuministro"
  | "compania"
  | "setCompania"
  | "companias"
  | "countsByCompania"
  | "totalActivas"
  | "webPublishedCount"
  | "supplyTabCounts"
>) {
  return (
    <>
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
            <Package className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-brand-text tracking-tight">{title}</h2>
            <p className="text-xs text-brand-subtext mt-1 max-w-2xl leading-relaxed">{subtitle}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onNavigateContratos}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-border bg-brand-panel text-xs font-bold text-brand-text hover:border-emerald-500/40 hover:text-emerald-600 transition-colors cursor-pointer shrink-0 self-start"
        >
          <FileSpreadsheet className="h-4 w-4" />
          Ir a contratos
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-2xl p-4 sm:p-5 space-y-4 shadow-sm dark:shadow-none">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 border-b border-brand-border pb-3">
          <div className="space-y-2">
            <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
              Tipo de producto
            </p>
            <div className="flex flex-wrap gap-1">
              {SUMINISTRO_TABS.map((tab) => {
                const Icon = tab.icon
                const count =
                  tab.id === "telefonia" ? 0 : tab.id === "luz" ? supplyTabCounts.luz : supplyTabCounts.gas
                const isActive = suministro === tab.id
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      setSuministro(tab.id)
                      setCompania("Todas")
                    }}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-bold border-b-2 transition-colors cursor-pointer ${
                      isActive
                        ? "border-emerald-600 text-emerald-600"
                        : "border-transparent text-brand-subtext hover:text-brand-text"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {tab.label}
                    <span className="text-[10px] font-mono opacity-70">[{count}]</span>
                  </button>
                )
              })}
            </div>
          </div>
          <p className="text-[11px] font-mono text-brand-subtext shrink-0">
            <span className="font-bold text-brand-text">{totalActivas}</span> tarifa
            {totalActivas !== 1 ? "s" : ""} activa{totalActivas !== 1 ? "s" : ""}
            <span className="mx-2 text-brand-border">·</span>
            <span className="font-bold text-emerald-600 dark:text-emerald-400">{webPublishedCount}</span> en web
          </p>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
            Comercializadora
          </p>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => setCompania("Todas")}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition-colors ${
                compania === "Todas"
                  ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                  : "border-brand-border text-brand-subtext hover:border-emerald-500/30"
              }`}
            >
              Todas
              <span className="inline-flex min-w-[1.25rem] justify-center px-1 py-0.5 rounded-full bg-slate-200/80 dark:bg-brand-surface text-[9px] tabular-nums">
                {countsByCompania.Todas ?? 0}
              </span>
            </button>
            {companias.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCompania(c)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[10px] font-mono font-bold border cursor-pointer transition-colors ${
                  compania === c
                    ? "border-emerald-600 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : "border-brand-border text-brand-subtext hover:border-emerald-500/30"
                }`}
              >
                {c}
                <span className="inline-flex min-w-[1.25rem] justify-center px-1 py-0.5 rounded-full bg-slate-200/80 dark:bg-brand-surface text-[9px] tabular-nums">
                  {countsByCompania[c] ?? 0}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

export function ProductosList({
  search,
  setSearch,
  loading,
  loadingMore,
  suministro,
  filtered,
  totalFiltered,
  hasMore,
  onLoadMore,
  canEditWeb,
  onCreateContract,
  onEditWeb,
}: Pick<
  Props,
  | "search"
  | "setSearch"
  | "loading"
  | "loadingMore"
  | "suministro"
  | "filtered"
  | "totalFiltered"
  | "hasMore"
  | "onLoadMore"
  | "canEditWeb"
  | "onCreateContract"
  | "onEditWeb"
>) {
  return (
    <div className="xl:flex-1 min-w-0 xl:min-h-0 flex flex-col gap-4">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-subtext pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre de tarifa o compañía..."
          className="w-full pl-10 pr-24 py-2.5 rounded-xl border border-brand-border bg-brand-surface text-sm text-brand-text placeholder:text-brand-subtext/70"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-mono text-brand-subtext pointer-events-none">
          {filtered.length}/{totalFiltered} tarifa{totalFiltered !== 1 ? "s" : ""}
        </span>
        {search && (
          <button
            type="button"
            onClick={() => setSearch("")}
            className="absolute right-16 top-1/2 -translate-y-1/2 text-brand-subtext cursor-pointer"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* xl+: solo esta zona hace scroll, el header y los filtros de arriba quedan fijos.
          Por debajo de xl fluye con el resto de la página. */}
      <div className="xl:flex-1 xl:min-h-0 xl:overflow-y-auto pr-1 -mr-1">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-20 text-brand-subtext border border-dashed border-brand-border rounded-2xl bg-brand-panel">
            <Loader2 className="h-5 w-5 animate-spin" />
            <span className="text-xs font-mono">Cargando tarifas…</span>
          </div>
        ) : suministro === "telefonia" ? (
          <div
            key="telefonia"
            className="animate-fade-in-ease text-center py-16 border border-dashed border-brand-border rounded-2xl bg-brand-panel"
          >
            <Phone className="h-8 w-8 mx-auto text-brand-subtext mb-2" />
            <p className="text-sm font-semibold text-brand-text">Telefonía próximamente</p>
            <p className="text-xs text-brand-subtext mt-1">
              No hay tarifas de telefonía activas en el catálogo.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <div
            key="empty"
            className="animate-fade-in-ease text-center py-16 border border-dashed border-brand-border rounded-2xl bg-brand-panel"
          >
            <p className="text-sm font-semibold text-brand-text">Sin tarifas</p>
            <p className="text-xs text-brand-subtext mt-1">
              Ajusta los filtros o prueba otra comercializadora.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div key={filtered.map((product) => product.id).join("|")} className="animate-fade-in-ease">
              <ProductosTable
                products={filtered}
                onCreateContract={onCreateContract}
                canEditWeb={canEditWeb}
                onEditWeb={onEditWeb}
              />
            </div>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-brand-border bg-brand-panel text-xs font-bold text-brand-text hover:border-emerald-500/40 hover:text-emerald-600 disabled:opacity-60 cursor-pointer"
                >
                  {loadingMore && <Loader2 className="h-4 w-4 animate-spin" />}
                  {loadingMore ? "Cargando…" : `Cargar más (${filtered.length}/${totalFiltered})`}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
