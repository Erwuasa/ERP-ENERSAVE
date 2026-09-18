export const AT_OUTBOUND_OWNER_EMAIL = "germanbayonr@gmail.com"

export type AtOutboundSkipReason = "incomplete" | "disabled"

export type AtOutboundContractRow = {
  id: string
  client_name: string | null
  cups: string | null
  tipo: string | null
  nif: string | null
  telefono: string | null
  email: string | null
  iban: string | null
  direccion_suministro: string | null
  direccion_fiscal: string | null
  codigo_postal: string | null
  poblacion: string | null
  provincia: string | null
  tipo_cliente: string | null
  potencia_contratada: string | null
  consumo_anual: number | null
  fecha_inicio: string | null
  estado: string | null
  at_contract_id: string | null
  at_rate_id: string | null
  at_marco_id: string | null
  at_client_id?: string | null
  is_new_supply?: boolean | null
  is_ownership_change?: boolean | null
  metadata?: Record<string, unknown> | null
}

export type AtClientCreatePayload = {
  tipo: "particular" | "pyme"
  nombre: string
  apellidos?: string
  dni_cif: string
  email?: string
  telefono?: string
  direccion?: string
  municipio?: string
  provincia?: string
  codigo_postal?: string
  cups?: string
}

export type AtContractPayload = {
  nif?: string
  first_name?: string
  last_name?: string
  business_name?: string
  phone?: string
  email?: string
  address_street?: string
  address_postal_code?: string
  address_city?: string
  address_province?: string
  tipo_cliente?:
    | "PARTICULAR"
    | "AUTONOMO"
    | "EMPRESA"
    | "COMUNIDAD_DE_PROPIETARIOS"
    | "AYUNTAMIENTO"
  cliente_id?: string
  marco_id?: string
  marco_logical_id?: string
  rates_id?: string
  iban?: string
  is_ownership_change?: boolean
  is_new_supply?: boolean
  electricity_data?: Record<string, unknown>
  gas_data?: Record<string, unknown>
  contract_date?: string
  status?: "draft" | "requested"
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function uuid(value: unknown): string | undefined {
  const raw = text(value)
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(raw)
    ? raw.toLowerCase()
    : undefined
}

function optionalEmail(value: unknown): string | undefined {
  const raw = text(value).toLowerCase()
  return EMAIL_RE.test(raw) ? raw : undefined
}

function metadataOf(row: AtOutboundContractRow): Record<string, unknown> {
  return row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
    ? row.metadata
    : {}
}

export function canPushContractToAt(row: AtOutboundContractRow): boolean {
  const cups = text(row.cups).toUpperCase()
  const nif = text(row.nif).replace(/\s+/g, "")
  if (!nif || nif.length < 8) return false
  if (!cups || cups === "PENDIENTE" || cups.length < 8) return false
  return true
}

export function mapTipoClienteAt(value: string | null | undefined): AtContractPayload["tipo_cliente"] {
  const raw = text(value).toLowerCase()
  if (raw.includes("comunidad")) return "COMUNIDAD_DE_PROPIETARIOS"
  if (raw.includes("ayunt")) return "AYUNTAMIENTO"
  if (raw.includes("autonom")) return "AUTONOMO"
  if (raw.includes("empresa") || raw.includes("pyme")) return "EMPRESA"
  return "PARTICULAR"
}

function isEmpresa(tipoCliente: AtContractPayload["tipo_cliente"]): boolean {
  return tipoCliente === "EMPRESA" || tipoCliente === "COMUNIDAD_DE_PROPIETARIOS" || tipoCliente === "AYUNTAMIENTO"
}

function splitPersonName(fullName: string): { first_name: string; last_name: string } {
  const parts = fullName.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return { first_name: "Cliente", last_name: "" }
  if (parts.length === 1) return { first_name: parts[0], last_name: "" }
  return { first_name: parts[0], last_name: parts.slice(1).join(" ") }
}

export function parsePotenciaToPowers(
  potenciaContratada: string | null | undefined,
  metadata?: Record<string, unknown> | null
): Record<string, number> | undefined {
  const powers: Record<string, number> = {}
  const meta = metadata && typeof metadata === "object" ? metadata : {}

  for (let index = 1; index <= 6; index += 1) {
    const raw = meta[`potencia_p${index}`]
    const parsed = typeof raw === "number" ? raw : Number(String(raw ?? "").replace(",", "."))
    if (Number.isFinite(parsed) && parsed > 0) powers[`p${index}`] = parsed
  }

  const label = text(potenciaContratada)
  const matches = label.matchAll(/P\s*(\d)\s*[:\-]?\s*([\d.,]+)/gi)
  for (const match of matches) {
    const period = Number(match[1])
    const kw = Number(String(match[2]).replace(",", "."))
    if (period >= 1 && period <= 6 && Number.isFinite(kw) && kw > 0) {
      powers[`p${period}`] = kw
    }
  }

  return Object.keys(powers).length > 0 ? powers : undefined
}

export function mapAtClientPayload(row: AtOutboundContractRow): AtClientCreatePayload {
  const tipoCliente = mapTipoClienteAt(row.tipo_cliente)
  const nombreCompleto = text(row.client_name) || "Cliente ERP"
  const { first_name, last_name } = splitPersonName(nombreCompleto)
  const cups = text(row.cups).toUpperCase()

  return {
    tipo: isEmpresa(tipoCliente) ? "pyme" : "particular",
    nombre: isEmpresa(tipoCliente) ? nombreCompleto : first_name,
    ...(last_name && !isEmpresa(tipoCliente) ? { apellidos: last_name } : {}),
    dni_cif: text(row.nif).replace(/\s+/g, "").toUpperCase(),
    ...(optionalEmail(row.email) ? { email: optionalEmail(row.email) } : {}),
    ...(text(row.telefono) ? { telefono: text(row.telefono) } : {}),
    ...(text(row.direccion_fiscal) || text(row.direccion_suministro)
      ? { direccion: text(row.direccion_fiscal) || text(row.direccion_suministro) }
      : {}),
    ...(text(row.poblacion) ? { municipio: text(row.poblacion) } : {}),
    ...(text(row.provincia) ? { provincia: text(row.provincia) } : {}),
    ...(text(row.codigo_postal) ? { codigo_postal: text(row.codigo_postal) } : {}),
    ...(cups && cups !== "PENDIENTE" ? { cups } : {}),
  }
}

export function mapAtContractPayload(
  row: AtOutboundContractRow,
  clienteId?: string | null
): AtContractPayload {
  const tipoCliente = mapTipoClienteAt(row.tipo_cliente)
  const nombreCompleto = text(row.client_name) || "Cliente ERP"
  const { first_name, last_name } = splitPersonName(nombreCompleto)
  const cups = text(row.cups).toUpperCase()
  const meta = metadataOf(row)
  const powers = parsePotenciaToPowers(row.potencia_contratada, meta)
  const atr = text(meta.atr)
  const consumo = Number(row.consumo_anual)
  const supply =
    text(row.tipo).toLowerCase() === "gas"
      ? {
          gas_data: {
            cups,
            ...(Number.isFinite(consumo) && consumo > 0 ? { consumo_anual_kwh: consumo } : {}),
            ...(powers ? { powers } : {}),
            ...(atr ? { access_tariff: atr } : {}),
          },
        }
      : {
          electricity_data: {
            cups,
            ...(Number.isFinite(consumo) && consumo > 0 ? { consumo_anual_kwh: consumo } : {}),
            ...(powers ? { powers } : {}),
            ...(atr ? { access_tariff: atr } : {}),
            ...(text(meta.rate_name) ? { rate_name: text(meta.rate_name) } : {}),
          },
        }

  const payload: AtContractPayload = {
    nif: text(row.nif).replace(/\s+/g, "").toUpperCase(),
    tipo_cliente: tipoCliente,
    ...(isEmpresa(tipoCliente)
      ? { business_name: nombreCompleto }
      : { first_name, ...(last_name ? { last_name } : {}) }),
    ...(text(row.telefono) ? { phone: text(row.telefono) } : {}),
    ...(optionalEmail(row.email) ? { email: optionalEmail(row.email) } : {}),
    ...(text(row.direccion_suministro) ? { address_street: text(row.direccion_suministro) } : {}),
    ...(text(row.codigo_postal) ? { address_postal_code: text(row.codigo_postal) } : {}),
    ...(text(row.poblacion) ? { address_city: text(row.poblacion) } : {}),
    ...(text(row.provincia) ? { address_province: text(row.provincia) } : {}),
    ...(uuid(clienteId) ? { cliente_id: uuid(clienteId) } : {}),
    ...(uuid(row.at_rate_id) ? { rates_id: uuid(row.at_rate_id) } : {}),
    ...(uuid(row.at_marco_id) ? { marco_id: uuid(row.at_marco_id) } : {}),
    ...(!uuid(row.at_marco_id) && text(row.at_marco_id)
      ? { marco_logical_id: text(row.at_marco_id) }
      : {}),
    ...(text(row.iban) ? { iban: text(row.iban) } : {}),
    ...(row.is_new_supply === true || meta.is_new_supply === true ? { is_new_supply: true } : {}),
    ...(row.is_ownership_change === true || meta.is_ownership_change === true
      ? { is_ownership_change: true }
      : {}),
    ...supply,
    ...(text(row.fecha_inicio) ? { contract_date: text(row.fecha_inicio).slice(0, 10) } : {}),
  }

  if (!row.at_contract_id) {
    payload.status = text(row.estado) === "Borrador" ? "draft" : "requested"
  }

  return payload
}
