import { fetchSipsByCups, type SipsQueryResult } from "@/lib/sips-query"
import type { SipsOutcome, SipsProducto } from "@/lib/sips/types"

/** enertech-sips-lookup ya está desplegada (2026-10-09): las consultas usan la API real. */
export const SIPS_USE_MOCK_DATA = false

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
