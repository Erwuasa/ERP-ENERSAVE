import { AnimatePresence } from "motion/react"
import { UserControlSheet } from "@/components/admin/UserControlSheet"
import { PerfilComercialModal } from "@/components/PerfilComercialModal"
import { ComparadorContractModal } from "@/pages/erp/workspace/modals/ComparadorContractModal"
import { CreateUserModal } from "@/pages/erp/workspace/modals/CreateUserModal"
import { useErpWorkspaceContext } from "@/pages/erp/providers/ErpWorkspaceProvider"
import { canResetTargetMfa } from "@/lib/admin-mfa-policy"

export function ErpWorkspaceModals() {
  const ws = useErpWorkspaceContext()
  const {
    profiles,
    setProfiles,
    activeUserForSheet,
    setActiveUserForSheet,
    isSavingUserSheet,
    handleSaveUserRoleToSupabase,
    togglePermission,
    handleDeleteUserFromSupabase,
    handleResetUserMfa,
    activeUser,
    activeUserId,
    perfilComercialOpen,
    closeFiscalProfile,
    fiscalForm,
    canEditFiscalProfile,
    handleSaveFiscalProfile,
  } = ws

  return (
    <>
      <CreateUserModal {...ws} />

      <AnimatePresence>
        {activeUserForSheet && (
          <UserControlSheet
            user={activeUserForSheet}
            managers={profiles
              .filter((p) => p.role === "jefe_comercial" || p.role === "superadmin")
              .map((p) => ({ id: p.id, fullName: p.fullName }))}
            open
            saving={isSavingUserSheet}
            onClose={() => setActiveUserForSheet(null)}
            onChange={(updated) => {
              setProfiles((prev) =>
                prev.map((p) => (p.id === updated.id ? { ...p, ...updated } : p))
              )
              setActiveUserForSheet(updated)
            }}
            onSaveRole={(role, managerId) =>
              handleSaveUserRoleToSupabase(activeUserForSheet.id, role, managerId)
            }
            onTogglePermission={(key) => {
              togglePermission(activeUserForSheet.id, key)
              setActiveUserForSheet({
                ...activeUserForSheet,
                permissions: {
                  ...activeUserForSheet.permissions,
                  [key]: !activeUserForSheet.permissions[key],
                },
              })
            }}
            onDelete={() => handleDeleteUserFromSupabase(activeUserForSheet.id)}
            mfaEnrolled={ws.mfaEnrolledIds.includes(activeUserForSheet.id)}
            mfaLoading={ws.isSyncingErpUsers}
            mfaResetting={ws.mfaResettingUserId === activeUserForSheet.id}
            canResetMfa={canResetTargetMfa(activeUser.role, activeUserForSheet.role)}
            onResetMfa={() => handleResetUserMfa(activeUserForSheet.id)}
          />
        )}
      </AnimatePresence>

      {canEditFiscalProfile ? (
        <PerfilComercialModal
          open={perfilComercialOpen}
          onClose={closeFiscalProfile}
          comercialId={activeUserId}
          fullName={activeUser.fullName}
          email={activeUser.email}
          initialForm={fiscalForm}
          onSaved={handleSaveFiscalProfile}
        />
      ) : null}

      <ComparadorContractModal ws={ws} />
    </>
  )
}
