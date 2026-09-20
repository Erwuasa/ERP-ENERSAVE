import { resolveComercializadoraLogoSrc } from "./comercializadora-logo-resolver"
import { resolveEnersaveLogoSrc } from "./enersave-logo"
import { calcTotalesConjunto } from "./estudio-ahorro-calc"
import { EstudioAhorroConjuntoResumenTemplate, EstudioAhorroDetalleTemplate } from "./estudio-ahorro-template"
import { renderPagesToPdf } from "./html-to-pdf"
import type { EstudioAhorroConjuntoInput, EstudioAhorroInput } from "./estudio-ahorro-types"

export type { EstudioAhorroConjuntoInput, EstudioAhorroInput } from "./estudio-ahorro-types"

export async function generateEstudioAhorroPdf(input: EstudioAhorroInput): Promise<Blob> {
  const [logoSrc, enersaveLogoSrc] = await Promise.all([
    resolveComercializadoraLogoSrc(input.tarifaPropuesta.comercializadora),
    resolveEnersaveLogoSrc(),
  ])
  return renderPagesToPdf([
    <EstudioAhorroDetalleTemplate input={input} comercializadoraLogoSrc={logoSrc} enersaveLogoSrc={enersaveLogoSrc} />,
  ])
}

export async function generateEstudioAhorroConjuntoPdf(
  input: EstudioAhorroConjuntoInput
): Promise<Blob> {
  if (input.estudios.length === 0) throw new Error("No hay comparativas seleccionadas")

  const totales = calcTotalesConjunto(input.estudios)
  const [enersaveLogoSrc, ...logoSrcs] = await Promise.all([
    resolveEnersaveLogoSrc(),
    ...input.estudios.map((estudio) => resolveComercializadoraLogoSrc(estudio.tarifaPropuesta.comercializadora)),
  ])
  const pages = [
    ...input.estudios.map((estudio, idx) => (
      <EstudioAhorroDetalleTemplate
        key={`${estudio.cliente.cups}-${idx}`}
        input={estudio}
        comercializadoraLogoSrc={logoSrcs[idx]}
        enersaveLogoSrc={enersaveLogoSrc}
        indice={{ actual: idx + 1, total: input.estudios.length }}
      />
    )),
    <EstudioAhorroConjuntoResumenTemplate key="resumen" input={input} totales={totales} enersaveLogoSrc={enersaveLogoSrc} />,
  ]

  return renderPagesToPdf(pages)
}

export function downloadEstudioAhorroPdf(blob: Blob, filenameOrCliente: string): void {
  const isFullFilename = filenameOrCliente.endsWith(".pdf")
  const safeName = isFullFilename
    ? filenameOrCliente
    : (() => {
        const safe = (filenameOrCliente || "cliente")
          .normalize("NFD")
          .replace(/[̀-ͯ]/g, "")
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
