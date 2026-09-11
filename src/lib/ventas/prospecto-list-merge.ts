import { mergeListsById } from "../optimistic/merge-lists"
import type { Prospecto } from "./types"

/** Merge prospecto lists by id; newer `updatedAt` wins on conflicts. */
export function mergeProspectoLists(primary: Prospecto[], extra: Prospecto[]): Prospecto[] {
  return mergeListsById(
    primary,
    extra,
    (p) => p.id,
    (p) => p.updatedAt
  )
}
