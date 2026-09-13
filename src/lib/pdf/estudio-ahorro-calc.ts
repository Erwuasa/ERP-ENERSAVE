import type {
  AhorroConjuntoTotales,
  EstudioAhorroInput,
  OtroConceptoRow,
  TarifaEstudioAhorro,
} from "./estudio-ahorro-types"

export function formatEur(value: number): string {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatNum(value: number, decimals = 2): string {
  return new Intl.NumberFormat("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value)
}

export function sumPotencia(t: TarifaEstudioAhorro): number {
  const bruto = t.terminoPotencia.reduce((acc, r) => acc + r.total, 0)
  return bruto - (t.descuentoPotencia ?? 0)
}

export function sumEnergia(t: TarifaEstudioAhorro): number {
  const bruto = t.terminoEnergia.reduce((acc, r) => acc + r.total, 0)
  return bruto - (t.descuentoEnergia ?? 0)
}

export function sumOtros(rows: OtroConceptoRow[]): number {
  return rows.reduce((acc, r) => acc + r.total, 0)
}

export function calcBaseImponible(t: TarifaEstudioAhorro): number {
  return sumPotencia(t) + sumEnergia(t) + sumOtros(t.otrosConceptos)
}

export function calcIva(base: number, pct: number): number {
  return base * (pct / 100)
}

export function filterOtros(rows: OtroConceptoRow[]): OtroConceptoRow[] {
  return rows.filter((r) => Math.abs(r.precio) > 0.001 || Math.abs(r.total) > 0.001)
}

export function hasOtrosConceptos(input: EstudioAhorroInput): boolean {
  return (
    filterOtros(input.tarifaActual.otrosConceptos).length > 0 ||
    filterOtros(input.tarifaPropuesta.otrosConceptos).length > 0
  )
}

/**
 * Totales de cartera sobre base imponible: el ahorro anual por CUPS del comparador
 * es un importe sin IVA, así que gasto actual y propuesto se expresan igual para
 * que las tres cifras cuadren con el listado de CUPS.
 */
export function calcTotalesConjunto(estudios: EstudioAhorroInput[]): AhorroConjuntoTotales {
  const gastoActualAnual = estudios.reduce((acc, e) => acc + calcBaseImponible(e.tarifaActual), 0)
  const ahorroAnualEur = estudios.reduce((acc, e) => acc + e.ahorroAnualEur, 0)
  return {
    gastoActualAnual,
    gastoPropuestoAnual: Math.max(0, gastoActualAnual - ahorroAnualEur),
    ahorroAnualEur,
    ahorroAnualPct: gastoActualAnual > 0 ? (ahorroAnualEur / gastoActualAnual) * 100 : 0,
    suministros: estudios.length,
  }
}

export function buildDisclaimer(fechaGeneracion: string): string {
  const year = new Date().getFullYear()
  return `© ${year} EnerSave. Todos los derechos reservados. Generado el ${fechaGeneracion}. Documento informativo sujeto a validación comercial y técnica.`
}
