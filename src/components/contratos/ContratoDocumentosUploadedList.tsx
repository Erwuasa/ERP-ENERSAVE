import { FileAudio, FileImage, FileSpreadsheet, FileText, Loader2 } from "lucide-react"
import type { ContratoDocumentoRecord } from "@/lib/contrato-documentos"
import { getDocumentoTipoLabel } from "@/lib/contrato-documentos"
import { formatActivationDate } from "@/pages/erp/contratos/components/contratos-panel-utils"

function DocumentoFileIcon({ mimeType, name }: { mimeType?: string; name: string }) {
  const mime = mimeType?.toLowerCase() ?? ""
  const ext = name.split(".").pop()?.toLowerCase() ?? ""

  if (mime.startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) {
    return <FileImage className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
  }
  if (
    mime.startsWith("audio/") ||
    ["mp3", "wav", "m4a", "aac", "ogg"].includes(ext)
  ) {
    return <FileAudio className="w-5 h-5 text-violet-600 dark:text-violet-400" />
  }
  if (["xls", "xlsx", "csv"].includes(ext) || mime.includes("spreadsheet") || mime.includes("excel")) {
    return <FileSpreadsheet className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
  }
  return <FileText className="w-5 h-5 text-brand-subtext" />
}

interface ContratoDocumentosUploadedListProps {
  documentos: ContratoDocumentoRecord[]
  downloadingId: string | null
  onDownload: (doc: ContratoDocumentoRecord) => void
}

export function ContratoDocumentosUploadedList({
  documentos,
  downloadingId,
  onDownload,
}: ContratoDocumentosUploadedListProps) {
  if (documentos.length === 0) {
    return (
      <p className="text-sm text-brand-subtext italic py-2">
        Todavía no hay documentos subidos en el expediente.
      </p>
    )
  }

  const sorted = [...documentos].sort(
    (a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime()
  )

  return (
    <ul className="space-y-2">
      {sorted.map((doc) => {
        const fecha = doc.uploadedAt?.includes("T")
          ? formatActivationDate(doc.uploadedAt.slice(0, 10))
          : formatActivationDate(doc.uploadedAt ?? "")

        return (
          <li
            key={doc.id ?? `${doc.name}-${doc.uploadedAt}`}
            className="flex items-center gap-3 rounded-xl border border-brand-border/70 bg-brand-panel/60 px-3 py-2.5"
          >
            <div className="w-9 h-9 rounded-lg bg-brand-bg border border-brand-border/60 flex items-center justify-center shrink-0">
              <DocumentoFileIcon mimeType={doc.mimeType} name={doc.name} />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-brand-text truncate">{doc.name}</p>
              <p className="text-[11px] text-brand-subtext mt-0.5">
                {getDocumentoTipoLabel(doc.tipo)} · {fecha} · {doc.size}
              </p>
            </div>
            <button
              type="button"
              disabled={downloadingId === doc.id}
              onClick={() => onDownload(doc)}
              className="shrink-0 px-3 py-1.5 rounded-lg border border-brand-border text-[11px] font-bold text-brand-text hover:border-cyan-500/40 hover:bg-cyan-500/5 disabled:opacity-50 cursor-pointer"
            >
              {downloadingId === doc.id ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Descargando
                </span>
              ) : (
                "Descargar"
              )}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
