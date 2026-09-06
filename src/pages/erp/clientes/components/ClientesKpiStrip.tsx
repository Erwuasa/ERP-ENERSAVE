import { Building2, CheckCircle, User, Users, type LucideIcon } from "lucide-react"
import type { ClienteTipoFilter } from "@/lib/clientes-panel-filters"
import { KPI_CARD } from "@/lib/enersave-ui-theme"

type Props = {
  total: number
  particulares: number
  pymes: number
  contratosActivos: number
  tipoFilter?: ClienteTipoFilter
  onTipoFilterChange?: (value: ClienteTipoFilter) => void
}

type KpiCardId = ClienteTipoFilter | "contratos"

interface KpiCardConfig {
  id: KpiCardId
  label: string
  value: number
  valueClass: string
  accentClass: string
  icon: LucideIcon
  iconClass: string
  selectable: boolean
}

export function ClientesKpiStrip({
  total,
  particulares,
  pymes,
  contratosActivos,
  tipoFilter,
  onTipoFilterChange,
}: Props) {
  const cards: KpiCardConfig[] = [
    {
      id: "todos",
      label: "Clientes",
      value: total,
      valueClass: "text-brand-text",
      accentClass: "bg-slate-800 dark:bg-slate-200",
      icon: Users,
      iconClass: "text-brand-text",
      selectable: true,
    },
    {
      id: "particular",
      label: "Particulares",
      value: particulares,
      valueClass: "text-cyan-600 dark:text-cyan-400",
      accentClass: "bg-cyan-400",
      icon: User,
      iconClass: "text-cyan-400/80",
      selectable: true,
    },
    {
      id: "empresa",
      label: "PYMEs",
      value: pymes,
      valueClass: "text-orange-600 dark:text-orange-400",
      accentClass: "bg-orange-500",
      icon: Building2,
      iconClass: "text-orange-500/80",
      selectable: true,
    },
    {
      id: "contratos",
      label: "Contratos activos",
      value: contratosActivos,
      valueClass: "text-emerald-600 dark:text-emerald-400",
      accentClass: "bg-emerald-500",
      icon: CheckCircle,
      iconClass: "text-emerald-500/80",
      selectable: false,
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {cards.map((kpi) => {
        const Icon = kpi.icon
        const selected = kpi.selectable && tipoFilter === kpi.id
        const className = [
          KPI_CARD.base,
          "p-3.5",
          kpi.selectable ? KPI_CARD.selectable : "",
          selected ? KPI_CARD.selected : KPI_CARD.default,
        ]
          .filter(Boolean)
          .join(" ")

        const body = (
          <>
            <div className={`absolute top-0 left-0 w-1 h-full ${kpi.accentClass}`} />
            <div className="flex items-center justify-between gap-2 min-w-0">
              <div className="min-w-0">
                <p className="text-[9px] font-mono font-bold uppercase text-brand-subtext tracking-wider truncate">
                  {kpi.label}
                </p>
                <p className={`text-xl font-black font-display mt-0.5 tabular-nums leading-none ${kpi.valueClass}`}>
                  {kpi.value}
                </p>
              </div>
              <Icon className={`w-6 h-6 shrink-0 ${kpi.iconClass}`} />
            </div>
          </>
        )

        if (kpi.selectable && onTipoFilterChange) {
          return (
            <button key={kpi.id} type="button" onClick={() => onTipoFilterChange(kpi.id)} className={className}>
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
