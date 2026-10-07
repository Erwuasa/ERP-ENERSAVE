import type { NewContractFormState } from "@/lib/contract-registration"

export function hasContractWizardDraft(form: {
  compania?: string
  clientName?: string
  clientNombre?: string
  cups?: string
  nif?: string
  tarifa?: string
  wizardStep?: NewContractFormState["wizardStep"]
}): boolean {
  return Boolean(
    form.compania?.trim() ||
      form.clientName?.trim() ||
      form.clientNombre?.trim() ||
      form.cups?.trim() ||
      form.nif?.trim() ||
      form.tarifa?.trim() ||
      (form.wizardStep != null && form.wizardStep !== 1)
  )
}
