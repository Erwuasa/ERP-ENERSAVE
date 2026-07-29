/** Catálogo de tarifas por peaje y compañía (comparador / marco retributivo). */
export const companiesTariffsCatalog: Record<string, Record<string, string[]>> = {
  "2.0TD": {
    EnerLuz: ["EnerLuz Inteligente Indexada"],
    Iberdrola: ["Iberdrola Plan Estable Luz"],
    Endesa: ["Endesa One Luz 3 Periodos"],
    Naturgy: ["Naturgy Tarifa Por Uso"],
  },
  "3.0TD": {
    EnerLuz: ["EnerLuz MultiPYME Indexada 6P"],
    Endesa: ["Endesa Negocio Fórmula Variable"],
    Iberdrola: ["Iberdrola Plan 3 Grabaciones PYME"],
  },
  "6.0TD": {
    EnerLuz: ["EnerLuz Industrial Pool Max 6.0"],
    Iberdrola: ["Iberdrola Alta Tensión a Medida"],
    Naturgy: ["Naturgy Gas & Luz Industrial Alianza"],
  },
}

export function getLinkedTarifasForMarcoEntry(
  compania: string,
  peaje: string,
  marcoTarifa: string
): string[] {
  const linked = new Set<string>([marcoTarifa])
  const peajeKey = peaje.split(" ")[0]?.split("/")[0]?.trim() ?? peaje

  for (const [atr, companies] of Object.entries(companiesTariffsCatalog)) {
    if (!peaje.includes(atr) && !peajeKey.includes(atr.replace(".", ""))) continue
    const list = companies[compania]
    if (list) list.forEach((t) => linked.add(t))
  }

  return Array.from(linked)
}
