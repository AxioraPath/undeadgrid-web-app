import {
  ARMORY_OPEN_S,
  BUILDINGS,
  CORE_HP,
  Ground,
  PLAYER_MAX_HP,
  TILE,
  Tile,
  isExplosive,
  PICKUP_INFO,
  teamOf,
  type BuildHint,
  type GameEvent,
  type GameMap,
  type MapObject,
  type Slot,
  type Team,
  type ZombieKind,
} from '../../shared/lib/contracts'
import type { PlayerView, TurretView, View, ZombieView } from './interpolation'
import { createRng } from './rng'
import { wallHalf, wallPlacement, wallSpriteName, type WallLookup, type WallOrient } from './wallSprite'
import { drawFrame as drawSheetFrame, frameAt, sheetAnimations, sheetColumns, survivorSheet, type SheetName, type Sprites } from './sprites'

/** Team colors: team 1 = blue, team 2 = red (same as the bases on the map). */
const SLOT_COLOR: Record<Team, { main: string; light: string; dark: string; tint: string }> = {
  1: { main: '#3d8bff', light: '#8fc1ff', dark: '#173d78', tint: 'rgba(61, 139, 255, 0.14)' },
  2: { main: '#ff2a2f', light: '#ff8a8d', dark: '#6e0b0f', tint: 'rgba(255, 42, 47, 0.12)' },
}

/** Los recursos miden 64 px por casilla; la casilla lógica mide 32 px. */
const ART = 0.5
/** Personajes y zombis un poco más grandes que 0.5 para que midan ~1 casilla (como en las referencias). */
const CHAR_SCALE = 0.9
/** La capa estática se dibuja a la resolución del arte (64 px por casilla). */
const T2 = TILE / ART

const ZOMBIE_SHEET: Record<ZombieKind, SheetName> = { normal: 'normal', fast: 'rapido', tank: 'tanque' }

/** Todos contra todos: un color por jugador (azul, rojo, verde, amarillo). */
const FFA_COLOR: Record<Slot, { main: string; light: string; dark: string; tint: string }> = {
  1: { main: '#3d8bff', light: '#8fc1ff', dark: '#173d78', tint: 'rgba(61, 139, 255, 0.14)' },
  2: { main: '#ff2a2f', light: '#ff8a8d', dark: '#6e0b0f', tint: 'rgba(255, 42, 47, 0.12)' },
  3: { main: '#2ee86a', light: '#8af5ad', dark: '#145c2a', tint: 'rgba(46, 232, 106, 0.12)' },
  4: { main: '#ffd166', light: '#ffe6a3', dark: '#6b4f0e', tint: 'rgba(255, 209, 102, 0.12)' },
}

/** Color de un jugador: el de su equipo, o el suyo propio en todos contra todos. */
const colorOf = (map: GameMap, slot: Slot) => (map.ffa ? FFA_COLOR[slot] : SLOT_COLOR[teamOf(slot)])

type Ctx = CanvasRenderingContext2D
type Dir = 'down' | 'up' | 'left' | 'right'

const dirOf = (dx: number, dy: number): Dir => (Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? 'left' : 'right') : dy < 0 ? 'up' : 'down')

/** Dibuja una imagen con su base centrada en (cx, bottom) a la escala dada. */
function drawAnchored(ctx: Ctx, img: HTMLImageElement, cx: number, bottom: number, scale: number) {
  const w = img.width * scale
  const h = img.height * scale
  ctx.drawImage(img, Math.round(cx - w / 2), Math.round(bottom - h), Math.round(w), Math.round(h))
}

// ---------------------------------------------------------------------------
// Capa estática del mapa (se dibuja una vez, a 64 px por casilla)
// ---------------------------------------------------------------------------

