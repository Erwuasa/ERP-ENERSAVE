import { createContext, useContext } from "react"
import type { ContractActionsValue } from "@/pages/erp/contratos/hooks/useContractActions"

export const ContractActionsContext = createContext<ContractActionsValue | null>(null)

export function useContractActionsContext(): ContractActionsValue {
  const ctx = useContext(ContractActionsContext)
  if (!ctx) {
    throw new Error("useContractActionsContext debe usarse dentro de ContractActionsProvider")
  }
  return ctx
}
