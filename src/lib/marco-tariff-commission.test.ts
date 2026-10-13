import { describe, expect, it } from "vitest"
import { parseConsumoTramoRange } from "./marco-consumo-tramo"
import {
  commissionSliceFromPayload,
  weaveMarcoTariffsWithCommissions,
  type MarcoTariffOffer,
} from "./marco-tariff-commission"

function offer(partial: Partial<MarcoTariffOffer> & Pick<MarcoTariffOffer, "tarifa">): MarcoTariffOffer {
  return {
    id: partial.tarifa,
    compania: "NATURGY PYMES",
    companiaLogoUrl: null,
    peaje: "2.0TD",
    tipo: "luz",
    segmento: "pyme",
    energia: [0.2, null, null, null, null, null],
    potencia: [0.1, null, null, null, null, null],
    ...partial,
  }
}

function slice(campania: string, tramo: string, eur: number, peaje = "") {
  const parsed = commissionSliceFromPayload({
    compania: "NATURGY PYMES",
    payload: {
      campania,
      tarifa: peaje,
      tramo,
      tipo_comision: tramo ? "fijo_mwh" : "fijo_contrato",
      comision_eur: eur,
      comision_por_mw: eur,
    },
  })
  if (!parsed) throw new Error("slice")
  return parsed
}

describe("parseConsumoTramoRange", () => {
  it("lee tope abierto y suelo abierto de Enertech", () => {
    expect(parseConsumoTramoRange("-5000 kWh")).toEqual({ desde: 0, hasta: 5000 })
    expect(parseConsumoTramoRange("10000- kWh")?.desde).toBe(10000)
    expect(parseConsumoTramoRange("10000- kWh")?.hasta).toBe(Number.MAX_SAFE_INTEGER)
    expect(parseConsumoTramoRange("5000-10000 kWh")).toEqual({ desde: 5000, hasta: 10000 })
  })
})

describe("commissionSliceFromPayload", () => {
  it("ignora la fila sin importe, que si no pintaría 0 €", () => {
    expect(
      commissionSliceFromPayload({
        compania: "",
        payload: { campania: "A TU AIRE", tarifa: "", tramo: "", comision_eur: null },
      })
    ).toBeNull()
  })

  it("lee el porcentaje del fee cuando comision_eur llega null", () => {
    const energia = commissionSliceFromPayload({
      compania: "ENDESA",
      payload: {
        campania: "OK LUZ NEGOCIO",
        tarifa: "3.0TD",
        tramo: "",
        tipo_comision: "fee_energia",
        comision_eur: null,
        importe_comercial: "1,25 % fee energía",
      },
    })
    const potencia = commissionSliceFromPayload({
      compania: "ENDESA",
      payload: {
        campania: "OK LUZ NEGOCIO",
        tipo_comision: "fee_potencia",
        comision_eur: null,
        importe_comercial: "0.5 % fee potencia",
      },
    })
    expect(energia).toMatchObject({ comision: 1.25, unidad: "porcentaje_consumo" })
    expect(potencia).toMatchObject({ comision: 0.5, unidad: "porcentaje_termino" })
  })
})

