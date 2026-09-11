import type { FtpNode } from "../types/ftp"

/**
 * Actions applied by the `useOptimistic` reducer wrapping `localNodes` in
 * `useFtpExplorer`. Same shape as the contracts/incidencias/clients
 * equivalents, plus a batch `remove` (a folder delete cascades to every
 * descendant, and a multi-file upload needs to cancel one specific pending
 * placeholder without waiting for the whole batch to settle).
 */
export type FtpOptimisticAction =
  | { type: "insert"; node: FtpNode }
  | { type: "remove"; ids: string[] }

export function applyFtpOptimisticAction(
  state: FtpNode[],
  action: FtpOptimisticAction
): FtpNode[] {
  switch (action.type) {
    case "insert":
      return [...state, action.node]
    case "remove": {
      const idSet = new Set(action.ids)
      return state.filter((n) => !idSet.has(n.id))
    }
    default:
      return state
  }
}
