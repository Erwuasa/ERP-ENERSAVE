import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import type { TariffConPrecios } from "./supabase/tariffs-catalog"

/** Filas de marco mínimas para tests del ranking (tarifa ligada por tariff_id / at_rate_id). */
export function marcoRowsForCatalog(catalog: TariffConPrecios[]): MarcoRetributivoRow[] {
  return catalog.map((tariff, index) => ({
    id: `test-marco-${tariff.tariffId}-${index}`,
    compania: tariff.providerName,
    tarifa: tariff.name,
    tipo: "luz",
    peaje: tariff.accessTariff,
    segmento: tariff.segment === "pyme" ? "pyme" : "residencial",
    condicion_1: null,
    condicion_2: null,
    condiciones: null,
    comision_tipo: "fija",
    comision_base: 50,
    comision_unidad: "eur_cups",
    vigencia_meses: 12,
    fecha_inicio: "2025-01-01",
    activo: true,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
    updated_by: null,
    energia_p1: null,
    energia_p2: null,
    energia_p3: null,
    energia_p4: null,
    energia_p5: null,
    energia_p6: null,
    potencia_p1: null,
    potencia_p2: null,
    potencia_p3: null,
    potencia_p4: null,
    potencia_p5: null,
    potencia_p6: null,
    tariff_id: tariff.tariffId,
    at_rate_id: tariff.atRateId,
  }))
}
