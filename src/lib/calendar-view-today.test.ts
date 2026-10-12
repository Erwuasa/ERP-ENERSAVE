import { describe, expect, it } from "vitest"
import { calendarViewContainsToday } from "./calendar-view-today"

const today = new Date(2026, 9, 12, 15, 0, 0)

describe("calendarViewContainsToday", () => {
  it("marks the current week and hides later weeks", () => {
    expect(calendarViewContainsToday(new Date(2026, 9, 12), "week", today)).toBe(true)
    expect(calendarViewContainsToday(new Date(2026, 9, 14), "week", today)).toBe(true)
    expect(calendarViewContainsToday(new Date(2026, 10, 16), "week", today)).toBe(false)
  })

  it("marks only the current day and the current month", () => {
    expect(calendarViewContainsToday(new Date(2026, 9, 12), "day", today)).toBe(true)
    expect(calendarViewContainsToday(new Date(2026, 9, 13), "day", today)).toBe(false)
    expect(calendarViewContainsToday(new Date(2026, 9, 20), "month", today)).toBe(true)
    expect(calendarViewContainsToday(new Date(2026, 10, 1), "month", today)).toBe(false)
    expect(calendarViewContainsToday(new Date(2026, 9, 1), "agenda", today)).toBe(true)
  })
})
