import { API_URL } from './api'

/**
 * Almacén en memoria del access token (JWT). No se guarda en localStorage por
 * seguridad (XSS): el refresh token vive en una cookie httpOnly gestionada por
 * el backend, y el access token se renueva vía /api/auth/refresh.
 */
let accessToken: string | null = null

export const setAccessToken = (t: string | null) => {
  accessToken = t
}
export const getAccessToken = () => accessToken

export interface AuthUserDto {
  id: string
  email: string
  displayName: string
}

interface AuthResponse {
  user: AuthUserDto
  accessToken: string
}

const base = () => `${API_URL}/api/auth`

async function post<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${base()}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include', // envía/recibe la cookie httpOnly del refresh token
    body: body ? JSON.stringify(body) : undefined,
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const msg = (data as { message?: string }).message ?? 'Error de autenticación.'
    throw new Error(Array.isArray(msg) ? msg.join(' ') : msg)
  }
  return data as T
}

export const authApi = {
  register: (displayName: string, email: string, password: string) =>
    post<AuthResponse>('/register', { displayName, email, password }),
  login: (email: string, password: string) =>
    post<AuthResponse>('/login', { email, password }),
  refresh: () => post<{ accessToken: string }>('/refresh'),
  logout: () => post<{ ok: boolean }>('/logout'),
  forgotPassword: (email: string) => post<{ ok: boolean }>('/forgot-password', { email }),
  resetPassword: (token: string, password: string) =>
    post<{ ok: boolean }>('/reset-password', { token, password }),
}
