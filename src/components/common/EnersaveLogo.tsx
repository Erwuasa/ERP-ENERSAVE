import logoSrc from "@/assets/logos/enersave-logo.png"

const sizeMap = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
} as const

export function EnersaveLogo({
  className = "h-12 w-12",
  withText = false,
}: {
  className?: string
  withText?: boolean
}) {
  return (
    <div className="flex flex-col items-center justify-center">
      <img
        src={logoSrc}
        alt="EnerSave"
        className={`rounded-xl object-cover ${className}`}
      />
      {withText && (
        <span className="mt-3 text-2xl font-extrabold tracking-widest text-[#1e3a8a] dark:text-[#60a5fa] font-display">
          ENERSAVE
        </span>
      )}
    </div>
  )
}

export function EnersaveBrandMark({
  size = "md",
  className = "",
}: {
  size?: keyof typeof sizeMap
  className?: string
}) {
  return (
    <img
      src={logoSrc}
      alt="EnerSave"
      className={`shrink-0 rounded-xl object-cover ${sizeMap[size]} ${className}`}
    />
  )
}
