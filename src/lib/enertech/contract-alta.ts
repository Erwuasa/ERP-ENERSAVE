import { computeCupsControl, validateCups } from "@/lib/sips/cups"

export const ENERTECH_TEST_BASE_URL = "https://devintranet.enertechcore.com/v1"
export const ENERTECH_PRODUCTION_BASE_URL = "https://intranet.enertechcore.com/v1"

const DNI_LETTERS = "TRWAGMYFPDXBNJZSQVHLCKE"
const CIF_CONTROL_LETTERS = "JABCDEFGHI"

export type SpanishTaxKind = "dni" | "nie" | "cif"

export type EnertechSegmento = "residencial" | "autonomo" | "pyme" | "ccpp"

export interface EnertechAltaIssue {
  code:
    | "INVALID_TAX_ID"
    | "MISSING_APELLIDO"
    | "MISSING_NACIONALIDAD"
    | "MISSING_APODERADO"
    | "INVALID_CUPS"
    | "MISSING_CNAE"
    | "MISSING_TARIFF"
    | "MISSING_CLIENT"
    | "INVALID_TARGET"
  message: string
}

export interface EnertechClienteInput {
  nombre: string
  apellido1?: string
  apellido2?: string
  dni: string
  email?: string
  movil?: string
  nacionalidad?: string
  apoderadoNombre?: string
  apoderadoDni?: string
}

export interface EnertechContratoInput {
  clientId: number
  cups: string
  cnae: string
  claveTarifa?: string
  idTarifa?: number
  idRate?: number
  viaTipo?: string
  viaNombre?: string
  viaNumero?: string
  cp?: string
  poblacion?: string
  provincia?: string
  iban?: string
  consumption?: number
  powersKw?: Partial<Record<"p1" | "p2" | "p3" | "p4" | "p5" | "p6", number>>
}

export interface EnertechAltaSource {
  nombre: string
  apellidos: string
  razonSocial: string
  nif: string
  email: string
  telefono: string
  tipoCliente: "residencial" | "pyme" | "autonomo" | "comunidad_vecinos"
  cups: string
  codigoPostal: string
  poblacion: string
  provincia: string
  direccionSuministro: string
  iban: string
  consumoAnual: number | ""
  potenciaP1: string
  potenciaP2: string
  potenciaP3: string
  potenciaP4: string
  potenciaP5: string
  potenciaP6: string
  cnae: string
  claveTarifa?: string
  idTarifa?: number
  nacionalidad?: string
  apoderadoNombre?: string
  apoderadoDni?: string
}

export interface EnertechHttpRequest {
  method: "GET" | "POST"
  path: string
  query?: Record<string, string>
  body?: unknown
  idempotencyKey?: string
}

export interface EnertechHttpResponse {
  status: number
  body: unknown
  retryAfter?: string | null
}

export interface EnertechHttp {
  request(input: EnertechHttpRequest): Promise<EnertechHttpResponse>
}

export interface EnertechAltaPruebaReport {
  perfilOk: boolean
  perfilStatus: number
  perfilCode: string | null
  claveTarifa: string | null
  comercializadora: string | null
  documentosRequeridos: number | null
  clienteIncompleto: { status: number; code: string | null }
  cliente: { status: number; code: string | null; id: number | null }
  clienteDuplicado: { status: number; code: string | null }
  contratoSinCnae: { status: number; code: string | null }
  contrato: { status: number; code: string | null; id: number | null; estado: string | null }
  relecturaCupsOk: boolean
  relecturaEstado: string | null
  idempotenciaOk: boolean
}

type Built<T> = { ok: true; value: T } | { ok: false; issue: EnertechAltaIssue }

function fail(code: EnertechAltaIssue["code"], message: string): Built<never> {
  return { ok: false, issue: { code, message } }
}

function text(value: string | undefined | null): string {
  return (value ?? "").trim()
}

export function assertEnertechTestBaseUrl(url: string): string {
  const normalized = url.trim().replace(/\/$/, "")
  if (normalized !== ENERTECH_TEST_BASE_URL) {
    throw new Error("El alta de prueba solo puede apuntar a https://devintranet.enertechcore.com/v1.")
  }
  return normalized
}

export function spanishTaxControlLetter(seed: number): string {
  return DNI_LETTERS[((seed % 23) + 23) % 23] ?? "T"
}

