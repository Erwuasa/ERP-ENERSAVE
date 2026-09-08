import { EnersaveMonogram } from "./EnersaveMonogram"

/** Logo de login: monograma E+S sin fondo y texto de marca. */
export function EnersaveMarkLogin({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <EnersaveMonogram className="h-[72px] w-[72px] sm:h-20 sm:w-20" />
      <span className="mt-3 text-xl sm:text-2xl font-black tracking-tight text-brand-text font-display">
        ERP ENERSAVE
      </span>
    </div>
  )
}

export { EnersaveMonogram } from "./EnersaveMonogram"
