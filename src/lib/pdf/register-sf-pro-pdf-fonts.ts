import { Font } from "@react-pdf/renderer"
import sfDisplayBold from "@/assets/fonts/SanFranciscoDisplay-Bold.otf?url"
import sfDisplaySemibold from "@/assets/fonts/SanFranciscoDisplay-Semibold.otf?url"
import sfTextBold from "@/assets/fonts/SanFranciscoText-Bold.otf?url"
import sfTextMedium from "@/assets/fonts/SanFranciscoText-Medium.otf?url"
import sfTextRegular from "@/assets/fonts/SanFranciscoText-Regular.otf?url"
import sfTextSemibold from "@/assets/fonts/SanFranciscoText-Semibold.otf?url"

let registered = false

/** Registra SF Pro Text / Display para documentos @react-pdf (idempotente). */
export function registerSfProPdfFonts(): void {
  if (registered) return

  Font.register({
    family: "SF Pro Text",
    fonts: [
      { src: sfTextRegular, fontWeight: "normal" },
      { src: sfTextMedium, fontWeight: 500 },
      { src: sfTextSemibold, fontWeight: 600 },
      { src: sfTextBold, fontWeight: "bold" },
    ],
  })

  Font.register({
    family: "SF Pro Display",
    fonts: [
      { src: sfDisplaySemibold, fontWeight: 600 },
      { src: sfDisplayBold, fontWeight: "bold" },
    ],
  })

  registered = true
}

export const PDF_FONT_TEXT = "SF Pro Text"
export const PDF_FONT_DISPLAY = "SF Pro Display"
