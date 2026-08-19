import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import type { Contract } from "@/types/contract"
import type { Client } from "@/types/client"
import type { Settlement } from "@/types/settlement"
import { syncClientEstados } from "@/lib/clients"
import { INITIAL_CRM } from "@/lib/erp/initial-crm-state"

import type { ContractsListFilter } from "@/lib/contract-renewal"

const INITIAL_SETTLEMENTS: Settlement[] = [
  {
    id: "liq-1",
    comercialId: "usr-3",
    comercialName: "Ignacio Ortiz",
    montoInterno: 240,
    montoExterno: 120,
    estado: "pagado",
    tipo: "luz",
    descripcion: "Comisión liquidada - ANA MARIA PINEDA BARRAGA",
    createdAt: "2026-06-02",
    contractId: "con-1",
  },
  {
    id: "liq-2",
    comercialId: "usr-3",
    comercialName: "Ignacio Ortiz",
    montoInterno: 380,
    montoExterno: 190,
    estado: "pendiente",
    tipo: "luz",
    descripcion: "Comisión pendiente - GEA CATERING, S.L.",
    createdAt: "2026-06-04",
    contractId: "con-2",
  },
]

interface ErpDataContextValue {
  contracts: Contract[]
  setContracts: Dispatch<SetStateAction<Contract[]>>
  clients: Client[]
  setClients: Dispatch<SetStateAction<Client[]>>
  settlements: Settlement[]
  setSettlements: Dispatch<SetStateAction<Settlement[]>>
  contractsSearchQuery: string
  setContractsSearchQuery: Dispatch<SetStateAction<string>>
  contractsListFilter: ContractsListFilter
  setContractsListFilter: Dispatch<SetStateAction<ContractsListFilter>>
  contractsUserFilterId: string
  setContractsUserFilterId: Dispatch<SetStateAction<string>>
  highlightContractId: string | null
  setHighlightContractId: Dispatch<SetStateAction<string | null>>
}

const ErpDataContext = createContext<ErpDataContextValue | null>(null)

export function ErpDataProvider({ children }: { children: ReactNode }) {
  const [clients, setClients] = useState<Client[]>(INITIAL_CRM.clients)
  const [contracts, setContracts] = useState<Contract[]>(INITIAL_CRM.contracts)
  const [settlements, setSettlements] = useState<Settlement[]>(INITIAL_SETTLEMENTS)
  const [contractsSearchQuery, setContractsSearchQuery] = useState("")
  const [contractsListFilter, setContractsListFilter] =
    useState<ContractsListFilter>("all")
  const [contractsUserFilterId, setContractsUserFilterId] = useState("all")
  const [highlightContractId, setHighlightContractId] = useState<string | null>(
    null
  )

  useEffect(() => {
    setClients((prev) => syncClientEstados(prev, contracts))
  }, [contracts])

  useEffect(() => {
    if (!highlightContractId) return
    const timer = setTimeout(() => setHighlightContractId(null), 10000)
    return () => clearTimeout(timer)
  }, [highlightContractId])

  const value = useMemo(
    () => ({
      contracts,
      setContracts,
      clients,
      setClients,
      settlements,
      setSettlements,
      contractsSearchQuery,
      setContractsSearchQuery,
      contractsListFilter,
      setContractsListFilter,
      contractsUserFilterId,
      setContractsUserFilterId,
      highlightContractId,
      setHighlightContractId,
    }),
    [
      contracts,
      clients,
      settlements,
      contractsSearchQuery,
      contractsListFilter,
      contractsUserFilterId,
      highlightContractId,
    ]
  )

  return <ErpDataContext.Provider value={value}>{children}</ErpDataContext.Provider>
}

export function useErpData(): ErpDataContextValue {
  const ctx = useContext(ErpDataContext)
  if (!ctx) {
    throw new Error("useErpData debe usarse dentro de ErpDataProvider")
  }
  return ctx
}
