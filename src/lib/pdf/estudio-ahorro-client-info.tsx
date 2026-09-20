import { COLORS, GAP } from "./estudio-ahorro-theme"
import type { EstudioAhorroInput } from "./estudio-ahorro-types"

/** The provider logo sits in a fixed slot, like the "COMERCIALIZADORA" box of the template. */
const LOGO_SLOT = { width: 188, height: 30 }
/** Room for the two address lines of the template; a third line (client name) just grows the row. */
const INFO_ROW_MIN_HEIGHT = 50
/** Name the comparador falls back to when no client was typed; it carries no information. */
const GENERIC_CLIENT_NAME = "cliente"

function buildInfoLines(cliente: EstudioAhorroInput["cliente"]): string[] {
  const name = cliente.nombre.trim()
  const lines: string[] = []
  if (name && name.toLowerCase() !== GENERIC_CLIENT_NAME) lines.push(`Cliente: ${name}`)
  if (cliente.direccion?.trim()) lines.push(`Dirección: ${cliente.direccion.trim()}`)
  if (cliente.cups.trim()) lines.push(`CUPS: ${cliente.cups.trim()}`)
  return lines
}

/** Client / address / CUPS on the left, real comercializadora logo on the right. */
export function ClientInfo({
  cliente,
  comercializadora,
  comercializadoraLogoSrc,
}: {
  cliente: EstudioAhorroInput["cliente"]
  comercializadora: string
  comercializadoraLogoSrc: string | null
}) {
  return (
    <div
      className="flex justify-between"
      style={{
        marginTop: GAP.afterHeader,
        paddingBottom: GAP.afterInfo,
        // border-box: the padding counts inside the height, so add it to keep the content area at 50px
        minHeight: INFO_ROW_MIN_HEIGHT + GAP.afterInfo,
        gap: 24,
      }}
    >
      <div style={{ alignSelf: "flex-end", fontSize: 13.3, lineHeight: "17.3px", fontWeight: 700, color: COLORS.ink }}>
        {buildInfoLines(cliente).map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      {/* Real comercializadora logo (Supabase bucket or bundled local copy). Nothing is rendered
          when no image is available: a logo is never fabricated from initials or any other placeholder. */}
      {comercializadoraLogoSrc ? (
        <div className="flex shrink-0 items-center justify-center self-start" style={LOGO_SLOT}>
          <img
            src={comercializadoraLogoSrc}
            alt={comercializadora}
            style={{ height: "auto", maxHeight: LOGO_SLOT.height, width: "auto", maxWidth: LOGO_SLOT.width, objectFit: "contain" }}
          />
        </div>
      ) : null}
    </div>
  )
}
