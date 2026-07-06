import React, { useRef, useState } from "react"
import {
  Download,
  FileSpreadsheet,
  FilePenLine,
  FolderOpen,
  Search,
  Trash2,
  X,
} from "lucide-react"
import { toast } from "sonner"
import type { Client, ClienteArchivo } from "../types/client"
import type { Contract } from "../types/contract"
import { getContractsForClient } from "../lib/clients"
import { isContractActivado } from "../lib/contract-estado"
import { useEditableCell } from "../hooks/use-editable-cell"

interface MisClientesPanelProps {
  clients: Client[]
  setClients: React.Dispatch<React.SetStateAction<Client[]>>
  contracts: Contract[]
  activeUserId: string
  activeUserName: string
  clientesSearchQuery: string
  setClientesSearchQuery: (v: string) => void
  onNavigateToContract: (contract: Contract) => void
}

export function MisClientesPanel({
  clients,
  setClients,
  contracts,
  activeUserId,
  activeUserName,
  clientesSearchQuery,
  setClientesSearchQuery,
  onNavigateToContract,
}: MisClientesPanelProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [folderClientId, setFolderClientId] = useState<string | null>(null)
  const [contractsClientId, setContractsClientId] = useState<string | null>(null)

  const myClients = clients.filter((c) => c.comercialId === activeUserId)

  const updateClient = (id: string, field: keyof Client, value: unknown) => {
    setClients((prev) =>
      prev.map((c) => (c.id === id ? { ...c, [field]: value } : c))
    )
  }

  const { renderEditableCell } = useEditableCell<Client>(updateClient)

  const filtered = myClients.filter((client) => {
    if (!clientesSearchQuery.trim()) return true
    const q = clientesSearchQuery.toLowerCase()
    return (
      client.nombre.toLowerCase().includes(q) ||
      (client.documento?.toLowerCase().includes(q) ?? false) ||
      (client.email?.toLowerCase().includes(q) ?? false) ||
      (client.telefono?.toLowerCase().includes(q) ?? false) ||
      (client.ciudad?.toLowerCase().includes(q) ?? false) ||
      (client.codigoPostal?.includes(q) ?? false)
    )
  })

  const folderClient = folderClientId
    ? clients.find((c) => c.id === folderClientId)
    : null
  const contractsClient = contractsClientId
    ? clients.find((c) => c.id === contractsClientId)
    : null
  const linkedContracts = contractsClient
    ? getContractsForClient(contractsClient, contracts)
    : []

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

    setClients((prev) =>
      prev.map((c) =>
        c.id === folderClientId
          ? { ...c, archivos: [...newArchivos, ...c.archivos] }
          : c
      )
    )
    toast.success(`${newArchivos.length} archivo(s) añadido(s)`)
  }

  function removeArchivo(clientId: string, archivoId: string) {
    setClients((prev) =>
      prev.map((c) =>
        c.id === clientId
          ? { ...c, archivos: c.archivos.filter((a) => a.id !== archivoId) }
          : c
      )
    )
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

  return (
    <div className="space-y-4 animate-fade-in text-slate-800 dark:text-slate-100 font-sans">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="p-3.5 bg-brand-panel rounded-xl border border-brand-border space-y-1">
          <span className="text-[9px] font-mono uppercase tracking-wider text-brand-subtext font-bold">
            Total clientes en cartera
          </span>
          <h4 className="text-lg font-mono font-bold text-cyan-600 dark:text-cyan-400">
            {myClients.length}
          </h4>
        </div>
        <div className="p-3.5 bg-brand-panel rounded-xl border border-brand-border space-y-1">
          <span className="text-[9px] font-mono uppercase tracking-wider text-brand-subtext font-bold">
            Contratos activos vinculados
          </span>
          <h4 className="text-lg font-mono font-bold text-emerald-500">
            {contracts.filter((c) => c.comercialId === activeUserId && isContractActivado(c.estado)).length}
          </h4>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-[220px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
          <input
            type="search"
            value={clientesSearchQuery}
            onChange={(e) => setClientesSearchQuery(e.target.value)}
            placeholder="Buscar cliente, NIF, email…"
            className="w-full h-8 pl-8 pr-7 bg-transparent border border-brand-border rounded-lg focus:border-cyan-500/60 focus:outline-none text-[11px] text-brand-text placeholder-slate-400"
          />
          {clientesSearchQuery && (
            <button
              type="button"
              onClick={() => setClientesSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-brand-text text-[10px]"
            >
              ✕
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => {
            const headers = [
              "Nombre",
              "Estado",
              "Documento",
              "Teléfono",
              "Email",
              "CP",
              "Ciudad",
              "Tipo",
            ]
            const rows = myClients.map((c) => [
              c.nombre,
              c.estado,
              c.documento || "",
              c.telefono || "",
              c.email || "",
              c.codigoPostal || "",
              c.ciudad || "",
              c.tipoCliente,
            ])
            const csv = [headers.join(","), ...rows.map((r) => r.map((x) => `"${String(x).replace(/"/g, '""')}"`).join(","))].join("\n")
            const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
            const url = URL.createObjectURL(blob)
            const link = document.createElement("a")
            link.href = url
            link.download = `Mis_Clientes_${activeUserName.replace(/\s+/g, "_")}.csv`
            link.click()
            URL.revokeObjectURL(url)
            toast.success("Exportación CSV descargada")
          }}
          className="h-8 px-2.5 text-[10px] font-medium text-brand-subtext hover:text-cyan-600 border border-brand-border rounded-lg flex items-center gap-1"
        >
          <FileSpreadsheet className="w-3 h-3" />
          Excel
        </button>
      </div>

      <div className="bg-brand-panel rounded-2xl border border-brand-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs min-w-[900px]">
            <thead>
              <tr className="border-b border-brand-border text-brand-subtext bg-brand-bg/40 font-mono">
                <th className="p-3 w-20" />
                <th className="p-3 text-[10px] uppercase font-bold">Nombre</th>
                <th className="p-3 text-[10px] uppercase font-bold">Estado</th>
                <th className="p-3 text-[10px] uppercase font-bold">DNI/NIE/NIF/CIF</th>
                <th className="p-3 text-[10px] uppercase font-bold">Teléfono</th>
                <th className="p-3 text-[10px] uppercase font-bold">Email</th>
                <th className="p-3 text-[10px] uppercase font-bold">CP</th>
                <th className="p-3 text-[10px] uppercase font-bold">Ciudad</th>
                <th className="p-3 text-[10px] uppercase font-bold">Tipo</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((client) => (
                <tr
                  key={client.id}
                  className="border-b border-brand-border hover:bg-slate-50/50 dark:hover:bg-white/[0.02]"
                >
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => setFolderClientId(client.id)}
                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors"
                        title="Carpeta de documentos"
                      >
                        <FolderOpen className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setContractsClientId(client.id)}
                        className="p-1.5 rounded-lg bg-blue-500/10 text-blue-600 dark:text-cyan-400 hover:bg-blue-500/20 border border-blue-500/20 transition-colors"
                        title="Contratos del cliente"
                      >
                        <FilePenLine className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                  <td className="p-3 font-bold text-brand-text">
                    {renderEditableCell(client, "nombre", { placeholder: "Sin nombre" })}
                  </td>
                  <td className="p-3">
                    {renderEditableCell(client, "estado", {
                      display: (v) => (
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[9px] font-mono uppercase font-bold ${
                            v === "activo"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : v === "pendiente"
                                ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                                : "bg-slate-500/15 text-slate-500"
                          }`}
                        >
                          {String(v || "—")}
                        </span>
                      ),
                    })}
                  </td>
                  <td className="p-3 font-mono">
                    {renderEditableCell(client, "documento")}
                  </td>
                  <td className="p-3 font-mono">
                    {renderEditableCell(client, "telefono")}
                  </td>
                  <td className="p-3">
                    {renderEditableCell(client, "email")}
                  </td>
                  <td className="p-3 font-mono">
                    {renderEditableCell(client, "codigoPostal")}
                  </td>
                  <td className="p-3">
                    {renderEditableCell(client, "ciudad")}
                  </td>
                  <td className="p-3 capitalize">
                    {renderEditableCell(client, "tipoCliente", {
                      display: (v) =>
                        v === "empresa" ? "Empresa" : v === "particular" ? "Particular" : "—",
                    })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <p className="text-center text-xs text-brand-subtext py-10 font-mono">
              No hay clientes en tu cartera.
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
                className="text-slate-400 hover:text-brand-text"
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
                        className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-600 hover:bg-cyan-500/20"
                        title="Descargar"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeArchivo(folderClient.id, archivo.id)}
                        className="p-1.5 rounded-lg bg-rose-500/10 text-rose-500 hover:bg-rose-500/20"
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
                className="w-full py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold rounded-lg"
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
                className="text-slate-400 hover:text-brand-text"
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
                    className="w-full text-left p-3 rounded-xl border border-brand-border hover:border-cyan-500/40 hover:bg-cyan-500/5 transition-colors"
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
                    <p className="text-xs text-brand-text mt-0.5">{contract.compania} · {contract.tarifa}</p>
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
