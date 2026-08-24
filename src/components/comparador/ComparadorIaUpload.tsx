import { Loader2, Sparkles } from "lucide-react"
import { FileDropZone } from "../ui/FileDropZone"

interface ComparadorIaUploadProps {
  loading: boolean
  progress: string | null
  onFile: (file: File) => void
}

export function ComparadorIaUpload({ loading, progress, onFile }: ComparadorIaUploadProps) {
  return (
    <div className="rounded-2xl border border-blue-500/30 bg-gradient-to-br from-blue-500/[0.08] via-brand-panel to-brand-panel overflow-hidden shadow-sm">
      <div className="px-4 pt-4 pb-2 flex items-start gap-3">
        <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-500/15 text-blue-600 dark:text-blue-400">
          <Sparkles className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-brand-text">Comparar con IA</h3>
          <p className="text-xs text-brand-subtext mt-0.5 leading-relaxed">
            Sube una factura y extraemos los datos automáticamente para rellenar el comparador.
          </p>
        </div>
      </div>

      <FileDropZone
        comparadorLayout
        className="border-0 bg-transparent rounded-none mx-1 mb-1"
        accept="image/*,.pdf,.png,.jpg,.jpeg,.webp"
        multiple={false}
        disabled={loading}
        label={loading ? "Leyendo factura…" : "Suelta la factura aquí"}
        hint="PDF o imagen (JPG, PNG, WebP). Los campos no detectados los puedes completar a mano."
        onFiles={(files) => {
          const file = files[0]
          if (file) onFile(file)
        }}
      />

      {progress && (
        <p className="text-[10px] font-mono text-brand-subtext flex items-center gap-2 px-4 pb-3">
          <Loader2 className="h-3 w-3 animate-spin shrink-0" />
          {progress}
        </p>
      )}
    </div>
  )
}
