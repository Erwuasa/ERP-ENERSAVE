export const SIPS_MAX_POLL_ATTEMPTS = 4
export const SIPS_SIN_DATOS_COOLDOWN_HOURS = 24

/** Seconds to wait before repeating the same call, or null once attempts are exhausted. */
export function nextSipsPollDelaySeconds(attempt: number, reintentarEnSegundos: number): number | null {
  if (attempt >= SIPS_MAX_POLL_ATTEMPTS) return null
  return Math.max(5, reintentarEnSegundos)
}

/** A `sin_datos` answer is definitive: the provider only retries for real after 24 h. */
export function sinDatosRetryAt(consultedAt: Date): Date {
  return new Date(consultedAt.getTime() + SIPS_SIN_DATOS_COOLDOWN_HOURS * 3_600_000)
}

export function canRetrySinDatos(consultedAt: Date, now: Date = new Date()): boolean {
  return now.getTime() >= sinDatosRetryAt(consultedAt).getTime()
}
