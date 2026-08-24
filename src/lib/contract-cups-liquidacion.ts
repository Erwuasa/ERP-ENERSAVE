import { stripWhitespaceOnPaste } from "./paste-format"
import { getDiasRestantesRetro, getFechaFinRetro, getRetroMonths } from "./retro-period"
import { isRetrocomisionSettlement } from "./liquidaciones-internas"
import { isContractActivado } from "./contract-estado"
import { splitClientNameToParts, type NewContractFormState } from "./contract-registration"
import type { Client } from "../types/client"
import type { Contract } from "../types/contract"
import type { Settlement } from "../types/settlement"

export interface ActiveRetroContext {
  contract: Contract
  diasRestantes: number
  fechaFin: Date
}

export interface ClientContractMatchInput {
  clientId?: string
  nif?: string
  clientName?: string
}

function normalizeMatchText(value: string | undefined): string {
  return (value ?? "").trim().toUpperCase()
}

export function findRelatedContractsForClient(
  input: ClientContractMatchInput,
  contracts: Contract[],
  excludeContractId?: string
): Contract[] {
  const nif = normalizeMatchText(input.nif)
  const name = normalizeMatchText(input.clientName)

  return contracts
    .filter((contract) => {
      if (excludeContractId && contract.id === excludeContractId) return false
      if (input.clientId && contract.clientId === input.clientId) return true
      if (nif && normalizeMatchText(contract.nif) === nif) return true
      if (name && normalizeMatchText(contract.clientName) === name) return true
      return false
    })
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

export function findActiveRetroForClientContracts(
  input: ClientContractMatchInput,
  contracts: Contract[],
  excludeContractId?: string
): ActiveRetroContext | null {
  for (const contract of findRelatedContractsForClient(
    input,
    contracts,
    excludeContractId
  )) {
    if (!isContractActivado(contract.estado)) continue
    const diasRestantes = getDiasRestantesRetro(contract)
    if (diasRestantes <= 0) continue
    return {
      contract,
      diasRestantes,
      fechaFin: getFechaFinRetro(contract),
    }
  }
  return null
}

export function formatRetroFinDate(fecha: Date): string {
  return fecha.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
}

export function activeRetroWarningMessage(context: ActiveRetroContext): string {
  return `Este cliente tiene un contrato en periodo de retrocomisión hasta el ${formatRetroFinDate(context.fechaFin)} — el nuevo contrato se liquidará como retrocomisión activa, no como venta nueva.`
}

export interface CupsLiquidacionLine {
  id: string
  tone: "neutral" | "success" | "warning" | "danger"
  text: string
}

export interface CupsLiquidacionAnalysis {
  matchingContracts: Contract[]
  lines: CupsLiquidacionLine[]
  hasRetroRisk: boolean
}

export function normalizeCups(cups: string): string {
  return stripWhitespaceOnPaste(cups).toUpperCase()
}

export function findContractsByCups(
  cups: string,
  contracts: Contract[],
  excludeContractId?: string
): Contract[] {
  const normalized = normalizeCups(cups)
  if (!normalized || normalized === "PENDIENTE") return []

  return contracts.filter(
    (contract) =>
      contract.id !== excludeContractId &&
      normalizeCups(contract.cups) === normalized
  )
}

export function analyzeCupsLiquidacion(
  cups: string,
  contracts: Contract[],
  settlements: Settlement[],
  options?: {
    excludeContractId?: string
    formatCurrency?: (value: number) => string
  }
): CupsLiquidacionAnalysis {
  const formatCurrency =
    options?.formatCurrency ??
    ((value: number) =>
      new Intl.NumberFormat("es-ES", {
        style: "currency",
        currency: "EUR",
        maximumFractionDigits: 0,
      }).format(value))

  const matchingContracts = findContractsByCups(
    cups,
    contracts,
    options?.excludeContractId
  )

  const lines: CupsLiquidacionLine[] = []
  let hasRetroRisk = false

  for (const contract of matchingContracts) {
    const settlement = settlements.find(
      (row) =>
        row.contractId === contract.id &&
        !isRetrocomisionSettlement(row)
    )

    if (settlement) {
      const paid = settlement.estado === "pagado"
      lines.push({
        id: `${contract.id}-liq`,
        tone: paid ? "success" : "warning",
        text: paid
          ? `Comisión ya cobrada (${contract.compania} · ${contract.tarifa}): ${formatCurrency(settlement.montoExterno)}`
          : `Liquidación ${settlement.estado} (${contract.compania}): ${formatCurrency(settlement.montoExterno)}`,
      })
    } else if (contract.montoExterno > 0) {
      lines.push({
        id: `${contract.id}-est`,
        tone: "neutral",
        text: `Comisión estimada del contrato (${contract.estado}): ${formatCurrency(contract.montoExterno)}`,
      })
    }

    const retroSettlement = settlements.find(
      (row) => row.contractId === contract.id && isRetrocomisionSettlement(row)
    )
    if (retroSettlement) {
      lines.push({
        id: `${contract.id}-retro-done`,
        tone: "danger",
        text: `Retrocomisión registrada: ${formatCurrency(retroSettlement.montoExterno)}`,
      })
      hasRetroRisk = true
    }

    const diasRetro = getDiasRestantesRetro(contract)
    const { meses, estimado } = getRetroMonths(contract.compania)
    const activo = isContractActivado(contract.estado)

    if (activo && diasRetro > 0) {
      hasRetroRisk = true
      lines.push({
        id: `${contract.id}-retro-open`,
        tone: "danger",
        text: `Contrato activo en periodo de retro (${diasRetro} días restantes de ${meses}${estimado ? ", plazo estimado" : ""}). Un nuevo contrato sobre el mismo CUPS puede generar retrocomisión.`,
      })
    }
  }

  return { matchingContracts, lines, hasRetroRisk }
}

export function buildClientContractAutofillPatch(
  client: Client,
  contracts: Contract[]
): Partial<NewContractFormState> {
  const related = findRelatedContractsForClient(
    {
      clientId: client.id,
      nif: client.documento,
      clientName: client.nombre,
    },
    contracts
  )

  const latest = related[0]
  const { clientNombre, clientApellidos } = splitClientNameToParts(client.nombre)

  const patch: Partial<NewContractFormState> = {
    clientName: client.nombre,
    clientNombre,
    clientApellidos,
    nif: client.documento ?? latest?.nif ?? "",
    telefono: client.telefono ?? latest?.telefono ?? "",
    email: client.email ?? latest?.email ?? "",
    codigoPostal: client.codigoPostal ?? latest?.codigoPostal ?? "",
    poblacion: client.ciudad ?? latest?.poblacion ?? "",
    provincia: latest?.provincia ?? "",
    direccionFiscal: client.direccion ?? latest?.direccionFiscal ?? "",
    direccionSuministro:
      latest?.direccionSuministro ?? client.direccion ?? "",
    tipoCliente:
      client.tipoCliente === "empresa"
        ? "pyme"
        : latest?.tipoCliente === "pyme"
          ? "pyme"
          : "residencial",
    razonSocial: client.tipoCliente === "empresa" ? client.nombre : "",
  }

  if (latest) {
    patch.cups = latest.cups
    patch.iban = latest.iban ?? ""
    patch.consumoAnual =
      latest.consumoAnualManual ?? latest.consumoAnual ?? ""
    patch.tipo = latest.tipo
  }

  return patch
}
