import { Flame, Loader2, Search, X, Zap } from "lucide-react"
import { createNoSpacePasteHandler } from "@/hooks/useNoSpacePasteInput"
import { supplyTabClass } from "@/lib/enersave-ui-theme"
import { normalizeCups } from "@/lib/sips/cups"
import type { SipsProducto } from "@/lib/sips/types"
import { CupsPlate } from "./CupsPlate"

interface SipsSearchFormProps {
  cups: string
  producto: SipsProducto
  busy: boolean
  inputError: string | null
  onCupsChange: (value: string) => void
  onProductoChange: (value: SipsProducto) => void
  onSubmit: () => void
  onCancel: () => void
}

const LABEL = "block text-[10px] font-mono font-bold text-brand-subtext uppercase tracking-wider"

export function SipsSearchForm({
  cups,
  producto,
  busy,
  inputError,
  onCupsChange,
  onProductoChange,
  onSubmit,
  onCancel,
}: SipsSearchFormProps) {
  const handlePaste = createNoSpacePasteHandler(cups, onCupsChange, { transform: normalizeCups })

  return (
    <form
      className="space-y-4"
      onSubmit={(event) => {
        event.preventDefault()
        onSubmit()
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4">
        <div className="space-y-1.5">
          <label htmlFor="sips-cups" className={LABEL}>
            CUPS del suministro
          </label>
          <input
            id="sips-cups"
            value={cups}
            onChange={(event) => onCupsChange(event.target.value)}
            onPaste={handlePaste}
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            maxLength={26}
            placeholder="ES0031408000000000AF"
            aria-invalid={inputError ? true : undefined}
            aria-describedby={inputError ? "sips-cups-error" : undefined}
            className="w-full px-3 py-2 bg-brand-surface border border-brand-border rounded-xl focus:border-blue-500 focus:outline-none text-xs text-brand-text font-mono font-bold tracking-wider"
          />
        </div>

        <div className="space-y-1.5">
          <span className={LABEL}>Producto</span>
          <div role="radiogroup" aria-label="Producto" className="flex gap-2">
            <button
              type="button"
              role="radio"
              aria-checked={producto === "luz"}
              onClick={() => onProductoChange("luz")}
              className={supplyTabClass("luz", producto === "luz")}
            >
              <Zap className="w-3.5 h-3.5" />
              Luz
            </button>
            <button
              type="button"
              role="radio"
              aria-checked={producto === "gas"}
              onClick={() => onProductoChange("gas")}
              className={supplyTabClass("gas", producto === "gas")}
            >
              <Flame className="w-3.5 h-3.5" />
              Gas
            </button>
          </div>
        </div>
      </div>

      <CupsPlate value={cups} />

      {inputError ? (
        <p id="sips-cups-error" role="alert" className="text-[11px] font-semibold text-red-600 dark:text-red-400">
          {inputError}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={busy || cups.trim().length === 0}
          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-[10px] font-extrabold uppercase tracking-wider disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
          Consultar SIPS
        </button>

        {busy ? (
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-brand-border bg-brand-surface text-brand-subtext hover:text-brand-text text-[10px] font-extrabold uppercase tracking-wider cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Cancelar
          </button>
        ) : null}
      </div>
    </form>
  )
}
