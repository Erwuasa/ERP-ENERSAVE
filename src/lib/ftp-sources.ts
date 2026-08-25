import type { FtpNode } from "../types/ftp"

export const FTP_AT_ROOT_ID = "ftp-source-at"
export const FTP_LOCAL_ROOT_ID = "ftp-source-enersave"

export const FTP_AT_ROOT_LABEL = "Archivo AT"
export const FTP_LOCAL_ROOT_LABEL = "FTP EnerSave"

export function isVirtualFtpRoot(id: string | null): boolean {
  return id === FTP_AT_ROOT_ID || id === FTP_LOCAL_ROOT_ID
}

export function isAtFtpNode(node: Pick<FtpNode, "id" | "source">): boolean {
  return node.source === "at" || node.id === FTP_AT_ROOT_ID || node.id.startsWith("at:")
}

export function isAtFtpId(id: string | null): boolean {
  return id === FTP_AT_ROOT_ID || Boolean(id?.startsWith("at:"))
}

export function atRutaFromId(id: string | null): string {
  if (!id || id === FTP_AT_ROOT_ID) return ""
  if (id.startsWith("at:")) return id.slice(3)
  return ""
}

export function atNodeId(ruta: string): string {
  return ruta ? `at:${ruta}` : FTP_AT_ROOT_ID
}

export function canMutateFtpLocation(folderId: string | null): boolean {
  if (!folderId) return false
  if (isVirtualFtpRoot(folderId) || isAtFtpId(folderId)) return false
  return true
}

export function virtualFtpRoots(): FtpNode[] {
  const now = new Date().toISOString()
  return [
    {
      id: FTP_AT_ROOT_ID,
      parentId: null,
      name: FTP_AT_ROOT_LABEL,
      nodeType: "folder",
      source: "at",
      atRuta: "",
      createdAt: now,
      updatedAt: now,
    },
    {
      id: FTP_LOCAL_ROOT_ID,
      parentId: null,
      name: FTP_LOCAL_ROOT_LABEL,
      nodeType: "folder",
      source: "enersave",
      createdAt: now,
      updatedAt: now,
    },
  ]
}
