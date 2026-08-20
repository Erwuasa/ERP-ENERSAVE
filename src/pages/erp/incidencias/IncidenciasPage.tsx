import { useAuth } from "@/hooks/useAuth"
import { useIncidenciasContext } from "@/pages/erp/incidencias/IncidenciasProvider"
import { IncidenciasPanel } from "@/pages/erp/incidencias/components/IncidenciasPanel"
import { IncidenciaCreateForm } from "@/pages/erp/incidencias/components/IncidenciaCreateForm"

type Props = {
  teamMemberIds: string[]
}

export function IncidenciasPage({ teamMemberIds }: Props) {
  const { activeUserId, activeUser } = useAuth()
  const activeRole = activeUser.role as "superadmin" | "jefe_comercial" | "comercial" | "tramitacion"
  const inc = useIncidenciasContext()

  return (
    <IncidenciasPanel
      incidencias={inc.roleFilteredIncidencias}
      activeUserId={activeUserId}
      activeRole={activeRole}
      teamMemberIds={teamMemberIds}
      showComercialName={activeRole !== "comercial"}
      canEdit={inc.canEditIncidencia}
      canDrag={inc.canDragIncidencias}
      onSave={inc.handleUpdateIncidencia}
      onMove={inc.handleMoveIncidencia}
      createForm={
        inc.canCreateIncidencia ? (
          <IncidenciaCreateForm
            clientName={inc.newIncClientName}
            tipo={inc.newIncTipo}
            prioridad={inc.newIncPrioridad}
            descripcion={inc.newIncDescripcion}
            onClientNameChange={inc.setNewIncClientName}
            onTipoChange={inc.setNewIncTipo}
            onPrioridadChange={inc.setNewIncPrioridad}
            onDescripcionChange={inc.setNewIncDescripcion}
            onSubmit={inc.handleCreateIncidencia}
          />
        ) : undefined
      }
    />
  )
}
