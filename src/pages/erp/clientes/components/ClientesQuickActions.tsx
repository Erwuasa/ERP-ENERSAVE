import { FilePenLine, FolderOpen, Plus } from "lucide-react"
import type { Client } from "@/types/client"

const ICON = "w-[18px] h-[18px] shrink-0 stroke-[2]"

const base =
  "inline-flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-offset-brand-panel"

type Props = {
  onOpenFolder: () => void
  onOpenContracts: () => void
  onCreateContract?: (client: Client) => void
  client: Client
}

export function ClientesQuickActions({
  onOpenFolder,
  onOpenContracts,
  onCreateContract,
  client,
}: Props) {
  return (
    <div className="flex items-center justify-end gap-0.5">
      <button
        type="button"
        onClick={onOpenFolder}
        className={`${base} text-amber-600 dark:text-amber-500 hover:bg-amber-500/10 hover:text-amber-700 dark:hover:text-amber-400 focus-visible:ring-amber-500/35`}
        title="Carpeta de documentos"
        aria-label="Abrir carpeta de documentos"
      >
        <FolderOpen className={ICON} aria-hidden />
      </button>
      <button
        type="button"
        onClick={onOpenContracts}
        className={`${base} text-cyan-600 dark:text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-700 dark:hover:text-cyan-300 focus-visible:ring-cyan-500/35`}
        title="Contratos del cliente"
        aria-label="Ver contratos del cliente"
      >
        <FilePenLine className={ICON} aria-hidden />
      </button>
      {onCreateContract ? (
        <button
          type="button"
          onClick={() => onCreateContract(client)}
          className={`${base} text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-700 dark:hover:text-emerald-300 focus-visible:ring-emerald-500/35`}
          title="Nuevo contrato para este cliente"
          aria-label="Nuevo contrato"
        >
          <Plus className={ICON} aria-hidden />
        </button>
      ) : null}
    </div>
  )
}
