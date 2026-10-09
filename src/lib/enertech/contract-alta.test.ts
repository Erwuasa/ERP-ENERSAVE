import { afterEach, describe, expect, it, vi } from "vitest"
import {
  ENERTECH_PRODUCTION_BASE_URL,
  ENERTECH_TEST_BASE_URL,
  assertEnertechTestBaseUrl,
  buildEnertechClienteBody,
  buildEnertechContratoBody,
  classifySpanishTaxId,
  countDocumentacion,
  createEnertechTestHttp,
  mapContractSourceToEnertechAlta,
  pickPrecioForAlta,
  pruebaCups,
  pruebaDni,
  readEnertechCups,
  readEnertechEstado,
  readEnertechId,
  runEnertechAltaPrueba,
  type EnertechAltaSource,
  type EnertechHttp,
  type EnertechHttpResponse,
} from "./contract-alta"

const DNI = "12345678Z"
const NIE = "Y0234567G"
const CIF = "B12345674"
const CUPS = pruebaCups("0022000099000001")

function source(overrides: Partial<EnertechAltaSource> = {}): EnertechAltaSource {
  return {
    nombre: "Ana",
    apellidos: "Garcia Lopez",
    razonSocial: "",
    nif: DNI,
    email: "ana@example.com",
    telefono: "600000000",
    tipoCliente: "residencial",
    cups: CUPS,
    codigoPostal: "41001",
    poblacion: "Sevilla",
    provincia: "Sevilla",
    direccionSuministro: "Mayor 10",
    iban: "ES00 0000 0000 0000 0000 0000",
    consumoAnual: 4200,
    potenciaP1: "4,6",
    potenciaP2: "4.6",
    potenciaP3: "",
    potenciaP4: "",
    potenciaP5: "",
    potenciaP6: "",
    cnae: "4711",
    claveTarifa: "tf_prueba",
    ...overrides,
  }
}

describe("documentos españoles", () => {
  it("acepta DNI, NIE y CIF con letra de control correcta", () => {
    expect(classifySpanishTaxId("12345678z")).toEqual({ kind: "dni", normalized: DNI })
    expect(classifySpanishTaxId("y0234567g")).toEqual({ kind: "nie", normalized: NIE })
    expect(classifySpanishTaxId(CIF)).toEqual({ kind: "cif", normalized: CIF })
    expect(classifySpanishTaxId("P1234567D")?.kind).toBe("cif")
  })

  it("rechaza letras de control falsas y formatos ajenos", () => {
    expect(classifySpanishTaxId("12345678A")).toBeNull()
    expect(classifySpanishTaxId("Y234567A")).toBeNull()
    expect(classifySpanishTaxId("B12345675")).toBeNull()
    expect(classifySpanishTaxId("no-es-un-nif")).toBeNull()
  })
})

describe("buildEnertechClienteBody", () => {
  it("arma el cuerpo de un DNI con apellido y sin campos vacíos", () => {
    const built = buildEnertechClienteBody({
      nombre: " Ana ",
      apellido1: "Garcia",
      apellido2: "Lopez",
      dni: "12345678z",
      email: "ana@example.com",
      movil: "600 000 000",
    })
    expect(built).toEqual({
      ok: true,
      value: {
        nombre: "Ana",
        dni: DNI,
        apellido1: "Garcia",
        apellido2: "Lopez",
        email: "ana@example.com",
        movil1: "600000000",
      },
    })
  })

  it("exige apellido en DNI, nacionalidad en NIE y apoderado en CIF", () => {
    expect(buildEnertechClienteBody({ nombre: "Ana", dni: DNI }).ok).toBe(false)
    expect(buildEnertechClienteBody({ nombre: "Ana", apellido1: "Garcia", dni: NIE })).toMatchObject({
      ok: false,
      issue: { code: "MISSING_NACIONALIDAD" },
    })
    expect(
      buildEnertechClienteBody({ nombre: "Ana", apellido1: "Garcia", dni: NIE, nacionalidad: "FR" }).ok
    ).toBe(true)
    expect(buildEnertechClienteBody({ nombre: "Tienda SL", dni: CIF })).toMatchObject({
      ok: false,
      issue: { code: "MISSING_APODERADO" },
    })
    expect(
      buildEnertechClienteBody({
        nombre: "Tienda SL",
        dni: CIF,
        apoderadoNombre: "Ana Garcia",
        apoderadoDni: DNI,
      }).ok
    ).toBe(true)
  })
})

