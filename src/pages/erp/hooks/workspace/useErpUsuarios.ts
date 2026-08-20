import { useState, useEffect, type FormEvent, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import {
  mergeErpRowsIntoProfiles,
  defaultPermissionsForRole,
  defaultCommissionForRole,
  type Profile,
  type UserRole,
} from '@/types/profile';
import {
  deleteErpComercial,
  insertErpComercial,
  listErpComerciales,
  updateErpComercial,
} from '@/lib/supabase/erp-comerciales';

interface UseErpUsuariosParams {
  profiles: Profile[];
  setProfiles: Dispatch<SetStateAction<Profile[]>>;
  activeRole: UserRole;
  currentMenuTab: string;
}

export function useErpUsuarios({
  profiles,
  setProfiles,
  activeRole,
  currentMenuTab,
}: UseErpUsuariosParams) {
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('comercial');
  const [newUserManager, setNewUserManager] = useState<string>('usr-2');
  const [activeUserForSheet, setActiveUserForSheet] = useState<Profile | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [userSearchText, setUserSearchText] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [isSavingUserSheet, setIsSavingUserSheet] = useState<boolean>(false);
  const [isSyncingErpUsers, setIsSyncingErpUsers] = useState<boolean>(false);

  const isErpOpsAdmin = activeRole === 'superadmin' || activeRole === 'tramitacion';

  useEffect(() => {
    if (currentMenuTab !== 'Usuarios' || !isErpOpsAdmin) return;

    let cancelled = false;
    async function loadErpUsers() {
      setIsSyncingErpUsers(true);
      const result = await listErpComerciales();
      if (!cancelled && result.ok) {
        setProfiles((prev) => mergeErpRowsIntoProfiles(result.data, prev));
      } else if (!cancelled && result.ok === false) {
        console.warn('[Usuarios] Supabase sync:', result.message);
      }
      if (!cancelled) setIsSyncingErpUsers(false);
    }

    loadErpUsers();
    return () => {
      cancelled = true;
    };
  }, [currentMenuTab, activeRole, isErpOpsAdmin, setProfiles]);

  const handleAddNewUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!newUserName) return;
    setIsCreatingUser(true);

    const randomID = `usr-${profiles.length + 1}`;
    const email = `${newUserName.toLowerCase().replace(/\s+/g, '')}@ener-erp.com`;
    const managerId = newUserRole === 'comercial' ? newUserManager : null;

    const insertResult = await insertErpComercial({
      id: randomID,
      full_name: newUserName,
      role: newUserRole,
      manager_id: managerId,
      email,
    });

    if (insertResult.ok === false) {
      setIsCreatingUser(false);
      toast.error(insertResult.message);
      return;
    }

    const newProfile: Profile = {
      id: randomID,
      fullName: newUserName,
      role: newUserRole,
      managerId,
      commissionPercentage: defaultCommissionForRole(newUserRole),
      permissions: defaultPermissionsForRole(newUserRole),
      email,
      status: 'activo',
    };

    setProfiles([...profiles, newProfile]);
    setNewUserName('');
    setIsCreatingUser(false);
    setIsCreateOpen(false);
    toast.success(`Asesor ${newUserName} registrado en Supabase.`);
  };

  async function handleSaveUserRoleToSupabase(
    userId: string,
    role: UserRole,
    managerId: string | null
  ) {
    setIsSavingUserSheet(true);
    const result = await updateErpComercial(userId, {
      role,
      manager_id: managerId,
    });
    setIsSavingUserSheet(false);

    if (result.ok === false) {
      toast.error(result.message);
      return;
    }

    const permissions = defaultPermissionsForRole(role);
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === userId
          ? {
              ...p,
              role,
              managerId,
              permissions,
              commissionPercentage: defaultCommissionForRole(role),
            }
          : p
      )
    );
    setActiveUserForSheet((prev) =>
      prev && prev.id === userId
        ? {
            ...prev,
            role,
            managerId,
            permissions,
            commissionPercentage: defaultCommissionForRole(role),
          }
        : prev
    );
    toast.success('Rol actualizado en Supabase');
  }

  async function handleDeleteUserFromSupabase(userId: string) {
    const user = profiles.find((p) => p.id === userId);
    if (!user) return;
    if (!confirm(`¿Eliminar ${user.fullName} de erp_comerciales?`)) return;

    const result = await deleteErpComercial(userId);
    if (result.ok === false) {
      toast.error(result.message);
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== userId));
    setActiveUserForSheet(null);
    toast.success('Usuario eliminado de Supabase');
  }

  const togglePermission = (userId: string, permKey: keyof Profile['permissions']) => {
    const user = profiles.find((p) => p.id === userId);
    const prevValue = user?.permissions[permKey];
    setProfiles(
      profiles.map((p) => {
        if (p.id === userId) {
          return {
            ...p,
            permissions: {
              ...p.permissions,
              [permKey]: !p.permissions[permKey],
            },
          };
        }
        return p;
      })
    );
    toast.success(
      `Permiso '${permKey}' de ${user?.fullName} se ha cambiado a ${!prevValue ? 'ACTIVADO' : 'DESACTIVADO'}.`
    );
  };

  return {
    newUserName,
    setNewUserName,
    newUserRole,
    setNewUserRole,
    newUserManager,
    setNewUserManager,
    activeUserForSheet,
    setActiveUserForSheet,
    isCreateOpen,
    setIsCreateOpen,
    userSearchText,
    setUserSearchText,
    userRoleFilter,
    setUserRoleFilter,
    userStatusFilter,
    setUserStatusFilter,
    isCreatingUser,
    isSavingUserSheet,
    isSyncingErpUsers,
    handleAddNewUser,
    handleSaveUserRoleToSupabase,
    handleDeleteUserFromSupabase,
    togglePermission,
  };
}
