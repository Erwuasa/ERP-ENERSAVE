import { splitCupsSegments, type CupsSegment } from "@/lib/sips/cups-segments"

const BASE = "inline-flex px-1.5 py-0.5 rounded text-[10px] font-mono font-bold tabular-nums"

function segmentClass(segment: CupsSegment): string {
  if (segment.kind === "control") {
    if (segment.valid === true) return `${BASE} bg-emerald-500/15 text-emerald-600 dark:text-emerald-400`
    if (segment.valid === false) return `${BASE} bg-red-500/15 text-red-600 dark:text-red-400`
  }
  return `${BASE} bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300`
}

/** The CUPS split into its real parts; the control letters turn green or red as you type. */
export function CupsPlate({ value }: { value: string }) {
  const segments = splitCupsSegments(value)

  if (segments.length === 0) {
    return <p className="text-[10px] font-mono text-brand-subtext">País · 16 dígitos · letras de control</p>
  }

  return (
    <ol className="flex flex-wrap items-center gap-1.5" aria-label="CUPS por partes">
      {segments.map((segment, index) => (
        <li key={`${segment.kind}-${index}`} className={segmentClass(segment)}>
          {segment.text}
        </li>
      ))}
    </ol>
  )
}
