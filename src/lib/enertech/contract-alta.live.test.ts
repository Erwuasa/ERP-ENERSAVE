import { describe, expect, it } from "vitest"
import {
  ENERTECH_TEST_BASE_URL,
  buildEnertechClienteBody,
  buildEnertechContratoBody,
  createEnertechTestHttp,
  pruebaCups,
  pruebaDni,
  runEnertechAltaPrueba,
} from "./contract-alta"

const live = process.env.ENERTECH_ALTA_LIVE === "1"
const apiKey = process.env.ENERTECH_API_KEY?.trim() ?? ""
const requestedBase = (process.env.ENERTECH_API_BASE_URL ?? ENERTECH_TEST_BASE_URL).replace(/\/$/, "")

describe.skipIf(!live)("alta Enertech en devintranet", () => {
  it("crea un cliente de prueba, un contrato, y comprueba error, duplicado e idempotencia", async () => {
    expect(requestedBase, "ENERTECH_API_BASE_URL debe ser el entorno de pruebas").toBe(ENERTECH_TEST_BASE_URL)
    expect(apiKey, "Falta ENERTECH_API_KEY del entorno de pruebas").not.toBe("")

    const stamp = Date.now() % 90000000
    const dni = pruebaDni(10_000_000 + (stamp % 80_000_000))
    const cups = pruebaCups(String(22000099000000 + (stamp % 100000)).padStart(16, "0"))
    const cliente = buildEnertechClienteBody({
      nombre: "Prueba",
      apellido1: "Enersave",
      apellido2: "NoUsar",
      dni,
      email: `prueba-alta-${stamp}@example.com`,
      movil: "600000000",
    })
    const incompleto = buildEnertechClienteBody({ nombre: "Prueba", apellido1: "Enersave", dni: "12345678A" })
    expect(cliente.ok).toBe(true)
    expect(incompleto.ok).toBe(false)

    const contrato = buildEnertechContratoBody({
      clientId: 1,
      cups,
      cnae: "4711",
      claveTarifa: "tf_pendiente",
      cp: "41001",
      poblacion: "Sevilla",
      provincia: "Sevilla",
      viaTipo: "CALLE",
      viaNombre: "Mayor",
      viaNumero: "10",
      consumption: 1500,
      powersKw: { p1: 4.6, p2: 4.6 },
    })
    expect(contrato.ok).toBe(true)
    if (cliente.ok === false || contrato.ok === false) return
    const { clientId: _ignoredClient, clave_tarifa: _ignoredClave, ...contratoSinCliente } = contrato.value

    const report = await runEnertechAltaPrueba(createEnertechTestHttp(apiKey), {
      cliente: cliente.value,
      clienteIncompleto: { nombre: "Prueba", dni },
      contrato: contratoSinCliente,
      contratoSinCnae: { cups },
      idempotencyKey: `enersave-prueba-${stamp}`,
      cups,
    })

    expect(
      report.perfilOk,
      `devintranet ha rechazado la clave (${report.perfilStatus} ${report.perfilCode ?? "sin código"}). La clave de producción no vale en pruebas.`
    ).toBe(true)
    expect(report.clienteIncompleto.status).toBeGreaterThanOrEqual(400)
    expect(report.cliente.status).toBe(201)
    expect(report.cliente.id).not.toBeNull()
    expect(report.clienteDuplicado.status).toBe(409)
    expect(report.clienteDuplicado.code).toBe("CLIENT_EXISTS")
    expect(report.contratoSinCnae.status).toBeGreaterThanOrEqual(400)
    expect(report.contrato.status).toBe(201)
    expect(report.contrato.id).not.toBeNull()
    expect(report.relecturaCupsOk).toBe(true)
    expect(report.idempotenciaOk).toBe(true)
  }, 60_000)
})
