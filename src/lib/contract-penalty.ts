import {
  aplicaPenalizacionCincoPorCiento,
  type ContractSegmentContext,
} from "./contract-segment-rules"

export interface PenaltyInput {
  precioFijoConsumo?: number
  consumoAnual?: number
  diasHastaRenovacion?: number
}

export type PenaltyContractInput = PenaltyInput & ContractSegmentContext

export function calcularPenalizacion(input: PenaltyContractInput): number | null {
  if (!aplicaPenalizacionCincoPorCiento(input)) return null

  const { precioFijoConsumo, consumoAnual, diasHastaRenovacion } = input

  if (
    precioFijoConsumo == null ||
    precioFijoConsumo <= 0 ||
    consumoAnual == null ||
    consumoAnual <= 0 ||
    diasHastaRenovacion == null ||
    diasHastaRenovacion < 0
  ) {
    return null
  }

  const mesesRestantes = (diasHastaRenovacion / 365) * 12
  const fraccion = mesesRestantes / 12

  return precioFijoConsumo * consumoAnual * 0.05 * fraccion
}

export function formatPenalizacionDisplay(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return "—"
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatPenalizacionFormula(
  precioFijoConsumo: number,
  consumoAnual: number,
  diasHastaRenovacion: number
): string {
  const meses = Math.max(0, Math.round((diasHastaRenovacion / 365) * 12))
  return `(${precioFijoConsumo.toFixed(4)} × ${consumoAnual.toLocaleString("es-ES")} × 0,05) × (${meses}/12)`
}
