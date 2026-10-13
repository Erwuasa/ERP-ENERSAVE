import { useMemo, useState } from "react"
import { X } from "lucide-react"
import { calendarioMentionHandle } from "@/lib/calendario-visibility"

interface MentionUser {
  id: string
  fullName: string
}

interface CalendarioMentionPickerProps {
  users: MentionUser[]
  selectedIds: string[]
  disabled?: boolean
  onChange: (ids: string[]) => void
}

export function CalendarioMentionPicker({
  users,
  selectedIds,
  disabled = false,
  onChange,
}: CalendarioMentionPickerProps) {
  const [query, setQuery] = useState("")
  const selected = useMemo(
    () => users.filter((user) => selectedIds.includes(user.id)),
    [users, selectedIds]
  )
  const q = query.trim().toLowerCase()
  const visible = users.filter((user) => {
    if (!q) return true
    const handle = calendarioMentionHandle(user.fullName).toLowerCase()
    return user.fullName.toLowerCase().includes(q) || handle.includes(q)
  })

  function toggle(id: string) {
    if (disabled) return
    if (selectedIds.includes(id)) {
      onChange(selectedIds.filter((item) => item !== id))
      return
    }
    onChange([...selectedIds, id])
  }

  return (
    <div className="space-y-2">
      <span className="block text-[10px] font-mono font-bold uppercase text-brand-subtext">
        Mencionar
      </span>
      {selected.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((user) => (
            <button
              key={user.id}
              type="button"
              disabled={disabled}
              onClick={() => toggle(user.id)}
              className="inline-flex items-center gap-1 rounded-lg bg-cyan-500/15 px-2 py-1 text-[11px] font-semibold text-cyan-800 dark:text-cyan-200 cursor-pointer disabled:cursor-default"
            >
              @{calendarioMentionHandle(user.fullName)}
              {disabled ? null : <X className="w-3 h-3" />}
            </button>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-brand-subtext">
          Sin menciones. El evento solo sale en tu calendario.
        </p>
      )}
      <input
        type="search"
        value={query}
        disabled={disabled}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Buscar usuario"
        className="w-full px-3 py-2 rounded-lg border border-brand-border bg-brand-surface text-sm disabled:opacity-60"
      />
      <div className="max-h-36 overflow-y-auto rounded-lg border border-brand-border">
        {visible.length === 0 ? (
          <p className="px-3 py-2 text-[11px] text-brand-subtext">Ningún usuario coincide.</p>
        ) : (
          visible.map((user) => {
            const active = selectedIds.includes(user.id)
            return (
              <button
                key={user.id}
                type="button"
                disabled={disabled}
                aria-pressed={active}
                onClick={() => toggle(user.id)}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-xs cursor-pointer disabled:cursor-default ${
                  active
                    ? "bg-cyan-500/10 text-brand-text"
                    : "text-brand-text hover:bg-brand-surface"
                }`}
              >
                <span className="truncate">{user.fullName}</span>
                <span className="shrink-0 font-mono text-[10px] text-brand-subtext">
                  @{calendarioMentionHandle(user.fullName)}
                </span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
