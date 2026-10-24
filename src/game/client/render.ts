import { CORE_HP, MAP_H, MAP_W, TILE, type Slot } from '../constants'
import { lerp } from '../formulas'
import { Ground, Tile, type GameMapData, type MapObject } from '../mapgen'
import { createRng } from '../rng'
import type { BuildPreview, GameEvent, MatchState, Player, Zombie, ZombieKind } from '../engine'
import { drawFrame as drawSheetFrame, frameAt, sheetAnimations, survivorSheet, type SheetName, type Sprites } from './sprites'

const SLOT_COLOR: Record<Slot, { main: string; light: string; dark: string; tint: string }> = {
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

export function createStaticLayer(map: GameMapData, sp: Sprites): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = MAP_W * T2
  c.height = MAP_H * T2
  const g = c.getContext('2d')!
  g.imageSmoothingEnabled = false
  const rng = createRng(map.seed * 7 + 3)
  const v = () => rng.int(1, 4)
  const groundAt = (x: number, y: number) => (x < 0 || y < 0 || x >= MAP_W || y >= MAP_H ? -1 : map.ground[y * MAP_W + x])

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const gk = map.ground[y * MAP_W + x]
      let tex: string
      if (gk === Ground.ROAD) tex = roadPiece(map, x, y)
      else if (gk === Ground.WATER) tex = waterPiece(groundAt, x, y, v())
      else if (gk === Ground.BASE) tex = `metal-${v()}`
      else if (gk === Ground.GRAVEL) tex = `grava-${v()}`
      else if (gk === Ground.DIRT) tex = rng.next() < 0.7 ? `tierra-${v()}` : `barro-${v()}`
      else tex = `pasto-${v()}`
      g.drawImage(sp[tex], x * T2, y * T2, T2, T2)
    }
  }

  // Bases: tinte del equipo y borde
  for (const slot of [1, 2] as Slot[]) {
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
  const items: Item[] = map.objects.filter((o) => o.kind !== 'water').map((o) => ({ y: o.y + o.h, draw: () => drawObject(g, sp, o) }))

  for (let y = 1; y < MAP_H - 1; y++)
    for (let x = 1; x < MAP_W - 1; x++) {
      const i = y * MAP_W + x
      if (map.tiles[i] !== Tile.GRASS || rng.next() > 0.08) continue
      const nearWater = [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => groundAt(x + dx, y + dy) === Ground.WATER)
      const name = nearWater ? 'juncos' : rng.pick(['hierba-alta', 'hierba-alta', 'arbusto-1', 'arbusto-seco'] as const)
      const jx = (rng.next() - 0.5) * 0.4
      items.push({ y: y + 1, draw: () => drawAnchored(g, sp[name], (x + 0.5 + jx) * T2, (y + 1) * T2, 0.8) })
    }

  // Bosque del borde
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (map.tiles[y * MAP_W + x] !== Tile.BORDER) continue
      const name = rng.pick(['arbol-1', 'arbol-1', 'arbol-2', 'arbol-1', 'arbusto-1'] as const)
      const jx = (rng.next() - 0.5) * 0.4
      items.push({ y: y + 1, draw: () => drawAnchored(g, sp[name], (x + 0.5 + jx) * T2, (y + 1.1) * T2, name === 'arbusto-1' ? 1.2 : 0.75) })
    }
  items.sort((a, b) => a.y - b.y).forEach((it) => it.draw())

  return c
}

