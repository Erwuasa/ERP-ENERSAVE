export type PeriodoTarifa = "P1" | "P2" | "P3" | "P4" | "P5" | "P6"

export interface TerminoPotenciaRow {
  periodo: PeriodoTarifa
  potenciaContratadaKw: number
  precioEurDia: number
  total: number
}

export interface TerminoEnergiaRow {
  periodo: PeriodoTarifa
  consumoKwh: number
  precioEurKwh: number
  total: number
}

export interface OtroConceptoRow {
  concepto: string
  precio: number
  total: number
}

export interface TarifaEstudioAhorro {
  comercializadora: string
  nombreTarifa: string
  logoUrl?: string
  terminoPotencia: TerminoPotenciaRow[]
  terminoEnergia: TerminoEnergiaRow[]
  descuentoPotencia?: number
  descuentoEnergia?: number
  otrosConceptos: OtroConceptoRow[]
  ivaPct: number
  totalFactura: number
}

export interface EstudioAhorroInput {
  cliente: { nombre: string; cups: string; direccion?: string }
  fechaGeneracion: string
  tarifaActual: TarifaEstudioAhorro
  tarifaPropuesta: TarifaEstudioAhorro
  ahorroPorFacturaEur: number
  ahorroPorFacturaPct: number
  ahorroAnualEur: number
  ahorroAnualPct: number
}

export interface EstudioAhorroConjuntoInput {
  fechaGeneracion: string
  /** Cliente/cartera al que se dirige el estudio conjunto. */
  titular?: string
  estudios: EstudioAhorroInput[]
}

export interface AhorroConjuntoTotales {
  gastoActualAnual: number
  gastoPropuestoAnual: number
  ahorroAnualEur: number
  ahorroAnualPct: number
  suministros: number
}
