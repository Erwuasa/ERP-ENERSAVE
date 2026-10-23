/** Luz o gas de una fila de precios o comisiones de Enertech. El peaje RL manda sobre el nombre. */
export function catalogSupplyType(input: {
  producto?: unknown
  tarifa?: unknown
  campania?: unknown
}): "luz" | "gas" {
  const tarifa = String(input.tarifa ?? "").trim()
  if (/gas/i.test(tarifa) || /^rl/i.test(tarifa)) return "gas"

  const producto = String(input.producto ?? "").trim().toLowerCase()
  if (producto === "gas") return "gas"
  if (producto === "luz" || producto === "electricidad") return "luz"

  const campania = String(input.campania ?? "")
  if (/\bgas\b/i.test(campania)) return "gas"
  return "luz"
}
