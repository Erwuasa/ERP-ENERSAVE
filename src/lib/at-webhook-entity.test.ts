import { describe, expect, it } from "vitest"
import { extractAtWebhookIds } from "./at-webhook-entity"

describe("extractAtWebhookIds", () => {
  it("reads contract id from contract.status_changed", () => {
    expect(
      extractAtWebhookIds("contract.status_changed", {
        event: "contract.status_changed",
        data: { id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa", status: "incident" },
      })
    ).toEqual({
      contractId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      incidentId: null,
    })
  })

  it("reads both ids from contract_incident.created", () => {
    expect(
      extractAtWebhookIds("contract_incident.created", {
        data: {
          id: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
          contract_id: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
        },
      })
    ).toEqual({
      contractId: "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
      incidentId: "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb",
    })
  })

  it("reads incident id from incident.updated", () => {
    expect(
      extractAtWebhookIds("incident.updated", {
        payload: { id: "cccccccc-cccc-cccc-cccc-cccccccccccc" },
      })
    ).toEqual({
      contractId: null,
      incidentId: "cccccccc-cccc-cccc-cccc-cccccccccccc",
    })
  })

  it("ignores non-uuid ids", () => {
    expect(extractAtWebhookIds("contract.updated", { data: { id: "ATCONT-1" } })).toEqual({
      contractId: null,
      incidentId: null,
    })
  })
})
