import { describe, expect, it } from "vitest"
import { canUploadContractToEnertech, contractUploadBlockReason } from "./alta-gate"
import { parseEnertechClientePost, parseEnertechContratoPost } from "./alta-response"
import { buildEnertechClienteBody, buildEnertechContratoBody, pruebaCups } from "./contract-alta"
import { uploadContractAlta } from "./upload-contract-alta"
import type { EnertechAltaSource } from "./contract-alta"

const SOURCE: EnertechAltaSource = {
  nombre: "Ana",
  apellidos: "Garcia",
  apellido2: "Lopez",
  razonSocial: "",
  nif: "12345678Z",
  email: "ana@ejemplo.es",
  telefono: "600000000",
  tipoCliente: "residencial",
  cups: pruebaCups("0022000099000001"),
  codigoPostal: "41001",
  poblacion: "Sevilla",
  provincia: "Sevilla",
  direccionSuministro: "Mayor 10",
  iban: "",
  consumoAnual: 4200,
  potenciaP1: "4.6",
  potenciaP2: "4.6",
  potenciaP3: "",
  potenciaP4: "",
  potenciaP5: "",
  potenciaP6: "",
  cnae: "4711",
  claveTarifa: "tf_demo",
}

describe("contract upload gate", () => {
  it("blocks a draft and a contract that is not pending RGPD", () => {
    expect(canUploadContractToEnertech({ estado: "Borrador", contractId: "abc" })).toBe(false)
    expect(canUploadContractToEnertech({ estado: "PTE DE TRAMITACIÓN", contractId: "abc" })).toBe(false)
    expect(canUploadContractToEnertech({ estado: "PTE DE RGPD", contractId: "" })).toBe(false)
    expect(
      canUploadContractToEnertech({ estado: "PTE DE RGPD", contractId: "optimistic-contract-1" })
    ).toBe(false)
    expect(contractUploadBlockReason({ estado: "Borrador", contractId: "abc" })).toMatch(/borrador/i)
  })

  it("allows a saved contract in Pendiente de RGPD", () => {
    expect(canUploadContractToEnertech({ estado: "Pte. RGPD", contractId: "8f0c" })).toBe(true)
    expect(canUploadContractToEnertech({ estado: "pendiente rgpd", contractId: "8f0c" })).toBe(true)
  })
})

describe("enertech post responses", () => {
  it("reads id_customer and rgpd from a 201", () => {
    const parsed = parseEnertechClientePost(201, {
      id_customer: 44,
      rgpd: "solicitud_enviada",
    })
    expect(parsed).toMatchObject({ ok: true, idCustomer: 44, rgpd: "solicitud_enviada" })
  })

  it("reports CLIENT_EXISTS when the 409 has no id", () => {
    const parsed = parseEnertechClientePost(409, { code: "CLIENT_EXISTS", error: "Ya existe" })
    expect(parsed).toMatchObject({ ok: false, code: "CLIENT_EXISTS" })
  })

  it("reads the contract 201", () => {
    const parsed = parseEnertechContratoPost(201, {
      id_contract: 90,
      estado_id: 1,
      estado: "Pte. RGPD",
      documentos_guardados: 0,
    })
    expect(parsed).toMatchObject({
      ok: true,
      idContract: 90,
      estadoId: 1,
      estado: "Pte. RGPD",
      documentosGuardados: 0,
    })
  })
})

