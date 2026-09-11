export type FtpNodeType = "folder" | "file"
export type FtpSource = "at" | "enersave"

export interface FtpNode {
  id: string
  parentId: string | null
  name: string
  nodeType: FtpNodeType
  source?: FtpSource
  atRuta?: string | null
  storagePath?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
  /** Optimistic upload state — set while a placeholder waits on the server round trip. */
  status?: "uploading" | "error"
}

export interface FtpBreadcrumbItem {
  id: string | null
  label: string
}
