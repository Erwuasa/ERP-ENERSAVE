import { flattenDocumentosPorTipo } from "@/lib/contrato-documentos"
import {
  CONTRACT_ESTADO_INCOMPLETO,
  CONTRACT_ESTADO_INICIAL,
} from "@/lib/contract-estado"
import {
  contractRegistrationErrorMessage,
  newContractFormToRegistrationInput,
  validateContractRegistration,
  type NewContractFormState,
} from "@/lib/contract-registration"
import {
  aplicaRenovacionAnual,
  computeRenewalSchedule,
} from "@/lib/contract-segment-rules"
import { upsertClient, syncClientEstados } from "@/lib/clients"
import { marcoRetributivoCatalog } from "@/data/marco-retributivo-catalog"
import { computeComisionBreakdown } from "@/lib/marco-commission"
import { contractsService } from "@/api/erp/contracts.service"
import {
  createContratoCreadoActividad,
  updateProspecto,
} from "@/lib/supabase/ventas"
import type { Contract } from "@/types/contract"
import type { Client } from "@/types/client"
import type { Settlement } from "@/types/settlement"
import type { Profile } from "@/types/profile"
import { formatCurrency } from "@/lib/erp/format-currency"

export interface CreateContractOptions {
  incomplete?: boolean
  prospectoId?: string
}

export interface CreateContractResult {
  ok: true
  newContract: Contract
  clients: Client[]
  contracts: Contract[]
  settlement?: Settlement
  isIncomplete: boolean
  sellerName: string
  externalMargin: number
  warnings: string[]
}

export interface CreateContractError {
  ok: false
  reason: "validation" | "error"
  message: string
}

