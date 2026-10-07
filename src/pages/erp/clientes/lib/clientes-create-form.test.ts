import { describe, expect, it } from "vitest"
import {
  buildClientFromCreateForm,
  defaultComercialIdForClientCreate,
  emptyClientesCreateForm,
  shouldPickComercialOnClientCreate,
  validateClientesCreateForm,
} from "./clientes-create-form"

describe("clientes-create-form", () => {
  it("requiere nombre", () => {
    expect(validateClientesCreateForm(emptyClientesCreateForm("u1"), "comercial")).toMatch(/nombre/i)
  })

  it("asigna comercial automático a comercial y jefe", () => {
    expect(shouldPickComercialOnClientCreate("comercial")).toBe(false)
    expect(shouldPickComercialOnClientCreate("jefe_comercial")).toBe(false)
    expect(defaultComercialIdForClientCreate("comercial", "u9", [])).toBe("u9")
  })

  it("construye cliente manual con notas", () => {
    const form = {
      ...emptyClientesCreateForm("com-1"),
      nombre: "Ana",
      apellidos: "García",
      notas: "Llama por las tardes",
    }
    const client = buildClientFromCreateForm(form)
    expect(client.comercialId).toBe("com-1")
    expect(client.notas).toBe("Llama por las tardes")
    expect(client.source).toBe("manual")
  })
})
