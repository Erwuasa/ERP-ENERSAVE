import { describe, expect, it } from "vitest"
import {
  canTransition,
  FUNNEL_ACTIVE,
  FUNNEL_ORDER,
  getNextFases,
  getProspectoFaseBadgeClass,
  getSlaBadgeClass,
  getSlaUrgencia,
  isMotivoDescarte,
  isSubtipoPrioridadMaxima,
  isTerminalFase,
  MOTIVOS_DESCARTE,
  PIPELINE_FASE_CONFIG,
  PIPELINE_KANBAN_COLUMNS,
  SUBTIPOS_PROSPECTO,
  type TransitionValidationResult,
  validateTransition,
} from "./pipeline"
import type { ProspectoFase } from "./types"

describe("PIPELINE_FASE_CONFIG", () => {
  it("has 11 fases with unique kanbanOrder 1-11", () => {
    expect(PIPELINE_FASE_CONFIG.length).toBe(11)
    const orders = PIPELINE_FASE_CONFIG.map((c) => c.kanbanOrder)
    expect(new Set(orders).size).toBe(11)
    expect(Math.min(...orders)).toBe(1)
    expect(Math.max(...orders)).toBe(11)
  })

  it("only activado and descartado are terminal", () => {
    const terminals = PIPELINE_FASE_CONFIG.filter((c) => c.isTerminal)
    expect(terminals.map((c) => c.id)).toEqual(["activado", "descartado"])
  })

  it("PIPELINE_KANBAN_COLUMNS sorted by kanbanOrder", () => {
    for (let i = 1; i < PIPELINE_KANBAN_COLUMNS.length; i++) {
      expect(PIPELINE_KANBAN_COLUMNS[i].kanbanOrder).toBeGreaterThan(
        PIPELINE_KANBAN_COLUMNS[i - 1].kanbanOrder
      )
    }
  })

  it("getProspectoFaseBadgeClass returns non-empty for all fases", () => {
    for (const config of PIPELINE_FASE_CONFIG) {
      expect(getProspectoFaseBadgeClass(config.id).length).toBeGreaterThan(0)
    }
  })
})

describe("FUNNEL_ORDER", () => {
  it("has 8 entries ending with activado", () => {
    expect(FUNNEL_ORDER.length).toBe(8)
    expect(FUNNEL_ORDER[FUNNEL_ORDER.length - 1]).toBe("activado")
  })

  it("FUNNEL_ACTIVE excludes activado", () => {
    expect(FUNNEL_ACTIVE.length).toBe(7)
    expect((FUNNEL_ACTIVE as readonly ProspectoFase[]).includes("activado")).toBe(false)
  })
})

describe("transitions", () => {
  it("allows bidirectional adjacent moves in funnel", () => {
    expect(canTransition("negociacion", "propuesta_enviada")).toBe(true)
    expect(canTransition("propuesta_enviada", "negociacion")).toBe(true)
    expect(canTransition("negociacion", "tramitacion")).toBe(true)
    expect(canTransition("tramitacion", "negociacion")).toBe(true)
  })

  it("blocks skip-ahead", () => {
    expect(canTransition("prospecto_nuevo", "cualificado")).toBe(false)
  })

  it("allows any FUNNEL_ACTIVE to con_dudas and descartado", () => {
    for (const fase of FUNNEL_ACTIVE) {
      expect(canTransition(fase, "con_dudas")).toBe(true)
      expect(canTransition(fase, "descartado")).toBe(true)
    }
  })

  it("allows pendiente_firma to activado", () => {
    expect(canTransition("pendiente_firma", "activado")).toBe(true)
  })

  it("activado has no outbound transitions", () => {
    expect(getNextFases("activado")).toEqual([])
    expect(canTransition("activado", "recontactar")).toBe(false)
  })

  it("con_dudas and descartado go to recontactar", () => {
    expect(canTransition("con_dudas", "recontactar")).toBe(true)
    expect(canTransition("descartado", "recontactar")).toBe(true)
  })

  it("recontactar can go to any FUNNEL_ACTIVE plus side lanes", () => {
    for (const fase of FUNNEL_ACTIVE) {
      expect(canTransition("recontactar", fase)).toBe(true)
    }
    expect(canTransition("recontactar", "con_dudas")).toBe(true)
    expect(canTransition("recontactar", "descartado")).toBe(true)
  })
})

