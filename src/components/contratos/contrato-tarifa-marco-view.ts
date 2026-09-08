import type { Contract } from "@/types/contract"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { normalizePeaje } from "@/lib/tarifa-cost-calculator"
import {
  formatMarcoPotenciaRango,
  formatMarcoPreciosInline,
  formatMarcoRetributivoNombre,
  marcoHasSva,
} from "@/components/contratos/contrato-marco-display-utils"

export interface ContratoTarifaMarcoView {
  company: string
  supply: "LUZ" | "GAS"
  peaje?: string
  potenciaRango?: string
  marcoNombre?: string
  tarifaNombre?: string
  preciosInline?: string
  servicios: string
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

function peajePotenciaRango(peaje?: string): string | undefined {
  if (!peaje) return undefined
  if (peaje.includes("2.0")) return "DE 0 A 15 KW"
  if (peaje.includes("3.0")) return "MÁS DE 15 KW"
  if (peaje.includes("6.")) return "ALTA TENSIÓN"
  return undefined
}

export function buildContratoTarifaMarcoView(
  contract: Contract,
  marco?: MarcoRetributivoRow | null
): ContratoTarifaMarcoView | null {
  const peaje = normalizePeaje(marco?.peaje || contract.atAccessTariff || contract.atr)
  const svaLabel = formatSvas(contract.atSvas)
  const hasSva = marco ? marcoHasSva(marco) : Boolean(svaLabel)
  const tarifaNombre = contract.atRateName || (contract.tarifa !== "Tarifa AT" ? contract.tarifa : undefined)
  const company =
    contract.compania && contract.compania !== "AT" ? contract.compania : marco?.compania || contract.compania
  const hasCrmData = Boolean(
    marco || contract.atRateName || contract.atAccessTariff || contract.atMarcoId || contract.atRateId || svaLabel
  )
  if (!hasCrmData) return null

  return {
    company: company || "—",
    supply: contract.tipo === "gas" ? "GAS" : "LUZ",
    peaje,
    potenciaRango:
      (marco ? formatMarcoPotenciaRango(marco) : undefined) || peajePotenciaRango(peaje),
    marcoNombre: marco ? formatMarcoRetributivoNombre(marco) : tarifaNombre,
    tarifaNombre,
    preciosInline: marco ? formatMarcoPreciosInline(marco) : undefined,
    servicios: svaLabel ?? (hasSva ? "Servicios / SVA incluidos" : "Sin servicios añadidos"),
    hasSva,
  }
}
