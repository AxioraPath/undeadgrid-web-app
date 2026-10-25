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

/** XP gained by each authenticated player of the match, keyed by slot. Absent for guests / old servers. */
export type MatchXp = Partial<Record<number, number>>

/** Per-slot end-of-match stats reported by the server. */
export interface MatchSlotStats {
  zombieKills: number
  structuresBuilt: number
  /** HP of damage dealt to the rival core. */
  coreDamageDealt: number
  coreHpPct: number
}

export type MatchEndReason = 'core_destroyed' | 'time_out' | 'opponent_left'

export type MatchOverPayload = RoomSnapshot & {
  xp?: MatchXp
  stats: { [slot: number]: MatchSlotStats }
  durationS: number
  winner: Slot | null
  reason: MatchEndReason
  mapName?: string
}

/** Slots that currently ask for a rematch. */
export interface RematchState {
  requested: number[]
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
  'match:over': (room: MatchOverPayload) => void
  'match:rematchState': (state: RematchState) => void
  'game:state': (state: GameState) => void
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
  'match:rematchRequest': (ack: (r: Ack) => void) => void
  'match:rematchCancel': (ack: (r: Ack) => void) => void
  'lobby:backToLobby': (ack: (r: Ack<RoomSnapshot>) => void) => void
  'chat:send': (p: { text: string }, ack: (r: Ack<ChatMessageSnapshot>) => void) => void
  'game:input': (p: { seq: number } & PlayerInput & { aim?: AimVector }, ack?: (r: Ack) => void) => void
  'game:command': (p: GameCommand, ack?: (r: Ack) => void) => void
  'game:sync': (ack: (r: Ack<GameSyncData>) => void) => void
  ping: (p: { t?: number } | undefined, ack: (r: Ack<{ t: number }>) => void) => void
}

// ---- Partida (servidor autoritativo a 30 ticks/s; ver EVENTS.md del backend) ----

export interface PlayerInput {
  up: boolean
  down: boolean
  left: boolean
  right: boolean
  action: boolean
  /** Disparar siempre (clic izquierdo / stick de apuntar), también dentro de la base. */
  fire?: boolean
}

/** Direction from the local player to the mouse in world space (server normalizes it). Omitted when mouse aiming is off. */
export interface AimVector {
  x: number
  y: number
}

export type HotbarSlot = 1 | 2 | 3 | 4 | 5 | 6 | 7

export interface Stock {
  wood: number
  metal: number
  medkits: number
  shells: number
}

export type GameCommand =
  | { type: 'hotbar'; slot: HotbarSlot }
  | { type: 'crateTake'; item: keyof Stock }
  /** Construir en una casilla de tu base (clic derecho / tocar la casilla). */
  | { type: 'build'; x: number; y: number }

export interface Point {
  x: number
  y: number
}

export interface Rect extends Point {
  w: number
  h: number
}

export interface MapObject {
  /** `lamp` es solo decoración (no bloquea). */
  kind: 'tree' | 'rock' | 'car' | 'container' | 'debris' | 'barrel' | 'tires' | 'barrier' | 'water' | 'lamp' | 'building' | 'train'
  x: number
  y: number
  w: number
  h: number
  variant: number
}

/** Tema del mapa (lo decide el servidor según el mapa de la sala). */
export type MapTheme = 'ciudad' | 'industrial'

export interface GameMap {
  seed: number
  /** Falta en servidores viejos: se toma como 'ciudad'. */
  theme?: MapTheme
  w: number
  h: number
  /** Capa de colisión por casilla (ver Tile). */
  tiles: number[]
  /** Capa de suelo por casilla, solo visual (ver Ground). */
  ground: number[]
  objects: MapObject[]
  bases: Record<Slot, Rect>
  cores: Record<Slot, Point>
  crates: Record<Slot, Point>
  spawns: Point[]
  /** Punto de la caja de armamento (centro de la plazoleta). */
  armory?: Point
}

export interface BuildHint {
  x: number
  y: number
  ok: boolean
  label: string
  /** Orientation the wall would have (server decides from the builder's facing). */
  orient: 'h' | 'v'
}

export interface GamePlayer {
  id: string
  slot: Slot
  name: string
  survivor: string
  x: number
  y: number
  dirX: number
  dirY: number
  hp: number
  alive: boolean
  respawnIn: number | null
  weapon: WeaponId
  build: 'wall' | 'trap' | 'turret'
  /** Arma pesada de la caja de armamento y su munición; torretas por colocar. */
  heavy?: HeavyId | null
  heavyAmmo?: number
  turrets?: number
  wood: number
  metal: number
  medkits: number
  shells: number
  kills: number
  zombieKills: number
  deaths: number
  /** Tiempo de partida del último disparo / daño (-1 = nunca), para las animaciones. */
  shotAt: number
  hurtAt: number
  /** Último ataque con cuchillo (-1 = nunca) y su dirección. */
  knifeAt?: number
  knifeDirX?: number
  knifeDirY?: number
  inBase: boolean
  onCrate: boolean
  buildHint: BuildHint | null
}

/** [id, x, y, hp, maxHp, kind(0 normal | 1 rápido | 2 tanque), attackAt, hurtAt] */
export type ZombieTuple = [number, number, number, number, number, number, number, number]
/** [id, x, y, vx, vy, tipo(0 bala | 1 sniper | 2 cohete)] */
export type BulletTuple = [number, number, number, number, number, number?]

