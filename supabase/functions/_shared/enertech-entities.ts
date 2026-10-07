// One definition per Enertech endpoint: how to read it, how to map it, and where it lands.
// The enertech-sync-* functions are thin wrappers around these definitions.

import { enertechGetAllPages, enertechGetJson } from './enertech-api.ts'
import {
  collectFieldNames,
  extractRows,
  isRecord,
  maxNaiveTimestamp,
  shiftNaiveTimestamp,
  type JsonRecord,
} from './enertech-extract.ts'
import {
  mapCliente,
  mapComercializadora,
  mapContrato,
  mapFeedRow,
  mapTarifaAcceso,
  type MappedRow,
  type RowMapper,
} from './enertech-mappers.ts'
import { getSyncCursor, setSyncCursor, syncTrackedTable, type TrackedTableConfig } from './enertech-sync-engine.ts'
import type { EnertechSyncContext, EnertechSyncOptions } from './enertech-sync-types.ts'

const EXPLORE_SAMPLE = 3
const EXPLORE_PAGE_SIZE = 10
/** Overlap when resuming an incremental feed, so rows changed at the cursor second are never missed. */
const CURSOR_OVERLAP_SECONDS = 120

interface FetchResult {
  rows: JsonRecord[]
  /** Shape info for the explore report. */
  meta: Record<string, unknown>
}

interface EntityDefinition {
  job: string
  table: TrackedTableConfig
  mapper: RowMapper
  /** Reads the raw rows. `params` are the request's query params (e.g. full=1). */
  fetchRows: (ctx: { supabase?: EnertechSyncContext['supabase']; params: URLSearchParams; explore: boolean }) => Promise<FetchResult>
  /** Optional post-step once rows are stored (incremental cursors). */
  afterSync?: (ctx: EnertechSyncContext, rows: JsonRecord[], mapped: MappedRow[]) => Promise<Record<string, unknown>>
}

function listFetcher(path: string, itemKeys: string[], query: Record<string, string> = {}) {
  return async (): Promise<FetchResult> => {
    const body = await enertechGetJson(path, query)
    const rows = extractRows(body, itemKeys)
    return {
      rows,
      meta: {
        endpoint: `GET ${path}`,
        top_level_keys: isRecord(body) ? Object.keys(body) : Array.isArray(body) ? ['<array>'] : [],
        total_reported: isRecord(body) && typeof body.total === 'number' ? body.total : null,
      },
    }
  }
}

function pagedFetcher(path: string, query: (params: URLSearchParams, cursor: string | null) => Record<string, string>) {
  return async ({
    supabase,
    params,
    explore,
  }: {
    supabase?: EnertechSyncContext['supabase']
    params: URLSearchParams
    explore: boolean
  }): Promise<FetchResult> => {
    const cursor = !explore && supabase && params.get('full') !== '1' ? await getSyncCursor(supabase, path) : null
    const result = await enertechGetAllPages(
      path,
      query(params, cursor),
      ['items'],
      explore ? { maxPages: 1, pageSize: EXPLORE_PAGE_SIZE } : {}
    )
    return {
      rows: result.rows,
      meta: { endpoint: `GET ${path}`, pages: result.pages, total_reported: result.total, cursor_used: cursor },
    }
  }
}

