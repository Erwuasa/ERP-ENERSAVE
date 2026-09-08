import type { Contract } from "../../types/contract"
import { normalizeContractEstado } from "../contract-estado"
import { flattenDocumentosPorTipo } from "../contrato-documentos"
import { insertContratoHistorialCambioEstado } from "./contrato-historial"
import type { NewContractFormState } from "../contract-registration"
import { getSupabaseClient, isSupabaseConfigured } from "./client"
import {
  num,
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseFailure,
  type SupabaseFailureReason,
  type SupabaseResult,
} from "./result"

const TABLE = "contratos_equipo"

export interface TeamContractInsert {
  client_name: string
  cups: string
  tipo: "luz" | "gas"
  compania: string
  tarifa: string
  tipo_precio: string | null
  consumo_anual: number
  estado: string
  comercial_id: string
  comercial_name: string
  nif: string | null
  telefono: string | null
  email: string | null
  iban: string | null
  direccion_suministro: string | null
  direccion_fiscal: string | null
  codigo_postal: string | null
  poblacion: string | null
  provincia: string | null
  potencia_contratada: string | null
  precio_fijo_consumo: number | null
  fecha_inicio: string | null
  tipo_cliente: string | null
  forma_pago: string | null
  nombre_comercial: string | null
  jefe_equipo: string | null
  wizard_segment: string | null
  marco_entry_id: string | null
  monto_interno: number
  monto_externo: number
  comentarios_internos: unknown
  documentos: unknown
  metadata: Record<string, unknown>
  referencia?: string | null
}

export function buildTeamContractRow(
  contract: Contract,
  form: NewContractFormState
): TeamContractInsert {
  return {
    client_name: contract.clientName,
    cups: contract.cups,
    tipo: contract.tipo,
    compania: contract.compania,
    tarifa: contract.tarifa,
    tipo_precio: contract.tipoPrecio ?? null,
    consumo_anual: contract.consumoAnual,
    estado: contract.estado,
    comercial_id: contract.comercialId,
    comercial_name: contract.comercialName,
    nif: contract.nif ?? null,
    telefono: contract.telefono ?? null,
    email: contract.email ?? null,
    iban: contract.iban ?? null,
    direccion_suministro: contract.direccionSuministro ?? null,
    direccion_fiscal: form.direccionFiscal || null,
    codigo_postal: form.codigoPostal || null,
    poblacion: form.poblacion || null,
    provincia: form.provincia || null,
    potencia_contratada: contract.potenciaContratada
      ? String(contract.potenciaContratada)
      : null,
    precio_fijo_consumo: contract.precioFijoConsumo ?? null,
    fecha_inicio: contract.createdAt ?? null,
    tipo_cliente: form.tipoCliente,
    forma_pago: form.formaPago,
    nombre_comercial: form.nombreComercial || contract.comercialName,
    jefe_equipo: form.jefeEquipo || null,
    wizard_segment: form.wizardSegment,
    marco_entry_id: form.marcoEntryId || contract.marcoEntryId || null,
    monto_interno: contract.montoInterno,
    monto_externo: contract.montoExterno,
    comentarios_internos: form.comentariosInternos,
    documentos: flattenDocumentosPorTipo(form.documentosPorTipo),
    metadata: {
      client_id: contract.clientId,
      atr: contract.atr,
      potencia_p1: form.potenciaP1,
      potencia_p2: form.potenciaP2,
      potencia_p3: form.potenciaP3,
      potencia_p4: form.potenciaP4,
      potencia_p5: form.potenciaP5,
      potencia_p6: form.potenciaP6,
      peaje_segment: form.peajeSegment,
    },
    referencia: contract.referencia ?? null,
  }
}

export type TeamContractFailure = SupabaseFailure

export type TeamContractResult<T> = SupabaseResult<T>

export type SaveTeamContractResult =
  | { ok: true; id: string }
  | { ok: false; reason: SupabaseFailureReason; message: string }

const resolveClient = resolveSupabaseClient

let providerByAtCompanyIdCache: Map<string, string> | null = null

export function getCachedProviderByAtCompanyId(): Map<string, string> {
  return providerByAtCompanyIdCache ?? new Map()
}

