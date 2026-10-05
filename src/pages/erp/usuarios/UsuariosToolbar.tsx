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
  visibleCount: number
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
  visibleCount,
  onCreate,
  syncing = false,
}: Props) {
  const countLabel = visibleCount === 1 ? "usuario" : "usuarios"

  return (
    <header className="space-y-3 pb-1">
      <p
        className="flex flex-wrap items-baseline gap-x-2 gap-y-0 tabular-nums"
        aria-live="polite"
        aria-atomic="true"
      >
        <span className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          {visibleCount}
        </span>
        <span className="text-sm font-medium text-slate-600 dark:text-slate-400">{countLabel}</span>
        {syncing ? (
          <span className="text-[10px] font-mono text-brand-subtext">· sincronizando…</span>
        ) : null}
      </p>

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <div className="relative w-full min-w-[12rem] max-w-xs sm:max-w-sm group">
          <Search
            className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 pointer-events-none transition-colors group-focus-within:text-cyan-600 dark:group-focus-within:text-cyan-400"
            aria-hidden
          />
          <input
            type="search"
            value={searchText}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nombre, email o ID…"
            className="w-full pl-7 pr-8 py-2 bg-transparent border-0 border-b border-slate-200 dark:border-slate-700 rounded-none text-sm text-brand-text placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-cyan-600 dark:focus:border-cyan-500 transition-colors duration-200"
          />
          {searchText ? (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-0 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-brand-text cursor-pointer transition-colors duration-200 rounded-md"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          ) : null}
        </div>

        <SelectFilterDropdown
          label="Rol"
          value={roleFilter}
          defaultValue="all"
          options={[...USER_ROLE_FILTER_OPTIONS]}
          onChange={onRoleFilterChange}
          minWidthClass="min-w-[7.5rem]"
          className="relative w-auto shrink-0"
          triggerClassName="w-auto"
          triggerVariant="ghost"
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
          triggerVariant="ghost"
        />

        <button
          type="button"
          onClick={onCreate}
          className={`h-9 px-3.5 text-[11px] font-bold rounded-lg inline-flex items-center gap-2 shrink-0 cursor-pointer transition-colors duration-200 ${ENERSAVE_ACTION.primary}`}
        >
          <UserPlus className="w-4 h-4" aria-hidden />
          Registrar asesor
        </button>
      </div>
    </header>
  )
}
