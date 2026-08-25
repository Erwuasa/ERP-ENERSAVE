import { CalendarioPanel } from "@/components/calendario/CalendarioPanel"
import { useAuth } from "@/hooks/useAuth"
import { useStaffFeeds } from "@/pages/erp/providers/staff-feeds-context"
import type { StaffRole } from "@/types/profile"

export function CalendarioPage() {
  const { activeUser, profiles } = useAuth()
  const { calendarioEventos, setCalendarioEventos } = useStaffFeeds()
  const role = activeUser.role === "customer" ? "comercial" : (activeUser.role as StaffRole)

  return (
    <CalendarioPanel
      activeRole={role}
      activeUserId={activeUser.id}
      profiles={profiles}
      eventos={calendarioEventos}
      onEventosChange={(eventos) => setCalendarioEventos(eventos)}
    />
  )
}
