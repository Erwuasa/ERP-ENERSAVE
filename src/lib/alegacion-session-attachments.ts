import type { AlegacionAdjunto } from "../types/alegacion"

/** Adjuntos en memoria de la pestaña — se pierden al recargar la página */
const sessionStore = new Map<string, AlegacionAdjunto[]>()

export function getAlegacionSessionAttachments(messageId: string): AlegacionAdjunto[] {
  return sessionStore.get(messageId) ?? []
}

export function setAlegacionSessionAttachments(
  messageId: string,
  attachments: AlegacionAdjunto[]
): void {
  if (attachments.length === 0) {
    sessionStore.delete(messageId)
    return
  }
  sessionStore.set(messageId, attachments)
}

export function formatAlegacionAttachmentSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export async function filesToAlegacionAdjuntos(files: File[]): Promise<AlegacionAdjunto[]> {
  const results: AlegacionAdjunto[] = []

  for (const file of files) {
    const dataUrl = await readFileAsDataUrl(file)
    results.push({
      name: file.name,
      dataUrl,
      size: formatAlegacionAttachmentSize(file.size),
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

export function enrichMensajesWithSessionAttachments<
  T extends { id: string; archivosAdjuntos?: AlegacionAdjunto[] },
>(mensajes: T[]): (T & { archivosAdjuntos: AlegacionAdjunto[] })[] {
  return mensajes.map((mensaje) => ({
    ...mensaje,
    archivosAdjuntos: getAlegacionSessionAttachments(mensaje.id),
  }))
}
