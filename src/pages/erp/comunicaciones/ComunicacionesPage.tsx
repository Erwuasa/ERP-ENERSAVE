import { AvisosPanel } from "@/components/AvisosPanel"
import { useAuth } from "@/hooks/useAuth"
import { useStaffFeeds } from "@/pages/erp/providers/staff-feeds-context"

export function ComunicacionesPage() {
  const { activeUser, profiles } = useAuth()
  const { avisos, setAvisos } = useStaffFeeds()
  const canPublish = activeUser.role === "superadmin" || activeUser.role === "tramitacion"

  return (
    <AvisosPanel
      avisos={avisos}
      activeUserId={activeUser.id}
      canPublish={canPublish}
      resolvePublisherName={(userId) =>
        profiles.find((profile) => profile.id === userId)?.fullName ?? userId
      }
      onAvisoCreated={(aviso) => setAvisos((prev) => [aviso, ...prev])}
    />
  )
}
