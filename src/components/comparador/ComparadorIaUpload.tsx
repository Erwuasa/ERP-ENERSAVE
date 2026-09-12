import { Loader2, Sparkles } from "lucide-react"
import { FileDropZone } from "../ui/FileDropZone"

interface ComparadorIaUploadProps {
  loading: boolean
  progress: string | null
  onFile: (file: File) => void
}

export function ComparadorIaUpload({ loading, progress, onFile }: ComparadorIaUploadProps) {
  return (
    <div className="rounded-xl border border-blue-500/30 bg-gradient-to-r from-blue-500/[0.08] via-brand-panel to-brand-panel overflow-hidden shadow-sm">
      <div className="flex items-stretch gap-2 p-2">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center self-center rounded-lg bg-blue-500/15 text-blue-600 dark:text-blue-400">
          <Sparkles className="h-4 w-4" />
        </span>

        <FileDropZone
          comparadorCompactLayout
          className="flex-1 min-w-0 border-blue-500/20 bg-brand-surface/50"
          accept="image/*,.pdf,.png,.jpg,.jpeg,.webp"
          multiple={false}
          disabled={loading}
          label={loading ? "Leyendo factura…" : "Arrastra o adjunta la factura"}
          onFiles={(files) => {
            const file = files[0]
            if (file) onFile(file)
          }}
        />
      </div>

      {progress ? (
        <p className="text-[10px] font-mono text-brand-subtext flex items-center gap-2 px-3 pb-2">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          {progress}
        </p>
      ) : null}
    </div>
  )
}
