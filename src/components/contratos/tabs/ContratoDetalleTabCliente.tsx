import type { Contract } from "@/types/contract"
import {
  ContratoDetalleField,
  ContratoDetalleFieldGrid,
  ContratoDetalleSection,
} from "@/components/contratos/contrato-detalle-ui"
import {
  formatCambioTitularLabel,
  formatTipoClienteLabel,
  formatTipoOperacionContrato,
  resolveClientNameParts,
} from "@/components/contratos/contrato-detalle-utils"

interface ContratoDetalleTabClienteProps {
  contract: Contract
}

export function ContratoDetalleTabCliente({ contract }: ContratoDetalleTabClienteProps) {
  const { nombre, apellidos, esEmpresa } = resolveClientNameParts(contract)
  const tipoOperacion = formatTipoOperacionContrato(contract)
  const cambioTitular = formatCambioTitularLabel(contract)

  return (
    <div className="space-y-5 max-w-4xl">
      {tipoOperacion ? (
        <ContratoDetalleSection title="Operación del suministro">
          <ContratoDetalleFieldGrid>
            <ContratoDetalleField label="Tipo de operación" value={tipoOperacion} />
            {cambioTitular ? (
              <ContratoDetalleField label="¿Cambio de titular?" value={cambioTitular} />
            ) : null}
            {contract.isOwnershipChange ? (
              <>
                <ContratoDetalleField
                  label="Nombre titular actual"
                  value={contract.titularActualNombre}
                />
                <ContratoDetalleField
                  label="DNI titular actual"
                  value={contract.titularActualDni}
                  mono
                />
              </>
            ) : null}
          </ContratoDetalleFieldGrid>
        </ContratoDetalleSection>
      ) : null}

      <ContratoDetalleSection title="Datos del cliente">
        <ContratoDetalleFieldGrid>
          <ContratoDetalleField
            label="Tipo de cliente"
            value={formatTipoClienteLabel(contract.tipoCliente)}
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
