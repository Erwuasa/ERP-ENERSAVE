/** Colores de marca aproximados para placeholders circulares (sin logo PNG/SVG real). */
const COMPANIA_BRAND_COLORS: Record<string, string> = {
  endesa: "#009FDF",
  iberdrola: "#00A651",
  naturgy: "#E35205",
  repsol: "#FF6200",
  axpo: "#E2001A",
  ignis: "#6B2C91",
  niba: "#1B4A77",
  "global connect": "#00A19A",
  "gana energia": "#FF6B00",
  "gana energía": "#FF6B00",
  unielectrica: "#003087",
  factorenergia: "#009639",
  octopus: "#F050FF",
  totalenergies: "#FF0000",
  iberdesa: "#0066B3",
  enersave: "#1B4A77",
  enerluz: "#1B4A77",
}

/** Rutas públicas cuando existan logos reales en /public/logos/comercializadoras/ */
const COMPANIA_LOGO_FILES: Record<string, string> = {
  endesa: "/logos/comercializadoras/endesa.png",
  iberdrola: "/logos/comercializadoras/iberdrola.png",
  naturgy: "/logos/comercializadoras/naturgy.png",
  repsol: "/logos/comercializadoras/repsol.png",
  axpo: "/logos/comercializadoras/axpo.png",
  ignis: "/logos/comercializadoras/ignis.png",
  niba: "/logos/comercializadoras/niba.png",
  "global connect": "/logos/comercializadoras/global-connect.png",
  "gana energia": "/logos/comercializadoras/gana-energia.png",
  unielectrica: "/logos/comercializadoras/unielectrica.png",
}

export const ENERSAVE_LOGO_PATH = "/logos/enersave-logo.png"

function normalizeCompania(name: string): string {
  return (name || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
}

function matchCompaniaKey(normalized: string): string | undefined {
  if (COMPANIA_BRAND_COLORS[normalized]) return normalized
  return Object.keys(COMPANIA_BRAND_COLORS).find((key) => normalized.includes(key))
}

export function getComercializadoraBrandColor(compania: string): string {
  const key = matchCompaniaKey(normalizeCompania(compania))
  return key ? COMPANIA_BRAND_COLORS[key] : "#1B4A77"
}

/** Devuelve URL pública del logo si está registrado (requiere archivo en /public). */
export function getComercializadoraLogoUrl(compania: string): string | undefined {
  const key = matchCompaniaKey(normalizeCompania(compania))
  if (!key) return undefined
  return COMPANIA_LOGO_FILES[key]
}

function svgToDataUri(svg: string): string {
  const encoded =
    typeof btoa !== "undefined"
      ? btoa(unescape(encodeURIComponent(svg)))
      : Buffer.from(svg).toString("base64")
  return `data:image/svg+xml;base64,${encoded}`
}

/** Placeholder circular con inicial mientras no haya logos reales en /public. */
export function getComercializadoraLogoPlaceholder(compania: string): string {
  const label = (compania || "?").trim()
  const initial = label.charAt(0).toUpperCase()
  const color = getComercializadoraBrandColor(label)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28">
    <circle cx="14" cy="14" r="14" fill="${color}"/>
    <text x="14" y="18.5" text-anchor="middle" fill="#ffffff" font-size="13" font-family="Helvetica">${initial}</text>
  </svg>`
  return svgToDataUri(svg)
}

export function resolveComercializadoraLogoSrc(
  comercializadora: string,
  logoUrl?: string
): string {
  if (logoUrl?.startsWith("data:")) return logoUrl
  // Placeholder SVG embebido: evita rutas /public inexistentes que rompen @react-pdf/renderer
  return getComercializadoraLogoPlaceholder(comercializadora)
}

export function getEnersaveLogoPlaceholder(): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="120" height="32" viewBox="0 0 120 32">
    <text x="0" y="24" fill="#1B4A77" font-size="22" font-family="Helvetica">ENerSave</text>
  </svg>`
  return svgToDataUri(svg)
}
