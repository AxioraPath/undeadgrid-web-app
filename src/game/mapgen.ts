import { BASE_SIZE, MAP_H, MAP_W, type Slot } from './constants'
import { createRng, type Rng } from './rng'

/** Capa de colisión: qué ocupa cada casilla. */
export const Tile = {
  GRASS: 0,
  BORDER: 1,
  ROCK: 2,
  CAR: 3,
  DEBRIS: 4,
  BASE: 5,
  ROAD: 6,
  WATER: 7,
  TREE: 8,
  CONTAINER: 9,
  BARREL: 10,
} as const

export type TileKind = (typeof Tile)[keyof typeof Tile]

/** Capa de suelo (solo visual). */
export const Ground = {
  GRASS: 0,
  DIRT: 1,
  ROAD: 2,
  BASE: 3,
  WATER: 4,
} as const

export type ObjectKind = 'tree' | 'rock' | 'car' | 'container' | 'debris' | 'barrel' | 'tires' | 'water'

export interface MapObject {
  kind: ObjectKind
  x: number
  y: number
  w: number
  h: number
  variant: number
}

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
  ground: Uint8Array
  objects: MapObject[]
  bases: Record<Slot, Rect>
  /** Casilla superior izquierda del núcleo (ocupa 2 × 2). */
  cores: Record<Slot, Point>
  crates: Record<Slot, Point>
  spawns: Point[]
  roads: { rows: number[]; cols: number[] }
}

const SOLID_TILES = new Set<number>([Tile.BORDER, Tile.ROCK, Tile.CAR, Tile.DEBRIS, Tile.WATER, Tile.TREE, Tile.CONTAINER, Tile.BARREL])

export const isSolidTileKind = (k: number) => SOLID_TILES.has(k)

/** El agua frena el paso pero no las balas. */
export const blocksBullets = (k: number) => SOLID_TILES.has(k) && k !== Tile.WATER

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

const OBJECT_TILE: Record<ObjectKind, TileKind> = {
  tree: Tile.TREE,
  rock: Tile.ROCK,
  car: Tile.CAR,
  container: Tile.CONTAINER,
  debris: Tile.DEBRIS,
  barrel: Tile.BARREL,
  tires: Tile.BARREL,
  water: Tile.WATER,
}

