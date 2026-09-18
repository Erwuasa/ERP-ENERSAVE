import { isWizardCompaniaAllowedForSegment } from "./wizard-compania-segment"

export function allowsComparadorProviderForSegment(
  providerName: string,
  segmento: "residencial" | "pyme"
): boolean {
  return isWizardCompaniaAllowedForSegment(providerName, segmento)
}
