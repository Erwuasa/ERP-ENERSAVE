import { useState } from "react"
import { Loader2, Upload, X } from "lucide-react"
import { AppFullScreenModal } from "@/components/ui/AppFullScreenModal"
import { toast } from "sonner"
import { FileDropZone } from "../ui/FileDropZone"
import { importedRowsToContracts, parseContractsFromExcel } from "../../lib/excel-import"
import type { Contract } from "../../types/contract"

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
        toast.error("No se encontraron filas válidas en el Excel")
        return
      }
      const imported = importedRowsToContracts(rows, {
        comercialId,
        comercialName,
        existingCount: existingContractCount,
      })
      await onImport(imported)
      toast.success(`Importados ${imported.length} contratos desde Excel (guardados en Supabase)`)
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
      <div className="bg-brand-panel border border-brand-border rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-brand-border">
          <div>
            <h3 className="text-sm font-extrabold text-brand-text uppercase tracking-wide">
              Importar Excel
            </h3>
            <p className="text-[10px] font-mono text-brand-subtext mt-1">
              Cliente, CUPS, Compañía, Estado · opcional: Fecha creación, Fecha activación, NIF, Potencia…
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

        <div className="p-5 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-10 text-brand-subtext">
              <Loader2 className="w-5 h-5 animate-spin" />
              <span className="text-xs font-mono">Leyendo Excel…</span>
            </div>
          ) : (
            <FileDropZone
              accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
              multiple={false}
              onFiles={handleFiles}
              className="min-h-[140px]"
              label="Arrastra un .xlsx o haz clic para seleccionar"
              hint="Cliente, CUPS, Compañía, Estado, Fecha creación, Fecha activación, NIF, Potencia, IBAN…"
              icon={<Upload className="w-8 h-8 text-brand-subtext" />}
            />
          )}
        </div>
      </div>
    </AppFullScreenModal>
  )
}
