import { useRef, type KeyboardEvent } from "react"

interface TotpCodeInputProps {
  value: string
  onChange: (value: string) => void
  disabled?: boolean
}

const DIGIT_COUNT = 6

export function TotpCodeInput({ value, onChange, disabled = false }: TotpCodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([])
  const digits = Array.from({ length: DIGIT_COUNT }, (_, index) => value[index] ?? "")

  function focusIndex(index: number) {
    inputsRef.current[index]?.focus()
    inputsRef.current[index]?.select()
  }

  function applyDigits(nextDigits: string[]) {
    onChange(nextDigits.join("").slice(0, DIGIT_COUNT))
  }

  function handleChange(index: number, raw: string) {
    const digit = raw.replace(/\D/g, "").slice(-1)
    const next = [...digits]
    next[index] = digit
    applyDigits(next)
    if (digit && index < DIGIT_COUNT - 1) focusIndex(index + 1)
  }

  function handleKeyDown(index: number, event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !digits[index] && index > 0) {
      event.preventDefault()
      focusIndex(index - 1)
      return
    }
    if (event.key === "ArrowLeft" && index > 0) {
      event.preventDefault()
      focusIndex(index - 1)
    }
    if (event.key === "ArrowRight" && index < DIGIT_COUNT - 1) {
      event.preventDefault()
      focusIndex(index + 1)
    }
  }

  function handlePaste(event: React.ClipboardEvent) {
    event.preventDefault()
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGIT_COUNT)
    if (!pasted) return
    applyDigits(Array.from({ length: DIGIT_COUNT }, (_, index) => pasted[index] ?? ""))
    focusIndex(Math.min(pasted.length, DIGIT_COUNT - 1))
  }

  return (
    <div className="flex items-center justify-center gap-2" onPaste={handlePaste}>
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            inputsRef.current[index] = element
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={1}
          disabled={disabled}
          value={digit}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          className="h-12 w-10 sm:w-11 rounded-xl border border-slate-200 dark:border-slate-800 bg-brand-surface text-center text-lg font-mono font-bold text-brand-text focus:border-blue-500 dark:focus:border-cyan-400 focus:ring-2 focus:ring-blue-500/10 focus:outline-none disabled:opacity-50"
          aria-label={`Dígito ${index + 1} del código`}
        />
      ))}
    </div>
  )
}
