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
import type { ClawbackPendingContract } from "@/lib/erp/contract-clawback"

const INITIAL_PENDING_CONTRACTS: ClawbackPendingContract[] = [
  {
    id: "pcon-1",
    code: "04AE54BBX",
    cups: "ES875404715066446",
    dateFirm: "28-abr-2025",
    dateAct: "13-may-2025",
    direction: "Calle Mayor 53 , Barcelona 25006",
    agentId: "staff-ignacio",
    agentName: "Ignacio Ortiz",
    brand: "Niba",
    tariff: "Tarifa 2.0TD",
    price: 150.0,
    checked: false,
    clientName: "Suministros Pérez",
    tipo: "luz",
  },
  {
    id: "pcon-2",
    code: "EC900F84X",
    cups: "ES963107157423318",
    dateFirm: "04-jun-2025",
    dateAct: "19-jun-2025",
    direction: "Calle Mayor 7 , Barcelona 33367",
    agentId: "staff-marta",
    agentName: "Marta Rivas",
    brand: "Global Connect",
    tariff: "Tarifa 2.0TD",
    price: 50.0,
    checked: false,
    clientName: "Clínica Dental Les Corts",
    tipo: "luz",
  },
  {
    id: "pcon-3",
    code: "F5264AD0X",
    cups: "ES94130653587045",
    dateFirm: "28-jun-2025",
    dateAct: "13-jul-2025",
    direction: "Calle Mayor 54 , Barcelona 9297",
    agentId: "staff-ignacio",
    agentName: "Ignacio Ortiz",
    brand: "Niba",
    tariff: "Tarifa 3.0TD",
    price: 230.0,
    checked: true,
    clientName: "Panadería Barcelona",
    tipo: "gas",
  },
  {
    id: "pcon-4",
    code: "79B45E63X",
    cups: "ES727908497439937",
    dateFirm: "17-jul-2025",
    dateAct: "01-ago-2025",
    direction: "Calle Mayor 35 , Barcelona 11367",
    agentId: "staff-santiago",
    agentName: "Santiago Cano",
    brand: "Axpo",
    tariff: "Tarifa 3.0TD",
    price: 230.0,
    checked: false,
    clientName: "Restaurante El Celler",
    tipo: "luz",
  },
  {
    id: "pcon-5",
    code: "A828A291A",
    cups: "ES102983719283712",
    dateFirm: "02-ago-2025",
    dateAct: "15-ago-2025",
    direction: "Gran Via 122, Madrid 28008",
    agentId: "staff-elena",
    agentName: "Elena Garrido",
    brand: "Endesa",
    tariff: "Tarifa Fija Pyme",
    price: 180.0,
    checked: false,
    clientName: "Talleres Mecánicos Gran Vía",
    tipo: "luz",
  },
]

const INITIAL_SETTLEMENTS: Settlement[] = [
  {
    id: "liq-1",
    comercialId: "staff-ignacio",
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
    comercialId: "staff-ignacio",
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
  pendingContracts: ClawbackPendingContract[]
  setPendingContracts: Dispatch<SetStateAction<ClawbackPendingContract[]>>
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
  const [pendingContracts, setPendingContracts] = useState<ClawbackPendingContract[]>(
    INITIAL_PENDING_CONTRACTS
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
      pendingContracts,
      setPendingContracts,
    }),
    [
      contracts,
      clients,
      settlements,
      contractsSearchQuery,
      contractsListFilter,
      contractsUserFilterId,
      highlightContractId,
      pendingContracts,
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
