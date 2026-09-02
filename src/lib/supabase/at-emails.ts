import {
  resolveSupabaseClient,
  str,
  toSupabaseFailure,
  type Row,
  type SupabaseResult,
} from "./result"

export interface AtEmailLog {
  id: string
  atEmailId: string
  contratoId?: string
  status: string
  toEmail?: string
  subject?: string
  sentAt?: string
}

export async function listAtEmailLogs(): Promise<SupabaseResult<AtEmailLog[]>> {
  const resolved = resolveSupabaseClient()
  if (resolved.ok === false) return resolved

  const { data, error } = await resolved.client
    .from("at_email_logs")
    .select("*")
    .order("sent_at", { ascending: false })
    .limit(200)

  if (error) return toSupabaseFailure(error, "at_email_logs")

  return {
    ok: true,
    data: (data ?? []).map((raw) => {
      const row = raw as Row
      return {
        id: String(row.id ?? ""),
        atEmailId: str(row.at_email_id) ?? "",
        contratoId: str(row.contrato_id),
        status: str(row.status) ?? "unknown",
        toEmail: str(row.to_email),
        subject: str(row.subject),
        sentAt: str(row.sent_at),
      }
    }),
  }
}
