const VALID_DECIMAL_INPUT = /^[0-9]*(?:[.,][0-9]*)?$/

export function sanitizeDecimalComaInput(value: string): string {
  let seenSeparator = false
  let result = ""

  for (const char of value) {
    if (char >= "0" && char <= "9") {
      result += char
      continue
    }

    if ((char === "," || char === ".") && !seenSeparator) {
      result += ","
      seenSeparator = true
    }
  }

  return result
}

export function parseDecimalComaInput(value: string): number | null {
  const sanitized = sanitizeDecimalComaInput(value.trim())
  if (sanitized === "" || sanitized === ",") return null
  if (!VALID_DECIMAL_INPUT.test(sanitized)) return null

  const normalized = sanitized.replace(",", ".")
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : null
}

export function formatNumberToDecimalComa(value: number): string {
  if (!Number.isFinite(value)) return ""

  return value.toLocaleString("es-ES", {
    useGrouping: false,
    maximumFractionDigits: 10,
  })
}
