import { roundComparadorMoney } from "./comparador-billing"
import {
  calcBaseImponible,
  calcIva,
  sumEnergia,
  sumPotencia,
} from "./pdf/estudio-ahorro-calc"
import type { OtroConceptoRow, TarifaEstudioAhorro } from "./pdf/estudio-ahorro-types"

/** IVA general aplicado al total de la factura comparativa. */
export const COMPARADOR_IVA_PCT = 21

/** Impuesto especial sobre la electricidad (sobre término de energía). */
export const COMPARADOR_IEE_PCT = 5.1126963

export function calcComparadorIeeMensual(tarifa: TarifaEstudioAhorro): number {
  const energiaNeta = sumEnergia(tarifa)
  if (energiaNeta <= 0) return 0
  return energiaNeta * (COMPARADOR_IEE_PCT / 100)
}

function tarifaSinLineasDeImpuesto(tarifa: TarifaEstudioAhorro): TarifaEstudioAhorro {
  return {
    ...tarifa,
    otrosConceptos: tarifa.otrosConceptos.filter(
      (row) => row.concepto !== "IEE" && row.concepto !== "IVA"
    ),
  }
}

export function calcComparadorIvaMensual(tarifa: TarifaEstudioAhorro, iee: number): number {
  const base = calcBaseImponible(tarifaSinLineasDeImpuesto(tarifa)) + iee
  return calcIva(base, COMPARADOR_IVA_PCT)
}

export function calcComparadorTotalConImpuestos(tarifa: TarifaEstudioAhorro): number {
  const baseTarifa = tarifaSinLineasDeImpuesto(tarifa)
  const iee = calcComparadorIeeMensual(baseTarifa)
  const iva = calcComparadorIvaMensual(baseTarifa, iee)
  return calcBaseImponible(baseTarifa) + iee + iva
}

export function appendIeeIvaOtrosConceptos(
  tarifa: TarifaEstudioAhorro
): { tarifa: TarifaEstudioAhorro; iee: number; iva: number } {
  const baseTarifa = tarifaSinLineasDeImpuesto(tarifa)
  const ieeRaw = calcComparadorIeeMensual(baseTarifa)
  const ivaRaw = calcComparadorIvaMensual(baseTarifa, ieeRaw)
  const iee = roundComparadorMoney(ieeRaw)
  const iva = roundComparadorMoney(ivaRaw)
  const otros = [...baseTarifa.otrosConceptos]

  if (iee > 0) otros.push({ concepto: "IEE", precio: iee, total: iee })
  if (iva > 0) otros.push({ concepto: "IVA", precio: iva, total: iva })

  return {
    iee,
    iva,
    tarifa: {
      ...tarifa,
      otrosConceptos: otros,
      ivaPct: COMPARADOR_IVA_PCT,
      totalFactura: roundComparadorMoney(calcBaseImponible(baseTarifa) + ieeRaw + ivaRaw),
    },
  }
}

export function comparadorIeeIvaFromBase(
  baseImponibleMensual: number,
  energiaNetaMensual: number
): { iee: number; iva: number; total: number } {
  const iee =
    energiaNetaMensual > 0 ? energiaNetaMensual * (COMPARADOR_IEE_PCT / 100) : 0
  const baseIva = baseImponibleMensual + iee
  const iva = baseIva * (COMPARADOR_IVA_PCT / 100)
  return {
    iee,
    iva,
    total: baseImponibleMensual + iee + iva,
  }
}

export function monthlyTotalWithTaxesFromBaseImponible(
  baseImponibleMensual: number,
  energiaNetaMensual: number
): number {
  return comparadorIeeIvaFromBase(baseImponibleMensual, energiaNetaMensual).total
}

export function sumOtrosSinImpuestos(rows: OtroConceptoRow[]): number {
  return rows
    .filter((row) => row.concepto !== "IEE" && row.concepto !== "IVA")
    .reduce((acc, row) => acc + row.total, 0)
}
