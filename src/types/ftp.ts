export type FtpNodeType = "folder" | "file"

export interface FtpNode {
  id: string
  parentId: string | null
  name: string
  nodeType: FtpNodeType
  storagePath?: string | null
  mimeType?: string | null
  sizeBytes?: number | null
  createdBy?: string | null
  createdAt: string
  updatedAt: string
}

export interface FtpBreadcrumbItem {
  id: string | null
  label: string
}
