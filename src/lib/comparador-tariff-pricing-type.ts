import { inferTipoPrecioFromMarcoText } from "./marco-comparador-meta"

export type ComparadorTariffPricingType = "fijo" | "indexado"

export interface ComparadorTariffPricingInput {
  name: string
  isIndexed: boolean
}

export function resolveComparadorTariffPricingType(
  tariff: ComparadorTariffPricingInput
): ComparadorTariffPricingType {
  if (tariff.isIndexed) return "indexado"
  return inferTipoPrecioFromMarcoText(tariff.name, "")
}

export function isComparadorTariffIndexada(tariff: ComparadorTariffPricingInput): boolean {
  return resolveComparadorTariffPricingType(tariff) === "indexado"
}
