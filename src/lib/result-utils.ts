/** Narrow discriminated results before reading `.message`. */
export function isFailureResult(
  result: { ok: boolean; message?: string }
): result is { ok: false; message: string } {
  return result.ok === false
}

export function failureMessage(
  result: { ok: boolean; message?: string },
  fallback = "Error desconocido"
): string {
  return result.ok === false && result.message ? result.message : fallback
}