export function classifySpanishTaxId(raw: string): { kind: SpanishTaxKind; normalized: string } | null {
  const normalized = raw.toUpperCase().replace(/[\s-]/g, "")
  if (/^\d{8}[A-Z]$/.test(normalized)) {
    const number = Number(normalized.slice(0, 8))
    return normalized[8] === spanishTaxControlLetter(number) ? { kind: "dni", normalized } : null
  }
  if (/^[XYZ]\d{7}[A-Z]$/.test(normalized)) {
    const prefix = normalized[0] === "X" ? "0" : normalized[0] === "Y" ? "1" : "2"
    const number = Number(prefix + normalized.slice(1, 8))
    return normalized[8] === spanishTaxControlLetter(number) ? { kind: "nie", normalized } : null
  }
  if (isValidCif(normalized)) return { kind: "cif", normalized }
  return null
}

function isValidCif(cif: string): boolean {
  const match = /^([ABCDEFGHJNPQRSUVW])(\d{7})([0-9A-J])$/.exec(cif)
  if (!match) return false
  const letter = match[1] ?? ""
  const digits = match[2] ?? ""
  const control = match[3] ?? ""
  let sum = 0
  for (let index = 0; index < digits.length; index++) {
    const digit = Number(digits[index])
    if (index % 2 === 0) {
      const doubled = digit * 2
      sum += Math.floor(doubled / 10) + (doubled % 10)
    } else {
      sum += digit
    }
  }
  const controlDigit = (10 - (sum % 10)) % 10
  const controlLetter = CIF_CONTROL_LETTERS[controlDigit] ?? "J"
  if ("PQRSNW".includes(letter)) return control === controlLetter
  if ("ABEH".includes(letter)) return control === String(controlDigit)
  return control === String(controlDigit) || control === controlLetter
}

export function buildEnertechClienteBody(input: EnertechClienteInput): Built<Record<string, string>> {
  const tax = classifySpanishTaxId(input.dni)
  if (!tax) return fail("INVALID_TAX_ID", "El documento no es un DNI, NIE o CIF válido.")

  const nombre = text(input.nombre)
  if (!nombre) return fail("MISSING_CLIENT", "Falta el nombre del cliente.")

  if (tax.kind === "cif") {
    if (!text(input.apoderadoNombre) || !text(input.apoderadoDni)) {
      return fail("MISSING_APODERADO", "Un CIF necesita apoderadoNombre y apoderadoDni.")
    }
    if (!classifySpanishTaxId(input.apoderadoDni ?? "")) {
      return fail("INVALID_TAX_ID", "El DNI del apoderado no es válido.")
    }
  } else if (!text(input.apellido1)) {
    return fail("MISSING_APELLIDO", "Un DNI o NIE necesita apellido1.")
  }

  if (tax.kind === "nie" && !text(input.nacionalidad)) {
    return fail("MISSING_NACIONALIDAD", "Un NIE necesita nacionalidad.")
  }

  const body: Record<string, string> = { nombre, dni: tax.normalized }
  const apellido1 = text(input.apellido1)
  const apellido2 = text(input.apellido2)
  const email = text(input.email)
  const movil = text(input.movil).replace(/\s/g, "")
  if (apellido1) body.apellido1 = apellido1
  if (apellido2) body.apellido2 = apellido2
  if (email) body.email = email
  if (movil) body.movil1 = movil
  if (tax.kind === "nie") body.nacionalidad = text(input.nacionalidad)
  if (tax.kind === "cif") {
    body.apoderadoNombre = text(input.apoderadoNombre)
    body.apoderadoDni = classifySpanishTaxId(input.apoderadoDni ?? "")?.normalized ?? ""
  }
  return { ok: true, value: body }
}