describe("buildEnertechContratoBody", () => {
  it("exige CUPS válido, CNAE y una tarifa de Enertech", () => {
    expect(buildEnertechContratoBody({ clientId: 1, cups: "ES000", cnae: "4711", claveTarifa: "tf_1" })).toMatchObject({
      ok: false,
      issue: { code: "INVALID_CUPS" },
    })
    expect(buildEnertechContratoBody({ clientId: 1, cups: CUPS, cnae: " ", claveTarifa: "tf_1" })).toMatchObject({
      ok: false,
      issue: { code: "MISSING_CNAE" },
    })
    expect(buildEnertechContratoBody({ clientId: 1, cups: CUPS, cnae: "4711" })).toMatchObject({
      ok: false,
      issue: { code: "MISSING_TARIFF" },
    })
  })

  it("manda clave_tarifa, potencias y consumo sin periodos a cero", () => {
    const built = buildEnertechContratoBody({
      clientId: 15,
      cups: CUPS.toLowerCase(),
      cnae: "4711",
      claveTarifa: "tf_prueba",
      cp: "41001",
      iban: "ES00 0000",
      consumption: 4200,
      powersKw: { p1: 4.6, p2: 4.6, p3: 0 },
    })
    expect(built.ok).toBe(true)
    if (built.ok === false) return
    expect(built.value).toMatchObject({
      clientId: 15,
      cups: CUPS,
      clave_tarifa: "tf_prueba",
      cnae: "4711",
      consumption: 4200,
      power_p1: 4.6,
      power_p2: 4.6,
      iban: "ES000000",
    })
    expect(built.value).not.toHaveProperty("power_p3")
  })
})

describe("mapContractSourceToEnertechAlta", () => {
  it("parte los apellidos y traduce comunidad de vecinos a ccpp", () => {
    const mapped = mapContractSourceToEnertechAlta(source({ tipoCliente: "comunidad_vecinos" }))
    expect(mapped.ok).toBe(true)
    if (mapped.ok === false) return
    expect(mapped.value.segmento).toBe("ccpp")
    expect(mapped.value.cliente).toMatchObject({ nombre: "Ana", apellido1: "Garcia", apellido2: "Lopez", dni: DNI })
    expect(mapped.value.contrato.powersKw).toEqual({ p1: 4.6, p2: 4.6 })
  })

  it("un CIF usa la razón social y no el nombre de pila", () => {
    const mapped = mapContractSourceToEnertechAlta(
      source({
        tipoCliente: "pyme",
        nif: CIF,
        razonSocial: "Tienda SL",
        apoderadoNombre: "Ana Garcia",
        apoderadoDni: DNI,
      })
    )
    expect(mapped.ok).toBe(true)
    if (mapped.ok === false) return
    expect(mapped.value.segmento).toBe("pyme")
    expect(mapped.value.cliente.nombre).toBe("Tienda SL")
    expect(mapped.value.cliente.dni).toBe(CIF)
  })
})

describe("destino del alta", () => {
  it("solo acepta el host de pruebas", () => {
    expect(assertEnertechTestBaseUrl(`${ENERTECH_TEST_BASE_URL}/`)).toBe(ENERTECH_TEST_BASE_URL)
    expect(() => assertEnertechTestBaseUrl(ENERTECH_PRODUCTION_BASE_URL)).toThrow(/devintranet/)
    expect(() => assertEnertechTestBaseUrl("https://evil.example/v1")).toThrow(/devintranet/)
  })
})

describe("createEnertechTestHttp", () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it("llama solo a devintranet, con la clave y la idempotencia, y no las mete en el cuerpo", async () => {
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const http = createEnertechTestHttp("clave-de-prueba", fetchImpl as unknown as typeof fetch)
    await http.request({
      method: "POST",
      path: "/clientes",
      body: { nombre: "Ana" },
      idempotencyKey: "alta-1",
    })
    const [url, init] = fetchImpl.mock.calls[0] as unknown as [URL, RequestInit]
    expect(url.origin + url.pathname).toBe(`${ENERTECH_TEST_BASE_URL}/clientes`)
    expect(new Headers(init.headers).get("X-Api-Key")).toBe("clave-de-prueba")
    expect(new Headers(init.headers).get("Idempotency-Key")).toBe("alta-1")
    expect(String(init.body)).not.toContain("clave-de-prueba")
  })
})

function json(status: number, body: unknown): EnertechHttpResponse {
  return { status, body }
}

