import type { GeneralDatabaseLead } from "../types/general-database"
import type { CreateProspectoInput } from "./ventas/types"

export function generalDatabaseLeadToProspectoInput(
  lead: GeneralDatabaseLead,
  comercialId: string,
  comercialName: string
): CreateProspectoInput {
  return {
    nombre: lead.nombre,
    comercialId,
    comercialName,
    telefono: lead.telefono,
    direccion: lead.sede,
    codigoPostal: lead.codigoPostal,
    poblacion: lead.localidad,
    provincia: lead.provincia,
    subtipoProspecto: "base_datos",
    fase: "prospecto_nuevo",
    metadata: {
      general_database_lead_id: lead.id,
      import_source: "general_database",
      cnae: lead.cnae,
      numero_empleados: lead.numeroEmpleados,
      descripcion_actividad: lead.descripcionActividad,
      direccion_web: lead.direccionWeb,
      lead_source: lead.source,
      segment: lead.segment,
    },
  }
}

export function extractGeneralDatabaseLeadId(
  metadata: Record<string, unknown> | undefined
): string | undefined {
  const id = metadata?.general_database_lead_id
  return typeof id === "string" ? id : undefined
}
