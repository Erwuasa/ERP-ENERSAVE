import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type FormEvent,
  type ReactNode,
  type SetStateAction,
} from "react"
import { useNavigate } from "react-router-dom"
import { updateStaffPassword, userMustChangePassword } from "@/lib/auth-password-change"
import {
  AUTH_USER_STORAGE_KEY,
  clearSupabaseSession,
  getAuthSessionStatus,
  syncSupabaseSession,
} from "@/lib/supabase/auth-session"
import {
  cancelTotpEnrollment,
  inspectStaffMfa,
  normalizeTotpCode,
  startTotpEnrollment,
  verifyTotpCode,
} from "@/lib/supabase/auth-mfa"
import { resolveWorkspaceAfterAuth } from "@/lib/supabase/user-profiles"
import { isStaffLoginAllowed } from "@/lib/supabase/erp-comerciales"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { ROUTES, getDefaultAppPath } from "@/constants/navigation"
import { EMPTY_PROFILE, isStaffRole, type Profile } from "@/types/profile"

type MfaWorkspace = {
  email: string
  profile: Profile
  directory: Profile[]
}

export type MfaPendingState =
  | ({ kind: "challenge"; factorId: string } & MfaWorkspace)
  | ({ kind: "enroll"; factorId: string; qrCode: string; secret: string } & MfaWorkspace)

interface AuthContextValue {
  isLoggedIn: boolean
  isBootstrapping: boolean
  profiles: Profile[]
  setProfiles: Dispatch<SetStateAction<Profile[]>>
  activeUserId: string
  setActiveUserId: Dispatch<SetStateAction<string>>
  activeUser: Profile
  loginEmail: string
  setLoginEmail: Dispatch<SetStateAction<string>>
  loginPassword: string
  setLoginPassword: Dispatch<SetStateAction<string>>
  loginLoading: boolean
  loginError: string | null
  passwordChangePending: MfaWorkspace | null
  mfaPending: MfaPendingState | null
  triggerLogin: (e: FormEvent) => Promise<void>
  submitPasswordChange: (newPassword: string, confirmPassword: string) => Promise<void>
  submitMfa: (code: string) => Promise<void>
  cancelLoginFlow: () => Promise<void>
  logout: () => Promise<void>
  applyLoginProfile: (profile: Profile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function persistLoggedInProfile(profileId: string): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.setItem(AUTH_USER_STORAGE_KEY, profileId)
}

function clearPersistedProfile(): void {
  if (typeof sessionStorage === "undefined") return
  sessionStorage.removeItem(AUTH_USER_STORAGE_KEY)
}

const SUSPENDED_ACCOUNT_MESSAGE =
  "La cuenta de este agente se encuentra suspendida temporalmente por administración."

async function assertActiveStaffAccount(
  profile: Profile
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isStaffRole(profile.role)) return { ok: true }
  if (profile.status === "suspendido") {
    return { ok: false, message: SUSPENDED_ACCOUNT_MESSAGE }
  }
  const access = await isStaffLoginAllowed(profile.id)
  if (access.ok && access.data === false) {
    return { ok: false, message: SUSPENDED_ACCOUNT_MESSAGE }
  }
  return { ok: true }
}

async function buildTotpPendingState(
  email: string,
  profile: Profile,
  directory: Profile[]
): Promise<
  | { ok: true; pending: MfaPendingState | null }
  | { ok: false; message: string }
