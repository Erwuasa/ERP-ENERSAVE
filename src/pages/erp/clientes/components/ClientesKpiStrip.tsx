import type { ClienteTipoFilter } from "@/lib/clientes-panel-filters"

type Props = {
  total: number
  particulares: number
  pymes: number
  contratosActivos: number
  tipoFilter?: ClienteTipoFilter
  onTipoFilterChange?: (value: ClienteTipoFilter) => void
}

export function ClientesKpiStrip({
  total,
  particulares,
  pymes,
  contratosActivos,
  tipoFilter,
  onTipoFilterChange,
}: Props) {
  const cards = [
    {
      id: "todos" as const,
      label: "Clientes",
      value: total,
      hint: "En este filtro",
      valueClass: "text-emerald-600 dark:text-emerald-400",
      selectable: true,
    },
    {
      id: "particular" as const,
      label: "Particulares",
      value: particulares,
      hint: "Personas físicas",
      valueClass: "text-sky-600 dark:text-sky-400",
      selectable: true,
    },
    {
      id: "empresa" as const,
      label: "PYMEs",
      value: pymes,
      hint: "Empresas",
      valueClass: "text-amber-600 dark:text-amber-400",
      selectable: true,
    },
    {
      id: "contratos" as const,
      label: "Contratos activos",
      value: contratosActivos,
      hint: "Vinculados a estos clientes",
      valueClass: "text-cyan-600 dark:text-cyan-400",
      selectable: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {cards.map((kpi) => {
        const selected = kpi.selectable && tipoFilter === kpi.id
        const className = `text-left p-4 rounded-xl border transition-colors duration-200 ${
          kpi.selectable ? "cursor-pointer" : ""
        } ${
          selected
            ? "border-cyan-500/50 bg-cyan-500/5 shadow-sm"
            : "border-brand-border bg-brand-panel hover:border-cyan-500/30"
        }`

        const body = (
          <>
            <p className="text-[10px] font-mono uppercase text-brand-subtext">{kpi.label}</p>
            <p className={`text-2xl font-black font-mono tabular-nums mt-1 ${kpi.valueClass}`}>
              {kpi.value}
            </p>
            <p className="text-[9px] font-mono text-brand-subtext mt-1">{kpi.hint}</p>
          </>
        )

        if (kpi.selectable && onTipoFilterChange) {
          return (
            <button
              key={kpi.id}
              type="button"
              onClick={() => onTipoFilterChange(kpi.id)}
              className={className}
            >
              {body}
            </button>
          )
        }

        return (
          <div key={kpi.id} className={className}>
            {body}
          </div>
        )
      })}
    </div>
  )
}
