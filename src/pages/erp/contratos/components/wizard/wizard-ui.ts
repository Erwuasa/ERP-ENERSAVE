import type { NewContractFormState, TipoClienteContrato, WizardStep } from "@/lib/contract-registration"

export const WIZARD_INPUT_CLASS =
  "w-full px-3 py-2 bg-brand-surface border border-brand-border rounded-lg text-xs focus:ring-1 focus:ring-cyan-500 text-brand-text"

export const WIZARD_LABEL_CLASS = "block text-[10px] font-mono text-brand-subtext uppercase mb-1"

export const WIZARD_READ_ONLY_FIELD_CLASS =
  "w-full px-3 py-2 bg-slate-100 dark:bg-brand-surface border border-brand-border rounded-lg text-xs text-brand-text font-medium cursor-default"

export const FORMA_PAGO_LABELS: Record<NewContractFormState["formaPago"], string> = {
  al_contado: "Al contado",
  cheque_bancario: "Cheque bancario",
  recibo_bancario: "Recibo bancario",
  tarjeta_credito: "Tarjeta de crédito",
}

export const TIPO_CLIENTE_OPTIONS: { value: TipoClienteContrato; label: string }[] = [
  { value: "residencial", label: "Residencial" },
  { value: "pyme", label: "PYME" },
  { value: "autonomo", label: "Autónomo" },
  { value: "comunidad_vecinos", label: "Comunidad de vecinos" },
]

export const WIZARD_TABS: { id: Exclude<WizardStep, 1>; label: string }[] = [
  { id: "cliente", label: "Datos del cliente" },
  { id: "suministro", label: "Datos del suministro" },
  { id: "documentos", label: "Archivos y documentos" },
]

export function tipoClienteChipLabel(tipo: TipoClienteContrato): string {
  if (tipo === "pyme") return "Empresa"
  if (tipo === "autonomo") return "Autónomo"
  if (tipo === "comunidad_vecinos") return "Comunidad"
  return "Particular"
}
