import { FilePenLine, FolderOpen } from "lucide-react"
import type { Client } from "@/types/client"
import type { Contract } from "@/types/contract"
import { getContractsForClient } from "@/lib/clients"
import {
  formatClientContact,
  getClientProvincia,
  getClientTerminos,
  type ClienteSortField,
  type SortDirection,
} from "@/lib/clientes-panel-filters"
import { ClientesSortableHeader } from "@/pages/erp/clientes/components/ClientesSortableHeader"
import { CLIENTES_TD, CLIENTES_TH } from "@/pages/erp/clientes/components/clientes-panel-utils"

type Props = {
  clients: Client[]
  contracts: Contract[]
  sortField: ClienteSortField
  sortDirection: SortDirection
  onSort: (field: ClienteSortField) => void
  onOpenFolder: (clientId: string) => void
  onOpenContracts: (clientId: string) => void
}

export function ClientesPanelTable({
  clients,
  contracts,
  sortField,
  sortDirection,
  onSort,
  onOpenFolder,
  onOpenContracts,
}: Props) {
  return (
    <div className="bg-brand-panel rounded-2xl border border-brand-border shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs min-w-[980px]">
          <thead>
            <tr className="border-b border-brand-border text-brand-subtext bg-brand-bg/40 font-mono">
              <th className={CLIENTES_TH}>
                <ClientesSortableHeader
                  label="Cliente"
                  field="nombre"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
              </th>
              <th className={CLIENTES_TH}>
                <ClientesSortableHeader
                  label="Alta"
                  field="alta"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
              </th>
              <th className={CLIENTES_TH}>
                <ClientesSortableHeader
                  label="DNI/CIF"
                  field="documento"
                  sortField={sortField}
                  sortDirection={sortDirection}
                  onSort={onSort}
                />
              </th>
              <th className={CLIENTES_TH}>Tipo</th>
              <th className={CLIENTES_TH}>Términos</th>
              <th className={CLIENTES_TH}>Contacto</th>
              <th className={CLIENTES_TH}>Provincia</th>
              <th className={CLIENTES_TH}>Contratos</th>
              <th className={CLIENTES_TH}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {clients.map((client) => {
              const linked = getContractsForClient(client, contracts)
              const provincia = getClientProvincia(client, contracts)
              const terminos = getClientTerminos(client, contracts)
              return (
                <tr
                  key={client.id}
                  className="border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                >
                  <td className={`${CLIENTES_TD} font-bold text-brand-text`}>{client.nombre}</td>
                  <td className={`${CLIENTES_TD} font-mono text-brand-subtext`}>
                    {client.createdAt.split("-").reverse().join("/")}
                  </td>
                  <td className={`${CLIENTES_TD} font-mono uppercase`}>
                    {client.documento || "—"}
                  </td>
                  <td className={CLIENTES_TD}>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono font-bold uppercase ${
                        client.tipoCliente === "empresa"
                          ? "bg-orange-500/15 text-orange-600 dark:text-orange-400"
                          : "bg-sky-500/15 text-sky-600 dark:text-sky-400"
                      }`}
                    >
                      {client.tipoCliente === "empresa" ? "PYME" : "Particular"}
                    </span>
                  </td>
                  <td className={`${CLIENTES_TD} text-brand-subtext max-w-[140px]`}>
                    <span className="line-clamp-2" title={terminos}>
                      {terminos}
                    </span>
                  </td>
                  <td className={`${CLIENTES_TD} text-brand-text max-w-[180px]`}>
                    <span className="line-clamp-2" title={formatClientContact(client)}>
                      {formatClientContact(client)}
                    </span>
                  </td>
                  <td className={`${CLIENTES_TD} text-brand-subtext`}>{provincia}</td>
                  <td className={`${CLIENTES_TD} font-mono font-bold text-brand-text`}>
                    {linked.length}
                  </td>
                  <td className={CLIENTES_TD}>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => onOpenFolder(client.id)}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
                        title="Carpeta de documentos"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onOpenContracts(client.id)}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-cyan-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors cursor-pointer"
                        title="Contratos del cliente"
                      >
                        <FilePenLine className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {clients.length === 0 && (
          <p className="text-center text-xs text-brand-subtext py-10 font-mono">
            No hay clientes que coincidan con los filtros.
          </p>
        )}
      </div>
    </div>
  )
}
