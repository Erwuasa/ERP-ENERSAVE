import type { MouseEvent } from "react"
import { Flame, Plus, Zap } from "lucide-react"
import { PeriodPricesBlock } from "@/components/productos/PeriodPricesBlock"
import { supplyBadgeClass } from "@/lib/enersave-ui-theme"
import { type ProductoTarifa } from "@/lib/productos-catalog"
import { formatCompaniaLabel } from "@/lib/erp/compania-logos"
import { CompaniaLogo } from "@/lib/erp/render-compania-logo"

type Props = {
  products: ProductoTarifa[]
  canManageTariffs: boolean
  onCreateContract: (product: ProductoTarifa) => void
  onOpenTariff: (product: ProductoTarifa) => void
}

function SupplyTypeBadge({ product }: { product: ProductoTarifa }) {
  return (
    <span
      className={`inline-flex w-fit items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${supplyBadgeClass(
        product.tipo
      )}`}
    >
      {product.tipo === "luz" ? (
        <Zap className="h-2.5 w-2.5 shrink-0" aria-hidden />
      ) : (
        <Flame className="h-2.5 w-2.5 shrink-0" aria-hidden />
      )}
      {product.tipo}
    </span>
  )
}

function stopRowClick(event: MouseEvent) {
  event.stopPropagation()
}

export function ProductosTable({
  products,
  canManageTariffs,
  onCreateContract,
  onOpenTariff,
}: Props) {
  return (
    <div className="overflow-x-auto scrollbar-overlay rounded-2xl border border-brand-border">
      <table
        className={`w-full text-left text-xs ${canManageTariffs ? "min-w-[1080px]" : "min-w-[880px]"}`}
      >
        <thead>
          <tr className="bg-slate-100 dark:bg-brand-surface/80 border-b border-brand-border">
            <th
              colSpan={2}
              className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold"
            >
              Marca / Tarifa
            </th>
            <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Peaje
            </th>
            <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Cliente
            </th>
            {canManageTariffs ? (
              <>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  ERP
                </th>
                <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
                  Web
                </th>
              </>
            ) : null}
            <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              {products[0]?.tipo === "gas" ? "Término fijo" : "Fijo"}
            </th>
            <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold">
              Consumo
            </th>
            <th className="px-3 py-2.5 font-mono text-[9px] uppercase tracking-wider text-slate-500 font-bold text-right w-[100px]">
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
                onClick={() => onOpenTariff(product)}
                className="bg-white dark:bg-[#0f172a] transition-colors hover:bg-slate-50 dark:hover:bg-brand-elevated/50 cursor-pointer"
                title="Ver precios por periodo"
              >
                <td colSpan={2} className="px-3 py-2 align-top">
                  <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-x-3 items-start sm:grid-cols-[5.5rem_minmax(0,1fr)] sm:gap-x-4">
                    <div className="flex flex-col items-start gap-1.5">
                      <CompaniaLogo
                        name={product.compania}
                        size="md"
                      />
                      <SupplyTypeBadge product={product} />
                      <span className="sr-only">{formatCompaniaLabel(product.compania)}</span>
                    </div>
                    <div className="min-w-0 pt-0">
                      <span className="font-semibold text-[13px] text-brand-text leading-snug block">
                        {product.displayName}
                      </span>
                      {hasAlias && (
                        <span
                          className="mt-0.5 block text-[10px] font-mono text-brand-subtext truncate"
                          title={product.catalogName}
                        >
                          AT: {product.catalogName}
                        </span>
                      )}
                    </div>
                  </div>
                </td>
                <td className="px-3 py-2.5 align-top font-mono text-[10px] text-brand-subtext whitespace-nowrap">
                  {product.peaje}
                </td>
                <td className="px-3 py-2.5 align-top">
                  <span className="inline-flex px-2 py-0.5 rounded-md text-[9px] font-mono font-bold uppercase bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border border-emerald-500/25">
                    {product.tipoClienteLabel}
                  </span>
                </td>
                {canManageTariffs ? (
                  <>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                          product.erpActive
                            ? "bg-blue-500/15 text-blue-700 dark:text-blue-400 border-blue-500/25"
                            : "bg-slate-500/10 text-brand-subtext border-brand-border"
                        }`}
                      >
                        <Zap className="h-2.5 w-2.5" aria-hidden />
                        {product.erpActive ? "ERP" : "Off"}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase border ${
                          product.webVisible
                            ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/25"
                            : "bg-slate-500/10 text-brand-subtext border-brand-border"
                        }`}
                      >
                        {product.webVisible ? "Web" : "Oculta"}
                      </span>
                    </td>
                  </>
                ) : null}
                <td className="px-3 py-2.5 align-top min-w-[11rem]">
                  <PeriodPricesBlock
                    prices={product.precios.potencia}
                    peaje={product.peaje}
                    kind="potencia"
                  />
                </td>
                <td className="px-3 py-2.5 align-top min-w-[9rem]">
                  <PeriodPricesBlock
                    prices={product.precios.energia}
                    peaje={product.peaje}
                    kind="energia"
                  />
                </td>
                <td className="px-3 py-2.5 align-top" onClick={stopRowClick}>
                  <div className="flex items-center justify-end">
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
