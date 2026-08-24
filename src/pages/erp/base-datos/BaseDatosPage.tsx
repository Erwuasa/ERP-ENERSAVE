import { useMemo } from "react"
import { GeneralDatabasePage as GeneralDatabasePanel } from "@/components/GeneralDatabasePage"
import { useAuth } from "@/hooks/useAuth"
import {
  extractGeneralDatabaseLeadId,
  generalDatabaseLeadToProspectoInput,
} from "@/lib/general-database-prospecto"
import { useProspectos } from "@/lib/ventas/hooks/useProspectos"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"
import { mapVentasRole } from "@/types/profile"
import type { GeneralDatabaseLead } from "@/types/general-database"

export function BaseDatosPage() {
  const { activeUser } = useAuth()
  const { openVentasFicha } = useErpWorkspaceContext()
  const actor = {
    comercialId: activeUser.id,
    comercialName: activeUser.fullName,
    role: mapVentasRole(activeUser.role),
  }
  const { prospectos, createProspecto } = useProspectos(actor)

  const importedLeadIds = useMemo(() => {
    const ids = new Set<string>()
    for (const prospecto of prospectos) {
      const leadId = extractGeneralDatabaseLeadId(prospecto.metadata)
      if (leadId) ids.add(leadId)
    }
    return ids
  }, [prospectos])

  async function onConvertToProspecto(lead: GeneralDatabaseLead): Promise<string | null> {
    const input = generalDatabaseLeadToProspectoInput(lead, activeUser.id, activeUser.fullName)
    const result = await createProspecto({
      nombre: input.nombre,
      telefono: input.telefono,
      direccion: input.direccion,
      codigoPostal: input.codigoPostal,
      poblacion: input.poblacion,
      provincia: input.provincia,
      subtipoProspecto: input.subtipoProspecto,
      fase: input.fase,
      metadata: input.metadata,
    })
    if (!result || result.ok !== true || !("data" in result)) return null
    return result.data.id
  }

  return (
    <GeneralDatabasePanel
      importedLeadIds={importedLeadIds}
      onConvertToProspecto={onConvertToProspecto}
      onOpenProspecto={(prospectoId) => {
        const prospecto = prospectos.find((item) => item.id === prospectoId)
        if (prospecto) openVentasFicha(prospecto)
      }}
    />
  )
}
