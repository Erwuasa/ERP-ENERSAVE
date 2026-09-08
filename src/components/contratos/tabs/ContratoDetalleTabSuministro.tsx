import { Flame, Lightbulb, RefreshCw } from "lucide-react"
import type { Contract } from "@/types/contract"
import {
  ContratoDetalleCompactField,
  ContratoDetalleDataCard,
  ContratoDetalleMetaBadge,
} from "@/components/contratos/contrato-detalle-ui"
import {
  extractBankNameFromIban,
  formatConsumoAnualKwh,
  formatContratoPeaje,
  formatPotenciasInline,
  formatSuministroAccion,
} from "@/components/contratos/contrato-detalle-utils"

interface ContratoDetalleTabSuministroProps {
  contract: Contract
}

export function ContratoDetalleTabSuministro({ contract }: ContratoDetalleTabSuministroProps) {
  const peaje = formatContratoPeaje(contract)
  const accion = formatSuministroAccion(contract)
  const isLuz = contract.tipo === "luz"

  return (
    <ContratoDetalleDataCard title="Datos del suministro">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <ContratoDetalleMetaBadge
            tone={isLuz ? "supply-luz" : "supply-gas"}
            icon={
              isLuz ? (
                <Lightbulb className="h-3.5 w-3.5" />
              ) : (
                <Flame className="h-3.5 w-3.5" />
              )
            }
          >
            {isLuz ? "Luz" : "Gas"}
          </ContratoDetalleMetaBadge>
          {accion ? (
            <ContratoDetalleMetaBadge
              tone="action"
              icon={<RefreshCw className="h-3.5 w-3.5" />}
              className="opacity-80"
            >
              {accion}
            </ContratoDetalleMetaBadge>
          ) : null}
        </div>
        {peaje ? <ContratoDetalleMetaBadge tone="peaje">{peaje}</ContratoDetalleMetaBadge> : null}
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ContratoDetalleCompactField
          label="CUPS"
          value={contract.cups}
          mono
          emphasize
          className="sm:col-span-1"
        />
        <ContratoDetalleCompactField
          label="IBAN"
          value={contract.iban}
          subValue={contract.iban ? extractBankNameFromIban(contract.iban) : undefined}
          mono
          emphasize
        />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ContratoDetalleCompactField
          label="Dirección"
          value={contract.direccionSuministro || contract.direccionCompleta}
        />
        <ContratoDetalleCompactField label="Piso / puerta · aclarador" value={contract.pisoPuerta} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <ContratoDetalleCompactField label="CP" value={contract.codigoPostal} mono />
        <ContratoDetalleCompactField label="Ciudad" value={contract.poblacion} />
        <ContratoDetalleCompactField label="Provincia" value={contract.provincia} />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ContratoDetalleCompactField
          label="Potencias"
          value={formatPotenciasInline(contract)}
          mono
        />
        <ContratoDetalleCompactField
          label="Consumo anual"
          value={formatConsumoAnualKwh(contract)}
          mono
        />
      </div>
    </ContratoDetalleDataCard>
  )
}