> {
  const inspected = await inspectStaffMfa()
  if (inspected.ok === false) return inspected
  if (inspected.data.step === "none") return { ok: true, pending: null }

  const workspace: MfaWorkspace = { email, profile, directory }

  if (inspected.data.step === "challenge") {
    return {
      ok: true,
      pending: {
        kind: "challenge",
        factorId: inspected.data.factorId,
        ...workspace,
      },
    }
  }

  const enrolled = await startTotpEnrollment()
  if (enrolled.ok === false) return enrolled

  return {
    ok: true,
    pending: {
      kind: "enroll",
      factorId: enrolled.data.factorId,
      qrCode: enrolled.data.qrCode,
      secret: enrolled.data.secret,
      ...workspace,
    },
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [activeUserId, setActiveUserId] = useState("")
  const [loginEmail, setLoginEmail] = useState("")
  const [loginPassword, setLoginPassword] = useState("")
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)
  const [passwordChangePending, setPasswordChangePending] = useState<MfaWorkspace | null>(null)
  const [mfaPending, setMfaPending] = useState<MfaPendingState | null>(null)

  const activeUser = useMemo(
    () => profiles.find((p) => p.id === activeUserId) ?? EMPTY_PROFILE,
    [profiles, activeUserId]
  )

  const applyLoginProfile = useCallback(
    (profile: Profile, directory?: Profile[]) => {
      if (directory) setProfiles(directory)
      setActiveUserId(profile.id)
      setIsLoggedIn(true)
      persistLoggedInProfile(profile.id)
      navigate(getDefaultAppPath(profile.role))
    },
    [navigate]
  )

  const restoreFromProfile = useCallback((profile: Profile, directory?: Profile[]) => {
    if (directory) setProfiles(directory)
    setActiveUserId(profile.id)
    setIsLoggedIn(true)
    persistLoggedInProfile(profile.id)
  }, [])

  const proceedAfterAuthenticated = useCallback(
    async (searchEmail: string, workspace: { profile: Profile; directory: Profile[] }) => {
      if (await userMustChangePassword()) {
        setPasswordChangePending({
          email: searchEmail,
          profile: workspace.profile,
          directory: workspace.directory,
        })
        setLoginPassword("")
        setLoginLoading(false)
        return
      }

      const totp = await buildTotpPendingState(
        searchEmail,
        workspace.profile,
        workspace.directory
      )
      if (totp.ok === false) {
        await clearSupabaseSession()
        setLoginLoading(false)
        setLoginError(totp.message)
        return
      }
      if (totp.pending) {
        setMfaPending(totp.pending)
        setLoginPassword("")
        setLoginLoading(false)
        return
      }

      applyLoginProfile(workspace.profile, workspace.directory)
      setLoginPassword("")
      setLoginLoading(false)
    },
    [applyLoginProfile]
  )

  const completeStaffLogin = useCallback(
    async (searchEmail: string, password: string) => {
      setLoginLoading(true)
      setLoginError(null)
      setPasswordChangePending(null)
      setMfaPending(null)

      if (!isSupabaseConfigured()) {
        setLoginLoading(false)
        setLoginError("Supabase no configurado")
        return
      }

      const sessionResult = await syncSupabaseSession(searchEmail, password)
      if (sessionResult.ok === false) {
        setLoginLoading(false)
        setLoginError(sessionResult.message)
        return
      }

      const workspace = await resolveWorkspaceAfterAuth(searchEmail)
      if (workspace.ok === false) {
        await clearSupabaseSession()
        setLoginLoading(false)
        setLoginError(workspace.message)
        return
      }

      const activeAccount = await assertActiveStaffAccount(workspace.data.profile)
      if (activeAccount.ok === false) {
        await clearSupabaseSession()
        setLoginLoading(false)
        setLoginError(activeAccount.message)
        return
      }

      await proceedAfterAuthenticated(searchEmail, workspace.data)
    },
    [proceedAfterAuthenticated]
  )

  const triggerLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const searchEmail = loginEmail.toLowerCase().trim()
      await completeStaffLogin(searchEmail, loginPassword)
    },
    [loginEmail, loginPassword, completeStaffLogin]
  )

  const submitPasswordChange = useCallback(
    async (newPassword: string, confirmPassword: string) => {
      if (!passwordChangePending) return
      setLoginLoading(true)
      setLoginError(null)

      const updated = await updateStaffPassword(newPassword, confirmPassword)
      if (updated.ok === false) {
        setLoginLoading(false)
        setLoginError(updated.message)
        return
      }

      const pending = passwordChangePending
      setPasswordChangePending(null)
      await proceedAfterAuthenticated(pending.email, {
        profile: pending.profile,
        directory: pending.directory,
      })
    },
    [passwordChangePending, proceedAfterAuthenticated]
  )

  const submitMfa = useCallback(
    async (code: string) => {
      if (!mfaPending) return
      setLoginLoading(true)
      setLoginError(null)

      const verified = await verifyTotpCode(mfaPending.factorId, normalizeTotpCode(code))
      if (verified.ok === false) {
        setLoginLoading(false)
        setLoginError(verified.message)
        return
      }

      const pending = mfaPending
      setMfaPending(null)
      applyLoginProfile(pending.profile, pending.directory)
      setLoginLoading(false)
    },
    [mfaPending, applyLoginProfile]
  )

  const cancelLoginFlow = useCallback(async () => {
    if (mfaPending?.kind === "enroll") {
      await cancelTotpEnrollment(mfaPending.factorId)
    }
    await clearSupabaseSession()
    setPasswordChangePending(null)
    setMfaPending(null)
    setLoginError(null)
    setLoginPassword("")
    setLoginLoading(false)
  }, [mfaPending])

  const logout = useCallback(async () => {
    await clearSupabaseSession()
    clearPersistedProfile()
    setIsLoggedIn(false)
    setPasswordChangePending(null)
    setMfaPending(null)
    setProfiles([])
    setActiveUserId("")
    navigate(ROUTES.login)
  }, [navigate])

  useEffect(() => {
    let cancelled = false

    async function bootstrapAuth() {
      if (!isSupabaseConfigured()) {
        if (!cancelled) setIsBootstrapping(false)
        return
      }

      const status = await getAuthSessionStatus()
      if (!cancelled && status.ok) {
        const workspace = await resolveWorkspaceAfterAuth(status.email)
        if (!cancelled && workspace.ok) {
          const activeAccount = await assertActiveStaffAccount(workspace.data.profile)
          if (activeAccount.ok === false) {
            await clearSupabaseSession()
            if (cancelled) return
            setLoginError(activeAccount.message)
            setIsBootstrapping(false)
            return
          }

          if (await userMustChangePassword()) {
            setPasswordChangePending({
              email: status.email,
              profile: workspace.data.profile,
              directory: workspace.data.directory,
            })
            setIsBootstrapping(false)
            return
          }

          const totp = await buildTotpPendingState(
            status.email,
            workspace.data.profile,
            workspace.data.directory
          )
          if (cancelled) return
          if (totp.ok === false) {
            await clearSupabaseSession()
            setLoginError(totp.message)
            setIsBootstrapping(false)
            return
          }
          if (totp.pending) {
            setMfaPending(totp.pending)
            setIsBootstrapping(false)
            return
          }

          restoreFromProfile(workspace.data.profile, workspace.data.directory)
          setIsBootstrapping(false)
          return
        }
      }

      if (!cancelled) setIsBootstrapping(false)
    }

    void bootstrapAuth()

    return () => {
      cancelled = true
    }
  }, [restoreFromProfile])

  useEffect(() => {
    if (!isSupabaseConfigured()) return

    const supabase = getSupabaseClient()
    if (!supabase) return

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event !== "SIGNED_OUT") return
      void (async () => {
        const { data } = await supabase.auth.getSession()
        if (data.session) return
        clearPersistedProfile()
        setIsLoggedIn(false)
        setPasswordChangePending(null)
        setMfaPending(null)
        setProfiles([])
        setActiveUserId("")
      })()
    })

    return () => subscription.unsubscribe()
  }, [])

  const value = useMemo(
    (): AuthContextValue => ({
      isLoggedIn,
      isBootstrapping,
      profiles,
      setProfiles,
      activeUserId,
      setActiveUserId,
      activeUser,
      loginEmail,
      setLoginEmail,
      loginPassword,
      setLoginPassword,
      loginLoading,
      loginError,
      passwordChangePending,
      mfaPending,
      triggerLogin,
      submitPasswordChange,
      submitMfa,
      cancelLoginFlow,
      logout,
      applyLoginProfile,
    }),
    [
      isLoggedIn,
      isBootstrapping,
      profiles,
      activeUserId,
      activeUser,
      loginEmail,
      loginPassword,
      loginLoading,
      loginError,
      passwordChangePending,
      mfaPending,
      triggerLogin,
      submitPasswordChange,
      submitMfa,
      cancelLoginFlow,
      logout,
      applyLoginProfile,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error("useAuth debe usarse dentro de AuthProvider")
  }
  return ctx
}
