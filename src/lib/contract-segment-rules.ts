export type TipoClienteSegment = "residencial" | "pyme" | "autonomo"

export interface ContractSegmentContext {
  tipoCliente?: string
  compania: string
  clientName?: string
  nif?: string
}

export type RenewalEstado = "Renovacion proxima" | "Al día" | "No aplica"

export interface RenewalSchedule {
  fechaRenovacion?: string
  diasRenovacion?: number
  estadoRenovacion: RenewalEstado
}

export const NIBA_RENOVACION_COMISION_PCT = 80
export const RENOVACION_PROXIMA_DIAS = 90

export function isNibaCompania(compania: string): boolean {
  return compania.toLowerCase().includes("niba")
}

/** Normaliza tipo de cliente (pyme incluye empresas jurídicas). */
export function normalizeTipoClienteSegment(
  context: ContractSegmentContext
): TipoClienteSegment {
  const raw = (context.tipoCliente ?? "").toLowerCase().trim()
  if (raw === "pyme" || raw === "empresa") return "pyme"
  if (raw === "autonomo" || raw === "autónomo") return "autonomo"
  if (raw === "residencial" || raw === "particular") return "residencial"

  if (context.nif && /^[A-HJ-NP-SUVW]/i.test(context.nif.trim())) return "pyme"
  if (
    context.clientName &&
    /\b(S\.?L\.?U?\.?|S\.?A\.?|COOPERATIVA|SCP|CB)\b/i.test(context.clientName)
  ) {
    return "pyme"
  }

  return "residencial"
}

/** Renovación anual: PYME, autónomo y empresas; residencial solo NIBA. */
export function aplicaRenovacionAnual(context: ContractSegmentContext): boolean {
  const segment = normalizeTipoClienteSegment(context)
  if (segment === "pyme" || segment === "autonomo") return true
  if (segment === "residencial" && isNibaCompania(context.compania)) return true
  return false
}

/** Penalización 5%: solo PYME/empresa y autónomo. */
export function aplicaPenalizacionCincoPorCiento(context: ContractSegmentContext): boolean {
  const segment = normalizeTipoClienteSegment(context)
  return segment === "pyme" || segment === "autonomo"
}

export function getNibaRenovacionComisionPct(context: ContractSegmentContext): number | null {
  if (!isNibaCompania(context.compania)) return null
  if (normalizeTipoClienteSegment(context) !== "residencial") return null
  return NIBA_RENOVACION_COMISION_PCT
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

function formatIsoDate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Próxima renovación anual desde la fecha de activación. */
export function computeRenewalSchedule(
  activationDateIso: string,
  referenceDate = new Date()
): RenewalSchedule {
  const activation = parseIsoDate(activationDateIso)
  const ref = new Date(referenceDate)
  ref.setHours(0, 0, 0, 0)

  let nextRenewal = new Date(activation)
  nextRenewal.setHours(0, 0, 0, 0)

  while (nextRenewal.getTime() <= ref.getTime()) {
    nextRenewal.setFullYear(nextRenewal.getFullYear() + 1)
  }

  const diasRenovacion = Math.max(
    0,
    Math.ceil((nextRenewal.getTime() - ref.getTime()) / (1000 * 60 * 60 * 24))
  )

  return {
    fechaRenovacion: formatIsoDate(nextRenewal),
    diasRenovacion,
    estadoRenovacion:
      diasRenovacion <= RENOVACION_PROXIMA_DIAS ? "Renovacion proxima" : "Al día",
  }
}

export function getRenewalSchedule(
  contract: ContractSegmentContext & {
    createdAt?: string
    fechaRenovacion?: string
    diasRenovacion?: number
    estadoRenovacion?: string
  },
  referenceDate = new Date()
): RenewalSchedule {
  if (!aplicaRenovacionAnual(contract)) {
    return { estadoRenovacion: "No aplica" }
  }

  if (contract.createdAt) {
    return computeRenewalSchedule(contract.createdAt, referenceDate)
  }

  return {
    fechaRenovacion: contract.fechaRenovacion,
    diasRenovacion: contract.diasRenovacion,
    estadoRenovacion:
      contract.estadoRenovacion === "Renovacion proxima" ||
      (contract.diasRenovacion != null && contract.diasRenovacion <= RENOVACION_PROXIMA_DIAS)
        ? "Renovacion proxima"
        : "Al día",
  }
}
