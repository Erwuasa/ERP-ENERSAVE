import type { SipsResumen } from "@/lib/sips/types"

export interface SipsContractAutofill {
  cnae?: string
  consumoAnual?: number
}

/** CNAE and annual kWh that SIPS can write into a new contract. Empty fields stay untouched. */
export function contractFieldsFromSipsResumen(resumen: Pick<SipsResumen, "cnae" | "consumoAnualKwh">): SipsContractAutofill {
  const patch: SipsContractAutofill = {}
  const cnae = (resumen.cnae ?? "").replace(/\D/g, "").slice(0, 5)
  if (cnae) patch.cnae = cnae
  if (typeof resumen.consumoAnualKwh === "number" && resumen.consumoAnualKwh > 0) {
    patch.consumoAnual = Math.round(resumen.consumoAnualKwh)
  }
  return patch
}
