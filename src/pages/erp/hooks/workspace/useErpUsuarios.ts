import { useState, useEffect, type FormEvent, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';
import {
  defaultPermissionsForRole,
  profileFromDirectoryRow,
  type Profile,
  type StaffRole,
  type UserRole,
} from '@/types/profile';
import { listErpComerciales, updateErpComercial, deleteStaffUser, inviteStaffUser, cancelStaffInvitation, saveStaffCommissionPercentage, saveStaffPermissions, type ErpComercialRow } from '@/lib/supabase/erp-comerciales';
import { listAppUsers, type AppUser } from '@/lib/supabase/app-users';
import { fetchAdminMfaSummary, resetAdminMfa } from '@/lib/supabase/admin-mfa';
import { canResetTargetMfa } from '@/lib/admin-mfa-policy';
import { sendStaffInvitationEmail } from '@/lib/supabase/staff-invitation';
import { normalizeStaffEmail } from '@/lib/erp-comercial-id';
import { isSupabaseConfigured } from '@/lib/supabase/client';
import { sanitizeStaffPermissionsForRole } from '@/lib/staff-permissions';

function profilesFromComerciales(rows: ErpComercialRow[]): Profile[] {
  return rows.map((row) =>
    profileFromDirectoryRow({
      id: row.id,
      full_name: row.full_name,
      role: row.role,
      manager_id: row.manager_id,
      email: row.email,
      commission_percentage: row.commission_percentage,
      activo: row.activo,
      permissions: row.permissions,
      dni: row.dni,
      direccion: row.direccion,
      ciudad: row.ciudad,
      codigo_postal: row.codigo_postal,
      telefono: row.telefono,
      iban: row.iban,
      integrity_guard_bypass: row.integrity_guard_bypass,
    })
  );
}

function mergeStaffProfilesFromSupabase(
  prev: Profile[],
  rows: ErpComercialRow[]
): Profile[] {
  const synced = profilesFromComerciales(rows);
  const syncedIds = new Set(synced.map((p) => p.id));
  const preserved = prev.filter((p) => !syncedIds.has(p.id));
  return [...synced, ...preserved];
}

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
  const [newUserRole, setNewUserRole] = useState<StaffRole>('comercial');
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
  const [isDeletingUserId, setIsDeletingUserId] = useState<string | null>(null);
  const [isResendingInvitationId, setIsResendingInvitationId] = useState<string | null>(null);
  const [isSavingPermissions, setIsSavingPermissions] = useState<boolean>(false);
  const [isSavingCommission, setIsSavingCommission] = useState<boolean>(false);

  const isSuperadmin = activeRole === 'superadmin';

  useEffect(() => {
    if (currentMenuTab !== 'Usuarios' || !isSuperadmin) return;

    let cancelled = false;
    async function loadErpUsers() {
      setIsSyncingErpUsers(true);

      const accounts = await listAppUsers();
      if (cancelled) return;
      if (accounts.ok === false) {
        setAppUsers([]);
        setAppUsersError(accounts.message);
      } else {
        setAppUsers(accounts.data);
        setAppUsersError(null);
      }
      setIsSyncingErpUsers(false);

      void listErpComerciales().then((comerciales) => {
        if (cancelled) return;
        if (comerciales.ok === false) {
          console.warn('[Usuarios] Supabase sync:', comerciales.message);
          return;
        }
        setProfiles((prev) => mergeStaffProfilesFromSupabase(prev, comerciales.data));
      });

      void fetchAdminMfaSummary().then((mfaSummary) => {
        if (!cancelled) {
          setMfaEnrolledIds(mfaSummary.ok ? mfaSummary.data : []);
        }
      });
    }

    void loadErpUsers();
    return () => {
      cancelled = true;
    };
  }, [currentMenuTab, activeRole, isSuperadmin, setProfiles]);

  const handleAddNewUser = async (e: FormEvent) => {
    e.preventDefault();
    const fullName = newUserName.trim();
    const email = normalizeStaffEmail(newUserEmail);
    if (!fullName || !email) {
      toast.error('Indica nombre y email.');
      return;
    }

    if (!isSupabaseConfigured()) {
      toast.error('Supabase no configurado.');
      return;
    }

    setIsCreatingUser(true);

    const managerId =
      newUserRole === 'comercial'
        ? newUserManager || profiles.find((p) => p.role === 'jefe_comercial')?.id || null
        : null;

    const accounts = await listAppUsers();
    if (accounts.ok === false) {
      setIsCreatingUser(false);
      toast.error(accounts.message);
      return;
    }

    const existingAccount = accounts.data.find((u) => u.email.toLowerCase() === email);

    if (existingAccount?.hasAuth && existingAccount.role !== 'customer') {
      setIsCreatingUser(false);
      toast.error('Ese email ya tiene acceso staff.');
      return;
    }

    if (existingAccount?.hasAuth && existingAccount.role === 'customer') {
      const promote = await updateErpComercial(existingAccount.id, {
        role: newUserRole,
        manager_id: managerId,
      });
      setIsCreatingUser(false);
      if (promote.ok === false) {
        toast.error(promote.message);
        return;
      }
      setNewUserName('');
      setNewUserEmail('');
      setIsCreateOpen(false);
      toast.success(`${fullName} ahora es ${newUserRole}.`);
      const [comerciales, refreshed] = await Promise.all([listErpComerciales(), listAppUsers()]);
      if (comerciales.ok) {
        setProfiles((prev) => mergeStaffProfilesFromSupabase(prev, comerciales.data));
      }
      if (refreshed.ok) setAppUsers(refreshed.data);
      return;
    }

    const invite = await inviteStaffUser({
      email,
      full_name: fullName,
      role: newUserRole,
      manager_id: managerId,
    });

    if (invite.ok === false) {
      setIsCreatingUser(false);
      toast.error(invite.message);
      return;
    }

    const emailResult = await sendStaffInvitationEmail({
      email,
      fullName,
      role: newUserRole,
    });

    setNewUserName('');
    setNewUserEmail('');
    setIsCreatingUser(false);
    setIsCreateOpen(false);

    const refreshed = await listAppUsers();
    if (refreshed.ok) setAppUsers(refreshed.data);

    if (emailResult.ok === false) {
      toast.warning(
        `Invitación guardada en Supabase, pero no se pudo enviar el email: ${emailResult.message}`
      );
      return;
    }

    toast.success(`Acceso enviado a ${email} con contraseña temporal.`);
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
    const commissionPercentage = result.data.commission_percentage;
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

    if (fromApp?.source === 'invitation' || fromApp?.hasAuth === false) {
      if (
        !confirm(`¿Cancelar la invitación de ${label}? No podrá registrarse con ese enlace.`)
      ) {
        return;
      }
      setIsDeletingUserId(userId);
      const result = await cancelStaffInvitation(userId);
      setIsDeletingUserId(null);
      if (result.ok === false) {
        toast.error(result.message);
        return;
      }
      setProfiles((prev) => prev.filter((p) => p.id !== userId));
      setActiveUserForSheet(null);
      toast.success('Invitación cancelada.');
      const accounts = await listAppUsers();
      if (accounts.ok) setAppUsers(accounts.data);
      return;
    }

    if (activeRole === 'superadmin') {
      if (
        !confirm(
          `¿Eliminar a ${label}? Se borrará de Supabase Auth de forma permanente. Podrás volver a registrar el mismo correo más adelante.`
        )
      ) {
        return;
      }

      setIsDeletingUserId(userId);
      const result = await deleteStaffUser(userId);
      setIsDeletingUserId(null);
      if (result.ok === false) {
        toast.error(result.message);
        return;
      }
      setProfiles((prev) => prev.filter((p) => p.id !== userId));
      setActiveUserForSheet(null);
      toast.success(
        result.data.message ??
          (result.data.mode === 'deleted'
            ? 'Usuario eliminado de Supabase. Puedes volver a registrar el mismo correo.'
            : 'Acceso revocado; historial comercial conservado. Puedes volver a registrar el mismo correo.')
      );
      const accounts = await listAppUsers();
      if (accounts.ok) setAppUsers(accounts.data);
      return;
    }

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

  async function handleResendInvitation(userId: string) {
    const fromProfiles = profiles.find((p) => p.id === userId);
    const fromApp = appUsers.find((u) => u.id === userId);
    const email = fromProfiles?.email ?? fromApp?.email ?? '';
    const fullName = fromProfiles?.fullName ?? fromApp?.fullName ?? '';
    const role = fromProfiles?.role ?? fromApp?.role ?? 'comercial';

    if (!email.trim()) {
      toast.error('Este usuario no tiene email de acceso.');
      return;
    }

    setIsResendingInvitationId(userId);
    const result = await sendStaffInvitationEmail({ email, fullName, role });
    setIsResendingInvitationId(null);

    if (result.ok === false) {
      toast.error(result.message);
      return;
    }

    toast.success(`Acceso reenviado a ${email} con nueva contraseña temporal.`);
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
    setProfiles((prev) =>
      prev.map((p) => {
        if (p.id !== userId) return p;
        return {
          ...p,
          permissions: {
            ...p.permissions,
            [permKey]: !p.permissions[permKey],
          },
        };
      })
    );
  };

  async function handleSaveUserCommission(
    userId: string,
    commissionPercentage: number
  ) {
    setIsSavingCommission(true);
    const result = await saveStaffCommissionPercentage(userId, commissionPercentage);
    setIsSavingCommission(false);
    if (result.ok === false) {
      toast.error(result.message);
      return;
    }
    setProfiles((prev) =>
      prev.map((p) =>
        p.id === userId ? { ...p, commissionPercentage: result.data.commission_percentage } : p
      )
    );
    setActiveUserForSheet((prev) =>
      prev && prev.id === userId
        ? { ...prev, commissionPercentage: result.data.commission_percentage }
        : prev
    );
    toast.success('Comisión visible guardada. El marco retributivo del comercial se actualizará con este porcentaje.');
  }

  async function handleSaveUserPermissions(
    userId: string,
    permissions: Profile['permissions']
  ) {
    const target = profiles.find((p) => p.id === userId)
    const sanitized = sanitizeStaffPermissionsForRole(
      target?.role ?? 'comercial',
      permissions
    )
    setIsSavingPermissions(true);
    const result = await saveStaffPermissions(userId, sanitized);
    setIsSavingPermissions(false);
    if (result.ok === false) {
      toast.error(result.message);
      return;
    }
    setProfiles((prev) =>
      prev.map((p) => (p.id === userId ? { ...p, permissions: sanitized } : p))
    );
    setActiveUserForSheet((prev) =>
      prev && prev.id === userId ? { ...prev, permissions: sanitized } : prev
    );
    toast.success('Permisos guardados en Supabase.');
  }

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
    isSavingPermissions,
    isSavingCommission,
    isSyncingErpUsers,
    isDeletingUserId,
    isResendingInvitationId,
    handleResendInvitation,
    appUsers,
    appUsersError,
    handleAddNewUser,
    handleSaveUserRoleToSupabase,
    handleSaveUserCommission,
    handleSaveUserPermissions,
    handleDeleteUserFromSupabase,
    handleResetUserMfa,
    togglePermission,
    mfaEnrolledIds,
    mfaResettingUserId,
  };
}
