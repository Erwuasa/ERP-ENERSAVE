import { describe, expect, it } from "vitest"
import { parseSipsResponse, parseSipsResumen } from "./parse-response"

const LISTO = {
  success: true,
  cups: "ES0031408000000000AF",
  producto: "luz",
  estado: "listo",
  origen: "proveedor-a",
  consultado_en: "2026-10-06 10:00:00",
  resumen: {
    cups: "ES0031408000000000AF",
    tarifa: "2.0TD",
    potencias_kw: { P1: 4.6, P2: "4,6", P3: null, p4: 0, P7: 3 },
    consumo_anual_kwh: 3200,
    codigo_postal: "41001",
    provincia: "Sevilla",
    municipio: "Sevilla",
    distribuidora: "E-Distribución",
    cnae: "4711",
  },
  datos: { raw: "ignored" },
}

describe("parseSipsResponse", () => {
  it("maps 200 listo to the uniform resumen", () => {
    const outcome = parseSipsResponse(200, LISTO)
    expect(outcome).toMatchObject({ status: "listo", cups: "ES0031408000000000AF", origen: "proveedor-a" })
    if (outcome.status !== "listo") throw new Error("expected listo")
    expect(outcome.resumen.potenciasKw).toEqual({ P1: 4.6, P2: 4.6 })
    expect(outcome.resumen.tarifa).toBe("2.0TD")
    expect(outcome).not.toHaveProperty("datos")
  })

  it("maps 202 to procesando with the suggested delay", () => {
    expect(parseSipsResponse(202, { estado: "procesando", reintentar_en: 28 })).toEqual({
      status: "procesando",
      reintentarEnSegundos: 28,
    })
    expect(parseSipsResponse(202, { estado: "procesando" })).toEqual({
      status: "procesando",
      reintentarEnSegundos: 30,
    })
  })

  it("maps 200 sin_datos as definitive", () => {
    expect(parseSipsResponse(200, { estado: "sin_datos", cups: "ES0031408000000000AF" })).toEqual({
      status: "sin_datos",
      cups: "ES0031408000000000AF",
    })
  })

  it("maps API errors by stable code and status", () => {
    expect(parseSipsResponse(400, { success: false, code: "INVALID_CUPS", error: "CUPS inválido" })).toMatchObject({
      status: "error",
      code: "INVALID_CUPS",
      message: "CUPS inválido",
    })
    expect(parseSipsResponse(401, {})).toMatchObject({ status: "error", code: "UNAUTHORIZED" })
    expect(parseSipsResponse(503, {})).toMatchObject({ status: "error", code: "UPSTREAM" })
  })

  it("keeps Retry-After on 429", () => {
    expect(parseSipsResponse(429, { code: "RATE_LIMITED" }, "12")).toMatchObject({
      status: "error",
      code: "RATE_LIMITED",
      retryAfterSeconds: 12,
    })
  })

  it("flags unrecognised 200 bodies instead of guessing", () => {
    expect(parseSipsResponse(200, { estado: "otra-cosa" })).toMatchObject({ status: "error", code: "UNKNOWN" })
    expect(parseSipsResponse(200, null)).toMatchObject({ status: "error", code: "UNKNOWN" })
  })
})

describe("parseSipsResumen", () => {
  it("returns nulls for missing fields", () => {
    expect(parseSipsResumen(undefined)).toEqual({
      cups: null,
      tarifa: null,
      potenciasKw: {},
      consumoAnualKwh: null,
      codigoPostal: null,
      provincia: null,
      municipio: null,
      distribuidora: null,
      cnae: null,
    })
  })
})
