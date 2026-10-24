import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthUser } from './authContext'
import { authApi, setAccessToken, type AuthUserDto } from '../../../shared/lib/authApi'

const toUser = (u: AuthUserDto): AuthUser => ({ name: u.displayName, email: u.email })

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
        return fetch(`${import.meta.env.VITE_API_URL ?? ''}/api/me`, {
          headers: { Authorization: `Bearer ${r.accessToken}` },
        })
          .then((res) => (res.ok ? res.json() : null))
          .then((me) => {
            if (!cancelled && me) setUser({ name: me.displayName, email: me.email })
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

  const login = useCallback(async (email: string, password: string) => {
    const { user: u, accessToken } = await authApi.login(email, password)
    setAccessToken(accessToken)
    setUser(toUser(u))
  }, [])

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user: u, accessToken } = await authApi.register(name, email, password)
    setAccessToken(accessToken)
    setUser(toUser(u))
  }, [])

  const requestReset = useCallback(async (email: string) => {
    await authApi.forgotPassword(email)
  }, [])

  const logout = useCallback(() => {
    authApi.logout().catch(() => undefined)
    setAccessToken(null)
    setUser(null)
  }, [])

  const value = useMemo(
    () => ({ user, login, register, requestReset, logout }),
    [user, login, register, requestReset, logout],
  )

  // Evita parpadeo de "no logueado" mientras se rehidrata la sesión.
  if (!ready) return null

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
