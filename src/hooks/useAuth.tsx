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
import {
  AUTH_USER_STORAGE_KEY,
  clearSupabaseSession,
  getAuthSessionStatus,
  syncSupabaseSession,
} from "@/lib/supabase/auth-session"
import {
  getDevSandboxLoginCredentials,
  isDevSandboxQuickLoginEnabled,
  resolveDevSandboxPassword,
  shouldSkipDevSandboxMfa,
} from "@/lib/dev-sandbox-login"
import {
  cancelTotpEnrollment,
  inspectStaffMfa,
  normalizeTotpCode,
  sendStaffEmailOtp,
  startTotpEnrollment,
  verifyStaffEmailOtp,
  verifyTotpCode,
} from "@/lib/supabase/auth-mfa"
import { resolveWorkspaceAfterAuth } from "@/lib/supabase/user-profiles"
import { isStaffLoginAllowed } from "@/lib/supabase/erp-comerciales"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { ROUTES, getDefaultAppPath } from "@/constants/navigation"
import { EMPTY_PROFILE, isStaffRole, type Profile } from "@/types/profile"

type MfaWorkspace = {
  email: string
  hasTotp: boolean
  totpFactorId?: string
  profile: Profile
  directory: Profile[]
}

export type MfaPendingState =
  | ({ kind: "choose" } & MfaWorkspace)
  | ({ kind: "challenge"; factorId: string } & MfaWorkspace)
  | ({ kind: "enroll"; factorId: string; qrCode: string; secret: string } & MfaWorkspace)
  | ({ kind: "email" } & MfaWorkspace)

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
  mfaPending: MfaPendingState | null
  triggerLogin: (e: FormEvent) => Promise<void>
  submitMfa: (code: string) => Promise<void>
  chooseMfaMethod: (method: "totp" | "email") => Promise<void>
  resendEmailOtp: () => Promise<void>
  backToMfaChoose: () => Promise<void>
  cancelMfa: () => Promise<void>
  logout: () => Promise<void>
  applyLoginProfile: (profile: Profile) => void
  devSandboxQuickLogin: () => Promise<void>
  isDevSandboxQuickLoginEnabled: boolean
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

async function gateStaffWorkspace(
  email: string,
  profile: Profile,
  directory: Profile[]
): Promise<
  | { ok: true; pending: MfaPendingState | null }
  | { ok: false; message: string }