export async function createContractFromForm(params: {
  form: NewContractFormState
  contracts: Contract[]
  clients: Client[]
  settlements: Settlement[]
  profiles: Profile[]
  activeUserId: string
  activeUserName: string
  activeRole: Profile["role"]
  options?: CreateContractOptions
}): Promise<CreateContractResult | CreateContractError> {
  const {
    form,
    contracts,
    clients,
    profiles,
    activeUserId,
    activeUserName,
    activeRole,
    options,
  } = params

  const input = newContractFormToRegistrationInput(form)
  const validation = validateContractRegistration(input)
  const isIncomplete = options?.incomplete === true || !validation.valid

  if (!isIncomplete && !validation.valid) {
    return {
      ok: false,
      reason: "validation",
      message: contractRegistrationErrorMessage(validation.missingLabels),
    }
  }

  const warnings: string[] = []
  const consumo = form.consumoAnual === "" ? 0 : Number(form.consumoAnual)
  const precioFijo = parseFloat(String(form.precioFijoConsumo).replace(",", "."))

  const marcoEntry = form.marcoEntryId
    ? marcoRetributivoCatalog.find((entry) => entry.id === form.marcoEntryId)
    : marcoRetributivoCatalog.find(
        (entry) =>
          entry.compania === form.compania &&
          entry.tarifa === form.tarifa &&
          entry.tipo === form.tipo
      )

  const comercialDefault =
    profiles.find((p) => p.role === "comercial" || p.role === "jefe_comercial") ||
    profiles[2]
  const sellerProfile =
    profiles.find((p) => p.id === activeUserId) ||
    profiles.find((p) => p.fullName === form.nombreComercial) ||
    profiles.find((p) => p.role === activeRole) ||
    comercialDefault
  const userAsSeller = sellerProfile

  const commissionPct = userAsSeller.commissionPercentage
  let internalMargin = consumo * (form.tipo === "luz" ? 0.01 : 0.008)
  let externalAdvisorMargin = internalMargin * (commissionPct / 100)

  if (marcoEntry) {
    const breakdown = computeComisionBreakdown(
      marcoEntry,
      commissionPct,
      consumo,
      formatCurrency
    )
    internalMargin = breakdown.comisionEmpresa
    externalAdvisorMargin = breakdown.comisionComercial
  }

  const activationDate = form.fechaInicio || new Date().toISOString().split("T")[0]
  const segmentContext = {
    tipoCliente: form.tipoCliente,
    compania: form.compania,
    clientName: form.clientName.trim(),
    nif: form.nif,
  }
  const renewalSchedule = aplicaRenovacionAnual(segmentContext)
    ? computeRenewalSchedule(activationDate)
    : { estadoRenovacion: "No aplica" as const }
  const fechaRenovacionStr = renewalSchedule.fechaRenovacion
  const diasRenovacion = renewalSchedule.diasRenovacion
  const estadoRenovacion = renewalSchedule.estadoRenovacion

  const direccionCliente = form.direccionFiscal
    ? `${form.direccionFiscal}${form.codigoPostal ? `, ${form.codigoPostal}` : ""}${form.poblacion ? ` ${form.poblacion}` : ""}`
    : form.direccionSuministro

  const { clients: clientsAfterUpsert, client: linkedClient } = upsertClient(clients, {
    nombre: form.clientName.trim() || "Pendiente de información",
    comercialId: userAsSeller.id,
    documento: form.nif,
    telefono: form.telefono,
    email: form.email,
    direccion: direccionCliente,
    codigoPostal: form.codigoPostal || undefined,
    ciudad: form.poblacion || undefined,
  })

  const potenciaStr =
    form.potenciaP1 || form.potenciaP2 || form.potenciaP3
      ? [
          form.potenciaP1,
          form.potenciaP2,
          form.potenciaP3,
          form.potenciaP4,
          form.potenciaP5,
          form.potenciaP6,
        ]
          .map((v, i) => (String(v).trim() ? `P${i + 1}: ${v} kW` : ""))
          .filter(Boolean)
          .join(" · ")
      : form.potenciaContratada

  const tipoPrecio =
    form.tipoPrecio ||
    (form.tarifa &&
    (form.tarifa.toLowerCase().includes("index") ||
      form.tarifa.toLowerCase().includes("variable") ||
      form.tarifa.toLowerCase().includes("pool"))
      ? "mercado"
      : form.tarifa
        ? "fijo"
        : "")

  const contractEstado = isIncomplete ? CONTRACT_ESTADO_INCOMPLETO : CONTRACT_ESTADO_INICIAL

  const newContractObj: Contract = {
    id: `con-${contracts.length + 1}`,
    clientId: linkedClient.id,
    clientName: form.clientName.trim() || "Pendiente de información",
    cups: form.cups ? form.cups.toUpperCase().trim() : "PENDIENTE",
    tipo: form.tipo,
    compania: form.compania,
    tarifa: form.tarifa,
    consumoAnual: consumo,
    montoInterno: Math.round(internalMargin * 100) / 100,
    montoExterno: Math.round(externalAdvisorMargin * 100) / 100,
    estado: contractEstado,
    comercialId: userAsSeller.id,
    comercialName: userAsSeller.fullName,
    createdAt: activationDate,
    fechaFin: fechaRenovacionStr,
    fechaRenovacion: fechaRenovacionStr,
    diasRenovacion,
    estadoRenovacion,
    nif: form.nif,
    telefono: form.telefono,
    email: form.email,
    iban: form.iban,
    direccionSuministro: form.direccionSuministro,
    direccionCompleta: form.direccionFiscal
      ? `${form.direccionFiscal}${form.codigoPostal ? `, ${form.codigoPostal}` : ""}${form.poblacion ? ` ${form.poblacion}` : ""}${form.provincia ? ` (${form.provincia})` : ""}`
      : undefined,
    potenciaContratada: potenciaStr,
    precioFijoConsumo: Number.isFinite(precioFijo) ? precioFijo : undefined,
    tipoPrecio:
      tipoPrecio === "fijo" || tipoPrecio === "mercado" ? tipoPrecio : undefined,
    documentos: (() => {
      const flat = flattenDocumentosPorTipo(form.documentosPorTipo)
      return flat.length > 0 ? flat : undefined
    })(),
    tipoCliente: form.tipoCliente,
    formaPago: form.formaPago,
    direccionFiscal: form.direccionFiscal || undefined,
    codigoPostal: form.codigoPostal || undefined,
    poblacion: form.poblacion || undefined,
    provincia: form.provincia || undefined,
    nombreComercial: form.nombreComercial || userAsSeller.fullName,
    jefeEquipo: form.jefeEquipo || undefined,
    comentariosInternos:
      form.comentariosInternos.length > 0 ? form.comentariosInternos : undefined,
    marcoEntryId: form.marcoEntryId || marcoEntry?.id || undefined,
    atr: marcoEntry?.peaje,
  }

  const supabaseResult = await contractsService.save(newContractObj, form)

  if (supabaseResult.ok) {
    newContractObj.id = supabaseResult.id

    if (options?.prospectoId) {
      const linkResult = await updateProspecto(options.prospectoId, {
        contratoEquipoId: supabaseResult.id,
      })
      if (linkResult.ok === false) {
        warnings.push("Contrato guardado pero no se pudo vincular al prospecto.")
      } else {
        const actResult = await createContratoCreadoActividad({
          prospectoId: options.prospectoId,
          comercialId: activeUserId,
          comercialName: activeUserName,
          contratoEquipoId: supabaseResult.id,
          clientName: form.clientName.trim() || undefined,
        })
        if (actResult.ok === false) {
          warnings.push("Contrato vinculado pero no se registró la actividad en timeline.")
        }
      }
    }
  } else if (supabaseResult.ok === false) {
    if (supabaseResult.reason === "not_configured") {
      warnings.push("Borrador guardado en la app. Supabase pendiente de configurar.")
    } else if (supabaseResult.reason === "table_missing") {
      warnings.push(
        "Contrato guardado en la app. Crea la tabla contratos_equipo en Supabase para persistir en base de datos."
      )
    } else {
      warnings.push(`Contrato guardado en la app. Supabase: ${supabaseResult.message}`)
    }
  }

  const contractsWithNew = [newContractObj, ...contracts]
  const syncedClients = syncClientEstados(clientsAfterUpsert, contractsWithNew)

  let settlement: Settlement | undefined
  if (!isIncomplete && internalMargin > 0) {
    settlement = {
      id: `liq-${params.settlements.length + 1}`,
      comercialId: userAsSeller.id,
      comercialName: userAsSeller.fullName,
      montoInterno: Math.round(internalMargin * 100) / 100,
      montoExterno: Math.round(externalAdvisorMargin * 100) / 100,
      estado: "pendiente",
      tipo: form.tipo,
      descripcion: `Comisión generada para contrato nuevo: ${form.clientName || "Sin nombre"}`,
      createdAt: new Date().toISOString().split("T")[0],
      contractId: newContractObj.id,
    }
  }

  return {
    ok: true,
    newContract: newContractObj,
    clients: syncedClients,
    contracts: contractsWithNew,
    settlement,
    isIncomplete,
    sellerName: userAsSeller.fullName,
    externalMargin: newContractObj.montoExterno,
    warnings,
  }
}
