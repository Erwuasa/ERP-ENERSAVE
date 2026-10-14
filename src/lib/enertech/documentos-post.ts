export const ENERTECH_DOCUMENTO_MAX_BYTES = 15 * 1024 * 1024

const ENERTECH_DOCUMENTO_EXTENSIONS = new Set([
  "pdf",
  "jpg",
  "jpeg",
  "png",
  "webp",
  "heic",
  "tif",
  "tiff",
])

export interface EnertechDocumentoAdjunto {
  filename: string
  base64: string
}

export function isEnertechDocumentoSizeAllowed(byteLength: number): boolean {
  return byteLength > 0 && byteLength <= ENERTECH_DOCUMENTO_MAX_BYTES
}

/** Keeps the file name Enertech accepts. Returns null when the extension is not allowed. */
export function enertechDocumentoFilename(name: string): string | null {
  const base = name.split(/[/\\]/).pop()?.trim() ?? ""
  const cleaned = base.replace(/[^\w.\-() ]+/g, "_").replace(/^\.+/, "")
  const dot = cleaned.lastIndexOf(".")
  if (dot <= 0 || dot === cleaned.length - 1) return null
  const extension = cleaned.slice(dot + 1).toLowerCase()
  if (!ENERTECH_DOCUMENTO_EXTENSIONS.has(extension)) return null
  return cleaned
}

export function toEnertechDocumento(input: {
  filename: string
  bytes: Uint8Array
}): EnertechDocumentoAdjunto | null {
  const filename = enertechDocumentoFilename(input.filename)
  if (!filename || !isEnertechDocumentoSizeAllowed(input.bytes.byteLength)) return null
  return { filename, base64: bytesToBase64(input.bytes) }
}

export function collectEnertechDocumentos(
  files: { filename: string; bytes: Uint8Array }[]
): EnertechDocumentoAdjunto[] {
  const used = new Set<string>()
  const documentos: EnertechDocumentoAdjunto[] = []
  for (const file of files) {
    const built = toEnertechDocumento(file)
    if (!built) continue
    const filename = uniqueFilename(built.filename, used)
    documentos.push({ filename, base64: built.base64 })
  }
  return documentos
}

export function pendingFilesFromDocumentos(
  documentosPorTipo: Record<string, { pendingFile?: File }[] | undefined>
): File[] {
  const files: File[] = []
  for (const entries of Object.values(documentosPorTipo)) {
    for (const entry of entries ?? []) {
      if (entry.pendingFile) files.push(entry.pendingFile)
    }
  }
  return files
}

export async function filesToEnertechDocumentos(files: File[]): Promise<EnertechDocumentoAdjunto[]> {
  const prepared: { filename: string; bytes: Uint8Array }[] = []
  for (const file of files) {
    if (!isEnertechDocumentoSizeAllowed(file.size)) continue
    try {
      prepared.push({ filename: file.name, bytes: new Uint8Array(await file.arrayBuffer()) })
    } catch {
      // A file that cannot be read is left out. The contract upload continues.
    }
  }
  return collectEnertechDocumentos(prepared)
}

function uniqueFilename(name: string, used: Set<string>): string {
  const key = name.toLowerCase()
  if (!used.has(key)) {
    used.add(key)
    return name
  }
  const dot = name.lastIndexOf(".")
  const stem = name.slice(0, dot)
  const extension = name.slice(dot)
  let index = 2
  let next = `${stem}-${index}${extension}`
  while (used.has(next.toLowerCase())) {
    index += 1
    next = `${stem}-${index}${extension}`
  }
  used.add(next.toLowerCase())
  return next
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunk = 0x8000
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk))
  }
  return btoa(binary)
}
