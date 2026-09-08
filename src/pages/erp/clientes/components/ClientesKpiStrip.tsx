import { Building2, CheckCircle, User, Users, type LucideIcon } from "lucide-react"
import type { ClienteTipoFilter } from "@/lib/clientes-panel-filters"
import { KpiMetricCard } from "@/components/ui/KpiMetricCard"

type Props = {
  total: number
  particulares: number
  pymes: number
  contratosActivos: number
  tipoFilter?: ClienteTipoFilter
  onTipoFilterChange?: (value: ClienteTipoFilter) => void
  onContratosActivosClick?: () => void
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
  onContratosActivosClick,
}: Props) {
  const cards: KpiCardConfig[] = [
    {
      id: "todos",
      label: "Clientes",
      value: total,
      valueClass: "text-brand-text",
      accentClass: "bg-slate-700 dark:bg-slate-300",
      icon: Users,
      iconClass: "text-brand-subtext",
      selectable: true,
    },
    {
      id: "particular",
      label: "Particulares",
      value: particulares,
      valueClass: "text-cyan-700 dark:text-cyan-400",
      accentClass: "bg-cyan-500",
      icon: User,
      iconClass: "text-cyan-600/70 dark:text-cyan-400/80",
      selectable: true,
    },
    {
      id: "empresa",
      label: "PYMEs",
      value: pymes,
      valueClass: "text-orange-700 dark:text-orange-400",
      accentClass: "bg-orange-500",
      icon: Building2,
      iconClass: "text-orange-600/70 dark:text-orange-500/80",
      selectable: true,
    },
    {
      id: "contratos",
      label: "Contratos activos",
      value: contratosActivos,
      valueClass: "text-emerald-700 dark:text-emerald-400",
      accentClass: "bg-emerald-500",
      icon: CheckCircle,
      iconClass: "text-emerald-600/70 dark:text-emerald-500/80",
      selectable: Boolean(onContratosActivosClick),
    },
  ]

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {cards.map((kpi) => (
        <KpiMetricCard
          key={kpi.id}
          label={kpi.label}
          displayValue={String(kpi.value)}
          valueClass={kpi.valueClass}
          accentClass={kpi.accentClass}
          icon={kpi.icon}
          iconClass={kpi.iconClass}
          selected={kpi.selectable && tipoFilter === kpi.id}
          onClick={
            kpi.id === "contratos"
              ? onContratosActivosClick
              : kpi.selectable && onTipoFilterChange
                ? () => onTipoFilterChange(kpi.id as ClienteTipoFilter)
                : undefined
          }
        />
      ))}
    </div>
  )
}
