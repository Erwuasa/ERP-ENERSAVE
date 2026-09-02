import {
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

export interface AtCatalogEntry {
  id: string
  kind: string
  atId: string
  label: string
}

export async function listAtCatalogEntries(
  kind?: string
): Promise<SupabaseResult<AtCatalogEntry[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  let query = resolved.client.from("at_catalog_entries").select("id, kind, at_id, label").order("label")
  if (kind) query = query.eq("kind", kind)

  const { data, error } = await query
  if (error) return toSupabaseFailure(error, "at_catalog_entries")

  return {
    ok: true,
    data: (data ?? []).map((row) => ({
      id: String((row as Row).id ?? ""),
      kind: str((row as Row).kind) ?? "",
      atId: str((row as Row).at_id) ?? "",
      label: str((row as Row).label) ?? "",
    })),
  }
}
