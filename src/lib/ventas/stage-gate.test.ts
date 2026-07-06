import { describe, expect, it } from "vitest"
import {
  canStageGateAdvance,
  computeCaducidadOferta5Dias,
  createEmptyChecklistCompletion,
  FACTURA_GATE_ITEMS,
  getNextStageGateFase,
  getOperationalTasksForProspecto,
  getStageGateForTransition,
  isChecklistComplete,
  isCualificadoChecklistComplete,
  isProspectoReadyToAdvance,
} from "./stage-gate"
import { isLeadDigitalFromMetadata, getProspectoNuevoSlaHorasFromMetadata } from "./sla-rules"
import { getSlaUrgencia } from "./pipeline"

describe("stage-gate", () => {
  it("only allows advancing one stage forward", () => {
    expect(canStageGateAdvance("prospecto_nuevo", "contactado")).toBe(true)
    expect(canStageGateAdvance("prospecto_nuevo", "cualificado")).toBe(false)
    expect(canStageGateAdvance("pendiente_firma", "activado")).toBe(false)
    expect(getNextStageGateFase("contactado")).toBe("cualificado")
  })

  it("defines gates for each stage transition", () => {
    expect(getStageGateForTransition("prospecto_nuevo", "contactado")).not.toBeNull()
    expect(getStageGateForTransition("contactado", "cualificado")).not.toBeNull()
    expect(getStageGateForTransition("cualificado", "propuesta_enviada")).not.toBeNull()
    expect(getStageGateForTransition("propuesta_enviada", "pendiente_firma")).not.toBeNull()
  })

  it("requires full factura gate for cualificado advance checklist", () => {
    const partial = createEmptyChecklistCompletion(FACTURA_GATE_ITEMS)
    partial.factura_recibida = { checked: true, attachments: [], comment: "Recibida por email" }
    expect(isChecklistComplete(FACTURA_GATE_ITEMS, partial)).toBe(false)
    expect(
      isCualificadoChecklistComplete(
        createEmptyChecklistCompletion(
          getStageGateForTransition("cualificado", "propuesta_enviada")!.items
        )
      )
    ).toBe(false)
  })

  it("requires comment on each checked item", () => {
    const completion = createEmptyChecklistCompletion(FACTURA_GATE_ITEMS)
    for (const item of FACTURA_GATE_ITEMS) {
      completion[item.id] = { checked: true, attachments: [], comment: "" }
    }
    expect(isChecklistComplete(FACTURA_GATE_ITEMS, completion)).toBe(false)

    for (const item of FACTURA_GATE_ITEMS) {
      completion[item.id] = { checked: true, attachments: [], comment: "Hecho" }
    }
    expect(isChecklistComplete(FACTURA_GATE_ITEMS, completion)).toBe(true)
  })

  it("isProspectoReadyToAdvance uses persisted stage progress", () => {
    const prospecto = {
      id: "p1",
      nombre: "Test",
      fase: "prospecto_nuevo" as const,
      faseChangedAt: "2026-06-01T10:00:00Z",
      diasEnFase: 0,
      comercialId: "c1",
      comercialName: "C",
      telefono: "600",
      createdAt: "2026-06-01T10:00:00Z",
      updatedAt: "2026-06-01T10:00:00Z",
      metadata: {},
    }
    expect(isProspectoReadyToAdvance(prospecto)).toBe(false)

    const ready = {
      ...prospecto,
      metadata: {
        stage_progress_prospecto_nuevo: {
          contacto_telefonico_o_visita: {
            checked: true,
            comment: "Llamé",
            attachments: [],
          },
          hablado_con_alguien_empresa: {
            checked: true,
            comment: "Hablamos con recepción",
            attachments: [],
          },
        },
      },
    }
    expect(isProspectoReadyToAdvance(ready)).toBe(true)
  })

  it("computes caducidad 5 days ahead for propuesta", () => {
    const ref = new Date("2026-06-01T12:00:00Z")
    const iso = computeCaducidadOferta5Dias(ref)
    expect(new Date(iso).getUTCDate()).toBe(6)
  })

  it("maps prospecto_nuevo to contacto empresa operational tasks", () => {
    const tasks = getOperationalTasksForProspecto({
      id: "p1",
      nombre: "Test",
      fase: "prospecto_nuevo",
      metadata: {
        stage_progress_prospecto_nuevo: {
          contacto_telefonico_o_visita: { checked: true },
        },
      },
    } as import("./types").Prospecto)
    expect(tasks.length).toBe(2)
    expect(tasks[0].label).toContain("Primer intento de contacto")
    expect(tasks[0].done).toBe(true)
    expect(tasks[1].label).toContain("Se ha hablado con alguien")
    expect(tasks[1].done).toBe(false)
  })
})

describe("sla-rules", () => {
  it("uses 2h SLA for digital leads", () => {
    expect(getProspectoNuevoSlaHorasFromMetadata({ canal_origen: "lead web" })).toBe(2)
    expect(getProspectoNuevoSlaHorasFromMetadata({ canal_origen: "calle" })).toBe(24)
    expect(isLeadDigitalFromMetadata({ lead_digital: true })).toBe(true)
  })

  it("breaches prospecto_nuevo SLA at 2h for digital", () => {
    const changedAt = new Date("2026-06-17T10:00:00Z").toISOString()
    const ref = new Date("2026-06-17T12:30:00Z")
    const urgencia = getSlaUrgencia(
      {
        fase: "prospecto_nuevo",
        faseChangedAt: changedAt,
        diasEnFase: 0,
        metadata: { lead_digital: true },
      },
      ref
    )
    expect(urgencia).toBe("breach")
  })
})
