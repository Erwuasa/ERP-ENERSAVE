import { getSupabaseClient, isSupabaseConfigured } from "./client"
import type { IntegrityFinding } from "../runtime-integrity"

export type RuntimeIntegrityBlockResult =
  | { ok: true; blockId: string | null }
  | { ok: false; message: string }

export async function recordRuntimeIntegrityBlock(
  findings: IntegrityFinding[],
  fingerprint: string
): Promise<RuntimeIntegrityBlockResult> {
  if (!isSupabaseConfigured()) {
    return { ok: true, blockId: null }
  }

  const client = getSupabaseClient()
  if (!client) return { ok: true, blockId: null }

  const { data, error } = await client.rpc("record_runtime_integrity_block", {
    p_findings: findings,
    p_fingerprint: fingerprint,
  })

  if (error) {
    if (/integrity_guard_bypass|runtime_integrity_blocks|record_runtime_integrity_block/i.test(error.message)) {
      return { ok: true, blockId: null }
    }
    return { ok: false, message: error.message }
  }

  return { ok: true, blockId: typeof data === "string" ? data : null }
}
