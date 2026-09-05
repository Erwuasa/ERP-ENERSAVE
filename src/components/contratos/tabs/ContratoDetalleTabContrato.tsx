import { AlertTriangle } from "lucide-react"
import type { Contract } from "@/types/contract"
import { formatContractDisplayId } from "@/components/contratos/contrato-detalle-types"
import {
  ContratoDetalleField,
  ContratoDetalleFieldGrid,
  ContratoDetalleSection,
} from "@/components/contratos/contrato-detalle-ui"
import {
  contractHasOpenIncidencia,
  formatContratoCanal,
  formatIncidenciaAbiertaHace,
} from "@/components/contratos/contrato-detalle-utils"
import {
  getContractEstadoBadgeClass,
  normalizeContractEstado,
} from "@/lib/contract-estado"

interface ContratoDetalleTabContratoProps {
  contract: Contract
  comercialEmail?: string
}

export function ContratoDetalleTabContrato({
  contract,
  comercialEmail,
}: ContratoDetalleTabContratoProps) {
  const estado = normalizeContractEstado(contract.estado)
  const hasOpenIncidencia = contractHasOpenIncidencia(contract)

  return (
    <div className="space-y-5 max-w-4xl">
      {hasOpenIncidencia ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 flex gap-3"
        >
          <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-semibold text-rose-800 dark:text-rose-200 leading-snug">
              ⚠️ Este contrato está parado por una incidencia — Adjunta lo que falte y márcala como
              resuelta para que siga su curso.
            </p>
            <p className="text-xs font-mono text-rose-700/90 dark:text-rose-300/90">
              {formatIncidenciaAbiertaHace(contract)}
            </p>
          </div>
        </div>
      ) : null}

      <ContratoDetalleSection title="Datos generales">
        <ContratoDetalleFieldGrid>
          <ContratoDetalleField
            label="Referencia"
            value={formatContractDisplayId(contract.id)}
            mono
          />
          <ContratoDetalleField label="Canal" value={formatContratoCanal(contract)} />
          <ContratoDetalleField
            label="Estado"
            value={
              <span
                className={`inline-flex px-2.5 py-1 rounded-lg text-[10px] font-mono font-bold uppercase ${getContractEstadoBadgeClass(estado)}`}
              >
                {estado}
              </span>
            }
          />
        </ContratoDetalleFieldGrid>
      </ContratoDetalleSection>

      <ContratoDetalleSection title="Comercial asignado">
        <ContratoDetalleFieldGrid>
          <ContratoDetalleField
            label="Nombre"
            value={contract.nombreComercial || contract.comercialName}
          />
          <ContratoDetalleField
            label="Email"
            value={
              comercialEmail ? (
                <a
                  href={`mailto:${comercialEmail}`}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  {comercialEmail}
                </a>
              ) : (
                "—"
              )
            }
          />
          {contract.jefeEquipo ? (
            <ContratoDetalleField label="Jefe de equipo" value={contract.jefeEquipo} />
          ) : null}
        </ContratoDetalleFieldGrid>
      </ContratoDetalleSection>
    </div>
  )
}
