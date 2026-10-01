export const COMPANIA_LOGO_KEYS = [
  "endesa",
  "repsol",
  "naturgy",
  "totalenergies",
  "iberdrola",
  "niba",
  "axpo",
  "ignis",
  "ganaenergia",
  "unielectrica",
  "edp",
  "holaluz",
  "octopus",
  "acciona",
  "alumbraenergia",
  "chcenergia",
  "cyenergia",
  "energyavm",
  "imaginaenergia",
  "inerenergia",
  "logos",
  "maxenergia",
  "nexus",
  "nordy",
  "opcionenergia",
  "plenitude",
  "podo",
  "reazziona",
  "yaluz",
  "neon",
] as const

export type CompaniaLogoKey = (typeof COMPANIA_LOGO_KEYS)[number]

export const COMPANIA_LABELS: Record<CompaniaLogoKey, string> = {
  endesa: "Endesa",
  repsol: "Repsol",
  naturgy: "Naturgy",
  totalenergies: "TotalEnergies",
  iberdrola: "Iberdrola",
  niba: "Niba",
  axpo: "Axpo",
  ignis: "Ignis",
  ganaenergia: "Gana Energía",
  unielectrica: "UniEléctrica",
  edp: "EDP",
  holaluz: "Holaluz",
  octopus: "Octopus",
  acciona: "Acciona",
  alumbraenergia: "Alumbra Energía",
  chcenergia: "CHC Energía",
  cyenergia: "CyE Energía",
  energyavm: "Energya VM",
  imaginaenergia: "Imagina Energía",
  inerenergia: "Iner Energía",
  logos: "Logos",
  maxenergia: "Max Energía",
  nexus: "Nexus",
  nordy: "Nordy",
  opcionenergia: "Opción Energía",
  plenitude: "Plenitude",
  podo: "Podo",
  reazziona: "Reazziona",
  yaluz: "Yaluz",
  neon: "Neón",
}

/** Alias → clave. Más específico primero. */
const COMPANIA_ALIASES: [string, CompaniaLogoKey][] = [
  ["nexus energia", "nexus"],
  ["nexus energía", "nexus"],
  ["logos energia", "logos"],
  ["logos energía", "logos"],
  ["max energia", "maxenergia"],
  ["max energía", "maxenergia"],
  ["neon energia", "neon"],
  ["neon energía", "neon"],
  ["neón energia", "neon"],
  ["neón energía", "neon"],
  ["imagina energia", "imaginaenergia"],
  ["imagina energía", "imaginaenergia"],
  ["iner energia", "inerenergia"],
  ["iner energía", "inerenergia"],
  ["opcion energia", "opcionenergia"],
  ["opción energia", "opcionenergia"],
  ["opcion energía", "opcionenergia"],
  ["cye energia", "cyenergia"],
  ["cye energía", "cyenergia"],
  ["chc energia", "chcenergia"],
  ["alumbra energia", "alumbraenergia"],
  ["energya vm", "energyavm"],
  ["totalenergies", "totalenergies"],
  ["total energies", "totalenergies"],
  ["gana energia", "ganaenergia"],
  ["gana energía", "ganaenergia"],
  ["ganenergia", "ganaenergia"],
  ["unielectrica", "unielectrica"],
  ["uni electrica", "unielectrica"],
  ["iberdrola", "iberdrola"],
  ["endesa", "endesa"],
  ["repsol", "repsol"],
  ["naturgy", "naturgy"],
  ["ignis", "ignis"],
  ["holaluz", "holaluz"],
  ["octopus", "octopus"],
  ["niba", "niba"],
  ["axpo", "axpo"],
  ["edp", "edp"],
  ["acciona", "acciona"],
  ["reazziona", "reazziona"],
  ["plenitude", "plenitude"],
  ["nordy", "nordy"],
  ["podo", "podo"],
  ["yaluz", "yaluz"],
  ["nexus", "nexus"],
  ["neon", "neon"],
  ["neón", "neon"],
  ["logos", "logos"],
]

/** Etiqueta única por clave normalizada (datos manuales en Supabase, sin depender de AT). */
const CANONICAL_COMPANIA_LABELS: Record<string, string> = {
  acciona: "Acciona",
  alumbraenergia: "Alumbra Energía",
  axpo: "Axpo",
  cyenergia: "CyE Energía",
  eleia: "Eleia",
  endesa: "Endesa",
  factorenergia: "Factor Energía",
  ganaenergia: "Gana Energía",
  iberdrola: "Iberdrola",
  ignis: "Ignis",
  imaginaenergia: "Imagina Energía",
  inerenergia: "Iner Energía",
  logos: "Logos",
  maxenergia: "Max Energía",
  naturgy: "Naturgy",
  neon: "Neón",
  nexus: "Nexus",
  chcenergia: "CHC Energía",
  energyavm: "Energya VM",
  plenitude: "Plenitude",
  podo: "Podo",
  niba: "Niba",
  nordy: "Nordy",
  opcionenergia: "Opción Energía",
  reazziona: "Reazziona",
  repsol: "Repsol",
  totalenergies: "TotalEnergies",
  unielectrica: "UniEléctrica",
  yaluz: "Yaluz",
}

export function normalizeCompaniaKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
}

