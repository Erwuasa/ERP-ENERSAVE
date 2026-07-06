import type { VentasActor } from "../../lib/ventas/hooks/types"
import { formatMiDiaDate, getSaludo } from "./mi-dia-ui"

interface MiDiaHeaderProps {
  actor: VentasActor
  pendientes: number
  slaCritico: number
}

export function MiDiaHeader({ actor, pendientes, slaCritico }: MiDiaHeaderProps) {
  const saludo = getSaludo(new Date().getHours())
  const firstName = actor.comercialName.split(/\s+/)[0] ?? actor.comercialName

  return (
    <header className="space-y-1">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-lg sm:text-xl font-black text-brand-text tracking-tight">
          {saludo}, {firstName}
        </h2>
        <p className="text-sm text-brand-subtext capitalize shrink-0 text-right">
          {formatMiDiaDate()}
        </p>
      </div>
      <p className="text-xs text-brand-subtext font-mono">
        {pendientes} tareas pendientes · {slaCritico} prospectos en SLA crítico
      </p>
    </header>
  )
}
