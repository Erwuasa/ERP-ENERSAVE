import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { entitySyncOptions } from "../../../supabase/functions/_shared/enertech-entities"

type Row = Record<string, unknown>

/** Minimal in-memory stand-in for the slice of supabase-js the sync engine uses. */
function createFakeSupabase(seed: Record<string, Row[]> = {}) {
  const tables: Record<string, Row[]> = { ...seed }
  const table = (name: string) => (tables[name] ??= [])

  function builder(name: string) {
    const state: { op: "select" | "update" | "upsert" | "insert"; patch?: Row; records?: Row[]; onConflict?: string; filters: Array<(row: Row) => boolean>; range?: [number, number]; single?: boolean } = {
      op: "select",
      filters: [],
    }

    const run = () => {
      const rows = table(name)
      if (state.op === "insert") {
        rows.push(...(state.records ?? []))
        return { data: null, error: null }
      }
      if (state.op === "upsert") {
        for (const record of state.records ?? []) {
          const key = state.onConflict as string
          const index = rows.findIndex((row) => row[key] === record[key])
          if (index >= 0) rows[index] = { ...rows[index], ...record }
          else rows.push({ ...record })
        }
        return { data: null, error: null }
      }
      const matching = rows.filter((row) => state.filters.every((filter) => filter(row)))
      if (state.op === "update") {
        for (const row of matching) Object.assign(row, state.patch)
        return { data: null, error: null }
      }
      const sliced = state.range ? matching.slice(state.range[0], state.range[1] + 1) : matching
      return { data: state.single ? (sliced[0] ?? null) : sliced.map((row) => ({ ...row })), error: null }
    }

    const api: Record<string, unknown> = {
      select: () => api,
      order: () => api,
      range: (from: number, to: number) => {
        state.range = [from, to]
        return api
      },
      eq: (column: string, value: unknown) => {
        state.filters.push((row) => row[column] === value)
        return api
      },
      in: (column: string, values: unknown[]) => {
        state.filters.push((row) => values.includes(row[column]))
        return api
      },
      maybeSingle: () => {
        state.single = true
        return Promise.resolve(run())
      },
      update: (patch: Row) => {
        state.op = "update"
        state.patch = patch
        return api
      },
      insert: (records: Row | Row[]) => {
        state.op = "insert"
        state.records = Array.isArray(records) ? records : [records]
        return api
      },
      upsert: (records: Row | Row[], options: { onConflict: string }) => {
        state.op = "upsert"
        state.records = Array.isArray(records) ? records : [records]
        state.onConflict = options.onConflict
        return api
      },
      then: (resolve: (value: unknown) => unknown) => resolve(run()),
    }
    return api
  }

  return { tables, client: { from: (name: string) => builder(name) } as never }
}

function mockEnertech(handlers: Record<string, (url: URL) => unknown>) {
  const calls: URL[] = []
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: URL | string) => {
      const url = new URL(String(input))
      calls.push(url)
      const handler = handlers[url.pathname.replace(/^\/v1/, "")]
      const body = handler ? handler(url) : { success: false }
      return new Response(JSON.stringify(body), { status: handler ? 200 : 404, headers: { "content-type": "application/json" } })
    })
  )
  return calls
}

const feedRow = (clave: string, actualizado: string, extra: Row = {}) => ({
  clave,
  id: Number(clave.replace(/\D/g, "")) || 1,
  actualizado_en: actualizado,
  id_company: 14,
  tipo: "fijo",
  ...extra,
})

