import { useMemo } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  FileSignature,
  LoaderCircle,
  type LucideIcon,
} from "lucide-react"
import {
  CONTRACT_ESTADO_KPI_META,
  countContractsByEstadoKpi,
  type ContractEstadoKpiFilter,
} from "../lib/contract-estado-kpis"
import { KpiCard, KpiGrid, type KpiTone } from "./common/kpi"

interface ContractEstadoRow {
  estado: string
  comercialId: string
}

interface ComercialContratosEstadoKpisProps {
  contracts: ContractEstadoRow[]
  activeUserId: string
  onNavigate: (filter: ContractEstadoKpiFilter) => void
}

const KPI_VISUALS: Record<ContractEstadoKpiFilter, { icon: LucideIcon; tone: KpiTone }> = {
  activado: { icon: CheckCircle2, tone: "emerald" },
  pte_firma: { icon: FileSignature, tone: "blue" },
  tramitando: { icon: LoaderCircle, tone: "amber" },
  incidencia_administrativa: { icon: AlertTriangle, tone: "rose" },
}

export function ComercialContratosEstadoKpis({
  contracts,
  activeUserId,
  onNavigate,
}: ComercialContratosEstadoKpisProps) {
  const mine = useMemo(
    () => contracts.filter((c) => c.comercialId === activeUserId),
    [contracts, activeUserId]
  )

  const counts = useMemo(() => countContractsByEstadoKpi(mine), [mine])

  return (
    <section className="space-y-2">
      <h3 className="text-[11px] font-bold text-brand-text uppercase tracking-wide">
        Contratos por estado
      </h3>
      <KpiGrid columns={4}>
        {CONTRACT_ESTADO_KPI_META.map((meta) => (
          <KpiCard
            key={meta.id}
            label={meta.label}
            value={counts[meta.id]}
            hint="Ver en contratos"
            icon={KPI_VISUALS[meta.id].icon}
            tone={KPI_VISUALS[meta.id].tone}
            onClick={() => onNavigate(meta.id)}
          />
        ))}
      </KpiGrid>
    </section>
  )
}
