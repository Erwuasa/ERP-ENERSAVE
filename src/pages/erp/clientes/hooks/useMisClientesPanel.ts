import { useMemo, useRef, useState, type ChangeEvent, type Dispatch, type SetStateAction } from "react"
import { toast } from "sonner"
import type { Client, ClienteArchivo } from "@/types/client"
import type { Contract } from "@/types/contract"
import { getContractsForClient } from "@/lib/clients"
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
} from "@/lib/clientes-panel-filters"
import {
  buildClientesCsv,
  readFileAsDataUrl,
  type ClientesProfileOption,
} from "@/pages/erp/clientes/components/clientes-panel-utils"

type Options = {
  clients: Client[]
  setClients: Dispatch<SetStateAction<Client[]>>
  contracts: Contract[]
  activeUserId: string
  activeUserName: string
  activeRole: "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  profiles: ClientesProfileOption[]
  clientesSearchQuery: string
}

export function useMisClientesPanel({
  clients,
  setClients,
  contracts,
  activeUserId,
  activeUserName,
  activeRole,
  profiles,
  clientesSearchQuery,
}: Options) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [folderClientId, setFolderClientId] = useState<string | null>(null)
  const [contractsClientId, setContractsClientId] = useState<string | null>(null)
  const [tipoFilter, setTipoFilter] = useState<ClienteTipoFilter>("todos")
  const [aceptacionFilter, setAceptacionFilter] = useState<ClienteAceptacionFilter>("todos")
  const [sortField, setSortField] = useState<ClienteSortField>("alta")
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc")

  const teamMemberIds = useMemo(
    () => profiles.filter((p) => p.managerId === activeUserId).map((p) => p.id),
    [profiles, activeUserId]
  )

  const visibleClients = useMemo(
    () => getVisibleClientsForRole(clients, activeRole, activeUserId, teamMemberIds),
    [clients, activeRole, activeUserId, teamMemberIds]
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
    () => applyClientesPanelFilters(visibleClients, { ...filterOpts, skipAceptacion: true }),
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

  const tipoCounts = useMemo(() => countClientesByTipo(poolForTipoCounts), [poolForTipoCounts])
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

  const folderClient = folderClientId ? clients.find((c) => c.id === folderClientId) : null
  const contractsClient = contractsClientId ? clients.find((c) => c.id === contractsClientId) : null
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

  async function handleFilesSelected(e: ChangeEvent<HTMLInputElement>) {
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

    setClients((prev) =>
      prev.map((c) =>
        c.id === folderClientId ? { ...c, archivos: [...newArchivos, ...c.archivos] } : c
      )
    )
    toast.success(`${newArchivos.length} archivo(s) añadido(s)`)
  }

  function removeArchivo(clientId: string, archivoId: string) {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId ? { ...c, archivos: c.archivos.filter((a) => a.id !== archivoId) } : c
      )
    )
    toast.info("Archivo eliminado de la carpeta del cliente")
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
    const csv = buildClientesCsv(rows, headers)
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `Mis_Clientes_${activeUserName.replace(/\s+/g, "_")}.csv`
    link.click()
    URL.revokeObjectURL(url)
    toast.success("Exportación CSV descargada")
  }

  return {
    fileInputRef,
    folderClient,
    contractsClient,
    linkedContracts,
    sorted,
    filteredCount: filtered.length,
    kpiParticulares,
    kpiPymes,
    kpiContratosActivos,
    tipoFilter,
    setTipoFilter,
    aceptacionFilter,
    setAceptacionFilter,
    tipoCounts,
    aceptacionCounts,
    sortField,
    sortDirection,
    handleSort,
    setFolderClientId,
    setContractsClientId,
    handleFilesSelected,
    removeArchivo,
    exportCsv,
    contracts,
  }
}
