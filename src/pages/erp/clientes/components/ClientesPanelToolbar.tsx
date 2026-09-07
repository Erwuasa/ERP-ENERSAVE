import { FileSpreadsheet, Search, X } from "lucide-react"
import type {
  ClienteAceptacionFilter,
  ClienteTipoFilter,
} from "@/lib/clientes-panel-filters"
import { ENERSAVE_ACTION, PANEL_TOOLBAR, SEARCH_INPUT } from "@/lib/enersave-ui-theme"
import { ClientesFilterPill } from "@/pages/erp/clientes/components/ClientesFilterPill"

type Props = {
  clientesSearchQuery: string
  setClientesSearchQuery: (value: string) => void
  onExportCsv: () => void
  tipoFilter: ClienteTipoFilter
  setTipoFilter: (value: ClienteTipoFilter) => void
  aceptacionFilter: ClienteAceptacionFilter
  setAceptacionFilter: (value: ClienteAceptacionFilter) => void
  tipoCounts: { todos: number; particular: number; empresa: number }
  aceptacionCounts: { todos: number; aceptado: number; pendiente: number }
}

export function ClientesPanelToolbar({
  clientesSearchQuery,
  setClientesSearchQuery,
  onExportCsv,
  tipoFilter,
  setTipoFilter,
  aceptacionFilter,
  setAceptacionFilter,
  tipoCounts,
  aceptacionCounts,
}: Props) {
  return (
    <div className={`${PANEL_TOOLBAR} space-y-2.5`}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1 min-w-0">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-subtext pointer-events-none" />
          <input
            type="search"
            value={clientesSearchQuery}
            onChange={(e) => setClientesSearchQuery(e.target.value)}
            placeholder="Buscar nombre, DNI/CIF, teléfono o email…"
            className={SEARCH_INPUT}
          />
          {clientesSearchQuery && (
            <button
              type="button"
              onClick={() => setClientesSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-brand-subtext hover:text-brand-text cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={onExportCsv}
          className={`h-9 px-3.5 text-[10px] font-bold rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer ${ENERSAVE_ACTION.secondary}`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Excel
        </button>
      </div>

      <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between border-t border-brand-border/70 pt-2.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-brand-subtext shrink-0 mr-0.5">
            Tipo
          </span>
          <ClientesFilterPill active={tipoFilter === "todos"} onClick={() => setTipoFilter("todos")}>
            Todos
            <span className="opacity-90 tabular-nums">{tipoCounts.todos}</span>
          </ClientesFilterPill>
          <ClientesFilterPill active={tipoFilter === "particular"} onClick={() => setTipoFilter("particular")}>
            Particulares
            <span className="opacity-90 tabular-nums">{tipoCounts.particular}</span>
          </ClientesFilterPill>
          <ClientesFilterPill active={tipoFilter === "empresa"} onClick={() => setTipoFilter("empresa")}>
            PYMEs
            <span className="opacity-90 tabular-nums">{tipoCounts.empresa}</span>
          </ClientesFilterPill>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[10px] font-mono font-bold uppercase tracking-wide text-brand-subtext shrink-0 mr-0.5">
            Aceptación
          </span>
          <ClientesFilterPill active={aceptacionFilter === "todos"} onClick={() => setAceptacionFilter("todos")}>
            Cualquiera
            <span className="opacity-90 tabular-nums">{aceptacionCounts.todos}</span>
          </ClientesFilterPill>
          <ClientesFilterPill active={aceptacionFilter === "aceptado"} onClick={() => setAceptacionFilter("aceptado")}>
            Aceptados
            <span className="opacity-90 tabular-nums">{aceptacionCounts.aceptado}</span>
          </ClientesFilterPill>
          <ClientesFilterPill
            active={aceptacionFilter === "pendiente"}
            onClick={() => setAceptacionFilter("pendiente")}
          >
            Pendientes
            <span className="opacity-90 tabular-nums">{aceptacionCounts.pendiente}</span>
          </ClientesFilterPill>
        </div>
      </div>
    </div>
  )
}
