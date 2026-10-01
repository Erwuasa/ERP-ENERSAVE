import {
  COMPANIA_LABELS,
  formatCompaniaLabel,
  resolveCompaniaLogoKey,
} from "@/lib/erp/compania-logos"
import { resolveCompaniaFromMarcoTarifa } from "@/lib/resolve-compania-marco-tarifa"
import { getMarcoRetributivoCacheSnapshot } from "@/lib/supabase/marco-retributivo-cache"
import type { MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"

function normalizeTarifaBlob(tarifa?: string | null, oferta?: string | null): string {
  return [tarifa, oferta]
    .filter(Boolean)
    .join(" ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
}

/** Infiere comercializadora a partir del nombre comercial de tarifa (CRM / catálogo). */
export function inferCompaniaFromTarifaOffer(
  tarifa?: string | null,
  oferta?: string | null
): string | null {
  const blob = normalizeTarifaBlob(tarifa, oferta)
  if (!blob) return null

  if (
    /\bcdr\b/.test(blob) ||
    blob.includes("fixed price cdr") ||
    blob.includes("precio fijo cdr") ||
    blob.includes("precio fijo presenciales sbc") ||
    blob.includes("presenciales sbc") ||
    blob.includes("repos2") ||
    blob.includes("ta24hplus") ||
    /\bl[0248]\b/.test(blob) ||
    (/\b12m\b/.test(blob) && /\bv(2[0-9]|3[0-9])\b/.test(blob))
  ) {
    return COMPANIA_LABELS.repsol
  }

  if (
    blob.includes("luz one") ||
    blob.includes("plan fijo luz one") ||
    blob.includes("precio fijo luz one") ||
    (/\bone\b/.test(blob) && blob.includes("luz"))
  ) {
    return COMPANIA_LABELS.naturgy
  }

  if (blob.includes("niba")) return COMPANIA_LABELS.niba

  if (
    blob.includes("uso") &&
    (blob.includes("<=15") ||
      blob.includes("<= 15") ||
      /\b15\s*kw\b/.test(blob) ||
      blob.includes("2.0td <=15"))
  ) {
    return COMPANIA_LABELS.naturgy
  }

  if (blob.includes("naturgy")) return COMPANIA_LABELS.naturgy
  if (blob.includes("repsol")) return COMPANIA_LABELS.repsol
  if (blob.includes("gana")) return COMPANIA_LABELS.ganaenergia
  if (
    blob.includes("precio de mercado") ||
    blob.includes("residencial precio de mercado") ||
    (blob.includes("residencial") && blob.includes("mercado") && !blob.includes("naturgy"))
  ) {
    return COMPANIA_LABELS.ganaenergia
  }
  if (blob.includes("octopus")) return COMPANIA_LABELS.octopus
  if (blob.includes("iberdrola")) return COMPANIA_LABELS.iberdrola
  if (blob.includes("endesa")) return COMPANIA_LABELS.endesa
  if (blob.includes("total")) return COMPANIA_LABELS.totalenergies

  return null
}

const PLACEHOLDER_COMPANIAS = new Set([
  "",
  "—",
  "-",
  "sin compania",
  "sin compañía",
  "at",
])

function isPlaceholderCompania(compania?: string | null): boolean {
  if (!compania?.trim()) return true
  const norm = compania
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
  return PLACEHOLDER_COMPANIAS.has(norm)
}

function resolveFromTarifaCatalog(input: {
  tarifa?: string | null
  oferta?: string | null
  marcoRows?: readonly MarcoRetributivoRow[] | null
}): string | null {
  const inferred = inferCompaniaFromTarifaOffer(input.tarifa, input.oferta)
  if (inferred) return inferred

  const rows = input.marcoRows ?? getMarcoRetributivoCacheSnapshot()
  return (
    resolveCompaniaFromMarcoTarifa(input.tarifa, rows) ??
    resolveCompaniaFromMarcoTarifa(input.oferta, rows)
  )
}

export function resolveContractCompaniaForDisplay(input: {
  compania?: string | null
  tarifa?: string | null
  oferta?: string | null
  marcoRows?: readonly MarcoRetributivoRow[] | null
}): string {
  const inferred = inferCompaniaFromTarifaOffer(input.tarifa, input.oferta)
  if (inferred) return inferred

  const raw = input.compania?.trim()
  const storedKey = raw ? resolveCompaniaLogoKey(raw) : null
  if (storedKey && raw && !isPlaceholderCompania(raw)) {
    return COMPANIA_LABELS[storedKey]
  }

  const fromMarco = resolveFromTarifaCatalog({
    ...input,
    compania: null,
  })
  if (fromMarco) return fromMarco

  if (raw && !isPlaceholderCompania(raw)) {
    if (storedKey) return COMPANIA_LABELS[storedKey]
    return formatCompaniaLabel(raw)
  }

  return raw ?? "—"
}

export function resolveContractCompaniaForPersist(input: {
  compania?: string | null
  tarifa?: string | null
  oferta?: string | null
}): string {
  return resolveContractCompaniaForDisplay(input)
}