/** Pieza de camino según con qué lados conecta (n/e/s/w). La base y el borde del mapa cuentan como conexión. */
function roadPiece(map: GameMapData, x: number, y: number) {
  const links = (dx: number, dy: number) => {
    const nx = x + dx
    const ny = y + dy
    if (nx < 0 || ny < 0 || nx >= MAP_W || ny >= MAP_H) return true
    const gk = map.ground[ny * MAP_W + nx]
    return gk === Ground.ROAD || gk === Ground.BASE || map.tiles[ny * MAP_W + nx] === Tile.BORDER
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
  return 'camino-cruce'
}

/** Orillas: el nombre indica de qué lado está la tierra. */
function waterPiece(groundAt: (x: number, y: number) => number, x: number, y: number, variant: number) {
  const land = (dx: number, dy: number) => groundAt(x + dx, y + dy) !== Ground.WATER
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

function drawObject(g: Ctx, sp: Sprites, o: MapObject) {
  const cx = (o.x + o.w / 2) * T2
  const bottom = (o.y + o.h) * T2
  const horizontal = o.w > o.h
  switch (o.kind) {
    case 'tree':
      drawAnchored(g, sp[(['arbol-1', 'arbol-2', 'arbol-seco'] as const)[o.variant % 3]], cx, bottom + 6, 0.8)
      break
    case 'rock':
      drawAnchored(g, sp[o.variant ? 'roca-1' : 'roca-1'], cx, bottom, 1.05)
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
  deadPlayers: Partial<Record<Slot, { x: number; y: number; at: number }>>
  facing: Map<number, Dir>
  coreFlash: Record<Slot, number>
  shake: number
  clock: number
}

export const createFx = (): Fx => ({
  particles: [],
  decals: [],
  corpses: [],
  muzzle: [],
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
    } else if (e.type === 'coreHit') {
      fx.coreFlash[e.slot] = 0.2
      if (e.slot === meSlot) fx.shake = Math.max(fx.shake, 0.15)
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

export function computeCamera(w: number, h: number, focusX: number, focusY: number): Camera {
  const worldW = MAP_W * TILE
  const worldH = MAP_H * TILE
  const tilesAcross = w > h ? 22 : 11
  let scale = w / (tilesAcross * TILE)
  scale = Math.max(scale, w / worldW, h / worldH)
  const viewW = w / scale
  const viewH = h / scale
  const x = Math.min(Math.max(focusX * TILE - viewW / 2, 0), worldW - viewW)
  const y = Math.min(Math.max(focusY * TILE - viewH / 2, 0), worldH - viewH)
  return { x, y, scale }
}

// ---------------------------------------------------------------------------
// Cuadro
// ---------------------------------------------------------------------------

export interface FrameOptions {
  width: number // px CSS
  height: number
  dpr: number
  alpha: number // interpolación entre los dos últimos ticks
  dt: number
  meId: string
  staticLayer: HTMLCanvasElement
  sprites: Sprites
  fx: Fx
  preview: BuildPreview | null
}

const ix = (prev: number, cur: number, a: number) => lerp(prev, cur, a)

export function drawFrame(ctx: Ctx, s: MatchState, o: FrameOptions): Camera {
  updateFx(o.fx, o.dt)
  const sp = o.sprites
  const fx = o.fx
  const me = s.players.find((p) => p.id === o.meId)
  const fx0 = me ? ix(me.px, me.x, o.alpha) : MAP_W / 2
  const fy0 = me ? ix(me.py, me.y, o.alpha) : MAP_H / 2
  const cam = computeCamera(o.width, o.height, fx0, fy0)
  const shake = fx.shake > 0 ? (Math.random() - 0.5) * 24 * fx.shake : 0

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#0b0f17'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const k = o.dpr * cam.scale
  ctx.setTransform(k, 0, 0, k, (-cam.x + shake) * k, (-cam.y + shake) * k)
  ctx.imageSmoothingEnabled = false

  ctx.drawImage(o.staticLayer, 0, 0, MAP_W * TILE, MAP_H * TILE)

  // Sangre en el suelo
  for (const d of fx.decals) {
    ctx.fillStyle = `rgba(110, 10, 14, ${d.a})`
    ctx.beginPath()
    ctx.ellipse(d.x * TILE, d.y * TILE + 8, d.r * TILE, d.r * TILE * 0.55, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  if (me && o.preview) drawBuildGrid(ctx, s, me.slot)

  // Trampas (al ras del suelo)
  for (const [key, st] of s.structures) {
    if (st.type !== 'trap') continue
    drawAnchored(ctx, sp['trampa-puas'], (key % MAP_W + 0.5) * TILE, (Math.floor(key / MAP_W) + 1) * TILE, ART)
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
  for (const [key, st] of s.structures) {
    if (st.type === 'trap') continue
    const tx = key % MAP_W
    const ty = Math.floor(key / MAP_W)
    list.push({ y: ty + 1, draw: () => drawWall(ctx, s, sp, tx, ty, st.type as 'wood' | 'reinforced', st.hp / st.maxHp) })
  }
  for (const slot of [1, 2] as Slot[]) {
    const c = s.map.crates[slot]
    list.push({ y: c.y + 1, draw: () => drawAnchored(ctx, sp[slot === 1 ? 'caja-azul' : 'caja-roja'], (c.x + 0.5) * TILE, (c.y + 1) * TILE, ART * 1.05) })
    const core = s.map.cores[slot]
    list.push({ y: core.y + 2, draw: () => drawCore(ctx, s, sp, slot, fx) })
  }
  const alive = new Set<number>()
  for (const z of s.zombies) {
    alive.add(z.id)
    const x = ix(z.px, z.x, o.alpha)
    const y = ix(z.py, z.y, o.alpha)
    list.push({ y, draw: () => drawZombie(ctx, s, sp, fx, z, x, y) })
  }
  for (const id of fx.facing.keys()) if (!alive.has(id)) fx.facing.delete(id)
  for (const p of s.players) {
    if (p.alive) {
      const x = ix(p.px, p.x, o.alpha)
      const y = ix(p.py, p.y, o.alpha)
      list.push({ y, draw: () => drawPlayer(ctx, s, sp, fx, p, x, y, p.id === o.meId) })
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
  ctx.strokeStyle = '#ffe08a'
  ctx.lineWidth = 2
  for (const b of s.bullets) {
    const x = ix(b.px, b.x, o.alpha) * TILE
    const y = ix(b.py, b.y, o.alpha) * TILE - 8
    ctx.beginPath()
    ctx.moveTo(x - b.vx * 0.6, y - b.vy * 0.6)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  for (const m of fx.muzzle) {
    const grd = ctx.createRadialGradient(m.x * TILE, m.y * TILE, 0, m.x * TILE, m.y * TILE, 9)
    grd.addColorStop(0, '#fff6c2')
    grd.addColorStop(0.4, '#ffb52e')
    grd.addColorStop(1, 'rgba(255, 120, 0, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(m.x * TILE - 9, m.y * TILE - 9, 18, 18)
  }
  for (const p of fx.particles) {
    ctx.globalAlpha = p.life / p.max
    ctx.fillStyle = p.color
    ctx.fillRect(p.x * TILE - p.size / 2, p.y * TILE - p.size / 2, p.size, p.size)
  }
  ctx.globalAlpha = 1

  // Casilla de enfrente al construir
  if (o.preview) {
    const { x, y, ok } = o.preview
    ctx.fillStyle = ok ? 'rgba(46, 232, 106, 0.4)' : 'rgba(255, 42, 47, 0.35)'
    ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2)
    ctx.strokeStyle = ok ? '#2ee86a' : '#ff2a2f'
    ctx.lineWidth = 2
    ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2)
  }

  return cam
}

function drawSheet(ctx: Ctx, sheet: HTMLImageElement, frame: number, feetX: number, feetY: number, flip = false) {
  if (!flip) {
    drawSheetFrame(ctx, sheet, frame, Math.round(feetX), Math.round(feetY), CHAR_SCALE)
    return
  }
  ctx.save()
  ctx.translate(Math.round(feetX), 0)
  ctx.scale(-1, 1)
  drawSheetFrame(ctx, sheet, frame, 0, Math.round(feetY), CHAR_SCALE)
  ctx.restore()
}

function drawBuildGrid(ctx: Ctx, s: MatchState, slot: Slot) {
  const b = s.map.bases[slot]
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

const isWallAt = (s: MatchState, x: number, y: number) => {
  const st = s.structures.get(y * MAP_W + x)
  return !!st && st.type !== 'trap'
}

/**
 * Las paredes del arte miden 2 casillas (128 × 64 o 64 × 128); el juego construye por casilla.
 * Cada casilla dibuja la mitad que le toca según su posición, así una fila de paredes queda continua.
 */
function drawWall(ctx: Ctx, s: MatchState, sp: Sprites, tx: number, ty: number, type: 'wood' | 'reinforced', pct: number) {
  const vertical = (isWallAt(s, tx, ty - 1) || isWallAt(s, tx, ty + 1)) && !isWallAt(s, tx - 1, ty) && !isWallAt(s, tx + 1, ty)
  const mat = type === 'wood' ? 'madera' : 'metal'
  const state = pct <= 0.33 ? '-destruida' : pct <= 0.66 ? '-danada' : ''
  const img = sp[`pared-${mat}-${vertical ? 'v' : 'h'}${state}`]
  const half = vertical ? ty % 2 : tx % 2
  const x = tx * TILE
  const y = ty * TILE
  if (vertical) ctx.drawImage(img, 0, half * 64, 64, 64, x, y, TILE, TILE)
  else ctx.drawImage(img, half * 64, 0, 64, 64, x, y, TILE, TILE)
  if (pct < 1) hpBar(ctx, x + TILE / 2, y - 6, 24, pct, pct > 0.5 ? '#2ee86a' : '#ffb020')
}

function drawCore(ctx: Ctx, s: MatchState, sp: Sprites, slot: Slot, fx: Fx) {
  const c = s.map.cores[slot]
  const hp = s.cores[slot].hp
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

function drawZombie(ctx: Ctx, s: MatchState, sp: Sprites, fx: Fx, z: Zombie, x: number, y: number) {
  const dx = z.x - z.px
  const dy = z.y - z.py
  const moving = Math.abs(dx) + Math.abs(dy) > 0.0005
  const dir = moving ? dirOf(dx, dy) : (fx.facing.get(z.id) ?? 'down')
  fx.facing.set(z.id, dir)

  const sheet = ZOMBIE_SHEET[z.kind]
  const anims = sheetAnimations(sheet)
  const sinceAttack = s.time - z.attackAt
  const sinceHurt = s.time - z.hurtAt
  let frame: number
  if (z.attackAt >= 0 && sinceAttack < 0.45) frame = frameAt(anims[`attack_${dir}`], sinceAttack)
  else if (z.hurtAt >= 0 && sinceHurt < 0.2) frame = frameAt(anims.hurt, sinceHurt)
  else frame = frameAt(anims[moving ? `walk_${dir}` : `idle_${dir}`], fx.clock + z.id * 0.37)

  ctx.fillStyle = 'rgba(0,0,0,0.3)'
  ctx.beginPath()
  ctx.ellipse(x * TILE, y * TILE + 10, z.kind === 'tank' ? 13 : 9, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  drawSheet(ctx, sp[`sheet-${sheet}`], frame, x * TILE, y * TILE + 11)
  if (z.hp < z.maxHp) hpBar(ctx, x * TILE, y * TILE - (z.kind === 'tank' ? 34 : 26), 18, z.hp / z.maxHp)
}

function drawPlayer(ctx: Ctx, s: MatchState, sp: Sprites, fx: Fx, p: Player, cx: number, cy: number, isMe: boolean) {
  const x = cx * TILE
  const y = cy * TILE
  const col = SLOT_COLOR[p.slot]
  const sheet = survivorSheet(p.survivor)
  const anims = sheetAnimations(sheet)
  const moving = Math.abs(p.x - p.px) + Math.abs(p.y - p.py) > 0.0005
  const dir = dirOf(p.dirX, p.dirY)
  const sinceShot = s.time - p.shotAt
  const sinceHurt = s.time - p.hurtAt
  let frame: number
  if (p.shotAt >= 0 && sinceShot < 0.22) frame = frameAt(anims[`${p.weapon === 'shotgun' ? 'shotgun' : 'pistol'}_${dir}`], sinceShot)
  else if (p.hurtAt >= 0 && sinceHurt < 0.2) frame = frameAt(anims.hurt, sinceHurt)
  else frame = frameAt(anims[moving ? `walk_${dir}` : `idle_${dir}`], fx.clock)

  ctx.strokeStyle = col.main
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.ellipse(x, y + 10, 11, 5, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1
  drawSheet(ctx, sp[`sheet-${sheet}`], frame, x, y + 11)

  // Etiqueta J1 / J2
  ctx.font = 'bold 9px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = col.dark
  ctx.fillRect(Math.round(x - 9), Math.round(y - 33), 18, 11)
  ctx.strokeStyle = isMe ? '#ffffff' : col.main
  ctx.lineWidth = 1
  ctx.strokeRect(Math.round(x - 9), Math.round(y - 33), 18, 11)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`J${p.slot}`, Math.round(x), Math.round(y - 27))
  if (p.hp < 100) hpBar(ctx, x, y - 38, 22, p.hp / 100, '#2ee86a')
}

// ---------------------------------------------------------------------------
// Minimapa
// ---------------------------------------------------------------------------

export function drawMinimap(ctx: Ctx, s: MatchState, staticLayer: HTMLCanvasElement, meId: string, cam: Camera | null, viewW: number, viewH: number) {
  const w = ctx.canvas.width
  const h = ctx.canvas.height
  const k = Math.min(w / (MAP_W * TILE), h / (MAP_H * TILE))
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.imageSmoothingEnabled = true
  ctx.drawImage(staticLayer, 0, 0, MAP_W * TILE * k, MAP_H * TILE * k)
  ctx.setTransform(k, 0, 0, k, 0, 0)
  for (const slot of [1, 2] as Slot[]) {
    const c = s.map.cores[slot]
    ctx.fillStyle = s.cores[slot].hp > 0 ? SLOT_COLOR[slot].main : '#333'
    ctx.fillRect(c.x * TILE, c.y * TILE, TILE * 2, TILE * 2)
  }
  ctx.fillStyle = '#7bd65a'
  for (const z of s.zombies) ctx.fillRect(z.x * TILE - 12, z.y * TILE - 12, 24, 24)
  for (const p of s.players) {
    if (!p.alive) continue
    ctx.fillStyle = p.id === meId ? '#ffffff' : SLOT_COLOR[p.slot].light
    ctx.beginPath()
    ctx.arc(p.x * TILE, p.y * TILE, 26, 0, Math.PI * 2)
    ctx.fill()
  }
  if (cam) {
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'
    ctx.lineWidth = 10
    ctx.strokeRect(cam.x, cam.y, viewW / cam.scale, viewH / cam.scale)
  }
}
