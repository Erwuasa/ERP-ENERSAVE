import { useCallback, type ClipboardEvent } from "react"
import { stripWhitespaceOnPaste } from "../lib/paste-format"

export interface NoSpacePasteOptions {
  /** Applied after stripping whitespace (e.g. toUpperCase for CUPS / NIF). */
  transform?: (value: string) => string
}

export function createNoSpacePasteHandler(
  currentValue: string,
  onValueChange: (next: string) => void,
  options?: NoSpacePasteOptions
): (event: ClipboardEvent<HTMLInputElement>) => void {
  return (event) => {
    const pasted = event.clipboardData.getData("text")
    if (!pasted) return

    event.preventDefault()

    let cleaned = stripWhitespaceOnPaste(pasted)
    if (options?.transform) cleaned = options.transform(cleaned)

    const input = event.currentTarget
    const start = input.selectionStart ?? currentValue.length
    const end = input.selectionEnd ?? currentValue.length
    const next = currentValue.slice(0, start) + cleaned + currentValue.slice(end)
    onValueChange(next)

    const cursor = start + cleaned.length
    requestAnimationFrame(() => {
      input.setSelectionRange(cursor, cursor)
    })
  }
}

export function useNoSpacePasteInput(
  value: string,
  onValueChange: (next: string) => void,
  options?: NoSpacePasteOptions
) {
  const onPaste = useCallback(
    (event: ClipboardEvent<HTMLInputElement>) => {
      createNoSpacePasteHandler(value, onValueChange, options)(event)
    },
    [value, onValueChange, options?.transform]
  )

  return { onPaste }
}
