export interface EnertechWebhookContract {
  idContract: number | null
  cups: string | null
  estado: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function positiveInt(value: unknown): number | null {
  const parsed = typeof value === "number" ? value : Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

function text(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  return trimmed || null
}

function readFrom(record: Record<string, unknown>): EnertechWebhookContract {
  const nested = [record.contrato, record.contract, record.data].find(isRecord) ?? null
  const sources = nested ? [record, nested] : [record]
  let idContract: number | null = null
  let cups: string | null = null
  let estado: string | null = null
  for (const source of sources) {
    idContract =
      idContract ??
      positiveInt(source.id_contract) ??
      positiveInt(source.idContract) ??
      positiveInt(source.contract_id)
    cups = cups ?? text(source.cups)
    estado = estado ?? text(source.estado) ?? text(source.status) ?? text(source.estado_nombre)
  }
  return { idContract, cups: cups?.toUpperCase().replace(/[\s\-.]/g, "") ?? null, estado }
}

/** Pulls the contract id, CUPS and status from the shapes Enertech may send. */
export function readEnertechWebhookContract(payload: unknown): EnertechWebhookContract | null {
  if (!isRecord(payload)) return null
  const read = readFrom(payload)
  if (!read.idContract && !read.cups && !read.estado) return null
  return read
}
