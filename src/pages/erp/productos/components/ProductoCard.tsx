import { Flame, Globe, GlobeLock, Phone, Zap, Plus, ChevronRight, Settings2 } from "lucide-react"
import {
  formatPrecioEnergia,
  formatPrecioPotencia,
  type ProductoSuministroTab,
  type ProductoTarifa,
} from "@/lib/productos-catalog"

function SuministroIcon({ tipo }: { tipo: ProductoSuministroTab | "luz" | "gas" }) {
  if (tipo === "gas") return <Flame className="h-3 w-3" aria-hidden />
  if (tipo === "telefonia") return <Phone className="h-3 w-3" aria-hidden />
  return <Zap className="h-3 w-3" aria-hidden />
}

type Props = {
  product: ProductoTarifa
  onCreateContract: (product: ProductoTarifa) => void
  canEditWeb: boolean
  onEditWeb: (product: ProductoTarifa) => void
}

export function ProductoCard({ product, onCreateContract, canEditWeb, onEditWeb }: Props) {
  const energiaRows = ([1, 2, 3, 4, 5, 6] as const)
    .map((n) => {
      const val = product.precios.energia[`p${n}`]
      return val != null ? { label: `Energía P${n}`, value: formatPrecioEnergia(val) } : null
    })
    .filter(Boolean) as { label: string; value: string }[]

  const potenciaRows = ([1, 2, 3, 4, 5, 6] as const)
    .map((n) => {
      const val = product.precios.potencia[`p${n}`]
      return val != null ? { label: `Potencia P${n}`, value: formatPrecioPotencia(val) } : null
    })
    .filter(Boolean) as { label: string; value: string }[]

  const pricingRows = [...energiaRows.slice(0, 3), ...potenciaRows.slice(0, 2)]
  const hasAlias = product.webAlias && product.webAlias !== product.catalogName

  return (
    <article className="bg-brand-panel border border-brand-border rounded-2xl p-4 flex flex-col gap-3 shadow-sm hover:border-emerald-500/35 transition-colors duration-200 h-full">
      <div className="flex items-start justify-between gap-2">
        <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wide truncate">
          {product.compania}
        </p>
        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={() => onEditWeb(product)}
            className="p-1 rounded-md border border-brand-border text-brand-subtext hover:text-emerald-600 hover:border-emerald-500/40 cursor-pointer"
            title={canEditWeb ? "Configurar publicación web" : "Ver publicación web"}
            aria-label="Configurar publicación web"
          >
            <Settings2 className="h-3 w-3" />
          </button>
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
              product.webVisible
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                : "bg-slate-500/10 text-brand-subtext border-brand-border"
            }`}
            title={product.webVisible ? "Visible en web" : "Oculta en web"}
          >
            {product.webVisible ? <Globe className="h-2.5 w-2.5" /> : <GlobeLock className="h-2.5 w-2.5" />}
            {product.webVisible ? "Web" : "Oculta"}
          </span>
          <span
            className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
              product.tipo === "luz"
                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
            }`}
          >
            <SuministroIcon tipo={product.tipo} />
            {product.tipo}
          </span>
          <span className="inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold bg-slate-500/10 text-brand-subtext border border-brand-border uppercase">
            {product.peaje}
          </span>
        </div>
      </div>

      <div className="space-y-1">
        <h4 className="text-sm font-bold text-brand-text leading-snug line-clamp-2">{product.displayName}</h4>
        {hasAlias && (
          <p className="text-[10px] font-mono text-brand-subtext truncate" title={product.catalogName}>
            AT: {product.catalogName}
          </p>
        )}
      </div>

      <span className="inline-flex self-start px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
        {product.tipoClienteLabel}
      </span>

      <ul className="space-y-1.5 text-[10px] font-mono text-brand-subtext flex-1 min-h-[88px]">
        {pricingRows.length > 0 ? (
          pricingRows.map((row) => (
            <li key={row.label} className="flex justify-between gap-2">
              <span>{row.label}</span>
              <span className="text-brand-text tabular-nums shrink-0">{row.value}</span>
            </li>
          ))
        ) : (
          <li className="text-center py-4 text-brand-subtext">Precios no disponibles</li>
        )}
      </ul>

      <button
        type="button"
        onClick={() => onCreateContract(product)}
        className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold uppercase tracking-wide transition-colors cursor-pointer"
      >
        <Plus className="h-3.5 w-3.5" />
        Crear contrato
        <ChevronRight className="h-3.5 w-3.5 opacity-80" />
      </button>
    </article>
  )
}
