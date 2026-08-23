import type { SidebarActionBadge } from "../lib/sidebar-action-badges"
import { sidebarBadgeToneClass } from "../lib/sidebar-action-badges"

interface SidebarMenuBadgeProps {
  badge?: SidebarActionBadge
  collapsed?: boolean
}

export function SidebarMenuBadge({ badge, collapsed }: SidebarMenuBadgeProps) {
  if (!badge || badge.count <= 0) return null

  if (collapsed) {
    return (
      <span
        className={`absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 px-0.5 rounded-full text-[8px] font-black font-mono flex items-center justify-center ${sidebarBadgeToneClass(badge.tone)}`}
        aria-label={`${badge.count} pendientes`}
      >
        {badge.count > 9 ? "9+" : badge.count}
      </span>
    )
  }

  return (
    <span
      className={`ml-auto shrink-0 min-w-[1.25rem] h-5 px-1.5 rounded-full text-[10px] font-black font-mono flex items-center justify-center tabular-nums ${sidebarBadgeToneClass(badge.tone)}`}
    >
      {badge.count > 99 ? "99+" : badge.count}
    </span>
  )
}
