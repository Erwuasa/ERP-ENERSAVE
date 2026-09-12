import { Shield, UserMinus, Users, UserX, type LucideIcon } from "lucide-react"
import { KpiMetricCard } from "@/components/ui/KpiMetricCard"

type KpiId = "cuentas" | "clientes" | "staff" | "sin_cuenta"

type Props = {
  cuentas: number
  clientes: number
  staff: number
  sinCuenta: number
  selected?: KpiId | null
  onSelect?: (id: KpiId) => void
}

interface KpiCardConfig {
  id: KpiId
  label: string
  value: number
  valueClass: string
  accentClass: string
  icon: LucideIcon
  iconClass: string
}

const CARDS: Omit<KpiCardConfig, "value">[] = [
  {
    id: "cuentas",
    label: "Cuentas",
    valueClass: "text-brand-text",
    accentClass: "bg-slate-700 dark:bg-slate-300",
    icon: Users,
    iconClass: "text-brand-subtext",
  },
  {
    id: "clientes",
    label: "Clientes",
    valueClass: "text-slate-600 dark:text-slate-400",
    accentClass: "bg-slate-400",
    icon: UserMinus,
    iconClass: "text-slate-500/80",
  },
  {
    id: "staff",
    label: "Staff",
    valueClass: "text-cyan-700 dark:text-cyan-400",
    accentClass: "bg-cyan-500",
    icon: Shield,
    iconClass: "text-cyan-600/70 dark:text-cyan-400/80",
  },
  {
    id: "sin_cuenta",
    label: "Sin cuenta",
    valueClass: "text-amber-700 dark:text-amber-400",
    accentClass: "bg-amber-500",
    icon: UserX,
    iconClass: "text-amber-600/70 dark:text-amber-500/80",
  },
]

export function UsuariosKpiStrip({
  cuentas,
  clientes,
  staff,
  sinCuenta,
  selected,
  onSelect,
}: Props) {
  const values: Record<KpiId, number> = {
    cuentas,
    clientes,
    staff,
    sin_cuenta: sinCuenta,
  }

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
      {CARDS.map((kpi) => (
        <KpiMetricCard
          key={kpi.id}
          label={kpi.label}
          displayValue={String(values[kpi.id])}
          valueClass={kpi.valueClass}
          accentClass={kpi.accentClass}
          icon={kpi.icon}
          iconClass={kpi.iconClass}
          selected={selected === kpi.id}
          onClick={onSelect ? () => onSelect(kpi.id) : undefined}
        />
      ))}
    </div>
  )
}
