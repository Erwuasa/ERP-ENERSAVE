import { useCallback, useRef, useState } from "react"
import { Upload, X } from "lucide-react"
import type { ContratoDocumentoArchivo } from "../../lib/contract-registration"
import { filesToContratoArchivos } from "../../lib/contrato-documentos"

interface DocumentoSlotCardProps {
  label: string
  obligatorio?: boolean
  files: ContratoDocumentoArchivo[]
  onAddFiles: (files: ContratoDocumentoArchivo[]) => void
  onRemoveFile?: (index: number) => void
  onUploadRawFiles?: (files: File[]) => Promise<void>
  allowRemove?: boolean
  showInlineFileList?: boolean
  countHint?: string
  accept?: string
}

export function DocumentoSlotCard({
  label,
  obligatorio = false,
  files,
  onAddFiles,
  onRemoveFile,
  onUploadRawFiles,
  allowRemove = true,
  showInlineFileList = true,
  countHint,
  accept = "image/*,.pdf,.doc,.docx,.mp3,.wav,.m4a,.xls,.xlsx",
}: DocumentoSlotCardProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragActive, setDragActive] = useState(false)
  const [uploading, setUploading] = useState(false)

  const guardados = files.length

  const emitFiles = useCallback(
    async (fileList: FileList | File[] | null) => {
      const list = fileList
        ? Array.isArray(fileList)
          ? fileList
          : Array.from(fileList)
        : []
      if (list.length === 0) return
      setUploading(true)
      try {
        if (onUploadRawFiles) {
          await onUploadRawFiles(list)
          return
        }
        const added = await filesToContratoArchivos(list)
        onAddFiles(added)
      } finally {
        setUploading(false)
      }
    },
    [onAddFiles, onUploadRawFiles]
  )

  const borderClass = obligatorio && guardados === 0
    ? "border-rose-500/60 bg-rose-500/5"
    : dragActive
      ? "border-cyan-500 bg-cyan-500/10 ring-2 ring-cyan-500/30"
      : "border-brand-border bg-brand-surface/40"

  return (
    <div
      className={`rounded-xl border p-3 space-y-2 transition-all ${borderClass}`}
      onDragEnter={(e) => {
        e.preventDefault()
        setDragActive(true)
      }}
      onDragLeave={(e) => {
        e.preventDefault()
        setDragActive(false)
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault()
        setDragActive(false)
        void emitFiles(e.dataTransfer.files)
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-brand-text leading-snug">{label}</p>
          <p className="text-[9px] font-mono text-brand-subtext italic mt-0.5">
            {guardados} guardado(s)
            {countHint ? ` · ${countHint}` : ` · ${0} pendiente(s)`}
          </p>
        </div>
        <button
          type="button"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-brand-border text-[10px] font-mono font-bold text-brand-text hover:border-cyan-500/50 hover:bg-cyan-500/5 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <Upload className="w-3 h-3" />
          Adjuntar
        </button>
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          accept={accept}
          multiple
          onChange={(e) => {
            void emitFiles(e.target.files)
            e.target.value = ""
          }}
        />
      </div>

      {showInlineFileList && files.length > 0 && (
        <ul className="space-y-1 pt-1 border-t border-brand-border/60">
          {files.map((file, index) => (
            <li
              key={`${file.name}-${file.uploadedAt}-${index}`}
              className="flex items-center justify-between gap-2 text-[10px] font-mono bg-brand-panel px-2 py-1 rounded-md"
            >
              <span className="truncate text-brand-text">{file.name}</span>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-brand-subtext">{file.size}</span>
                {allowRemove && onRemoveFile ? (
                  <button
                    type="button"
                    onClick={() => onRemoveFile(index)}
                    className="p-0.5 text-brand-subtext hover:text-rose-500 cursor-pointer"
                    aria-label={`Eliminar ${file.name}`}
                  >
                    <X className="w-3 h-3" />
                  </button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
