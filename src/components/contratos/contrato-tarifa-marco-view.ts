import type { Contract } from "@/types/contract"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { normalizePeaje } from "@/lib/tarifa-cost-calculator"
import {
  formatMarcoPotenciaRango,
  formatMarcoRetributivoNombre,
  marcoActivePeriodCount,
  marcoHasSva,
  marcoPotenciaPeriodCount,
} from "@/components/contratos/contrato-marco-display-utils"

export interface ContratoTarifaMarcoView {
  company: string
  supply: "LUZ" | "GAS"
  peaje?: string
  potenciaRango?: string
  marcoNombre?: string
  tarifaNombre?: string
  preciosInline?: string
  servicios?: string
  hasSva: boolean
}

function formatSvas(raw: unknown): string | null {
  if (raw == null) return null
  if (typeof raw === "string" && raw.trim()) return raw.trim()
  if (!Array.isArray(raw) || raw.length === 0) return null
  const names = raw
    .map((item) => {
      if (typeof item === "string") return item.trim()
      if (item && typeof item === "object") {
        const record = item as Record<string, unknown>
        const name = record.name ?? record.nombre ?? record.title ?? record.sva
        return typeof name === "string" ? name.trim() : ""
      }
      return ""
    })
    .filter(Boolean)
  return names.length > 0 ? names.join(" · ") : null
}

function formatPrecioInline(value: number): string {
  return value.toLocaleString("es-ES", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })
}

function periodIndex(period: string): number | null {
  const match = /p\s*(\d+)/i.exec(period)
  if (!match) return null
  const index = Number(match[1])
  return Number.isFinite(index) && index > 0 ? index : null
}

export function formatAtPricesInline(
  prices: Contract["atPrices"],
  peaje?: string
): string | undefined {
  if (!prices?.length) return undefined

  const energiaLimit = peaje ? marcoActivePeriodCount(peaje) : 6
  const potenciaLimit = peaje ? marcoPotenciaPeriodCount(peaje) : 6
  const byPeriod = new Map<number, { energy?: number; power?: number }>()

  for (const row of prices) {
    const index = periodIndex(row.period)
    if (index == null) continue
    const current = byPeriod.get(index) ?? {}
    if (row.energy != null) current.energy = row.energy
    if (row.power != null) current.power = row.power
    byPeriod.set(index, current)
  }

  const potenciaParts: string[] = []
  for (let periodo = 1; periodo <= potenciaLimit; periodo++) {
    const value = byPeriod.get(periodo)?.power
    if (value == null) continue
    potenciaParts.push(`p${periodo} ${formatPrecioInline(value)}`)
  }

  const energiaParts: string[] = []
  for (let periodo = 1; periodo <= energiaLimit; periodo++) {
    const value = byPeriod.get(periodo)?.energy
    if (value == null) continue
    energiaParts.push(`p${periodo} ${formatPrecioInline(value)}`)
  }

  const chunks: string[] = []
  if (potenciaParts.length > 0) chunks.push(`P ${potenciaParts.join(" · ")}`)
  if (energiaParts.length > 0) chunks.push(`E ${energiaParts.join(" · ")}`)
  return chunks.length > 0 ? chunks.join(" ") : undefined
}

function isPlaceholderLabel(value?: string): boolean {
  const trimmed = (value ?? "").trim()
  if (!trimmed || trimmed === "—") return true
  const upper = trimmed.toUpperCase()
  return upper === "AT" || upper === "TARIFA AT" || upper === "SIN COMPAÑÍA"
}

export function buildContratoTarifaMarcoView(
  contract: Contract,
  marco?: MarcoRetributivoRow | null
): ContratoTarifaMarcoView | null {
  const peajeRaw = marco?.peaje || contract.atAccessTariff || contract.atr
  const peaje = peajeRaw ? normalizePeaje(peajeRaw) : undefined
  const svaLabel = formatSvas(contract.atSvas)
  const hasSva = marco ? marcoHasSva(marco) : Boolean(svaLabel)
  const storedTarifa = isPlaceholderLabel(contract.tarifa) ? undefined : contract.tarifa
  const tarifaNombre = contract.atRateName || storedTarifa
  const company = !isPlaceholderLabel(contract.compania)
    ? contract.compania
    : marco?.compania
  const hasCrmData = Boolean(
    marco ||
      contract.atRateName ||
      contract.atAccessTariff ||
      contract.atMarcoId ||
      contract.atRateId ||
      contract.atPrices?.length ||
      svaLabel
  )
  if (!hasCrmData) return null

  const potenciaRango = marco ? formatMarcoPotenciaRango(marco) : undefined

  return {
    company: company || "",
    supply: contract.tipo === "gas" ? "GAS" : "LUZ",
    peaje,
    potenciaRango: potenciaRango && potenciaRango !== "—" ? potenciaRango : undefined,
    marcoNombre: marco ? formatMarcoRetributivoNombre(marco) : tarifaNombre,
    tarifaNombre,
    preciosInline: formatAtPricesInline(contract.atPrices, peaje),
    servicios: svaLabel ?? undefined,
    hasSva,
  }
}
