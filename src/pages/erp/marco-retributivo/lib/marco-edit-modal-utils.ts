import type { MarcoEntryInput, MarcoRetributivoRow } from "@/lib/supabase/marco-retributivo"
import { normalizeSegmento } from "@/lib/supabase/marco-retributivo"

export const PEAJE_OPTIONS = [
  "2.0TD",
  "3.0TD",
  "6.0TD",
  "6.0TD / 6.1TD",
  "RL.1 / RL.2",
  "RL.2 / RL.3",
  "RL.3",
] as const

export const COMISION_UNIDAD_OPTIONS = [
  { value: "eur_cups", label: "€ / CUPS" },
  { value: "porcentaje_facturado", label: "% facturado" },
  { value: "porcentaje_consumo", label: "% consumo" },
  { value: "porcentaje_termino", label: "% término" },
] as const

export function emptyMarcoForm(): MarcoEntryInput {
  return {
    compania: "Endesa",
    tarifa: "",
    tipo: "luz",
    peaje: "2.0TD",
    segmento: "pyme",
    condicion_1: "",
    condicion_2: "",
    condiciones: "",
    comision_tipo: "fija",
    comision_base: 0,
    comision_unidad: "eur_cups",
    vigencia_meses: 0,
    fecha_inicio: new Date().toISOString().slice(0, 10),
    activo: true,
  }
}

export function marcoRowToForm(row: MarcoRetributivoRow): MarcoEntryInput {
  return {
    compania: row.compania,
    tarifa: row.tarifa,
    tipo: row.tipo,
    peaje: row.peaje,
    segmento: normalizeSegmento(row.segmento),
    condicion_1: row.condicion_1 ?? "",
    condicion_2: row.condicion_2 ?? "",
    condiciones: row.condiciones ?? "",
    comision_tipo: row.comision_tipo,
    comision_base: row.comision_base,
    comision_unidad: row.comision_unidad,
    vigencia_meses: row.vigencia_meses,
    fecha_inicio: row.fecha_inicio,
    activo: row.activo,
  }
}
