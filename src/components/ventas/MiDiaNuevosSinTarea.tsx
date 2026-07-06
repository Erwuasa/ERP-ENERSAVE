import type { Prospecto } from "../../lib/ventas/types"

interface MiDiaNuevosSinTareaProps {
  prospectos: Prospecto[]
  onCrearTarea: (prospecto: Prospecto) => void
}

export function MiDiaNuevosSinTarea({ prospectos, onCrearTarea }: MiDiaNuevosSinTareaProps) {
  if (prospectos.length === 0) return null

  return (
    <section
      className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-4 space-y-3"
      aria-label="Prospectos sin tarea"
    >
      <p className="text-sm font-semibold text-amber-800 dark:text-amber-200">
        {prospectos.length} prospecto{prospectos.length !== 1 ? "s" : ""} nuevo
        {prospectos.length !== 1 ? "s" : ""} sin acción programada
      </p>
      <ul className="space-y-2">
        {prospectos.map((p) => (
          <li
            key={p.id}
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-lg border border-brand-border/60 bg-brand-panel px-3 py-2"
          >
            <span className="text-sm font-medium text-brand-text">{p.nombre}</span>
            <button
              type="button"
              onClick={() => onCrearTarea(p)}
              className="min-h-[44px] px-3 text-xs font-semibold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors shrink-0"
            >
              Crear tarea rápida
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
