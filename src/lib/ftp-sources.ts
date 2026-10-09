import type { FtpNode } from "../types/ftp"

// El archivo AT (`FTP_AT_ROOT_ID`/`at:*` ids) se retiró del explorador: nunca hubo una Edge
// Function `at-ftp` desplegada que lo respaldara (siempre devolvía un error), y AT está
// descartado por completo (AGENTS.md §9, "congelar con corte limpio"). Solo queda el FTP propio.
export const FTP_LOCAL_ROOT_ID = "ftp-source-enersave"

export const FTP_LOCAL_ROOT_LABEL = "FTP EnerSave"

export function isVirtualFtpRoot(id: string | null): boolean {
  return id === FTP_LOCAL_ROOT_ID
}

export function canMutateFtpLocation(folderId: string | null): boolean {
  if (!folderId) return false
  if (isVirtualFtpRoot(folderId)) return false
  return true
}

export function virtualFtpRoots(): FtpNode[] {
  const now = new Date().toISOString()
  return [
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