describe("optional alta fields", () => {
  it("sends apellido2, email, movil1 and apoderado apellidos when present", () => {
    const person = buildEnertechClienteBody({
      nombre: "Ana",
      apellido1: "Garcia",
      apellido2: "Lopez",
      dni: "12345678Z",
      email: "ana@ejemplo.es",
      movil: "600 000 000",
    })
    expect(person.ok && person.value).toMatchObject({
      apellido2: "Lopez",
      email: "ana@ejemplo.es",
      movil1: "600000000",
    })

    const company = buildEnertechClienteBody({
      nombre: "Tienda SL",
      dni: "B12345674",
      apoderadoNombre: "Ana",
      apoderadoApellidos: "Garcia Lopez",
      apoderadoDni: "12345678Z",
    })
    expect(company.ok && company.value.apoderadoApellidos).toBe("Garcia Lopez")
  })

  it("skips cnae only for eficiencia", () => {
    const missing = buildEnertechContratoBody({
      clientId: 1,
      cups: pruebaCups("0022000099000001"),
      cnae: "",
      claveTarifa: "tf_demo",
    })
    expect(missing.ok).toBe(false)

    const eficiencia = buildEnertechContratoBody({
      clientId: 1,
      cups: pruebaCups("0022000099000001"),
      cnae: "",
      claveTarifa: "tf_demo",
      eficiencia: true,
    })
    expect(eficiencia.ok).toBe(true)
    if (eficiencia.ok) expect(eficiencia.value.cnae).toBeUndefined()
  })
})

describe("uploadContractAlta", () => {
  it("does not call the API for a draft", async () => {
    let calls = 0
    const result = await uploadContractAlta({
      contractId: "abc",
      estado: "Borrador",
      source: SOURCE,
      transport: {
        post: async () => {
          calls += 1
          return { status: 201, body: {} }
        },
      },
    })
    expect(result.ok).toBe(false)
    expect(calls).toBe(0)
  })

  it("posts the client and then the contract when the row is pending RGPD", async () => {
    const calls: string[] = []
    const result = await uploadContractAlta({
      contractId: "contract-1",
      estado: "PTE DE RGPD",
      source: SOURCE,
      documentos: [
        { filename: "dni.pdf", base64: "JVBERg==" },
        { filename: "", base64: "" },
      ],
      transport: {
        post: async (input) => {
          calls.push(input.resource)
          if (input.resource === "clientes") {
            return { status: 201, body: { id_customer: 44, rgpd: "pendiente_sin_email" } }
          }
          expect(input.body.clientId).toBe(44)
          expect(input.body.direccionSuministro).toBe("Mayor 10")
          expect(input.body.via_tipo).toBe("CALLE")
          expect(input.body.via_nombre).toBe("Mayor")
          expect(input.body.via_numero).toBe("10")
          expect(input.body.documentos).toEqual([{ filename: "dni.pdf", base64: "JVBERg==" }])
          return {
            status: 201,
            body: { id_contract: 90, estado_id: 1, estado: "Pte. RGPD", documentos_guardados: 0 },
          }
        },
      },
    })
    expect(calls).toEqual(["clientes", "contratos"])
    expect(result).toMatchObject({ ok: true, idCustomer: 44, idContract: 90, documentosGuardados: 0 })
  })

  it("posts a complete new contract before Enertech has set Pendiente de RGPD", async () => {
    let calls = 0
    const result = await uploadContractAlta({
      contractId: "contract-1",
      estado: "PTE DE TRAMITACIÓN",
      source: SOURCE,
      when: "created",
      transport: {
        post: async () => {
          calls += 1
          return calls === 1
            ? { status: 201, body: { id_customer: 44, rgpd: "solicitud_enviada" } }
            : { status: 201, body: { id_contract: 90, estado: "Pte. RGPD" } }
        },
      },
    })
    expect(calls).toBe(2)
    expect(result).toMatchObject({ ok: true, idContract: 90, estado: "Pte. RGPD" })
  })

  it("does not call the API when the created contract is still a draft", async () => {
    let calls = 0
    const result = await uploadContractAlta({
      contractId: "contract-1",
      estado: "Borrador",
      source: SOURCE,
      when: "created",
      transport: {
        post: async () => {
          calls += 1
          return { status: 201, body: {} }
        },
      },
    })
    expect(result.ok).toBe(false)
    expect(calls).toBe(0)
  })
})
