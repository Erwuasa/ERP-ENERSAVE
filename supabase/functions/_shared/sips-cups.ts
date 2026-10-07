// Mirror of src/lib/sips/cups.ts (Edge Functions cannot import from src/). Keep both in sync.
const CONTROL_LETTERS = 'TRWAGMYFPDXBNJZSQVHLCKE'
const CUPS_PATTERN = /^ES(\d{16})([A-Z]{2})(\d[FPRCXYZ])?$/

export function normalizeCups(value: string): string {
  return value.toUpperCase().replace(/[\s\-.]/g, '')
}

export function isValidCups(value: string): boolean {
  const match = CUPS_PATTERN.exec(normalizeCups(value))
  if (!match) return false
  const remainder = Number(BigInt(match[1]) % 529n)
  const control = `${CONTROL_LETTERS[Math.floor(remainder / 23)]}${CONTROL_LETTERS[remainder % 23]}`
  return control === match[2]
}
