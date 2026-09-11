import {
  CONTRACT_ESTADO_INCOMPLETO,
  CONTRACT_ESTADO_INICIAL,
} from "@/lib/contract-estado"
import type { NewContractFormState } from "@/lib/contract-registration"
import type { Contract } from "@/types/contract"

/**
 * Builds a provisional `Contract` row from the new-contract form so it can be
 * shown in the list immediately, before `createContractFromForm` resolves.
 * Only fields already known client-side are filled in; everything the real
 * creation flow computes (referencia, comisión, marco lookups, …) is left
 * out and arrives once the server response reconciles this row.
 */
export function buildOptimisticContractFromForm(
  form: NewContractFormState,
  context: { activeUserId: string; activeUserName: string; incomplete?: boolean }
): Contract {
  const now = new Date().toISOString()
  return {
    id: `optimistic-contract-${crypto.randomUUID()}`,
    clientName: form.clientName.trim(),
    cups: form.cups,
    tipo: form.tipo,
    compania: form.compania,
    tarifa: form.tarifa,
    consumoAnual: typeof form.consumoAnual === "number" ? form.consumoAnual : 0,
    montoInterno: 0,
    montoExterno: 0,
    estado: context.incomplete ? CONTRACT_ESTADO_INCOMPLETO : CONTRACT_ESTADO_INICIAL,
    comercialId: context.activeUserId,
    comercialName: context.activeUserName,
    nif: form.nif || undefined,
    telefono: form.telefono || undefined,
    email: form.email || undefined,
    nombreComercial: form.nombreComercial || undefined,
    createdAt: now,
    updatedAt: now,
  }
}
