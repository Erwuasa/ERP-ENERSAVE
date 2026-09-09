import { EnersaveMonogram } from "./EnersaveMonogram"

const ENERSAVE_BLUE = "#1E4785"
const ENERSAVE_GREEN = "#3FB950"

/** Logo de login: monograma E+S y wordmark ERP ENERSAVE. */
export function EnersaveMarkLogin({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-col items-center text-center ${className}`}>
      <EnersaveMonogram className="h-24 w-auto sm:h-28" />
      <p className="mt-3 text-xl sm:text-2xl font-black tracking-tight font-display leading-none">
        <span style={{ color: ENERSAVE_BLUE }}>ERP ENER</span>
        <span style={{ color: ENERSAVE_GREEN }}>SAVE</span>
      </p>
    </div>
  )
}

export { EnersaveMonogram } from "./EnersaveMonogram"
