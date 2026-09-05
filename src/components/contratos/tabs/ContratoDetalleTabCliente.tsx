import type { Contract } from "@/types/contract"
import {
  ContratoDetalleField,
  ContratoDetalleFieldGrid,
  ContratoDetalleSection,
} from "@/components/contratos/contrato-detalle-ui"
import {
  formatTipoClienteLabel,
  resolveClientNameParts,
  resolveTipoCliente,
} from "@/components/contratos/contrato-detalle-utils"

interface ContratoDetalleTabClienteProps {
  contract: Contract
}

export function ContratoDetalleTabCliente({ contract }: ContratoDetalleTabClienteProps) {
  const tipoCliente = resolveTipoCliente(contract)
  const { nombre, apellidos, esEmpresa } = resolveClientNameParts(contract)

  return (
    <div className="space-y-5 max-w-4xl">
      <ContratoDetalleSection title="Datos del cliente">
        <ContratoDetalleFieldGrid>
          <ContratoDetalleField
            label="Tipo de cliente"
            value={formatTipoClienteLabel(tipoCliente)}
          />
          <ContratoDetalleField
            label={esEmpresa ? "Razón social" : "Nombre"}
            value={nombre}
          />
          {!esEmpresa ? (
            <ContratoDetalleField label="Apellidos" value={apellidos} />
          ) : null}
          <ContratoDetalleField label="DNI / NIE" value={contract.nif} mono />
          <ContratoDetalleField
            label="Email"
            value={
              contract.email ? (
                <a
                  href={`mailto:${contract.email}`}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline break-all"
                >
                  {contract.email}
                </a>
              ) : null
            }
          />
          <ContratoDetalleField
            label="Teléfono"
            value={
              contract.telefono ? (
                <a
                  href={`tel:${contract.telefono.replace(/\s/g, "")}`}
                  className="text-cyan-600 dark:text-cyan-400 hover:underline"
                >
                  {contract.telefono}
                </a>
              ) : null
            }
            mono
          />
        </ContratoDetalleFieldGrid>
      </ContratoDetalleSection>
    </div>
  )
}
