import type { RefObject } from "react"
import { Download, FolderOpen, Trash2, X } from "lucide-react"
import type { Client } from "@/types/client"
import { downloadClienteArchivo } from "@/pages/erp/clientes/components/clientes-panel-utils"

type Props = {
  client: Client
  fileInputRef: RefObject<HTMLInputElement | null>
  onClose: () => void
  onRemoveArchivo: (clientId: string, archivoId: string) => void
}

export function ClientesFolderModal({
  client,
  fileInputRef,
  onClose,
  onRemoveArchivo,
}: Props) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
        <div className="p-4 border-b border-brand-border flex justify-between items-start">
          <div>
            <h3 className="text-sm font-extrabold text-brand-text uppercase tracking-wide flex items-center gap-2">
              <FolderOpen className="w-4 h-4 text-amber-500" />
              Documentos
            </h3>
            <p className="text-[10px] text-brand-subtext mt-1">{client.nombre}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-brand-text cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto space-y-2">
          {client.archivos.length === 0 ? (
            <p className="text-xs text-brand-subtext text-center py-6">
              No hay archivos. Sube imágenes o documentos.
            </p>
          ) : (
            client.archivos.map((archivo) => (
              <div
                key={archivo.id}
                className="flex items-center justify-between gap-2 p-2 rounded-lg border border-brand-border bg-slate-50/50 dark:bg-brand-surface/50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-brand-text truncate">{archivo.name}</p>
                  <p className="text-[9px] font-mono text-brand-subtext">
                    {(archivo.size / 1024).toFixed(1)} KB
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => downloadClienteArchivo(archivo)}
                    className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 cursor-pointer"
                    title="Descargar"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onRemoveArchivo(client.id, archivo.id)}
                    className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer"
                    title="Eliminar"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
        <div className="p-4 border-t border-brand-border">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg cursor-pointer"
          >
            Subir archivos o imágenes
          </button>
        </div>
      </div>
    </div>
  )
}
