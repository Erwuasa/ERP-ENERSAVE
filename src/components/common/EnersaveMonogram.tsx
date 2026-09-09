import monogramSrc from "@/assets/logos/enersave-monogram-transparent.png"

/** Monograma E+S oficial (PNG transparente). */
export function EnersaveMonogram({
  className = "h-16 w-auto",
}: {
  className?: string
}) {
  return (
    <img
      src={monogramSrc}
      alt=""
      aria-hidden
      className={`object-contain ${className}`}
    />
  )
}
