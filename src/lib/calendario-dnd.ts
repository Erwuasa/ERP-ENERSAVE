export function toCalendarDate(value: string | Date): Date {
  return value instanceof Date ? value : new Date(value)
}

export function calendarRangeToStoredDates(
  start: string | Date,
  end: string | Date,
  isAllDay: boolean
): { fechaInicio: string; fechaFin: string; todoElDia: boolean } {
  const startDate = toCalendarDate(start)
  const endDate = toCalendarDate(end)

  if (!isAllDay) {
    return {
      fechaInicio: startDate.toISOString(),
      fechaFin: endDate.toISOString(),
      todoElDia: false,
    }
  }

  const storedStart = new Date(startDate)
  storedStart.setHours(0, 0, 0, 0)

  const storedEnd = new Date(endDate)
  storedEnd.setDate(storedEnd.getDate() - 1)
  storedEnd.setHours(23, 59, 59, 0)

  if (Number.isNaN(storedStart.getTime()) || Number.isNaN(storedEnd.getTime())) {
    return {
      fechaInicio: startDate.toISOString(),
      fechaFin: endDate.toISOString(),
      todoElDia: true,
    }
  }

  if (storedEnd.getTime() < storedStart.getTime()) {
    const fallback = new Date(storedStart)
    fallback.setHours(23, 59, 59, 0)
    return {
      fechaInicio: storedStart.toISOString(),
      fechaFin: fallback.toISOString(),
      todoElDia: true,
    }
  }

  return {
    fechaInicio: storedStart.toISOString(),
    fechaFin: storedEnd.toISOString(),
    todoElDia: true,
  }
}
