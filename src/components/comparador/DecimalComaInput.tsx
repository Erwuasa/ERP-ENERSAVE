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
}

export function DecimalComaInput({
  value,
  onChange,
  onFocus,
  onBlur,
  ...props
}: DecimalComaInputProps) {
  const [focused, setFocused] = useState(false)
  const [draft, setDraft] = useState(() => formatNumberToDecimalComa(value))

  useEffect(() => {
    if (!focused) setDraft(formatNumberToDecimalComa(value))
  }, [value, focused])

  return (
    <input
      {...props}
      type="text"
      inputMode="decimal"
      value={focused ? draft : formatNumberToDecimalComa(value)}
      onFocus={(event) => {
        setFocused(true)
        setDraft(formatNumberToDecimalComa(value))
        onFocus?.(event)
      }}
      onBlur={(event) => {
        setFocused(false)
        const parsed = parseDecimalComaInput(draft)
        const nextValue = parsed ?? 0
        onChange(nextValue)
        setDraft(formatNumberToDecimalComa(nextValue))
        onBlur?.(event)
      }}
      onChange={(event) => {
        const nextDraft = sanitizeDecimalComaInput(event.target.value)
        setDraft(nextDraft)
        const parsed = parseDecimalComaInput(nextDraft)
        if (parsed !== null) onChange(parsed)
      }}
    />
  )
}
