import { Search, UserPlus, X } from "lucide-react"
import { SelectFilterDropdown } from "@/components/ui/SelectFilterDropdown"
import { ENERSAVE_ACTION } from "@/lib/enersave-ui-theme"
import {
  USER_ROLE_FILTER_OPTIONS,
  USER_STATUS_FILTER_OPTIONS,
} from "@/pages/erp/usuarios/usuarios-page-utils"

type Props = {
  searchText: string
  onSearchChange: (value: string) => void
  roleFilter: string
  onRoleFilterChange: (value: string) => void
  statusFilter: string
  onStatusFilterChange: (value: string) => void
  onCreate: () => void
}

export function UsuariosToolbar({
  searchText,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onCreate,
}: Props) {
  return (
    <header className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative w-full max-w-md min-w-[12rem] group">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext pointer-events-none"
            aria-hidden
          />
          <input
            type="search"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nombre, email o ID…"
            aria-label="Buscar usuarios"
            className="w-full rounded-xl border border-brand-border bg-brand-surface py-2 pl-9 pr-8 text-xs text-brand-text placeholder:text-brand-subtext focus:border-cyan-600 focus:outline-none transition-colors duration-200"
          />
          {searchText ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-brand-subtext hover:text-brand-text cursor-pointer transition-colors duration-200 rounded-md"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        <div className="flex shrink-0 flex-nowrap items-center gap-2">
          <SelectFilterDropdown
            label="Rol"
            value={roleFilter}
            defaultValue="all"
            options={[...USER_ROLE_FILTER_OPTIONS]}
            onChange={onRoleFilterChange}
            minWidthClass="min-w-[7.5rem]"
            className="relative w-auto shrink-0"
            triggerClassName="w-auto"
          />
          <SelectFilterDropdown
            label="Acceso"
            value={statusFilter}
            defaultValue="all"
            options={[...USER_STATUS_FILTER_OPTIONS]}
            onChange={onStatusFilterChange}
            minWidthClass="min-w-[7.5rem]"
            className="relative w-auto shrink-0"
            triggerClassName="w-auto"
          />
        </div>
      </div>

      <button
        type="button"
        onClick={onCreate}
        className={`h-9 px-3.5 text-[11px] font-bold rounded-xl inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer transition-colors duration-200 ${ENERSAVE_ACTION.primary}`}
      >
        <UserPlus className="w-4 h-4" aria-hidden />
        Registrar asesor
      </button>
    </header>
  )
}
