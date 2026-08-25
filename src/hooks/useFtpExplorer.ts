import { useCallback, useEffect, useMemo, useState } from "react"
import { toast } from "sonner"
import { downloadAtFtpFile, listAtFtpFolder, triggerBlobDownload } from "../lib/supabase/at-ftp"
import {
  canMutateFtpLocation,
  FTP_AT_ROOT_ID,
  FTP_LOCAL_ROOT_ID,
  atRutaFromId,
  isAtFtpId,
  virtualFtpRoots,
} from "../lib/ftp-sources"
import {
  buildFtpBreadcrumb,
  countFtpFolderContents,
  getFtpChildren,
} from "../lib/ftp-tree"
import {
  createFtpFolder,
  deleteFtpNode,
  downloadFtpFileBlob,
  listFtpNodes,
  uploadFtpFile,
} from "../lib/supabase/ftp-nodes"
import type { FtpNode } from "../types/ftp"

export function useFtpExplorer(activeUserId: string, canEdit: boolean) {
  const [localNodes, setLocalNodes] = useState<FtpNode[]>([])
  const [atChildren, setAtChildren] = useState<FtpNode[]>([])
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadLocalNodes = useCallback(async () => {
    const result = await listFtpNodes()
    if (result.ok) setLocalNodes(result.data)
    else toast.error(result.message)
  }, [])

  const loadAtFolder = useCallback(async (folderId: string) => {
    const ruta = atRutaFromId(folderId)
    const result = await listAtFtpFolder(ruta)
    if (!result.ok) {
      setAtChildren([])
      toast.error(result.message)
      return
    }
    setAtChildren(result.data)
  }, [])

  useEffect(() => {
    let cancelled = false
    async function boot() {
      setLoading(true)
      await loadLocalNodes()
      if (!cancelled) setLoading(false)
    }
    void boot()
    return () => {
      cancelled = true
    }
  }, [loadLocalNodes])

  const children = useMemo(() => {
    let base: FtpNode[]
    if (currentFolderId === null) base = virtualFtpRoots()
    else if (isAtFtpId(currentFolderId)) base = atChildren
    else base = getFtpChildren(localNodes, currentFolderId)

    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter((n) => n.name.toLowerCase().includes(q))
  }, [atChildren, currentFolderId, localNodes, search])

  const folders = useMemo(
    () => children.filter((n) => n.nodeType === "folder"),
    [children]
  )
  const files = useMemo(
    () => children.filter((n) => n.nodeType === "file"),
    [children]
  )

  const breadcrumbs = useMemo(
    () => buildFtpBreadcrumb(localNodes, currentFolderId),
    [currentFolderId, localNodes]
  )

  const canMutateHere = canEdit && canMutateFtpLocation(currentFolderId)
  const viewingAt = isAtFtpId(currentFolderId)

  async function navigateToFolder(folderId: string | null) {
    setCurrentFolderId(folderId)
    setSearch("")
    if (folderId && isAtFtpId(folderId)) {
      setLoading(true)
      await loadAtFolder(folderId)
      setLoading(false)
    }
  }

  async function handleCreateFolder(name: string) {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Indica un nombre para la carpeta.")
      return false
    }
    if (!canMutateHere || !currentFolderId) {
      toast.error("Crea carpetas dentro del FTP EnerSave, no en el archivo AT.")
      return false
    }
    setBusy(true)
    const result = await createFtpFolder({
      parentId: currentFolderId,
      name: trimmed,
      createdBy: activeUserId,
    })
    setBusy(false)
    if (!result.ok) {
      toast.error(result.message)
      return false
    }
    toast.success("Carpeta creada.")
    await loadLocalNodes()
    return true
  }

  async function handleUploadFiles(fileList: FileList | null) {
    if (!fileList?.length || !canMutateHere || !currentFolderId) {
      toast.error("Entra en una carpeta del FTP EnerSave para subir archivos.")
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
      await loadLocalNodes()
    }
  }

  async function handleDelete(node: FtpNode) {
    if (node.source === "at" || node.id === FTP_AT_ROOT_ID || node.id === FTP_LOCAL_ROOT_ID) {
      toast.error("El archivo AT es de solo lectura.")
      return
    }
    const label = node.nodeType === "folder" ? "carpeta" : "archivo"
    if (!confirm(`¿Eliminar ${label} «${node.name}»? Esta acción afectará a todos los usuarios.`)) {
      return
    }
    setBusy(true)
    const result = await deleteFtpNode(node, localNodes)
    setBusy(false)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    toast.success(`${label.charAt(0).toUpperCase()}${label.slice(1)} eliminada.`)
    if (node.id === currentFolderId) setCurrentFolderId(node.parentId ?? FTP_LOCAL_ROOT_ID)
    await loadLocalNodes()
  }

  async function handleDownload(node: FtpNode) {
    if (node.source === "at" && node.atRuta) {
      const result = await downloadAtFtpFile(node.atRuta, node.name)
      if (!result.ok) toast.error(result.message)
      return
    }
    const result = await downloadFtpFileBlob(node)
    if (!result.ok) {
      toast.error(result.message)
      return
    }
    triggerBlobDownload(result.data, node.name)
  }

  return {
    loading,
    busy,
    currentFolderId,
    search,
    setSearch,
    folders,
    files,
    totals: countFtpFolderContents(children),
    breadcrumbs,
    canMutateHere,
    viewingAt,
    navigateToFolder,
    handleCreateFolder,
    handleUploadFiles,
    handleDelete,
    handleDownload,
  }
}
