import { Skeleton } from "../Skeleton"

function PanelHeaderSkeleton({ subtitleWidth = "w-40" }: { subtitleWidth?: string }) {
  return (
    <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-800 space-y-2">
      <Skeleton className="h-4 w-36" rounded="sm" />
      <Skeleton className={`h-3 ${subtitleWidth}`} rounded="sm" />
    </div>
  )
}

/** Mi Día v2 cockpit skeleton: KPI strip + hero + queue */
export function MiDiaPageSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Cargando Mi Día">
      <MiDiaKpiStripSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        <div className="lg:col-span-5">
          <MiDiaHeroSkeleton />
        </div>
        <div className="lg:col-span-7 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" rounded="xl" />
          ))}
        </div>
      </div>
    </div>
  )
}

export function MiDiaKpiStripSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden sm:grid sm:grid-cols-3">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="min-w-[140px] h-[88px]" rounded="xl" />
      ))}
    </div>
  )
}

export function MiDiaHeroSkeleton() {
  return <Skeleton className="min-h-[160px] w-full" rounded="2xl" />
}

export function MiDiaHeaderProgressSkeleton() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1 border-t border-slate-100 dark:border-slate-800">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-28" rounded="sm" />
            <Skeleton className="h-3 w-8" rounded="sm" />
          </div>
          <Skeleton className="h-2 w-full" rounded="full" />
        </div>
      ))}
    </div>
  )
}

