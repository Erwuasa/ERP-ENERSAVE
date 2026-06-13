export function hasContractWizardDraft(form: {
  compania?: string
  clientName?: string
  cups?: string
  nif?: string
}): boolean {
  return Boolean(
    form.compania?.trim() ||
      form.clientName?.trim() ||
      form.cups?.trim() ||
      form.nif?.trim()
  )
}