export function buildEnertechContratoBody(input: EnertechContratoInput): Built<Record<string, unknown>> {
  if (!Number.isInteger(input.clientId) || input.clientId <= 0) {
    return fail("MISSING_CLIENT", "El contrato necesita el id de cliente que devolvió Enertech.")
  }
  const cups = validateCups(input.cups)
  if (cups.ok === false) return fail("INVALID_CUPS", "El CUPS del contrato no es válido.")
  if (!text(input.cnae)) return fail("MISSING_CNAE", "El CNAE es obligatorio en el alta de Enertech.")

  const clave = text(input.claveTarifa)
  const idTarifa = input.idTarifa
  if (!clave && !(typeof idTarifa === "number" && idTarifa > 0)) {
    return fail("MISSING_TARIFF", "Indica claveTarifa o idTarifa de la fila de precios de Enertech.")
  }

  const body: Record<string, unknown> = {
    clientId: input.clientId,
    cups: cups.cups,
    cnae: text(input.cnae),
  }
  if (clave) body.clave_tarifa = clave
  if (typeof idTarifa === "number" && idTarifa > 0) body.id_tarifa = idTarifa
  if (typeof input.idRate === "number" && input.idRate > 0) body.id_rate = input.idRate
  assignText(body, "via_tipo", input.viaTipo)
  assignText(body, "via_nombre", input.viaNombre)
  assignText(body, "via_numero", input.viaNumero)
  assignText(body, "cp", input.cp)
  assignText(body, "poblacion", input.poblacion)
  assignText(body, "provincia", input.provincia)
  assignText(body, "iban", input.iban?.replace(/\s/g, ""))
  if (typeof input.consumption === "number" && input.consumption > 0) body.consumption = input.consumption
  for (const period of ["p1", "p2", "p3", "p4", "p5", "p6"] as const) {
    const kw = input.powersKw?.[period]
    if (typeof kw === "number" && kw > 0) body[`power_${period}`] = kw
  }
  return { ok: true, value: body }
}

function assignText(body: Record<string, unknown>, key: string, value: string | undefined) {
  const cleaned = text(value)
  if (cleaned) body[key] = cleaned
}

export function enertechSegmentoFromTipoCliente(tipo: EnertechAltaSource["tipoCliente"]): EnertechSegmento {
  if (tipo === "comunidad_vecinos") return "ccpp"
  if (tipo === "autonomo") return "autonomo"
  if (tipo === "pyme") return "pyme"
  return "residencial"
}

function splitApellidos(apellidos: string): { apellido1: string; apellido2: string } {
  const parts = text(apellidos).split(/\s+/).filter(Boolean)
  return { apellido1: parts[0] ?? "", apellido2: parts.slice(1).join(" ") }
}

function parsePower(value: string): number | undefined {
  const parsed = Number(value.trim().replace(",", "."))
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined
}

