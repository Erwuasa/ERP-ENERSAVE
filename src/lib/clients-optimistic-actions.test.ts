import { describe, expect, it } from "vitest"
import { applyClientOptimisticAction } from "./clients-optimistic-actions"
import type { Client } from "@/types/client"

function client(id: string, overrides: Partial<Client> = {}): Client {
  return {
    id,
    nombre: `Cliente ${id}`,
    estado: "activo",
    esMoroso: false,
    tipoCliente: "particular",
    comercialId: "u1",
    archivos: [],
    createdAt: "2026-01-01",
    ...overrides,
  }
}

describe("applyClientOptimisticAction", () => {
  it("patches only the matching client", () => {
    const state = [client("a"), client("b")]
    const next = applyClientOptimisticAction(state, {
      type: "patch",
      id: "b",
      changes: {
        archivos: [
          {
            id: "f1",
            name: "doc.pdf",
            mimeType: "application/pdf",
            size: 10,
            dataUrl: "data:application/pdf;base64,",
            uploadedAt: "2026-01-01",
          },
        ],
      },
    })
    expect(next.find((c) => c.id === "a")?.archivos).toEqual([])
    expect(next.find((c) => c.id === "b")?.archivos).toHaveLength(1)
  })

  it("is a no-op patch when the id doesn't match anything", () => {
    const state = [client("a")]
    const next = applyClientOptimisticAction(state, {
      type: "patch",
      id: "missing",
      changes: { esMoroso: true },
    })
    expect(next).toEqual(state)
  })
})
