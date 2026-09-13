/**
 * Recorta el margen transparente/blanco alrededor del contenido real de una imagen
 * (logos de comercializadoras: algunos vienen con mucho aire alrededor del icono/
 * texto, lo que los hace ilegibles al mostrarlos a un tamaño fijo). Funciona tanto
 * con fondo transparente como con fondo blanco sólido.
 */

const BACKGROUND_ALPHA_THRESHOLD = 12
const BACKGROUND_WHITE_THRESHOLD = 248
/** Si el recorte apenas reduce el lienzo, no compensa el coste: se descarta. */
const MIN_TRIM_RATIO = 0.98

function isBackgroundPixel(r: number, g: number, b: number, a: number): boolean {
  if (a < BACKGROUND_ALPHA_THRESHOLD) return true
  return r > BACKGROUND_WHITE_THRESHOLD && g > BACKGROUND_WHITE_THRESHOLD && b > BACKGROUND_WHITE_THRESHOLD
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error(`No se pudo cargar la imagen: ${src}`))
    img.src = src
  })
}

/** Devuelve una data URL con el mismo contenido recortado a su caja real, o `src` si no procede. */
export async function trimImageWhitespace(src: string): Promise<string> {
  try {
    const img = await loadImage(src)
    const width = img.naturalWidth
    const height = img.naturalHeight
    if (!width || !height) return src

    const canvas = document.createElement("canvas")
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext("2d")
    if (!ctx) return src
    ctx.drawImage(img, 0, 0)

    const { data } = ctx.getImageData(0, 0, width, height)

    let minX = width
    let minY = height
    let maxX = -1
    let maxY = -1
    for (let y = 0; y < height; y += 1) {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4
        if (!isBackgroundPixel(data[i], data[i + 1], data[i + 2], data[i + 3])) {
          if (x < minX) minX = x
          if (x > maxX) maxX = x
          if (y < minY) minY = y
          if (y > maxY) maxY = y
        }
      }
    }

    if (maxX < minX || maxY < minY) return src // imagen vacía: no hay nada que recortar

    const padding = Math.round(Math.max(width, height) * 0.02)
    const cropX = Math.max(0, minX - padding)
    const cropY = Math.max(0, minY - padding)
    const cropW = Math.min(width, maxX + padding + 1) - cropX
    const cropH = Math.min(height, maxY + padding + 1) - cropY

    if (cropW >= width * MIN_TRIM_RATIO && cropH >= height * MIN_TRIM_RATIO) return src

    const cropCanvas = document.createElement("canvas")
    cropCanvas.width = cropW
    cropCanvas.height = cropH
    const cropCtx = cropCanvas.getContext("2d")
    if (!cropCtx) return src
    cropCtx.drawImage(canvas, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH)
    return cropCanvas.toDataURL("image/png")
  } catch {
    // Lienzo "manchado" por CORS, imagen no accesible, etc.: se usa la imagen original tal cual.
    return src
  }
}
