import { Building2, CheckCircle, User, Users, type LucideIcon } from "lucide-react"
import type { ClienteTipoFilter } from "@/lib/clientes-panel-filters"
import { KpiCard, KpiGrid, type KpiTone } from "@/components/common/kpi"

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
  tone: KpiTone
  icon: LucideIcon
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
    { id: "todos", label: "Clientes", value: total, tone: "neutral", icon: Users, selectable: true },
    { id: "particular", label: "Particulares", value: particulares, tone: "cyan", icon: User, selectable: true },
    { id: "empresa", label: "PYMEs", value: pymes, tone: "orange", icon: Building2, selectable: true },
    {
      id: "contratos",
      label: "Contratos activos",
      value: contratosActivos,
      tone: "emerald",
      icon: CheckCircle,
      selectable: Boolean(onContratosActivosClick),
    },
  ]

  return (
    <KpiGrid columns={4} aria-label="Indicadores de clientes">
      {cards.map((kpi) => (
        <KpiCard
          key={kpi.id}
          label={kpi.label}
          value={kpi.value}
          tone={kpi.tone}
          icon={kpi.icon}
          selected={kpi.id === "contratos" ? undefined : kpi.selectable && tipoFilter === kpi.id}
          onClick={
            kpi.id === "contratos"
              ? onContratosActivosClick
              : kpi.selectable && onTipoFilterChange
                ? () => onTipoFilterChange(kpi.id as ClienteTipoFilter)
                : undefined
          }
        />
      ))}
    </KpiGrid>
  )
}
