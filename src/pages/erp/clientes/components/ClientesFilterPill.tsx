import type { ReactNode } from "react"
import { filterPillClass } from "@/lib/enersave-ui-theme"

type Props = {
  active: boolean
  onClick: () => void
  children: ReactNode
}

export function ClientesFilterPill({ active, onClick, children }: Props) {
  return (
    <button type="button" onClick={onClick} className={filterPillClass(active)}>
      {children}
    </button>
  )
}
