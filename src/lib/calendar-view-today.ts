import { endOfDay, endOfWeek, startOfDay, startOfWeek } from "date-fns"

/** True when the visible calendar period includes today. Week starts on Monday. */
export function calendarViewContainsToday(
  date: Date,
  view: string,
  today: Date = new Date()
): boolean {
  if (Number.isNaN(date.getTime()) || Number.isNaN(today.getTime())) return false
  const current = startOfDay(today)
  if (view === "day") return startOfDay(date).getTime() === current.getTime()
  if (view === "month" || view === "agenda") {
    return date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth()
  }
  const start = startOfDay(startOfWeek(date, { weekStartsOn: 1 }))
  const end = endOfDay(endOfWeek(date, { weekStartsOn: 1 }))
  return current.getTime() >= start.getTime() && current.getTime() <= end.getTime()
}
