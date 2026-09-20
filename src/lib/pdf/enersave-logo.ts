import { trimImageWhitespace } from "./image-trim"

export const ENERSAVE_LOGO_PATH = "/logos/enersave-logo.png"

/** Almost flush trim so the mark lines up with the left edge of the page content. */
const ENERSAVE_LOGO_PADDING_RATIO = 0.004

let trimmedLogo: Promise<string> | null = null

/**
 * The bundled EnerSave logo is a wide canvas with the mark floating in the middle, so at any
 * sensible header height the mark itself rendered tiny. The empty margins are trimmed once and
 * the result is reused by every PDF page (falls back to the original path if trimming fails).
 */
export function resolveEnersaveLogoSrc(): Promise<string> {
  trimmedLogo ??= trimImageWhitespace(ENERSAVE_LOGO_PATH, ENERSAVE_LOGO_PADDING_RATIO)
  return trimmedLogo
}
