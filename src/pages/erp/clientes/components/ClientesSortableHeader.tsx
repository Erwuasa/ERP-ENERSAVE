import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"
import type { ClienteSortField, SortDirection } from "@/lib/clientes-panel-filters"

type Props = {
  label: string
  field: ClienteSortField
  sortField: ClienteSortField
  sortDirection: SortDirection
  onSort: (field: ClienteSortField) => void
}

export function ClientesSortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
}: Props) {
  const active = sortField === field
  const Icon = active ? (sortDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown

  return (
    <button
      type="button"
      onClick={() => onSort(field)}
      className="inline-flex items-center gap-1 hover:text-brand-text transition-colors cursor-pointer uppercase"
    >
      {label}
      <Icon className={`w-3 h-3 ${active ? "text-cyan-500" : "opacity-40"}`} />
    </button>
  )
}
