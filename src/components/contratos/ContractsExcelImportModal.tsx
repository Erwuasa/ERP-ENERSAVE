import { Download, Loader2, Upload, X } from "lucide-react"
import { useState } from "react"
import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"
import { FileDropZone } from "../ui/FileDropZone"
import {
  CONTRACT_EXCEL_COLUMNS,
  generateContractsImportTemplate,
  importedRowsToContracts,
  parseContractsFromExcel,
} from "../../lib/excel-import"
import type { Contract } from "../../types/contract"
import { toast } from "sonner"

interface ContractsExcelImportModalProps {
  open: boolean
  onClose: () => void
  onImport: (contracts: Contract[]) => void | Promise<void>
  comercialId: string
  comercialName: string
  existingContractCount: number
}

export function ContractsExcelImportModal({
  open,
  onClose,
  onImport,
  comercialId,
  comercialName,
  existingContractCount,
}: ContractsExcelImportModalProps) {
  const [loading, setLoading] = useState(false)

  async function handleFiles(files: File[]) {
    const file = files[0]
    if (!file) return
    if (!file.name.toLowerCase().endsWith(".xlsx") && !file.name.toLowerCase().endsWith(".xls")) {
      toast.error("Sube un archivo Excel (.xlsx o .xls)")
      return
    }

    setLoading(true)
    try {
      const buffer = await file.arrayBuffer()
      const rows = parseContractsFromExcel(buffer)
      if (rows.length === 0) {
        toast.error("No se encontraron filas válidas. Hace falta Cliente o CUPS en cada fila.")
        return
      }
      const imported = importedRowsToContracts(rows, {
        comercialId,
        comercialName,
        existingCount: existingContractCount,
      })
      await onImport(imported)
      toast.success(`Importados ${imported.length} contratos. Los clientes nuevos se han creado en tu cartera.`)
      onClose()
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Error al leer el Excel"
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <AppFullScreenModal open={open} onClose={onClose}>
      <div className="bg-brand-panel border border-brand-border rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div>
            <h3 className="text-sm font-extrabold text-brand-text uppercase tracking-wide">
              Importar Excel
            </h3>
            <p className="text-[10px] font-mono text-brand-subtext mt-1">
              Cada fila crea un contrato en tu cartera. Si el cliente no existe (mismo NIF o mismos datos), se da de alta.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-brand-text cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[min(70vh,640px)] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-brand-subtext">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-mono">Leyendo Excel…</span>
            </div>
          ) : (
            <>
              <FileDropZone
                accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                multiple={false}
                onFiles={handleFiles}
                className="min-h-[120px]"
                label="Arrastra un .xlsx o haz clic para seleccionar"
                hint="Primera hoja · una fila = un contrato · Cliente o CUPS obligatorio"
                icon={<Upload className="w-8 h-8 text-brand-subtext" />}
              />

              <div className="flex items-center justify-between gap-3">
                <p className="text-[10px] font-mono text-brand-subtext uppercase">Columnas de la plantilla</p>
                <button
                  type="button"
                  onClick={() => {
                    generateContractsImportTemplate()
                    toast.success("Descargada plantilla_importacion_contratos.xlsx")
                  }}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-brand-border text-[10px] font-mono text-brand-text hover:bg-brand-surface cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar plantilla
                </button>
              </div>

              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {CONTRACT_EXCEL_COLUMNS.map((column) => (
                  <li
                    key={column.header}
                    className="rounded-lg border border-brand-border/80 bg-brand-surface/50 px-3 py-2"
                  >
                    <p className="text-[11px] font-semibold text-brand-text">
                      {column.header}
                      {column.requiredAny ? (
                        <span className="ml-1.5 text-[9px] font-mono uppercase text-cyan-600">
                          Cliente o CUPS
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[10px] text-brand-subtext leading-snug mt-0.5">{column.description}</p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      </div>
    </AppFullScreenModal>
  )
}
