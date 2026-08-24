export type TarifaPrecioTipo = "fijo" | "indexado"

const PERIODO_LABELS: Record<string, string> = {
  p1: "P1 (punta)",
  p2: "P2 (llano)",
  p3: "P3 (valle)",
  p4: "P4",
  p5: "P5",
  p6: "P6",
}

export function inferTarifaPrecioTipoFromNombre(tarifa: string): TarifaPrecioTipo {
  const name = tarifa.toLowerCase()
  if (
    name.includes("index") ||
    name.includes("variable") ||
    name.includes("pool") ||
    name.includes("dinám") ||
    name.includes("omie") ||
    name.includes("por uso")
  ) {
    return "indexado"
  }
  return "fijo"
}

export function buildPeriodosMayorConsumo(consumos: {
  p1: number
  p2: number
  p3: number
  p4: number
  p5: number
  p6: number
}): string[] {
  const ranked = (Object.keys(PERIODO_LABELS) as Array<keyof typeof PERIODO_LABELS>)
    .map((key) => ({
      label: PERIODO_LABELS[key],
      value: Number(consumos[key] ?? 0),
    }))
    .filter((entry) => entry.value > 0)
    .sort((a, b) => b.value - a.value)

  return ranked.slice(0, 2).map((entry) => entry.label)
}

export function formatEuro(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    maximumFractionDigits: 0,
  }).format(value)
}

export function buildMailtoHref(email: string, asunto: string, cuerpo: string): string {
  const to = email.trim()
  const params = new URLSearchParams({
    subject: asunto,
    body: cuerpo,
  })
  return to ? `mailto:${encodeURIComponent(to)}?${params.toString()}` : `mailto:?${params.toString()}`
}
