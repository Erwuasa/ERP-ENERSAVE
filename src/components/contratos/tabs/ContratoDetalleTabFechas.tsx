import type { Contract } from "@/types/contract"
import {
  ContratoDetalleCompactField,
  ContratoDetalleDataCard,
} from "@/components/contratos/contrato-detalle-ui"
import { resolveContratoDetalleFechas } from "@/components/contratos/contrato-detalle-utils"

interface ContratoDetalleTabFechasProps {
  contract: Contract
}

export function ContratoDetalleTabFechas({ contract }: ContratoDetalleTabFechasProps) {
  const fechas = resolveContratoDetalleFechas(contract)

  return (
    <ContratoDetalleDataCard title="Fechas del contrato">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <ContratoDetalleCompactField
          label="Creación / solicitud"
          value={fechas.creacionSolicitud}
          mono
        />
        <ContratoDetalleCompactField
          label="Última modificación"
          value={fechas.ultimaModificacion}
          mono
        />
        <ContratoDetalleCompactField label="Firma" value={fechas.firma} mono />
        <ContratoDetalleCompactField label="Activación" value={fechas.activacion} mono />
        <ContratoDetalleCompactField label="Fin de clawback" value={fechas.finClawback} mono />
        <ContratoDetalleCompactField label="Fecha de baja" value={fechas.fechaBaja} mono />
      </div>
    </ContratoDetalleDataCard>
  )
}
