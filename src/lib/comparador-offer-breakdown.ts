import {
  activeConsumoPeriodSlots,
  activePotenciaPeriodSlots,
  getComparadorPeriodLabel,
  type ComparadorPeriodSlot,
} from "./comparador-periods"
import {
  COMPARADOR_DIAS_FACTURACION_MENSUAL,
  energiaPeriodCostMensual,
  potenciaPeriodCostMensual,
} from "./comparador-billing"
import type { ComparadorPeriodValues } from "./erp/comparador-rates"
import type { TariffPreciosPorPeriodo, TariffPeriodKey } from "./tarifa-cost-calculator"

export interface ComparadorOfferBreakdownRow {
  id: string
  kind: "potencia" | "energia" | "alquiler" | "bono" | "extras" | "total"
  labelLeft: string
  amountOffer: number
  amountCurrent: number | null
  savings: number | null
}

export type ComparadorDesgloseRowKind =
  | "energia"
  | "potencia"
  | "otros_no_comunes"
  | "otros_comunes"
  | "iee"
  | "alquiler"
  | "base"
  | "iva"
  | "total"

export interface ComparadorDesgloseTableRow {
  id: string
  kind: ComparadorDesgloseRowKind
  termLabel: string
  unit?: "kWh" | "kW"
  /** Precio unitario (€/kWh o €/kW·día); null en conceptos fijos. */
  rateEur: number | null
  costEur: number
}

function slotToPeriodKey(slot: ComparadorPeriodSlot): TariffPeriodKey {
  return `P${slot.slice(1)}` as TariffPeriodKey
}

function formatRate(value: number, decimals = 4): string {
  return value.toLocaleString("es-ES", {
    useGrouping: false,
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  })
}

export interface BuildComparadorOfferBreakdownInput {
  peaje: string
  potencias: ComparadorPeriodValues
  consumos: ComparadorPeriodValues
  preciosPotenciaActual: ComparadorPeriodValues
  preciosEnergiaActual: ComparadorPeriodValues
  preciosOferta: TariffPreciosPorPeriodo
  alquilerMensual: number
  bonoSocialMensual?: number
  energiaReactivaMensual?: number
  otrosCostesSvaMensual?: number
  totalMensualOferta: number
  totalMensualActual: number | null
  ieeMensualOferta?: number
  ivaMensualOferta?: number
  ieeMensualActual?: number
  ivaMensualActual?: number
  baseImponibleMensualOferta?: number
  baseImponibleMensualActual?: number
  diasFacturacion?: number
}