async function loadProviderByAtCompanyId(
  client: NonNullable<ReturnType<typeof getSupabaseClient>>
): Promise<Map<string, string>> {
  if (providerByAtCompanyIdCache) return providerByAtCompanyIdCache

  const { data } = await client
    .from("providers")
    .select("name, at_company_id")
    .not("at_company_id", "is", null)

  providerByAtCompanyIdCache = new Map(
    (data ?? [])
      .filter((row) => row.at_company_id && row.name)
      .map((row) => [String(row.at_company_id), String(row.name)])
  )
  return providerByAtCompanyIdCache
}

function toFailure(error: { code?: string; message: string }): TeamContractFailure {
  return toSupabaseFailure(error, TABLE)
}

function metadataOf(row: Row): Record<string, unknown> {
  const raw = row.metadata
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
}

function payloadRecord(row: Row): Record<string, unknown> {
  const raw = row.at_payload
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {}
}

function nestedPayload(payload: Record<string, unknown>, key: string): Record<string, unknown> {
  const value = payload[key]
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function bool(raw: unknown): boolean | undefined {
  if (raw === true || raw === "true" || raw === 1 || raw === "1") return true
  if (raw === false || raw === "false" || raw === 0 || raw === "0") return false
  return undefined
}

export function resolveContractCompania(
  row: Row,
  providerByAtCompanyId: Map<string, string> = new Map()
): string {
  const stored = str(row.compania)?.trim() ?? ""
  if (stored && stored.toUpperCase() !== "AT") return stored

  const payload = payloadRecord(row)
  const fromText =
    str(payload.compania) ??
    str(payload.company) ??
    str(payload.provider_name) ??
    str(payload.compania_nombre) ??
    str(payload.proveedor_nombre) ??
    str(payload.billing_company_name) ??
    str(payload.company_name)
  if (fromText?.trim() && fromText.trim().toUpperCase() !== "AT") return fromText.trim()

  const provider = nestedPayload(payload, "provider")
  const fromProviderObject =
    str(provider.nombre) ?? str(provider.name)
  if (fromProviderObject?.trim() && fromProviderObject.trim().toUpperCase() !== "AT") {
    return fromProviderObject.trim()
  }

  const providerAtId = str(payload.provider_id)
  const fromProvider = providerAtId ? providerByAtCompanyId.get(providerAtId) : undefined
  if (fromProvider?.trim()) return fromProvider.trim()

  return "—"
}

export function resolveContractTarifa(row: Row): string {
  const stored = str(row.tarifa)?.trim() ?? ""
  if (stored && stored.toUpperCase() !== "TARIFA AT") return stored

  const payload = payloadRecord(row)
  const electricity = nestedPayload(payload, "electricity_data")
  const gas = nestedPayload(payload, "gas_data")
  return (
    str(electricity.rate_name) ??
    str(electricity.tariff_name) ??
    str(gas.rate_name) ??
    str(gas.tariff_name) ??
    stored
  )
}

function mapObjectRows(raw: unknown): Record<string, unknown>[] {
  if (!Array.isArray(raw)) return []
  return raw.filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
}

function mapAtNotes(raw: unknown): Contract["atNotes"] {
  const notes = mapObjectRows(raw).map((note) => ({
    id: str(note.id),
    note: str(note.note) ?? "",
    createdAt: str(note.created_at ?? note.createdAt),
    authorSide: str(note.author_side ?? note.authorSide),
  }))
  return notes.length > 0 ? notes : undefined
}

function mapAtEvents(raw: unknown): Contract["atEvents"] {
  const events = mapObjectRows(raw).map((event) => ({
    id: str(event.id),
    type: str(event.type),
    title: str(event.title),
    fromStatus: str(event.from_status ?? event.fromStatus),
    toStatus: str(event.to_status ?? event.toStatus),
    actor: str(event.actor),
    createdAt: str(event.created_at ?? event.createdAt),
  }))
  return events.length > 0 ? events : undefined
}

function mapAtDocuments(raw: unknown): Contract["atDocuments"] {
  const documents = mapObjectRows(raw).map((doc) => ({
    id: str(doc.id),
    name: str(doc.name) ?? "Documento AT",
    type: str(doc.type),
    url: str(doc.url),
    size: str(doc.size),
    mime: str(doc.mime),
    createdAt: str(doc.created_at ?? doc.createdAt),
  }))
  return documents.length > 0 ? documents : undefined
}

function mapAtPrices(raw: unknown): Contract["atPrices"] {
  const prices = mapObjectRows(raw)
    .map((row) => ({
      period: str(row.period) ?? "",
      energy: num(row.energy) ?? undefined,
      power: num(row.power) ?? undefined,
    }))
    .filter((row) => row.period && (row.energy != null || row.power != null))
  return prices.length > 0 ? prices : undefined
}

function mapAtEmails(raw: unknown): Contract["atEmails"] {
  const emails = mapObjectRows(raw).map((email) => ({
    id: str(email.id),
    subject: str(email.subject),
    to: str(email.to),
    status: str(email.status),
    createdAt: str(email.created_at ?? email.createdAt),
  }))
  return emails.length > 0 ? emails : undefined
}

function formatPowersLabel(raw: unknown): string | undefined {
  const map = asPowerMap(raw)
  if (!map) return undefined
  const entries = Object.entries(map)
    .map(([key, kw]) => {
      const periodo = Number(/(\d+)/.exec(key)?.[1])
      return Number.isFinite(periodo) && periodo > 0 ? { periodo, kw } : null
    })
    .filter((row): row is { periodo: number; kw: number } => row != null)
    .sort((left, right) => left.periodo - right.periodo)
  if (entries.length === 0) return undefined
  return entries.map((row) => `P${row.periodo}: ${row.kw}`).join(" · ")
}

function firstEnergyPrice(
  prices: Contract["atPrices"]
): number | undefined {
  const p1 = prices?.find((row) => row.period?.toUpperCase() === "P1" && row.energy != null)
  return p1?.energy ?? prices?.find((row) => row.energy != null)?.energy
}

function asPowerMap(raw: unknown): Record<string, number> | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined
  const entries = Object.entries(raw as Record<string, unknown>)
    .map(([key, value]) => [key, num(value)] as const)
    .filter((entry): entry is readonly [string, number] => entry[1] != null)
  return entries.length > 0 ? Object.fromEntries(entries) : undefined
}

