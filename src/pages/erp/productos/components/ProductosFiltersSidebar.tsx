import { useState } from "react"
import { ChevronDown, Filter } from "lucide-react"
import {
  PRODUCTO_PEAJE_OPTIONS,
  PRODUCTO_TIPO_CLIENTE_OPTIONS,
  type ProductoPeajeFilter,
  type ProductoTipoClienteFilter,
  type ProductoWebVisibilityFilter,
} from "@/lib/productos-catalog"

const WEB_VISIBILITY_OPTIONS: { id: ProductoWebVisibilityFilter; label: string }[] = [
  { id: "todas", label: "Todas" },
  { id: "publicadas", label: "Publicadas web" },
  { id: "ocultas", label: "Ocultas web" },
]

type Props = {
  tipoCliente: ProductoTipoClienteFilter
  setTipoCliente: (value: ProductoTipoClienteFilter) => void
  peaje: ProductoPeajeFilter
  setPeaje: (value: ProductoPeajeFilter) => void
  webVisibility: ProductoWebVisibilityFilter
  setWebVisibility: (value: ProductoWebVisibilityFilter) => void
}

export function ProductosFiltersSidebar({
  tipoCliente,
  setTipoCliente,
  peaje,
  setPeaje,
  webVisibility,
  setWebVisibility,
}: Props) {
  // Por debajo de xl, Filtros va colapsado por defecto para no comerse la
  // pantalla y dejar ver las tarifas de entrada. En xl+ siempre va expandido
  // (el botón/chevron de abajo se ocultan con xl:hidden / xl:pointer-events-none).
  const [mobileOpen, setMobileOpen] = useState(false)
  const activeFiltersCount =
    (tipoCliente !== "todos" ? 1 : 0) +
    (peaje !== "todos" ? 1 : 0) +
    (webVisibility !== "todas" ? 1 : 0)

  return (
    <aside className="w-full xl:w-56 shrink-0 xl:overflow-y-auto bg-brand-panel border border-brand-border rounded-2xl p-4 shadow-sm dark:shadow-none">
      <button
        type="button"
        onClick={() => setMobileOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 text-brand-text cursor-pointer xl:cursor-default xl:pointer-events-none"
        aria-expanded={mobileOpen}
      >
        <span className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-brand-subtext" />
          <span className="text-xs font-bold">Filtros</span>
          {activeFiltersCount > 0 && (
            <span className="inline-flex min-w-[1.1rem] justify-center px-1 py-0.5 rounded-full bg-emerald-600 text-white text-[9px] font-mono font-bold tabular-nums xl:hidden">
              {activeFiltersCount}
            </span>
          )}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-brand-subtext transition-transform xl:hidden ${
            mobileOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      <div className={`${mobileOpen ? "mt-5 space-y-5" : "hidden"} xl:mt-5 xl:space-y-5 xl:block`}>
        <div className="space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
            Tipo de cliente
          </p>
          <div className="flex flex-col gap-1">
            {PRODUCTO_TIPO_CLIENTE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setTipoCliente(opt.id)}
                className={`text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  tipoCliente === opt.id
                    ? "bg-emerald-600 text-white"
                    : "text-brand-subtext hover:bg-brand-surface hover:text-brand-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
            Visibilidad web
          </p>
          <div className="flex flex-col gap-1">
            {WEB_VISIBILITY_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setWebVisibility(opt.id)}
                className={`text-left px-2.5 py-2 rounded-lg text-[11px] font-medium transition-colors cursor-pointer ${
                  webVisibility === opt.id
                    ? "bg-emerald-600 text-white"
                    : "text-brand-subtext hover:bg-brand-surface hover:text-brand-text"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
            Peaje de acceso
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {PRODUCTO_PEAJE_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => setPeaje(opt.id)}
                className={`px-2 py-2 rounded-lg text-[10px] font-mono font-bold border transition-colors cursor-pointer ${
                  peaje === opt.id
                    ? "bg-emerald-600 text-white border-emerald-600"
                    : "bg-brand-surface text-brand-subtext border-brand-border hover:border-emerald-500/30"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </aside>
  )
}
