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
  clearSupabaseSession,
  DEFAULT_DEV_PASSWORD,
  getAuthSessionStatus,
  syncSupabaseSession,
} from "@/lib/supabase/auth-session"
import { isSupabaseConfigured } from "@/lib/supabase/client"
import { ROUTES, getDefaultAppPath } from "@/constants/navigation"
import { SEED_PROFILES, type Profile } from "@/types/profile"

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
  quickLoginAs: (profileId: string) => Promise<void>
  logout: () => Promise<void>
  applyLoginProfile: (profile: Profile) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

function normalizeLoginEmail(raw: string): string {
  let searchEmail = raw.toLowerCase().trim()

  if (
    searchEmail === "superadmin@enersave.com" ||
    searchEmail === "superadmin@ener-erp.com"
  ) {
    searchEmail = "carlos@enersave.com"
  } else if (
    searchEmail === "jefecomercial@enersave.com" ||
    searchEmail === "jefecomercial@ener-erp.com"
  ) {
    searchEmail = "elena@enersave.com"
  } else if (
    searchEmail === "comercial@enersave.com" ||
    searchEmail === "comercial@ener-erp.com"
  ) {
    searchEmail = "ignacio@enersave.com"
  }

  return searchEmail
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const [isBootstrapping, setIsBootstrapping] = useState(true)
  const [isLoggedIn, setIsLoggedIn] = useState(false)
  const [profiles, setProfiles] = useState<Profile[]>(SEED_PROFILES)
  const [activeUserId, setActiveUserId] = useState("usr-1")
  const [loginEmail, setLoginEmail] = useState("carlos@enersave.com")
  const [loginPassword, setLoginPassword] = useState(DEFAULT_DEV_PASSWORD)
  const [loginLoading, setLoginLoading] = useState(false)
  const [loginError, setLoginError] = useState<string | null>(null)

  const activeUser = useMemo(
    () => profiles.find((p) => p.id === activeUserId) ?? profiles[0],
    [profiles, activeUserId]
  )

  const applyLoginProfile = useCallback(
    (profile: Profile) => {
      setActiveUserId(profile.id)
      setIsLoggedIn(true)
      navigate(getDefaultAppPath(profile.role))
    },
    [navigate]
  )

  const ensureSupabaseForProfile = useCallback(
    async (profile: Profile, password: string): Promise<boolean> => {
      if (!isSupabaseConfigured()) return true
      const sessionResult = await syncSupabaseSession(profile.email, password, {
        comercialId: profile.id,
        role: profile.role,
        fullName: profile.fullName,
      })
      if (sessionResult.ok === false) {
        setLoginError(
          `No se pudo conectar con Supabase: ${sessionResult.message}. Crea el usuario en Auth con el mismo email y contraseña, o desactiva «Confirm email» en Supabase.`
        )
        return false
      }
      return true
    },
    []
  )

  const quickLoginAs = useCallback(
    async (profileId: string) => {
      setLoginLoading(true)
      setLoginError(null)
      const matches = profiles.find((p) => p.id === profileId)
      if (!matches) {
        setLoginLoading(false)
        setLoginError("Perfil demo no encontrado.")
        return
      }
      setLoginEmail(matches.email)
      if (!(await ensureSupabaseForProfile(matches, DEFAULT_DEV_PASSWORD))) {
        setLoginLoading(false)
        return
      }
      applyLoginProfile(matches)
      setLoginLoading(false)
    },
    [profiles, ensureSupabaseForProfile, applyLoginProfile]
  )

  const triggerLogin = useCallback(
    async (e: FormEvent) => {
      e.preventDefault()
      setLoginLoading(true)
      setLoginError(null)

      const searchEmail = normalizeLoginEmail(loginEmail)
      const matches = profiles.find((p) => p.email.toLowerCase() === searchEmail)

      if (!matches) {
        setLoginLoading(false)
        setLoginError(
          "Credenciales incorrectas: Correo no registrado en el servidor corporativo de ENERSAVE."
        )
        return
      }

      if (matches.status === "suspendido") {
        setLoginLoading(false)
        setLoginError(
          "La cuenta de este agente se encuentra suspendida temporalmente por administración."
        )
        return
      }

      if (isSupabaseConfigured()) {
        if (!(await ensureSupabaseForProfile(matches, loginPassword))) {
          setLoginLoading(false)
          return
        }
      }

      applyLoginProfile(matches)
      setLoginLoading(false)
    },
    [loginEmail, loginPassword, profiles, ensureSupabaseForProfile, applyLoginProfile]
  )

  const logout = useCallback(async () => {
    await clearSupabaseSession()
    setIsLoggedIn(false)
    navigate(ROUTES.login)
  }, [navigate])

  useEffect(() => {
    if (!isSupabaseConfigured()) {
      setIsBootstrapping(false)
      return
    }

    let cancelled = false
    ;(async () => {
      const status = await getAuthSessionStatus()
      if (cancelled || !status.ok) {
        setIsBootstrapping(false)
        return
      }
      const matches = profiles.find(
        (p) => p.email.toLowerCase() === status.email.toLowerCase()
      )
      if (!matches || matches.status === "suspendido") {
        setIsBootstrapping(false)
        return
      }
      setActiveUserId(matches.id)
      setIsLoggedIn(true)
      setIsBootstrapping(false)
    })()

    return () => {
      cancelled = true
    }
  }, [profiles])

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
      quickLoginAs,
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
      quickLoginAs,
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
