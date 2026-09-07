import { describe, expect, it } from "vitest"
import type { Contract } from "../types/contract"
import type { MarcoRetributivoRow } from "./supabase/marco-retributivo"
import {
  calcularRecomendacionParaContrato,
  contractToMarcoSegmento,
  filterRecommendationCandidates,
  marcoEntryMatchesContractCliente,
} from "./tarifa-recommendation"

const formatCurrency = (val: number) => `${val.toFixed(2)} €`

function baseContract(overrides: Partial<Contract> = {}): Contract {
  return {
    id: "c1",
    clientName: "ALEJANDRO GAROZ MARTINEZ",
    cups: "ES0031601356205001TW0F",
    tipo: "luz",
    compania: "Naturgy",
    tarifa: "2.0TD <=15 KW USO",
    consumoAnual: 3500,
    montoInterno: 0,
    montoExterno: 0,
    estado: "ACTIVADO",
    comercialId: "com1",
    comercialName: "Comercial",
    createdAt: "2025-01-01",
    atr: "2.0TD",
    potenciaContratada: 4.6,
    tipoCliente: "residencial",
    nif: "28615833S",
    estadoEfectivoDesde: "2025-06-01",
    ...overrides,
  }
}

function marcoRow(
  overrides: Partial<MarcoRetributivoRow> & Pick<MarcoRetributivoRow, "id" | "compania" | "tarifa" | "segmento">
): MarcoRetributivoRow {
  return {
    tipo: "luz",
    peaje: "2.0TD",
    condicion_1: "DE 0 A 15 KW",
    condicion_2: null,
    condiciones: "Residencial · DE 0 A 15 KW",
    comision_tipo: "fija",
    comision_base: 80,
    comision_unidad: "eur_cups",
    vigencia_meses: 12,
    fecha_inicio: "2025-01-01",
    activo: true,
    created_at: "2025-01-01",
    updated_at: "2025-01-01",
    updated_by: null,
    energia_p1: 0.18,
    energia_p2: 0.16,
    energia_p3: 0.14,
    energia_p4: null,
    energia_p5: null,
    energia_p6: null,
    potencia_p1: 0.09,
    potencia_p2: 0.03,
    potencia_p3: 0,
    potencia_p4: null,
    potencia_p5: null,
    potencia_p6: null,
    incluye_sva: false,
    ...overrides,
  }
}

describe("tarifa-recommendation", () => {
  it("maps particular contracts to residencial segment", () => {
    expect(contractToMarcoSegmento(baseContract({ tipoCliente: "particular" }))).toBe(
      "residencial"
    )
  })

  it("excludes pyme-only companies such as ELEIA for residencial contracts", () => {
    const contract = baseContract({ marcoEntryId: "current" })
    const marcoEntries = [
      marcoRow({
        id: "current",
        compania: "Naturgy",
        tarifa: "2.0TD <=15 KW USO",
        segmento: "residencial",
        energia_p1: 0.2,
        energia_p2: 0.18,
        energia_p3: 0.16,
      }),
      marcoRow({
        id: "eleia-pyme",
        compania: "ELEIA",
        tarifa: "TU DECIDES 1 FIJO",
        segmento: "pyme",
        condiciones: "PYME · DE 0 A 15 KW",
        energia_p1: 0.1,
        energia_p2: 0.09,
        energia_p3: 0.08,
      }),
      marcoRow({
        id: "eleia-res-wrong-tag",
        compania: "ELEIA",
        tarifa: "TU DECIDES RES",
        segmento: "residencial",
        condiciones: "PYME · DE 0 A 15 KW",
        energia_p1: 0.11,
        energia_p2: 0.1,
        energia_p3: 0.09,
      }),
      marcoRow({
        id: "endesa-res",
        compania: "Endesa",
        tarifa: "RES FIJO",
        segmento: "residencial",
        energia_p1: 0.12,
        energia_p2: 0.11,
        energia_p3: 0.1,
      }),
    ]

    expect(
      marcoEntryMatchesContractCliente(marcoEntries[1], contract, marcoEntries)
    ).toBe(false)
    expect(
      marcoEntryMatchesContractCliente(marcoEntries[2], contract, marcoEntries)
    ).toBe(false)

    const filtered = filterRecommendationCandidates(contract, marcoEntries)
    expect(filtered.map((e) => e.id)).toEqual(["endesa-res"])

    const rec = calcularRecomendacionParaContrato(contract, marcoEntries, 10, formatCurrency)
    expect(rec?.companiaRecomendada).toBe("Endesa")
  })

  it("requires complete period prices on current and candidate tariffs", () => {
    const contract = baseContract({ marcoEntryId: "incomplete-current" })
    const marcoEntries = [
      marcoRow({
        id: "incomplete-current",
        compania: "Naturgy",
        tarifa: "2.0TD <=15 KW USO",
        segmento: "residencial",
        energia_p3: null,
      }),
      marcoRow({
        id: "candidate",
        compania: "Endesa",
        tarifa: "RES FIJO",
        segmento: "residencial",
      }),
    ]

    expect(calcularRecomendacionParaContrato(contract, marcoEntries, 10, formatCurrency)).toBeNull()
  })
})
