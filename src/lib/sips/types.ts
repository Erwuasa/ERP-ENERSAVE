export type SipsProducto = "luz" | "gas"

export interface SipsResumen {
  cups: string | null
  tarifa: string | null
  /** Contracted power per period, keys P1..P6 in kW. */
  potenciasKw: Record<string, number>
  consumoAnualKwh: number | null
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
