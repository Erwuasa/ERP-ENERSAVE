import type { FtpBreadcrumbItem, FtpNode } from "../types/ftp"
import { FTP_ROOT_LABEL } from "../data/ftp-seed-catalog"
import {
  FTP_AT_ROOT_ID,
  FTP_AT_ROOT_LABEL,
  FTP_LOCAL_ROOT_ID,
  FTP_LOCAL_ROOT_LABEL,
  atRutaFromId,
  isAtFtpId,
} from "./ftp-sources"

export function sortFtpNodes(nodes: FtpNode[]): FtpNode[] {
  return [...nodes].sort((a, b) => {
    if (a.nodeType !== b.nodeType) return a.nodeType === "folder" ? -1 : 1
    return a.name.localeCompare(b.name, "es")
  })
}

export function getFtpChildren(nodes: FtpNode[], parentId: string | null): FtpNode[] {
  const effectiveParent = parentId === FTP_LOCAL_ROOT_ID ? null : parentId
  return sortFtpNodes(nodes.filter((n) => n.parentId === effectiveParent))
}

export function findFtpNode(nodes: FtpNode[], id: string): FtpNode | undefined {
  return nodes.find((n) => n.id === id)
}

export function buildFtpBreadcrumb(
  nodes: FtpNode[],
  currentFolderId: string | null
): FtpBreadcrumbItem[] {
  const crumbs: FtpBreadcrumbItem[] = [{ id: null, label: FTP_ROOT_LABEL }]
  if (!currentFolderId) return crumbs

  if (isAtFtpId(currentFolderId)) {
    crumbs.push({ id: FTP_AT_ROOT_ID, label: FTP_AT_ROOT_LABEL })
    const ruta = atRutaFromId(currentFolderId)
    if (!ruta) return crumbs
    const parts = ruta.split(/[/\\]+/).filter(Boolean)
    let acc = ""
    for (const part of parts) {
      acc = acc ? `${acc}/${part}` : part
      crumbs.push({ id: `at:${acc}`, label: part })
    }
    return crumbs
  }

  crumbs.push({ id: FTP_LOCAL_ROOT_ID, label: FTP_LOCAL_ROOT_LABEL })
  if (currentFolderId === FTP_LOCAL_ROOT_ID) return crumbs

  const chain: FtpNode[] = []
  let cursor = findFtpNode(nodes, currentFolderId)
  while (cursor) {
    chain.unshift(cursor)
    cursor = cursor.parentId ? findFtpNode(nodes, cursor.parentId) : undefined
  }

  for (const node of chain) {
    crumbs.push({ id: node.id, label: node.name })
  }
  return crumbs
}

export function countFtpFolderContents(children: FtpNode[]): {
  folders: number
  files: number
} {
  return {
    folders: children.filter((n) => n.nodeType === "folder").length,
    files: children.filter((n) => n.nodeType === "file").length,
  }
}

export function collectFtpDescendantIds(nodes: FtpNode[], rootId: string): Set<string> {
  const ids = new Set<string>([rootId])
  let changed = true
  while (changed) {
    changed = false
    for (const node of nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id)
        changed = true
      }
    }
  }
  return ids
}

export function filterFtpNodesBySearch(nodes: FtpNode[], query: string): FtpNode[] {
  const q = query.trim().toLowerCase()
  if (!q) return nodes
  return nodes.filter((n) => n.name.toLowerCase().includes(q))
}
