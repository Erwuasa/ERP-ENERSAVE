import { useCallback, useState, type ReactNode } from "react"
import { toast } from "sonner"

const NUMERIC_FIELDS = new Set([
  "consumoAnual",
  "consumoAnualManual",
  "precioFijoConsumo",
  "potenciaContratada",
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
      readOnly?: boolean
      emptyAlign?: "left" | "center" | "right"
    }
  ) {
    const placeholder = options?.placeholder ?? "—"
    const readOnly = options?.readOnly ?? false
    const raw = row[field as keyof T]
    const isEditing =
      !readOnly && editingCell?.rowId === row.id && editingCell?.field === field
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
          className="p-1 text-xs bg-brand-panel border border-cyan-500 rounded text-brand-text font-mono w-full min-w-[60px] outline-none"
        />
      )
    }

    const displayContent = options?.display
      ? options.display(raw, row)
      : textValue || placeholder

    const isEmptyDisplay =
      raw == null ||
      raw === "" ||
      displayContent === placeholder ||
      displayContent === null ||
      displayContent === false

    if (isEmptyDisplay && !isEditing) {
      const align = options?.emptyAlign ?? "center"
      const alignClass =
        align === "right" ? "text-right" : align === "left" ? "text-left" : "text-center"
      return (
        <span
          role={readOnly ? undefined : "button"}
          tabIndex={readOnly ? undefined : 0}
          onDoubleClick={(e) => {
            if (readOnly) return
            e.preventDefault()
            e.stopPropagation()
            startEdit(row.id, field, raw)
          }}
          onKeyDown={(e) => {
            if (readOnly) return
            if (e.key === "Enter") startEdit(row.id, field, raw)
          }}
          className={`block w-full ${alignClass} text-brand-subtext font-mono ${
            readOnly ? "cursor-default" : "cursor-pointer hover:text-brand-text"
          } ${options?.className ?? ""}`}
          title={readOnly ? undefined : "Doble clic para editar"}
        >
          {placeholder}
        </span>
      )
    }

    return (
      <span
        role={readOnly ? undefined : "button"}
        tabIndex={readOnly ? undefined : 0}
        onClick={(e) => {
          if (readOnly) return
          if (textValue) copyValue(textValue)
        }}
        onDoubleClick={(e) => {
          if (readOnly) return
          e.preventDefault()
          e.stopPropagation()
          startEdit(row.id, field, raw)
        }}
        onKeyDown={(e) => {
          if (readOnly) return
          if (e.key === "Enter") startEdit(row.id, field, raw)
        }}
        className={`${
          readOnly
            ? "cursor-default"
            : "cursor-pointer hover:underline decoration-cyan-500 hover:text-cyan-600 dark:hover:text-cyan-400"
        } select-all ${options?.className ?? ""}`}
        title={
          readOnly
            ? undefined
            : "1 clic para copiar · doble clic para editar"
        }
      >
        {displayContent}
      </span>
    )
  }

  return { renderEditableCell, editingCell }
}
