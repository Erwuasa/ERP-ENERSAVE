import React, { useMemo, useRef, useState } from "react"
import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Building2,
  CheckCircle,
  Download,
  FileSpreadsheet,
  FilePenLine,
  FolderOpen,
  Search,
  Trash2,
  User,
  Users,
  X,
} from "lucide-react"
import { toast } from "sonner"
import type { Client, ClienteArchivo } from "../types/client"
import type { Contract } from "../types/contract"
import { getContractsForClient } from "../lib/clients"
import {
  applyClientesPanelFilters,
  countClientesByAceptacion,
  countClientesByTipo,
  countContratosActivosForClients,
  formatClientContact,
  getClientProvincia,
  getClientTerminos,
  getVisibleClientsForRole,
  sortClients,
  type ClienteAceptacionFilter,
  type ClienteSortField,
  type ClienteTipoFilter,
  type SortDirection,
} from "../lib/clientes-panel-filters"

interface ProfileOption {
  id: string
  fullName: string
  role: string
  managerId?: string | null
}

interface MisClientesPanelProps {
  clients: Client[]
  setClients: React.Dispatch<React.SetStateAction<Client[]>>
  onPersistClient?: (id: string, patch: Partial<Client>) => void
  contracts: Contract[]
  activeUserId: string
  activeUserName: string
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  profiles: ProfileOption[]
  clientesSearchQuery: string
  setClientesSearchQuery: (v: string) => void
  onNavigateToContract: (contract: Contract) => void
  /** Superadmin en vista comercial: solo clientes propios (como rol comercial). */
  superadminComercialScope?: boolean
}

const TH =
  "px-3 py-3 text-[10px] font-semibold uppercase tracking-normal text-brand-subtext align-bottom border-b border-brand-border whitespace-nowrap"
