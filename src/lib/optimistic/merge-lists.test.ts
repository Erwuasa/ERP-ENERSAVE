import { describe, expect, it } from "vitest"
import { mergeListsById } from "./merge-lists"

interface Item {
  id: string
  updatedAt: string
  label?: string
}

function item(id: string, updatedAt: string, label?: string): Item {
  return { id, updatedAt, label }
}

describe("mergeListsById", () => {
  it("keeps all items when one list is incomplete", () => {
    const local = [item("a", "2026-06-18T12:00:00Z"), item("b", "2026-06-18T12:01:00Z")]
    const server = [item("b", "2026-06-18T12:01:00Z")]

    const merged = mergeListsById(server, local, (i) => i.id, (i) => i.updatedAt)
    expect(merged.map((i) => i.id).sort()).toEqual(["a", "b"])
  })

  it("prefers newer updatedAt on id conflicts", () => {
    const older = item("a", "2026-06-18T12:00:00Z")
    const newer = { ...item("a", "2026-06-18T12:05:00Z"), label: "Actualizado" }

    const merged = mergeListsById([newer], [older], (i) => i.id, (i) => i.updatedAt)
    expect(merged).toHaveLength(1)
    expect(merged[0].label).toBe("Actualizado")
  })

  it("primary wins ties over extra", () => {
    const cached = item("a", "2026-06-18T12:00:00Z", "cached")
    const optimistic = item("a", "2026-06-18T12:00:00Z", "optimistic")

    const merged = mergeListsById([optimistic], [cached], (i) => i.id, (i) => i.updatedAt)
    expect(merged[0].label).toBe("optimistic")
  })

  it("drops items with no id", () => {
    const merged = mergeListsById(
      [{ id: "", updatedAt: "2026-06-18T12:00:00Z" }],
      [],
      (i) => i.id || undefined,
      (i) => i.updatedAt
    )
    expect(merged).toHaveLength(0)
  })

  it("falls back gracefully when getUpdatedAt returns an empty string", () => {
    const a = item("a", "")
    const b = item("b", "")
    const merged = mergeListsById([a], [b], (i) => i.id, (i) => i.updatedAt)
    expect(merged.map((i) => i.id).sort()).toEqual(["a", "b"])
  })

  it("returns unsorted order when sort is disabled", () => {
    const first = item("b", "2026-06-18T12:00:00Z")
    const second = item("a", "2026-06-19T12:00:00Z")
    const merged = mergeListsById([], [first, second], (i) => i.id, (i) => i.updatedAt, {
      sort: false,
    })
    expect(merged.map((i) => i.id)).toEqual(["b", "a"])
  })
})
