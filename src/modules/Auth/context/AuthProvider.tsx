import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { AuthContext, type AuthUser } from './authContext'

const STORAGE_KEY = 'undeadgrid:auth'

/**
 * Auth SIMULADA en local (sin backend todavía). Guarda la sesión en
 * localStorage para "Recordarme". Diseñada para reemplazar su implementación
 * por llamadas reales al backend cuando exista (la interfaz no cambiará).
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw ? (JSON.parse(raw) as AuthUser) : null
    } catch {
      return null
    }
  })

  const persist = useCallback((u: AuthUser | null, remember: boolean) => {
    setUser(u)
    try {
      if (u && remember) localStorage.setItem(STORAGE_KEY, JSON.stringify(u))
      else localStorage.removeItem(STORAGE_KEY)
    } catch {
      // storage no disponible; no es crítico.
    }
  }, [])

  const login = useCallback(
    async (email: string, password: string, remember: boolean) => {
      // TODO(backend): POST /api/auth/login. Por ahora validación local.
      await new Promise((r) => setTimeout(r, 400))
      if (!email || !password) throw new Error('Introduce tu correo y contraseña.')
      const name = email.split('@')[0] || 'Superviviente'
      persist({ name, email }, remember)
    },
    [persist],
  )

  const register = useCallback(
    async (name: string, email: string, password: string) => {
      // TODO(backend): POST /api/auth/register.
      await new Promise((r) => setTimeout(r, 400))
      if (!name.trim()) throw new Error('Introduce tu nombre de jugador.')
      if (password.length < 12) throw new Error('La contraseña debe tener al menos 12 caracteres.')
      persist({ name: name.trim(), email }, true)
    },
    [persist],
  )

  const requestReset = useCallback(async (email: string) => {
    // TODO(backend): POST /api/auth/forgot-password.
    await new Promise((r) => setTimeout(r, 400))
    if (!email) throw new Error('Introduce tu correo electrónico.')
  }, [])

  const logout = useCallback(() => persist(null, false), [persist])

  const value = useMemo(
    () => ({ user, login, register, requestReset, logout }),
    [user, login, register, requestReset, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
