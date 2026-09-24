import { useEffect, useState, type InputHTMLAttributes } from "react"
import {
  formatNumberToDecimalComa,
  parseDecimalComaInput,
  sanitizeDecimalComaInput,
} from "@/lib/decimal-input"

interface DecimalComaInputProps
  extends Omit<InputHTMLAttributes<HTMLInputElement>, "value" | "onChange" | "type"> {
  value: number
  onChange: (value: number) => void
  /** Muestra campo vacío con placeholder "0" opaco cuando el valor es 0. */
  showZeroAsEmpty?: boolean
}

export function DecimalComaInput({
  value,
  onChange,
  showZeroAsEmpty = false,
  className = "",
  onFocus,
  onBlur,
  placeholder,
  ...props
}: DecimalComaInputProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(() =>
    showZeroAsEmpty && value === 0 ? "" : formatNumberToDecimalComa(value)
  )

  useEffect(() => {
    if (!focused) {
      setDraft(showZeroAsEmpty && value === 0 ? "" : formatNumberToDecimalComa(value))
    }
  }, [value, focused, showZeroAsEmpty])

  const resolvedPlaceholder = showZeroAsEmpty ? (placeholder ?? "0") : placeholder
  const displayValue = focused
    ? draft
    : showZeroAsEmpty && value === 0
      ? ""
      : formatNumberToDecimalComa(value)

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      placeholder={resolvedPlaceholder}
      value={displayValue}
      className={`${className} placeholder:text-brand-subtext/35 placeholder:font-normal`.trim()}
      onFocus={(event) => {
        setFocused(true)
        setDraft(
          showZeroAsEmpty && value === 0 ? "" : formatNumberToDecimalComa(value)
        )
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        const parsed = parseDecimalComaInput(draft)
        const nextValue = parsed ?? 0
        onChange(nextValue)
        setDraft(showZeroAsEmpty && nextValue === 0 ? "" : formatNumberToDecimalComa(nextValue))
        onBlur?.(event)
      }}
      onChange={(event) => {
        const nextDraft = sanitizeDecimalComaInput(event.target.value)
        setDraft(nextDraft)
        const parsed = parseDecimalComaInput(nextDraft)
        if (parsed !== null) onChange(parsed)
        else if (nextDraft === "") onChange(0)
      }}
    />
  )
}