function resolveContractAtr(row: Row): string | undefined {
  const metadata = metadataOf(row)
  const fromMetadata = str(metadata.atr)
  if (fromMetadata) return fromMetadata

  const payload = payloadRecord(row)
  const electricity = nestedPayload(payload, "electricity_data")
  const gas = nestedPayload(payload, "gas_data")

  return (
    str(electricity.access_tariff) ??
    str(electricity.tariff_access) ??
    str(electricity.atr) ??
    str(gas.access_tariff) ??
    str(gas.tariff_access) ??
    str(payload.access_tariff) ??
    str(payload.atr)
  )
}

export function mapRowToContract(
  row: Row,
  providerByAtCompanyId: Map<string, string> = new Map()
): Contract {
  const metadata = metadataOf(row)
  const payload = payloadRecord(row)
  const electricity = nestedPayload(payload, "electricity_data")
  const gas = nestedPayload(payload, "gas_data")
  const atPowers = asPowerMap(electricity.powers ?? gas.powers)
  const atPrices = mapAtPrices(row.at_prices)
  const consumoPayload = num(electricity.consumo_anual_kwh) ?? num(gas.consumo_anual_kwh)
  const consumoAnual = num(row.consumo_anual) || consumoPayload || 0
  const tipoPrecio = str(row.tipo_precio)

  return {
    id: String(row.id ?? ""),
    referencia: str(row.referencia),
    clientId: str(row.cliente_id) ?? str(metadata.client_id),
    clientName: str(row.client_name) ?? "",
    cups: str(row.cups) ?? "",
    tipo: row.tipo === "gas" ? "gas" : "luz",
    compania: resolveContractCompania(row, providerByAtCompanyId),
    tarifa: resolveContractTarifa(row),
    consumoAnual,
    montoInterno: num(row.monto_interno) ?? 0,
    montoExterno: num(row.monto_externo) ?? 0,
    estado: normalizeContractEstado(str(row.estado) ?? ""),
    estadoEfectivoDesde: str(row.estado_efectivo_desde),
    motivoCambioEstado: str(row.motivo_cambio_estado),
    comercialId: str(row.comercial_id) ?? "",
    comercialName: str(row.comercial_name) ?? "",
    createdAt:
      str(payload.created_at) ??
      str(payload.contract_date) ??
      str(row.fecha_inicio) ??
      str(row.created_at)?.slice(0, 10) ??
      "",
    fechaActivacion:
      str(row.estado_efectivo_desde) ??
      str(payload.activation_date) ??
      str(payload.fecha_activacion),
    signedAt: str(payload.signed_at) ?? str(payload.signedAt),
    updatedAt: str(payload.updated_at) ?? str(row.updated_at),
    fechaBaja: str(row.fecha_baja),
    retrocomisionClawback: num(row.retrocomision_clawback),
    estadoRenovacion: str(row.estado_renovacion),
    fechaRenovacion: str(row.fecha_renovacion),
    diasRenovacion: num(row.dias_renovacion),
    consumoAnualManual: num(row.consumo_anual_manual) ?? null,
    atr: resolveContractAtr(row),
    nif: str(row.nif),
    telefono: str(row.telefono),
    email: str(row.email),
    iban: str(row.iban),
    direccionSuministro: str(row.direccion_suministro),
    direccionFiscal: str(row.direccion_fiscal),
    codigoPostal: str(row.codigo_postal),
    poblacion: str(row.poblacion),
    provincia: str(row.provincia),
    pisoPuerta:
      str(payload.address_line_2) ??
      str(payload.address_line2) ??
      str(electricity.address_line_2) ??
      str(gas.address_line_2) ??
      str(metadata.address_line_2) ??
      str(payload.piso_puerta) ??
      str(payload.aclarador),
    isNewSupply: bool(payload.is_new_supply ?? electricity.is_new_supply ?? metadata.is_new_supply),
    isOwnershipChange: bool(
      payload.is_ownership_change ?? electricity.is_ownership_change ?? metadata.is_ownership_change
    ),
    atCommissionCompany: num(payload.commission_company),
    atCommissionCollaborator: num(payload.commission_collaborator),
    potenciaContratada:
      num(row.potencia_contratada_kw) ??
      str(row.potencia_contratada) ??
      formatPowersLabel(electricity.powers ?? gas.powers),
    tipoPrecio: tipoPrecio === "fijo" || tipoPrecio === "mercado" ? tipoPrecio : undefined,
    precioFijoConsumo: num(row.precio_fijo_consumo) ?? firstEnergyPrice(atPrices),
    tipoCliente: str(row.tipo_cliente),
    formaPago: str(row.forma_pago),
    nombreComercial: str(row.nombre_comercial),
    jefeEquipo: str(row.jefe_equipo),
    marcoEntryId: str(row.marco_entry_id),
    atMarcoId: str(row.at_marco_id) ?? str(payload.marco_id),
    atRateId:
      str(row.at_rate_id) ??
      str(payload.rates_id) ??
      str(electricity.rate_id ?? electricity.tariff_id ?? gas.rate_id ?? gas.tariff_id),
    atAccessTariff: str(electricity.access_tariff ?? gas.access_tariff ?? payload.access_tariff),
    atRateName: str(electricity.rate_name ?? electricity.tariff_name ?? gas.rate_name ?? gas.tariff_name),
    atPowers,
    atSvas: payload.svas ?? metadata.svas,
    atPrices,
    source: row.source === "at" ? "at" : "manual",
    atStatus: str(row.at_status),
    atContractId: str(row.at_contract_id),
    atStatusNote: str(row.at_status_note) ?? str(payload.status_note),
    atIncidentAt: str(row.at_incident_at) ?? str(payload.incident_at),
    atNotes: mapAtNotes(row.at_notes),
    atEvents: mapAtEvents(row.at_events),
    atDocuments: mapAtDocuments(row.at_documents),
    atEmails: mapAtEmails(row.at_emails),
    documentos: Array.isArray(row.documentos)
      ? (row.documentos as Contract["documentos"])
      : undefined,
    comentariosInternos: Array.isArray(row.comentarios_internos)
      ? (row.comentarios_internos as Contract["comentariosInternos"])
      : undefined,
  }
}

