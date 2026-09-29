import { useEffect, useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import type { Contract } from "@/types/contract"
import type { ContractsTeamScope } from "@/lib/contract-visibility"

function readSeenIds(storageKey: string): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.filter((id): id is string => typeof id === "string"))
  } catch {
    return new Set()
  }
}

function writeSeenIds(storageKey: string, ids: string[]) {
  localStorage.setItem(storageKey, JSON.stringify(ids))
}

export function useJefeTeamContractAlerts(input: {
  activeRole: string
  activeUserId: string
  teamMemberIds: string[]
  contracts: Contract[]
  teamScope: ContractsTeamScope
}) {
  const storageKey = `jefe-team-seen-contracts-${input.activeUserId}`
  const hydratedRef = useRef(false)
  const prevIdsRef = useRef<Set<string>>(new Set())
  const [unseenTeamCount, setUnseenTeamCount] = useState(0)

  const teamContracts = useMemo(
    () =>
      input.contracts.filter((contract) =>
        input.teamMemberIds.includes(contract.comercialId)
      ),
    [input.contracts, input.teamMemberIds]
  )

  useEffect(() => {
    if (input.activeRole !== "jefe_comercial") {
      setUnseenTeamCount(0)
      return
    }

    const seen = readSeenIds(storageKey)
    const unseen = teamContracts.filter((contract) => !seen.has(contract.id))
    setUnseenTeamCount(unseen.length)
  }, [input.activeRole, storageKey, teamContracts])

  useEffect(() => {
    if (input.activeRole !== "jefe_comercial") return

    const prev = prevIdsRef.current
    const currentIds = new Set(input.contracts.map((contract) => contract.id))

    if (hydratedRef.current) {
      for (const contract of input.contracts) {
        if (prev.has(contract.id)) continue
        if (!input.teamMemberIds.includes(contract.comercialId)) continue
        if (contract.comercialId === input.activeUserId) continue
        toast.info(
          `Nuevo contrato de ${contract.comercialName || "tu equipo"}: ${contract.clientName}`,
          { duration: 6000 }
        )
      }
    } else {
      hydratedRef.current = true
    }

    prevIdsRef.current = currentIds
  }, [input.contracts, input.activeRole, input.activeUserId, input.teamMemberIds])

  useEffect(() => {
    if (input.activeRole !== "jefe_comercial") return
    if (input.teamScope !== "team") return

    const ids = teamContracts.map((contract) => contract.id)
    writeSeenIds(storageKey, ids)
    setUnseenTeamCount(0)
  }, [input.activeRole, input.teamScope, storageKey, teamContracts])

  function markTeamContractsSeen() {
    const ids = teamContracts.map((contract) => contract.id)
    writeSeenIds(storageKey, ids)
    setUnseenTeamCount(0)
  }

  return { unseenTeamCount, markTeamContractsSeen }
}
