import { describe, expect, it } from "vitest"
import {
  ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE,
  ENERTECH_WEBHOOK_EVENTS_MAX_PAGE_SIZE,
  resolveEnertechWebhookEventsListRange,
  summarizeEnertechWebhookPayload,
} from "./enertech-webhook-events"

describe("resolveEnertechWebhookEventsListRange", () => {
  it("defaults to page 1 and standard page size", () => {
    expect(resolveEnertechWebhookEventsListRange(undefined, undefined)).toEqual({
      page: 1,
      pageSize: ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE,
      from: 0,
      to: ENERTECH_WEBHOOK_EVENTS_DEFAULT_PAGE_SIZE - 1,
    })
  })

  it("computes range for page 3", () => {
    expect(resolveEnertechWebhookEventsListRange(3, 10)).toEqual({
      page: 3,
      pageSize: 10,
      from: 20,
      to: 29,
    })
  })

  it("clamps invalid page and caps page size", () => {
    expect(resolveEnertechWebhookEventsListRange(0, 500).page).toBe(1)
    expect(resolveEnertechWebhookEventsListRange(2, 500).pageSize).toBe(
      ENERTECH_WEBHOOK_EVENTS_MAX_PAGE_SIZE
    )
  })
})

describe("summarizeEnertechWebhookPayload", () => {
  it("builds a readable summary from common keys", () => {
    expect(
      summarizeEnertechWebhookPayload({
        event_type: "contract.updated",
        id: "evt-99",
        entity: "contrato",
      })
    ).toBe("contract.updated · id evt-99 · contrato")
  })

  it("returns dash for empty payload", () => {
    expect(summarizeEnertechWebhookPayload(null)).toBe("—")
  })
})
