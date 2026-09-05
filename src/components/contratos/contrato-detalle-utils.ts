import type { Contract } from "@/types/contract"
import {
  contractToNewContractForm,
  parsePotenciaPeriodsKw,
  splitClientNameToParts,
  type TipoClienteContrato,
} from "@/lib/contract-registration"
import { normalizeContractEstado } from "@/lib/contract-estado"
import { normalizePeaje } from "@/lib/tarifa-cost-calculator"
import { TIPO_CLIENTE_OPTIONS } from "@/pages/erp/contratos/components/wizard/wizard-ui"

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
