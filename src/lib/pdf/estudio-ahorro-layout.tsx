import type { ReactNode } from "react"
import { COLORS, PAGE, PDF_FONT_FAMILY } from "./estudio-ahorro-theme"

const LOGO_HEIGHT = 90
/** Space between the mark and the centred title, as in the original template. */
const TITLE_INSET = 22
/** The app's global CSS gives every heading the display font and a negative tracking: undo both. */
export const HEADING_RESET = { fontFamily: "inherit", letterSpacing: "normal" } as const

export function PageShell({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        width: PAGE.width,
        minHeight: PAGE.minHeight,
        background: COLORS.white,
        color: COLORS.ink,
        fontFamily: PDF_FONT_FAMILY,
        padding: `${PAGE.paddingTop}px ${PAGE.paddingX}px ${PAGE.paddingBottom}px`,
      }}
    >
      {children}
    </div>
  )
}

/** EnerSave mark on the left, title centred in the remaining width. Shared by every page. */
export function BrandHeader({
  title,
  subtitle,
  enersaveLogoSrc,
}: {
  title: string
  subtitle?: string
  enersaveLogoSrc: string
}) {
  return (
    <div className="flex items-center" style={{ height: LOGO_HEIGHT }}>
      <img src={enersaveLogoSrc} alt="EnerSave" style={{ height: LOGO_HEIGHT, width: "auto", marginLeft: TITLE_INSET }} />
      <div className="flex-1 text-center" style={{ paddingLeft: TITLE_INSET }}>
        <h1 style={{ ...HEADING_RESET, fontSize: 26.7, lineHeight: "32px", fontWeight: 700, color: COLORS.navy }}>{title}</h1>
        {subtitle ? (
          <p style={{ marginTop: 4, fontSize: 11, lineHeight: "14px", color: COLORS.muted }}>{subtitle}</p>
        ) : null}
      </div>
    </div>
  )
}

export function SectionTitle({ children, color }: { children: ReactNode; color: string }) {
  return (
    <h2 style={{ ...HEADING_RESET, marginBottom: 6, fontSize: 17.3, lineHeight: "19px", fontWeight: 700, textAlign: "center", color }}>
      {children}
    </h2>
  )
}
