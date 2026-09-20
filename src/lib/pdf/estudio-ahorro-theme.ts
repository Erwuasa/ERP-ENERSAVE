import { BRAND } from "./brand-colors"

/**
 * Design tokens of the "Estudio de Ahorro Personalizado". They are measured from the original
 * template PDF (Arial, 794px-wide page, 57px side margins, 20px table rows), so the generated
 * study keeps the proportions of that design.
 */
export const PDF_FONT_FAMILY = 'Arial, "Helvetica Neue", Helvetica, "Liberation Sans", sans-serif'

export const COLORS = {
  navy: BRAND.azul,
  green: BRAND.verde,
  /** Dark navy of the "PERIODOS" header cell; also the ink used for body text. */
  ink: "#17233A",
  white: BRAND.blanco,
  muted: BRAND.gris,
  /** Thin grid lines of every table. */
  grid: "#B9C3D0",
  /** "TOTAL" columns: blue for the current tariff, green for the proposal. */
  tintBlue: "#DCE6F0",
  tintGreen: "#E1F2E3",
  /** "Total ...:" row background. */
  tintRow: "#F2F5FB",
  /** Colourless hairline and ink for the savings fields, which carry no blue/green. */
  neutralLine: "#D1D5DB",
  neutralInk: "#111111",
  totalFactura: "#BF1414",
  totalOferta: "#268033",
} as const

export const PAGE = {
  width: 794,
  minHeight: 1123,
  paddingTop: 33,
  paddingX: 57,
  paddingBottom: 40,
} as const

/** Vertical rhythm of the study, in px. */
export const GAP = {
  afterHeader: 15,
  /** Extra room under the client/logo row, before the first section. */
  afterInfo: 14,
  betweenSections: 14,
  betweenBlocks: 16,
} as const