const TD = "px-3 py-4 align-top border-b border-brand-border/70"

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-mono font-bold transition-colors cursor-pointer ${
        active
          ? "bg-emerald-600 text-white border border-emerald-600"
          : "bg-brand-surface text-brand-subtext border border-brand-border hover:text-brand-text hover:border-cyan-500/30"
      }`}
    >
      {children}
    </button>
  )
}

function SortableHeader({
  label,
  field,
  sortField,
  sortDirection,
  onSort,
}: {
  label: string
  field: ClienteSortField
  sortField: ClienteSortField
  sortDirection: SortDirection
  onSort: (field: ClienteSortField) => void
}) {
  const active = sortField === field
  const Icon = active
    ? sortDirection === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown

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

export function MisClientesPanel({
  clients,
  setClients,
  onPersistClient,
  contracts,
  activeUserId,
  activeUserName,
  activeRole,
  profiles,
  clientesSearchQuery,
  setClientesSearchQuery,
  onNavigateToContract,
  superadminComercialScope = false,
}: MisClientesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [folderClientId, setFolderClientId] = useState<string | null>(null)
  const [contractsClientId, setContractsClientId] = useState<string | null>(null)
  const [tipoFilter, setTipoFilter] = useState<ClienteTipoFilter>("todos")
  const [aceptacionFilter, setAceptacionFilter] =
    useState<ClienteAceptacionFilter>("todos")
  const [sortField, setSortField] = useState<ClienteSortField>("alta")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const teamMemberIds = useMemo(
    () => profiles.filter((p) => p.managerId === activeUserId).map((p) => p.id),
    [profiles, activeUserId]
  )

  const visibleClients = useMemo(
    () =>
      getVisibleClientsForRole(
        clients,
        activeRole,
        activeUserId,
        teamMemberIds,
        { superadminComercialScope }
      ),
    [clients, activeRole, activeUserId, teamMemberIds, superadminComercialScope]
  )

  const filterOpts = useMemo(
    () => ({
      searchQuery: clientesSearchQuery,
      tipoFilter,
      aceptacionFilter,
    }),
    [clientesSearchQuery, tipoFilter, aceptacionFilter]
  )

  const poolForTipoCounts = useMemo(
    () => applyClientesPanelFilters(visibleClients, { ...filterOpts, skipTipo: true }),
    [visibleClients, filterOpts]
  )

  const poolForAceptacionCounts = useMemo(
    () =>
      applyClientesPanelFilters(visibleClients, { ...filterOpts, skipAceptacion: true }),
    [visibleClients, filterOpts]
  )

  const filtered = useMemo(
    () => applyClientesPanelFilters(visibleClients, filterOpts),
    [visibleClients, filterOpts]
  )

  const sorted = useMemo(
    () => sortClients(filtered, sortField, sortDirection),
    [filtered, sortField, sortDirection]
  )

  const tipoCounts = useMemo(
    () => countClientesByTipo(poolForTipoCounts),
    [poolForTipoCounts]
  )

  const aceptacionCounts = useMemo(
    () => countClientesByAceptacion(poolForAceptacionCounts),
    [poolForAceptacionCounts]
  )

  const kpiParticulares = useMemo(
    () => poolForTipoCounts.filter((c) => c.tipoCliente === "particular").length,
    [poolForTipoCounts]
  )

  const kpiPymes = useMemo(
    () => poolForTipoCounts.filter((c) => c.tipoCliente === "empresa").length,
    [poolForTipoCounts]
  )

  const kpiContratosActivos = useMemo(
    () => countContratosActivosForClients(filtered, contracts),
    [filtered, contracts]
  )

  const folderClient = folderClientId
    ? clients.find((c) => c.id === folderClientId)
    : null
  const contractsClient = contractsClientId
    ? clients.find((c) => c.id === contractsClientId)
    : null
  const linkedContracts = contractsClient
    ? getContractsForClient(contractsClient, contracts)
    : []

  function handleSort(field: ClienteSortField) {
    if (sortField === field) {
      setSortDirection((d) => (d === "asc" ? "desc" : "asc"))
      return
    }
    setSortField(field)
    setSortDirection(field === "alta" ? "desc" : "asc")
  }

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    e.target.value = ""
    if (!files?.length || !folderClientId) return

    const newArchivos: ClienteArchivo[] = []

    for (const file of Array.from(files) as File[]) {
      const dataUrl = await readFileAsDataUrl(file)
      newArchivos.push({
        id: `arc-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        size: file.size,
        dataUrl,
        uploadedAt: new Date().toISOString(),
      })
    }

    const target = clients.find((c) => c.id === folderClientId)
    if (!target) return

    const archivos = [...newArchivos, ...target.archivos]
    setClients((prev) =>
      prev.map((c) => (c.id === folderClientId ? { ...c, archivos } : c))
    )
    onPersistClient?.(folderClientId, { archivos })
    toast.success(`${newArchivos.length} archivo(s) añadido(s)`)
  }

  function removeArchivo(clientId: string, archivoId: string) {
    const target = clients.find((c) => c.id === clientId)
    if (!target) return

    const archivos = target.archivos.filter((a) => a.id !== archivoId)
    setClients((prev) => prev.map((c) => (c.id === clientId ? { ...c, archivos } : c)))
    onPersistClient?.(clientId, { archivos })
    toast.info("Archivo eliminado de la carpeta del cliente")
  }

  function downloadArchivo(archivo: ClienteArchivo) {
    const link = document.createElement("a")
    link.href = archivo.dataUrl
    link.download = archivo.name
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  function exportCsv() {
    const headers = [
      "Cliente",
      "Alta",
      "DNI/CIF",
      "Tipo",
      "Términos",
      "Contacto",
      "Provincia",
      "Contratos",
    ]
    const rows = sorted.map((c) => {
      const linked = getContractsForClient(c, contracts)
      return [
        c.nombre,
        c.createdAt,
        c.documento || "",
        c.tipoCliente === "empresa" ? "PYME" : "Particular",
        getClientTerminos(c, contracts),
        formatClientContact(c),
        getClientProvincia(c, contracts),
        String(linked.length),
      ]
    })
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(",")
      ),
    ].join("\n")
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Mis_Clientes_${activeUserName.replace(/\s+/g, "_")}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Exportación CSV descargada")
  }

  return (
    <div className="space-y-5 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-blue-500" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
                Clientes
              </p>
              <p className="text-2xl font-black font-mono text-blue-600 dark:text-blue-400 mt-1">
                {filtered.length}
              </p>
            </div>
            <Users className="w-8 h-8 text-blue-500/80 shrink-0" />
          </div>
        </div>

        <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-sky-400" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
                Particulares
              </p>
              <p className="text-2xl font-black font-mono text-sky-500 mt-1">
                {kpiParticulares}
              </p>
            </div>
            <User className="w-8 h-8 text-sky-400/80 shrink-0" />
          </div>
        </div>

        <div className="bg-brand-panel p-5 rounded-2xl border border-amber-400/50 shadow-sm relative overflow-hidden ring-1 ring-amber-400/20">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-amber-400" />
          <div className="absolute top-0 right-0 w-full h-1 bg-amber-400/70" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
                PYMEs
              </p>
              <p className="text-2xl font-black font-mono text-orange-500 mt-1">
                {kpiPymes}
              </p>
            </div>
            <Building2 className="w-8 h-8 text-orange-500/80 shrink-0" />
          </div>
        </div>

        <div className="bg-brand-panel p-5 rounded-2xl border border-brand-border shadow-sm relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1 h-full bg-emerald-500" />
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
                Contratos activos
              </p>
              <p className="text-2xl font-black font-mono text-emerald-500 mt-1">
                {kpiContratosActivos}
              </p>
            </div>
            <CheckCircle className="w-8 h-8 text-emerald-500/80 shrink-0" />
          </div>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={clientesSearchQuery}
            onChange={(e) => setClientesSearchQuery(e.target.value)}
            placeholder="Buscar por nombre, DNI/CIF, teléfono o email..."
            className="w-full pl-9 pr-8 py-2.5 bg-brand-surface border border-brand-border rounded-lg focus:border-cyan-500 focus:outline-none text-xs text-brand-text font-medium"
          />
          {clientesSearchQuery && (
            <button
              type="button"
              onClick={() => setClientesSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-text"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={exportCsv}
          className="h-9 px-3 text-[10px] font-medium text-brand-subtext hover:text-cyan-600 border border-brand-border rounded-lg flex items-center gap-1.5 shrink-0 cursor-pointer"
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          Excel
        </button>
      </div>

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <FilterPill active={tipoFilter === "todos"} onClick={() => setTipoFilter("todos")}>
            Todos [{tipoCounts.todos}]
          </FilterPill>
          <FilterPill
            active={tipoFilter === "particular"}
            onClick={() => setTipoFilter("particular")}
          >
            Particulares [{tipoCounts.particular}]
          </FilterPill>
          <FilterPill active={tipoFilter === "empresa"} onClick={() => setTipoFilter("empresa")}>
            PYMEs [{tipoCounts.empresa}]
          </FilterPill>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <FilterPill
            active={aceptacionFilter === "todos"}
            onClick={() => setAceptacionFilter("todos")}
          >
            Todos [{aceptacionCounts.todos}]
          </FilterPill>
          <FilterPill
            active={aceptacionFilter === "aceptado"}
            onClick={() => setAceptacionFilter("aceptado")}
          >
            Aceptados [{aceptacionCounts.aceptado}]
          </FilterPill>
          <FilterPill
            active={aceptacionFilter === "pendiente"}
            onClick={() => setAceptacionFilter("pendiente")}
          >
            Pendientes [{aceptacionCounts.pendiente}]
          </FilterPill>
        </div>
      </div>

      <div className="bg-brand-panel rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[980px]">
            <thead>
              <tr className="border-b border-brand-border text-brand-subtext bg-brand-bg/40 font-mono">
                <th className={TH}>
                  <SortableHeader
                    label="Cliente"
                    field="nombre"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className={TH}>
                  <SortableHeader
                    label="Alta"
                    field="alta"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className={TH}>
                  <SortableHeader
                    label="DNI/CIF"
                    field="documento"
                    sortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                </th>
                <th className={TH}>Tipo</th>
                <th className={TH}>Términos</th>
                <th className={TH}>Contacto</th>
                <th className={TH}>Provincia</th>
                <th className={TH}>Contratos</th>
                <th className={TH}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((client) => {
                const linked = getContractsForClient(client, contracts)
                const provincia = getClientProvincia(client, contracts)
                const terminos = getClientTerminos(client, contracts)
                return (
                  <tr
                    key={client.id}
                    className="border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                  >
                    <td className={`${TD} font-bold text-brand-text`}>{client.nombre}</td>
                    <td className={`${TD} font-mono text-brand-subtext`}>
                      {client.createdAt.split("-").reverse().join("/")}
                    </td>
                    <td className={`${TD} font-mono uppercase`}>
                      {client.documento || "—"}
                    </td>
                    <td className={TD}>
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
                    <td className={`${TD} text-brand-subtext max-w-[140px]`}>
                      <span className="line-clamp-2" title={terminos}>
                        {terminos}
                      </span>
                    </td>
                    <td className={`${TD} text-brand-text max-w-[180px]`}>
                      <span className="line-clamp-2" title={formatClientContact(client)}>
                        {formatClientContact(client)}
                      </span>
                    </td>
                    <td className={`${TD} text-brand-subtext`}>{provincia}</td>
                    <td className={`${TD} font-mono font-bold text-brand-text`}>
                      {linked.length}
                    </td>
                    <td className={TD}>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setFolderClientId(client.id)}
                          className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors cursor-pointer"
                          title="Carpeta de documentos"
                        >
                          <FolderOpen className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setContractsClientId(client.id)}
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
          {sorted.length === 0 && (
            <p className="text-center text-xs text-brand-subtext py-10 font-mono">
              No hay clientes que coincidan con los filtros.
            </p>
          )}
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
        className="hidden"
        onChange={handleFilesSelected}
      />

      {folderClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-md max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-brand-border flex justify-between items-start">
              <div>
                <h3 className="text-sm font-extrabold text-brand-text uppercase tracking-wide flex items-center gap-2">
                  <FolderOpen className="w-4 h-4 text-amber-500" />
                  Documentos
                </h3>
                <p className="text-[10px] text-brand-subtext mt-1">{folderClient.nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setFolderClientId(null)}
                className="text-slate-400 hover:text-brand-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {folderClient.archivos.length === 0 ? (
                <p className="text-xs text-brand-subtext text-center py-6">
                  No hay archivos. Sube imágenes o documentos.
                </p>
              ) : (
                folderClient.archivos.map((archivo) => (
                  <div
                    key={archivo.id}
                    className="flex items-center justify-between gap-2 p-2 rounded-lg border border-brand-border bg-slate-50/50 dark:bg-brand-surface/50"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-brand-text truncate">{archivo.name}</p>
                      <p className="text-[9px] font-mono text-brand-subtext">
                        {(archivo.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => downloadArchivo(archivo)}
                        className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20 cursor-pointer"
                        title="Descargar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeArchivo(folderClient.id, archivo.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20 cursor-pointer"
                        title="Eliminar"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-brand-border">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Subir archivos o imágenes
              </button>
            </div>
          </div>
        </div>
      )}

      {contractsClient && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-brand-panel border border-brand-border rounded-2xl w-full max-w-lg max-h-[85vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-brand-border flex justify-between items-start">
              <div>
                <h3 className="text-sm font-extrabold text-brand-text uppercase tracking-wide flex items-center gap-2">
                  <FilePenLine className="w-4 h-4 text-cyan-500" />
                  Contratos asociados
                </h3>
                <p className="text-[10px] text-brand-subtext mt-1">{contractsClient.nombre}</p>
              </div>
              <button
                type="button"
                onClick={() => setContractsClientId(null)}
                className="text-slate-400 hover:text-brand-text cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 flex-1 overflow-y-auto space-y-2">
              {linkedContracts.length === 0 ? (
                <p className="text-xs text-brand-subtext text-center py-6">
                  Este cliente no tiene contratos registrados todavía.
                </p>
              ) : (
                linkedContracts.map((contract) => (
                  <button
                    key={contract.id}
                    type="button"
                    onClick={() => {
                      setContractsClientId(null)
                      onNavigateToContract(contract)
                    }}
                    className="w-full text-left p-3 rounded-xl border border-brand-border hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-colors cursor-pointer"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span
                        className={`text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded ${
                          contract.tipo === "luz"
                            ? "bg-cyan-500/10 text-cyan-600"
                            : "bg-amber-500/10 text-amber-600"
                        }`}
                      >
                        {contract.tipo}
                      </span>
                      <span className="text-[9px] font-mono text-brand-subtext uppercase">
                        {contract.estado}
                      </span>
                    </div>
                    <p className="text-[10px] font-mono text-cyan-600 dark:text-cyan-400 mt-1.5">
                      {contract.cups}
                    </p>
                    <p className="text-xs text-brand-text mt-0.5">
                      {contract.compania} · {contract.tarifa}
                    </p>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}
