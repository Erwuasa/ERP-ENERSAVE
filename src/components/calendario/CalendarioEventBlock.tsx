import { format } from "date-fns"
import type { EventProps } from "react-big-calendar"
import type { CalendarioEvento } from "../../types/calendario"

export interface CalendarioUiEventResource {
  resource: CalendarioEvento
}

export function CalendarioEventBlock({
  event,
  title,
}: EventProps<{ title: string; start: Date; end: Date; allDay?: boolean }>) {
  const start = event.start
  const end = event.end
  const timeLabel =
    start && end && !event.allDay
      ? `${format(start, "HH:mm")} – ${format(end, "HH:mm")}`
      : null

  return (
    <div className="calendario-event-block h-full min-h-0 flex flex-col justify-start overflow-hidden px-1.5 py-1">
      <p className="calendario-event-title truncate leading-[30px] h-[30px] text-[11px] font-semibold">
        {title}
      </p>
      {timeLabel ? (
        <p className="calendario-event-time truncate text-[10px] font-mono text-brand-subtext leading-tight">
          {timeLabel}
        </p>
      ) : null}
    </div>
  )
}
