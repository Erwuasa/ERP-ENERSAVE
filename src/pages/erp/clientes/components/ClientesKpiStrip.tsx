import { Building2, CheckCircle, User, Users, type LucideIcon } from "lucide-react"
import type { ClienteTipoFilter } from "@/lib/clientes-panel-filters"

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
  hint: string
  valueClass: string
  accentClass: string
  icon: LucideIcon
  iconClass: string
  selectable: boolean
  highlight?: boolean
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
      hint: "En este filtro",
      valueClass: "text-blue-600 dark:text-blue-400",
      accentClass: "bg-blue-500",
      icon: Users,
      iconClass: "text-blue-500/80",
      selectable: true,
    },
    {
      id: "particular",
      label: "Particulares",
      value: particulares,
      hint: "Personas físicas",
      valueClass: "text-sky-500",
      accentClass: "bg-sky-400",
      icon: User,
      iconClass: "text-sky-400/80",
      selectable: true,
    },
    {
      id: "empresa",
      label: "PYMEs",
      value: pymes,
      hint: "Empresas",
      valueClass: "text-orange-500",
      accentClass: "bg-amber-400",
      icon: Building2,
      iconClass: "text-orange-500/80",
      selectable: true,
      highlight: true,
    },
    {
      id: "contratos",
      label: "Contratos activos",
      value: contratosActivos,
      hint: "Vinculados a estos clientes",
      valueClass: "text-emerald-500",
      accentClass: "bg-emerald-500",
      icon: CheckCircle,
      iconClass: "text-emerald-500/80",
      selectable: false,
    },
  ]

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((kpi) => {
        const Icon = kpi.icon
        const selected = kpi.selectable && tipoFilter === kpi.id
        const className = [
          "relative overflow-hidden text-left p-5 rounded-2xl border shadow-sm transition-colors duration-200",
          kpi.selectable ? "cursor-pointer" : "",
          selected
            ? "border-cyan-500/50 bg-cyan-500/5 ring-1 ring-cyan-500/20"
            : kpi.highlight
              ? "border-amber-400/50 bg-brand-panel ring-1 ring-amber-400/20 hover:border-amber-400/70"
              : "border-brand-border bg-brand-panel hover:border-cyan-500/30",
        ]
          .filter(Boolean)
          .join(" ")

        const body = (
          <>
            <div className={`absolute top-0 left-0 w-1 h-full ${kpi.accentClass}`} />
            {kpi.highlight ? (
              <div className="absolute top-0 right-0 w-full h-1 bg-amber-400/70" />
            ) : null}
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
                  {kpi.label}
                </p>
                <p className={`text-2xl font-black font-display mt-1 tabular-nums ${kpi.valueClass}`}>
                  {kpi.value}
                </p>
                <p className="text-[9px] font-mono text-brand-subtext mt-1">{kpi.hint}</p>
              </div>
              <Icon className={`w-8 h-8 shrink-0 ${kpi.iconClass}`} />
            </div>
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
