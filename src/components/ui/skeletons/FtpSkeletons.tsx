import { Skeleton } from "../Skeleton"

/**
 * Fills just the folder/file grid area of the FTP explorer while a folder is
 * loading — breadcrumb, search and toolbar stay outside this component so
 * they remain visible and interactive during the fetch.
 */
export function FtpExplorerSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Cargando carpeta">
      <div className="space-y-3">
        <Skeleton className="h-3 w-24" rounded="sm" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="bg-brand-panel/60 border border-brand-border rounded-xl p-4 flex items-center gap-3 min-h-[88px]"
            >
              <Skeleton className="h-10 w-10 shrink-0" rounded="lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-3 w-3/4" rounded="sm" />
                <Skeleton className="h-2.5 w-1/2" rounded="sm" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
