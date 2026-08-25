export interface EnersaveLead {
  id: string
  nombre: string
  empresa?: string
  telefono?: string
  email?: string
  sector?: string
  provincia?: string
  codigoPostal?: string
  cups?: string
  consumoAnualKwh?: number
  companiaActual?: string
  notas?: string
  metadata?: Record<string, unknown>
  createdAt: string
  updatedAt: string
}

export interface EnersaveLeadFilters {
  search?: string
  sector?: string
  provincia?: string
}

export const ENERSAVE_LEAD_SECTORS = [
  "Retail",
  "Hostelería",
  "Industrial",
  "Sanidad",
  "Deporte",
  "Oficinas",
  "Logística",
  "Otros",
] as const

export type EnersaveLeadSector = (typeof ENERSAVE_LEAD_SECTORS)[number]

export interface CreateEnersaveLeadInput {
  nombre: string
  empresa?: string
  telefono?: string
  email?: string
  sector?: string
  provincia?: string
  codigoPostal?: string
  cups?: string
  consumoAnualKwh?: number
  companiaActual?: string
  notas?: string
}

function normalizeText(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase()
}

export function filterEnersaveLeads(
  leads: EnersaveLead[],
  filters: EnersaveLeadFilters
): EnersaveLead[] {
  const q = normalizeText(filters.search)
  const sector = filters.sector?.trim()
  const provincia = filters.provincia?.trim()

  return leads.filter((lead) => {
    if (sector && lead.sector !== sector) return false
    if (provincia && lead.provincia !== provincia) return false
    if (!q) return true

    const blob = [
      lead.nombre,
      lead.empresa,
      lead.telefono,
      lead.email,
      lead.sector,
      lead.provincia,
      lead.cups,
      lead.companiaActual,
      lead.notas,
    ]
      .map((v) => normalizeText(v))
      .join(" ")

    return blob.includes(q)
  })
}

export function collectEnersaveLeadProvincias(leads: EnersaveLead[]): string[] {
  const set = new Set<string>()
  for (const lead of leads) {
    if (lead.provincia?.trim()) set.add(lead.provincia.trim())
  }
  return [...set].sort((a, b) => a.localeCompare(b, "es"))
}

/** Parse CSV/Excel-exported text (comma or semicolon). Header row optional. */
export function parseLeadsCsv(text: string): CreateEnersaveLeadInput[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
  if (lines.length === 0) return []

  const delimiter = lines[0].includes(";") ? ";" : ","
  const header = lines[0].split(delimiter).map((h) => normalizeHeader(h))

  const rows = lines.slice(headerLooksLikeData(header) ? 0 : 1)

  return rows
    .map((line) => {
      const cols = line.split(delimiter).map((c) => c.trim().replace(/^"|"$/g, ""))
      const get = (keys: string[]) => {
        for (const key of keys) {
          const idx = header.indexOf(key)
          if (idx >= 0 && cols[idx]) return cols[idx]
        }
        return undefined
      }

      const nombre = get(["nombre", "negocio", "empresa", "name"]) ?? cols[0]
      if (!nombre?.trim()) return null

      const consumoRaw = get(["consumo", "consumo_anual", "consumoanualkwh"])
      const consumo = consumoRaw ? Number(consumoRaw.replace(",", ".")) : undefined

      return {
        nombre: nombre.trim(),
        empresa: get(["empresa", "razon_social", "company"]),
        telefono: get(["telefono", "tel", "phone", "móvil", "movil"]),
        email: get(["email", "correo", "mail"]),
        sector: get(["sector", "rubro", "actividad"]),
        provincia: get(["provincia", "region"]),
        codigoPostal: get(["codigo_postal", "cp", "postal"]),
        cups: get(["cups"]),
        consumoAnualKwh: Number.isFinite(consumo) ? consumo : undefined,
        companiaActual: get(["compania", "compania_actual", "suministradora"]),
        notas: get(["notas", "observaciones", "notes"]),
      }
    })
    .filter((r) => r !== null) as CreateEnersaveLeadInput[]
}

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/\s+/g, "_")
}

function headerLooksLikeData(header: string[]): boolean {
  if (header.length === 0) return true
  return header[0] === "nombre" || header.includes("telefono") ? false : !header.some((h) =>
    ["nombre", "empresa", "telefono", "email", "sector"].includes(h)
  )
}
