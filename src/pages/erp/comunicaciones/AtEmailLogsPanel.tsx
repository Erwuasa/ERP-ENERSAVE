import { useEffect, useState } from "react"
import { Mail } from "lucide-react"
import { listAtEmailLogs, type AtEmailLog } from "@/lib/supabase/at-emails"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { fonts } from "@/constants/styles"

export function AtEmailLogsPanel() {
  const [logs, setLogs] = useState<AtEmailLog[]>([])
  const [loaded, setLoaded] = useState(!isSupabaseConfigured())

  useEffect(() => {
    if (!isSupabaseConfigured()) return
    void listAtEmailLogs().then((result) => {
      if (result.ok) setLogs(result.data)
      setLoaded(true)
    })
  }, [])

  return (
    <section className="bg-brand-panel border border-brand-border rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <Mail className="w-4 h-4 text-cyan-600" />
        <h3 className={`text-xs font-bold uppercase tracking-wider ${fonts.mono} text-brand-text`}>
          Avisos por email (AT)
        </h3>
      </div>
      <p className="text-[10px] text-brand-subtext font-mono">
        Logs de envío de AT Enterprise. Independiente de los avisos internos del ERP.
      </p>
      {!loaded ? (
        <p className="text-xs font-mono text-brand-subtext">Cargando…</p>
      ) : logs.length === 0 ? (
        <p className="text-xs font-mono text-brand-subtext">No hay avisos de email sincronizados.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-[10px] uppercase font-mono text-brand-subtext border-b border-brand-border">
                <th className="py-2 pr-3">Fecha</th>
                <th className="py-2 pr-3">Destinatario</th>
                <th className="py-2 pr-3">Asunto</th>
                <th className="py-2">Estado</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-brand-border/60">
                  <td className="py-2 pr-3 font-mono text-brand-subtext">
                    {log.sentAt ? log.sentAt.slice(0, 16).replace("T", " ") : "—"}
                  </td>
                  <td className="py-2 pr-3 text-brand-text">{log.toEmail || "—"}</td>
                  <td className="py-2 pr-3 text-brand-text">{log.subject || "—"}</td>
                  <td className="py-2 font-mono uppercase text-brand-subtext">{log.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
