import { BASE_SIZE, MAP_H, MAP_W, type Slot } from './constants'
import { createRng } from './rng'

export const Tile = {
  GRASS: 0,
  BORDER: 1,
  ROCK: 2,
  CAR: 3,
  DEBRIS: 4,
  BASE: 5,
} as const

export type TileKind = (typeof Tile)[keyof typeof Tile]

export interface Rect {
  x: number
  y: number
  w: number
  h: number
}

export interface Point {
  x: number
  y: number
}

export interface GameMapData {
  seed: number
  w: number
  h: number
  tiles: Uint8Array
  bases: Record<Slot, Rect>
  /** Casilla superior izquierda del núcleo (ocupa 2 × 2). */
  cores: Record<Slot, Point>
  crates: Record<Slot, Point>
  spawns: Point[]
}

const SOLID_TILES = new Set<number>([Tile.BORDER, Tile.ROCK, Tile.CAR, Tile.DEBRIS])

export const isSolidTileKind = (k: number) => SOLID_TILES.has(k)

export const inRect = (r: Rect, x: number, y: number) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h

const idx = (x: number, y: number) => y * MAP_W + x

/** Paso 5: BFS desde la base 1; deben alcanzarse la base 2 y todos los puntos de zombis. */
export function isMapReachable(map: GameMapData): boolean {
  const blocked = (x: number, y: number) =>
    isSolidTileKind(map.tiles[idx(x, y)]) ||
    ([1, 2] as Slot[]).some((s) => x >= map.cores[s].x && x < map.cores[s].x + 2 && y >= map.cores[s].y && y < map.cores[s].y + 2)

  const start = { x: map.bases[1].x + 1, y: map.bases[1].y + 1 }
  const seen = new Uint8Array(MAP_W * MAP_H)
  const queue: Point[] = [start]
  seen[idx(start.x, start.y)] = 1
  while (queue.length) {
    const { x, y } = queue.shift()!
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx
      const ny = y + dy
      if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) continue
      if (seen[idx(nx, ny)] || blocked(nx, ny)) continue
      seen[idx(nx, ny)] = 1
      queue.push({ x: nx, y: ny })
    }
  }
  const targets = [{ x: map.bases[2].x + 1, y: map.bases[2].y + 1 }, ...map.spawns]
  return targets.every((t) => seen[idx(t.x, t.y)] === 1)
}

function buildMap(seed: number): GameMapData {
  const rng = createRng(seed)
  const tiles = new Uint8Array(MAP_W * MAP_H)

  // 1. Cuadrícula vacía con borde de muros fijos.
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      tiles[idx(x, y)] = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? Tile.BORDER : Tile.GRASS

  // 2. Bases 8 × 8 en esquinas opuestas, con núcleo al centro y caja al lado.
  const bases: Record<Slot, Rect> = {
    1: { x: 1, y: 1, w: BASE_SIZE, h: BASE_SIZE },
    2: { x: MAP_W - 1 - BASE_SIZE, y: MAP_H - 1 - BASE_SIZE, w: BASE_SIZE, h: BASE_SIZE },
  }
  const cores: Record<Slot, Point> = {
    1: { x: bases[1].x + 3, y: bases[1].y + 3 },
    2: { x: bases[2].x + 3, y: bases[2].y + 3 },
  }
  // Una casilla libre entre núcleo y caja para poder pisarla; la de J2 va en espejo.
  const crates: Record<Slot, Point> = {
    1: { x: cores[1].x + 3, y: cores[1].y },
    2: { x: cores[2].x - 2, y: cores[2].y + 1 },
  }
  for (const s of [1, 2] as Slot[]) {
    const b = bases[s]
    for (let y = b.y; y < b.y + b.h; y++) for (let x = b.x; x < b.x + b.w; x++) tiles[idx(x, y)] = Tile.BASE
  }

  // 4. Puntos de aparición de zombis en las orillas (simétricos).
  const spawns: Point[] = [
    { x: MAP_W / 2 - 1, y: 1 },
    { x: MAP_W / 2, y: MAP_H - 2 },
    { x: 1, y: MAP_H / 2 },
    { x: MAP_W - 2, y: MAP_H / 2 - 1 },
  ]

  // 3. Obstáculos al azar fuera de las bases, en espejo para que el mapa sea justo.
  const reserved = (x: number, y: number) =>
    ([1, 2] as Slot[]).some((s) => {
      const b = bases[s]
      return x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h
    }) || spawns.some((p) => Math.abs(p.x - x) <= 2 && Math.abs(p.y - y) <= 2)

  const place = (x: number, y: number, kind: TileKind) => {
    const mx = MAP_W - 1 - x
    const my = MAP_H - 1 - y
    for (const [px, py] of [[x, y], [mx, my]]) {
      if (px <= 0 || py <= 0 || px >= MAP_W - 1 || py >= MAP_H - 1 || reserved(px, py)) return
    }
    tiles[idx(x, y)] = kind
    tiles[idx(mx, my)] = kind
  }

  const clusters = rng.int(16, 22)
  for (let i = 0; i < clusters; i++) {
    const x = rng.int(1, MAP_W - 2)
    const y = rng.int(1, MAP_H / 2)
    const kind = rng.pick([Tile.ROCK, Tile.ROCK, Tile.CAR, Tile.DEBRIS] as const)
    if (kind === Tile.CAR) {
      const horizontal = rng.next() < 0.5
      place(x, y, kind)
      place(x + (horizontal ? 1 : 0), y + (horizontal ? 0 : 1), kind)
    } else {
      const size = kind === Tile.ROCK ? rng.int(1, 3) : 1
      for (let k = 0; k < size; k++) place(x + (k % 2), y + Math.floor(k / 2), kind)
    }
  }

  return { seed, w: MAP_W, h: MAP_H, tiles, bases, cores, crates, spawns }
}

/** Genera un mapa válido; si el BFS falla, prueba con la siguiente semilla. */
export function generateMap(seed: number): GameMapData {
  for (let attempt = 0; attempt < 50; attempt++) {
    const map = buildMap(seed + attempt)
    if (isMapReachable(map)) return map
  }
  throw new Error(`No se pudo generar un mapa válido desde la semilla ${seed}`)
}

export const tileAt = (map: GameMapData, x: number, y: number) =>
  x < 0 || y < 0 || x >= map.w || y >= map.h ? Tile.BORDER : map.tiles[idx(x, y)]

export const tileIndex = idx
