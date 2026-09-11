import { describe, expect, it } from "vitest"
import { applyFtpOptimisticAction } from "./ftp-optimistic-actions"
import type { FtpNode } from "../types/ftp"

function node(id: string, overrides: Partial<FtpNode> = {}): FtpNode {
  return {
    id,
    parentId: null,
    name: `node-${id}`,
    nodeType: "file",
    createdAt: "2026-01-01T00:00:00Z",
    updatedAt: "2026-01-01T00:00:00Z",
    ...overrides,
  }
}

describe("applyFtpOptimisticAction", () => {
  it("inserts a node", () => {
    const state = [node("a")]
    const next = applyFtpOptimisticAction(state, { type: "insert", node: node("b") })
    expect(next.map((n) => n.id)).toEqual(["a", "b"])
  })

  it("removes a single id", () => {
    const state = [node("a"), node("b")]
    const next = applyFtpOptimisticAction(state, { type: "remove", ids: ["a"] })
    expect(next.map((n) => n.id)).toEqual(["b"])
  })

  it("removes a batch of ids (folder cascade delete)", () => {
    const state = [node("a"), node("b"), node("c")]
    const next = applyFtpOptimisticAction(state, { type: "remove", ids: ["a", "c"] })
    expect(next.map((n) => n.id)).toEqual(["b"])
  })

  it("cancels one pending upload placeholder without touching the others", () => {
    let state = [node("existing")]
    state = applyFtpOptimisticAction(state, { type: "insert", node: node("p1") })
    state = applyFtpOptimisticAction(state, { type: "insert", node: node("p2") })
    state = applyFtpOptimisticAction(state, { type: "remove", ids: ["p1"] })
    expect(state.map((n) => n.id)).toEqual(["existing", "p2"])
  })
})
