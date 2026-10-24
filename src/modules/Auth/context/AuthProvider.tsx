import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthUser, type UserProfile } from './authContext'
import { authApi, setAccessToken, type AuthUserDto, type MeDto } from '../../../shared/lib/authApi'

const toProfile = (p: MeDto['profile'] | undefined): UserProfile | null =>
  p && typeof p.xpToNext === 'number' ? { level: p.level, xp: p.xp, xpToNext: p.xpToNext } : null

const toUser = (u: AuthUserDto): AuthUser => ({ name: u.displayName, email: u.email, profile: null })

/**
 * Autenticación real contra el backend. El access token vive en memoria; el
 * refresh token en una cookie httpOnly. Al montar, intenta renovar sesión
 * (si había cookie válida) para mantener al usuario logueado tras recargar.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [ready, setReady] = useState(false)

  // Intento de rehidratar sesión al cargar la app.
  useEffect(() => {
    let cancelled = false
    authApi
      .refresh()
      .then((r) => {
        if (cancelled) return
        setAccessToken(r.accessToken)
        // Con el access token, pedimos el perfil para conocer el nombre.
        return authApi.me().then((me) => {
          if (!cancelled) setUser({ name: me.displayName, email: me.email, profile: toProfile(me.profile) })
        })
      })
      .catch(() => {
        /* sin sesión previa */
      })
      .finally(() => {
        if (!cancelled) setReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const applyProfile = useCallback((profile: UserProfile) => {
    setUser((u) => (u ? { ...u, profile } : u))
  }, [])

  const loadProfile = useCallback(async () => {
    try {
      const me = await authApi.me()
      const profile = toProfile(me.profile)
      if (profile) setUser((u) => (u ? { ...u, profile } : u))
    } catch {
      /* keep the previous profile */
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, accessToken } = await authApi.login(email, password)
    setAccessToken(accessToken)
    setUser(toUser(u))
    void loadProfile()
  }, [loadProfile])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user: u, accessToken } = await authApi.register(name, email, password)
    setAccessToken(accessToken)
    setUser(toUser(u))
    void loadProfile()
  }, [loadProfile])

  const logout = useCallback(() => {
    authApi.logout().catch(() => undefined)
    setAccessToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, register, logout, refreshProfile: loadProfile, applyProfile }),
    [user, login, register, logout, loadProfile, applyProfile],
  )

  // Evita parpadeo de "no logueado" mientras se rehidrata la sesión.
  if (!ready) return null

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