const PATCH_COLUMNS: Partial<Record<keyof Contract, string>> = {
  clientName: "client_name",
  cups: "cups",
  tipo: "tipo",
  compania: "compania",
  tarifa: "tarifa",
  consumoAnual: "consumo_anual",
  montoInterno: "monto_interno",
  montoExterno: "monto_externo",
  estado: "estado",
  estadoEfectivoDesde: "estado_efectivo_desde",
  motivoCambioEstado: "motivo_cambio_estado",
  comercialId: "comercial_id",
  comercialName: "comercial_name",
  createdAt: "fecha_inicio",
  fechaBaja: "fecha_baja",
  retrocomisionClawback: "retrocomision_clawback",
  estadoRenovacion: "estado_renovacion",
  fechaRenovacion: "fecha_renovacion",
  diasRenovacion: "dias_renovacion",
  consumoAnualManual: "consumo_anual_manual",
  nif: "nif",
  telefono: "telefono",
  email: "email",
  iban: "iban",
  direccionSuministro: "direccion_suministro",
  direccionFiscal: "direccion_fiscal",
  codigoPostal: "codigo_postal",
  poblacion: "poblacion",
  provincia: "provincia",
  precioFijoConsumo: "precio_fijo_consumo",
  tipoPrecio: "tipo_precio",
  tipoCliente: "tipo_cliente",
  formaPago: "forma_pago",
  nombreComercial: "nombre_comercial",
  jefeEquipo: "jefe_equipo",
  marcoEntryId: "marco_entry_id",
  documentos: "documentos",
  comentariosInternos: "comentarios_internos",
}

