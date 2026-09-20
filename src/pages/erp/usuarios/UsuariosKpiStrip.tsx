import { Shield, UserMinus, Users, UserX, type LucideIcon } from "lucide-react"
import { KpiCard, KpiGrid, type KpiTone } from "@/components/common/kpi"

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
  tone: KpiTone
  icon: LucideIcon
}

const CARDS: KpiCardConfig[] = [
  { id: "cuentas", label: "Cuentas", tone: "neutral", icon: Users },
  { id: "clientes", label: "Clientes", tone: "blue", icon: UserMinus },
  { id: "staff", label: "Staff", tone: "cyan", icon: Shield },
  { id: "sin_cuenta", label: "Sin cuenta", tone: "amber", icon: UserX },
]

export function UsuariosKpiStrip({ cuentas, clientes, staff, sinCuenta, selected, onSelect }: Props) {
  const values: Record<KpiId, number> = {
    cuentas,
    clientes,
    staff,
    sin_cuenta: sinCuenta,
  }

  return (
    <KpiGrid columns={4} aria-label="Indicadores de usuarios">
      {CARDS.map((kpi) => (
        <KpiCard
          key={kpi.id}
          label={kpi.label}
          value={values[kpi.id]}
          tone={kpi.tone}
          icon={kpi.icon}
          selected={selected === kpi.id}
          onClick={onSelect ? () => onSelect(kpi.id) : undefined}
        />
      ))}
    </KpiGrid>
  )
}
