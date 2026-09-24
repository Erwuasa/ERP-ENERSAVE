import type { Contract } from "../types/contract"

export type ContractsTeamScope = "own" | "team"

export type ContractAccessRole =
  | "superadmin"
  | "jefe_comercial"
  | "comercial"
  | "tramitacion"

/** Superadmin y tramitación mutan todo. Comercial y jefe, solo sus contratos. */
export function canUserMutateContract(
  contract: Pick<Contract, "comercialId">,
  activeRole: ContractAccessRole,
  activeUserId: string
): boolean {
  if (activeRole === "superadmin" || activeRole === "tramitacion") return true
  return contract.comercialId === activeUserId
}

export function resolveVisibleContracts(input: {
  contracts: Contract[]
  activeRole: ContractAccessRole
  activeUserId: string
  teamMemberIds: string[]
  currentMenuTab: string
  showOpsUserFilter: boolean
  userFilterId: string
  teamScope: ContractsTeamScope
}): Contract[] {
  const own = input.contracts.filter((contract) => contract.comercialId === input.activeUserId)
  const team = input.contracts.filter(
    (contract) =>
      contract.comercialId === input.activeUserId ||
      input.teamMemberIds.includes(contract.comercialId)
  )

  if (input.currentMenuTab === "Mis Contratos" || input.activeRole === "comercial") {
    return own
  }

  if (input.activeRole === "jefe_comercial") {
    const pool = input.teamScope === "team" ? team : own
    if (input.userFilterId !== "all") {
      return pool.filter((contract) => contract.comercialId === input.userFilterId)
    }
    return pool
  }

  if (input.activeRole === "superadmin") {
    if (input.showOpsUserFilter) {
      if (input.userFilterId !== "all") {
        return input.contracts.filter((contract) => contract.comercialId === input.userFilterId)
      }
      return input.contracts
    }

    const pool = input.teamScope === "team" ? input.contracts : own
    if (input.userFilterId !== "all") {
      return pool.filter((contract) => contract.comercialId === input.userFilterId)
    }
    return pool
  }

  if (input.activeRole === "tramitacion") {
    if (input.userFilterId !== "all") {
      return input.contracts.filter((contract) => contract.comercialId === input.userFilterId)
    }
    return input.contracts
  }

  return input.contracts
}
