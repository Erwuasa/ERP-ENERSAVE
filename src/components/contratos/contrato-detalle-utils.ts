import type { Contract } from "@/types/contract"
import {
  parsePotenciaPeriodsKw,
  splitClientNameToParts,
} from "@/lib/contract-registration"
import { normalizeContractEstado } from "@/lib/contract-estado"
import { getContractActivationDate } from "@/lib/contract-segment-rules"
import { getRetroMonths } from "@/lib/retro-period"
import { normalizePeaje } from "@/lib/tarifa-cost-calculator"
import { TIPO_CLIENTE_OPTIONS } from "@/pages/erp/contratos/components/wizard/wizard-ui"
import {
  profileRoleLabel,
  type ProfileOption,
} from "@/pages/erp/contratos/components/contratos-panel-utils"

const SPANISH_BANK_ENTITIES: Record<string, string> = {
  "0182": "BBVA",
  "2100": "CaixaBank",
  "0049": "Santander",
  "0081": "Sabadell",
  "2038": "Bankia",
  "1465": "ING",
  "0128": "Bankinter",
  "0239": "EVO Banco",
}

export function formatContratoCanal(contract: Contract): string | undefined {
  if (contract.source === "at") return "Alta Tensión"
  if (contract.source === "manual") return "ENERSAVE"
  return undefined
}

export function formatContratoPeaje(contract: Contract): string | undefined {
  const raw = contract.atAccessTariff?.trim() || contract.atr?.trim()
  if (!raw) return undefined
  return normalizePeaje(raw)
}

export function formatTipoClienteLabel(tipo?: string): string | undefined {
  if (!tipo?.trim()) return undefined
  const match = TIPO_CLIENTE_OPTIONS.find((opt) => opt.value === tipo)
  return match?.label ?? tipo.trim()
}

export function resolveClientNameParts(contract: Contract): {
  nombre: string
  apellidos: string
  esEmpresa: boolean
} {
  const tipo = (contract.tipoCliente ?? "").trim().toLowerCase()
  const esEmpresa =
    tipo === "pyme" || tipo === "empresa" || tipo === "comunidad_vecinos"

  if (esEmpresa) {
    return {
      nombre: contract.clientName,
      apellidos: "",
      esEmpresa: true,
    }
  }

  const parts = splitClientNameToParts(contract.clientName)
  return {
    nombre: parts.clientNombre,
    apellidos: parts.clientApellidos,
    esEmpresa: false,
  }
}

export function resolvePotenciaPeriods(contract: Contract): { periodo: number; kw: number }[] {
  const fromAt = Object.entries(contract.atPowers ?? {})
    .map(([key, kw]) => {
      const periodo = Number(/(\d+)/.exec(key)?.[1])
      return Number.isFinite(periodo) && periodo > 0 ? { periodo, kw } : null
    })
    .filter((row): row is { periodo: number; kw: number } => row != null)
  if (fromAt.length > 0) return fromAt.sort((a, b) => a.periodo - b.periodo)
  return parsePotenciaPeriodsKw(contract.potenciaContratada)
}

export function formatPotenciaPeriodLabel(periodo: number, kw: number): string {
  return `${kw.toLocaleString("es-ES", { maximumFractionDigits: 3 })} kW`
}

export function extractBancoFromIban(iban?: string): string {
  const clean = (iban ?? "").replace(/\s/g, "").toUpperCase()
  if (clean.length < 8) return "—"
  const entity = clean.slice(4, 8)
  const bankName = SPANISH_BANK_ENTITIES[entity]
  return bankName ? `${bankName} · ${entity}` : `Entidad ${entity}`
}

export function extractBankNameFromIban(iban?: string): string {
  const label = extractBancoFromIban(iban)
  if (label === "—") return "—"
  return label.split(" · ")[0] ?? label
}

export function formatPotenciasInline(contract: Contract): string | undefined {
  const periods = resolvePotenciaPeriods(contract)
  if (periods.length === 0) return undefined
  return periods.map((row) => `p${row.periodo}: ${row.kw}`).join(" · ")
}

export function formatSuministroAccion(contract: Contract): string | undefined {
  if (contract.isNewSupply) return "Alta nueva"
  if (contract.isOwnershipChange) return "Cambio de titularidad"
  if (contract.isNewSupply === false && contract.isOwnershipChange === false) {
    return "Cambio tarifa"
  }
  return undefined
}

function isPlaceholderComercialName(name?: string | null): boolean {
  const normalized = (name ?? "").trim().toUpperCase()
  return !normalized || normalized === "AT" || normalized === "ALTA TENSIÓN"
}