beforeEach(() => {
  vi.stubGlobal("Deno", { env: { get: (key: string) => (key === "ENERTECH_API_KEY" ? "test-key" : undefined) } })
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("enertech-sync-precios", () => {
  it("creates, detects changes, removes and restores rows", async () => {
    const { tables, client } = createFakeSupabase()
    const options = entitySyncOptions("enertech-sync-precios")
    const ctx = { supabase: client, runId: "run-1", params: new URLSearchParams() }

    let feed = [feedRow("tf_1", "2026-10-01"), feedRow("tf_2", "2026-10-01")]
    mockEnertech({ "/precios": () => ({ success: true, total: feed.length, filas: feed }) })

    expect(await options.runSync(ctx)).toMatchObject({ created: 2, updated: 0, unchanged: 2 - 2, skipped: 0 })
    expect(tables.enertech_precios).toHaveLength(2)
    expect(tables.enertech_precios![0]).toMatchObject({ clave: "tf_1", company_id: 14, tipo: "fijo", removed_at: null })

    expect(await options.runSync(ctx)).toMatchObject({ created: 0, updated: 0, unchanged: 2 })

    feed = [feedRow("tf_1", "2026-10-05"), feedRow("tf_2", "2026-10-01")]
    expect(await options.runSync(ctx)).toMatchObject({ updated: 1, unchanged: 1 })
    expect(tables.enertech_precios!.find((r) => r.clave === "tf_1")?.actualizado_en).toBe("2026-10-05")

    feed = [feedRow("tf_1", "2026-10-05")]
    expect(await options.runSync(ctx)).toMatchObject({ removed: 1 })
    expect(tables.enertech_precios!.find((r) => r.clave === "tf_2")?.removed_at).toBeTruthy()

    feed = [feedRow("tf_1", "2026-10-05"), feedRow("tf_2", "2026-10-01")]
    expect(await options.runSync(ctx)).toMatchObject({ restored: 1 })
    expect(tables.enertech_precios!.find((r) => r.clave === "tf_2")?.removed_at).toBeNull()

    const kinds = (tables.enertech_catalog_changes ?? []).map((c) => c.change_type)
    expect(kinds).toEqual(expect.arrayContaining(["new", "updated", "removed", "restored"]))
  })

  it("keeps everything when the API answers with an empty list", async () => {
    const { tables, client } = createFakeSupabase()
    const options = entitySyncOptions("enertech-sync-precios")
    const ctx = { supabase: client, runId: "run-1", params: new URLSearchParams() }

    mockEnertech({ "/precios": () => ({ success: true, filas: [feedRow("tf_1", "1"), feedRow("tf_2", "1")] }) })
    await options.runSync(ctx)

    mockEnertech({ "/precios": () => ({ success: true, filas: [] }) })
    const stats = await options.runSync(ctx)

    expect(stats).toMatchObject({ removed: 0, removalsBlocked: true })
    expect(tables.enertech_precios!.every((row) => row.removed_at === null)).toBe(true)
  })

  it("counts rows it cannot map instead of failing", async () => {
    const { client } = createFakeSupabase()
    mockEnertech({ "/precios": () => ({ filas: [feedRow("tf_1", "1"), { nombre: "sin clave ni id" }] }) })
    const stats = await entitySyncOptions("enertech-sync-precios").runSync({
      supabase: client,
      runId: "r",
      params: new URLSearchParams(),
    })
    expect(stats).toMatchObject({ created: 1, skipped: 1 })
  })
})

describe("enertech-sync-contratos", () => {
  const contrato = (id: number, updated: string) => ({
    id_contract: id,
    cups: "ES0031408000000000AF",
    cliente: { id: 7, nombre: "Ana" },
    estado: { id: 5, nombre: "Activo", final: false },
    fecha_actualizacion: updated,
  })

  it("loads everything first, then asks only for changes since the saved cursor", async () => {
    const { tables, client } = createFakeSupabase()
    const options = entitySyncOptions("enertech-sync-contratos")
    const ctx = { supabase: client, runId: "run-1", params: new URLSearchParams() }

    const calls = mockEnertech({
      "/contratos": () => ({ success: true, page: 1, limit: 100, total: 2, items: [contrato(1, "2026-10-05 09:00:00"), contrato(2, "2026-10-05 10:30:00")] }),
    })

    const first = await options.runSync(ctx)
    expect(first).toMatchObject({ created: 2, cursor: "2026-10-05 10:28:00" })
    expect(calls[0]!.searchParams.get("modificado_desde")).toBeNull()
    expect(tables.enertech_sync_state![0]).toMatchObject({ job: "/contratos", cursor: "2026-10-05 10:28:00" })

    mockEnertech({
      "/contratos": (url) => {
        expect(url.searchParams.get("modificado_desde")).toBe("2026-10-05 10:28:00")
        return { success: true, total: 1, items: [contrato(2, "2026-10-05 11:00:00")] }
      },
    })
    const second = await options.runSync(ctx)
    expect(second).toMatchObject({ updated: 1, removed: 0 })
    expect(tables.enertech_contratos).toHaveLength(2)
  })

  it("never marks contracts missing from an incremental page as removed", async () => {
    const { tables, client } = createFakeSupabase()
    const options = entitySyncOptions("enertech-sync-contratos")
    const ctx = { supabase: client, runId: "r", params: new URLSearchParams("full=1") }

    mockEnertech({ "/contratos": () => ({ total: 2, items: [contrato(1, "2026-10-05 09:00:00"), contrato(2, "2026-10-05 09:00:00")] }) })
    await options.runSync(ctx)
    mockEnertech({ "/contratos": () => ({ total: 1, items: [contrato(1, "2026-10-05 09:00:00")] }) })
    await options.runSync(ctx)

    expect(tables.enertech_contratos!.every((row) => row.removed_at === null)).toBe(true)
  })
})

describe("explore mode", () => {
  it("reports shapes and samples without touching the database", async () => {
    mockEnertech({ "/comercializadoras": () => ({ success: true, total: 2, comercializadoras: [{ id: 14, nombre: "Endesa", extra: 1 }, { id: 15, nombre: "Naturgy" }] }) })

    const report = await entitySyncOptions("enertech-sync-comercializadoras").runExplore(new URLSearchParams())

    expect(report).toMatchObject({
      endpoint: "GET /comercializadoras",
      rows_received: 2,
      rows_mappable: 2,
      rows_unmappable: 0,
      field_names: ["extra", "id", "nombre"],
    })
    expect((report.sample_mapped as unknown[])[0]).toMatchObject({ key: "14", columns: { id: 14, nombre: "Endesa" } })
  })

  it("warns when rows arrive but none can be mapped", async () => {
    mockEnertech({ "/comercializadoras": () => ({ comercializadoras: [{ foo: "bar" }] }) })
    const report = await entitySyncOptions("enertech-sync-comercializadoras").runExplore(new URLSearchParams())
    expect(report.note).toContain("enertech-mappers")
  })
})

describe("api errors", () => {
  it("surfaces Enertech error codes", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ success: false, code: "UNAUTHORIZED", error: "Credencial inválida" }), { status: 401 }))
    )
    await expect(entitySyncOptions("enertech-sync-precios").runExplore(new URLSearchParams())).rejects.toMatchObject({
      name: "EnertechHttpError",
      status: 401,
      code: "UNAUTHORIZED",
    })
  })

  it("reports a missing key before any request", async () => {
    vi.stubGlobal("Deno", { env: { get: () => undefined } })
    const fetchSpy = vi.fn()
    vi.stubGlobal("fetch", fetchSpy)
    await expect(entitySyncOptions("enertech-sync-precios").runExplore(new URLSearchParams())).rejects.toMatchObject({
      name: "EnertechNotConfiguredError",
    })
    expect(fetchSpy).not.toHaveBeenCalled()
  })
})
