import { Search, UserPlus, X } from "lucide-react"
import { SelectFilterDropdown } from "@/components/ui/SelectFilterDropdown"
import { ENERSAVE_ACTION, PANEL_TOOLBAR, SEARCH_INPUT } from "@/lib/enersave-ui-theme"
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
  syncing?: boolean
}

export function UsuariosToolbar({
  searchText,
  onSearchChange,
  roleFilter,
  onRoleFilterChange,
  statusFilter,
  onStatusFilterChange,
  onCreate,
  syncing = false,
}: Props) {
  return (
    <div className={`${PANEL_TOOLBAR} space-y-2.5`}>
      <div className="flex flex-col gap-2 lg:flex-row lg:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext pointer-events-none" />
          <input
            type="search"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Filtrar por nombre, email o ID…"
            className={SEARCH_INPUT}
          />
          {searchText ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-subtext hover:text-brand-text cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <SelectFilterDropdown
            label="Rol"
            value={roleFilter}
            defaultValue="all"
            options={[...USER_ROLE_FILTER_OPTIONS]}
            onChange={onRoleFilterChange}
            minWidthClass="min-w-[140px]"
          />
          <SelectFilterDropdown
            label="Acceso"
            value={statusFilter}
            defaultValue="all"
            options={[...USER_STATUS_FILTER_OPTIONS]}
            onChange={onStatusFilterChange}
            minWidthClass="min-w-[140px]"
          />
          <button
            type="button"
            onClick={onCreate}
            className={`h-9 px-3.5 text-[10px] font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer ${ENERSAVE_ACTION.primary}`}
          >
            <UserPlus className="w-3.5 h-3.5" />
            Registrar asesor
          </button>
        </div>
      </div>

      {syncing ? (
        <p className="text-[10px] font-mono text-brand-subtext">Sincronizando Supabase…</p>
      ) : null}
    </div>
  )
}