> {
  if (shouldSkipDevSandboxMfa(email)) {
    return { ok: true, pending: null }
  }

  const inspected = await inspectStaffMfa()
  if (inspected.ok === false) return inspected
  if (inspected.data.step === "none") return { ok: true, pending: null }

  const hasTotp = inspected.data.step === "challenge"
  const totpFactorId =
    inspected.data.step === "challenge" ? inspected.data.factorId : undefined
  return {
    ok: true,
    pending: {
      kind: "choose",
      email,
      hasTotp,
      totpFactorId,
      profile,
      directory,
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

  const completeStaffLogin = useCallback(
    async (searchEmail: string, password: string) => {
      setLoginLoading(true)
      setLoginError(null)

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

      const gated = await gateStaffWorkspace(
        searchEmail,
        workspace.data.profile,
        workspace.data.directory
      )
      if (gated.ok === false) {
        await clearSupabaseSession()
        setLoginLoading(false)
        setLoginError(gated.message)
        return
      }
      if (gated.pending) {
        setMfaPending(gated.pending)
        setLoginPassword("")
        setLoginLoading(false)
        return
      }

      applyLoginProfile(workspace.data.profile, workspace.data.directory)
      setLoginPassword("")
      setLoginLoading(false)
    },
    [applyLoginProfile]
  )

  const devSandboxQuickLogin = useCallback(async () => {
    if (!isDevSandboxQuickLoginEnabled()) return
    const { email, password } = getDevSandboxLoginCredentials()
    setLoginEmail(email)
    await completeStaffLogin(email, password)
  }, [completeStaffLogin])

  const triggerLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      const searchEmail = loginEmail.toLowerCase().trim()
      await completeStaffLogin(
        searchEmail,
        resolveDevSandboxPassword(searchEmail, loginPassword)
      )
    },
    [loginEmail, loginPassword, completeStaffLogin]
  )

  const submitMfa = useCallback(
    async (code: string) => {
      if (!mfaPending || mfaPending.kind === "choose") return
      setLoginLoading(true)
      setLoginError(null)

      const verified =
        mfaPending.kind === "email"
          ? await verifyStaffEmailOtp(mfaPending.email, code)
          : await verifyTotpCode(mfaPending.factorId, normalizeTotpCode(code))
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

  const chooseMfaMethod = useCallback(
    async (method: "totp" | "email") => {
      if (!mfaPending) return
      setLoginLoading(true)
      setLoginError(null)

      const workspace: MfaWorkspace = {
        email: mfaPending.email,
        hasTotp: mfaPending.hasTotp,
        totpFactorId: mfaPending.totpFactorId,
        profile: mfaPending.profile,
        directory: mfaPending.directory,
      }

      if (method === "email") {
        if (mfaPending.kind === "enroll") {
          await cancelTotpEnrollment(mfaPending.factorId)
        }
        const sent = await sendStaffEmailOtp(workspace.email)
        if (sent.ok === false) {
          setLoginLoading(false)
          setLoginError(sent.message)
          return
        }
        setMfaPending({ kind: "email", ...workspace })
        setLoginLoading(false)
        return
      }

      if (workspace.hasTotp && workspace.totpFactorId) {
        setMfaPending({
          kind: "challenge",
          factorId: workspace.totpFactorId,
          ...workspace,
        })
        setLoginLoading(false)
        return
      }

      const enrolled = await startTotpEnrollment()
      if (enrolled.ok === false) {
        setLoginLoading(false)
        setLoginError(enrolled.message)
        return
      }
      setMfaPending({
        kind: "enroll",
        factorId: enrolled.data.factorId,
        qrCode: enrolled.data.qrCode,
        secret: enrolled.data.secret,
        ...workspace,
      })
      setLoginLoading(false)
    },
    [mfaPending]
  )

  const resendEmailOtp = useCallback(async () => {
    if (!mfaPending || mfaPending.kind !== "email") return
    setLoginLoading(true)
    setLoginError(null)
    const sent = await sendStaffEmailOtp(mfaPending.email)
    setLoginLoading(false)
    if (sent.ok === false) {
      setLoginError(sent.message)
      return
    }
  }, [mfaPending])

  const backToMfaChoose = useCallback(async () => {
    if (!mfaPending || mfaPending.kind === "choose") return
    if (mfaPending.kind === "enroll") {
      await cancelTotpEnrollment(mfaPending.factorId)
    }
    setLoginError(null)
    setMfaPending({
      kind: "choose",
      email: mfaPending.email,
      hasTotp: mfaPending.hasTotp,
      totpFactorId: mfaPending.totpFactorId,
      profile: mfaPending.profile,
      directory: mfaPending.directory,
    })
  }, [mfaPending])

  const cancelMfa = useCallback(async () => {
    if (mfaPending?.kind === "enroll") {
      await cancelTotpEnrollment(mfaPending.factorId)
    }
    await clearSupabaseSession()
    setMfaPending(null)
    setLoginError(null)
    setLoginPassword("")
    setLoginLoading(false)
  }, [mfaPending])

  const logout = useCallback(async () => {
    await clearSupabaseSession()
    clearPersistedProfile()
    setIsLoggedIn(false)
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
          const gated = await gateStaffWorkspace(
            status.email,
            workspace.data.profile,
            workspace.data.directory
          )
          if (cancelled) return
          if (gated.ok === false) {
            await clearSupabaseSession()
            setLoginError(gated.message)
            setIsBootstrapping(false)
            return
          }
          if (gated.pending) {
            setMfaPending(gated.pending)
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
      mfaPending,
      triggerLogin,
      submitMfa,
      chooseMfaMethod,
      resendEmailOtp,
      backToMfaChoose,
      cancelMfa,
      logout,
      applyLoginProfile,
      devSandboxQuickLogin,
      isDevSandboxQuickLoginEnabled: isDevSandboxQuickLoginEnabled(),
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
      mfaPending,
      triggerLogin,
      submitMfa,
      chooseMfaMethod,
      resendEmailOtp,
      backToMfaChoose,
      cancelMfa,
      logout,
      applyLoginProfile,
      devSandboxQuickLogin,
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
