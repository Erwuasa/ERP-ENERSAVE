// Mirror of src/lib/enertech/webhook-processing.ts.

export interface WebhookProcessingResult {
  processed: boolean
  note: string
}

export function describeWebhookProcessing(input: {
  estadoLabel: string | null
  mapped: boolean
  idContract: number | null
  cups: string | null
  localContractId: string | null
  updateFailed?: boolean
}): WebhookProcessingResult {
  const label = input.estadoLabel?.trim() ?? ''
  if (!label || !input.localContractId) {
    if (input.idContract) return { processed: false, note: `contrato Enertech ${input.idContract} no encontrado` }
    if (input.cups) return { processed: false, note: `CUPS ${input.cups} sin contrato local` }
    return { processed: false, note: 'contrato no encontrado' }
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