describe("runEnertechAltaPrueba", () => {
  it("recorre perfil, precios, documentación, errores esperados, alta y relectura idempotente", async () => {
    const calls: string[] = []
    let contratos = 0
    const http: EnertechHttp = {
      async request(input) {
        calls.push(`${input.method} ${input.path}`)
        if (input.path === "/perfil") return json(200, { ok: true })
        if (input.path === "/precios") {
          return json(200, { filas: [{ clave: "tf_real", comercializadora: "NORDY", id: 9 }] })
        }
        if (input.path === "/documentacion") return json(200, { documentos: [{ nombre: "dni" }, { nombre: "factura" }] })
        if (input.path === "/clientes" && input.idempotencyKey?.endsWith("incompleto")) {
          return json(400, { code: "MISSING_DATOS_CONTRATACION", error: "falta apellido" })
        }
        if (input.path === "/clientes" && input.idempotencyKey?.endsWith("cliente")) return json(201, { id: 44 })
        if (input.path === "/clientes") return json(409, { code: "CLIENT_EXISTS", id: 44 })
        if (input.path === "/contratos" && input.idempotencyKey?.endsWith("sin-cnae")) {
          return json(400, { code: "MISSING_CNAE" })
        }
        if (input.path === "/contratos" && input.method === "POST") {
          contratos += 1
          return json(201, { id_contract: 90, estado: { nombre: "INCIDENCIA" } })
        }
        if (input.path === "/contratos/90") return json(200, { contrato: { cups: CUPS, estado: "INCIDENCIA" } })
        return json(500, { code: "UNEXPECTED" })
      },
    }

    const report = await runEnertechAltaPrueba(http, {
      cliente: { nombre: "Ana", apellido1: "Garcia", dni: DNI },
      clienteIncompleto: { nombre: "Ana", dni: DNI },
      contrato: { cups: CUPS, cnae: "4711", clave_tarifa: "tf_real" },
      contratoSinCnae: { cups: CUPS, clave_tarifa: "tf_real" },
      idempotencyKey: "prueba-1",
      cups: CUPS,
    })

    expect(calls.indexOf("GET /documentacion")).toBeGreaterThan(calls.indexOf("GET /precios"))
    expect(calls.filter((call) => call === "POST /contratos")).toHaveLength(3)
    expect(report.perfilOk).toBe(true)
    expect(report.claveTarifa).toBe("tf_real")
    expect(report.documentosRequeridos).toBe(2)
    expect(report.clienteIncompleto).toEqual({ status: 400, code: "MISSING_DATOS_CONTRATACION" })
    expect(report.cliente).toEqual({ status: 201, code: null, id: 44 })
    expect(report.clienteDuplicado).toEqual({ status: 409, code: "CLIENT_EXISTS" })
    expect(report.contratoSinCnae.code).toBe("MISSING_CNAE")
    expect(report.contrato).toMatchObject({ status: 201, id: 90, estado: "INCIDENCIA" })
    expect(report.relecturaCupsOk).toBe(true)
    expect(report.relecturaEstado).toBe("INCIDENCIA")
    expect(report.idempotenciaOk).toBe(true)
    expect(contratos).toBe(2)
  })

  it("reintenta un 429 y no da por buena una relectura con otro CUPS", async () => {
    let posts = 0
    const http: EnertechHttp = {
      async request(input) {
        if (input.method === "POST" && input.path === "/clientes" && input.idempotencyKey?.endsWith("cliente")) {
          posts += 1
          if (posts === 1) return json(429, { code: "RATE_LIMITED" })
          return json(201, { id_customer: "44" })
        }
        if (input.path === "/perfil") return json(200, {})
        if (input.path === "/precios") return json(200, { filas: [] })
        if (input.path === "/documentacion") return json(200, {})
        if (input.path === "/clientes") return json(400, { code: "IGNORED" })
        if (input.path === "/contratos" && input.method === "POST") return json(201, { id: 3, estado: "Pte. RGPD" })
        if (input.path === "/contratos/3") return json(200, { cups: "ES0000000000000000TT" })
        return json(200, {})
      },
    }
    const report = await runEnertechAltaPrueba(http, {
      cliente: { nombre: "Ana" },
      clienteIncompleto: { nombre: "Ana" },
      contrato: { cups: CUPS },
      contratoSinCnae: { cups: CUPS },
      idempotencyKey: "prueba-2",
      cups: CUPS,
    })
    expect(posts).toBe(2)
    expect(report.cliente.id).toBe(44)
    expect(report.relecturaCupsOk).toBe(false)
    expect(pickPrecioForAlta({ filas: [] })).toBeNull()
    expect(countDocumentacion({})).toBeNull()
    expect(readEnertechId({ cliente: { id: 8 } }, ["id"])).toBe(8)
    expect(readEnertechCups({ contrato: { cups: CUPS } })).toBe(CUPS)
    expect(readEnertechEstado({ estado: { nombre: "Pendiente de carga" } })).toBe("Pendiente de carga")
    expect(pruebaDni(42)).toMatch(/^\d{8}[A-Z]$/)
  })
})