export type WeaponId = 'pistol' | 'shotgun' | 'smg' | 'sniper' | 'rocket'
export type HeavyId = 'smg' | 'sniper' | 'rocket'
export type ProjectileKind = 'bullet' | 'sniper' | 'rocket'
export const PROJECTILE_KINDS: ProjectileKind[] = ['bullet', 'sniper', 'rocket']

/** Nombre e ícono de cada arma pesada (los íconos están en /assets/game/iconos). */
export const HEAVY_WEAPONS: Record<HeavyId, { name: string; icon: string }> = {
  smg: { name: 'Ametralladora', icon: 'ametralladora' },
  sniper: { name: 'Sniper', icon: 'sniper' },
  rocket: { name: 'Lanzacohetes', icon: 'lanzacohetes' },
}
/** [casilla, tipo(0 madera | 1 reforzada | 2 trampa), hp, maxHp, dueño, orientación('h' | 'v')] */
export type StructureTuple = [number, number, number, number, Slot, 'h' | 'v']

export type ZombieKind = 'normal' | 'fast' | 'tank'

export type GameEvent =
  | { type: 'shot'; x: number; y: number; dirX: number; dirY: number; slot: Slot }
  | { type: 'explosion'; x: number; y: number }
  | { type: 'knife'; slot: Slot; x: number; y: number }
  | { type: 'hit'; x: number; y: number }
  | { type: 'zombieDied'; x: number; y: number; kind: ZombieKind }
  | { type: 'playerDied'; slot: Slot; x: number; y: number }
  | { type: 'built'; x: number; y: number; what: string }
  | { type: 'rejected'; slot: Slot; reason: string }
  | { type: 'phase'; label: string }
  | { type: 'coreHit'; slot: Slot }
  | { type: 'armoryOpened'; slot: Slot; weapon?: HeavyId }
  | { type: 'armoryReady'; weapon?: HeavyId }

export interface GameState {
  tick: number
  time: number
  phase: { id: PhaseId; label: string; start: number; end: number; wave: number }
  maxWave: number
  players: GamePlayer[]
  zombies: ZombieTuple[]
  bullets: BulletTuple[]
  structures: StructureTuple[]
  cores: Record<Slot, number>
  crates: Record<Slot, Stock>
  armory?: { available: boolean; openedBy: Slot | null; progress: Partial<Record<Slot, number>> }
  /** Torretas: [casilla, aimX, aimY, tiros en el cargador, recargando (0/1), disparando (0/1)]. */
  turrets?: [number, number, number, number, number, number?][]
  events: GameEvent[]
  result: { winner: Slot | 0; reason: string; durationS: number; byTime: boolean } | null
}

export interface GameSyncData {
  map: GameMap
  state: GameState
}

/** Casilla lógica en px (el servidor trabaja en casillas). */
export const TILE = 32
export const MATCH_DURATION = 240
export const CORE_HP = 500
/** Construir con clic/toque: casillas de distancia máxima (igual que el servidor). */
export const BUILD_REACH = 4.5
export const PLAYER_MAX_HP = 100

/** Capa de colisión del mapa (mapgen del servidor). */
export const Tile = { GRASS: 0, BORDER: 1, BASE: 5, ROAD: 6, WATER: 7 } as const
/** Capa de suelo del mapa (mapgen del servidor). */
export const Ground = { GRASS: 0, DIRT: 1, ROAD: 2, BASE: 3, WATER: 4, GRAVEL: 5, BRIDGE: 6, PLAZA: 7, RAIL: 8 } as const

export const ZOMBIE_KINDS: ZombieKind[] = ['normal', 'fast', 'tank']
export const STRUCTURE_TYPES = ['wood', 'reinforced', 'trap', 'turret'] as const

/** Caja de armamento: segundos para abrirla (igual que el servidor). */
export const ARMORY_OPEN_S = 5

/** Estructuras del mapa (variant de `building`): sprite y casillas que ocupan (igual que el servidor). */
export const BUILDINGS = [
  { name: 'almacen', w: 3, h: 3 },
  { name: 'tienda', w: 3, h: 2 },
  { name: 'torre-vigilancia', w: 2, h: 3 },
  { name: 'torre-agua', w: 2, h: 3 },
  { name: 'generador', w: 2, h: 2 },
  { name: 'tanque-combustible', w: 3, h: 2 },
  { name: 'muro-piedra-h', w: 2, h: 1 },
  { name: 'valla-madera', w: 2, h: 1 },
  { name: 'sacos-h', w: 2, h: 1 },
  { name: 'ind-taller', w: 3, h: 3 },
  { name: 'ind-hangar', w: 4, h: 3 },
  { name: 'ind-sala-control', w: 3, h: 3 },
  { name: 'ind-planta-bombeo', w: 3, h: 3 },
  { name: 'ind-refugio-generador', w: 3, h: 3 },
  { name: 'ind-cobertizo', w: 3, h: 2 },
  { name: 'urb-gasolinera', w: 3, h: 3 },
  { name: 'urb-bomberos', w: 4, h: 3 },
  { name: 'helicoptero-militar-derribado', w: 4, h: 3 },
  { name: 'ind-silo', w: 2, h: 2 },
  { name: 'ind-contenedores-apilados', w: 2, h: 2 },
  { name: 'urb-parada-autobus', w: 2, h: 2 },
  { name: 'valla-metal-v-sana', w: 1, h: 2 },
  { name: 'ind-control-h', w: 3, h: 2 },
] as const