/** Stage-Gate kanban: 6 columnas × cards */
export function PipelineKanbanSkeleton() {
  return (
    <div
      className="flex gap-2 overflow-x-auto pb-2"
      aria-busy="true"
      aria-label="Cargando pipeline"
    >
      {Array.from({ length: 6 }).map((_, col) => (
        <div
          key={col}
          className="rounded-lg border border-brand-border/60 min-w-[172px] w-[172px] shrink-0 flex flex-col h-[min(400px,calc(100vh-280px))] max-h-[400px] bg-brand-panel/30"
        >
          <div className="px-2 py-2 border-b border-brand-border/40 space-y-1.5">
            <Skeleton className="h-3 w-20" rounded="sm" />
            <Skeleton className="h-2.5 w-10" rounded="sm" />
          </div>
          <div className="flex-1 p-1.5 space-y-1.5">
            {Array.from({ length: col % 2 === 0 ? 2 : 1 }).map((_, card) => (
              <div
                key={card}
                className="rounded-lg border border-brand-border/50 bg-brand-panel/60 p-2 space-y-2"
              >
                <Skeleton className="h-3.5 w-full" rounded="sm" />
                <Skeleton className="h-2.5 w-2/3" rounded="sm" />
                <Skeleton className="h-4 w-14" rounded="full" />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}

export function PipelineListSkeleton() {
  return (
    <div className="rounded-xl border border-brand-border overflow-hidden" aria-busy="true">
      {Array.from({ length: 6 }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-4 py-3 border-b border-brand-border/60 last:border-0"
        >
          <Skeleton className="h-4 w-32" rounded="sm" />
          <Skeleton className="h-3 w-20" rounded="sm" />
          <Skeleton className="h-5 w-24 ml-auto" rounded="full" />
        </div>
      ))}
    </div>
  )
}

export function FichaProspectoSkeleton() {
  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-black/40"
      aria-busy="true"
      aria-label="Cargando prospecto"
    >
      <div
        className="w-full max-w-lg bg-brand-panel border border-brand-border rounded-xl shadow-lg overflow-hidden max-h-[85vh] flex flex-col"
      >
        <div className="p-3 space-y-3">
          <div className="flex justify-between gap-2">
            <div className="space-y-2 flex-1">
              <Skeleton className="h-5 w-3/4" rounded="sm" />
              <Skeleton className="h-3 w-1/2" rounded="sm" />
            </div>
            <Skeleton className="h-8 w-8 shrink-0" rounded="lg" />
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-6 w-16" rounded="full" />
            <Skeleton className="h-6 w-20" rounded="full" />
          </div>
          <div className="rounded-lg border border-brand-border/60 p-2.5 space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex justify-between gap-2">
                <Skeleton className="h-3 w-20" rounded="sm" />
                <Skeleton className="h-3 w-28" rounded="sm" />
              </div>
            ))}
          </div>
          <Skeleton className="h-14 w-full" rounded="lg" />
          <FichaTareaSkeleton />
          <TimelineListSkeleton rows={2} />
        </div>
      </div>
    </div>
  )
}

export function FichaTareaSkeleton() {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-2">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-24" rounded="sm" />
        <Skeleton className="h-5 w-20" rounded="full" />
      </div>
      <Skeleton className="h-3.5 w-full" rounded="sm" />
      <Skeleton className="h-3 w-2/3" rounded="sm" />
    </div>
  )
}

export function TimelineListSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="rounded-xl border border-brand-border bg-brand-panel/50 p-4 space-y-3">
      <div className="flex justify-between">
        <Skeleton className="h-3 w-20" rounded="sm" />
        <Skeleton className="h-8 w-28" rounded="lg" />
      </div>
      <div className="space-y-2">
        {Array.from({ length: rows }).map((_, i) => (
          <div
            key={i}
            className="flex gap-3 rounded-lg border border-brand-border bg-brand-bg/40 p-3"
          >
            <Skeleton className="h-4 w-4 shrink-0 mt-0.5" rounded="sm" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3.5 w-32" rounded="sm" />
              <Skeleton className="h-3 w-full" rounded="sm" />
              <Skeleton className="h-2.5 w-16" rounded="sm" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

/** Chat bubbles for Centro de mando */
export function ChatTimelineSkeleton({ bubbles = 3 }: { bubbles?: number }) {
  return (
    <div className="space-y-3 min-h-[220px]" aria-busy="true" aria-label="Cargando reportes">
      {Array.from({ length: bubbles }).map((_, i) => (
        <div key={i} className="flex flex-col items-end gap-1">
          <Skeleton
            className={`h-10 ${i % 2 === 0 ? "w-[75%]" : "w-[60%]"}`}
            rounded="2xl"
          />
          <Skeleton className="h-2.5 w-24" rounded="sm" />
        </div>
      ))}
    </div>
  )
}

export function OperationalTasksSkeleton({ items = 2 }: { items?: number }) {
  return (
    <div className="space-y-1.5">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-start gap-2.5 rounded-xl border border-brand-border/60 px-3 py-2.5"
        >
          <Skeleton className="h-4 w-4 shrink-0 mt-0.5" rounded="sm" />
          <Skeleton className="h-3.5 flex-1" rounded="sm" />
        </div>
      ))}
    </div>
  )
}

export function SlaAlertsListSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div
      className="rounded-xl border border-brand-border bg-brand-panel overflow-hidden"
      aria-busy="true"
    >
      <ul className="divide-y divide-brand-border">
        {Array.from({ length: rows }).map((_, i) => (
          <li key={i} className="px-4 py-3 flex items-start gap-3">
            <Skeleton className="h-5 w-16 shrink-0" rounded="md" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-40" rounded="sm" />
              <Skeleton className="h-3 w-full" rounded="sm" />
              <Skeleton className="h-3 w-2/3" rounded="sm" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ReportingFunnelSkeleton({ stages = 6 }: { stages?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: stages }).map((_, i) => (
        <div key={i} className="space-y-1">
          <div className="flex justify-between">
            <Skeleton className="h-3 w-24" rounded="sm" />
            <Skeleton className="h-3 w-12" rounded="sm" />
          </div>
          <Skeleton className="h-2 w-full" rounded="full" />
        </div>
      ))}
    </div>
  )
}

export function ReportingTableSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2" aria-busy="true">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-2">
          <Skeleton className="h-3.5 w-28" rounded="sm" />
          <Skeleton className="h-3 w-12" rounded="sm" />
          <Skeleton className="h-3 w-12" rounded="sm" />
          <Skeleton className="h-3 w-12 ml-auto" rounded="sm" />
        </div>
      ))}
    </div>
  )
}

export function ContratosTableSkeleton({ rows = 3 }: { rows?: number }) {
  return (
    <div className="px-4 py-3 space-y-3" aria-busy="true">
      <div className="flex gap-3 border-b border-slate-100 dark:border-slate-800 pb-2">
        <Skeleton className="h-3 w-16" rounded="sm" />
        <Skeleton className="h-3 w-12 hidden sm:block" rounded="sm" />
        <Skeleton className="h-3 w-20 ml-auto" rounded="sm" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 py-1">
          <Skeleton className="h-3.5 w-28" rounded="sm" />
          <Skeleton className="h-3 w-20 hidden sm:block" rounded="sm" />
          <Skeleton className="h-5 w-16 ml-auto" rounded="full" />
        </div>
      ))}
    </div>
  )
}
