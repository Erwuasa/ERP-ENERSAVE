import { useCallback, useState, type ReactNode } from "react"
import { toast } from "sonner"

const NUMERIC_FIELDS = new Set([
  "consumoAnual",
  "consumoAnualManual",
  "precioFijoConsumo",
  "diasRenovacion",
  "montoInterno",
  "montoExterno",
])

export function useEditableCell<T extends { id: string }>(
  updateRow: (id: string, field: keyof T & string, value: unknown) => void
) {
  const [editingCell, setEditingCell] = useState<{
    rowId: string
    field: keyof T & string
  } | null>(null)
  const [editValue, setEditValue] = useState("")

  const startEdit = useCallback((rowId: string, field: keyof T & string, current: unknown) => {
    setEditingCell({ rowId, field })
    setEditValue(current != null && current !== "" ? String(current) : "")
  }, [])

  const saveEdit = useCallback(
    (rowId: string, field: keyof T & string, raw: string) => {
      const trimmed = raw.trim()
      if (NUMERIC_FIELDS.has(field as string)) {
        if (trimmed === "") {
          updateRow(rowId, field, field === "consumoAnualManual" ? null : undefined)
        } else {
          const num = Number(trimmed.replace(",", "."))
          if (Number.isFinite(num)) updateRow(rowId, field, num)
        }
      } else {
        updateRow(rowId, field, trimmed)
      }
      setEditingCell(null)
    },
    [updateRow]
  )

  const copyValue = useCallback((text: string) => {
    if (!text) return
    navigator.clipboard.writeText(text)
    toast.success(`Copiado: "${text}"`)
  }, [])

  function renderEditableCell(
    row: T,
    field: keyof T & string,
    options?: {
      placeholder?: string
      display?: (value: unknown, row: T) => ReactNode
      className?: string
    }
  ) {
    const placeholder = options?.placeholder ?? "—"
    const raw = row[field as keyof T]
    const isEditing = editingCell?.rowId === row.id && editingCell?.field === field
    const textValue = raw != null && raw !== "" ? String(raw) : ""

    if (isEditing) {
      return (
        <input
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onBlur={() => saveEdit(row.id, field, editValue)}
          onKeyDown={(e) => {
            if (e.key === "Enter") saveEdit(row.id, field, editValue)
            if (e.key === "Escape") setEditingCell(null)
          }}
          autoFocus
          className="p-1 text-xs bg-white dark:bg-slate-900 border border-cyan-500 rounded text-brand-text font-mono w-full min-w-[60px] outline-none"
        />
      )
    }

    const displayContent = options?.display
      ? options.display(raw, row)
      : textValue || placeholder

    return (
      <span
        role="button"
        tabIndex={0}
        onClick={() => {
          if (textValue) copyValue(textValue)
        }}
        onDoubleClick={() => startEdit(row.id, field, raw)}
        onKeyDown={(e) => {
          if (e.key === "Enter") startEdit(row.id, field, raw)
        }}
        className={`cursor-pointer hover:underline decoration-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400 select-all ${options?.className ?? ""}`}
        title="1 clic para copiar · doble clic para editar"
      >
        {displayContent}
      </span>
    )
  }

  return { renderEditableCell, editingCell }
}