describe("PIPE-05 validateTransition", () => {
  function expectFailure(result: TransitionValidationResult, code: string) {
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.code).toBe(code)
    }
  }

  it("rejects same fase with Spanish message", () => {
    const result = validateTransition("contactado", "contactado")
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.code).toBe("same_fase")
      expect(result.message).toMatch(/ya está/)
    }
  })

  it("rejects invalid transition with Spanish message", () => {
    const result = validateTransition("prospecto_nuevo", "cualificado")
    expect(result.ok).toBe(false)
    if (result.ok === false) {
      expect(result.code).toBe("invalid_transition")
      expect(result.message).toMatch(/No se puede/)
    }
  })

  it("requires subEstado for tramitacion", () => {
    expectFailure(validateTransition("negociacion", "tramitacion"), "sub_estado_required")
  })

  it("requires motivoDescarte for descartado", () => {
    expectFailure(validateTransition("contactado", "descartado"), "motivo_required")
  })

  it("rejects invalid motivo descarte", () => {
    expectFailure(
      validateTransition("contactado", "descartado", {
        motivoDescarte: "precio_no_competitivo" as never,
      }),
      "invalid_motivo"
    )
  })

  it("requires motivoConDudas for con_dudas", () => {
    expectFailure(validateTransition("contactado", "con_dudas"), "motivo_dudas_required")
  })

  it("requires fechaProximoContacto for contactado", () => {
    expectFailure(validateTransition("prospecto_nuevo", "contactado"), "fecha_contacto_required")
  })

  it("requires subtipo for prospecto_nuevo target", () => {
    expectFailure(validateTransition("contactado", "prospecto_nuevo"), "subtipo_required")
  })

  it("requires motivo and fecha for recontactar", () => {
    expectFailure(
      validateTransition("descartado", "recontactar", {
        fechaRecontactar: "2026-07-01T10:00:00Z",
      }),
      "motivo_recontacto_required"
    )
    expectFailure(
      validateTransition("descartado", "recontactar", {
        motivoRecontacto: "Cliente interesado",
      }),
      "fecha_recontactar_required"
    )
  })

  it("accepts valid tramitacion transition", () => {
    const result = validateTransition("negociacion", "tramitacion", {
      subEstado: "en_proceso",
    })
    expect(result.ok).toBe(true)
  })
})

describe("MOTIVOS_DESCARTE", () => {
  it("has exactly 9 locked ids", () => {
    expect(MOTIVOS_DESCARTE.length).toBe(9)
    expect(isMotivoDescarte("precio_competencia")).toBe(true)
    expect(isMotivoDescarte("precio_no_competitivo")).toBe(false)
  })
})

describe("subtipo", () => {
  it("isSubtipoPrioridadMaxima true for all subtipos", () => {
    for (const subtipo of SUBTIPOS_PROSPECTO) {
      expect(isSubtipoPrioridadMaxima(subtipo.id)).toBe(true)
    }
  })
})

describe("getSlaUrgencia", () => {
  const ref = new Date("2026-06-17T14:00:00Z")

  it("uses faseChangedAt hours for prospecto_nuevo 4h SLA", () => {
    const warning = getSlaUrgencia(
      {
        fase: "prospecto_nuevo",
        faseChangedAt: "2026-06-17T10:30:00Z",
        diasEnFase: 0,
      },
      ref
    )
    expect(warning).toBe("warning")

    const breach = getSlaUrgencia(
      {
        fase: "prospecto_nuevo",
        faseChangedAt: "2026-06-17T09:00:00Z",
        diasEnFase: 0,
      },
      ref
    )
    expect(breach).toBe("breach")
  })

  it("uses fechaProximoContacto for contactado", () => {
    const breach = getSlaUrgencia(
      {
        fase: "contactado",
        faseChangedAt: "2026-06-15T10:00:00Z",
        diasEnFase: 2,
        fechaProximoContacto: "2026-06-17T12:00:00Z",
      },
      ref
    )
    expect(breach).toBe("breach")
  })

  it("compares diasEnFase for day-based fases", () => {
    const breach = getSlaUrgencia(
      {
        fase: "cualificado",
        faseChangedAt: "2026-06-10T10:00:00Z",
        diasEnFase: 3,
      },
      ref
    )
    expect(breach).toBe("breach")
  })

  it("returns na for con_dudas, descartado, recontactar", () => {
    expect(
      getSlaUrgencia({
        fase: "con_dudas",
        faseChangedAt: "2026-06-10T10:00:00Z",
        diasEnFase: 10,
      })
    ).toBe("na")
    expect(
      getSlaUrgencia({
        fase: "descartado",
        faseChangedAt: "2026-06-10T10:00:00Z",
        diasEnFase: 10,
      })
    ).toBe("na")
    expect(
      getSlaUrgencia({
        fase: "recontactar",
        faseChangedAt: "2026-06-10T10:00:00Z",
        diasEnFase: 10,
      })
    ).toBe("na")
  })
})

describe("getSlaBadgeClass", () => {
  it("covers all urgency values", () => {
    for (const urgencia of ["ok", "warning", "breach", "na"] as const) {
      expect(getSlaBadgeClass(urgencia).length).toBeGreaterThan(0)
    }
  })
})

describe("isTerminalFase", () => {
  it("matches config terminals", () => {
    expect(isTerminalFase("activado")).toBe(true)
    expect(isTerminalFase("descartado")).toBe(true)
    expect(isTerminalFase("contactado")).toBe(false)
  })
})
