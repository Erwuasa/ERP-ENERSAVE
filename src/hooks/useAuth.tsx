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
import { resolveWorkspaceAfterAuth } from "@/lib/supabase/user-profiles"
import { getSupabaseClient, isSupabaseConfigured } from "@/lib/supabase/client"
import { ROUTES, getDefaultAppPath } from "@/constants/navigation"
import { EMPTY_PROFILE, type Profile } from "@/types/profile"

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
  triggerLogin: (e: FormEvent) => Promise<void>
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

      applyLoginProfile(workspace.data.profile, workspace.data.directory)
      setLoginLoading(false)
    },
    [loginEmail, loginPassword, applyLoginProfile]
  )

  const logout = useCallback(async () => {
    await clearSupabaseSession()
    clearPersistedProfile()
    setIsLoggedIn(false)
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
      if (event === "SIGNED_OUT") {
        clearPersistedProfile()
        setIsLoggedIn(false)
        setProfiles([])
        setActiveUserId("")
      }
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
      triggerLogin,
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
      triggerLogin,
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
