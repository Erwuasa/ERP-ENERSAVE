/** Monograma E+S (sin fondo) — uso en login y superficies claras. */
export function EnersaveMonogram({
  className = "h-16 w-16",
}: {
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12 8H40C44.4183 8 48 11.5817 48 16V22H20V28H44V34H20V40H48V48C48 52.4183 44.4183 56 40 56H12V8Z"
        fill="#2563EB"
      />
      <path
        d="M36 14C44.5 18 50 26 50 34C50 42 44.5 50 36 54C42 48 46 41 46 34C46 27 42 20 36 14Z"
        fill="#22C55E"
      />
      <path
        d="M28 18C34 22 38 28 38 34C38 40 34 46 28 50C32 44 34 39 34 34C34 29 32 24 28 18Z"
        fill="#16A34A"
      />
    </svg>
  )
}
