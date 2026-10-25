import type { GameMap, GameState, ProjectileKind, Slot, WeaponId, ZombieKind } from '../../shared/lib/contracts'
import { PROJECTILE_KINDS, STRUCTURE_TYPES, ZOMBIE_KINDS } from '../../shared/lib/contracts'

/** Retraso de dibujo: se pinta ~100 ms en el pasado para tener siempre dos estados entre los que interpolar. */
const INTERP_DELAY_S = 0.1
const BUFFER_SIZE = 30

export const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

/** Interpolación lineal; t se limita entre 0 y 1. */
export const lerp = (a: number, b: number, t: number) => a + (b - a) * clamp(t, 0, 1)

export interface PlayerView {
  id: string
  slot: Slot
  survivor: string
  x: number
  y: number
  dirX: number
  dirY: number
  moving: boolean
  alive: boolean
  hp: number
  weapon: WeaponId
  build: 'wall' | 'trap' | 'turret'
  shotAt: number
  hurtAt: number
  knifeAt: number
  knifeDirX: number
  knifeDirY: number
}

export interface ZombieView {
  id: number
  x: number
  y: number
  dx: number
  dy: number
  moving: boolean
  hp: number
  maxHp: number
  kind: ZombieKind
  attackAt: number
  hurtAt: number
}

export interface StructureView {
  type: (typeof STRUCTURE_TYPES)[number]
  hp: number
  maxHp: number
  owner: Slot
  /** Wall orientation decided by the server (traps ignore it). */
  orient: 'h' | 'v'
}

/** Lo que dibuja el canvas en un cuadro: posiciones ya interpoladas. */
export interface View {
  time: number
  map: GameMap
  players: PlayerView[]
  zombies: ZombieView[]
  bullets: { x: number; y: number; vx: number; vy: number; kind: ProjectileKind }[]
  structures: Map<number, StructureView>
  cores: Record<Slot, number>
  /** Torretas por casilla: hacia dónde apuntan, si recargan y si acaban de disparar. */
  turrets: Map<number, TurretView>
  armory: { available: boolean; progress: Partial<Record<Slot, number>> } | null
}

export interface TurretView {
  aimX: number
  aimY: number
  ammo: number
  reloading: boolean
  firing: boolean
}

interface Entry {
  state: GameState
  recvAt: number // ms locales
}

/** Guarda los últimos estados del servidor y entrega una vista interpolada para el instante actual. */
export class SnapshotBuffer {
  private entries: Entry[] = []

  push(state: GameState, recvAt: number) {
    const last = this.entries[this.entries.length - 1]
    if (last && state.tick <= last.state.tick) return
    this.entries.push({ state, recvAt })
    if (this.entries.length > BUFFER_SIZE) this.entries.shift()
  }

  get latest(): GameState | null {
    return this.entries[this.entries.length - 1]?.state ?? null
  }

  clear() {
    this.entries = []
  }

  sample(map: GameMap, nowMs: number): View | null {
    const n = this.entries.length
    if (!n) return null
    const newest = this.entries[n - 1]
    const renderTime = newest.state.time + (nowMs - newest.recvAt) / 1000 - INTERP_DELAY_S

    let a = this.entries[0]
    let b = newest
    for (let i = n - 1; i > 0; i--) {
      if (this.entries[i - 1].state.time <= renderTime) {
        a = this.entries[i - 1]
        b = this.entries[i]
        break
      }
    }
    const span = b.state.time - a.state.time
    const t = span > 0 ? (renderTime - a.state.time) / span : 1
    return buildView(map, a.state, b.state, t, clamp(renderTime, a.state.time, b.state.time))
  }
}

function buildView(map: GameMap, a: GameState, b: GameState, t: number, time: number): View {
  const prevPlayers = new Map(a.players.map((p) => [p.id, p]))
  const players: PlayerView[] = b.players.map((p) => {
    const q = prevPlayers.get(p.id) ?? p
    return {
      id: p.id,
      slot: p.slot,
      survivor: p.survivor,
      x: lerp(q.x, p.x, t),
      y: lerp(q.y, p.y, t),
      dirX: p.dirX,
      dirY: p.dirY,
      moving: Math.abs(p.x - q.x) + Math.abs(p.y - q.y) > 0.001,
      alive: p.alive,
      hp: p.hp,
      weapon: p.weapon,
      build: p.build,
      shotAt: p.shotAt,
      hurtAt: p.hurtAt,
      knifeAt: p.knifeAt ?? -1,
      knifeDirX: p.knifeDirX ?? 0,
      knifeDirY: p.knifeDirY ?? 1,
    }
  })

  const prevZombies = new Map(a.zombies.map((z) => [z[0], z]))
  const zombies: ZombieView[] = b.zombies.map(([id, x, y, hp, maxHp, kind, attackAt, hurtAt]) => {
    const q = prevZombies.get(id)
    const qx = q ? q[1] : x
    const qy = q ? q[2] : y
    return {
      id,
      x: lerp(qx, x, t),
      y: lerp(qy, y, t),
      dx: x - qx,
      dy: y - qy,
      moving: Math.abs(x - qx) + Math.abs(y - qy) > 0.0005,
      hp,
      maxHp,
      kind: ZOMBIE_KINDS[kind] ?? 'normal',
      attackAt,
      hurtAt,
    }
  })

  const prevBullets = new Map(a.bullets.map((bl) => [bl[0], bl]))
  const bullets = b.bullets.map(([id, x, y, vx, vy, kind]) => {
    const q = prevBullets.get(id)
    return { x: q ? lerp(q[1], x, t) : x, y: q ? lerp(q[2], y, t) : y, vx, vy, kind: PROJECTILE_KINDS[kind ?? 0] ?? 'bullet' }
  })

  const structures = new Map<number, StructureView>()
  for (const [key, type, hp, maxHp, owner, orient] of b.structures)
    structures.set(key, { type: STRUCTURE_TYPES[type], hp, maxHp, owner, orient: orient === 'v' ? 'v' : 'h' })

  const turrets = new Map<number, TurretView>()
  for (const [key, aimX, aimY, ammo, reloading, firing] of b.turrets ?? [])
    turrets.set(key, { aimX, aimY, ammo, reloading: reloading === 1, firing: firing === 1 })
  const armory = b.armory ? { available: b.armory.available, progress: b.armory.progress } : null

  return { time, map, players, zombies, bullets, structures, cores: b.cores, turrets, armory }
}
