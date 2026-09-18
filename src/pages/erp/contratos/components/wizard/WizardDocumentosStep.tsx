import { Fragment } from "react"
import { MessageSquare, Plus } from "lucide-react"
import { toast } from "sonner"
import { CONTRATO_DOCUMENTO_TIPOS, countDocumentosPorTipo } from "@/lib/contrato-documentos"
import type { NewContractFormState } from "@/lib/contract-registration"
import { DocumentoSlotCard } from "@/components/contratos/DocumentoSlotCard"
import { WIZARD_INPUT_CLASS } from "@/pages/erp/contratos/components/wizard/wizard-ui"

type Props = {
  form: NewContractFormState
  tarifaChipLabel: string
  documentosObligatorios: string[]
  addDocumentosForTipo: (
    tipoId: string,
    files: NewContractFormState["documentosPorTipo"][string]
  ) => void
  removeDocumentoForTipo: (tipoId: string, index: number) => void
  newComment: string
  setNewComment: (value: string) => void
  postComment: () => void
}

export function WizardDocumentosStep({
  form,
  tarifaChipLabel,
  documentosObligatorios,
  addDocumentosForTipo,
  removeDocumentoForTipo,
  newComment,
  setNewComment,
  postComment,
}: Props) {
  return (
    <div className="h-full flex flex-col gap-3 min-h-0">
      <div className="flex flex-wrap items-center gap-2 shrink-0">
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

      <p className="text-[11px] text-brand-subtext leading-snug shrink-0">
        Los documentos con borde rojo son obligatorios según la tarifa seleccionada.
      </p>

      <div className="grid grid-cols-2 gap-2 flex-1 min-h-0 content-start">
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

      <div className="shrink-0 border border-brand-border rounded-lg p-3 bg-brand-surface/40">
        <div className="flex items-center gap-1.5 mb-2">
          <MessageSquare className="w-3.5 h-3.5 text-violet-500" />
          <span className="text-[9px] font-mono font-bold uppercase text-brand-text">
            Comentarios internos
          </span>
        </div>

        {form.comentariosInternos.length > 0 ? (
          <ul className="mb-2 max-h-16 overflow-y-auto space-y-1">
            {form.comentariosInternos.map((c) => (
              <li
                key={c.id}
                className="text-[10px] text-brand-subtext leading-snug border-l-2 border-violet-500/40 pl-2"
              >
                <span className="font-mono text-[9px] text-brand-text">{c.authorName}:</span>{" "}
                {c.text}
              </li>
            ))}
          </ul>
        ) : null}

        <div className="flex gap-2">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Añadir comentario para tramitación…"
            className={`${WIZARD_INPUT_CLASS} py-1.5 flex-1 min-w-0`}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault()
                postComment()
              }
            }}
          />
          <button
            type="button"
            onClick={postComment}
            className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white text-[10px] font-bold rounded-lg shrink-0 cursor-pointer"
          >
            Enviar
          </button>
        </div>
      </div>
    </div>
  )
}
