export function inferTipoPrecioFromMarcoText(tarifa: string, condiciones: string): "fijo" | "indexado" {
  const text = `${tarifa} ${condiciones}`.toLowerCase()
  if (
    text.includes("index") ||
    text.includes("pool") ||
    text.includes("variable") ||
    text.includes("dinám") ||
    text.includes("omie")
  ) {
    return "indexado"
  }
  return "fijo"
}

export function inferIncluyeSvaFromMarcoText(tarifa: string, condiciones: string): boolean {
  const text = `${tarifa} ${condiciones}`.toLowerCase()
  return (
    text.includes("sva") ||
    text.includes("valor añadido") ||
    text.includes("servicio obligatorio") ||
    text.includes("solar & battery")
  )
}

export function inferPotenciaBoeFromMarcoText(tarifa: string, condiciones: string): boolean {
  const text = `${tarifa} ${condiciones}`.toLowerCase()
  return text.includes("boe") || text.includes("regulad")
}
