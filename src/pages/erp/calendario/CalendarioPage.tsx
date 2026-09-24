import { Navigate } from "react-router-dom"
import { CalendarioPanel } from "@/components/calendario/CalendarioPanel"
import { useAuth } from "@/hooks/useAuth"
import {
  canAccessErpCalendario,
  type CalendarioAccessRole,
} from "@/lib/calendario-visibility"
import { useStaffFeeds } from "@/pages/erp/providers/staff-feeds-context"
import type { StaffRole } from "@/types/profile"

export function CalendarioPage() {
  const { activeUser, profiles } = useAuth()
  const { calendarioEventos, setCalendarioEventos } = useStaffFeeds()
  const role = (
    activeUser.role === "customer" ? "comercial" : activeUser.role
  ) as CalendarioAccessRole

  if (!canAccessErpCalendario(role)) {
    return <Navigate to="/erp/dashboard" replace />
  }

  return (
    <div className="flex h-full min-h-0 flex-1 flex-col">
      <CalendarioPanel
        activeRole={role}
        activeUserId={activeUser.id}
        profiles={profiles}
        eventos={calendarioEventos}
        onEventosChange={(eventos) => setCalendarioEventos(eventos)}
      />
    </div>
  )
}
