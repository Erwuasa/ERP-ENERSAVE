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
}

/** Alias → clave. Más específico primero. */
const COMPANIA_ALIASES: [string, CompaniaLogoKey][] = [
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
]

export function normalizeCompaniaKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
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
  const seen = new Set<string>()
  const out: string[] = []
  for (const group of groups) {
    for (const name of group) {
      const key = normalizeCompaniaKey(name)
      if (!key || seen.has(key)) continue
      seen.add(key)
      out.push(name)
    }
  }
  return out
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
    const key = normalizeCompaniaKey(name) || name.toLowerCase()
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
