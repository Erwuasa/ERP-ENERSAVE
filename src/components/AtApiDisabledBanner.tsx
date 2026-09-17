import { Unplug } from "lucide-react"
import { radius } from "@/constants/styles"
import { AT_API_DISABLED_TITLE, resolveAtApiDisabledMessage } from "@/lib/at-api-disabled"

export function AtApiDisabledBanner({ tab }: { tab?: string }) {
  return (
    <div
      className={`${radius.xl} border border-amber-500/30 bg-amber-500/10 px-3 py-2.5 flex items-start gap-2.5`}
      role="status"
      aria-live="polite"
    >
      <Unplug className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" aria-hidden />
      <div className="min-w-0">
        <p className="text-[11px] font-bold text-amber-800 dark:text-amber-300 uppercase tracking-wide">
          {AT_API_DISABLED_TITLE}
        </p>
        <p className="text-[11px] leading-relaxed text-amber-900/80 dark:text-amber-200/80">
          {resolveAtApiDisabledMessage(tab)}
        </p>
      </div>
    </div>
  )
}
