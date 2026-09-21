import { describe, expect, it } from "vitest"
import { calendarRangeToStoredDates, toCalendarDate } from "./calendario-dnd"

describe("calendarRangeToStoredDates", () => {
  it("conserva inicio y fin en eventos con hora", () => {
    const start = new Date("2026-09-18T09:00:00.000Z")
    const end = new Date("2026-09-18T10:30:00.000Z")
    expect(calendarRangeToStoredDates(start, end, false)).toEqual({
      fechaInicio: start.toISOString(),
      fechaFin: end.toISOString(),
      todoElDia: false,
    })
  })

  it("convierte el fin exclusivo de un evento de todo el día", () => {
    const start = new Date(2026, 8, 20, 0, 0, 0)
    const exclusiveEnd = new Date(2026, 8, 21, 0, 0, 0)
    const stored = calendarRangeToStoredDates(start, exclusiveEnd, true)

    expect(stored.todoElDia).toBe(true)
    expect(toCalendarDate(stored.fechaInicio).getDate()).toBe(20)
    expect(toCalendarDate(stored.fechaFin).getDate()).toBe(20)
    expect(toCalendarDate(stored.fechaFin).getHours()).toBe(23)
  })

  it("mantiene la duración de un evento de varios días", () => {
    const start = new Date(2026, 8, 22, 0, 0, 0)
    const exclusiveEnd = new Date(2026, 8, 25, 0, 0, 0)
    const stored = calendarRangeToStoredDates(start, exclusiveEnd, true)

    expect(toCalendarDate(stored.fechaInicio).getDate()).toBe(22)
    expect(toCalendarDate(stored.fechaFin).getDate()).toBe(24)
  })
})
