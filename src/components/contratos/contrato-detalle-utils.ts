import type { Contract } from "@/types/contract"
import {
  contractToNewContractForm,
  parsePotenciaPeriodsKw,
  splitClientNameToParts,
  type TipoClienteContrato,
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

export function formatContratoCanal(contract: Contract): string {
  if (contract.source === "at") return "Alta Tensión"
  return "ENERSAVE"
}

export function formatContratoPeaje(contract: Contract): string {
  if (contract.atr?.trim()) return normalizePeaje(contract.atr)
  const tarifa = contract.tarifa.toLowerCase()
  if (tarifa.includes("6.0") || tarifa.includes("6.1")) return "6.0TD"
  if (tarifa.includes("3.0")) return "3.0TD"
  if (tarifa.includes("2.0")) return "2.0TD"
  return "2.0TD"
}

export function formatTipoClienteLabel(tipo?: string): string {
  if (tipo === "pyme" || tipo === "autonomo" || tipo === "comunidad_vecinos") return "PYME"
  if (tipo === "residencial") return "Residencial"
  const match = TIPO_CLIENTE_OPTIONS.find((opt) => opt.value === tipo)
  return match?.label ?? "Residencial"
}

export function resolveTipoCliente(contract: Contract): TipoClienteContrato {
  return contractToNewContractForm(contract).tipoCliente
}

export function resolveClientNameParts(contract: Contract): {
  nombre: string
  apellidos: string
  esEmpresa: boolean
} {
  const form = contractToNewContractForm(contract)
  const esEmpresa =
    form.tipoCliente === "pyme" || form.tipoCliente === "comunidad_vecinos"

  if (esEmpresa) {
    return {
      nombre: form.razonSocial || contract.clientName,
      apellidos: "",
      esEmpresa: true,
    }
  }

  return {
    nombre: form.clientNombre || splitClientNameToParts(contract.clientName).clientNombre,
    apellidos: form.clientApellidos || splitClientNameToParts(contract.clientName).clientApellidos,
    esEmpresa: false,
  }
}

export function resolvePotenciaPeriods(contract: Contract): { periodo: number; kw: number }[] {
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

export function formatPotenciasInline(contract: Contract): string {
  const peaje = formatContratoPeaje(contract)
  const periodCount = peaje.startsWith("2.0") ? 2 : 6
  const periods = resolvePotenciaPeriods(contract)
  const parts: string[] = []

  for (let periodo = 1; periodo <= periodCount; periodo++) {
    const match = periods.find((p) => p.periodo === periodo)
    parts.push(`p${periodo}: ${match ? match.kw : "—"}`)
  }

  return parts.join(" · ")
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

export function formatConsumoAnualKwh(contract: Contract): string {
  const value = contract.consumoAnualManual ?? contract.consumoAnual
  if (value == null || value <= 0) return "—"
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
