import { AvisosPanel } from "@/components/AvisosPanel"
import { AtEmailLogsPanel } from "@/pages/erp/comunicaciones/AtEmailLogsPanel"
import { useAuth } from "@/hooks/useAuth"
import { useStaffFeeds } from "@/pages/erp/providers/staff-feeds-context"

export function ComunicacionesPage() {
  const { activeUser, profiles } = useAuth()
  const { avisos, setAvisos } = useStaffFeeds()
  const canPublish =
    activeUser.role === "superadmin" ||
    activeUser.role === "tramitacion" ||
    activeUser.role === "jefe_comercial"

  return (
    <div className="space-y-6">
      <AvisosPanel
        avisos={avisos}
        activeUserId={activeUser.id}
        activeUserRole={activeUser.role}
        canPublish={canPublish}
        profiles={profiles.map((profile) => ({
          id: profile.id,
          fullName: profile.fullName,
          role: profile.role,
          managerId: profile.managerId,
        }))}
        resolvePublisherName={(userId) =>
          profiles.find((profile) => profile.id === userId)?.fullName ?? userId
        }
        onAvisoCreated={(aviso) => setAvisos((prev) => [aviso, ...prev])}
        onAvisoDeleted={(avisoId) => setAvisos((prev) => prev.filter((aviso) => aviso.id !== avisoId))}
      />
      {activeUser.role === "superadmin" ? <AtEmailLogsPanel /> : null}
    </div>
  )
}
