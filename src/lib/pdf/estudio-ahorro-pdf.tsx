import { pdf } from "@react-pdf/renderer"
import {
  EstudioAhorroConjuntoDocument,
  EstudioAhorroDocument,
} from "./estudio-ahorro-document"
import type {
  EstudioAhorroConjuntoInput,
  EstudioAhorroInput,
} from "./estudio-ahorro-types"

export type {
  EstudioAhorroConjuntoInput,
  EstudioAhorroInput,
} from "./estudio-ahorro-types"

export async function generateEstudioAhorroPdf(input: EstudioAhorroInput): Promise<Blob> {
  const instance = pdf(<EstudioAhorroDocument input={input} />)
  return instance.toBlob()
}

export async function generateEstudioAhorroConjuntoPdf(
  input: EstudioAhorroConjuntoInput
): Promise<Blob> {
  if (input.estudios.length === 0) throw new Error("No hay comparativas seleccionadas")
  const instance = pdf(<EstudioAhorroConjuntoDocument input={input} />)
  return instance.toBlob()
}

export function downloadEstudioAhorroPdf(blob: Blob, filenameOrCliente: string): void {
  const isFullFilename = filenameOrCliente.endsWith(".pdf")
  const safeName = isFullFilename
    ? filenameOrCliente
    : (() => {
        const safe = (filenameOrCliente || "cliente")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-zA-Z0-9-_]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .toLowerCase()
        return `estudio-ahorro-${safe || "cliente"}.pdf`
      })()
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement("a")
  anchor.href = url
  anchor.download = safeName
  anchor.click()
  URL.revokeObjectURL(url)
}
