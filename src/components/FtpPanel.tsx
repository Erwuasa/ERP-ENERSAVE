import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ChevronRight,
  Download,
  FileSpreadsheet,
  FileText,
  Folder,
  Globe,
  HardDrive,
  Home,
  Loader2,
  Plus,
  Search,
  Trash2,
  Upload,
  X,
} from "lucide-react"
import { toast } from "sonner"
import { FTP_ROOT_LABEL } from "../data/ftp-seed-catalog"
import {
  buildFtpBreadcrumb,
  countFtpFolderContents,
  getFtpChildren,
} from "../lib/ftp-tree"
import {
  createFtpFolder,
  deleteFtpNode,
  getFtpFileDownloadUrl,
  listFtpNodes,
  uploadFtpFile,
} from "../lib/supabase/ftp-nodes"
import type { FtpNode } from "../types/ftp"

interface FtpPanelProps {
  canEdit: boolean
  activeUserId: string
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—"
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileIcon(mimeType?: string | null) {
  if (!mimeType) return FileText
  if (mimeType.includes("sheet") || mimeType.includes("excel") || mimeType.includes("csv")) {
    return FileSpreadsheet
  }
  return FileText
}

function FtpFolderCard({
  node,
  onOpen,
  onDelete,
  canEdit,
}: {
  node: FtpNode
  onOpen: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="group text-left bg-brand-panel border border-brand-border rounded-xl p-4 flex items-center gap-3 shadow-sm hover:border-emerald-500/40 hover:shadow-md transition-all duration-200 cursor-pointer min-h-[88px]"
    >
      <span className="relative shrink-0">
        <Folder className="h-10 w-10 text-amber-500/90" aria-hidden />
        <Globe className="h-4 w-4 text-sky-600 absolute -bottom-0.5 -right-0.5 bg-brand-panel rounded-full" aria-hidden />
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-xs font-bold text-brand-text uppercase tracking-tight truncate">
          {node.name}
        </span>
        <span className="block text-[10px] text-brand-subtext mt-1">Abrir carpeta</span>
      </span>
      <span className="flex items-center gap-1 shrink-0">
        {canEdit && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => {
              e.stopPropagation()
              onDelete()
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault()
                e.stopPropagation()
                onDelete()
              }
            }}
            className="p-1.5 rounded-lg border border-transparent text-brand-subtext opacity-0 group-hover:opacity-100 hover:text-rose-600 hover:border-rose-500/30 transition-all"
            aria-label={`Eliminar carpeta ${node.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-brand-subtext/70 group-hover:text-emerald-600 transition-colors" />
      </span>
    </button>
  )
}

function FtpFileCard({
  node,
  onDownload,
  onDelete,
  canEdit,
}: {
  node: FtpNode
  onDownload: () => void
  onDelete: () => void
  canEdit: boolean
}) {
  const Icon = fileIcon(node.mimeType)
  return (
    <div className="group bg-brand-panel border border-brand-border rounded-xl p-4 flex items-center gap-3 shadow-sm hover:border-cyan-500/35 transition-colors min-h-[88px]">
      <Icon className="h-9 w-9 text-cyan-600 shrink-0" aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-brand-text truncate">{node.name}</p>
        <p className="text-[10px] font-mono text-brand-subtext mt-0.5">
          {formatFileSize(node.sizeBytes)}
        </p>
      </div>
      <div className="flex items-center gap-1 shrink-0">
        <button
          type="button"
          onClick={onDownload}
          className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-cyan-600 hover:border-cyan-500/30 cursor-pointer"
          aria-label={`Descargar ${node.name}`}
        >
          <Download className="h-3.5 w-3.5" />
        </button>
        {canEdit && (
          <button
            type="button"
            onClick={onDelete}
            className="p-1.5 rounded-lg border border-brand-border text-brand-subtext hover:text-rose-600 hover:border-rose-500/30 cursor-pointer"
            aria-label={`Eliminar ${node.name}`}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}

export function FtpPanel({ canEdit, activeUserId }: FtpPanelProps) {
  const [nodes, setNodes] = useState<FtpNode[]>([])
  const [loading, setLoading] = useState(true)
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [showNewFolder, setShowNewFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [busy, setBusy] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadNodes = useCallback(async () => {
    setLoading(true)
    const result = await listFtpNodes()
    if (result.ok) {
      setNodes(result.data)
    } else {
      toast.error(result.message)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void loadNodes()
  }, [loadNodes])

  const breadcrumbs = useMemo(
    () => buildFtpBreadcrumb(nodes, currentFolderId),
    [nodes, currentFolderId]
  )

  const children = useMemo(() => {
    const base = getFtpChildren(nodes, currentFolderId)
    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter((n) => n.name.toLowerCase().includes(q))
  }, [nodes, currentFolderId, search])

  const folders = useMemo(
    () => children.filter((n) => n.nodeType === "folder"),
    [children]
  )
  const files = useMemo(
    () => children.filter((n) => n.nodeType === "file"),
    [children]
  )

  const totals = countFtpFolderContents(children)

  function navigateToFolder(folderId: string | null) {
    setCurrentFolderId(folderId)
    setSearch("")
  }

  async function handleCreateFolder() {
    const name = newFolderName.trim()
    if (!name) {
      toast.error("Indica un nombre para la carpeta.")
      return
    }
    if (currentFolderId === null) {
      toast.error("Crea subcarpetas dentro de DOCUMENTOS OPERACIONES o más abajo.")
      return
    }
    setBusy(true)
    const result = await createFtpFolder({
      parentId: currentFolderId,
      name,
      createdBy: activeUserId,
    })
    setBusy(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success("Carpeta creada.")
    setNewFolderName("")
    setShowNewFolder(false)
    await loadNodes()
  }

  async function handleUploadFiles(fileList: FileList | null) {
    if (!fileList?.length || !currentFolderId) {
      toast.error("Entra en una carpeta antes de subir archivos.")
      return
    }
    setBusy(true)
    let uploaded = 0
    for (const file of Array.from(fileList)) {
      const result = await uploadFtpFile({
        parentId: currentFolderId,
        file,
        createdBy: activeUserId,
      })
      if (result.ok) uploaded += 1
      else toast.error(result.message)
    }
    setBusy(false)
    if (uploaded > 0) {
      toast.success(`${uploaded} archivo${uploaded !== 1 ? "s" : ""} subido${uploaded !== 1 ? "s" : ""}.`)
      await loadNodes()
    }
  }

  async function handleDelete(node: FtpNode) {
    const label = node.nodeType === "folder" ? "carpeta" : "archivo"
    if (!confirm(`¿Eliminar ${label} «${node.name}»? Esta acción afectará a todos los usuarios.`)) {
      return
    }
    setBusy(true)
    const result = await deleteFtpNode(node, nodes)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(`${label.charAt(0).toUpperCase()}${label.slice(1)} eliminada.`)
    if (node.id === currentFolderId) setCurrentFolderId(node.parentId)
    await loadNodes()
  }

  async function handleDownload(node: FtpNode) {
    const result = await getFtpFileDownloadUrl(node)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    window.open(result.data, "_blank", "noopener,noreferrer")
  }

  return (
    <div className="space-y-5 animate-fade-in font-sans">
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        <div className="flex items-start gap-3">
          <span className="p-2.5 rounded-xl bg-sky-500/10 text-sky-600 border border-sky-500/20">
            <HardDrive className="h-5 w-5" />
          </span>
          <div>
            <h2 className="text-xl font-extrabold text-brand-text tracking-tight">FTP</h2>
          </div>
        </div>

        {canEdit && (
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              type="button"
              disabled={busy || currentFolderId === null}
              onClick={() => setShowNewFolder(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border bg-brand-panel text-[11px] font-bold text-brand-text hover:border-emerald-500/40 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="h-3.5 w-3.5" />
              Nueva carpeta
            </button>
            <button
              type="button"
              disabled={busy || currentFolderId === null}
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 text-white text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
            >
              <Upload className="h-3.5 w-3.5" />
              Subir archivos
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              accept=".pdf,.doc,.docx,.xls,.xlsx,.csv,.txt,.png,.jpg,.jpeg,.webp"
              onChange={(e) => {
                void handleUploadFiles(e.target.files)
                e.target.value = ""
              }}
            />
          </div>
        )}
      </div>

      <div className="bg-brand-panel border border-brand-border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-brand-border space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-brand-subtext pointer-events-none" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nombre en esta carpeta..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-brand-border bg-brand-surface text-sm text-brand-text placeholder:text-brand-subtext/70"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-brand-subtext cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <nav className="flex flex-wrap items-center gap-1 text-[11px] font-mono text-brand-subtext min-w-0">
              <button
                type="button"
                onClick={() => navigateToFolder(null)}
                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded hover:text-emerald-600 hover:bg-emerald-500/10 cursor-pointer"
              >
                <Home className="h-3.5 w-3.5" />
                {FTP_ROOT_LABEL}
              </button>
              {breadcrumbs.slice(1).map((crumb, index, arr) => (
                <span key={crumb.id ?? crumb.label} className="inline-flex items-center gap-1">
                  <ChevronRight className="h-3 w-3 text-brand-subtext/60" />
                  <button
                    type="button"
                    onClick={() => navigateToFolder(crumb.id)}
                    className={`px-1.5 py-0.5 rounded truncate max-w-[200px] cursor-pointer ${
                      index === arr.length - 1
                        ? "text-brand-text font-bold"
                        : "hover:text-emerald-600 hover:bg-emerald-500/10"
                    }`}
                  >
                    {crumb.label}
                  </button>
                </span>
              ))}
            </nav>
            <p className="text-[11px] font-mono text-brand-subtext shrink-0">
              <span className="font-bold text-brand-text">{totals.folders}</span> carpeta
              {totals.folders !== 1 ? "s" : ""} ·{" "}
              <span className="font-bold text-brand-text">{totals.files}</span> archivo
              {totals.files !== 1 ? "s" : ""}
            </p>
          </div>
        </div>

        {showNewFolder && canEdit && (
          <div className="px-4 sm:px-5 py-3 border-b border-brand-border bg-brand-surface/50 flex flex-col sm:flex-row gap-2 sm:items-center">
            <input
              type="text"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Nombre de la nueva carpeta"
              className="flex-1 px-3 py-2 rounded-lg border border-brand-border bg-brand-panel text-sm text-brand-text"
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreateFolder()
              }}
            />
            <div className="flex gap-2">
              <button
                type="button"
                disabled={busy}
                onClick={() => void handleCreateFolder()}
                className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold cursor-pointer disabled:opacity-50"
              >
                Crear
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowNewFolder(false)
                  setNewFolderName("")
                }}
                className="px-4 py-2 rounded-lg border border-brand-border text-xs font-bold text-brand-subtext cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        <div className="p-4 sm:p-5 space-y-6 min-h-[320px]">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-20 text-brand-subtext">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-xs font-mono">Cargando FTP…</span>
            </div>
          ) : (
            <>
              {folders.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
                    Carpetas ({folders.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {folders.map((folder) => (
                      <FtpFolderCard
                        key={folder.id}
                        node={folder}
                        canEdit={canEdit}
                        onOpen={() => navigateToFolder(folder.id)}
                        onDelete={() => void handleDelete(folder)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {files.length > 0 && (
                <section className="space-y-3">
                  <h3 className="text-[10px] font-mono font-bold uppercase text-brand-subtext tracking-wider">
                    Archivos ({files.length})
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                    {files.map((file) => (
                      <FtpFileCard
                        key={file.id}
                        node={file}
                        canEdit={canEdit}
                        onDownload={() => void handleDownload(file)}
                        onDelete={() => void handleDelete(file)}
                      />
                    ))}
                  </div>
                </section>
              )}

              {folders.length === 0 && files.length === 0 && (
                <div className="text-center py-16 border border-dashed border-brand-border rounded-2xl bg-brand-surface/30">
                  <Folder className="h-10 w-10 mx-auto text-brand-subtext/60 mb-3" />
                  <p className="text-sm font-semibold text-brand-text">
                    {search ? "Sin resultados en esta carpeta" : "Carpeta vacía"}
                  </p>
                  <p className="text-xs text-brand-subtext mt-1">
                    {canEdit && currentFolderId
                      ? "Sube documentos PDF, Word, Excel o CSV desde aquí."
                      : "No hay documentos en esta ubicación."}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