/** Agrupa selector/filtros: misma clave para variantes (p. ej. «Todo Plenitude…» → plenitude). */
export function companiaSelectorMergeKey(name: string): string {
  const trimmed = name.trim()
  if (!trimmed) return ""
  const logoKey = resolveCompaniaLogoKey(trimmed)
  if (logoKey) return logoKey
  return normalizeCompaniaKey(trimmed) || trimmed.toLowerCase()
}

/** Filtro UI (etiqueta canónica) vs fila Supabase (nombre crudo). */
export function companiaMatchesSelectorFilter(
  entryName: string | null | undefined,
  filterName: string
): boolean {
  if (!filterName || filterName === "Todos") return true
  const entry = String(entryName ?? "").trim()
  const filter = filterName.trim()
  if (!entry || !filter) return false
  if (formatCompaniaLabel(entry) === formatCompaniaLabel(filter)) return true
  return companiaSelectorMergeKey(entry) === companiaSelectorMergeKey(filter)
}

export function resolveCompaniaLogoKey(name: string | null | undefined): CompaniaLogoKey | null {
  const raw = name?.trim()
  if (!raw) return null

  const compact = normalizeCompaniaKey(raw)
  if ((COMPANIA_LOGO_KEYS as readonly string[]).includes(compact)) {
    return compact as CompaniaLogoKey
  }

  const lowered = raw.toLowerCase()
  for (const [alias, key] of COMPANIA_ALIASES) {
    const aliasCompact = normalizeCompaniaKey(alias)
    if (compact.includes(aliasCompact) || lowered.includes(alias)) return key
  }

  return null
}

export function hasCompaniaLogo(name: string): boolean {
  return resolveCompaniaLogoKey(name) !== null
}

export function formatCompaniaLabel(name: string): string {
  const compact = normalizeCompaniaKey(name)
  if (compact && CANONICAL_COMPANIA_LABELS[compact]) {
    return CANONICAL_COMPANIA_LABELS[compact]
  }

  const key = resolveCompaniaLogoKey(name)
  if (key) return COMPANIA_LABELS[key]

  return name
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((word) => {
      if (word.length <= 3) return word.toUpperCase()
      return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
    })
    .join(" ")
}

export function getCompaniaInitials(name: string): string {
  const label = formatCompaniaLabel(name)
  const words = label.split(/\s+/).filter(Boolean)
  if (words.length >= 2) {
    return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase()
  }
  return label.replace(/[^A-Za-z0-9]/g, "").slice(0, 2).toUpperCase() || "?"
}

export function mergeCompanyNames(groups: string[][]): string[] {
  const raw: Record<string, number> = {}
  for (const group of groups) {
    for (const name of group) {
      const trimmed = name.trim()
      if (!trimmed) continue
      raw[trimmed] = (raw[trimmed] ?? 0) + 1
    }
  }
  return mergeProviderCounts(raw).labels
}

export function buildCanonicalCompaniaCounts(
  rows: Array<{ compania: string | null | undefined }>
): ReturnType<typeof mergeProviderCounts> {
  const raw: Record<string, number> = {}
  for (const row of rows) {
    const compania = String(row.compania ?? "").trim()
    if (!compania) continue
    raw[compania] = (raw[compania] ?? 0) + 1
  }
  return mergeProviderCounts(raw)
}

export function mergeProviderCounts(
  raw: Record<string, number>
): {
  labels: string[]
  countsByLabel: Record<string, number>
  keyByLabel: Record<string, string>
  filterNameByLabel: Record<string, string>
} {
  const merged = new Map<
    string,
    { label: string; count: number; bestRaw: string; bestRawCount: number }
  >()

  for (const [name, count] of Object.entries(raw)) {
    const key = companiaSelectorMergeKey(name) || name.toLowerCase()
    const label = formatCompaniaLabel(name)
    const existing = merged.get(key)
    if (existing) {
      existing.count += count
      if (count > existing.bestRawCount) {
        existing.bestRawCount = count
        existing.bestRaw = name
      }
    } else {
      merged.set(key, { label, count, bestRaw: name, bestRawCount: count })
    }
  }

  const labels = [...merged.values()]
    .sort((a, b) => a.label.localeCompare(b.label, "es"))
    .map((item) => item.label)

  const countsByLabel: Record<string, number> = {}
  const keyByLabel: Record<string, string> = {}
  const filterNameByLabel: Record<string, string> = {}
  for (const [key, item] of merged.entries()) {
    countsByLabel[item.label] = item.count
    keyByLabel[item.label] = key
    filterNameByLabel[item.label] = item.bestRaw
  }

  return { labels, countsByLabel, keyByLabel, filterNameByLabel }
}

export function filterAndSortWizardCompanies(companies: string[], query: string): string[] {
  const q = query.trim().toLowerCase()
  const filtered = q
    ? companies.filter((name) => {
        const label = formatCompaniaLabel(name).toLowerCase()
        return label.includes(q) || name.toLowerCase().includes(q)
      })
    : companies

  return [...filtered].sort((a, b) => {
    const aLogo = hasCompaniaLogo(a) ? 0 : 1
    const bLogo = hasCompaniaLogo(b) ? 0 : 1
    if (aLogo !== bLogo) return aLogo - bLogo
    return formatCompaniaLabel(a).localeCompare(formatCompaniaLabel(b), "es")
  })
}
