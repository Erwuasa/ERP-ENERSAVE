import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useOptimistic,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react"
import type { Contract } from "@/types/contract"
import type { Client } from "@/types/client"
import type { Settlement } from "@/types/settlement"
import {
  buildClientsFromContracts,
  dedupeClients,
  dedupeContracts,
  linkContractsToClients,
  mergeErpCrmState,
  syncClientEstados,
} from "@/lib/clients"
import { INITIAL_CRM } from "@/lib/erp/initial-crm-state"
import {
  getCachedProviderByAtCompanyId,
  listTeamContracts,
  mapRowToContract,
} from "@/lib/supabase/contracts"
import { mapRowToClient } from "@/lib/supabase/clientes"
import { getSupabaseClient } from "@/lib/supabase/client"
import type { Row } from "@/lib/supabase/result"
import { listClientes } from "@/lib/supabase/clientes"
import { listSettlements } from "@/lib/supabase/settlements"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { subscribeSettlementsChanges } from "@/lib/settlements-realtime"
import type { SupabaseFailure, SupabaseResult } from "@/lib/supabase/result"
import { toast } from "sonner"
import {
  applyContractOptimisticAction,
  type ContractOptimisticAction,
} from "@/lib/erp/contract-optimistic-actions"
import {
  applyClientOptimisticAction,
  type ClientOptimisticAction,
} from "@/lib/clients-optimistic-actions"

import type { ContractsListFilter } from "@/lib/contract-renewal"
import type { ClawbackPendingContract } from "@/lib/erp/contract-clawback"

const INITIAL_PENDING_CONTRACTS: ClawbackPendingContract[] = []

const INITIAL_SETTLEMENTS: Settlement[] = []

interface ErpDataContextValue {
  /** Optimistic-derived: reflects pending local edits before the server confirms them. */
  contracts: Contract[]
  /** Raw setter — writes the authoritative state `contracts` is derived from. */
  setContracts: Dispatch<SetStateAction<Contract[]>>
  /** Show a pending change immediately; auto-reverts if the surrounding transition ends without a matching `setContracts` call. */
  addOptimisticContract: (action: ContractOptimisticAction) => void
  /** Optimistic-derived: reflects pending local edits before the server confirms them. */
  clients: Client[]
  /** Raw setter — writes the authoritative state `clients` is derived from. */
  setClients: Dispatch<SetStateAction<Client[]>>
  /** Show a pending change immediately; auto-reverts if the surrounding transition ends without a matching `setClients` call. */
  addOptimisticClient: (action: ClientOptimisticAction) => void
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
  /** True while the initial contracts/clients/settlements fetch is in flight. */
  erpDataLoading: boolean
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
  const [erpDataLoading, setErpDataLoading] = useState(() => isSupabaseConfigured())
  const [optimisticContracts, addOptimisticContract] = useOptimistic(
    contracts,
    applyContractOptimisticAction
  )
  const [optimisticClients, addOptimisticClient] = useOptimistic(
    clients,
    applyClientOptimisticAction
  )

  useEffect(() => {
    setClients((prevClients) => {
      const { clients: mergedClients, contracts: linkedContracts } = mergeErpCrmState(
        prevClients,
        contracts
      )

      const prevClientIds = new Map(prevClients.map((client) => [client.id, client.estado]))
      const clientsUnchanged =
        mergedClients.length === prevClients.length &&
        mergedClients.every(
          (client) => prevClientIds.get(client.id) === client.estado
        )

      const prevContractLinks = new Map(contracts.map((contract) => [contract.id, contract.clientId]))
      const needsLink = linkedContracts.some(
        (contract) => contract.clientId !== prevContractLinks.get(contract.id)
      )

      if (needsLink) {
        queueMicrotask(() => {
          setContracts((prevContracts) => mergeErpCrmState(mergedClients, prevContracts).contracts)
        })
      }

      return clientsUnchanged ? prevClients : mergedClients
    })
  }, [contracts, setClients, setContracts])

  useEffect(() => {
    if (!highlightContractId) return
    const timer = setTimeout(() => setHighlightContractId(null), 10000)
    return () => clearTimeout(timer)
  }, [highlightContractId])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    let cancelled = false

