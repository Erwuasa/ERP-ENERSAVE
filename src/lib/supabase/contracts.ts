import type { Contract } from "../../types/contract"
import type { NewContractFormState } from "../contract-registration"
import { getSupabaseClient, isSupabaseConfigured } from "./client"

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
    documentos: form.documentos,
    metadata: {
      client_id: contract.clientId,
      atr: contract.atr,
      potencia_p1: form.potenciaP1,
      potencia_p2: form.potenciaP2,
      potencia_p3: form.potenciaP3,
      potencia_p4: form.potenciaP4,
      potencia_p5: form.potenciaP5,
      potencia_p6: form.potenciaP6,
    },
  }
}

export type SaveTeamContractResult =
  | { ok: true; id: string }
  | { ok: false; reason: "not_configured" | "table_missing" | "error"; message: string }

export async function saveTeamContractToSupabase(
  contract: Contract,
  form: NewContractFormState
): Promise<SaveTeamContractResult> {
  if (!isSupabaseConfigured()) {
    return {
      ok: false,
      reason: "not_configured",
      message:
        "Supabase no está configurado. Añade VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.",
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

  if (error) {
    const isMissingTable =
      error.code === "42P01" ||
      error.message.includes("contratos_equipo") ||
      error.message.toLowerCase().includes("does not exist")

    return {
      ok: false,
      reason: isMissingTable ? "table_missing" : "error",
      message: error.message,
    }
  }

  return { ok: true, id: String(data.id) }
}
