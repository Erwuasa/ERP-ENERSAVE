export interface StageGateAttachmentMeta {
  name: string
  mimeType: string
  sizeBytes: number
  dataUrl: string
}

export const STAGE_GATE_MAX_ATTACHMENT_BYTES = 1_500_000
export const STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM = 3

export async function readFilesAsAttachments(
  files: FileList | File[]
): Promise<StageGateAttachmentMeta[]> {
  const list = Array.from(files)
  const results: StageGateAttachmentMeta[] = []

  for (const file of list.slice(0, STAGE_GATE_MAX_ATTACHMENTS_PER_ITEM)) {
    if (file.size > STAGE_GATE_MAX_ATTACHMENT_BYTES) {
      throw new Error(
        `"${file.name}" supera ${Math.round(STAGE_GATE_MAX_ATTACHMENT_BYTES / 1_000_000)} MB`
      )
    }
    const dataUrl = await readFileAsDataUrl(file)
    results.push({
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      sizeBytes: file.size,
      dataUrl,
    })
  }

  return results
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`))
    reader.readAsDataURL(file)
  })
}

export function formatAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
