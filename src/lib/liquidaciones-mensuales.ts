import type { Settlement } from "../types/settlement"
import type { Contract } from "../types/contract"
import { isContractActivado } from "./contract-estado"
import { estimateMarcoCommissionEur } from "./marco-commission"
import {
  resolveMarcoCatalogEntry,
  type MarcoRetributivoRow,
} from "./supabase/marco-retributivo"

export interface ErpComercial {
  id: string
  fullName: string
  commissionPercentage: number
  activo: boolean
}

export interface LiquidacionContratoDesglose {
  contractId: string
  clientName: string
  cups: string
  tipo: Contract["tipo"]
  fechaActivacion: string
  comisionBruta: number
  comisionComercial: number
  detalle: string
}

export interface LiquidacionMensualComercial {
  comercialId: string
  comercialName: string
  totalBruto: number
  totalComisionado: number
  desglosePorContrato: LiquidacionContratoDesglose[]
}

/** Alias usado por autofactura y liquidaciones mensuales. */
export type LiquidacionMensual = LiquidacionMensualComercial

const defaultFormatCurrency = (value: number) =>
  new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)

export function getContractActivationDate(contract: Contract): string | null {
  if (!isContractActivado(contract.estado)) return null
  return contract.estadoEfectivoDesde ?? contract.createdAt ?? null
}

export function isDateInMonthYear(dateIso: string, mes: number, año: number): boolean {
  const [yearStr, monthStr] = dateIso.split("-")
  const year = Number(yearStr)
  const month = Number(monthStr)
  if (!Number.isFinite(year) || !Number.isFinite(month)) return false
  return year === año && month === mes
}

function findComercial(
  comerciales: ErpComercial[],
  comercialId: string
): ErpComercial | undefined {
  return comerciales.find((comercial) => comercial.id === comercialId)
}

function estimateContractCommissions(
  contract: Contract,
  commissionPercentage: number,
  formatCurrency: (value: number) => string,
  marcoRows: MarcoRetributivoRow[]
): { comisionBruta: number; comisionComercial: number; detalle: string } | null {
  const entry = resolveMarcoCatalogEntry(
    contract.marcoEntryId,
    contract.compania,
    contract.tarifa,
    contract.tipo,
    marcoRows
  )
  if (!entry) return null

  const consumo = contract.consumoAnualManual ?? contract.consumoAnual ?? 0
  if (!consumo || consumo <= 0) return null

  const bruta = estimateMarcoCommissionEur(entry, 100, consumo, formatCurrency)
  const comercial = estimateMarcoCommissionEur(
    entry,
    commissionPercentage,
    consumo,
    formatCurrency
  )

  return {
    comisionBruta: bruta.amountEur,
    comisionComercial: comercial.amountEur,
    detalle: comercial.detail,
  }
}

export function calcularLiquidacionMensualPorComercial(
  contracts: Contract[],
  comercialId: string,
  mes: number,
  año: number,
  comerciales: ErpComercial[],
  formatCurrency: (value: number) => string = defaultFormatCurrency,
  marcoRows: MarcoRetributivoRow[] = []
): LiquidacionMensualComercial {
  const comercial = findComercial(comerciales, comercialId)
  const commissionPercentage = comercial?.commissionPercentage ?? 70
  const comercialName = comercial?.fullName ?? "Comercial"

  const desglosePorContrato: LiquidacionContratoDesglose[] = []

  for (const contract of contracts) {
    if (contract.comercialId !== comercialId) continue

    const fechaActivacion = getContractActivationDate(contract)
    if (!fechaActivacion || !isDateInMonthYear(fechaActivacion, mes, año)) continue

    const comisiones = estimateContractCommissions(
      contract,
      commissionPercentage,
      formatCurrency,
      marcoRows
    )
    if (!comisiones || comisiones.comisionComercial <= 0) continue

    desglosePorContrato.push({
      contractId: contract.id,
      clientName: contract.clientName,
      cups: contract.cups,
      tipo: contract.tipo,
      fechaActivacion,
      comisionBruta: comisiones.comisionBruta,
      comisionComercial: comisiones.comisionComercial,
      detalle: comisiones.detalle,
    })
  }

  desglosePorContrato.sort((a, b) =>
    a.fechaActivacion.localeCompare(b.fechaActivacion, "es")
  )

  const totalBruto = desglosePorContrato.reduce(
    (sum, line) => sum + line.comisionBruta,
    0
  )
  const totalComisionado = desglosePorContrato.reduce(
    (sum, line) => sum + line.comisionComercial,
    0
  )

  return {
    comercialId,
    comercialName,
    totalBruto: Math.round(totalBruto * 100) / 100,
    totalComisionado: Math.round(totalComisionado * 100) / 100,
    desglosePorContrato,
  }
}

export function calcularLiquidacionesMensualesTodoElEquipo(
  contracts: Contract[],
  comerciales: ErpComercial[],
  mes: number,
  año: number,
  formatCurrency: (value: number) => string = defaultFormatCurrency,
  marcoRows: MarcoRetributivoRow[] = []
): LiquidacionMensualComercial[] {
  return comerciales
    .filter((comercial) => comercial.activo)
    .map((comercial) =>
      calcularLiquidacionMensualPorComercial(
        contracts,
        comercial.id,
        mes,
        año,
        comerciales,
        formatCurrency,
        marcoRows
      )
    )
    .filter((liquidacion) => liquidacion.desglosePorContrato.length > 0)
}

export function sumLiquidacionesMensualesComisionado(
  liquidaciones: LiquidacionMensualComercial[]
): number {
  const total = liquidaciones.reduce(
    (sum, liquidacion) => sum + liquidacion.totalComisionado,
    0
  )
  return Math.round(total * 100) / 100
}

export function monthlySettlementMarker(mes: number, año: number): string {
  return `Liquidación mensual ${String(mes).padStart(2, "0")}/${año}`
}

export function buildMonthlySettlementFromDesglose(
  line: LiquidacionContratoDesglose,
  comercial: ErpComercial,
  mes: number,
  año: number
): Settlement {
  const marker = monthlySettlementMarker(mes, año)
  return {
    id: `liq-mes-${año}${String(mes).padStart(2, "0")}-${line.contractId}`,
    contractId: line.contractId,
    comercialId: comercial.id,
    comercialName: comercial.fullName,
    montoInterno: line.comisionBruta,
    montoExterno: line.comisionComercial,
    estado: "pendiente",
    tipo: line.tipo,
    descripcion: `${marker} — ${line.clientName} (CUPS: ${line.cups})`,
    createdAt: line.fechaActivacion,
  }
}

export function erpComercialFromProfile(profile: {
  id: string
  fullName: string
  commissionPercentage?: number
  status?: string
}): ErpComercial {
  return {
    id: profile.id,
    fullName: profile.fullName,
    commissionPercentage: profile.commissionPercentage ?? 70,
    activo: profile.status !== "suspendido",
  }
}
