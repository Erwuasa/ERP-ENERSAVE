import type { Contract } from "@/types/contract"
import type { AtContractNote } from "@/lib/supabase/at-contract-notes"
import { ContratoDetalleSection } from "@/components/contratos/contrato-detalle-ui"

type Props = {
  contract: Contract
  statusNote?: string
  incidentAt?: string
  notes?: AtContractNote[]
  loading?: boolean
}

function daysOpen(iso?: string): number | null {
  if (!iso) return null
  const elapsed = Date.now() - new Date(iso).getTime()
  if (!Number.isFinite(elapsed) || elapsed < 0) return null
  return Math.floor(elapsed / 86_400_000)
}

function formatIncidentAt(iso?: string): string {
  if (!iso) return ""
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function ContratoDetalleTabIncidencias({
  contract,
  statusNote,
  incidentAt,
  notes = [],
  loading = false,
}: Props) {
  const isIncident =
    contract.atStatus === "incident" ||
    contract.atStatus === "incident_resolved" ||
    contract.estado === "INCIDENCIA ADMINISTRATIVA"
  const motivo =
    statusNote?.trim() ||
    contract.atStatusNote?.trim() ||
    "No se ha detallado el motivo. Revisa las notas del contrato."
  const openAt = incidentAt || contract.atIncidentAt
  const days = daysOpen(openAt)
  const resolved = contract.atStatus === "incident_resolved"

  if (!contract.atContractId && !isIncident) {
    return (
      <p className="text-sm text-brand-subtext">
        Este contrato no tiene incidencia AT enlazada.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {isIncident && (
        <div
          className={`rounded-xl border px-4 py-3 ${
            resolved
              ? "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-950/20"
              : "border-rose-200 bg-rose-50 dark:border-rose-900/40 dark:bg-rose-950/20"
          }`}
        >
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p
                className={`text-sm font-semibold ${
                  resolved ? "text-emerald-900 dark:text-emerald-200" : "text-rose-900 dark:text-rose-200"
                }`}
              >
                {resolved
                  ? "Incidencia resuelta"
                  : "Este contrato está parado por una incidencia"}
              </p>
              {!resolved && (
                <p className="mt-0.5 text-[12px] text-rose-700 dark:text-rose-300">
                  Adjunta lo que falte y márcala como resuelta para que siga su curso.
                </p>
              )}
            </div>
            {openAt && days != null && (
              <span
                className={`shrink-0 rounded-full bg-white px-2.5 py-1 text-[11px] font-medium ring-1 ${
                  resolved
                    ? "text-emerald-700 ring-emerald-200"
                    : "text-rose-700 ring-rose-200"
                }`}
              >
                Abierta {days === 0 ? "hoy" : `hace ${days} ${days === 1 ? "día" : "días"}`} ·{" "}
                {formatIncidentAt(openAt)}
              </span>
            )}
          </div>
        </div>
      )}

      <ContratoDetalleSection title="Motivo AT">
        <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-brand-text">{motivo}</p>
      </ContratoDetalleSection>

      <ContratoDetalleSection title="Notas AT">
        {loading ? (
          <p className="text-sm text-brand-subtext">Cargando notas de Helios…</p>
        ) : notes.length === 0 ? (
          <p className="text-sm text-brand-subtext">
            AT no ha devuelto notas en <code>/v1/contracts/{"{id}"}/notes</code>.
          </p>
        ) : (
          <ul className="space-y-2">
            {notes.map((note, index) => (
              <li
                key={note.id ?? `${note.createdAt ?? "note"}-${index}`}
                className="rounded-lg border border-brand-border/70 px-3 py-2"
              >
                <p className="whitespace-pre-wrap text-[13px] leading-relaxed text-brand-text">
                  {note.note || "—"}
                </p>
                {(note.createdAt || note.authorSide) && (
                  <p className="mt-1 text-[10px] font-mono text-brand-subtext">
                    {[note.authorSide, formatIncidentAt(note.createdAt)].filter(Boolean).join(" · ")}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </ContratoDetalleSection>
    </div>
  )
}
