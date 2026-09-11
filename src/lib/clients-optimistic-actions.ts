import type { Client } from "@/types/client"

/**
 * Actions applied by the `useOptimistic` reducer wrapping `clients` in
 * `ErpDataProvider`. Same shape as `src/lib/erp/contract-optimistic-actions.ts`.
 */
export type ClientOptimisticAction = { type: "patch"; id: string; changes: Partial<Client> }

export function applyClientOptimisticAction(
  state: Client[],
  action: ClientOptimisticAction
): Client[] {
  switch (action.type) {
    case "patch":
      return state.map((c) => (c.id === action.id ? { ...c, ...action.changes } : c))
    default:
      return state
  }
}