    void (async () => {
      const [contractsResult, clientsResult, settlementsResult] = await Promise.all([
        listTeamContracts(),
        listClientes(),
        listSettlements(),
      ])
      if (cancelled) return

      const missing: string[] = []
      const errors: string[] = []

      function unwrap<T>(result: SupabaseResult<T[]>, table: string): T[] | null {
        if (result.ok === true) return result.data
        const failure = result as SupabaseFailure
        if (failure.reason === "table_missing") missing.push(table)
        else errors.push(`${table}: ${failure.message}`)
        return null
      }

      const loadedContracts = unwrap(contractsResult, "contratos_equipo")
      const loadedClients = unwrap(clientsResult, "clientes")
      const loadedSettlements = unwrap(settlementsResult, "settlements")
      const effectiveClients =
        loadedClients ?? (loadedContracts ? buildClientsFromContracts(loadedContracts) : null)

      if (loadedContracts && effectiveClients) {
        const merged = mergeErpCrmState(effectiveClients, loadedContracts)
        setClients(merged.clients)
        setContracts(merged.contracts)
      } else if (effectiveClients) {
        setClients(syncClientEstados(effectiveClients, loadedContracts ?? []))
        if (loadedContracts) setContracts(loadedContracts)
      } else if (loadedContracts) {
        setClients(buildClientsFromContracts(loadedContracts))
        setContracts(linkContractsToClients(loadedContracts, buildClientsFromContracts(loadedContracts)))
      } else if (isSupabaseConfigured()) {
        setClients([])
        setContracts([])
      }
      if (loadedSettlements) setSettlements(loadedSettlements)

      if (missing.length > 0) {
        toast.warning(
          `Faltan tablas en Supabase (${missing.join(", ")}). Contratos y clientes vacíos hasta que se configure la BD.`
        )
      }
      if (errors.length > 0) toast.warning(`No se pudieron cargar algunos datos. ${errors.join(" · ")}`)
      if (!cancelled) setErpDataLoading(false)
    })()

    return () => {
      cancelled = true
    }
    // Carga inicial de sesión; no reaccionar a mutations locales.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    const supabase = getSupabaseClient()
    if (!supabase) return

    const channel = supabase
      .channel("erp-crm-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "contratos_equipo" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Row | null
          if (!row?.id) return

          if (payload.eventType === "DELETE") {
            setContracts((prev) => prev.filter((c) => c.id !== String(row.id)))
            return
          }

          const contract = mapRowToContract(row, getCachedProviderByAtCompanyId())
          setContracts((prev) => {
            const index = prev.findIndex((c) => c.id === contract.id)
            if (index === -1) return dedupeContracts([contract, ...prev])
            const next = [...prev]
            next[index] = contract
            return dedupeContracts(next)
          })
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clientes" },
        (payload) => {
          const row = (payload.new ?? payload.old) as Row | null
          if (!row?.id) return

          if (payload.eventType === "DELETE") {
            setClients((prev) => prev.filter((c) => c.id !== String(row.id)))
            return
          }

          const client = mapRowToClient(row)
          setClients((prev) => {
            const index = prev.findIndex((c) => c.id === client.id)
            const next = index === -1 ? [client, ...prev] : prev.map((item, i) => (i === index ? client : item))
            const { clients: unique, idMap } = dedupeClients(next)
            const remapped = [...idMap.entries()].some(([from, to]) => from !== to)
            if (remapped) {
              queueMicrotask(() => {
                setContracts((prevContracts) =>
                  dedupeContracts(
                    prevContracts.map((contract) => {
                      const mappedId = contract.clientId ? idMap.get(contract.clientId) : undefined
                      return mappedId && mappedId !== contract.clientId
                        ? { ...contract, clientId: mappedId }
                        : contract
                    })
                  )
                )
              })
            }
            return unique
          })
        }
      )
      .subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const unsubscribe = subscribeSettlementsChanges(({ event, settlement }) => {
      setSettlements((prev) => {
        if (event === "DELETE") {
          return prev.filter((item) => item.id !== settlement.id)
        }

        const index = prev.findIndex((item) => item.id === settlement.id)
        if (index === -1) return [settlement, ...prev]

        const next = [...prev]
        next[index] = settlement
        return next
      })
    })

    return unsubscribe ?? undefined
  }, [])

  const value = useMemo(
    () => ({
      contracts: optimisticContracts,
      setContracts,
      addOptimisticContract,
      clients: optimisticClients,
      setClients,
      addOptimisticClient,
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
      erpDataLoading,
    }),
    [
      optimisticContracts,
      addOptimisticContract,
      optimisticClients,
      addOptimisticClient,
      settlements,
      contractsSearchQuery,
      contractsListFilter,
      contractsUserFilterId,
      highlightContractId,
      pendingContracts,
      erpDataLoading,
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
