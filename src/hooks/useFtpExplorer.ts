import { startTransition, useCallback, useEffect, useMemo, useOptimistic, useState } from "react"
import { toast } from "sonner"
import { canMutateFtpLocation, FTP_LOCAL_ROOT_ID, virtualFtpRoots } from "../lib/ftp-sources"
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
  triggerBlobDownload,
  uploadFtpFile,
} from "../lib/supabase/ftp-nodes"
import type { FtpNode } from "@/types/ftp"

export function useFtpExplorer(activeUserId: string, canEdit: boolean) {
  const [localNodes, setLocalNodes] = useState<FtpNode[]>([])
  const [optimisticNodes, addOptimisticFtpNode] = useOptimistic(
    localNodes,
    applyFtpOptimisticAction
  )
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  const loadLocalNodes = useCallback(async () => {
    const result = await listFtpNodes()
    if (result.ok) setLocalNodes(result.data)
    else toast.error(result.message)
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
    const base =
      currentFolderId === null
        ? virtualFtpRoots()
        : getFtpChildren(optimisticNodes, currentFolderId)

    const q = search.trim().toLowerCase()
    if (!q) return base
    return base.filter((n) => n.name.toLowerCase().includes(q))
  }, [currentFolderId, optimisticNodes, search])

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

  function navigateToFolder(folderId: string | null) {
    setCurrentFolderId(folderId)
    setSearch("")
  }

  function handleCreateFolder(name: string, onSuccess?: () => void) {
    const trimmed = name.trim()
    if (!trimmed) {
      toast.error("Indica un nombre para la carpeta.")
      return
    }
    if (!canMutateHere || !currentFolderId) {
      toast.error("Entra en una carpeta del FTP EnerSave para crear una subcarpeta.")
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
    if (node.id === FTP_LOCAL_ROOT_ID) return
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
    navigateToFolder,
    handleCreateFolder,
    handleUploadFiles,
    handleDelete,
    handleDownload,
  }
}

export type { FtpOptimisticAction }
