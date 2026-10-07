import { Loader2 } from "lucide-react"
import type { ReactNode } from "react"
import type { SipsErrorCode, SipsOutcome } from "@/lib/sips/types"
import type { SipsLookupState } from "../hooks/useSipsLookup"

const ERROR_TITLES: Record<SipsErrorCode, string> = {
  INVALID_CUPS: "CUPS no válido",
  UNAUTHORIZED: "Sin acceso a SIPS",
  RATE_LIMITED: "Demasiadas consultas",
  NOT_CONFIGURED: "SIPS no está configurado",
  UPSTREAM: "SIPS no responde",
  UNKNOWN: "No se pudo consultar",
}

function Notice({ title, children, tone }: { title: string; children: ReactNode; tone: "neutral" | "error" }) {
  const toneClass =
    tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-600 dark:text-red-400"
      : "border-brand-border bg-brand-surface text-brand-text"
  return (
    <div role="status" aria-live="polite" className={`rounded-xl border p-3 space-y-1 animate-fade-in ${toneClass}`}>
      <p className="text-[10px] font-extrabold uppercase tracking-wider">{title}</p>
      <div className="text-xs text-brand-subtext">{children}</div>
    </div>
  )
}

function errorHint(outcome: Extract<SipsOutcome, { status: "error" }>): string {
  if (outcome.code === "RATE_LIMITED" && outcome.retryAfterSeconds) {
    return `Espera ${outcome.retryAfterSeconds} s antes de volver a consultar.`
  }
  return outcome.message
}

export function SipsStatusNotice({ state }: { state: SipsLookupState }) {
  if (state.phase === "loading") {
    return (
      <Notice title="Consultando" tone="neutral">
        <span className="inline-flex items-center gap-2">
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Buscando los datos del suministro. Suele tardar entre 2 y 4 segundos.
        </span>
      </Notice>
    )
  }

  if (state.phase === "waiting") {
    return (
      <Notice title="El proveedor está procesando el CUPS" tone="neutral">
        Se volverá a consultar solo en {state.secondsLeft} s (intento {state.attempt} de 4).
      </Notice>
    )
  }

  if (state.phase !== "done") return null

  const { outcome } = state
  if (outcome.status === "sin_datos") {
    return (
      <Notice title="Sin datos para este CUPS" tone="neutral">
        Ningún proveedor tiene histórico de este suministro. No insistas: se podrá volver a intentar pasadas 24 horas.
      </Notice>
    )
  }
  if (outcome.status === "error") {
    return (
      <Notice title={ERROR_TITLES[outcome.code]} tone="error">
        {errorHint(outcome)}
      </Notice>
    )
  }
  return null
}