describe("weaveMarcoTariffsWithCommissions", () => {
  const commissions = [
    slice("BASE", "", 120),
    slice("BASE", "10000- kWh", 14),
    slice("ONE", "", 60),
    slice("ONE", "10000- kWh", 6),
    slice("SUPRA", "", 180),
    commissionSliceFromPayload({
      compania: "NATURGY RESIDENCIAL",
      payload: {
        campania: "TARIFA POR USO LUZ",
        tarifa: "2.0TD",
        tramo: "-5000 kWh",
        tipo_comision: "fijo_contrato",
        comision_eur: 100,
      },
    })!,
    commissionSliceFromPayload({
      compania: "NATURGY RESIDENCIAL",
      payload: {
        campania: "TARIFA NOCHE LUZ ECO",
        tarifa: "2.0TD",
        tramo: "",
        tipo_comision: "fijo_contrato",
        comision_eur: 100,
      },
    })!,
  ]

  const offers = [
    offer({ tarifa: "Plan Fijo Luz" }),
    offer({ tarifa: "Plan Fijo Luz 24h" }),
    offer({ tarifa: "Plan Fijo Luz 24h ONE" }),
    offer({ tarifa: "Plan Fijo Luz SUPRA" }),
    offer({
      id: "uso",
      compania: "NATURGY RESIDENCIAL",
      tarifa: "Tarifa Por Uso Luz",
      segmento: "residencial",
    }),
    offer({
      id: "noche",
      compania: "NATURGY RESIDENCIAL",
      tarifa: "Tarifa Noche Luz",
      segmento: "residencial",
    }),
  ]

  const woven = weaveMarcoTariffsWithCommissions(offers, commissions)

  it("aplica el tramo BASE a la tarifa sin sufijo y no la mezcla con ONE", () => {
    const base = woven.find((row) => row.tarifa === "Plan Fijo Luz")
    const one = woven.find((row) => row.tarifa === "Plan Fijo Luz 24h ONE")
    expect(base?.tramos.map((tramo) => tramo.comision_base)).toEqual([14, 120])
    expect(one?.tramos.map((tramo) => tramo.comision_base)).toEqual([6, 60])
    expect(base?.compania).toBe("NATURGY PYMES")
  })

  it("conserva Plan Fijo Luz y Plan Fijo Luz 24h como tarifas distintas", () => {
    const names = woven.map((row) => row.tarifa)
    expect(names.filter((name) => name.startsWith("Plan Fijo Luz"))).toHaveLength(4)
  })

  it("cruza la tarifa residencial por nombre y peaje", () => {
    const uso = woven.find((row) => row.tarifa === "Tarifa Por Uso Luz")
    expect(uso?.hasCommission).toBe(true)
    expect(uso?.tramos[0]?.desde_kwh).toBe(0)
    expect(uso?.tramos[0]?.hasta_kwh).toBe(5000)
  })

  it("engancha Tarifa Noche Luz con la comisión ECO cuando no hay otra tarifa con ese nombre", () => {
    const noche = woven.find((row) => row.tarifa === "Tarifa Noche Luz")
    expect(noche?.hasCommission).toBe(true)
    expect(noche?.tramos[0]?.comision_base).toBe(100)
  })

  it("deja la tarifa visible aunque no haya comisión", () => {
    const alone = weaveMarcoTariffsWithCommissions(
      [offer({ id: "endesa", compania: "ENDESA", tarifa: "Plan Estable", segmento: "residencial" })],
      []
    )
    expect(alone).toHaveLength(1)
    expect(alone[0]?.hasCommission).toBe(false)
  })

  it("engancha la comisión sin el código de año y con la compañía en otra grafía", () => {
    const wovenYear = weaveMarcoTariffsWithCommissions(
      [offer({ compania: "OPCION ENERGIA", tarifa: "FIJA LABORAL 20269 MAX", peaje: "3.0TD" })],
      [
        commissionSliceFromPayload({
          compania: "OPCIÓN ENERGÍA",
          payload: {
            campania: "FIJA LABORAL MAX",
            tarifa: "3.0TD",
            tramo: "-10000 kWh",
            tipo_comision: "fijo_contrato",
            comision_eur: 50,
          },
        })!,
      ]
    )
    expect(wovenYear[0]?.hasCommission).toBe(true)
    expect(wovenYear[0]?.tramos[0]?.comision_base).toBe(50)

    const neon = weaveMarcoTariffsWithCommissions(
      [offer({ compania: "NEON", tarifa: "AIRE", peaje: "2.0TD", segmento: "residencial" })],
      [
        commissionSliceFromPayload({
          compania: "NEÓN",
          payload: {
            campania: "AIRE",
            tarifa: "2.0TD",
            tramo: "-5000 kWh",
            tipo_comision: "fijo_contrato",
            comision_eur: 80,
          },
        })!,
      ]
    )
    expect(neon[0]?.hasCommission).toBe(true)
    expect(neon[0]?.tramos[0]?.comision_base).toBe(80)
  })

  it("enlaza la comisión de la compañía madre y el código corto de la tarifa", () => {
    const nordy = weaveMarcoTariffsWithCommissions(
      [offer({ compania: "NORDY PYMES", tarifa: "+Estocolmo I", peaje: "2.0TD" })],
      [
        commissionSliceFromPayload({
          compania: "NORDY",
          payload: {
            campania: "Estocolmo I",
            tarifa: "2.0TD",
            tramo: "-5000 kWh",
            tipo_comision: "fijo_contrato",
            comision_eur: 40,
          },
        })!,
      ]
    )
    expect(nordy[0]?.tramos[0]?.comision_base).toBe(40)

    const axpo = weaveMarcoTariffsWithCommissions(
      [
        offer({ compania: "AXPO", tarifa: "ESTABLE PLUS SUPER (N1)", peaje: "2.0TD" }),
        offer({ compania: "AXPO", tarifa: "ESTABLE PLUS ESTANDAR (N2)", peaje: "2.0TD" }),
      ],
      [
        commissionSliceFromPayload({
          compania: "AXPO",
          payload: {
            campania: "ESTABLE PLUS Super",
            tarifa: "2.0TD",
            tramo: "-1000 kWh",
            tipo_comision: "fijo_contrato",
            comision_eur: 81,
          },
        })!,
      ]
    )
    expect(axpo.find((row) => row.tarifa.includes("SUPER"))?.tramos[0]?.comision_base).toBe(81)
    expect(axpo.find((row) => row.tarifa.includes("ESTANDAR"))?.hasCommission).toBe(false)

    const reazziona = weaveMarcoTariffsWithCommissions(
      [offer({ compania: "REAZZIONA", tarifa: "SELEZZIONA S1", peaje: "3.0TD" })],
      [
        commissionSliceFromPayload({
          compania: "REAZZIONA",
          payload: {
            campania: "S1",
            tarifa: "3.0TD",
            tramo: "10000-20000 kWh",
            tipo_comision: "fijo_contrato",
            comision_eur: 220,
          },
        })!,
      ]
    )
    expect(reazziona[0]?.tramos[0]?.comision_base).toBe(220)
  })

  it("enganza la comisión corta cuando el nombre de la tarifa la contiene", () => {
    const woven = weaveMarcoTariffsWithCommissions(
      [
        offer({ compania: "CYE ENERGIA", tarifa: "CONFIANZA TRIPLE", peaje: "2.0TD" }),
        offer({ compania: "CYE ENERGIA", tarifa: "20ES1 ÚNICA", peaje: "2.0TD" }),
        offer({ compania: "GANA ENERGIA", tarifa: "Tarifa 24 horas", peaje: "2.0TD" }),
      ],
      [
        commissionSliceFromPayload({
          compania: "CYE",
          payload: {
            campania: "CONFIANZA",
            tarifa: "2.0TD",
            tramo: "-5000 kWh",
            tipo_comision: "fijo_contrato",
            comision_eur: 35,
          },
        })!,
        commissionSliceFromPayload({
          compania: "CYE ENERGIA",
          payload: {
            campania: "20ES1 UNICA",
            tarifa: "2.0TD",
            tramo: "5000-10000 kWh",
            tipo_comision: "fijo_contrato",
            comision_eur: 48,
          },
        })!,
      ]
    )
    expect(woven.find((row) => row.tarifa === "CONFIANZA TRIPLE")?.tramos[0]?.comision_base).toBe(35)
    expect(woven.find((row) => row.tarifa === "20ES1 ÚNICA")?.tramos[0]?.comision_base).toBe(48)
    expect(woven.find((row) => row.tarifa === "Tarifa 24 horas")?.hasCommission).toBe(false)
  })
})
