/** Payload público filtrado de la Edge `ai-assistant` (contrato estable). */
export interface InvoiceAiPublicPayload {
  status?: "started" | "done" | "error"
  message?: string
  contractId?: string | null
  billCategory?: string
  supplyType?: string
  segment?: string
  companyBrand?: string
  companyProviderId?: string
  gasCategory?: string
  electricityCategory?: string
  tariffType?: string
  invoiceDays?: number
  billingPeriod?: { from?: string; to?: string }
  powerKwByPeriod?: number[]
  energyKwhByPeriod?: number[]
  powerCostEur?: number
  energyCostEur?: number
  meterRentalAmount?: number
  socialBonusCostEur?: number
  financingSocialBonusAmount?: number
  otherCosts?: number
  miscInvoiceCharges?: { name: string; costEur: number }[]
  extraServices?: { name?: string; costEur?: number }[] | null
  totalAmountEur?: number
  electricityTaxRegime?: string
  invoiceDate?: string
  consumptionFromProfile?: boolean
  cups?: string
  holderName?: string
  holderNif?: string
  holderId?: { type?: string; value?: string }
  supplyAddress?: Record<string, unknown>
  iban?: string
  contact?: { email?: string; phone?: string }
}