export function mapContractSourceToEnertechAlta(source: EnertechAltaSource): Built<{
  cliente: EnertechClienteInput
  contrato: Omit<EnertechContratoInput, "clientId">
  segmento: EnertechSegmento
}> {
  const tax = classifySpanishTaxId(source.nif)
  if (!tax) return fail("INVALID_TAX_ID", "El NIF del formulario no es un DNI, NIE o CIF válido.")
  const apellidos = splitApellidos(source.apellidos)
  const cliente: EnertechClienteInput =
    tax.kind === "cif"
      ? {
          nombre: text(source.razonSocial) || text(source.nombre),
          dni: tax.normalized,
          email: source.email,
          movil: source.telefono,
          apoderadoNombre: source.apoderadoNombre,
          apoderadoDni: source.apoderadoDni,
        }
      : {
          nombre: text(source.nombre),
          apellido1: apellidos.apellido1,
          apellido2: apellidos.apellido2,
          dni: tax.normalized,
          email: source.email,
          movil: source.telefono,
          nacionalidad: source.nacionalidad,
        }

  const clienteBody = buildEnertechClienteBody(cliente)
  if (clienteBody.ok === false) return clienteBody

  const powersKw: EnertechContratoInput["powersKw"] = {}
  for (const period of ["p1", "p2", "p3", "p4", "p5", "p6"] as const) {
    const key = `potenciaP${period.slice(1)}` as keyof EnertechAltaSource
    const kw = parsePower(String(source[key] ?? ""))
    if (kw !== undefined) powersKw[period] = kw
  }

  const contrato: Omit<EnertechContratoInput, "clientId"> = {
    cups: source.cups,
    cnae: source.cnae,
    claveTarifa: source.claveTarifa,
    idTarifa: source.idTarifa,
    cp: source.codigoPostal,
    poblacion: source.poblacion,
    provincia: source.provincia,
    viaNombre: source.direccionSuministro,
    iban: source.iban,
    consumption: typeof source.consumoAnual === "number" ? source.consumoAnual : undefined,
    powersKw,
  }
  const contratoPreview = buildEnertechContratoBody({ ...contrato, clientId: 1 })
  if (contratoPreview.ok === false) return contratoPreview

  return { ok: true, value: { cliente, contrato, segmento: enertechSegmentoFromTipoCliente(source.tipoCliente) } }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

export function readEnertechCode(body: unknown): string | null {
  if (!isRecord(body)) return null
  return typeof body.code === "string" ? body.code : null
}

export function readEnertechId(body: unknown, keys: string[]): number | null {
  const records = [body]
  if (isRecord(body)) {
    for (const nested of Object.values(body)) {
      if (isRecord(nested)) records.push(nested)
    }
  }
  for (const record of records) {
    if (!isRecord(record)) continue
    for (const key of keys) {
      const value = record[key]
      const parsed = typeof value === "number" ? value : typeof value === "string" ? Number(value) : NaN
      if (Number.isInteger(parsed) && parsed > 0) return parsed
    }
  }
  return null
}

function estadoText(estado: unknown): string | null {
  if (typeof estado === "string" && estado.trim()) return estado.trim()
  if (!isRecord(estado)) return null
  const nombre = estado.nombre ?? estado.name
  return typeof nombre === "string" && nombre.trim() ? nombre.trim() : null
}

export function readEnertechEstado(body: unknown): string | null {
  if (!isRecord(body)) return null
  const direct = estadoText(body.estado)
  if (direct) return direct
  for (const value of Object.values(body)) {
    if (!isRecord(value)) continue
    const nested = estadoText(value.estado)
    if (nested) return nested
  }
  return null
}

export function readEnertechCups(body: unknown): string | null {
  if (!isRecord(body)) return null
  if (typeof body.cups === "string") return body.cups
  for (const value of Object.values(body)) {
    if (isRecord(value) && typeof value.cups === "string") return value.cups
  }
  return null
}

function firstRow(body: unknown): Record<string, unknown> | null {
  if (Array.isArray(body)) return isRecord(body[0]) ? body[0] : null
  if (!isRecord(body)) return null
  for (const key of ["filas", "items", "precios", "rows"]) {
    const list = body[key]
    if (Array.isArray(list) && isRecord(list[0])) return list[0]
  }
  return null
}

export function pickPrecioForAlta(body: unknown): { clave: string; comercializadora: string | null } | null {
  const row = firstRow(body)
  if (!row) return null
  const clave = typeof row.clave === "string" ? row.clave.trim() : ""
  if (!clave) return null
  const comercializadora = typeof row.comercializadora === "string" ? row.comercializadora.trim() : null
  return { clave, comercializadora: comercializadora || null }
}

export function countDocumentacion(body: unknown): number | null {
  if (Array.isArray(body)) return body.length
  if (!isRecord(body)) return null
  for (const key of ["documentos", "items", "filas", "documentacion"]) {
    if (Array.isArray(body[key])) return body[key].length
  }
  return null
}

async function postJson(
  http: EnertechHttp,
  path: string,
  body: unknown,
  idempotencyKey: string
): Promise<EnertechHttpResponse> {
  let response = await http.request({ method: "POST", path, body, idempotencyKey })
  if (response.status === 429) {
    response = await http.request({ method: "POST", path, body, idempotencyKey })
  }
  return response
}

export function pruebaCups(digits: string): string {
  return `ES${digits}${computeCupsControl(digits)}`
}

export function pruebaDni(number: number): string {
  const body = String(number % 100000000).padStart(8, "0")
  return `${body}${spanishTaxControlLetter(Number(body))}`
}

export async function runEnertechAltaPrueba(
  http: EnertechHttp,
  input: {
    cliente: Record<string, string>
    clienteIncompleto: Record<string, string>
    contrato: Record<string, unknown>
    contratoSinCnae: Record<string, unknown>
    idempotencyKey: string
    cups: string
  }
): Promise<EnertechAltaPruebaReport> {
  const perfil = await http.request({ method: "GET", path: "/perfil" })
  const perfilOk = perfil.status >= 200 && perfil.status < 300
  if (!perfilOk) {
    return {
      perfilOk,
      perfilStatus: perfil.status,
      perfilCode: readEnertechCode(perfil.body),
      claveTarifa: null,
      comercializadora: null,
      documentosRequeridos: null,
      clienteIncompleto: { status: 0, code: null },
      cliente: { status: 0, code: null, id: null },
      clienteDuplicado: { status: 0, code: null },
      contratoSinCnae: { status: 0, code: null },
      contrato: { status: 0, code: null, id: null, estado: null },
      relecturaCupsOk: false,
      relecturaEstado: null,
      idempotenciaOk: false,
    }
  }

  const precios = await http.request({ method: "GET", path: "/precios", query: { todas: "1", limit: "1" } })
  const picked = pickPrecioForAlta(precios.body)
  const documentacion = await http.request({
    method: "GET",
    path: "/documentacion",
    query: {
      comercializadora: picked?.comercializadora ?? "",
      segmento: "residencial",
    },
  })

  const clienteIncompleto = await postJson(http, "/clientes", input.clienteIncompleto, `${input.idempotencyKey}-incompleto`)
  const cliente = await postJson(http, "/clientes", input.cliente, `${input.idempotencyKey}-cliente`)
  const clienteDuplicado = await postJson(http, "/clientes", input.cliente, `${input.idempotencyKey}-cliente-dup`)
  const clientId = readEnertechId(cliente.body, ["id", "id_customer", "clientId"])

  const contratoSinCnae = await postJson(http, "/contratos", input.contratoSinCnae, `${input.idempotencyKey}-sin-cnae`)
  const contratoBody = {
    ...input.contrato,
    ...(picked?.clave ? { clave_tarifa: picked.clave } : {}),
    ...(clientId ? { clientId } : {}),
  }
  const contrato = clientId
    ? await postJson(http, "/contratos", contratoBody, `${input.idempotencyKey}-contrato`)
    : { status: 0, body: { code: "MISSING_CLIENT" } }
  const contractId = readEnertechId(contrato.body, ["id", "id_contract", "contractId"])
  const lectura = contractId
    ? await http.request({ method: "GET", path: `/contratos/${contractId}` })
    : { status: 0, body: null }
  const replay = clientId
    ? await postJson(http, "/contratos", contratoBody, `${input.idempotencyKey}-contrato`)
    : { status: 0, body: null }
  const replayId = readEnertechId(replay.body, ["id", "id_contract", "contractId"])

  return {
    perfilOk,
    perfilStatus: perfil.status,
    perfilCode: readEnertechCode(perfil.body),
    claveTarifa: picked?.clave ?? null,
    comercializadora: picked?.comercializadora ?? null,
    documentosRequeridos: countDocumentacion(documentacion.body),
    clienteIncompleto: { status: clienteIncompleto.status, code: readEnertechCode(clienteIncompleto.body) },
    cliente: { status: cliente.status, code: readEnertechCode(cliente.body), id: clientId },
    clienteDuplicado: { status: clienteDuplicado.status, code: readEnertechCode(clienteDuplicado.body) },
    contratoSinCnae: { status: contratoSinCnae.status, code: readEnertechCode(contratoSinCnae.body) },
    contrato: {
      status: contrato.status,
      code: readEnertechCode(contrato.body),
      id: contractId,
      estado: readEnertechEstado(contrato.body),
    },
    relecturaCupsOk: readEnertechCups(lectura.body)?.toUpperCase() === input.cups.toUpperCase(),
    relecturaEstado: readEnertechEstado(lectura.body),
    idempotenciaOk: contractId !== null && replayId === contractId,
  }
}

export function createEnertechTestHttp(apiKey: string, fetchImpl: typeof fetch = fetch): EnertechHttp {
  const key = apiKey.trim()
  if (!key) throw new Error("Falta la clave de pruebas de Enertech.")
  const base = assertEnertechTestBaseUrl(ENERTECH_TEST_BASE_URL)
  return {
    async request(input) {
      const url = new URL(`${base}${input.path}`)
      for (const [name, value] of Object.entries(input.query ?? {})) {
        if (value) url.searchParams.set(name, value)
      }
      const headers: Record<string, string> = {
        "X-Api-Key": key,
        Accept: "application/json",
      }
      if (input.body !== undefined) headers["Content-Type"] = "application/json"
      if (input.idempotencyKey) headers["Idempotency-Key"] = input.idempotencyKey
      const response = await fetchImpl(url, {
        method: input.method,
        headers,
        body: input.body === undefined ? undefined : JSON.stringify(input.body),
      })
      const body = await response.json().catch(() => null)
      return { status: response.status, body, retryAfter: response.headers.get("retry-after") }
    },
  }
}
