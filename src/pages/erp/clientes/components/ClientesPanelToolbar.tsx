import { FileSpreadsheet, Search, X } from "lucide-react"
import type {
  ClienteAceptacionFilter,
  ClienteTipoFilter,
} from "@/lib/clientes-panel-filters"
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
    <div className="flex flex-col gap-2 xl:flex-row xl:items-center xl:justify-between">
      <div className="relative w-full xl:max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        <input
          type="search"
          value={clientesSearchQuery}
          onChange={(e) => setClientesSearchQuery(e.target.value)}
          placeholder="Buscar nombre, DNI/CIF, teléfono o email…"
          className="w-full pl-9 pr-8 py-2 bg-brand-surface border border-brand-border rounded-lg focus:border-cyan-500 focus:outline-none text-xs text-brand-text font-medium"
        />
        {clientesSearchQuery && (
          <button
            type="button"
            onClick={() => setClientesSearchQuery("")}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-text cursor-pointer"
            aria-label="Limpiar búsqueda"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <ClientesFilterPill active={tipoFilter === "todos"} onClick={() => setTipoFilter("todos")}>
            Todos
            <span className="opacity-80">{tipoCounts.todos}</span>
          </ClientesFilterPill>
          <ClientesFilterPill
            active={tipoFilter === "particular"}
            onClick={() => setTipoFilter("particular")}
          >
            Particulares
            <span className="opacity-80">{tipoCounts.particular}</span>
          </ClientesFilterPill>
          <ClientesFilterPill active={tipoFilter === "empresa"} onClick={() => setTipoFilter("empresa")}>
            PYMEs
            <span className="opacity-80">{tipoCounts.empresa}</span>
          </ClientesFilterPill>
        </div>
        <span className="hidden sm:block w-px h-4 bg-brand-border" />
        <div className="flex flex-wrap items-center gap-1.5">
          <ClientesFilterPill
            active={aceptacionFilter === "todos"}
            onClick={() => setAceptacionFilter("todos")}
          >
            RGPD
            <span className="opacity-80">{aceptacionCounts.todos}</span>
          </ClientesFilterPill>
          <ClientesFilterPill
            active={aceptacionFilter === "aceptado"}
            onClick={() => setAceptacionFilter("aceptado")}
          >
            Aceptados
            <span className="opacity-80">{aceptacionCounts.aceptado}</span>
          </ClientesFilterPill>
          <ClientesFilterPill
            active={aceptacionFilter === "pendiente"}
            onClick={() => setAceptacionFilter("pendiente")}
          >
            Pendientes
            <span className="opacity-80">{aceptacionCounts.pendiente}</span>
          </ClientesFilterPill>
        </div>
        <button
          type="button"
          onClick={onExportCsv}
          className="h-8 px-3 text-[10px] font-medium text-brand-subtext hover:text-cyan-600 border border-brand-border rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Excel
        </button>
      </div>
    </div>
  )
}
