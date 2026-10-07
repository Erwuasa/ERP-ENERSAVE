import { fetchSipsByCups, type SipsQueryResult } from "@/lib/sips-query"
import type { SipsOutcome, SipsProducto } from "@/lib/sips/types"

/** Mientras no haya respuesta estable del proveedor, las consultas usan datos demo. */
export const SIPS_USE_MOCK_DATA = true

export function mapSipsQueryToListoOutcome(data: SipsQueryResult): Extract<SipsOutcome, { status: "listo" }> {
  const potenciasKw: Record<string, number> = {}
  for (const row of data.potenciasContratadas) {
    potenciasKw[row.period] = row.kw
  }

  return {
    status: "listo",
    cups: data.cups,
    resumen: {
      cups: data.cups,
      tarifa: data.tarifa,
      potenciasKw,
      consumoAnualKwh: data.consumoAnualKwh,
      codigoPostal: data.codigoPostal,
      provincia: data.provincia,
      municipio: data.localidad || null,
      distribuidora: data.distribuidora,
      cnae: null,
    },
    origen: "Datos de prueba (demo)",
    consultadoEn: new Date().toISOString(),
  }
}

export async function lookupSipsMock(
  cups: string,
  _producto: SipsProducto
): Promise<{ outcome: Extract<SipsOutcome, { status: "listo" }>; demoCharts: SipsQueryResult }> {
  const demoCharts = await fetchSipsByCups(cups)
  return {
    outcome: mapSipsQueryToListoOutcome(demoCharts),
    demoCharts,
  }
}
