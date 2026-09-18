import type { MarcoRetributivoEntry } from "@/data/marco-retributivo-catalog"
import type { ContractPeajeSegment } from "@/lib/contract-peaje-segment"
import { marcoEntryMatchesPeajeSegment } from "@/lib/contract-peaje-segment"
import {
  isMarcoEntryForSegment,
  type ContractWizardSegment,
} from "@/lib/contract-tariff-filter"

export interface ServicioExtraOption {
  id: string
  label: string
  amountEur: number
  segmentScope: "residencial" | "pyme" | "all"
}

function slugify(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
}

function parseEuroAmount(raw: string): number | null {
  const normalized = raw.replace(/\s/g, "").replace(",", ".")
  const value = Number(normalized)
  return Number.isFinite(value) && value > 0 ? value : null
}

function extractSvaSection(condiciones: string): string | null {
  const match = condiciones.match(/SVA\/SVG:\s*([^|]+)/i)
  const section = match?.[1]?.trim()
  if (!section || /no identificados/i.test(section)) return null
  return section
}

function segmentScopeForBlock(block: string): ServicioExtraOption["segmentScope"] {
  const lower = block.toLowerCase()
  if (lower.startsWith("pyme:") || lower.includes("(luz)") && lower.startsWith("pyme")) {
    return "pyme"
  }
  if (lower.startsWith("hogar:") || lower.includes("hogar:")) return "residencial"
  return "all"
}

function stripSegmentPrefix(block: string): string {
  return block.replace(/^(pyme|hogar|residencial|particular):\s*/i, "").trim()
}

function parseAmountItems(block: string, segmentScope: ServicioExtraOption["segmentScope"]): ServicioExtraOption[] {
  const items: ServicioExtraOption[] = []
  const seen = new Set<string>()

  const colonPattern = /([^·]+?):\s*(\d+(?:[.,]\d+)?)\s*€/g
  for (const match of block.matchAll(colonPattern)) {
    const label = match[1].trim().replace(/\s+/g, " ")
    const amount = parseEuroAmount(match[2])
    if (!label || amount == null) continue
    const id = slugify(`${label}-${amount}`)
    if (seen.has(id)) continue
    seen.add(id)
    items.push({ id, label, amountEur: amount, segmentScope })
  }

  const plainPattern = /([A-Za-zÁÉÍÓÚáéíóúñÑ][A-Za-zÁÉÍÓÚáéíóúñÑ0-9\s+\-/]*?)\s+(\d+(?:[.,]\d+)?)\s*€/g
  for (const match of block.matchAll(plainPattern)) {
    const label = match[1].trim().replace(/\s+/g, " ")
    if (!label || /^(pyme|hogar|residencial|particular)$/i.test(label)) continue
    const amount = parseEuroAmount(match[2])
    if (amount == null) continue
    const id = slugify(`${label}-${amount}`)
    if (seen.has(id)) continue
    seen.add(id)
    items.push({ id, label, amountEur: amount, segmentScope })
  }

  const tierMatch = block.match(/(\d+(?:[.,]\d+)?)\s*€\s*\/\s*(\d+(?:[.,]\d+)?)\s*€\s*\/\s*(\d+(?:[.,]\d+)?)\s*€/i)
  if (tierMatch) {
    const tiers = [
      { label: "Servicio básico", amount: parseEuroAmount(tierMatch[1]) },
      { label: "Servicio intermedio", amount: parseEuroAmount(tierMatch[2]) },
      { label: "Servicio premium", amount: parseEuroAmount(tierMatch[3]) },
    ]
    for (const tier of tiers) {
      if (tier.amount == null) continue
      const id = slugify(`${tier.label}-${tier.amount}`)
      if (seen.has(id)) continue
      seen.add(id)
      items.push({
        id,
        label: tier.label,
        amountEur: tier.amount,
        segmentScope,
      })
    }
  }

  return items
}

export function parseServiciosExtrasFromCondiciones(
  condiciones: string,
  segment: ContractWizardSegment
): ServicioExtraOption[] {
  const section = extractSvaSection(condiciones)
  if (!section) return []

  const blocks = section.split(/\s·\s|\.\s+(?=Pyme:|Hogar:)/i).map((b) => b.trim()).filter(Boolean)
  const allItems: ServicioExtraOption[] = []
  const seen = new Set<string>()

  for (const rawBlock of blocks.length > 0 ? blocks : [section]) {
    const scope = segmentScopeForBlock(rawBlock)
    if (scope !== "all" && scope !== segment) continue

    const block = stripSegmentPrefix(rawBlock)
    for (const item of parseAmountItems(block, scope === "all" ? segment : scope)) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      allItems.push(item)
    }
  }

  if (allItems.length === 0) {
    for (const item of parseAmountItems(stripSegmentPrefix(section), segment)) {
      if (item.segmentScope !== "all" && item.segmentScope !== segment) continue
      if (seen.has(item.id)) continue
      seen.add(item.id)
      allItems.push(item)
    }
  }

  return allItems.sort((a, b) => a.label.localeCompare(b.label, "es"))
}

export function listServiciosExtrasForWizard(params: {
  catalog: MarcoRetributivoEntry[]
  compania: string
  segment: ContractWizardSegment
  peajeSegment: ContractPeajeSegment
  preferredEntryId?: string
}): ServicioExtraOption[] {
  const { catalog, compania, segment, peajeSegment, preferredEntryId } = params
  if (!compania.trim()) return []

  const matching = catalog.filter((entry) => {
    if (entry.compania !== compania) return false
    if (!isMarcoEntryForSegment(entry, segment)) return false
    if (!marcoEntryMatchesPeajeSegment(entry.peaje, peajeSegment)) return false
    return Boolean(extractSvaSection(entry.condiciones))
  })

  const preferred = preferredEntryId
    ? matching.find((entry) => entry.id === preferredEntryId)
    : undefined

  const sources = preferred ? [preferred, ...matching.filter((e) => e.id !== preferred.id)] : matching

  const merged: ServicioExtraOption[] = []
  const seen = new Set<string>()

  for (const entry of sources) {
    for (const item of parseServiciosExtrasFromCondiciones(entry.condiciones, segment)) {
      if (seen.has(item.id)) continue
      seen.add(item.id)
      merged.push(item)
    }
  }

  return merged
}

export function computeServiciosExtrasCommissionEur(
  options: ServicioExtraOption[],
  selectedIds: string[],
  commissionPercentage: number
): number {
  const rate = commissionPercentage / 100
  return options
    .filter((option) => selectedIds.includes(option.id))
    .reduce((sum, option) => sum + Math.round(option.amountEur * rate * 100) / 100, 0)
}
