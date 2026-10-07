import type { KeyboardEvent as ReactKeyboardEvent } from "react"

const ENTER_NAV_FIELD_SELECTOR = [
  'input:not([type="hidden"]):not([type="file"]):not([type="checkbox"]):not([type="radio"]):not([disabled]):not([readonly])',
  "textarea:not([disabled]):not([readonly])",
  "select:not([disabled])",
].join(", ")

function isEnterNavigationField(target: EventTarget | null): target is HTMLElement {
  if (!(target instanceof HTMLElement)) return false
  if (target.dataset.enterNav === "skip") return false
  if (target.closest('[data-enter-nav="skip"]')) return false
  return target.matches(ENTER_NAV_FIELD_SELECTOR)
}

function isFieldVisible(el: HTMLElement): boolean {
  if (!el.isConnected) return false
  if (
    (el instanceof HTMLInputElement ||
      el instanceof HTMLButtonElement ||
      el instanceof HTMLSelectElement ||
      el instanceof HTMLTextAreaElement) &&
    el.disabled
  ) {
    return false
  }
  if (el.getAttribute("aria-hidden") === "true") return false
  return el.getClientRects().length > 0
}

export function listFormEnterNavigationFields(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(ENTER_NAV_FIELD_SELECTOR)).filter(
    isFieldVisible
  )
}

/** Enter (sin modificadores) mueve el foco al siguiente campo dentro de `[data-enter-navigation]`. */
export function focusNextFormField(event: KeyboardEvent | ReactKeyboardEvent): boolean {
  if (event.key !== "Enter") return false
  if (event.shiftKey || event.altKey || event.ctrlKey || event.metaKey) return false
  if (!isEnterNavigationField(event.target)) return false

  const target = event.target as HTMLElement
  if (target.tagName === "TEXTAREA") return false

  const root = target.closest("[data-enter-navigation]")
  if (!root) return false

  const fields = listFormEnterNavigationFields(root)
  const index = fields.indexOf(target)
  if (index === -1) return false

  event.preventDefault()

  const next = fields[index + 1]
  if (!next) return true

  next.focus()
  if (next instanceof HTMLInputElement && next.type === "text") {
    next.select()
  }
  return true
}

export function onFormEnterNavigationKeyDown(event: ReactKeyboardEvent) {
  focusNextFormField(event)
}
