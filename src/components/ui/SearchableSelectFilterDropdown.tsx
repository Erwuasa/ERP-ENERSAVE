import { useMemo, useRef, useState, type ReactNode } from "react"
import { Search } from "lucide-react"
import { FloatingPanelPortal } from "./FloatingPanelPortal"
import { FilterTriggerButton } from "./FilterTriggerButton"
import type { SelectFilterOption } from "./SelectFilterDropdown"

export interface SearchableSelectFilterDropdownProps {
  label: string
  value: string
  placeholder?: string
  options: SelectFilterOption[]
  onChange: (value: string) => void
  icon?: ReactNode
  align?: "left" | "right"
  maxWidth?: number
  panelWidthClass?: string
  minWidthClass?: string
  disabled?: boolean
}

export function SearchableSelectFilterDropdown({
  label,
  value,
  placeholder = "Buscar…",
  options,
  onChange,
  icon,
  align = "left",
  maxWidth = 320,
  panelWidthClass = "w-[min(100vw-1rem,320px)]",
  minWidthClass = "min-w-[200px]",
  disabled = false,
}: SearchableSelectFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const anchorRef = useRef<HTMLDivElement>(null)

  const isActive = Boolean(value)
  const valueLabel = options.find((option) => option.id === value)?.label ?? label

  const filteredOptions = useMemo(() => {
    const normalized = query.trim().toLowerCase()
    if (!normalized) return options
    return options.filter((option) => option.label.toLowerCase().includes(normalized))
  }, [options, query])

  function select(next: string) {
    onChange(next)
    setQuery("")
    setOpen(false)
  }

  return (
    <div ref={anchorRef} className="relative shrink-0">
      <FilterTriggerButton
        label={label}
        valueLabel={valueLabel}
        isActive={isActive}
        open={open}
        onToggle={() => {
          if (disabled) return
          setOpen((current) => !current)
        }}
        onClear={() => {
          onChange("")
          setQuery("")
          setOpen(false)
        }}
        icon={icon}
        minWidthClass={minWidthClass}
      />

      <FloatingPanelPortal
        open={open && !disabled}
        onClose={() => {
          setOpen(false)
          setQuery("")
        }}
        anchorRef={anchorRef}
        align={align}
        maxWidth={maxWidth}
        className={`${panelWidthClass} max-h-[360px] overflow-hidden bg-brand-panel border border-brand-border rounded-xl shadow-lg`}
      >
        <div className="p-2 border-b border-brand-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-brand-subtext" />
            <input
              type="search"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="w-full pl-8 pr-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-xs text-brand-text"
              autoFocus
            />
          </div>
        </div>
        <div className="max-h-[280px] overflow-y-auto py-1">
          {filteredOptions.length === 0 ? (
            <p className="px-3 py-4 text-xs text-brand-subtext text-center">Sin resultados</p>
          ) : (
            filteredOptions.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => select(option.id)}
                className={`w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-brand-surface/80 transition-colors cursor-pointer ${
                  value === option.id
                    ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300"
                    : "text-brand-text"
                }`}
              >
                {option.label}
              </button>
            ))
          )}
        </div>
      </FloatingPanelPortal>
    </div>
  )
}
