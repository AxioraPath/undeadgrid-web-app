import { createContext, useContext } from 'react'

export interface AuthUser {
  name: string
  email: string
}

export interface AuthContextValue {
  user: AuthUser | null
  /** Inicia sesión. Lanza Error con mensaje legible si falla. */
  login: (email: string, password: string) => Promise<void>
  /** Crea una cuenta. Lanza Error con mensaje legible si falla. */
  register: (name: string, email: string, password: string) => Promise<void>
  /** Solicita el enlace de recuperación. */
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