export function buildComparadorOfferBreakdown(
  input: BuildComparadorOfferBreakdownInput
): ComparadorOfferBreakdownRow[] {
  const rows: ComparadorOfferBreakdownRow[] = []
  const potSlots = activePotenciaPeriodSlots(input.peaje)
  const conSlots = activeConsumoPeriodSlots(input.peaje)
  const preciosOferta = input.preciosOferta ?? {}
  const dias = input.diasFacturacion ?? COMPARADOR_DIAS_FACTURACION_MENSUAL

  for (const slot of potSlots) {
    const key = slotToPeriodKey(slot)
    const periodLabel = getComparadorPeriodLabel(slot)
    const kw = input.potencias[slot] ?? 0
    const offerPotRate = preciosOferta[key]?.powerPriceKwDay ?? 0
    const currentPotRate = input.preciosPotenciaActual[slot] ?? 0

    if (kw <= 0 || offerPotRate <= 0) continue

    const amountOffer = potenciaPeriodCostMensual(kw, offerPotRate, dias)
    const amountCurrent =
      currentPotRate > 0 ? potenciaPeriodCostMensual(kw, currentPotRate, dias) : null

    rows.push({
      id: `pot-${slot}`,
      kind: "potencia",
      labelLeft: `${periodLabel} · ${formatRate(kw, 2)} kW · ${dias} días × ${formatRate(offerPotRate)} €/kW·día`,
      amountOffer,
      amountCurrent,
      savings:
        amountCurrent != null ? amountCurrent - amountOffer : null,
    })
  }

  for (const slot of conSlots) {
    const key = slotToPeriodKey(slot)
    const periodLabel = getComparadorPeriodLabel(slot)
    const kwhMes = input.consumos[slot] ?? 0
    const offerEnergyRate = preciosOferta[key]?.energyPriceKwh ?? 0
    const currentEnergyRate = input.preciosEnergiaActual[slot] ?? 0

    if (kwhMes <= 0 || offerEnergyRate <= 0) continue

    const amountOffer = energiaPeriodCostMensual(kwhMes, offerEnergyRate)
    const amountCurrent =
      currentEnergyRate > 0 ? energiaPeriodCostMensual(kwhMes, currentEnergyRate) : null

    rows.push({
      id: `ene-${slot}`,
      kind: "energia",
      labelLeft: `${periodLabel} · ${formatRate(kwhMes, 0)} kWh/mes · ${formatRate(offerEnergyRate, 4)} €/kWh`,
      amountOffer,
      amountCurrent,
      savings:
        amountCurrent != null ? amountCurrent - amountOffer : null,
    })
  }

  if (input.alquilerMensual > 0) {
    rows.push({
      id: "alquiler",
      kind: "alquiler",
      labelLeft: "Alquiler contador / equipos",
      amountOffer: input.alquilerMensual,
      amountCurrent: input.alquilerMensual,
      savings: 0,
    })
  }

  const bonoSocial = input.bonoSocialMensual ?? 0
  if (bonoSocial > 0) {
    rows.push({
      id: "bono-social",
      kind: "bono",
      labelLeft: "Bono social",
      amountOffer: bonoSocial,
      amountCurrent: bonoSocial,
      savings: 0,
    })
  }

  const reactiva = input.energiaReactivaMensual ?? 0
  if (reactiva > 0) {
    rows.push({
      id: "reactiva",
      kind: "extras",
      labelLeft: "Energía reactiva",
      amountOffer: reactiva,
      amountCurrent: reactiva,
      savings: 0,
    })
  }

  const otrosSva = input.otrosCostesSvaMensual ?? 0
  if (otrosSva > 0) {
    rows.push({
      id: "otros-sva",
      kind: "extras",
      labelLeft: "Otros costes / SVA",
      amountOffer: otrosSva,
      amountCurrent: otrosSva,
      savings: 0,
    })
  }

  const baseOferta = input.baseImponibleMensualOferta ?? 0
  if (baseOferta > 0) {
    rows.push({
      id: "base-imponible",
      kind: "extras",
      labelLeft: "Subtotal base imponible",
      amountOffer: baseOferta,
      amountCurrent: input.baseImponibleMensualActual ?? null,
      savings:
        input.baseImponibleMensualActual != null
          ? input.baseImponibleMensualActual - baseOferta
          : null,
    })
  }

  const ieeOferta = input.ieeMensualOferta ?? 0
  if (ieeOferta > 0) {
    rows.push({
      id: "iee-oferta",
      kind: "extras",
      labelLeft: "Impuesto eléctrico (IEE)",
      amountOffer: ieeOferta,
      amountCurrent: input.ieeMensualActual ?? null,
      savings:
        input.ieeMensualActual != null ? input.ieeMensualActual - ieeOferta : null,
    })
  }

  const ivaOferta = input.ivaMensualOferta ?? 0
  if (ivaOferta > 0) {
    rows.push({
      id: "iva-oferta",
      kind: "extras",
      labelLeft: "IVA",
      amountOffer: ivaOferta,
      amountCurrent: input.ivaMensualActual ?? null,
      savings:
        input.ivaMensualActual != null ? input.ivaMensualActual - ivaOferta : null,
    })
  }

  rows.push({
    id: "total",
    kind: "total",
    labelLeft: "Total mensual (IEE e IVA incl.)",
    amountOffer: input.totalMensualOferta,
    amountCurrent: input.totalMensualActual,
    savings:
      input.totalMensualActual != null
        ? input.totalMensualActual - input.totalMensualOferta
        : null,
  })

  return rows
}

