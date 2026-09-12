import { Skeleton } from "@/components/ui/Skeleton"

function ComparadorRankingCardSkeleton() {
  return (
    <div className="rounded-2xl border border-brand-border bg-brand-panel p-5 space-y-4">
      <div className="flex items-start gap-3">
        <Skeleton className="h-10 w-10 shrink-0" rounded="xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" rounded="md" />
          <Skeleton className="h-3 w-1/3" rounded="md" />
        </div>
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-3 w-full" rounded="sm" />
        <Skeleton className="h-3 w-5/6" rounded="sm" />
      </div>
      <Skeleton className="h-8 w-28 ml-auto" rounded="lg" />
    </div>
  )
}

export function ComparadorRankingSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-4" aria-hidden="true">
      {Array.from({ length: count }).map((_, index) => (
        <ComparadorRankingCardSkeleton key={index} />
      ))}
    </div>
  )
}
