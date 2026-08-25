import { useState, useEffect, type FormEvent, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import {
  defaultPermissionsForRole,
  defaultCommissionForRole,
  profileFromDirectoryRow,
  type Profile,
  type UserRole,
} from '@/types/profile';
import { listErpComerciales, updateErpComercial } from '@/lib/supabase/erp-comerciales';
import { listAppUsers, type AppUser } from '@/lib/supabase/app-users';
import { fetchAdminMfaSummary, resetAdminMfa } from '@/lib/supabase/admin-mfa';
import { canResetTargetMfa } from '@/lib/admin-mfa-policy';

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
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserRole, setNewUserRole] = useState<UserRole>('comercial');
  const [newUserManager, setNewUserManager] = useState<string>('');
  const [activeUserForSheet, setActiveUserForSheet] = useState<Profile | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState<boolean>(false);
  const [userSearchText, setUserSearchText] = useState<string>('');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [isCreatingUser, setIsCreatingUser] = useState<boolean>(false);
  const [isSavingUserSheet, setIsSavingUserSheet] = useState<boolean>(false);
  const [isSyncingErpUsers, setIsSyncingErpUsers] = useState<boolean>(false);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);
  const [appUsersError, setAppUsersError] = useState<string | null>(null);
  const [mfaEnrolledIds, setMfaEnrolledIds] = useState<string[]>([]);
  const [mfaResettingUserId, setMfaResettingUserId] = useState<string | null>(null);

  const isErpOpsAdmin = activeRole === 'superadmin' || activeRole === 'tramitacion';

  useEffect(() => {
    if (currentMenuTab !== 'Usuarios' || !isErpOpsAdmin) return;

    let cancelled = false;
    async function loadErpUsers() {
      setIsSyncingErpUsers(true);
      const [comerciales, accounts, mfaSummary] = await Promise.all([
        listErpComerciales(),
        listAppUsers(),
        fetchAdminMfaSummary(),
      ]);
      if (!cancelled && comerciales.ok) {
        setProfiles(
          comerciales.data.map((row) =>
            profileFromDirectoryRow({
              id: row.id,
              full_name: row.full_name,
              role: row.role,
              manager_id: row.manager_id,
              email: row.email,
              commission_percentage: row.commission_percentage,
            })
          )
        );
      } else if (!cancelled && comerciales.ok === false) {
        console.warn('[Usuarios] Supabase sync:', comerciales.message);
      }
      if (!cancelled) {
        if (accounts.ok === false) {
          setAppUsers([]);
          setAppUsersError(accounts.message);
        } else {
          setAppUsers(accounts.data);
          setAppUsersError(null);
        }
        if (mfaSummary.ok) {
          setMfaEnrolledIds(mfaSummary.data);
        } else {
          setMfaEnrolledIds([]);
        }
        setIsSyncingErpUsers(false);
      }
    }

    void loadErpUsers();
    return () => {
      cancelled = true;
    };
  }, [currentMenuTab, activeRole, isErpOpsAdmin, setProfiles]);

  const handleAddNewUser = async (e: FormEvent) => {
    e.preventDefault();
    const email = newUserEmail.trim().toLowerCase();
    if (!email) {
      toast.error('Indica el email de una cuenta ya registrada.');
      return;
    }
    setIsCreatingUser(true);

    const accounts = await listAppUsers();
    if (accounts.ok === false) {
      setIsCreatingUser(false);
      toast.error(accounts.message);
      return;
    }

    const target = accounts.data.find((u) => u.email.toLowerCase() === email);
    if (!target) {
      setIsCreatingUser(false);
      toast.error('Esa cuenta no existe. La persona debe registrarse antes de ser staff.');
      return;
    }

    const managerId =
      newUserRole === 'comercial'
        ? newUserManager || profiles.find((p) => p.role === 'jefe_comercial')?.id || null
        : null;

    const result = await updateErpComercial(target.id, {
      role: newUserRole,
      manager_id: managerId,
    });

    if (result.ok === false) {
      setIsCreatingUser(false);
      toast.error(result.message);
      return;
    }

    const promoted: Profile = {
      id: result.data.id,
      fullName: result.data.full_name,
      role: result.data.role,
      managerId: result.data.manager_id,
      commissionPercentage: result.data.commission_percentage,
      permissions: defaultPermissionsForRole(result.data.role),
      email: result.data.email ?? email,
      status: 'activo',
    };

    setProfiles((prev) => {
      if (prev.some((p) => p.id === promoted.id)) {
        return prev.map((p) => (p.id === promoted.id ? promoted : p));
      }
      return [...prev, promoted];
    });
    setNewUserName('');
    setNewUserEmail('');
    setIsCreatingUser(false);
    setIsCreateOpen(false);
    toast.success(`${promoted.fullName} ahora es ${promoted.role}.`);
    const refreshed = await listAppUsers();
    if (refreshed.ok) setAppUsers(refreshed.data);
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
    const commissionPercentage = defaultCommissionForRole(role);
    const patch = { role, managerId, permissions, commissionPercentage };

    setProfiles((prev) => {
      if (role === 'customer') return prev.filter((p) => p.id !== userId);
      const existing = prev.find((p) => p.id === userId);
      if (existing) return prev.map((p) => (p.id === userId ? { ...p, ...patch } : p));
      return [
        ...prev,
        {
          id: result.data.id,
          fullName: result.data.full_name,
          email: result.data.email ?? '',
          status: 'activo' as const,
          ...patch,
        },
      ];
    });
    setActiveUserForSheet((prev) =>
      prev && prev.id === userId ? { ...prev, ...patch } : prev
    );
    toast.success('Rol actualizado');
    const refreshed = await listAppUsers();
    if (refreshed.ok) setAppUsers(refreshed.data);
  }

  async function handleDeleteUserFromSupabase(userId: string) {
    const fromProfiles = profiles.find((p) => p.id === userId);
    const fromApp = appUsers.find((u) => u.id === userId);
    if (!fromProfiles && !fromApp) return;
    const label = fromProfiles?.fullName ?? fromApp?.fullName ?? fromApp?.email ?? userId;
    if (!confirm(`¿Quitar el acceso staff de ${label}? Seguirá existiendo como cliente.`)) return;

    const result = await updateErpComercial(userId, { role: 'customer', manager_id: null });
    if (result.ok === false) {
      toast.error(result.message);
      return;
    }
    setProfiles((prev) => prev.filter((p) => p.id !== userId));
    setActiveUserForSheet(null);
    toast.success('Pasado a cliente');
    const accounts = await listAppUsers();
    if (accounts.ok) setAppUsers(accounts.data);
  }

  async function handleResetUserMfa(userId: string) {
    const fromProfiles = profiles.find((p) => p.id === userId);
    const fromApp = appUsers.find((u) => u.id === userId);
    const targetRole = fromProfiles?.role ?? fromApp?.role;
    const label = fromProfiles?.fullName ?? fromApp?.fullName ?? fromApp?.email ?? userId;
    if (!targetRole) return;
    if (!canResetTargetMfa(activeRole, targetRole)) {
      toast.error('No puedes resetear el MFA de este usuario.');
      return;
    }
    if (
      !confirm(
        `¿Resetear el autenticador de ${label}? Se cerrarán sus sesiones y en el próximo login tendrá que escanear un QR nuevo.`
      )
    ) {
      return;
    }

    setMfaResettingUserId(userId);
    const result = await resetAdminMfa(userId, activeRole, targetRole);
    setMfaResettingUserId(null);
    if (result.ok === false) {
      toast.error(result.message);
      return;
    }
    setMfaEnrolledIds((prev) => prev.filter((id) => id !== userId));
    toast.success('Autenticador reseteado. El próximo login pedirá un QR nuevo.');
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
    newUserEmail,
    setNewUserEmail,
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
    appUsers,
    appUsersError,
    handleAddNewUser,
    handleSaveUserRoleToSupabase,
    handleDeleteUserFromSupabase,
    handleResetUserMfa,
    togglePermission,
    mfaEnrolledIds,
    mfaResettingUserId,
  };
}
