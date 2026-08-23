import type {
  GeneralDatabaseFilters,
  GeneralDatabaseLead,
  GeneralDatabaseLeadSource,
} from "../types/general-database"

const SOURCE_PRIORITY: Record<GeneralDatabaseLeadSource, number> = {
  campana: 300,
  web: 200,
  base: 100,
}

export function generalDatabaseLeadScore(lead: GeneralDatabaseLead): number {
  let score = SOURCE_PRIORITY[lead.source]
  if (lead.telefono?.trim()) score += 20
  if (lead.direccionWeb?.trim()) score += 10
  if (lead.numeroEmpleados != null && lead.numeroEmpleados >= 10) score += 5
  return score
}

export function sortGeneralDatabaseLeads(
  leads: GeneralDatabaseLead[]
): GeneralDatabaseLead[] {
  return [...leads].sort((a, b) => {
    const diff = generalDatabaseLeadScore(b) - generalDatabaseLeadScore(a)
    if (diff !== 0) return diff
    return a.nombre.localeCompare(b.nombre, "es")
  })
}

function normalize(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

export function filterGeneralDatabaseLeads(
  leads: GeneralDatabaseLead[],
  filters: GeneralDatabaseFilters
): GeneralDatabaseLead[] {
  const q = normalize(filters.search)

  return leads.filter((lead) => {
    if (filters.segment && lead.segment !== filters.segment) return false

    if (filters.localidad && normalize(lead.localidad) !== normalize(filters.localidad)) {
      return false
    }

    if (filters.provincia && normalize(lead.provincia) !== normalize(filters.provincia)) {
      return false
    }

    if (filters.cnae && normalize(lead.cnae) !== normalize(filters.cnae)) {
      return false
    }

    if (filters.conTelefono && !lead.telefono?.trim()) return false
    if (filters.conWeb && !lead.direccionWeb?.trim()) return false

    if (filters.soloPrioritarios && lead.source === "base") return false

    const empleados = lead.numeroEmpleados ?? 0
    if (filters.empleadosMin != null && empleados < filters.empleadosMin) return false
    if (filters.empleadosMax != null && empleados > filters.empleadosMax) return false

    if (!q) return true

    const blob = [
      lead.nombre,
      lead.sede,
      lead.localidad,
      lead.provincia,
      lead.descripcionActividad,
      lead.cnae,
      lead.telefono,
      lead.direccionWeb,
    ]
      .map(normalize)
      .join(" ")

    return blob.includes(q)
  })
}

export function collectGeneralDatabaseProvincias(
  leads: GeneralDatabaseLead[]
): string[] {
  const set = new Set<string>()
  for (const lead of leads) {
    if (lead.provincia?.trim()) set.add(lead.provincia.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"))
}

export function collectGeneralDatabaseCnaes(leads: GeneralDatabaseLead[]): string[] {
  const set = new Set<string>()
  for (const lead of leads) {
    if (lead.cnae?.trim()) set.add(lead.cnae.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"))
}

export function collectGeneralDatabaseLocalidades(
  leads: GeneralDatabaseLead[]
): string[] {
  const set = new Set<string>()
  for (const lead of leads) {
    if (lead.localidad?.trim()) set.add(lead.localidad.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"))
}

export function generalDatabaseSourceLabel(
  source: GeneralDatabaseLead["source"]
): string {
  switch (source) {
    case "campana":
      return "Campaña"
    case "web":
      return "Web"
    default:
      return "Base"
  }
}

export function generalDatabaseSegmentLabel(
  segment: GeneralDatabaseLead["segment"]
): string {
  switch (segment) {
    case "pyme":
      return "PYME"
    case "comunidades":
      return "Comunidades"
    default:
      return "Residencial"
  }
}
