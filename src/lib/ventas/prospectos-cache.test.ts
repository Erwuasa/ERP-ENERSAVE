import { describe, expect, it, vi, beforeEach } from "vitest"
import {
  clearProspectosCache,
  mergeProspectosCache,
  prospectosCacheKey,
  readProspectosCache,
  resetProspectosMemoryCache,
  writeProspectosCache,
} from "./prospectos-cache"
import type { Prospecto } from "./types"

const actor = {
  comercialId: "staff-ignacio",
  comercialName: "Test",
  role: "comercial" as const,
}

function prospecto(id: string): Prospecto {
  return {
    id,
    comercialId: "staff-ignacio",
    comercialName: "Test",
    nombre: `P ${id}`,
    telefono: "600000000",
    fase: "prospecto_nuevo",
    faseChangedAt: "2026-06-01T10:00:00Z",
    diasEnFase: 0,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
  }
}

describe("prospectos-cache", () => {
  const storage: Record<string, string> = {}

  beforeEach(() => {
    Object.keys(storage).forEach((k) => delete storage[k])
    clearProspectosCache(prospectosCacheKey(actor))
    vi.stubGlobal("localStorage", {
      getItem: (k: string) => storage[k] ?? null,
      setItem: (k: string, v: string) => {
        storage[k] = v
      },
      removeItem: (k: string) => {
        delete storage[k]
      },
    })
  })

  it("shares list across hook instances by actor key", () => {
    const key = prospectosCacheKey(actor)
    writeProspectosCache(key, [prospecto("a")])

    const merged = mergeProspectosCache(key, [prospecto("b")])
    expect(merged.map((p) => p.id)).toEqual(expect.arrayContaining(["a", "b"]))
    expect(readProspectosCache(key).length).toBe(2)
  })

  it("persists to localStorage and survives memory clear", () => {
    const key = prospectosCacheKey(actor)
    writeProspectosCache(key, [prospecto("persist-1")])
    resetProspectosMemoryCache(key)

    const restored = readProspectosCache(key)
    expect(restored.map((p) => p.id)).toEqual(["persist-1"])
  })
})
