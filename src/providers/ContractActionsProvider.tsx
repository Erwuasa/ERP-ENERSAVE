import {
  createContext,
  useContext,
  type ReactNode,
} from "react"
import {
  useContractActions,
  type ContractActionsValue,
  type UseContractActionsOptions,
} from "@/pages/erp/contratos/hooks/useContractActions"
import { ContractActionsHost } from "@/pages/erp/contratos/components/ContractActionsHost"

const ContractActionsContext = createContext<ContractActionsValue | null>(null)

export function ContractActionsProvider({
  children,
  ...options
}: UseContractActionsOptions & { children: ReactNode }) {
  const value = useContractActions(options)

  return (
    <ContractActionsContext.Provider value={value}>
      {children}
      <ContractActionsHost />
    </ContractActionsContext.Provider>
  )
}

export function useContractActionsContext(): ContractActionsValue {
  const ctx = useContext(ContractActionsContext)
  if (!ctx) {
    throw new Error("useContractActionsContext debe usarse dentro de ContractActionsProvider")
  }
  return ctx
}
