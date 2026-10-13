import { WIZARD_REQUIRED_MARK_CLASS } from "@/pages/erp/contratos/components/wizard/wizard-ui"

export function WizardRequiredMark() {
  return (
    <>
      <span className={WIZARD_REQUIRED_MARK_CLASS} aria-hidden>
        {" "}
        *
      </span>
      <span className="sr-only"> obligatorio</span>
    </>
  )
}
