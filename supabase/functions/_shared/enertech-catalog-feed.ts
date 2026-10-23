import { asInt, asString, type JsonRecord } from "./enertech-extract.ts"

function catalogRowKey(row: JsonRecord): string | null {
  const clave = asString(row.clave)
  if (clave) return clave
  const id = asInt(row.id)
  return id !== null ? `id:${id}` : null
}

function isGasAccessTariff(value: unknown): boolean {
  const text = asString(value) ?? ""
  return /gas/i.test(text) || /^rl/i.test(text)
}

/**
 * Une el feed de luz (`todas=1`) con el de gas (`producto=gas`).
 * Una clave que ya vino en luz no se reetiqueta como gas salvo que el peaje sea RL.
 */
export function mergeLuzGasCatalogRows(luzRows: JsonRecord[], gasRows: JsonRecord[]): JsonRecord[] {
  const merged = new Map<string, JsonRecord>()
  const loose: JsonRecord[] = []
  const looseSeen = new Set<string>()

  const put = (row: JsonRecord, producto: "luz" | "gas") => {
    const tagged: JsonRecord = {
      ...row,
      producto: isGasAccessTariff(row.tarifa) ? "gas" : producto,
    }
    const key = catalogRowKey(row)
    if (!key) {
      const fingerprint = JSON.stringify(row)
      if (looseSeen.has(fingerprint)) return
      looseSeen.add(fingerprint)
      loose.push(tagged)
      return
    }
    if (!merged.has(key)) merged.set(key, tagged)
  }

  for (const row of luzRows) put(row, "luz")
  for (const row of gasRows) {
    const key = catalogRowKey(row)
    if (key && merged.has(key) && !isGasAccessTariff(row.tarifa)) continue
    if (key && isGasAccessTariff(row.tarifa)) merged.delete(key)
    put(row, "gas")
  }

  return [...merged.values(), ...loose]
}
