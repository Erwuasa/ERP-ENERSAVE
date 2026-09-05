import { useMemo, useRef, useState } from "react"
import { Users } from "lucide-react"
import { FloatingPanelPortal } from "../ui/FloatingPanelPortal"
import { FilterTriggerButton } from "../ui/FilterTriggerButton"

interface UserFilterOption {
  id: string
  fullName: string
  role: string
}

const DEFAULT_VALUE = "all"

interface UserFilterDropdownProps {
  value: string
  onChange: (userId: string) => void
  users: UserFilterOption[]
  roleLabel: (role: string) => string
  onOpenChange?: (open: boolean) => void
}

export function UserFilterDropdown({
  value,
  onChange,
  users,
  roleLabel,
  onOpenChange,
}: UserFilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const anchorRef = useRef<HTMLDivElement>(null)

  function setOpenState(next: boolean) {
    setOpen(next)
    onOpenChange?.(next)
  }

  const sortedUsers = useMemo(
    () =>
      [...users].sort((a, b) =>
        a.fullName.localeCompare(b.fullName, "es", { sensitivity: "base" })
      ),
    [users]
  )

  const isActive = value !== DEFAULT_VALUE
  const selectedUser = sortedUsers.find((u) => u.id === value)
  const valueLabel = selectedUser
    ? `${selectedUser.fullName} (${roleLabel(selectedUser.role)})`
    : undefined

  function select(next: string) {
    onChange(next)
    setOpenState(false)
  }

  return (
    <div ref={anchorRef} className="relative w-[11.5rem] shrink-0">
      <FilterTriggerButton
        label="Usuario"
        valueLabel={valueLabel}
        isActive={isActive}
        open={open}
        onToggle={() => setOpenState(!open)}
        onClear={() => onChange(DEFAULT_VALUE)}
        icon={<Users className="w-4 h-4 text-brand-subtext shrink-0" />}
        minWidthClass="min-w-0"
        maxWidthClass="max-w-full"
        className="w-full"
        clearAriaLabel="Quitar filtro de usuario"
      />

      <FloatingPanelPortal
        open={open}
        onClose={() => setOpenState(false)}
        anchorRef={anchorRef}
        align="left"
        maxWidth={288}
        className="w-[min(100vw-1rem,288px)] max-h-[360px] overflow-y-auto bg-brand-panel border border-brand-border rounded-xl shadow-lg py-1"
      >
        <button
          type="button"
          onClick={() => select("all")}
          className={`w-full text-left px-3 py-2.5 text-xs font-semibold hover:bg-brand-surface/80 transition-colors cursor-pointer ${
            value === "all" ? "bg-cyan-500/10 text-cyan-700 dark:text-cyan-300" : "text-brand-text"
          }`}
        >
          Todos los usuarios
        </button>
        <div className="my-1 border-t border-brand-border" />
        {sortedUsers.map((user) => (
          <button
            key={user.id}
            type="button"
            onClick={() => select(user.id)}
            className={`w-full text-left px-3 py-2.5 hover:bg-brand-surface/80 transition-colors cursor-pointer ${
              value === user.id ? "bg-cyan-500/10" : ""
            }`}
          >
            <span className="block text-xs font-semibold text-brand-text truncate">{user.fullName}</span>
            <span className="block text-[10px] text-brand-subtext mt-0.5">{roleLabel(user.role)}</span>
          </button>
        ))}
      </FloatingPanelPortal>
    </div>
  )
}
