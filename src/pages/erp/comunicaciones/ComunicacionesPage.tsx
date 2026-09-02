import { AvisosPanel } from "@/components/AvisosPanel"
import { AtEmailLogsPanel } from "@/pages/erp/comunicaciones/AtEmailLogsPanel"
import { useAuth } from "@/hooks/useAuth"
import { useStaffFeeds } from "@/pages/erp/providers/staff-feeds-context"

export function ComunicacionesPage() {
  const { activeUser, profiles } = useAuth()
  const { avisos, setAvisos } = useStaffFeeds()
  const canPublish = activeUser.role === "superadmin" || activeUser.role === "tramitacion"

  return (
    <div className="space-y-6">
      <AvisosPanel
        avisos={avisos}
        activeUserId={activeUser.id}
        canPublish={canPublish}
        resolvePublisherName={(userId) =>
          profiles.find((profile) => profile.id === userId)?.fullName ?? userId
        }
        onAvisoCreated={(aviso) => setAvisos((prev) => [aviso, ...prev])}
      />
      <AtEmailLogsPanel />
    </div>
  )
}
