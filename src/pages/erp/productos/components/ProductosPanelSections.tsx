import {
  CalendarDays,
  Flame,
  Lightbulb,
  Loader2,
  Package,
  Phone,
  Search,
  Sparkles,
  X,
} from "lucide-react"
import type { ProductoSuministroTab, ProductoTarifa } from "@/lib/productos-catalog"
import { SUPPLY_KIND_THEME, supplyTabClass } from "@/lib/enersave-ui-theme"
import { ProductosCompaniaSelect } from "@/pages/erp/productos/components/ProductosCompaniaSelect"
import { ProductosTable } from "@/pages/erp/productos/components/ProductosTable"

type Props = {
  title: string
  onOpenCalendario: () => void
  onDedupTariffs?: () => void
  dedupingTariffs?: boolean
  canDedupTariffs?: boolean
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
  canManageTariffs: boolean
  onCreateContract: (product: ProductoTarifa) => void
  onOpenTariff: (product: ProductoTarifa) => void
}

const SUMINISTRO_TABS = [
  { id: "luz" as const, label: "Luz", icon: Lightbulb },
  { id: "gas" as const, label: "Gas", icon: Flame },
  { id: "telefonia" as const, label: "Telefonía", icon: Phone },
] as const

function suministroTabClass(tabId: ProductoSuministroTab, isActive: boolean): string {
  return supplyTabClass(tabId, isActive)
}

export function ProductosPanelHeader({
  onOpenCalendario,
  onDedupTariffs,
  dedupingTariffs = false,
  canDedupTariffs = false,
  suministro,
  setSuministro,
  compania,
  setCompania,
  companias,
  countsByCompania,
  supplyTabCounts,
}: Pick<
  Props,
  | "onOpenCalendario"
  | "onDedupTariffs"
  | "dedupingTariffs"
  | "canDedupTariffs"
  | "suministro"
  | "setSuministro"
  | "compania"
  | "setCompania"
  | "companias"
  | "countsByCompania"
  | "supplyTabCounts"
>) {
  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 border border-cyan-500/20 shrink-0">
            <Package className="h-4 w-4" aria-hidden />
          </span>
          <ProductosCompaniaSelect
            value={compania}
            onChange={setCompania}
            companias={companias}
            countsByCompania={countsByCompania}
          />
        </div>
        <div className="flex flex-wrap items-center gap-2 ml-auto">
        {canDedupTariffs && onDedupTariffs ? (
          <button
            type="button"
            onClick={onDedupTariffs}
            disabled={dedupingTariffs}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-amber-500/35 bg-amber-500/10 text-[11px] font-bold text-amber-900 dark:text-amber-100 hover:bg-amber-500/15 transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            {dedupingTariffs ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Sparkles className="h-3.5 w-3.5" />
            )}
            Quitar duplicados
          </button>
        ) : null}
        <button
          type="button"
          onClick={onOpenCalendario}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-[11px] font-bold text-cyan-800 dark:text-cyan-200 hover:bg-cyan-500/15 hover:border-cyan-500/45 transition-colors cursor-pointer shrink-0"
        >
          <CalendarDays className="h-4 w-4" />
          Calendario Económico
        </button>
        </div>
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-xl p-3 shadow-sm dark:shadow-none">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider shrink-0">
            Tipo de producto
          </p>
          <div className="flex flex-wrap gap-1">
            {SUMINISTRO_TABS.map((tab) => {
              const Icon = tab.icon
              const count =
                tab.id === "telefonia" ? 0 : tab.id === "luz" ? supplyTabCounts.luz : supplyTabCounts.gas
              const isActive = suministro === tab.id
              const styles = SUPPLY_KIND_THEME[tab.id]
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setSuministro(tab.id)
                    setCompania("Todas")
                  }}
                  className={suministroTabClass(tab.id, isActive)}
                >
                  <Icon className={`h-3.5 w-3.5 ${styles.icon}`} />
                  {tab.label}
                  <span className="text-[10px] font-mono opacity-80 tabular-nums">{count}</span>
                </button>
              )
            })}
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
  canManageTariffs,
  onCreateContract,
  onOpenTariff,
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
  | "canManageTariffs"
  | "onCreateContract"
  | "onOpenTariff"
>) {
  return (
    <div className="xl:flex-1 min-w-0 xl:min-h-0 flex flex-col gap-3">
      <div className="relative shrink-0">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-subtext pointer-events-none" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre de tarifa o compañía..."
          className="w-full pl-10 pr-24 py-2 rounded-xl border border-brand-border bg-brand-surface text-sm text-brand-text placeholder:text-brand-subtext/70"
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
            <Phone className="h-8 w-8 mx-auto text-blue-500 dark:text-blue-400 mb-2" />
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
          <div className="space-y-3">
            <div key={filtered.map((product) => product.id).join("|")} className="animate-fade-in-ease">
              <ProductosTable
                products={filtered}
                onCreateContract={onCreateContract}
                canManageTariffs={canManageTariffs}
                onOpenTariff={onOpenTariff}
              />
            </div>
            {hasMore && (
              <div className="flex justify-center pb-2">
                <button
                  type="button"
                  onClick={onLoadMore}
                  disabled={loadingMore}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-brand-border bg-brand-panel text-xs font-bold text-brand-text hover:border-emerald-500/40 hover:text-emerald-600 disabled:opacity-60 cursor-pointer"
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
