import { describe, expect, it } from "vitest"
import {
  createEmptyChecklistCompletion,
  isChecklistComplete,
  FACTURA_GATE_ITEMS,
} from "./stage-gate"
import { STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM } from "./stage-gate-attachments"

describe("stage-gate attachments", () => {
  it("allows optional attachments without blocking completion", () => {
    const completion = createEmptyChecklistCompletion(FACTURA_GATE_ITEMS)
    for (const item of FACTURA_GATE_ITEMS) {
      completion[item.id] = {
        checked: true,
        attachments: [
          {
            name: "factura.pdf",
            mimeType: "application/pdf",
            sizeBytes: 1024,
            dataUrl: "data:application/pdf;base64,abc",
          },
        ],
        comment: "Factura recibida",
      }
    }
    expect(isChecklistComplete(FACTURA_GATE_ITEMS, completion)).toBe(true)
  })

  it("limits max attachments per item", () => {
    expect(STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM).toBe(3)
  })
})
