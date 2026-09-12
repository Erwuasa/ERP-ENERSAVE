import { useEffect, useState } from "react"
import { GeneralDatabasePage as GeneralDatabasePanel } from "@/components/GeneralDatabasePage"
import { useAuth } from "@/hooks/useAuth"
import {
  extractGeneralDatabaseLeadId,
  generalDatabaseLeadToProspectoInput,
} from "@/lib/general-database-prospecto"
import { listImportedGeneralDatabaseLeadIds } from "@/lib/supabase/general-database-leads"
import { createProspecto, getProspecto } from "@/lib/supabase/ventas"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"
import type { GeneralDatabaseLead } from "@/types/general-database"

export function BaseDatosPage() {
  const { activeUser } = useAuth()
  const { openVentasFicha } = useErpWorkspaceContext()
  const [importedLeadIds, setImportedLeadIds] = useState<Set<string>>(new Set())

  useEffect(() => {
    let cancelled = false
    void listImportedGeneralDatabaseLeadIds().then((result) => {
      if (!cancelled && result.ok) setImportedLeadIds(new Set(result.data))
    })
    return () => {
      cancelled = true
    }
  }, [])

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
      comercialId: activeUser.id,
      comercialName: activeUser.fullName,
    })
    if (!result || result.ok !== true || !("data" in result)) return null
    const leadId = extractGeneralDatabaseLeadId(result.data.metadata) ?? lead.id
    setImportedLeadIds((prev) => new Set(prev).add(leadId))
    return result.data.id
  }

  return (
    <GeneralDatabasePanel
      importedLeadIds={importedLeadIds}
      onConvertToProspecto={onConvertToProspecto}
      onOpenProspecto={(prospectoId) => {
        void getProspecto(prospectoId).then((result) => {
          if (result.ok) openVentasFicha(result.data)
        })
      }}
    />
  )
}