/** Nombre del comercial/jefe/superadmin asignado al contrato (nunca el canal AT). */
export function resolveContratoComercialDisplayName(
  contract: Contract,
  profiles: ProfileOption[] = []
): string {
  const profile = profiles.find((p) => p.id === contract.comercialId)
  if (profile?.fullName?.trim()) return profile.fullName.trim()

  const candidates = [contract.nombreComercial, contract.comercialName, contract.jefeEquipo]
  for (const candidate of candidates) {
    if (candidate?.trim() && !isPlaceholderComercialName(candidate)) return candidate.trim()
  }

  if (profile?.fullName?.trim()) return profile.fullName.trim()
  return "—"
}

export function resolveContratoComercialRoleLabel(
  contract: Contract,
  profiles: ProfileOption[] = []
): string | null {
  const profile = profiles.find((p) => p.id === contract.comercialId)
  if (!profile?.role) return null
  return profileRoleLabel(profile.role)
}

export function formatContratoDetalleFecha(
  iso?: string | null,
  options?: { withTime?: boolean }
): string {
  if (!iso?.trim()) return "—"

  const raw = iso.trim()
  const hasTime = raw.includes("T") || /\d{2}:\d{2}/.test(raw)
  const parsed = new Date(hasTime ? raw : `${raw.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return "—"

  const d = String(parsed.getDate()).padStart(2, "0")
  const m = String(parsed.getMonth() + 1).padStart(2, "0")
  const y = parsed.getFullYear()

  if (options?.withTime && hasTime) {
    const h = String(parsed.getHours()).padStart(2, "0")
    const min = String(parsed.getMinutes()).padStart(2, "0")
    return `${d}-${m}-${y} ${h}:${min}`
  }

  return `${d}-${m}-${y}`
}

function addMonthsToIsoDate(isoDate: string, months: number): string {
  const parsed = new Date(`${isoDate.slice(0, 10)}T12:00:00`)
  if (Number.isNaN(parsed.getTime())) return ""
  parsed.setMonth(parsed.getMonth() + months)
  return parsed.toISOString().slice(0, 10)
}

function resolveContratoFirmaDate(contract: Contract): string | null {
  if (contract.signedAt) return contract.signedAt
  const signedEvent = contract.atEvents?.find((event) => {
    const blob = `${event.title ?? ""} ${event.type ?? ""} ${event.toStatus ?? ""}`.toLowerCase()
    return blob.includes("firm") || blob.includes("sign")
  })
  return signedEvent?.createdAt ?? null
}

function resolveFinClawbackDate(contract: Contract): string | null {
  const activation = getContractActivationDate(contract)
  if (!activation) return null
  const { meses } = getRetroMonths(contract.compania)
  return addMonthsToIsoDate(activation, meses)
}

export interface ContratoDetalleFechas {
  creacionSolicitud: string
  ultimaModificacion: string
  firma: string
  activacion: string
  finClawback: string
  fechaBaja: string
}

export function resolveContratoDetalleFechas(contract: Contract): ContratoDetalleFechas {
  const creacionRaw = contract.createdAt
  const updatedRaw = contract.updatedAt
  const firmaRaw = resolveContratoFirmaDate(contract)
  const activacionRaw = getContractActivationDate(contract)
  const finClawbackRaw = resolveFinClawbackDate(contract)
  const bajaRaw = contract.fechaBaja

  return {
    creacionSolicitud: formatContratoDetalleFecha(creacionRaw, {
      withTime: Boolean(creacionRaw?.includes("T") || /\d{2}:\d{2}/.test(creacionRaw ?? "")),
    }),
    ultimaModificacion: formatContratoDetalleFecha(updatedRaw, { withTime: true }),
    firma: formatContratoDetalleFecha(firmaRaw),
    activacion: formatContratoDetalleFecha(activacionRaw),
    finClawback: formatContratoDetalleFecha(finClawbackRaw),
    fechaBaja: formatContratoDetalleFecha(bajaRaw),
  }
}

export function formatConsumoAnualKwh(contract: Contract): string | undefined {
  const value = contract.consumoAnualManual ?? contract.consumoAnual
  if (value == null || value <= 0) return undefined
  return `${value.toLocaleString("es-ES")} kWh`
}

export function contractHasOpenIncidencia(contract: Contract): boolean {
  return normalizeContractEstado(contract.estado) === "INCIDENCIA ADMINISTRATIVA"
}

export function formatIncidenciaAbiertaHace(contract: Contract): string {
  const reference = contract.estadoEfectivoDesde ?? contract.createdAt
  if (!reference) return "Abierta recientemente"

  const start = new Date(reference.includes("T") ? reference : `${reference}T12:00:00`)
  if (Number.isNaN(start.getTime())) return "Abierta recientemente"

  const diffMs = Date.now() - start.getTime()
  const days = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)))

  if (days === 0) return "Abierta hoy"
  if (days === 1) return "Abierta hace 1 día"
  return `Abierta hace ${days} días`
}
