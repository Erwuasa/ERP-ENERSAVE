import { AnimatePresence } from "motion/react"
import { UserControlSheet } from "@/components/admin/UserControlSheet"
import type { ErpWorkspaceContext } from "@/pages/erp/hooks/useErpWorkspace"
import { ComparadorContractModal } from "@/pages/erp/components/workspace/modals/ComparadorContractModal"
import { CreateUserModal } from "@/pages/erp/components/workspace/modals/CreateUserModal"

type Props = { ws: ErpWorkspaceContext }

export function ErpWorkspaceModals({ ws }: Props) {
  const {
    profiles,
    setProfiles,
    activeUserForSheet,
    setActiveUserForSheet,
    isSavingUserSheet,
    handleSaveUserRoleToSupabase,
    togglePermission,
    handleDeleteUserFromSupabase,
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
          />
        )}
      </AnimatePresence>

      <ComparadorContractModal ws={ws} />
    </>
  )
}