export function createStaticLayer(map: GameMap, sp: Sprites): HTMLCanvasElement {
  const MAP_W = map.w
  const MAP_H = map.h
  const c = document.createElement('canvas')
  c.width = MAP_W * T2
  c.height = MAP_H * T2
  const g = c.getContext('2d')!
  g.imageSmoothingEnabled = false
  const rng = createRng(map.seed * 7 + 3)
  const v = () => rng.int(1, 4)
  const groundAt = (x: number, y: number) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? -1 : map.ground[y * MAP_W + x])
  // Distrito industrial: cemento de búnker con calles urbanas (sus bordes están hechos para ese suelo).
  const industrial = map.theme === 'industrial'
  // Desierto: arena, caminos de tierra roja, plazoleta de caliza y vías del tren.
  const desert = map.theme === 'desierto'

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const gk = map.ground[y * MAP_W + x]
      let tex: string
      if (gk === Ground.ROAD)
        tex = industrial ? roadPiece(map, x, y).replace('camino-', 'via-urbana-') : desert ? `mapa-tierra-roja-${v()}` : roadPiece(map, x, y)
      else if (gk === Ground.WATER || gk === Ground.BRIDGE) tex = waterPiece(groundAt, x, y, v())
      else if (gk === Ground.PLAZA) tex = industrial ? `mapa-asfalto-claro-${v()}` : desert ? `mapa-caliza-${v()}` : `concreto-${v()}`
      else if (gk === Ground.BASE) tex = `metal-${v()}`
      else if (gk === Ground.GRAVEL) tex = `grava-${v()}`
      else if (gk === Ground.DIRT)
        tex = industrial
          ? rng.next() < 0.85 ? `mapa-hormigon-industrial-${v()}` : `mapa-rejilla-oxidada-${v()}`
          : desert
            ? `arena-${v()}`
            : rng.next() < 0.7 ? `tierra-${v()}` : `barro-${v()}`
      else tex = industrial ? `mapa-cemento-bunker-${v()}` : desert ? `arena-${v()}` : `pasto-${v()}`
      g.drawImage(sp[tex], x * T2, y * T2, T2, T2)
    }
  }

  // Vías del tren: la pieza tiene bordes vacíos, así que cada casilla usa su franja central (vertical si la vía
  // sigue arriba o abajo); así se ve continua.
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (map.ground[y * MAP_W + x] !== Ground.RAIL) continue
      if (groundAt(x, y - 1) === Ground.RAIL || groundAt(x, y + 1) === Ground.RAIL)
        g.drawImage(sp['via-tren-v'], 0, 48, 64, 64, x * T2, y * T2, T2, T2)
      else g.drawImage(sp['via-tren-h'], 32, 0, 64, 64, x * T2, y * T2, T2, T2)
    }

  // Puentes: tablones de madera continuos con barandal a los lados (sobre el agua ya dibujada)
  const isPath = (x: number, y: number) => [Ground.ROAD, Ground.BRIDGE, Ground.PLAZA].includes(groundAt(x, y) as 2 | 6 | 7)
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (map.ground[y * MAP_W + x] !== Ground.BRIDGE) continue
      drawBridge(g, sp, x, y, isPath(x, y - 1) || isPath(x, y + 1), (x * 7 + y * 3) % 4 + 1)
    }

  // Luz de los faroles en el suelo
  for (const o of map.objects.filter((o) => o.kind === 'lamp')) {
    const cx = (o.x + 0.5) * T2
    const cy = (o.y + 0.7) * T2
    const grd = g.createRadialGradient(cx, cy, 2, cx, cy, T2 * 1.8)
    grd.addColorStop(0, 'rgba(255, 196, 92, 0.32)')
    grd.addColorStop(1, 'rgba(255, 196, 92, 0)')
    g.fillStyle = grd
    g.fillRect(cx - T2 * 2, cy - T2 * 2, T2 * 4, T2 * 4)
  }

  // Bases: tinte del equipo y borde (todos contra todos no tiene bases)
  for (const slot of (map.ffa ? [] : [1, 2]) as Team[]) {
    const b = map.bases[slot]
    g.fillStyle = SLOT_COLOR[slot].tint
    g.fillRect(b.x * T2, b.y * T2, b.w * T2, b.h * T2)
    g.strokeStyle = SLOT_COLOR[slot].main
    g.globalAlpha = 0.7
    g.lineWidth = 4
    g.setLineDash([14, 8])
    g.strokeRect(b.x * T2 + 2, b.y * T2 + 2, b.w * T2 - 4, b.h * T2 - 4)
    g.setLineDash([])
    g.globalAlpha = 1
  }

  // Marcas de aparición de zombis
  for (const s of map.spawns) {
    const cx = (s.x + 0.5) * T2
    const cy = (s.y + 0.5) * T2
    const grd = g.createRadialGradient(cx, cy, 4, cx, cy, T2 * 1.6)
    grd.addColorStop(0, 'rgba(150, 10, 14, 0.7)')
    grd.addColorStop(1, 'rgba(150, 10, 14, 0)')
    g.fillStyle = grd
    g.fillRect(cx - T2 * 2, cy - T2 * 2, T2 * 4, T2 * 4)
  }

  // Todo lo que tiene altura, ordenado por la base para que se tape bien
  type Item = { y: number; draw: () => void }
  const items: Item[] = map.objects.filter((o) => o.kind !== 'water' && !isExplosive(o)).map((o) => ({ y: o.y + o.h, draw: () => drawObject(g, sp, o, map.theme) }))

  for (let y = 1; y < MAP_H - 1; y++)
    for (let x = 1; x < MAP_W - 1; x++) {
      const i = y * MAP_W + x
      if (map.tiles[i] !== Tile.GRASS || rng.next() > 0.08) continue
      if (industrial) {
        // Sin hierba en el distrito: algún cono o hidrante suelto.
        if (map.ground[i] !== Ground.GRASS || rng.next() > 0.35) continue
        const name = rng.pick(['cono', 'cono', 'hidrante'] as const)
        items.push({ y: y + 1, draw: () => drawAnchored(g, sp[name], (x + 0.5) * T2, (y + 1) * T2, 0.6) })
        continue
      }
      const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => groundAt(x + dx, y + dy) === Ground.WATER)
      if (desert) {
        // Arena: matorrales secos y cactus pequeños; juncos junto al oasis.
        if (map.ground[i] !== Ground.GRASS || rng.next() > 0.6) continue
        const name = nearWater ? 'juncos' : rng.pick(['arbusto-seco', 'arbusto-seco', 'cactus-redondo'] as const)
        const jx = (rng.next() - 0.5) * 0.4
        items.push({ y: y + 1, draw: () => drawAnchored(g, sp[name], (x + 0.5 + jx) * T2, (y + 1) * T2, name === 'cactus-redondo' ? 0.55 : 0.75) })
        continue
      }
      const name = nearWater ? 'juncos' : rng.pick(['hierba-alta', 'hierba-alta', 'arbusto-1', 'arbusto-seco'] as const)
      const jx = (rng.next() - 0.5) * 0.4
      items.push({ y: y + 1, draw: () => drawAnchored(g, sp[name], (x + 0.5 + jx) * T2, (y + 1) * T2, 0.8) })
    }

  // Borde: bosque en la ciudad; barreras, vallas y barriles en el distrito industrial.
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (map.tiles[y * MAP_W + x] !== Tile.BORDER) continue
      if (industrial) {
        const name = rng.pick(['barrera-concreto', 'barrera-concreto', 'barrera-concreto', 'valla-metal', 'valla-metal', 'barrera-concreto', 'neumaticos', 'barril-explosivo', 'barrera-concreto', 'valla-metal'] as const)
        const scale = name === 'barril-explosivo' || name === 'neumaticos' ? 0.9 : 0.5
        items.push({ y: y + 1, draw: () => drawAnchored(g, sp[name], (x + 0.5) * T2, (y + 1) * T2, scale) })
        continue
      }
      if (desert) {
        // Cañón: rocas rojizas y mesetas, con algún cactus.
        const name = rng.pick(['roca-desierto-1', 'roca-desierto-2', 'roca-desierto-2', 'meseta', 'roca-desierto-1', 'cactus-alto'] as const)
        const jx = (rng.next() - 0.5) * 0.3
        items.push({ y: y + 1, draw: () => drawAnchored(g, sp[name], (x + 0.5 + jx) * T2, (y + 1.15) * T2, name === 'cactus-alto' ? 0.8 : 0.62) })
        continue
      }
      const name = rng.pick(['arbol-1', 'arbol-1', 'arbol-2', 'arbol-1', 'arbusto-1'] as const)
      const jx = (rng.next() - 0.5) * 0.4
      items.push({ y: y + 1, draw: () => drawAnchored(g, sp[name], (x + 0.5 + jx) * T2, (y + 1.1) * T2, name === 'arbusto-1' ? 1.2 : 0.75) })
    }
  items.sort((a, b) => a.y - b.y).forEach((it) => it.draw())

  return c
}

/** Una casilla de puente: tablones (textura de madera) y barandal oscuro en los dos lados largos. */
function drawBridge(g: Ctx, sp: Sprites, x: number, y: number, vertical: boolean, variant: number) {
  const px = x * T2
  const py = y * T2
  const inset = 6
  g.save()
  if (vertical) {
    g.drawImage(sp[`madera-${variant}`], px + inset, py, T2 - inset * 2, T2)
  } else {
    // La madera viene en tablones verticales: se gira para el puente horizontal.
    g.translate(px + T2 / 2, py + T2 / 2)
    g.rotate(Math.PI / 2)
    g.drawImage(sp[`madera-${variant}`], -T2 / 2 + inset, -T2 / 2, T2 - inset * 2, T2)
  }
  g.restore()
  g.fillStyle = 'rgba(0, 0, 0, 0.35)'
  if (vertical) {
    g.fillRect(px + inset, py, 3, T2)
    g.fillRect(px + T2 - inset - 3, py, 3, T2)
  } else {
    g.fillRect(px, py + inset, T2, 3)
    g.fillRect(px, py + T2 - inset - 3, T2, 3)
  }
  // Barandal con postes
  g.fillStyle = '#3d2614'
  if (vertical) {
    g.fillRect(px + 1, py, 5, T2)
    g.fillRect(px + T2 - 6, py, 5, T2)
    g.fillStyle = '#6e4a2a'
    g.fillRect(px, py + 4, 7, 7)
    g.fillRect(px + T2 - 7, py + 4, 7, 7)
  } else {
    g.fillRect(px, py + 1, T2, 5)
    g.fillRect(px, py + T2 - 6, T2, 5)
    g.fillStyle = '#6e4a2a'
    g.fillRect(px + 4, py, 7, 7)
    g.fillRect(px + 4, py + T2 - 7, 7, 7)
  }
}

