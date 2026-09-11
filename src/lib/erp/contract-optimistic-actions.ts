import type { Contract } from "@/types/contract"

/**
 * Actions applied by the `useOptimistic` reducer wrapping `contracts` in
 * `ErpDataProvider`. Kept as plain data + a pure reducer (rather than inline
 * `setContracts` calls) so it's usable from any mutation hook and unit
 * testable without React.
 */
export type ContractOptimisticAction =
  | { type: "patch"; id: string; changes: Partial<Contract> }
  | { type: "insert"; contract: Contract }
  | { type: "remove"; id: string }

export function applyContractOptimisticAction(
  state: Contract[],
  action: ContractOptimisticAction
): Contract[] {
  switch (action.type) {
    case "patch":
      return state.map((c) => (c.id === action.id ? { ...c, ...action.changes } : c))
    case "insert":
      return [action.contract, ...state]
    case "remove":
      return state.filter((c) => c.id !== action.id)
    default:
      return state
  }
}
