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
  cancelTotpEnrollment,
  inspectStaffMfa,
  normalizeTotpCode,
  startTotpEnrollment,
  verifyTotpCode,
} from "@/lib/supabase/auth-mfa"
import { resolveWorkspaceAfterAuth } from "@/lib/supabase/user-profiles"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { ROUTES, getDefaultAppPath } from "@/constants/navigation"
import { EMPTY_PROFILE, isStaffRole, type Profile } from "@/types/profile"

export type MfaPendingState =
  | {
      kind: "challenge"
      factorId: string
      profile: Profile
      directory: Profile[]
    }
  | {
      kind: "enroll"
      factorId: string
      qrCode: string
      secret: string
      profile: Profile
      directory: Profile[]
    }

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
  cancelMfa: () => Promise<void>
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

async function gateStaffWorkspace(
  profile: Profile,
  directory: Profile[]
): Promise<
  | { ok: true; pending: MfaPendingState | null }
  | { ok: false; message: string }
> {
  if (!isStaffRole(profile.role)) return { ok: true, pending: null }

  const inspected = await inspectStaffMfa(true)
  if (inspected.ok === false) return inspected
  if (inspected.data.step === "none") return { ok: true, pending: null }
  if (inspected.data.step === "challenge") {
    return {
      ok: true,
      pending: {
        kind: "challenge",
        factorId: inspected.data.factorId,
        profile,
        directory,
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

  const triggerLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setLoginLoading(true)
      setLoginError(null)

      const searchEmail = loginEmail.toLowerCase().trim()

      if (!isSupabaseConfigured()) {
        setLoginLoading(false)
        setLoginError("Supabase no configurado")
        return
      }

      const sessionResult = await syncSupabaseSession(searchEmail, loginPassword)
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

      const gated = await gateStaffWorkspace(
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
    [loginEmail, loginPassword, applyLoginProfile]
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
          const gated = await gateStaffWorkspace(
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
      cancelMfa,
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
      mfaPending,
      triggerLogin,
      submitMfa,
      cancelMfa,
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