/** Pieza de camino según con qué lados conecta (n/e/s/w). La base y el borde del mapa cuentan como conexión. */
function roadPiece(map: GameMap, x: number, y: number) {
  const MAP_W = map.w
  const MAP_H = map.h
  const links = (dx: number, dy: number) => {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return true
    const gk = map.ground[ny * MAP_W + nx]
    return gk === Ground.ROAD || gk === Ground.BRIDGE || gk === Ground.PLAZA || gk === Ground.BASE || map.tiles[ny * MAP_W + nx] === Tile.BORDER
  }
  const n = links(0, -1)
  const e = links(1, 0)
  const s = links(0, 1)
  const w = links(-1, 0)
  const count = +n + +e + +s + +w
  if (count === 4) return 'camino-cruce'
  if (count === 3) return `camino-t-${!n ? 'esw' : !e ? 'nsw' : !s ? 'new' : 'nes'}`
  if (count === 2) {
    if (n && s) return 'camino-recta-v'
    if (e && w) return 'camino-recta-h'
    if (n && e) return 'camino-curva-ne'
    if (e && s) return 'camino-curva-es'
    if (s && w) return 'camino-curva-sw'
    return 'camino-curva-wn'
  }
  if (n) return 'camino-fin-n'
  if (e) return 'camino-fin-e'
  if (s) return 'camino-fin-s'
  if (w) return 'camino-fin-w'
  return map.theme === 'industrial' ? 'camino-isla' : 'camino-cruce'
}

/** Orillas: el nombre indica de qué lado está la tierra. */
function waterPiece(groundAt: (x: number, y: number) => number, x: number, y: number, variant: number) {
  // Bajo los puentes sigue habiendo agua: no cuentan como orilla.
  const land = (dx: number, dy: number) => {
    const g = groundAt(x + dx, y + dy)
    return g !== Ground.WATER && g !== Ground.BRIDGE
  }
  const n = land(0, -1)
  const e = land(1, 0)
  const s = land(0, 1)
  const w = land(-1, 0)
  if (n && e) return 'agua-esquina-ne'
  if (e && s) return 'agua-esquina-es'
  if (s && w) return 'agua-esquina-sw'
  if (w && n) return 'agua-esquina-wn'
  if (n) return 'agua-orilla-n'
  if (e) return 'agua-orilla-e'
  if (s) return 'agua-orilla-s'
  if (w) return 'agua-orilla-w'
  return `agua-${variant}`
}

function drawObject(g: Ctx, sp: Sprites, o: MapObject, theme?: string) {
  const desert = theme === 'desierto'
  const cx = (o.x + o.w / 2) * T2
  const bottom = (o.y + o.h) * T2
  const horizontal = o.w > o.h
  switch (o.kind) {
    case 'tree':
      if (desert) {
        // Palmeras del oasis y cactus.
        const name = (['palmera', 'cactus-alto', 'cactus-redondo'] as const)[o.variant % 3]
        drawAnchored(g, sp[name], cx, bottom + 6, name === 'palmera' ? 0.7 : name === 'cactus-alto' ? 0.85 : 0.75)
        break
      }
      drawAnchored(g, sp[(['arbol-1', 'arbol-2', 'arbol-seco'] as const)[o.variant % 3]], cx, bottom + 6, 0.8)
      break
    case 'rock':
      if (desert) drawAnchored(g, sp[o.variant ? 'roca-desierto-2' : 'roca-desierto-1'], cx, bottom, 0.55)
      else drawAnchored(g, sp[o.variant ? 'roca-1' : 'roca-1'], cx, bottom, 1.05)
      break
    case 'debris':
      drawAnchored(g, sp[o.variant ? 'escombros-2' : 'escombros-1'], cx, bottom, 1.05)
      break
    case 'barrel':
      drawAnchored(g, sp['barril-explosivo'], cx, bottom, 0.9)
      break
    case 'tires':
      drawAnchored(g, sp.neumaticos, cx, bottom, 0.95)
      break
    case 'barrier':
      drawAnchored(g, sp[o.variant ? 'barrera-obra' : 'barrera-concreto'], cx, bottom, 1)
      break
    case 'container':
      drawAnchored(g, sp[`contenedor-${o.variant ? 'azul' : 'rojo'}-${horizontal ? 'h' : 'v'}`], cx, bottom, 1)
      break
    case 'building': {
      // La colisión es justo lo que ocupa el sprite: se escala al ancho de sus casillas.
      const b = BUILDINGS[o.variant % BUILDINGS.length]
      const img = sp[b.name]
      drawAnchored(g, img, cx, bottom, (o.w * T2) / img.width)
      break
    }
    case 'lamp':
      drawAnchored(g, sp['farol-poste'], cx, bottom, 0.85)
      break
    case 'train':
      if (o.h > o.w) drawAnchored(g, sp['vagon-v'], cx, bottom, T2 / sp['vagon-v'].width)
      else drawAnchored(g, sp['vagon-h'], cx, bottom, (o.w * T2) / sp['vagon-h'].width)
      break
    case 'car':
      drawAnchored(g, sp[`auto-${o.variant % 2 ? 'destruido' : 'rojo'}-${horizontal ? 'h' : 'v'}`], cx, bottom, 1)
      if (o.variant % 2 === 0) drawAnchored(g, sp.cono, (o.x + o.w + 0.2) * T2, bottom - T2 * 0.1, 0.55)
      break
  }
}

// ---------------------------------------------------------------------------
// Efectos y estado visual (solo cliente)
// ---------------------------------------------------------------------------

interface Particle {
  x: number
  y: number
  vx: number
  vy: number
  life: number
  max: number
  color: string
  size: number
}

export interface Fx {
  particles: Particle[]
  decals: { x: number; y: number; r: number; a: number }[]
  corpses: { x: number; y: number; kind: ZombieKind; flip: boolean; at: number; life: number }[]
  muzzle: { x: number; y: number; life: number }[]
  explosions: { x: number; y: number; life: number; big: boolean }[]
  deadPlayers: Partial<Record<Slot, { x: number; y: number; at: number }>>
  facing: Map<number, Dir>
  coreFlash: Record<Team, number>
  shake: number
  clock: number
}

export const createFx = (): Fx => ({
  particles: [],
  decals: [],
  corpses: [],
  muzzle: [],
  explosions: [],
  deadPlayers: {},
  facing: new Map(),
  coreFlash: { 1: 0, 2: 0 },
  shake: 0,
  clock: 0,
})

