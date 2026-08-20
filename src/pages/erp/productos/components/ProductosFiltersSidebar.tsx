import { Filter } from "lucide-react"
import {
  PRODUCTO_PEAJE_OPTIONS,
  PRODUCTO_TIPO_CLIENTE_OPTIONS,
  type ProductoPeajeFilter,
  type ProductoTipoClienteFilter,
} from "@/lib/productos-catalog"

type Props = {
  tipoCliente: ProductoTipoClienteFilter
  setTipoCliente: (value: ProductoTipoClienteFilter) => void
  peaje: ProductoPeajeFilter
  setPeaje: (value: ProductoPeajeFilter) => void
}

export function ProductosFiltersSidebar({
  tipoCliente,
  setTipoCliente,
  peaje,
  setPeaje,
}: Props) {
  return (
    <aside className="w-full xl:w-56 shrink-0 bg-brand-panel border border-brand-border rounded-2xl p-4 space-y-5 shadow-sm dark:shadow-none">
      <div className="flex items-center gap-2 text-brand-text">
        <Filter className="h-4 w-4 text-brand-subtext" />
        <span className="text-xs font-bold">Filtros</span>
      </div>

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
    </aside>
  )
}
