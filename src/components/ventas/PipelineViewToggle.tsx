export type PipelineViewMode = "kanban" | "lista" | "bases"

interface PipelineViewToggleProps {
  view: PipelineViewMode
  onChange: (view: PipelineViewMode) => void
}

export function PipelineViewToggle({ view, onChange }: PipelineViewToggleProps) {
  return (
    <div className="flex items-center gap-1 p-0.5 rounded-lg border border-brand-border bg-brand-bg">
      <button
        type="button"
        onClick={() => onChange("kanban")}
        className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
          view === "kanban"
            ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
            : "text-brand-subtext hover:text-brand-text"
        }`}
      >
        Kanban
      </button>
      <button
        type="button"
        onClick={() => onChange("lista")}
        className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
          view === "lista"
            ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
            : "text-brand-subtext hover:text-brand-text"
        }`}
      >
        Lista
      </button>
      <button
        type="button"
        onClick={() => onChange("bases")}
        className={`px-3 py-1.5 rounded-md text-[10px] font-mono font-bold uppercase tracking-wider transition-colors ${
          view === "bases"
            ? "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"
            : "text-brand-subtext hover:text-brand-text"
        }`}
      >
        Bases
      </button>
    </div>
  )
}