export function consumeEvents(fx: Fx, events: GameEvent[], meSlot: Slot) {
  for (const e of events) {
    if (e.type === 'hit') {
      for (let i = 0; i < 4; i++)
        fx.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 0.25, max: 0.25, color: '#ffd166', size: 2 })
    } else if (e.type === 'zombieDied') {
      fx.decals.push({ x: e.x, y: e.y, r: 0.3 + Math.random() * 0.25, a: 0.55 })
      fx.corpses.push({ x: e.x, y: e.y, kind: e.kind, flip: Math.random() < 0.5, at: fx.clock, life: 5 })
      for (let i = 0; i < 8; i++)
        fx.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 0.4, max: 0.4, color: '#8a0f12', size: 3 })
      if (fx.decals.length > 120) fx.decals.shift()
    } else if (e.type === 'shot') {
      fx.muzzle.push({ x: e.x + e.dirX * 0.65, y: e.y - 0.25 + e.dirY * 0.5, life: 0.06 })
    } else if (e.type === 'explosion') {
      fx.explosions.push({ x: e.x, y: e.y, life: 0.45, big: !!e.big })
      fx.decals.push({ x: e.x, y: e.y, r: e.big ? 1.2 : 0.7, a: 0.35 })
      for (let i = 0; i < (e.big ? 30 : 18); i++) {
        const a = Math.random() * Math.PI * 2
        const sp = 2 + Math.random() * 5
        fx.particles.push({ x: e.x, y: e.y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 0.5, max: 0.5, color: i % 3 ? '#ff9a2e' : '#4a4a4a', size: 3 })
      }
      fx.shake = Math.max(fx.shake, 0.18)
    } else if (e.type === 'coreHit') {
      // `slot` is the legacy name of `team` (same value): the team whose shared core was hit.
      const hitTeam = e.team ?? e.slot
      fx.coreFlash[hitTeam] = 0.2
      if (hitTeam === teamOf(meSlot)) fx.shake = Math.max(fx.shake, 0.15)
    } else if (e.type === 'playerDied') {
      fx.deadPlayers[e.slot] = { x: e.x, y: e.y, at: fx.clock }
      fx.decals.push({ x: e.x, y: e.y, r: 0.45, a: 0.65 })
      if (e.slot === meSlot) fx.shake = 0.35
    }
  }
}

function updateFx(fx: Fx, dt: number) {
  fx.clock += dt
  for (const p of fx.particles) {
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
  }
  fx.particles = fx.particles.filter((p) => p.life > 0)
  for (const m of fx.muzzle) m.life -= dt
  fx.muzzle = fx.muzzle.filter((m) => m.life > 0)
  for (const e of fx.explosions) e.life -= dt
  fx.explosions = fx.explosions.filter((e) => e.life > 0)
  for (const c of fx.corpses) c.life -= dt
  fx.corpses = fx.corpses.filter((c) => c.life > 0)
  fx.coreFlash[1] = Math.max(0, fx.coreFlash[1] - dt)
  fx.coreFlash[2] = Math.max(0, fx.coreFlash[2] - dt)
  fx.shake = Math.max(0, fx.shake - dt)
}

// ---------------------------------------------------------------------------
// Cámara
// ---------------------------------------------------------------------------

export interface Camera {
  x: number // esquina superior izquierda en px de mundo
  y: number
  scale: number
}

/** Casillas que caben a lo ancho (horizontal / vertical); lo elige el jugador en Ajustes. */
export interface ZoomTiles {
  landscape: number
  portrait: number
}

export function computeCamera(map: GameMap, w: number, h: number, focusX: number, focusY: number, zoom: ZoomTiles): Camera {
  const worldW = map.w * TILE
  const worldH = map.h * TILE
  const tilesAcross = w > h ? zoom.landscape : zoom.portrait
  let scale = w / (tilesAcross * TILE)
  scale = Math.max(scale, w / worldW, h / worldH)
  const viewW = w / scale
  const viewH = h / scale
  const x = Math.min(Math.max(focusX * TILE - viewW / 2, 0), worldW - viewW)
  const y = Math.min(Math.max(focusY * TILE - viewH / 2, 0), worldH - viewH)
  return { x, y, scale }
}

/** Canvas CSS pixels -> world pixels for the given camera (pure; ignores screen shake). */
export function screenToWorld(cam: Camera, cssX: number, cssY: number): { x: number; y: number } {
  return { x: cam.x + cssX / cam.scale, y: cam.y + cssY / cam.scale }
}

/** Bullets are drawn this many world px above the player's feet position. */
export const AIM_Y_OFFSET = 8

/** Aim vector (world px) from the player at (px, py) tiles to the mouse; null when the mouse sits on the player. */
export function aimFromMouse(cam: Camera, cssX: number, cssY: number, playerX: number, playerY: number): { x: number; y: number } | null {
  const w = screenToWorld(cam, cssX, cssY)
  // Shots are drawn AIM_Y_OFFSET above the server position, so aim at the mouse shifted down by it.
  const x = w.x - playerX * TILE
  const y = w.y + AIM_Y_OFFSET - playerY * TILE
  return Math.hypot(x, y) < 1e-3 ? null : { x, y }
}

/** Small pixel-art crosshair at a canvas CSS position (call after drawFrame, in screen space). */
export function drawCrosshair(ctx: Ctx, cssX: number, cssY: number, dpr: number) {
  const s = Math.max(1, Math.round(dpr * 2))
  const cx = Math.round(cssX * dpr)
  const cy = Math.round(cssY * dpr)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const arm = (x: number, y: number, w: number, h: number) => {
    ctx.fillStyle = '#000'
    ctx.fillRect(x - s, y - s, w + 2 * s, h + 2 * s)
  }
  const parts: [number, number, number, number][] = [
    [cx - 7 * s, cy - s / 2, 4 * s, s],
    [cx + 3 * s, cy - s / 2, 4 * s, s],
    [cx - s / 2, cy - 7 * s, s, 4 * s],
    [cx - s / 2, cy + 3 * s, s, 4 * s],
    [cx - s / 2, cy - s / 2, s, s],
  ]
  for (const [x, y, w, h] of parts) arm(x, y, w, h)
  ctx.fillStyle = '#ff2a2f'
  for (const [x, y, w, h] of parts) ctx.fillRect(x, y, w, h)
}

// ---------------------------------------------------------------------------
// Cuadro
// ---------------------------------------------------------------------------

export interface FrameOptions {
  width: number // px CSS
  height: number
  dpr: number
  dt: number
  meSlot: Slot
  staticLayer: HTMLCanvasElement
  sprites: Sprites
  fx: Fx
  /** Casilla que construiría el botón de acción (la calcula el servidor). */
  hint: BuildHint | null
  /** Casilla bajo el mouse donde construiría el clic derecho (solo se dibuja). */
  ghost?: { x: number; y: number; inReach: boolean; build?: 'wall' | 'trap' | 'turret' } | null
  /** Preferencias del jugador (Ajustes). */
  zoom: ZoomTiles
  screenShake: boolean
  effects: boolean
  /** Local player's aim direction (world space) while mouse aiming is on; drives the sprite facing. */
  aim?: { x: number; y: number } | null
  /** Objetivo del autoapuntado táctil (casillas): se marca con un aro rojo. */
  autoTarget?: { x: number; y: number } | null
}

