import html2canvas from "html2canvas"
import jsPDF from "jspdf"
import type { ReactElement } from "react"
import { flushSync } from "react-dom"
import { createRoot } from "react-dom/client"

const A4_WIDTH_MM = 210
const A4_HEIGHT_MM = 297
/** Resolución de captura: 2x da nitidez suficiente para impresión sin generar PDFs enormes. */
const RENDER_SCALE = 2
/** Ancho del lienzo offscreen en px (A4 a ~96dpi). Las plantillas deben diseñarse para este ancho. */
const DEFAULT_PAGE_WIDTH_PX = 794

interface RenderPagesToPdfOptions {
  /** Ancho en px del contenedor offscreen usado para renderizar cada página (por defecto, A4 a 96dpi). */
  pageWidthPx?: number
}

function waitForImages(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"))
  return Promise.all(
    imgs.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.addEventListener("load", () => resolve(), { once: true })
            img.addEventListener("error", () => resolve(), { once: true })
          })
    )
  ).then(() => undefined)
}

/** Trocea un canvas más alto que una página A4 en tantas páginas como haga falta. */
function addCanvasPaginated(pdfDoc: jsPDF, canvas: HTMLCanvasElement, isFirstPdfPage: boolean): void {
  const pxPerMm = canvas.width / A4_WIDTH_MM
  // Redondeamos hacia arriba: si nos quedásemos cortos por redondeo, un contenido de
  // exactamente una página generaría una segunda página casi en blanco con el resto de 1px.
  const pageHeightPx = Math.ceil(A4_HEIGHT_MM * pxPerMm)
  // Umbral (~2mm) por debajo del cual el resto de contenido no merece página propia:
  // se absorbe en la página anterior en vez de generar una hoja casi vacía.
  const minTrailingPx = pxPerMm * 2
  let renderedPx = 0
  let firstSlice = true

  while (renderedPx < canvas.height) {
    let sliceHeightPx = Math.min(pageHeightPx, canvas.height - renderedPx)
    const remainderAfterSlice = canvas.height - (renderedPx + sliceHeightPx)
    if (remainderAfterSlice > 0 && remainderAfterSlice < minTrailingPx) {
      sliceHeightPx = canvas.height - renderedPx
    }
    const sliceCanvas = document.createElement("canvas")
    sliceCanvas.width = canvas.width
    sliceCanvas.height = sliceHeightPx
    const ctx = sliceCanvas.getContext("2d")
    if (!ctx) throw new Error("No se pudo preparar el lienzo del PDF")
    ctx.drawImage(canvas, 0, renderedPx, canvas.width, sliceHeightPx, 0, 0, canvas.width, sliceHeightPx)

    const sliceData = sliceCanvas.toDataURL("image/jpeg", 0.95)
    const sliceHeightMm = (sliceHeightPx * A4_WIDTH_MM) / canvas.width

    if (!(isFirstPdfPage && firstSlice)) pdfDoc.addPage()
    pdfDoc.addImage(sliceData, "JPEG", 0, 0, A4_WIDTH_MM, sliceHeightMm)

    renderedPx += sliceHeightPx
    firstSlice = false
  }
}

/**
 * Renderiza una lista de componentes React (uno por página A4) a un único PDF,
 * rasterizando cada uno con html2canvas y componiendo el documento con jsPDF.
 * Genérico: cualquier plantilla HTML/Tailwind del ERP puede exportarse así.
 */
export async function renderPagesToPdf(
  pages: ReactElement[],
  options: RenderPagesToPdfOptions = {}
): Promise<Blob> {
  if (pages.length === 0) throw new Error("No hay páginas que exportar a PDF")
  const pageWidthPx = options.pageWidthPx ?? DEFAULT_PAGE_WIDTH_PX

  const container = document.createElement("div")
  container.style.position = "fixed"
  container.style.top = "0"
  container.style.left = "-99999px"
  container.style.pointerEvents = "none"
  container.style.zIndex = "-1"
  document.body.appendChild(container)

  const pdfDoc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" })

  try {
    for (let i = 0; i < pages.length; i += 1) {
      const pageHost = document.createElement("div")
      pageHost.style.width = `${pageWidthPx}px`
      pageHost.style.background = "#ffffff"
      container.appendChild(pageHost)

      const root = createRoot(pageHost)
      // flushSync fuerza el commit síncrono: sin esto React (18/19) puede diferir el
      // montaje inicial más allá de esta llamada y html2canvas captura un contenedor
      // todavía vacío (0 de alto). No depender de requestAnimationFrame ni setTimeout
      // para esto: el commit es lo único que hace falta esperar, no un paint real.
      flushSync(() => {
        root.render(pages[i])
      })

      // eslint-disable-next-line no-await-in-loop
      await waitForImages(pageHost)
      if (typeof document.fonts?.ready !== "undefined") {
        // eslint-disable-next-line no-await-in-loop
        await document.fonts.ready
      }

      // eslint-disable-next-line no-await-in-loop
      const canvas = await html2canvas(pageHost, {
        scale: RENDER_SCALE,
        useCORS: true,
        backgroundColor: "#ffffff",
      })

      // addCanvasPaginated ya decide cuándo llamar a addPage (la primera página del PDF
      // completo la crea jsPDF por defecto; el resto, incluidas las páginas por troceo, las añade él).
      addCanvasPaginated(pdfDoc, canvas, i === 0)

      root.unmount()
      container.removeChild(pageHost)
    }
  } finally {
    document.body.removeChild(container)
  }

  return pdfDoc.output("blob")
}
