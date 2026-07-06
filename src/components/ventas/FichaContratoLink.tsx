import { toast } from "sonner"

interface FichaContratoLinkProps {
  contratoEquipoId: string
  onNavigateToContratos?: (contratoEquipoId: string) => void
}

export function FichaContratoLink({
  contratoEquipoId,
  onNavigateToContratos,
}: FichaContratoLinkProps) {
  function handleClick() {
    if (onNavigateToContratos) {
      onNavigateToContratos(contratoEquipoId)
      return
    }
    toast.info("Navegación a Contratos no disponible")
  }

  return (
    <section
      className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-2"
      aria-label="Contrato vinculado"
    >
      <h3 className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-subtext">
        Contrato vinculado
      </h3>
      <p className="text-[11px] font-mono text-brand-subtext break-all">{contratoEquipoId}</p>
      <button
        type="button"
        onClick={handleClick}
        className="h-9 px-3 text-xs font-semibold border border-brand-border rounded-lg text-brand-text hover:bg-brand-bg transition-colors"
      >
        Ver en Contratos
      </button>
    </section>
  )
}
