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

export interface PlayerStatsDto {
  matchesPlayed: number
  wins: number
  losses: number
  draws: number
  coresDestroyed: number
  zombiesKilled: number
  playerKills: number
  deaths: number
  structuresBuilt: number
  totalPlaytimeS: number
  bestStreak: number
  currentStreak: number
}

/** xp = progreso DENTRO del nivel actual (0 <= xp < xpToNext). */
export interface ProfileDto {
  level: number
  xp: number
  xpToNext: number
  preferredSurvivor: string
}

export interface MissionDto {
  key: string
  type: 'daily' | 'milestone'
  title: string
  description: string
  goal: number
  progress: number
  reward: number
  status: 'active' | 'completed' | 'claimed'
  resetsAt?: string
}

export interface MissionsResponse {
  missions: MissionDto[]
  dailyResetsAt: string
}

export interface ClaimResponse {
  reward: number
  leveledUp: boolean
  newLevel: number
  profile: { level: number; xp: number; xpToNext: number }
}

export interface MeDto {
  id: string
  email: string
  displayName: string
  createdAt: string
  profile: ProfileDto | null
  stats: PlayerStatsDto | null
}

/** Perfil y estadísticas del jugador con sesión (requiere el access token). */
async function me(): Promise<MeDto> {
  const res = await fetch(`${API_URL}/api/me`, {
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!res.ok) throw new Error('No se pudo cargar tu perfil.')
  return (await res.json()) as MeDto
}

const authHeaders = (): Record<string, string> => (accessToken ? { Authorization: `Bearer ${accessToken}` } : {})

/** Misiones diarias y permanentes del jugador. */
async function getMissions(): Promise<MissionsResponse> {
  const res = await fetch(`${API_URL}/api/me/missions`, { headers: authHeaders(), credentials: 'include' })
  if (!res.ok) throw new Error('No se pudieron cargar las misiones.')
  return (await res.json()) as MissionsResponse
}

/** Reclama la recompensa de una misión completada. */
async function claimMission(key: string): Promise<ClaimResponse> {
  const res = await fetch(`${API_URL}/api/me/missions/${encodeURIComponent(key)}/claim`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    const msg = (data as { message?: string }).message
    throw new Error((Array.isArray(msg) ? msg.join(' ') : msg) ?? 'No se pudo reclamar la recompensa.')
  }
  return (await res.json()) as ClaimResponse
}

export const authApi = {
  me,
  getMissions,
  claimMission,
  register: (displayName: string, email: string, password: string) =>
    post<AuthResponse>('/register', { displayName, email, password }),
  login: (email: string, password: string) =>
    post<AuthResponse>('/login', { email, password }),
  refresh: () => post<{ accessToken: string }>('/refresh'),
  logout: () => post<{ ok: boolean }>('/logout'),
}
