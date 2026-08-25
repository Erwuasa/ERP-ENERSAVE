import { type ReactNode } from "react"
import {
  useContractActions,
  type ContractActionsValue,
  type UseContractActionsOptions,
} from "@/pages/erp/contratos/hooks/useContractActions"
import { ContractActionsHost } from "@/pages/erp/contratos/components/ContractActionsHost"
import { ContractActionsContext } from "@/providers/contract-actions-context"

export { useContractActionsContext } from "@/providers/contract-actions-context"

export function ContractActionsProvider({
  children,
  ...options
}: UseContractActionsOptions & { children: ReactNode }) {
  const value = useContractActions(options)

  return (
    <ContractActionsContext.Provider value={value}>
      {children}
      <ContractActionsHost actions={value} />
    </ContractActionsContext.Provider>
  )
}

export type { ContractActionsValue }
