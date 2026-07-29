import type { MarcoRetributivoEntry } from "../data/marco-retributivo-catalog"
import { formatMarcoComisionUsuario } from "../data/marco-retributivo-catalog"

const DEFAULT_KWH_PRICE = 0.15
const DEFAULT_ANNUAL_BILL_FACTOR = 1

export interface MarcoCommissionEstimate {
  entry: MarcoRetributivoEntry
  label: string
  amountEur: number
  detail: string
}

export interface ComisionBreakdown {
  comisionEmpresa: number
  comisionComercial: number
  detalle: string
}

export function computeComisionBreakdown(
  entry: MarcoRetributivoEntry,
  commissionPercentage: number,
  consumoAnual: number,
  formatCurrency: (val: number) => string
): ComisionBreakdown {
  const empresa = estimateMarcoCommissionEur(entry, 100, consumoAnual, formatCurrency)
  const comercial = estimateMarcoCommissionEur(
    entry,
    commissionPercentage,
    consumoAnual,
    formatCurrency
  )
  return {
    comisionEmpresa: empresa.amountEur,
    comisionComercial: comercial.amountEur,
    detalle: comercial.detail,
  }
}

export function estimateMarcoCommissionEur(
  entry: MarcoRetributivoEntry,
  commissionPercentage: number,
  consumoAnual: number,
  formatCurrency: (val: number) => string
): MarcoCommissionEstimate {
  const label = formatMarcoComisionUsuario(entry, commissionPercentage, formatCurrency)
  const rate = commissionPercentage / 100
  let amountEur = 0
  let detail = ""

  if (entry.comisionTipo === "fija") {
    amountEur = Math.round(entry.comisionBase * rate * 100) / 100
    detail = `Comisión fija por CUPS activado (${entry.comisionBase.toFixed(2)} € base × ${commissionPercentage}%).`
  } else if (entry.comisionUnidad === "porcentaje_consumo") {
    const pct = entry.comisionBase * rate
    amountEur = Math.round(consumoAnual * (pct / 100) * 100) / 100
    detail = `Estimación sobre ${consumoAnual.toLocaleString("es-ES")} kWh/año al ${pct.toFixed(2)}% del consumo.`
  } else if (entry.comisionUnidad === "porcentaje_facturado") {
    const pct = entry.comisionBase * rate
    const annualBill = consumoAnual * DEFAULT_KWH_PRICE * DEFAULT_ANNUAL_BILL_FACTOR
    amountEur = Math.round(annualBill * (pct / 100) * 100) / 100
    detail = `Estimación sobre facturación anual ~${formatCurrency(annualBill)} al ${pct.toFixed(2)}% facturado.`
  } else {
    const pct = entry.comisionBase * rate
    const annualBill = consumoAnual * DEFAULT_KWH_PRICE
    amountEur = Math.round(annualBill * (pct / 100) * 100) / 100
    detail = `Estimación sobre término de energía ~${formatCurrency(annualBill)} al ${pct.toFixed(2)}% del término.`
  }

  return { entry, label, amountEur, detail }
}
