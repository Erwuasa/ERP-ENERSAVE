import { Fragment } from "react"
import { Plus } from "lucide-react"
import { toast } from "sonner"
import { CONTRATO_DOCUMENTO_TIPOS, countDocumentosPorTipo } from "@/lib/contrato-documentos"
import type { NewContractFormState } from "@/lib/contract-registration"
import { DocumentoSlotCard } from "@/components/contratos/DocumentoSlotCard"

type Props = {
  form: NewContractFormState
  tarifaChipLabel: string
  documentosObligatorios: string[]
  addDocumentosForTipo: (
    tipoId: string,
    files: NewContractFormState["documentosPorTipo"][string]
  ) => void
  removeDocumentoForTipo: (tipoId: string, index: number) => void
}

export function WizardDocumentosStep({
  form,
  tarifaChipLabel,
  documentosObligatorios,
  addDocumentosForTipo,
  removeDocumentoForTipo,
}: Props) {
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center px-3 py-1.5 rounded-full bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/25 text-[10px] font-mono font-bold">
          {tarifaChipLabel}
        </span>
        <button
          type="button"
          onClick={() => toast.message("Función próximamente")}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-brand-border text-[10px] font-mono font-bold text-brand-text hover:border-cyan-500/40 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          Añadir otro contrato
        </button>
        <span className="text-[10px] font-mono text-brand-subtext ml-auto">
          {countDocumentosPorTipo(form.documentosPorTipo)} archivo(s)
        </span>
      </div>

      <p className="text-xs text-brand-subtext leading-relaxed">
        Adjunta cualquier documento del contrato. Los marcados con borde rojo son obligatorios según
        la tarifa seleccionada.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {CONTRATO_DOCUMENTO_TIPOS.map((tipo) => (
          <Fragment key={tipo.id}>
            <DocumentoSlotCard
              label={tipo.label}
              obligatorio={documentosObligatorios.includes(tipo.id)}
              files={form.documentosPorTipo[tipo.id] ?? []}
              onAddFiles={(files) => addDocumentosForTipo(tipo.id, files)}
              onRemoveFile={(index) => removeDocumentoForTipo(tipo.id, index)}
            />
          </Fragment>
        ))}
      </div>
    </>
  )
}
