// Types shared by the sync engine, the entity definitions and the runner.
// Kept free of Deno / esm.sh imports so the pure logic stays importable from the Vitest suite.

/**
 * The slice of supabase-js the sync code relies on (`from(...)` query builders and `rpc`).
 * Typed loosely on purpose: the real client is created in supabase-admin.ts from an esm.sh URL.
 */
export interface SupabaseLike {
  // deno-lint-ignore no-explicit-any
  from(table: string): any
  // deno-lint-ignore no-explicit-any
  rpc(fn: string, args?: Record<string, unknown>): any
}

export interface EnertechSyncContext {
  supabase: SupabaseLike
  runId: string
  params: URLSearchParams
}

export interface EnertechSyncOptions {
  /** Used in logs and as the lock / run name. Matches the function name. */
  job: string
  /** Writes to the mirror tables. Returns stats for the run log. */
  runSync: (ctx: EnertechSyncContext) => Promise<Record<string, unknown>>
  /** Reads from the API and reports shapes, never writing. */
  runExplore: (params: URLSearchParams) => Promise<Record<string, unknown>>
}
