export function stripWhitespaceOnPaste(value: string): string {
  return value.replace(/\s+/g, "")
}