export function buildTeamContractPatch(patch: Partial<Contract>): Row {
  const row: Row = {}

  for (const [field, column] of Object.entries(PATCH_COLUMNS)) {
    const value = patch[field as keyof Contract]
    if (value !== undefined) row[column] = value
  }

  // La tabla guarda la potencia dos veces: texto libre (admite el formato
  // multiperiodo "15 · 12 · 10") y numérico para poder filtrar y agregar.
  if (patch.potenciaContratada !== undefined) {
    row.potencia_contratada = String(patch.potenciaContratada)
    row.potencia_contratada_kw = num(patch.potenciaContratada) ?? null
  }

  return row
}

export async function listTeamContracts(): Promise<TeamContractResult<Contract[]>> {
  const resolved = resolveClient()
  if (resolved.ok === false) return resolved

  const providers = await loadProviderByAtCompanyId(resolved.client)
  const PAGE_SIZE = 500
  const allRows: Contract[] = []
  let from = 0

  while (true) {
    const { data, error } = await resolved.client
      .from(TABLE)
      .select("*")
      .order("created_at", { ascending: false })
      .range(from, from + PAGE_SIZE - 1)

    if (error) return toFailure(error)

    const batch = (data ?? []).map((row) => mapRowToContract(row as Row, providers))
    allRows.push(...batch)

    if (batch.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return { ok: true, data: allRows }
}

export async function updateTeamContract(
  id: string,
  patch: Partial<Contract>,
  options?: {
    audit?: {
      autorId: string
      autorNombre: string
      estadoAnterior?: string
    }
  }
): Promise<TeamContractResult<Contract>> {
  const resolved = resolveClient()
  if (resolved.ok === false) return resolved

  const row = buildTeamContractPatch(patch)
  if (Object.keys(row).length === 0) {
    return { ok: false, reason: "error", message: "No hay cambios que persistir." }
  }

  const { data, error } = await resolved.client
    .from(TABLE)
    .update(row)
    .eq("id", id)
    .select("*")
    .single()

  if (error) return toFailure(error)

  if (patch.estado && options?.audit) {
    const historialResult = await insertContratoHistorialCambioEstado({
      contratoId: id,
      autorId: options.audit.autorId,
      autorNombre: options.audit.autorNombre,
      estadoAnterior: options.audit.estadoAnterior ?? "",
      estadoNuevo: patch.estado,
      motivo: patch.motivoCambioEstado,
    })
    if (historialResult.ok === false) {
      console.warn("[contracts] historial cambio_estado no registrado:", historialResult.message)
    }
  }

  const providers = await loadProviderByAtCompanyId(resolved.client)
  return { ok: true, data: mapRowToContract(data as Row, providers) }
}

export async function deleteTeamContract(id: string): Promise<TeamContractResult<void>> {
  const resolved = resolveClient()
  if (resolved.ok === false) return resolved

  const { error } = await resolved.client.from(TABLE).delete().eq("id", id)
  if (error) return toFailure(error)

  return { ok: true, data: undefined }
}

export async function saveTeamContractToSupabase(
  contract: Contract,
  form: NewContractFormState
): Promise<SaveTeamContractResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Supabase no está configurado. Añade SUPABASE_URL y SUPABASE_ANON_KEY.",
    }
  }

  const supabase = getSupabaseClient()
  if (!supabase) {
    return {
      ok: false,
      reason: "not_configured",
      message: "No se pudo inicializar el cliente de Supabase.",
    }
  }

  const row = buildTeamContractRow(contract, form)

  const { data, error } = await supabase
    .from("contratos_equipo")
    .insert(row)
    .select("id")
    .single()

  if (error) return toFailure(error)

  return { ok: true, id: String(data.id) }
}