function formatDesgloseUnitRate(value: number | null, decimals = 4): string {
  if (value == null || value <= 0) return "—"
  return `${formatRate(value, decimals)} €`
}

function formatDesgloseCost(value: number, bold = false): string {
  if (value <= 0) return "— €"
  const formatted = value.toLocaleString("es-ES", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 3,
  })
  return bold ? `${formatted} €` : `${formatted} €`
}

/** Tabla de desglose mensual (estilo factura: energía, potencia, impuestos). */
export function buildComparadorDesgloseTable(
  input: BuildComparadorOfferBreakdownInput
): ComparadorDesgloseTableRow[] {
  const rows: ComparadorDesgloseTableRow[] = []
  const conSlots = activeConsumoPeriodSlots(input.peaje)
  const potSlots = activePotenciaPeriodSlots(input.peaje)
  const preciosOferta = input.preciosOferta ?? {}
  const dias = input.diasFacturacion ?? COMPARADOR_DIAS_FACTURACION_MENSUAL

  for (const slot of conSlots) {
    const key = slotToPeriodKey(slot)
    const kwhMes = input.consumos[slot] ?? 0
    const rate = preciosOferta[key]?.energyPriceKwh ?? 0
    const cost =
      kwhMes > 0 && rate > 0 ? energiaPeriodCostMensual(kwhMes, rate) : 0
    rows.push({
      id: `desglose-ene-${slot}`,
      kind: "energia",
      termLabel: `ENERGÍA ${getComparadorPeriodLabel(slot)}`,
      unit: "kWh",
      rateEur: rate > 0 ? rate : null,
      costEur: cost,
    })
  }

  for (const slot of potSlots) {
    const key = slotToPeriodKey(slot)
    const kw = input.potencias[slot] ?? 0
    const rate = preciosOferta[key]?.powerPriceKwDay ?? 0
    const cost = kw > 0 && rate > 0 ? potenciaPeriodCostMensual(kw, rate, dias) : 0
    rows.push({
      id: `desglose-pot-${slot}`,
      kind: "potencia",
      termLabel: `POTENCIA ${getComparadorPeriodLabel(slot)}`,
      unit: "kW",
      rateEur: rate > 0 ? rate : null,
      costEur: cost,
    })
  }

  const otrosComunesConIe =
    (input.energiaReactivaMensual ?? 0) +
    (input.bonoSocialMensual ?? 0) +
    input.alquilerMensual +
    (input.ieeMensualOferta ?? 0)
  if (otrosComunesConIe > 0) {
    rows.push({
      id: "desglose-otros-comunes",
      kind: "otros_comunes",
      termLabel: "OTROS COSTES COMUNES CON I.E.",
      rateEur: null,
      costEur: otrosComunesConIe,
    })
  }

  const base = input.baseImponibleMensualOferta ?? 0
  if (base > 0) {
    rows.push({
      id: "desglose-base",
      kind: "base",
      termLabel: "BASE IMPONIBLE",
      rateEur: null,
      costEur: base,
    })
  }

  const iva = input.ivaMensualOferta ?? 0
  if (iva > 0) {
    rows.push({
      id: "desglose-iva",
      kind: "iva",
      termLabel: "IVA",
      rateEur: null,
      costEur: iva,
    })
  }

  rows.push({
    id: "desglose-total",
    kind: "total",
    termLabel: "TOTAL CON IVA",
    rateEur: null,
    costEur: input.totalMensualOferta,
  })

  return rows
}

export { formatDesgloseUnitRate, formatDesgloseCost }

export function breakdownAmountTone(
  savings: number | null
): "positive" | "neutral" | "negative" {
  if (savings == null || savings === 0) return "neutral"
  if (savings > 0) return "positive"
  return "negative"
}