export function drawFrame(ctx: Ctx, v: View, o: FrameOptions): Camera {
  updateFx(o.fx, o.dt)
  const sp = o.sprites
  const fx = o.fx
  const map = v.map
  const me = v.players.find((p) => p.slot === o.meSlot)
  const cam = computeCamera(map, o.width, o.height, me?.x ?? map.w / 2, me?.y ?? map.h / 2, o.zoom)
  const shake = o.screenShake && fx.shake > 0 ? (Math.random() - 0.5) * 24 * fx.shake : 0

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#0b0f17'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const k = o.dpr * cam.scale
  ctx.setTransform(k, 0, 0, k, (-cam.x + shake) * k, (-cam.y + shake) * k)
  ctx.imageSmoothingEnabled = false

  ctx.drawImage(o.staticLayer, 0, 0, map.w * TILE, map.h * TILE)

  // Sangre en el suelo
  for (const d of o.effects ? fx.decals : []) {
    ctx.fillStyle = `rgba(110, 10, 14, ${d.a})`
    ctx.beginPath()
    ctx.ellipse(d.x * TILE, d.y * TILE + 8, d.r * TILE, d.r * TILE * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  if (o.hint && !map.ffa) drawBuildGrid(ctx, map, teamOf(o.meSlot))

  // Armas del suelo (todos contra todos): ícono que flota con un brillo debajo
  for (const it of v.pickups) {
    const cx = it.x * TILE
    const cy = it.y * TILE
    const bob = Math.sin(fx.clock * 3 + it.id) * 2.5
    const grd = ctx.createRadialGradient(cx, cy + 6, 1, cx, cy + 6, 16)
    grd.addColorStop(0, it.kind === 'medkit' ? 'rgba(90, 255, 140, 0.55)' : 'rgba(255, 215, 90, 0.55)')
    grd.addColorStop(1, 'rgba(255, 215, 90, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(cx - 16, cy - 10, 32, 32)
    drawAnchored(ctx, sp[`icon-${PICKUP_INFO[it.kind].icon}`], cx, cy + 8 + bob, ART * 0.75)
  }

  // Trampas (al ras del suelo)
  for (const [key, st] of v.structures) {
    if (st.type !== 'trap') continue
    drawAnchored(ctx, sp['trampa-puas'], ((key % map.w) + 0.5) * TILE, (Math.floor(key / map.w) + 1) * TILE, ART)
  }

  // Cuerpos de zombis (animación de muerte que se queda en el último cuadro)
  for (const c of fx.corpses) {
    const sheet = ZOMBIE_SHEET[c.kind]
    const frame = frameAt(sheetAnimations(sheet).death, fx.clock - c.at)
    ctx.globalAlpha = Math.min(1, c.life)
    drawSheet(ctx, sp[`sheet-${sheet}`], frame, c.x * TILE, c.y * TILE + 10, c.flip)
  }
  ctx.globalAlpha = 1

  // Todo lo que tiene altura se ordena por la posición de los pies
  type Drawable = { y: number; draw: () => void }
  const list: Drawable[] = []
  const lookup = wallLookup(v)
  for (const [key, st] of v.structures) {
    if (st.type === 'trap') continue
    const tx = key % map.w
    const ty = Math.floor(key / map.w)
    if (st.type === 'turret') {
      list.push({ y: ty + 1, draw: () => drawTurret(ctx, sp, v.turrets.get(key), tx, ty, st.hp / st.maxHp, colorOf(map, st.owner).main, v.time) })
      continue
    }
    list.push({ y: ty + 1, draw: () => drawWall(ctx, sp, tx, ty, st.type as 'wood' | 'reinforced', st.hp / st.maxHp, st.orient, lookup) })
  }
  // Barriles y tanques: se dibujan aquí para que desaparezcan al explotar (dejan restos quemados).
  map.objects.forEach((obj, i) => {
    if (!isExplosive(obj)) return
    if (v.props.destroyed.has(i)) {
      list.push({ y: obj.y, draw: () => drawWreck(ctx, sp, obj) })
      return
    }
    const pct = v.props.damaged.get(i)
    list.push({
      y: obj.y + obj.h,
      draw: () => {
        ctx.save()
        ctx.scale(ART, ART)
        drawObject(ctx, sp, obj, map.theme)
        ctx.restore()
        if (pct !== undefined) hpBar(ctx, (obj.x + obj.w / 2) * TILE, (obj.y - (obj.h > 1 ? 1 : 0.3)) * TILE, 22, pct, '#ffb020')
      },
    })
  })
  const armoryAt = map.armory
  if (armoryAt) list.push({ y: armoryAt.y + 0.5, draw: () => drawArmory(ctx, v, sp, armoryAt.x, armoryAt.y, o.meSlot, fx.clock) })
  for (const slot of (map.ffa ? [] : [1, 2]) as Team[]) {
    const c = map.crates[slot]
    list.push({ y: c.y + 1, draw: () => drawAnchored(ctx, sp[slot === 1 ? 'caja-azul' : 'caja-roja'], (c.x + 0.5) * TILE, (c.y + 1) * TILE, ART * 1.05) })
    const core = map.cores[slot]
    list.push({ y: core.y + 2, draw: () => drawCore(ctx, v, sp, slot, fx) })
  }
  const alive = new Set<number>()
  for (const z of v.zombies) {
    alive.add(z.id)
    list.push({ y: z.y, draw: () => drawZombie(ctx, v, sp, fx, z) })
  }
  for (const id of fx.facing.keys()) if (!alive.has(id)) fx.facing.delete(id)
  for (const p of v.players) {
    if (p.alive) {
      const isMe = p.slot === o.meSlot
      // Todos contra todos: no hay compañeros.
      const isMate = !isMe && !map.ffa && p.team === teamOf(o.meSlot)
      list.push({ y: p.y, draw: () => drawPlayer(ctx, v, sp, fx, p, isMe, isMate, isMe ? o.aim : null) })
    } else {
      const d = fx.deadPlayers[p.slot]
      if (d) {
        const sheet = survivorSheet(p.survivor)
        const frame = frameAt(sheetAnimations(sheet).death, fx.clock - d.at)
        list.push({ y: d.y, draw: () => drawSheet(ctx, sp[`sheet-${sheet}`], frame, d.x * TILE, d.y * TILE + 10) })
      }
    }
  }
  list.sort((a, b) => a.y - b.y).forEach((d) => d.draw())

  // Balas
  ctx.lineWidth = 2
  for (const b of v.bullets) {
    const x = b.x * TILE
    const y = b.y * TILE - 8
    if (b.kind === 'rocket') {
      ctx.save()
      ctx.translate(x, y)
      ctx.rotate(Math.atan2(b.vy, b.vx))
      ctx.fillStyle = 'rgba(255, 150, 40, 0.8)'
      ctx.fillRect(-16, -2, 8, 4)
      drawAnchored(ctx, sp.cohete, 0, 4, 0.4)
      ctx.restore()
      continue
    }
    ctx.strokeStyle = b.kind === 'sniper' ? '#d8f6ff' : '#ffe08a'
    const tail = b.kind === 'sniper' ? 0.45 : 0.6
    ctx.beginPath()
    ctx.moveTo(x - b.vx * tail, y - b.vy * tail)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  for (const e of fx.explosions) {
    const k = 1 - e.life / 0.45
    const r = TILE * (0.6 + k * (e.big ? 2.2 : 1.2))
    const grd = ctx.createRadialGradient(e.x * TILE, e.y * TILE, 0, e.x * TILE, e.y * TILE, r)
    grd.addColorStop(0, `rgba(255, 246, 194, ${1 - k})`)
    grd.addColorStop(0.45, `rgba(255, 140, 30, ${0.85 * (1 - k)})`)
    grd.addColorStop(1, 'rgba(120, 40, 0, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(e.x * TILE - r, e.y * TILE - r, r * 2, r * 2)
  }
  for (const m of fx.muzzle) {
    const grd = ctx.createRadialGradient(m.x * TILE, m.y * TILE, 0, m.x * TILE, m.y * TILE, 9)
    grd.addColorStop(0, '#fff6c2')
    grd.addColorStop(0.4, '#ffb52e')
    grd.addColorStop(1, 'rgba(255, 120, 0, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(m.x * TILE - 9, m.y * TILE - 9, 18, 18)
  }
  for (const p of o.effects ? fx.particles : []) {
    ctx.globalAlpha = p.life / p.max
    ctx.fillStyle = p.color
    ctx.fillRect(p.x * TILE - p.size / 2, p.y * TILE - p.size / 2, p.size, p.size)
  }
  ctx.globalAlpha = 1

  // Objetivo del autoapuntado (celular, botón mantenido sin arrastrar)
  if (o.autoTarget) {
    const { x, y } = o.autoTarget
    const pulse = 1 + Math.sin(fx.clock * 10) * 0.12
    ctx.strokeStyle = '#ff2a2f'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.ellipse(x * TILE, y * TILE + 4, 14 * pulse, 7 * pulse, 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    for (const a of [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2]) {
      ctx.moveTo(x * TILE + Math.cos(a) * 18 * pulse, y * TILE - 6 + Math.sin(a) * 18 * pulse)
      ctx.lineTo(x * TILE + Math.cos(a) * 11 * pulse, y * TILE - 6 + Math.sin(a) * 11 * pulse)
    }
    ctx.stroke()
  }

  // Casilla bajo el mouse (clic derecho = construir ahí): lo que se pondría, con su textura, en verde (o rojo si no se puede)
  if (o.ghost) drawBuildGhost(ctx, v, sp, o.ghost)

  // Casilla de enfrente al construir
  if (o.hint) {
    const { x, y, ok, orient } = o.hint
    // Ghost of the wall that would be placed: same sprite/half as the final wall, tinted by validity.
    if (me?.build === 'wall' && !v.structures.has(y * map.w + x)) {
      ctx.globalAlpha = 0.6
      drawWall(ctx, sp, x, y, 'wood', 1, orient, wallLookup(v, { x, y, orient }), true)
      ctx.globalAlpha = 1
    }
    ctx.fillStyle = ok ? 'rgba(46, 232, 106, 0.4)' : 'rgba(255, 42, 47, 0.35)'
    ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2)
    ctx.strokeStyle = ok ? '#2ee86a' : '#ff2a2f'
    ctx.lineWidth = 2
    ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2)
  }

  return cam
}

const TURRET_DIR: Record<Dir, string> = { down: 'abajo', up: 'arriba', left: 'izquierda', right: 'derecha' }

/** Torreta: sprite en la dirección de su objetivo (con fogonazo al disparar); parpadea en ámbar al recargar. */
function drawTurret(ctx: Ctx, sp: Sprites, t: TurretView | undefined, tx: number, ty: number, pct: number, color: string, time: number) {
  const cx = (tx + 0.5) * TILE
  const bottom = (ty + 1) * TILE + 2
  ctx.fillStyle = color
  ctx.globalAlpha = 0.55
  ctx.beginPath()
  ctx.ellipse(cx, bottom - 3, 14, 5, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  const dir = TURRET_DIR[dirOf(t?.aimX ?? 0, t?.aimY ?? 1)]
  drawAnchored(ctx, sp[`torreta-${dir}${t?.firing ? '-disparo' : ''}`], cx, bottom, 0.36)
  if (t?.reloading) {
    ctx.fillStyle = Math.floor(time * 6) % 2 ? '#ffb020' : '#5a3d08'
    ctx.fillRect(cx - 2, ty * TILE - 2, 4, 4)
  }
  if (pct < 1) hpBar(ctx, cx, ty * TILE - 8, 24, pct, pct > 0.5 ? '#2ee86a' : '#ffb020')
}

/** Vista previa de construcción en una casilla: sprite de pared/trampa/torreta teñido de verde, o rojo si no se puede. */
function drawBuildGhost(ctx: Ctx, v: View, sp: Sprites, g: { x: number; y: number; inReach: boolean; build?: 'wall' | 'trap' | 'turret' }) {
  const { x, y, inReach } = g
  const build = g.build ?? 'wall'
  const map = v.map
  const key = y * map.w + x
  const existing = v.structures.get(key)
  const onCoreOrCrate = ([1, 2] as const).some((t) => {
    const c = map.cores[t]
    const k = map.crates[t]
    return (x >= c.x && x < c.x + 2 && y >= c.y && y < c.y + 2) || (k.x === x && k.y === y)
  })
  // Sobre una pared se puede reparar/reforzar; trampas y torretas necesitan la casilla libre.
  const ok = inReach && !onCoreOrCrate && (!existing || (build === 'wall' && existing.type !== 'trap' && existing.type !== 'turret'))
  if (!existing && !onCoreOrCrate) {
    ctx.globalAlpha = 0.7
    if (build === 'trap') drawAnchored(ctx, sp['trampa-puas'], (x + 0.5) * TILE, (y + 1) * TILE, ART)
    else if (build === 'turret') drawAnchored(ctx, sp['torreta-abajo'], (x + 0.5) * TILE, (y + 1) * TILE + 2, 0.36)
    else {
      const lookup = wallLookup(v)
      const orient: WallOrient = lookup(x, y - 1) === 'v' || lookup(x, y + 1) === 'v' ? 'v' : 'h'
      drawWall(ctx, sp, x, y, 'wood', 1, orient, wallLookup(v, { x, y, orient }), true)
    }
    ctx.globalAlpha = 1
  }
  ctx.fillStyle = ok ? 'rgba(46, 232, 106, 0.32)' : 'rgba(255, 42, 47, 0.3)'
  ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2)
  ctx.strokeStyle = ok ? '#2ee86a' : '#ff2a2f'
  ctx.lineWidth = 2
  ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2)
}

/** Casillas que frenan balas (igual que el servidor: el agua no). */
const BULLET_BLOCKERS = new Set([1, 2, 3, 4, 8, 9, 10, 11])

/**
 * Objetivo aproximado del autoapuntado para marcarlo en pantalla (el servidor decide el real): el rival de otro
 * equipo o zombi más cercano dentro del alcance y sin obstáculos del mapa ni paredes enemigas en medio.
 */
export function autoAimTarget(v: View, meSlot: Slot, range: number): { x: number; y: number } | null {
  const me = v.players.find((p) => p.slot === meSlot)
  if (!me || !me.alive) return null
  const map = v.map
  const clear = (x1: number, y1: number) => {
    const d = Math.hypot(x1 - me.x, y1 - me.y)
    const n = Math.ceil(d / 0.25)
    for (let i = 1; i < n; i++) {
      const tx = Math.floor(me.x + ((x1 - me.x) * i) / n)
      const ty = Math.floor(me.y + ((y1 - me.y) * i) / n)
      if (BULLET_BLOCKERS.has(map.tiles[ty * map.w + tx])) return false
      const st = v.structures.get(ty * map.w + tx)
      if (st && st.type !== 'trap' && teamOf(st.owner) !== me.team) return false
    }
    return true
  }
  let best: { x: number; y: number } | null = null
  let bestD = range
  const consider = (x: number, y: number) => {
    const d = Math.hypot(x - me.x, y - me.y)
    if (d < bestD && d > 1e-3 && clear(x, y)) {
      best = { x, y }
      bestD = d
    }
  }
  for (const p of v.players) if (p.alive && p.team !== me.team) consider(p.x, p.y)
  for (const z of v.zombies) if (z.hp > 0) consider(z.x, z.y)
  return best
}

/** Restos de un barril o tanque que explotó. */
function drawWreck(ctx: Ctx, sp: Sprites, o: MapObject) {
  const cx = (o.x + o.w / 2) * TILE
  const cy = (o.y + o.h / 2) * TILE
  ctx.fillStyle = 'rgba(20, 16, 12, 0.55)'
  ctx.beginPath()
  ctx.ellipse(cx, cy + 4, o.w * TILE * 0.55, o.h * TILE * 0.4, 0, 0, Math.PI * 2)
  ctx.fill()
  drawAnchored(ctx, sp['escombros-2'], cx, (o.y + o.h) * TILE, ART * (o.w > 1 ? 1.2 : 0.8))
}

/** Caja de armamento del centro: cerrada cuando hay botín; anillo con el avance de quien la abre. */
function drawArmory(ctx: Ctx, v: View, sp: Sprites, x: number, y: number, meSlot: Slot, clock: number) {
  const cx = x * TILE
  const cy = y * TILE
  const available = v.armory?.available ?? false
  if (available) {
    const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, TILE * 1.8)
    grd.addColorStop(0, `rgba(255, 210, 90, ${0.35 + Math.sin(clock * 4) * 0.12})`)
    grd.addColorStop(1, 'rgba(255, 210, 90, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(cx - TILE * 2, cy - TILE * 2, TILE * 4, TILE * 4)
  }
  drawAnchored(ctx, sp[available ? 'caja-suministros' : 'caja-suministros-abierta'], cx, cy + TILE * 0.5, ART * 1.1)
  // One ring per player opening the crate (up to 4 in 2v2); each radius is distinct so rings never overlap.
  for (const slot of [1, 2, 3, 4] as Slot[]) {
    const prog = v.armory?.progress[slot]
    if (!available || prog === undefined) continue
    const r = slot === meSlot ? 22 : 24 + slot * 2
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 4
    ctx.beginPath()
    ctx.arc(cx, cy - 6, r, 0, Math.PI * 2)
    ctx.stroke()
    ctx.strokeStyle = colorOf(v.map, slot).main
    ctx.beginPath()
    ctx.arc(cx, cy - 6, r, -Math.PI / 2, -Math.PI / 2 + (Math.min(prog, ARMORY_OPEN_S) / ARMORY_OPEN_S) * Math.PI * 2)
    ctx.stroke()
  }
}

function drawSheet(ctx: Ctx, sheet: HTMLImageElement, frame: number, feetX: number, feetY: number, flip = false, columns?: number) {
  if (!flip) {
    drawSheetFrame(ctx, sheet, frame, Math.round(feetX), Math.round(feetY), CHAR_SCALE, columns)
    return
  }
  ctx.save()
  ctx.translate(Math.round(feetX), 0)
  ctx.scale(-1, 1)
  drawSheetFrame(ctx, sheet, frame, 0, Math.round(feetY), CHAR_SCALE, columns)
  ctx.restore()
}

function drawBuildGrid(ctx: Ctx, map: GameMap, team: Team) {
  const b = map.bases[team]
  ctx.fillStyle = 'rgba(46, 232, 106, 0.08)'
  ctx.fillRect(b.x * TILE, b.y * TILE, b.w * TILE, b.h * TILE)
  ctx.strokeStyle = 'rgba(46, 232, 106, 0.3)'
  ctx.lineWidth = 1
  ctx.beginPath()
  for (let i = 0; i <= b.w; i++) {
    ctx.moveTo((b.x + i) * TILE, b.y * TILE)
    ctx.lineTo((b.x + i) * TILE, (b.y + b.h) * TILE)
  }
  for (let i = 0; i <= b.h; i++) {
    ctx.moveTo(b.x * TILE, (b.y + i) * TILE)
    ctx.lineTo((b.x + b.w) * TILE, (b.y + i) * TILE)
  }
  ctx.stroke()
}

function hpBar(ctx: Ctx, x: number, y: number, w: number, pct: number, color = '#ff3b3b') {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(Math.round(x - w / 2 - 1), Math.round(y - 1), w + 2, 5)
  ctx.fillStyle = color
  ctx.fillRect(Math.round(x - w / 2), Math.round(y), Math.round(w * Math.max(0, pct)), 3)
}

const wallLookup =
  (v: View, ghost?: { x: number; y: number; orient: WallOrient }): WallLookup =>
  (x, y) => {
    if (ghost && ghost.x === x && ghost.y === y) return ghost.orient
    const st = v.structures.get(y * v.map.w + x)
    return st && st.type !== 'trap' ? st.orient : null
  }

/**
 * Horizontal art is 2 tiles long (128 x 64), vertical art is a tall single post (64 x 128); the game builds per tile.
 * Orientation comes from the server; horizontal tiles draw the half that matches their position in their run.
 */
function drawWall(ctx: Ctx, sp: Sprites, tx: number, ty: number, type: 'wood' | 'reinforced', pct: number, orient: WallOrient, lookup: WallLookup, preview = false) {
  const img = sp[wallSpriteName(type, orient, pct, preview)]
  const w = wallPlacement(orient, wallHalf(orient, tx, ty, lookup))
  const x = tx * TILE
  const y = ty * TILE
  ctx.drawImage(img, w.sx, w.sy, w.sw, w.sh, x + w.dx * TILE, y + w.dy * TILE, w.dw * TILE, w.dh * TILE)
  if (pct < 1) hpBar(ctx, x + TILE / 2, y - (orient === 'v' ? 16 : 6), 24, pct, pct > 0.5 ? '#2ee86a' : '#ffb020')
}

/** Core of a team (shared by both teammates in 2v2). */
function drawCore(ctx: Ctx, v: View, sp: Sprites, slot: Team, fx: Fx) {
  const c = v.map.cores[slot]
  const hp = v.cores[slot]
  const color = slot === 1 ? 'azul' : 'rojo'
  const state = hp <= 0 ? '-destruido' : hp < CORE_HP / 2 ? '-danado' : ''
  const cx = (c.x + 1) * TILE
  const cy = (c.y + 1) * TILE
  if (hp > 0) {
    const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, TILE * 1.8)
    grd.addColorStop(0, SLOT_COLOR[slot].light)
    grd.addColorStop(1, 'transparent')
    ctx.globalAlpha = 0.3 + Math.sin(fx.clock * 3) * 0.1 + fx.coreFlash[slot] * 2
    ctx.fillStyle = grd
    ctx.fillRect(cx - TILE * 2, cy - TILE * 2, TILE * 4, TILE * 4)
    ctx.globalAlpha = 1
  }
  drawAnchored(ctx, sp[`nucleo-${color}${state}`], cx, (c.y + 2) * TILE, ART)
  if (fx.coreFlash[slot] > 0) {
    ctx.globalAlpha = fx.coreFlash[slot] * 2.5
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(c.x * TILE + 10, c.y * TILE + 6, TILE * 2 - 20, TILE * 2 - 12)
    ctx.globalAlpha = 1
  }
  if (hp > 0) hpBar(ctx, cx, c.y * TILE - 10, 54, hp / CORE_HP, SLOT_COLOR[slot].main)
}

function drawZombie(ctx: Ctx, v: View, sp: Sprites, fx: Fx, z: ZombieView) {
  const dir = z.moving ? dirOf(z.dx, z.dy) : (fx.facing.get(z.id) ?? 'down')
  fx.facing.set(z.id, dir)

  const sheet = ZOMBIE_SHEET[z.kind]
  const anims = sheetAnimations(sheet)
  const sinceAttack = v.time - z.attackAt
  const sinceHurt = v.time - z.hurtAt
  let frame: number
  if (z.attackAt >= 0 && sinceAttack >= 0 && sinceAttack < 0.45) frame = frameAt(anims[`attack_${dir}`], sinceAttack)
  else if (z.hurtAt >= 0 && sinceHurt >= 0 && sinceHurt < 0.2) frame = frameAt(anims.hurt, sinceHurt)
  else frame = frameAt(anims[z.moving ? `walk_${dir}` : `idle_${dir}`], fx.clock + z.id * 0.37)

  const x = z.x * TILE
  const y = z.y * TILE
  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(x, y + 10, z.kind === 'tank' ? 13 : 9, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  drawSheet(ctx, sp[`sheet-${sheet}`], frame, x, y + 11)
  if (z.hp < z.maxHp) hpBar(ctx, x, y - (z.kind === 'tank' ? 34 : 26), 18, z.hp / z.maxHp)
}

function drawPlayer(ctx: Ctx, v: View, sp: Sprites, fx: Fx, p: PlayerView, isMe: boolean, isMate: boolean, aim?: { x: number; y: number } | null) {
  const x = p.x * TILE
  const y = p.y * TILE
  const col = colorOf(v.map, p.slot)
  const base = survivorSheet(p.survivor)
  let dir = aim ? dirOf(aim.x, aim.y) : dirOf(p.dirX, p.dirY)
  const sinceShot = v.time - p.shotAt
  const sinceHurt = v.time - p.hurtAt
  const sinceKnife = v.time - p.knifeAt
  // Hoja y animación según la acción: cuchillo y sniper en `-combate`; ametralladora y lanzacohetes en `-armas-pesadas`.
  const pose = (weapon: PlayerView['weapon']): [SheetName, string] =>
    weapon === 'smg' ? [`${base}-armas-pesadas`, 'machinegun'] : weapon === 'rocket' ? [`${base}-armas-pesadas`, 'rocket'] : weapon === 'sniper' ? [`${base}-combate`, 'sniper'] : [base, weapon === 'shotgun' ? 'shotgun' : 'pistol']
  let sheet: SheetName = base
  let frame: number
  if (p.knifeAt >= 0 && sinceKnife >= 0 && sinceKnife < 0.3) {
    sheet = `${base}-combate`
    dir = dirOf(p.knifeDirX, p.knifeDirY)
    frame = frameAt(sheetAnimations(sheet)[`knife_${dir}`], sinceKnife)
  } else if (p.shotAt >= 0 && sinceShot >= 0 && sinceShot < 0.22) {
    const [sh, name] = pose(p.weapon)
    sheet = sh
    frame = frameAt(sheetAnimations(sheet)[`${name}_${dir}`], sinceShot)
  } else if (p.hurtAt >= 0 && sinceHurt >= 0 && sinceHurt < 0.2) frame = frameAt(sheetAnimations(base).hurt, sinceHurt)
  else if (!p.moving && p.weapon !== 'pistol' && p.weapon !== 'shotgun') {
    // Quieto con un arma pesada o el sniper: primer cuadro (apuntar sin disparar).
    const [sh, name] = pose(p.weapon)
    sheet = sh
    frame = sheetAnimations(sheet)[`${name}_${dir}`].frames[0]
  } else frame = frameAt(sheetAnimations(base)[p.moving ? `walk_${dir}` : `idle_${dir}`], fx.clock)

  ctx.strokeStyle = col.main
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.85
  // Teammates get a dashed ring so they read differently from you (solid) and from rivals (other color).
  if (isMate) ctx.setLineDash([4, 3])
  ctx.beginPath()
  ctx.ellipse(x, y + 10, 11, 5, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.globalAlpha = 1
  drawSheet(ctx, sp[`sheet-${sheet}`], frame, x, y + 11, false, sheetColumns(sheet))

  // Name tag: J1 / J2 in 1v1, the player name in 2v2 (4 players on screen).
  ctx.font = 'bold 9px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const text = v.players.length > 2 ? (p.name || `J${p.slot}`).slice(0, 10) : `J${p.slot}`
  const tagW = Math.max(18, Math.ceil(ctx.measureText(text).width) + 8)
  const tagX = Math.round(x - tagW / 2)
  ctx.fillStyle = col.dark
  ctx.fillRect(tagX, Math.round(y - 33), tagW, 11)
  ctx.strokeStyle = isMe ? '#ffffff' : col.main
  ctx.lineWidth = 1
  ctx.strokeRect(tagX, Math.round(y - 33), tagW, 11)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(text, Math.round(x), Math.round(y - 27))
  if (p.hp < PLAYER_MAX_HP) hpBar(ctx, x, y - 38, 22, p.hp / PLAYER_MAX_HP, '#2ee86a')
  // Marker above the tag: white for you, team color for your teammate.
  if (isMe || isMate) {
    const my = Math.round(y - (p.hp < PLAYER_MAX_HP ? 48 : 42))
    ctx.fillStyle = isMe ? '#ffffff' : col.light
    ctx.strokeStyle = '#000000'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(Math.round(x) - 4, my)
    ctx.lineTo(Math.round(x) + 4, my)
    ctx.lineTo(Math.round(x), my + 6)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }
}

// ---------------------------------------------------------------------------
// Minimapa
// ---------------------------------------------------------------------------

export function drawMinimap(ctx: Ctx, v: View, staticLayer: HTMLCanvasElement, meSlot: Slot, cam: Camera | null, viewW: number, viewH: number) {
  const map = v.map
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const k = Math.min(w / (map.w * TILE), h / (map.h * TILE))
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(staticLayer, 0, 0, map.w * TILE * k, map.h * TILE * k)
  ctx.setTransform(k, 0, 0, k, 0, 0)
  for (const slot of (map.ffa ? [] : [1, 2]) as Team[]) {
    const c = map.cores[slot]
    ctx.fillStyle = v.cores[slot] > 0 ? SLOT_COLOR[slot].main : '#333'
    ctx.fillRect(c.x * TILE, c.y * TILE, TILE * 2, TILE * 2)
  }
  ctx.fillStyle = '#7bd65a'
  for (const z of v.zombies) ctx.fillRect(z.x * TILE - 12, z.y * TILE - 12, 24, 24)
  for (const p of v.players) {
    if (!p.alive) continue
    ctx.fillStyle = p.slot === meSlot ? '#ffffff' : colorOf(map, p.slot).light
    ctx.beginPath()
    ctx.arc(p.x * TILE, p.y * TILE, 26, 0, Math.PI * 2)
    ctx.fill()
    // Teammate: ring in the team color so the four dots read as 2 + 2.
    if (p.slot !== meSlot && p.team === teamOf(meSlot)) {
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = 8
      ctx.stroke()
    }
  }
  if (cam) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 10
    ctx.strokeRect(cam.x, cam.y, viewW / cam.scale, viewH / cam.scale)
  }
}
