const CONTROL_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE"

const CUPS_PATTERN = /^ES(\d{16})([A-Z]{2})(\d[FPRCXYZ])?$/

export type CupsValidation =
  | { ok: true; cups: string }
  | { ok: false; reason: "empty" | "format" | "control" }

/** Uppercases and strips whitespace, dashes and dots so pasted values compare cleanly. */
export function normalizeCups(value: string): string {
  return value.toUpperCase().replace(/[\s\-.]/g, "")
}

/** Control letters for the 16 digit body: N mod 529 -> (floor(r / 23), r mod 23). */
export function computeCupsControl(digits: string): string {
  const remainder = Number(BigInt(digits) % 529n)
  return `${CONTROL_LETTERS[Math.floor(remainder / 23)]}${CONTROL_LETTERS[remainder % 23]}`
}

export function validateCups(value: string): CupsValidation {
  const cups = normalizeCups(value)
  if (!cups) return { ok: false, reason: "empty" }

  const match = CUPS_PATTERN.exec(cups)
  if (!match) return { ok: false, reason: "format" }

  const [, digits, control] = match
  if (computeCupsControl(digits!) !== control) return { ok: false, reason: "control" }

  return { ok: true, cups }
}

export const CUPS_ERROR_MESSAGES: Record<Exclude<CupsValidation, { ok: true }>["reason"], string> = {
  empty: "Introduce un CUPS.",
  format: "Formato de CUPS no válido. Debe empezar por ES y tener 16 dígitos y 2 letras.",
  control: "Las letras de control no coinciden. Revisa el CUPS.",
}