export const ENERTECH_ENTITIES: Record<string, EntityDefinition> = {
  'enertech-sync-comercializadoras': {
    job: 'enertech-sync-comercializadoras',
    table: { table: 'enertech_comercializadoras', keyColumn: 'id', entity: 'comercializadoras', removeMissing: true },
    mapper: mapComercializadora,
    fetchRows: listFetcher('/comercializadoras', ['comercializadoras', 'items', 'filas']),
  },
  'enertech-sync-tarifas-acceso': {
    job: 'enertech-sync-tarifas-acceso',
    table: { table: 'enertech_tarifas_acceso', keyColumn: 'id_rate', entity: 'tarifas_acceso', removeMissing: true },
    mapper: mapTarifaAcceso,
    fetchRows: listFetcher('/tarifas-acceso', ['tarifas_acceso']),
  },
  'enertech-sync-precios': {
    job: 'enertech-sync-precios',
    table: { table: 'enertech_precios', keyColumn: 'clave', entity: 'precios', removeMissing: true },
    mapper: mapFeedRow,
    fetchRows: listFetcher('/precios', ['filas'], { todas: '1' }),
  },
  'enertech-sync-comisiones': {
    job: 'enertech-sync-comisiones',
    table: { table: 'enertech_comisiones', keyColumn: 'clave', entity: 'comisiones', removeMissing: true },
    mapper: mapFeedRow,
    fetchRows: listFetcher('/comisiones', ['filas'], { todas: '1' }),
  },
  'enertech-sync-clientes': {
    job: 'enertech-sync-clientes',
    table: { table: 'enertech_clientes', keyColumn: 'id_customer', entity: 'clientes', removeMissing: true },
    mapper: mapCliente,
    fetchRows: pagedFetcher('/clientes', () => ({})),
  },
  'enertech-sync-contratos': {
    job: 'enertech-sync-contratos',
    // Incremental feed: absence from a page means "not modified", never "deleted".
    table: { table: 'enertech_contratos', keyColumn: 'id_contract', entity: 'contratos', removeMissing: false },
    mapper: mapContrato,
    fetchRows: pagedFetcher('/contratos', (_params, cursor) => (cursor ? { modificado_desde: cursor } : {})),
    afterSync: async (ctx, _rows, mapped) => {
      const newest = maxNaiveTimestamp(mapped.map((row) => row.actualizadoEn))
      const next = newest ? shiftNaiveTimestamp(newest, -CURSOR_OVERLAP_SECONDS) : null
      if (next) await setSyncCursor(ctx.supabase, '/contratos', next)
      return { cursor: next }
    },
  },
}

function mapRows(definition: EntityDefinition, rows: JsonRecord[]): { mapped: MappedRow[]; skipped: number } {
  const mapped: MappedRow[] = []
  let skipped = 0
  for (const raw of rows) {
    const row = definition.mapper(raw)
    if (row) mapped.push(row)
    else skipped += 1
  }
  return { mapped, skipped }
}

/** Builds the options for serveEnertechSync from an entity definition. */
export function entitySyncOptions(job: string): EnertechSyncOptions {
  const definition = ENERTECH_ENTITIES[job]
  if (!definition) throw new Error(`Unknown Enertech entity job: ${job}`)

  return {
    job,
    runSync: async (ctx) => {
      const { rows, meta } = await definition.fetchRows({ supabase: ctx.supabase, params: ctx.params, explore: false })
      const { mapped, skipped } = mapRows(definition, rows)
      const stats = await syncTrackedTable(ctx.supabase, definition.table, mapped, ctx.runId)
      const extra = definition.afterSync ? await definition.afterSync(ctx, rows, mapped) : {}
      return { ...meta, ...stats, skipped, ...extra }
    },
    runExplore: async (params) => {
      const { rows, meta } = await definition.fetchRows({ params, explore: true })
      const { mapped, skipped } = mapRows(definition, rows)
      return {
        ...meta,
        rows_received: rows.length,
        rows_mappable: mapped.length,
        rows_unmappable: skipped,
        field_names: collectFieldNames(rows.slice(0, 50)),
        sample_raw: rows.slice(0, EXPLORE_SAMPLE),
        sample_mapped: mapped.slice(0, EXPLORE_SAMPLE).map((row) => ({ key: row.key, columns: row.columns })),
        note:
          rows.length > 0 && mapped.length === 0
            ? 'Hay filas pero ninguna se puede mapear: revisa los nombres de campo en _shared/enertech-mappers.ts'
            : null,
      }
    },
  }
}
