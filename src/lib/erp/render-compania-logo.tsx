import type { ReactNode } from "react"
import { fonts, radius } from "@/constants/styles"
import { COMPANIA_LOGO_SRC } from "./compania-logo-assets"
import {
  formatCompaniaLabel,
  getCompaniaInitials,
  resolveCompaniaLogoKey,
} from "./compania-logos"

export type CompaniaLogoSize = "sm" | "md"

const MARK_BOX: Record<CompaniaLogoSize, string> = {
  sm: "h-6 w-12",
  md: "h-10 w-[4.5rem]",
}

const INITIALS_BOX: Record<CompaniaLogoSize, string> = {
  sm: "h-6 w-6 text-[9px]",
  md: "h-10 w-10 text-xs",
}

export function CompaniaLogo({
  name,
  size = "sm",
}: {
  name: string
  size?: CompaniaLogoSize
}) {
  const key = resolveCompaniaLogoKey(name)
  const src = key ? COMPANIA_LOGO_SRC[key] : null
  const label = formatCompaniaLabel(name)

  if (src) {
    return (
      <span
        className={`inline-flex ${MARK_BOX[size]} items-center justify-center overflow-hidden`}
        title={label}
      >
        <img src={src} alt={label} className="h-full w-full object-contain" />
      </span>
    )
  }

  return (
    <span
      className={`inline-flex ${INITIALS_BOX[size]} ${radius.lg} items-center justify-center ${fonts.mono} font-bold bg-brand-surface text-brand-subtext border border-brand-border`}
      title={label}
      aria-hidden
    >
      {getCompaniaInitials(name)}
    </span>
  )
}

export function renderCompaniaLogo(brandName: string, size: CompaniaLogoSize = "sm"): ReactNode {
  return <CompaniaLogo name={brandName} size={size} />
}
