import { startTransition, useCallback, useEffect, useMemo, useOptimistic, useState } from "react"
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
  collectFtpDescendantIds,
  countFtpFolderContents,
  getFtpChildren,
} from "../lib/ftp-tree"
import {
  applyFtpOptimisticAction,
  type FtpOptimisticAction,
} from "../lib/ftp-optimistic-actions"
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
  const [optimisticNodes, addOptimisticFtpNode] = useOptimistic(
    localNodes,
    applyFtpOptimisticAction
  )
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
    else base = getFtpChildren(optimisticNodes, currentFolderId)

    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter((n) => n.name.toLowerCase().includes(q))
  }, [atChildren, currentFolderId, optimisticNodes, search])

  const folders = useMemo(
    () => children.filter((n) => n.nodeType === "folder"),
    [children]
  )
  const files = useMemo(
    () => children.filter((n) => n.nodeType === "file"),
    [children]
  )

  const breadcrumbs = useMemo(
    () => buildFtpBreadcrumb(optimisticNodes, currentFolderId),
    [currentFolderId, optimisticNodes]
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

  function handleCreateFolder(name: string, onSuccess?: () => void) {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Indica un nombre para la carpeta.")
      return
    }
    if (!canMutateHere || !currentFolderId) {
      toast.error("Crea carpetas dentro del FTP EnerSave, no en el archivo AT.")
      return
    }

    const now = new Date().toISOString()
    const optimisticFolder: FtpNode = {
      id: `optimistic-ftp-${crypto.randomUUID()}`,
      parentId: currentFolderId,
      name: trimmed,
      nodeType: "folder",
      source: "enersave",
      createdBy: activeUserId,
      createdAt: now,
      updatedAt: now,
    }

    startTransition(async () => {
      setBusy(true)
      addOptimisticFtpNode({ type: "insert", node: optimisticFolder })

      const result = await createFtpFolder({
        parentId: currentFolderId,
        name: trimmed,
        createdBy: activeUserId,
      })

      setBusy(false)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      setLocalNodes((prev) => [...prev, result.data])
      toast.success("Carpeta creada.")
      onSuccess?.()
    })
  }

  function handleUploadFiles(fileList: FileList | null) {
    if (!fileList?.length || !canMutateHere || !currentFolderId) {
      toast.error("Entra en una carpeta del FTP EnerSave para subir archivos.")
      return
    }

    const parentId = currentFolderId
    const now = new Date().toISOString()
    const uploads = Array.from(fileList).map((file) => ({
      file,
      placeholder: {
        id: `optimistic-ftp-${crypto.randomUUID()}`,
        parentId,
        name: file.name,
        nodeType: "file" as const,
        source: "enersave" as const,
        mimeType: file.type || null,
        sizeBytes: file.size,
        status: "uploading" as const,
        createdBy: activeUserId,
        createdAt: now,
        updatedAt: now,
      } satisfies FtpNode,
    }))

    startTransition(async () => {
      setBusy(true)
      // All files show up as "uploading" placeholders immediately, then each
      // resolves independently instead of the whole batch waiting on the
      // slowest upload.
      for (const { placeholder } of uploads) {
        addOptimisticFtpNode({ type: "insert", node: placeholder })
      }

      const results = await Promise.all(
        uploads.map(async ({ file, placeholder }) => {
          const result = await uploadFtpFile({ parentId, file, createdBy: activeUserId })
          addOptimisticFtpNode({ type: "remove", ids: [placeholder.id] })
          if (!result.ok) {
            toast.error(result.message)
            return false
          }
          setLocalNodes((prev) => [...prev, result.data])
          return true
        })
      )

      setBusy(false)
      const uploaded = results.filter(Boolean).length
      if (uploaded > 0) {
        toast.success(
          `${uploaded} archivo${uploaded !== 1 ? "s" : ""} subido${uploaded !== 1 ? "s" : ""}.`
        )
      }
    })
  }

  function handleDelete(node: FtpNode) {
    if (node.source === "at" || node.id === FTP_AT_ROOT_ID || node.id === FTP_LOCAL_ROOT_ID) {
      toast.error("El archivo AT es de solo lectura.")
      return
    }
    const label = node.nodeType === "folder" ? "carpeta" : "archivo"
    if (!confirm(`¿Eliminar ${label} «${node.name}»? Esta acción afectará a todos los usuarios.`)) {
      return
    }

    // Snapshot before the optimistic removal — a folder delete cascades to
    // every descendant, so this can be more than one id.
    const idsToRemove = Array.from(collectFtpDescendantIds(localNodes, node.id))

    startTransition(async () => {
      setBusy(true)
      addOptimisticFtpNode({ type: "remove", ids: idsToRemove })

      const result = await deleteFtpNode(node, localNodes)

      setBusy(false)
      if (!result.ok) {
        toast.error(result.message)
        return
      }
      toast.success(`${label.charAt(0).toUpperCase()}${label.slice(1)} eliminada.`)
      if (node.id === currentFolderId) setCurrentFolderId(node.parentId ?? FTP_LOCAL_ROOT_ID)
      const removedIds = new Set(idsToRemove)
      setLocalNodes((prev) => prev.filter((n) => !removedIds.has(n.id)))
    })
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

export type { FtpOptimisticAction }
