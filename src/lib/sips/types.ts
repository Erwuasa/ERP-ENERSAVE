export type SipsProducto = "luz" | "gas"

export interface SipsMonthConsumption {
  label: string
  /** YYYY-MM when the payload had a date. Used to order and keep the last 12 months. */
  sortKey: string | null
  byPeriod: Record<string, number>
}

export interface SipsResumen {
  cups: string | null
  tarifa: string | null
  /** Contracted power per period, keys P1..P6 in kW. */
  potenciasKw: Record<string, number>
  consumoAnualKwh: number | null
  /** Active energy by period, keys P1..P6 in kWh. Empty when the provider omits it. */
  consumosKwh: Record<string, number>
  /** Monthly active energy. Empty when the provider omits the curve. */
  consumoMensual: SipsMonthConsumption[]
  codigoPostal: string | null
  provincia: string | null
  municipio: string | null
  distribuidora: string | null
  cnae: string | null
}

export type SipsErrorCode =
  | "INVALID_CUPS"
  | "UNAUTHORIZED"
  | "RATE_LIMITED"
  | "NOT_CONFIGURED"
  | "UPSTREAM"
  | "UNKNOWN"

export type SipsOutcome =
  | { status: "listo"; cups: string; resumen: SipsResumen; origen: string | null; consultadoEn: string | null }
  | { status: "procesando"; reintentarEnSegundos: number }
  | { status: "sin_datos"; cups: string | null }
  | { status: "error"; code: SipsErrorCode; message: string; retryAfterSeconds?: number }
