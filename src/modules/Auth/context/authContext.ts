import { createContext, useContext } from 'react'

export interface UserProfile {
  level: number
  xp: number
  xpToNext: number
}

export interface AuthUser {
  name: string
  email: string
  /** null until the profile is loaded (or if the server has none). */
  profile: UserProfile | null
}

export interface AuthContextValue {
  user: AuthUser | null
  /** Inicia sesión. Lanza Error con mensaje legible si falla. */
  login: (email: string, password: string) => Promise<void>
  /** Crea una cuenta. Lanza Error con mensaje legible si falla. */
  register: (name: string, email: string, password: string) => Promise<void>
  /** Solicita el enlace de recuperación. */
  logout: () => void
  /** Reloads level/xp from the server (after a match or a mission claim). */
  refreshProfile: () => Promise<void>
  /** Applies a profile already returned by the server (e.g. a claim response). */
  applyProfile: (profile: UserProfile) => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