function buildMap(seed: number): GameMapData {
  const rng = createRng(seed)
  const tiles = new Uint8Array(MAP_W * MAP_H)
  const ground = new Uint8Array(MAP_W * MAP_H)
  const objects: MapObject[] = []

  // 1. Cuadrícula vacía con borde de muros fijos (bosque).
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++)
      tiles[idx(x, y)] = x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? Tile.BORDER : Tile.GRASS

  // Avenidas en cruz por el centro: llevan de cada orilla a las bases.
  const roads = { rows: [MAP_H / 2 - 1, MAP_H / 2], cols: [MAP_W / 2 - 1, MAP_W / 2] }
  for (let y = 1; y < MAP_H - 1; y++)
    for (let x = 1; x < MAP_W - 1; x++)
      if (roads.rows.includes(y) || roads.cols.includes(x)) {
        tiles[idx(x, y)] = Tile.ROAD
        ground[idx(x, y)] = Ground.ROAD
      }

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
    for (let y = b.y; y < b.y + b.h; y++)
      for (let x = b.x; x < b.x + b.w; x++) {
        tiles[idx(x, y)] = Tile.BASE
        ground[idx(x, y)] = Ground.BASE
      }
  }

  // 4. Puntos de aparición de zombis al final de cada avenida.
  const spawns: Point[] = [
    { x: roads.cols[0], y: 1 },
    { x: roads.cols[1], y: MAP_H - 2 },
    { x: 1, y: roads.rows[1] },
    { x: MAP_W - 2, y: roads.rows[0] },
  ]

  // 3. Obstáculos en espejo (punto central) para que el mapa sea justo.
  const reserved = (x: number, y: number) =>
    ([1, 2] as Slot[]).some((s) => {
      const b = bases[s]
      return x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h
    }) || spawns.some((p) => Math.abs(p.x - x) <= 2 && Math.abs(p.y - y) <= 2)

  const fits = (x: number, y: number, w: number, h: number, allowed: number) => {
    for (let yy = y; yy < y + h; yy++)
      for (let xx = x; xx < x + w; xx++) {
        if (xx <= 0 || yy <= 0 || xx >= MAP_W - 1 || yy >= MAP_H - 1) return false
        if (reserved(xx, yy) || tiles[idx(xx, yy)] !== allowed) return false
      }
    return true
  }

  const place = (kind: ObjectKind, x: number, y: number, w: number, h: number, variant: number, on: number = Tile.GRASS) => {
    const mx = MAP_W - x - w
    const my = MAP_H - y - h
    const overlapsMirror = x < mx + w && mx < x + w && y < my + h && my < y + h
    if (overlapsMirror || !fits(x, y, w, h, on) || !fits(mx, my, w, h, on)) return false
    for (const [ox, oy] of [[x, y], [mx, my]]) {
      for (let yy = oy; yy < oy + h; yy++)
        for (let xx = ox; xx < ox + w; xx++) {
          tiles[idx(xx, yy)] = OBJECT_TILE[kind]
          if (kind === 'water') ground[idx(xx, yy)] = Ground.WATER
        }
      objects.push({ kind, x: ox, y: oy, w, h, variant })
    }
    return true
  }

  const tryPlace = (times: number, attempts: number, fn: (r: Rng) => boolean) => {
    let placed = 0
    for (let i = 0; i < attempts && placed < times; i++) if (fn(rng)) placed++
  }

  // Autos abandonados sobre un carril (el otro queda libre).
  tryPlace(2, 40, (r) =>
    r.next() < 0.5
      ? place('car', r.int(3, MAP_W / 2 - 4), roads.rows[0], 2, 1, r.int(0, 3), Tile.ROAD)
      : place('car', roads.cols[0], r.int(3, MAP_H / 2 - 4), 1, 2, r.int(0, 3), Tile.ROAD),
  )
  tryPlace(1, 40, (r) => place('water', r.int(2, MAP_W - 5), r.int(2, MAP_H / 2 - 3), r.int(2, 3), 2, 0))
  tryPlace(2, 60, (r) => (r.next() < 0.5 ? place('container', r.int(2, MAP_W - 4), r.int(2, MAP_H - 3), 2, 1, r.int(0, 1)) : place('container', r.int(2, MAP_W - 3), r.int(2, MAP_H - 4), 1, 2, r.int(0, 1))))
  tryPlace(4, 60, (r) => place('rock', r.int(2, MAP_W - 3), r.int(2, MAP_H - 3), 1, 1, r.int(0, 1)))
  tryPlace(6, 80, (r) => place('tree', r.int(2, MAP_W - 3), r.int(2, MAP_H - 3), 1, 1, r.int(0, 2)))
  tryPlace(3, 60, (r) => place('debris', r.int(2, MAP_W - 3), r.int(2, MAP_H - 3), 1, 1, r.int(0, 1)))
  tryPlace(2, 60, (r) => place(r.next() < 0.5 ? 'barrel' : 'tires', r.int(2, MAP_W - 3), r.int(2, MAP_H - 3), 1, 1, 0))

  // Parches de tierra (solo visual, se puede caminar).
  for (let i = 0; i < 6; i++) {
    const x = rng.int(2, MAP_W - 4)
    const y = rng.int(2, MAP_H - 4)
    for (const [ox, oy] of [[x, y], [MAP_W - x - 2, MAP_H - y - 2]])
      for (let yy = oy; yy < oy + 2; yy++)
        for (let xx = ox; xx < ox + 2; xx++) if (tiles[idx(xx, yy)] === Tile.GRASS && ground[idx(xx, yy)] === Ground.GRASS) ground[idx(xx, yy)] = Ground.DIRT
  }

  return { seed, w: MAP_W, h: MAP_H, tiles, ground, objects, bases, cores, crates, spawns, roads }
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
