import { useCallback, useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent, type ReactNode } from "react"
import { FileText, ImageIcon, Upload } from "lucide-react"

export interface FileDropZoneProps {
  onFiles: (files: File[]) => void | Promise<void>
  accept?: string
  multiple?: boolean
  disabled?: boolean
  compact?: boolean
  minimal?: boolean
  minimalWide?: boolean
  comparadorLayout?: boolean
  label?: string
  hint?: string
  className?: string
  icon?: ReactNode
}

export function getFilesFromDataTransfer(data: DataTransfer | null): File[] {
  if (!data) return []

  if (data.files?.length > 0) {
    return Array.from(data.files)
  }

  const files: File[] = []
  for (const item of data.items) {
    if (item.kind === "file") {
      const file = item.getAsFile()
      if (file) files.push(file)
    }
  }
  return files
}

export function FileDropZone({
  onFiles,
  accept = "image/*,.pdf,.png,.jpg,.jpeg,.webp,application/pdf",
  multiple = true,
  disabled = false,
  compact = false,
  minimal = false,
  minimalWide = false,
  comparadorLayout = false,
  label,
  hint,
  className = "",
  icon,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dragDepthRef = useRef(0)
  const [dragActive, setDragActive] = useState(false)
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)

  const emitFiles = useCallback(
    async (files: File[]) => {
      if (disabled || files.length === 0) return
      const batch = multiple ? files : files.slice(0, 1)
      await onFiles(batch)
    },
    [disabled, multiple, onFiles]
  )

  function handleDragEnter(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (disabled) return
    dragDepthRef.current += 1
    setDragActive(true)
  }

  function handleDragLeave(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = Math.max(0, dragDepthRef.current - 1)
    if (dragDepthRef.current === 0) setDragActive(false)
  }

  function handleDragOver(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    if (!disabled) setDragActive(true)
  }

  async function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault()
    e.stopPropagation()
    dragDepthRef.current = 0
    setDragActive(false)
    await emitFiles(getFilesFromDataTransfer(e.dataTransfer))
  }

  async function handlePaste(e: ClipboardEvent<HTMLDivElement>) {
    if (disabled) return
    const files = getFilesFromDataTransfer(e.clipboardData)
    if (files.length === 0) return
    e.preventDefault()
    await emitFiles(files)
  }

  function handleKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (disabled) return
    const isPaste =
      (e.key === "v" || e.key === "V") && (e.ctrlKey || e.metaKey || e.shiftKey)
    if (isPaste) {
      /* paste event handles clipboard content */
      return
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  const active = dragActive || hovered || focused
  const glow =
    dragActive
      ? comparadorLayout
        ? "border-blue-400 bg-blue-500/8 shadow-[0_0_24px_rgba(59,130,246,0.25)] ring-2 ring-blue-400/30"
        : "border-cyan-400 bg-cyan-500/12 shadow-[0_0_24px_rgba(34,211,238,0.45)] ring-2 ring-cyan-400/40 scale-[1.01]"
      : active
        ? comparadorLayout
          ? "border-blue-500/60 bg-blue-500/5 shadow-[0_0_16px_rgba(59,130,246,0.15)] ring-1 ring-blue-500/25"
          : "border-cyan-500/70 bg-cyan-500/8 shadow-[0_0_18px_rgba(34,211,238,0.28)] ring-1 ring-cyan-500/30"
        : comparadorLayout
          ? "border-brand-border/80 bg-brand-bg/30 hover:border-blue-500/50 hover:bg-blue-500/5"
          : "border-brand-border/70 bg-brand-bg/40 hover:border-cyan-500/55 hover:bg-cyan-500/5 hover:shadow-[0_0_14px_rgba(34,211,238,0.18)]"

  const defaultLabel = minimal
    ? "Adjuntar archivo"
    : compact
      ? "Arrastra o pega documentos"
      : "Arrastra y suelta documentos o imágenes"
  const defaultHint = compact
    ? "Clic · Ctrl+V · Shift+V"
    : "Clic para buscar · Ctrl+V o Shift+V para pegar desde portapapeles"

  const showText = !minimal && !minimalWide && !comparadorLayout
  const isMinimalStyle = minimal || minimalWide

  const comparadorTitle = label ?? (disabled ? "Procesando factura…" : "Suelta la factura aquí")
  const comparadorHint =
    hint ??
    "Un PDF o hasta 3 fotos de la misma factura. La IA rellena el suministro mientras lees lo que extrae."

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-disabled={disabled}
      aria-label={comparadorLayout ? comparadorTitle : label ?? defaultLabel}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      onMouseEnter={() => !disabled && setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      onClick={() => !disabled && inputRef.current?.click()}
      className={`
        relative border-2 border-dashed text-center cursor-pointer
        transition-all duration-200 outline-none w-full
        ${comparadorLayout ? "rounded-2xl p-8 min-h-[148px]" : minimalWide ? "rounded-lg border p-1.5" : minimal ? "inline-flex p-1 rounded-lg border w-9" : compact ? "p-2.5 rounded-xl" : "p-5 rounded-xl"}
        ${disabled ? "opacity-50 cursor-not-allowed pointer-events-none" : ""}
        ${glow}
        ${className}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        disabled={disabled}
        className="hidden"
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : []
          emitFiles(files)
          e.target.value = ""
        }}
      />

      <div
        className={`flex flex-col items-center justify-center pointer-events-none w-full ${
          comparadorLayout
            ? "gap-3 min-h-[100px]"
            : minimalWide
              ? "min-h-[32px] gap-0 w-full"
              : minimal
                ? "min-h-[28px] gap-0"
                : compact
                  ? "gap-1.5 min-h-[52px]"
                  : "gap-1.5 min-h-[100px]"
        }`}
      >
        {comparadorLayout ? (
          <>
            <p className="text-sm font-semibold text-brand-text">{comparadorTitle}</p>
            <p className="text-xs text-brand-subtext max-w-md leading-relaxed">{comparadorHint}</p>
            <div className="flex flex-wrap items-center justify-center gap-4 pt-1 text-[11px] font-mono text-brand-subtext">
              <span className="inline-flex items-center gap-1.5">
                <FileText className="h-3.5 w-3.5" />
                PDF
              </span>
              <span className="inline-flex items-center gap-1.5">
                <ImageIcon className="h-3.5 w-3.5" />
                JPG · PNG · WebP
              </span>
            </div>
          </>
        ) : (
          <>
            {icon ?? (
              minimalWide || minimal ? (
                <ImageIcon className="w-3.5 h-3.5 text-cyan-500 dark:text-cyan-400" />
              ) : compact ? (
                <ImageIcon className="w-4 h-4 text-cyan-500 dark:text-cyan-400" />
              ) : (
                <Upload
                  className={`w-8 h-8 text-cyan-500 dark:text-cyan-400 transition-transform ${
                    active ? "scale-110" : ""
                  }`}
                />
              )
            )}
            {showText && (
              <>
                <span
                  className={`font-semibold text-brand-text ${compact ? "text-[10px]" : "text-xs"}`}
                >
                  {label ?? defaultLabel}
                </span>
                {!minimal && (
                  <span className="text-[9px] font-mono uppercase text-brand-subtext tracking-wide">
                    {hint ?? defaultHint}
                  </span>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
