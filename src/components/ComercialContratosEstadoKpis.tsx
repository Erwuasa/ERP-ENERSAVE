import { useMemo } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  FileSignature,
  LoaderCircle,
} from "lucide-react"
import {
  CONTRACT_ESTADO_KPI_META,
  countContractsByEstadoKpi,
  countFirmaCaducadaInIncidenciaBucket,
  type ContractEstadoKpiFilter,
} from "../lib/contract-estado-kpis"
import { getContractEstadoBadgeClass } from "../lib/contract-estado"

interface ContractEstadoRow {
  estado: string
  comercialId: string
}

interface ComercialContratosEstadoKpisProps {
  contracts: ContractEstadoRow[]
  activeUserId: string
  onNavigate: (filter: ContractEstadoKpiFilter) => void
}

const KPI_ICONS = {
  pte_firma: FileSignature,
  activado: CheckCircle2,
  tramitando: LoaderCircle,
  incidencia_administrativa: AlertTriangle,
} as const

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
  const firmaCaducadaCount = useMemo(
    () => countFirmaCaducadaInIncidenciaBucket(mine),
    [mine]
  )

  return (
    <div className="space-y-2">
      <h3 className="text-[11px] font-bold text-brand-text uppercase tracking-wide">
        Contratos por estado
      </h3>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-2.5">
        {CONTRACT_ESTADO_KPI_META.map((meta) => {
          const Icon = KPI_ICONS[meta.id]
          const count = counts[meta.id]
          const badgeClass = getContractEstadoBadgeClass(
            meta.id === "pte_firma"
              ? "PTE DE FIRMA"
              : meta.id === "activado"
                ? "ACTIVADO"
                : meta.id === "tramitando"
                  ? "TRAMITANDO"
                  : "INCIDENCIA ADMINISTRATIVA"
          )

          return (
            <button
              key={meta.id}
              type="button"
              onClick={() => onNavigate(meta.id)}
              className="bg-brand-panel p-3 rounded-xl border border-brand-border shadow-sm flex flex-col justify-between gap-2 font-sans cursor-pointer hover:border-cyan-500/40 transition-colors duration-200 group text-left min-h-[108px] min-w-0"
            >
              <div className="flex items-start justify-between gap-2 min-w-0">
                <div className="min-w-0">
                  <span
                    className={`inline-flex px-1.5 py-0.5 rounded text-[8px] font-mono font-bold uppercase ${badgeClass}`}
                  >
                    {meta.label}
                  </span>
                  <p className="text-[9px] text-brand-subtext mt-1 leading-snug">
                    {meta.hint}
                  </p>
                </div>
                <Icon
                  className="h-4 w-4 shrink-0 text-brand-subtext group-hover:text-cyan-600 dark:group-hover:text-cyan-400 transition-colors"
                  aria-hidden
                />
              </div>
              <div className="pt-1.5 border-t border-dashed border-brand-border">
                <strong className="text-2xl font-black tabular-nums font-mono leading-none text-brand-text">
                  {count}
                </strong>
                {meta.id === "incidencia_administrativa" && firmaCaducadaCount > 0 && (
                  <p className="text-[9px] font-mono text-orange-600 dark:text-orange-400 mt-1">
                    {firmaCaducadaCount} firma caducada
                    {firmaCaducadaCount !== 1 ? "s" : ""}
                  </p>
                )}
                <span className="text-[9px] text-brand-subtext block mt-0.5">
                  Ver en contratos →
                </span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
