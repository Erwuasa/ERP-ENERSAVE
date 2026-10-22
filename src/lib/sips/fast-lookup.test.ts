import { describe, expect, it, vi } from "vitest"
import {
  annualKwhFromSipsResumen,
  clearSipsListoMemory,
  cupsLookupReadiness,
  resolveSipsLookup,
} from "./fast-lookup"
import type { SipsOutcome } from "./types"

const LISTO: SipsOutcome = {
  status: "listo",
  cups: "ES0031408000000000AF",
  resumen: {
    cups: "ES0031408000000000AF",
    tarifa: "2.0TD",
    potenciasKw: {},
    consumoAnualKwh: 3500.4,
    codigoPostal: null,
    provincia: null,
    municipio: null,
    distribuidora: null,
    cnae: "4711",
    consumosKwh: {},
    consumoMensual: [],
  },
  origen: null,
  consultadoEn: null,
}

describe("cupsLookupReadiness", () => {
  it("waits until the CUPS is complete and valid", () => {
    expect(cupsLookupReadiness("")).toEqual({ state: "empty" })
    expect(cupsLookupReadiness("ES0031408")).toEqual({ state: "incomplete" })
    expect(cupsLookupReadiness("ES0031408000000000AF")).toEqual({
      state: "ready",
      cups: "ES0031408000000000AF",
    })
    expect(cupsLookupReadiness("ES0031408000000000AA").state).toBe("invalid")
  })
})

describe("annualKwhFromSipsResumen", () => {
  it("rounds a positive annual figure and drops the rest", () => {
    expect(annualKwhFromSipsResumen({ consumoAnualKwh: 3500.4 })).toBe(3500)
    expect(annualKwhFromSipsResumen({ consumoAnualKwh: 0 })).toBeNull()
    expect(annualKwhFromSipsResumen({ consumoAnualKwh: null })).toBeNull()
  })
})

describe("resolveSipsLookup", () => {
  it("uses the stored row and does not call the API", async () => {
    clearSipsListoMemory()
    const fetchLive = vi.fn()
    const outcome = await resolveSipsLookup({
      cups: "ES0031408000000000AF",
      producto: "luz",
      readStored: async () => LISTO,
      fetchLive,
      wait: async () => undefined,
    })
    expect(outcome).toMatchObject({ status: "listo" })
    expect(fetchLive).not.toHaveBeenCalled()
  })

  it("retries a processing answer once and caps the wait at 3 seconds", async () => {
    clearSipsListoMemory()
    const waits: number[] = []
    let calls = 0
    const outcome = await resolveSipsLookup({
      cups: "ES0021000012345678LB",
      producto: "luz",
      readStored: async () => null,
      fetchLive: async () => {
        calls += 1
        if (calls === 1) return { status: "procesando", reintentarEnSegundos: 30 }
        return { ...LISTO, cups: "ES0021000012345678LB" }
      },
      wait: async (ms) => {
        waits.push(ms)
      },
    })
    expect(waits).toEqual([3000])
    expect(outcome.status).toBe("listo")
    expect(calls).toBe(2)
  })

  it("returns the memory hit without reading storage again", async () => {
    clearSipsListoMemory()
    const readStored = vi.fn(async () => LISTO)
    const fetchLive = vi.fn()
    await resolveSipsLookup({
      cups: "ES0031408000000000AF",
      producto: "luz",
      readStored,
      fetchLive,
      wait: async () => undefined,
    })
    readStored.mockClear()
    const outcome = await resolveSipsLookup({
      cups: "ES0031408000000000AF",
      producto: "luz",
      readStored,
      fetchLive,
      wait: async () => undefined,
    })
    expect(outcome.status).toBe("listo")
    expect(readStored).not.toHaveBeenCalled()
    expect(fetchLive).not.toHaveBeenCalled()
    clearSipsListoMemory()
  })
})
