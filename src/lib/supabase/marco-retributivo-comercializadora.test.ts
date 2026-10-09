import { describe, expect, it } from "vitest"
import { readEnertechComercializadora } from "./marco-retributivo"

describe("readEnertechComercializadora", () => {
  it("lee nombre y logo_url del embed", () => {
    expect(
      readEnertechComercializadora({
        nombre: "  FACTOR ENERGIA  ",
        logo_url: " https://cdn.example/factor.png ",
      })
    ).toEqual({
      nombre: "FACTOR ENERGIA",
      logoUrl: "https://cdn.example/factor.png",
    })
  })

  it("acepta el embed como array, que es como a veces lo devuelve PostgREST", () => {
    expect(
      readEnertechComercializadora([
        { nombre: "Avenir", logo_url: "https://cdn.example/avenir.png" },
      ])
    ).toEqual({
      nombre: "Avenir",
      logoUrl: "https://cdn.example/avenir.png",
    })
  })

  it("deja el logo en null si no hay url usable", () => {
    expect(readEnertechComercializadora({ nombre: "Sin logo", logo_url: "  " })).toEqual({
      nombre: "Sin logo",
      logoUrl: null,
    })
    expect(readEnertechComercializadora(null)).toEqual({ nombre: "", logoUrl: null })
  })
})
