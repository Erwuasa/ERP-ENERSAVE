import { describe, expect, it } from "vitest"
import {
  canPushContractToAt,
  mapAtClientPayload,
  mapAtContractPayload,
  mapTipoClienteAt,
  parsePotenciaToPowers,
  type AtOutboundContractRow,
} from "./at-outbound-map"

function row(patch: Partial<AtOutboundContractRow> = {}): AtOutboundContractRow {
  return {
    id: "con-1",
    client_name: "Ana Pérez García",
    cups: "ES0021000000000001AB",
    tipo: "luz",
    nif: "12345678Z",
    telefono: "600111222",
    email: "ana@test.com",
    iban: null,
    direccion_suministro: "C/ Mayor 1",
    direccion_fiscal: null,
    codigo_postal: "28001",
    poblacion: "Madrid",
    provincia: "Madrid",
    tipo_cliente: "particular",
    potencia_contratada: "P1: 4.6 · P2: 4.6",
    consumo_anual: 3600,
    fecha_inicio: "2026-09-15",
    estado: "PTE DE TRAMITACIÓN",
    at_contract_id: null,
    at_rate_id: null,
    at_marco_id: null,
    metadata: { atr: "2.0TD", potencia_p1: 4.6, potencia_p2: 4.6 },
    ...patch,
  }
}

describe("canPushContractToAt", () => {
  it("allows a complete contract", () => {
    expect(canPushContractToAt(row())).toBe(true)
  })

  it("skips pending cups or missing nif", () => {
    expect(canPushContractToAt(row({ cups: "PENDIENTE" }))).toBe(false)
    expect(canPushContractToAt(row({ nif: "" }))).toBe(false)
  })
})

describe("mapAtOutbound payloads", () => {
  it("maps a particular client and electricity contract", () => {
    const client = mapAtClientPayload(row())
    expect(client).toMatchObject({
      tipo: "particular",
      nombre: "Ana",
      apellidos: "Pérez García",
      dni_cif: "12345678Z",
    })

    const contract = mapAtContractPayload(row(), "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    expect(contract.tipo_cliente).toBe("PARTICULAR")
    expect(contract.first_name).toBe("Ana")
    expect(contract.cliente_id).toBe("aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    expect(contract.status).toBe("requested")
    expect(contract.electricity_data).toMatchObject({
      cups: "ES0021000000000001AB",
      consumo_anual_kwh: 3600,
      access_tariff: "2.0TD",
      powers: { p1: 4.6, p2: 4.6 },
    })
  })

  it("maps empresa to business_name and pyme client", () => {
    const empresa = row({ client_name: "Demo SL", tipo_cliente: "empresa" })
    expect(mapTipoClienteAt("pyme")).toBe("EMPRESA")
    expect(mapAtClientPayload(empresa).tipo).toBe("pyme")
    expect(mapAtContractPayload(empresa).business_name).toBe("Demo SL")
    expect(mapAtContractPayload(empresa).first_name).toBeUndefined()
  })

  it("parses powers from the contracted-power label", () => {
    expect(parsePotenciaToPowers("P1: 15 · P2: 12 · P3: 10")).toEqual({
      p1: 15,
      p2: 12,
      p3: 10,
    })
  })

  it("omits status on updates that already have an AT id", () => {
    expect(mapAtContractPayload(row({ at_contract_id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb" })).status).toBeUndefined()
  })
})
