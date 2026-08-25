import { Flame, Globe, GlobeLock, Plus, Settings2, Zap } from "lucide-react"
import {
  formatPrecioEnergia,
  formatPrecioPotencia,
  type ProductoTarifa,
} from "@/lib/productos-catalog"

type Props = {
  products: ProductoTarifa[]
  canEditWeb: boolean
  onCreateContract: (product: ProductoTarifa) => void
  onEditWeb: (product: ProductoTarifa) => void
}

function firstEnergyPrice(product: ProductoTarifa): string {
  for (const n of [1, 2, 3, 4, 5, 6] as const) {
    const value = product.precios.energia[`p${n}`]
    if (value != null) return formatPrecioEnergia(value)
  }
  return "—"
}

function firstPowerPrice(product: ProductoTarifa): string {
  for (const n of [1, 2, 3, 4, 5, 6] as const) {
    const value = product.precios.potencia[`p${n}`]
    if (value != null) return formatPrecioPotencia(value)
  }
  return "—"
}

export function ProductosTable({ products, canEditWeb, onCreateContract, onEditWeb }: Props) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-brand-border">
      <table className="w-full min-w-[960px] text-left text-xs">
        <thead>
          <tr className="bg-slate-100 dark:bg-brand-surface/80 border-b border-brand-border">
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Compañía
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold min-w-[220px]">
              Tarifa
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Peaje
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Cliente
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Web
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right">
              Energía
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right">
              Potencia
            </th>
            <th className="px-4 py-3 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right w-[140px]">
              Acciones
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-brand-border">
          {products.map((product) => {
            const hasAlias = product.webAlias && product.webAlias !== product.catalogName

            return (
              <tr
                key={product.id}
                className="bg-white dark:bg-[#0f172a] hover:bg-slate-50 dark:hover:bg-brand-elevated/50 transition-colors"
              >
                <td className="px-4 py-3 align-top">
                  <span className="font-mono text-[10px] font-bold uppercase text-brand-subtext tracking-wide">
                    {product.compania}
                  </span>
                  <span
                    className={`mt-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${
                      product.tipo === "luz"
                        ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                        : "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                    }`}
                  >
                    {product.tipo === "luz" ? (
                      <Zap className="h-2.5 w-2.5" aria-hidden />
                    ) : (
                      <Flame className="h-2.5 w-2.5" aria-hidden />
                    )}
                    {product.tipo}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="font-semibold text-brand-text block leading-snug">{product.displayName}</span>
                  {hasAlias && (
                    <span className="mt-0.5 block text-[10px] font-mono text-brand-subtext truncate max-w-xs" title={product.catalogName}>
                      AT: {product.catalogName}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 align-top font-mono text-[10px] text-brand-subtext whitespace-nowrap">
                  {product.peaje}
                </td>
                <td className="px-4 py-3 align-top">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                    {product.tipoClienteLabel}
                  </span>
                </td>
                <td className="px-4 py-3 align-top">
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                      product.webVisible
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                        : "bg-slate-500/10 text-brand-subtext border-brand-border"
                    }`}
                  >
                    {product.webVisible ? (
                      <Globe className="h-2.5 w-2.5" aria-hidden />
                    ) : (
                      <GlobeLock className="h-2.5 w-2.5" aria-hidden />
                    )}
                    {product.webVisible ? "Web" : "Oculta"}
                  </span>
                </td>
                <td className="px-4 py-3 align-top font-mono text-[10px] text-brand-text text-right tabular-nums whitespace-nowrap">
                  {firstEnergyPrice(product)}
                </td>
                <td className="px-4 py-3 align-top font-mono text-[10px] text-brand-text text-right tabular-nums whitespace-nowrap">
                  {firstPowerPrice(product)}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() => onEditWeb(product)}
                      className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-emerald-600 hover:border-emerald-500/40 cursor-pointer"
                      title={canEditWeb ? "Configurar publicación web" : "Ver publicación web"}
                      aria-label="Configurar publicación web"
                    >
                      <Settings2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => onCreateContract(product)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase tracking-wide transition-colors cursor-pointer whitespace-nowrap"
                    >
                      <Plus className="h-3 w-3" />
                      Contrato
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
