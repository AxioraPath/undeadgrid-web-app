// Contratos del servidor (espejo de service-undeadgrid/src/contracts).
// Mantener sincronizado con EVENTS.md. Son los tipos que viajan por el socket.

export type Slot = 1 | 2

export type RoomStatus = 'lobby' | 'selection' | 'preparation' | 'combat' | 'results'
export type PhaseId = 'prep' | 'wave1' | 'wave2' | 'horde'

export interface ApiError {
  code: string
  message: string
  details?: unknown
}

export type Ack<T = undefined> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError }

export interface PlayerSnapshot {
  id: string
  name: string
  slot: Slot
  isHost: boolean
  ready: boolean
  survivor: string
  survivorConfirmed: boolean
  connected: boolean
}

export interface ChatMessageSnapshot {
  id: number
  slot: Slot
  author: string
  text: string
  at: number
}

export interface CombatSnapshot {
  elapsed: number
  phase: PhaseId
  wave: number
  cores: Record<Slot, number>
}

export interface MatchResult {
  winner: Slot | null
  reason: 'core_destroyed' | 'opponent_left' | 'time_out'
  cores: Record<Slot, number>
}

export interface RoomSnapshot {
  code: string
  status: RoomStatus
  seed: number
  mapId: string
  difficulty: string
  hostSlot: Slot
  players: PlayerSnapshot[]
  combat: CombatSnapshot | null
  result: MatchResult | null
  version: number
  at: number
}

export interface JoinedData {
  sessionId: string
  slot: Slot
  isHost: boolean
  room: RoomSnapshot
}

// Eventos servidor -> cliente
export interface ServerToClientEvents {
  'lobby:state': (room: RoomSnapshot) => void
  'lobby:playerJoined': (d: { slot: Slot; name: string }) => void
  'lobby:playerLeft': (d: { slot: Slot; name: string; reason: 'left' | 'disconnected' }) => void
  'lobby:playerReconnected': (d: { slot: Slot; name: string }) => void
  'lobby:closed': (d: { reason: string }) => void
  'chat:message': (msg: ChatMessageSnapshot) => void
  'combat:phase': (d: CombatSnapshot) => void
  'combat:tick': (d: CombatSnapshot) => void
  'match:over': (room: RoomSnapshot) => void
}

// Eventos cliente -> servidor (con ack tipado)
export interface ClientToServerEvents {
  'lobby:create': (p: { name: string; survivor?: string }, ack: (r: Ack<JoinedData>) => void) => void
  'lobby:join': (
    p: { code: string; name: string; survivor?: string; sessionId?: string },
    ack: (r: Ack<JoinedData>) => void,
  ) => void
  'lobby:leave': (ack: (r: Ack) => void) => void
  'lobby:rename': (p: { name: string }, ack: (r: Ack<RoomSnapshot>) => void) => void
  'lobby:ready': (p: { ready: boolean }, ack: (r: Ack<RoomSnapshot>) => void) => void
  'lobby:selectSurvivor': (p: { survivor: string }, ack: (r: Ack<RoomSnapshot>) => void) => void
  'lobby:confirmSurvivor': (ack: (r: Ack<RoomSnapshot>) => void) => void
  'lobby:setMap': (p: { mapId: string }, ack: (r: Ack<RoomSnapshot>) => void) => void
  'lobby:setDifficulty': (p: { difficulty: string }, ack: (r: Ack<RoomSnapshot>) => void) => void
  'lobby:start': (ack: (r: Ack<RoomSnapshot>) => void) => void
  'chat:send': (p: { text: string }, ack: (r: Ack<ChatMessageSnapshot>) => void) => void
  'combat:coreDamage': (p: { target: Slot; amount: number }, ack: (r: Ack<CombatSnapshot>) => void) => void
  ping: (p: { t?: number } | undefined, ack: (r: Ack<{ t: number }>) => void) => void
}
