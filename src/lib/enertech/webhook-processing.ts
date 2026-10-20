export interface WebhookProcessingResult {
  processed: boolean
  note: string
}

export interface WebhookProcessingInput {
  estadoLabel: string | null
  mapped: boolean
  idContract: number | null
  cups: string | null
  localContractId: string | null
  updateFailed?: boolean
}

function notFoundNote(input: WebhookProcessingInput): string {
  if (input.idContract) return `contrato Enertech ${input.idContract} no encontrado`
  if (input.cups) return `CUPS ${input.cups} sin contrato local`
  return "contrato no encontrado"
}

/** What the inbound log stores after a signed webhook is applied. */
export function describeWebhookProcessing(input: WebhookProcessingInput): WebhookProcessingResult {
  const label = input.estadoLabel?.trim() ?? ""
  if (!label || !input.localContractId) {
    return { processed: false, note: notFoundNote(input) }
  }
  if (input.updateFailed) {
    return { processed: false, note: `no se pudo guardar el estado en ${input.localContractId}` }
  }
  if (!input.mapped) {
    // Contract was found and Enertech ID saved, but estado couldn't be mapped to ERP domain
    return { processed: true, note: `id guardado en ${input.localContractId}; estado "${label}" no mapea al ERP` }
  }
  return { processed: true, note: `estado aplicado a ${input.localContractId}` }
}

export interface InboundAppliedBadge {
  label: string
  tone: "ok" | "problem" | "pending"
  detail: string | null
}

export function inboundAppliedBadge(input: {
  signatureValid: boolean
  processed: boolean
  processingNote: string | null
}): InboundAppliedBadge {
  if (!input.signatureValid) {
    return { label: "Firma inválida", tone: "problem", detail: input.processingNote }
  }
  if (input.processed) {
    return { label: "Aplicado", tone: "ok", detail: input.processingNote }
  }
  if (input.processingNote) {
    return { label: "No aplicado", tone: "problem", detail: input.processingNote }
  }
  return { label: "Pendiente", tone: "pending", detail: null }
}

export function isInboundProblem(input: { signatureValid: boolean; processed: boolean }): boolean {
  return !input.signatureValid || !input.processed
}
