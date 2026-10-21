export type InvoiceSupplyKind = "luz" | "gas"

type InvoiceSegment = "residencial" | "pyme"

const ELECTRIC_PEAJE = /2[.,]0\s*TD|3[.,]0\s*TD|6[.,][1-4]\s*TD/i
const GAS_PEAJE = /\bRL\.?\s*[1-5]\b/i

function withoutFalseGasMentions(text: string): string {
  return text
    .replace(/pla[cç]a\s+del\s+gas/gi, " ")
    .replace(/plaza\s+del\s+gas/gi, " ")
    .replace(/\bcc\s+gas\s+natural\b/gi, " ")
    .replace(/mix\s+de\s+generaci[oó]n[\s\S]{0,400}/gi, " ")
}

function hasElectricitySignal(text: string): boolean {
  return (
    ELECTRIC_PEAJE.test(text) ||
    /factura\s+de\s+electricidad|consumo\s+electricidad|impuesto\s+electricidad|t[eé]rmino\s+(de\s+)?potencia|potencia\s+contratada|suministro\s+el[eé]ctric|\b2\.0\s*td\b/i.test(
      text
    )
  )
}

function hasGasSupplySignal(text: string): boolean {
  return (
    GAS_PEAJE.test(text) ||
    /factura\s+de\s+gas|suministro\s+de\s+gas|t[eé]rmino\s+fijo[\s\S]{0,40}gas|gas\s+natural\s+licuado|\bgnl\b/i.test(
      text
    )
  )
}

/** Luz gana si la factura es eléctrica aunque el texto mencione «gas» en una dirección o en el mix. */
export function inferInvoiceSupplyKind(text: string): InvoiceSupplyKind | undefined {
  const source = withoutFalseGasMentions(text)
  const electric = hasElectricitySignal(source)
  const gas = hasGasSupplySignal(source)
  if (electric) return "luz"
  if (gas) return "gas"
  if (/\bELECTRIC/i.test(source)) return "luz"
  return undefined
}

export function holderIdFromInvoiceText(text: string): string | undefined {
  const source = text.toUpperCase()
  return (
    source.match(/\b\d{8}[A-Z]\b/)?.[0] ??
    source.match(/\b[XYZ]\d{7}[A-Z]\b/)?.[0] ??
    source.match(/\b[A-HJ-NP-SUVW]\d{7}[0-9A-J]\b/)?.[0]
  )
}

export function isPersonalHolderId(value: string | null | undefined): boolean {
  const nif = String(value ?? "").replace(/[\s.-]/g, "").toUpperCase()
  return /^\d{8}[A-Z]$/.test(nif) || /^[XYZ]\d{7}[A-Z]$/.test(nif)
}

export function isCompanyHolderId(value: string | null | undefined): boolean {
  const nif = String(value ?? "").replace(/[\s.-]/g, "").toUpperCase()
  return /^[A-HJ-NP-SUVW]\d{7}[0-9A-J]$/.test(nif)
}

/** Un DNI o NIE en luz 2.0TD es residencial. Un CIF es pyme. */
export function resolveInvoiceSegment(input: {
  nif?: string | null
  tipo?: InvoiceSupplyKind
  accessTariff?: string | null
  current?: InvoiceSegment
}): InvoiceSegment | undefined {
  if (isCompanyHolderId(input.nif)) return "pyme"
  if (
    input.tipo !== "gas" &&
    isPersonalHolderId(input.nif) &&
    (!input.accessTariff || input.accessTariff === "2.0TD")
  ) {
    return "residencial"
  }
  return input.current
}
