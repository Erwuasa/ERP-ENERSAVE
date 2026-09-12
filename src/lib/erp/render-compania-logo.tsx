import { useEffect, useState } from "react"
import type { CSSProperties, ReactNode } from "react"
import { fonts, radius } from "@/constants/styles"
import { COMPANIA_LOGO_SRC } from "./compania-logo-assets"
import {
  cropToClipPath,
  resolveCompaniaLogoProfile,
  type CompaniaLogoSize,
} from "./compania-logo-profiles"
import {
  formatCompaniaLabel,
  getCompaniaInitials,
  resolveCompaniaLogoKey,
  type CompaniaLogoKey,
} from "./compania-logos"

export type { CompaniaLogoSize }

const MARK_BOX: Record<CompaniaLogoSize, string> = {
  sm: "h-6 w-12",
  md: "h-10 w-[4.5rem]",
  lg: "h-14 w-28",
  xl: "h-[4.5rem] w-[7.5rem] min-w-[5.5rem]",
}

const INITIALS_BOX: Record<CompaniaLogoSize, string> = {
  sm: "h-6 w-6 text-[9px]",
  md: "h-10 w-10 text-xs",
  lg: "h-14 w-14 text-sm",
  xl: "h-[4.5rem] w-[4.5rem] text-xl",
}

function isUnreliableExternalLogoUrl(url: string): boolean {
  const normalized = url.trim().toLowerCase()
  return (
    normalized.includes("clearbit.com") ||
    normalized.includes("logo.dev") ||
    normalized.includes("google.com/s2/favicons")
  )
}

function resolveCompaniaLogoSrc(
  key: CompaniaLogoKey | null,
  logoUrl?: string | null
): string | null {
  const bundled = key ? COMPANIA_LOGO_SRC[key] : null
  if (bundled) return bundled

  const external = logoUrl?.trim()
  if (!external || isUnreliableExternalLogoUrl(external)) return null
  return external
}

function CompaniaLogoInitials({ name, size }: { name: string; size: CompaniaLogoSize }) {
  return (
    <span
      className={`inline-flex ${INITIALS_BOX[size]} ${radius.lg} items-center justify-center ${fonts.mono} font-bold bg-brand-surface text-brand-subtext border border-brand-border shrink-0`}
      title={formatCompaniaLabel(name)}
      aria-hidden
    >
      {getCompaniaInitials(name)}
    </span>
  )
}

function buildLogoImageStyle(
  profile: ReturnType<typeof resolveCompaniaLogoProfile>
): CSSProperties {
  const scale = profile.boost
  return {
    width: `${profile.fillWidth * 100}%`,
    height: `${profile.fillHeight * 100}%`,
    objectFit: "contain",
    objectPosition: profile.objectPosition,
    clipPath: cropToClipPath(profile.crop),
    transform: scale !== 1 ? `scale(${scale})` : undefined,
    transformOrigin: profile.objectPosition.includes("top")
      ? "center top"
      : profile.objectPosition.includes("left")
        ? "left center"
        : "center center",
  }
}

export function CompaniaLogo({
  name,
  size = "sm",
  logoUrl,
}: {
  name: string
  size?: CompaniaLogoSize
  logoUrl?: string | null
}) {
  const key = resolveCompaniaLogoKey(name)
  const primarySrc = resolveCompaniaLogoSrc(key, logoUrl)
  const fallbackSrc = key ? COMPANIA_LOGO_SRC[key] : null
  const [src, setSrc] = useState(primarySrc)
  const label = formatCompaniaLabel(name)
  const profile = resolveCompaniaLogoProfile(key, size)

  useEffect(() => {
    setSrc(primarySrc)
  }, [primarySrc, name])

  if (!src) {
    return <CompaniaLogoInitials name={name} size={size} />
  }

  return (
    <span
      className={`relative inline-flex ${MARK_BOX[size]} items-center justify-center shrink-0`}
      title={label}
    >
      <img
        src={src}
        alt=""
        className="block pointer-events-none select-none"
        style={buildLogoImageStyle(profile)}
        onError={() => {
          if (fallbackSrc && src !== fallbackSrc) {
            setSrc(fallbackSrc)
            return
          }
          setSrc(null)
        }}
      />
    </span>
  )
}

export function renderCompaniaLogo(
  brandName: string,
  logoUrl?: string | null,
  size: CompaniaLogoSize = "sm"
): ReactNode {
  return <CompaniaLogo name={brandName} size={size} logoUrl={logoUrl} />
}
