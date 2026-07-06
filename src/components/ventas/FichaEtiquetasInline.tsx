import { useEffect, useState, type KeyboardEvent } from "react"
import { X } from "lucide-react"
import {
  getProspectoEtiquetas,
  mergeProspectoMetadata,
} from "../../lib/ventas/prospecto-display"
import type { Prospecto, UpdateProspectoPatch } from "../../lib/ventas/types"

interface FichaEtiquetasInlineProps {
  prospecto: Prospecto
  onSave: (
    patch: UpdateProspectoPatch
  ) => Promise<{ ok: true } | { ok: false; message: string }>
  /** En Centro de mando: chips más grandes en la misma fila de metadatos */
  size?: "sm" | "md"
  inline?: boolean
}

export function FichaEtiquetasInline({
  prospecto,
  onSave,
  size = "sm",
  inline = false,
}: FichaEtiquetasInlineProps) {
  const [tags, setTags] = useState<string[]>(() => getProspectoEtiquetas(prospecto))
  const [draft, setDraft] = useState("")
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setTags(getProspectoEtiquetas(prospecto))
  }, [prospecto])

  async function persist(next: string[]) {
    setSaving(true)
    const result = await onSave({
      metadata: mergeProspectoMetadata(prospecto, {
        etiquetas: next,
        referencia: null,
        canal_origen: null,
      }),
    })
    setSaving(false)
    if (result.ok) setTags(next)
  }

  function addTag(value: string) {
    const t = value.trim()
    if (!t || tags.includes(t)) return
    persist([...tags, t])
    setDraft("")
  }

  function removeTag(tag: string) {
    persist(tags.filter((t) => t !== tag))
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault()
      addTag(draft)
    }
  }

  const chipClass =
    size === "md"
      ? "inline-flex items-center gap-1 max-w-full pl-2.5 pr-1.5 py-1 rounded-md bg-brand-bg border border-brand-border text-[11px] text-brand-text"
      : "inline-flex items-center gap-0.5 max-w-full pl-2 pr-1 py-0.5 rounded-md bg-brand-bg border border-brand-border text-[10px] text-brand-text"
  const inputClass =
    size === "md"
      ? "min-w-[8rem] flex-1 h-7 px-2.5 bg-transparent border border-dashed border-brand-border/60 rounded-md text-[11px] text-brand-text placeholder:text-brand-subtext/70"
      : "min-w-[7rem] flex-1 h-6 px-2 bg-transparent border border-dashed border-brand-border/60 rounded-md text-[10px] text-brand-text placeholder:text-brand-subtext/70"
  const rowClass = inline
    ? "flex flex-wrap items-center gap-1.5"
    : "flex flex-wrap items-center gap-1"

  const content = (
    <div className={rowClass}>
        {tags.map((tag) => (
          <span key={tag} className={chipClass}>
            <span className="truncate">{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              disabled={saving}
              className="p-0.5 rounded text-brand-subtext hover:text-rose-500 shrink-0"
              aria-label={`Quitar ${tag}`}
            >
              <X className={size === "md" ? "w-3.5 h-3.5" : "w-3 h-3"} />
            </button>
          </span>
        ))}
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => draft.trim() && addTag(draft)}
          disabled={saving}
          placeholder={tags.length ? "Etiqueta…" : "Referencia, etiqueta…"}
          className={inputClass}
        />
      </div>
  )

  if (inline) return content

  return <div className="space-y-1">{content}</div>
}
