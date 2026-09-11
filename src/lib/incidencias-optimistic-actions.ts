import type { IncidenciaTicket } from "./incidencias"

/**
 * Actions applied by the `useOptimistic` reducer wrapping `incidencias` in
 * `useIncidenciasPage`. Same shape as `src/lib/erp/contract-optimistic-actions.ts`.
 */
export type IncidenciaOptimisticAction =
  | { type: "insert"; ticket: IncidenciaTicket }
  | { type: "patch"; id: string; changes: Partial<IncidenciaTicket> }

export function applyIncidenciaOptimisticAction(
  state: IncidenciaTicket[],
  action: IncidenciaOptimisticAction
): IncidenciaTicket[] {
  switch (action.type) {
    case "insert":
      return [action.ticket, ...state]
    case "patch":
      return state.map((i) => (i.id === action.id ? { ...i, ...action.changes } : i))
    default:
      return state
  }
}
