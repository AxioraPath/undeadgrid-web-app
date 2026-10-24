import { CORE_HP, MAP_H, MAP_W, TILE, type Slot } from '../constants'
import { lerp } from '../formulas'
import { Ground, Tile, type GameMapData, type MapObject } from '../mapgen'
import { createRng } from '../rng'
import type { BuildPreview, GameEvent, MatchState, Player, Zombie } from '../engine'
import { survivorSprite, type SpriteName, type Sprites } from './sprites'

const SLOT_COLOR: Record<Slot, { main: string; light: string; dark: string; tint: string }> = {
  1: { main: '#3d8bff', light: '#8fc1ff', dark: '#173d78', tint: 'rgba(61, 139, 255, 0.16)' },
  2: { main: '#ff2a2f', light: '#ff8a8d', dark: '#6e0b0f', tint: 'rgba(255, 42, 47, 0.14)' },
}

/** La capa estática se dibuja al doble de resolución para que las texturas no se vean borrosas. */
const RES = 2
const T2 = TILE * RES

type Ctx = CanvasRenderingContext2D

/** Dibuja un sprite anclado abajo al centro, con el ancho dado (alto según su proporción). */
function sprite(ctx: Ctx, img: HTMLImageElement, cx: number, bottom: number, width: number, flip = false) {
  const h = (width * img.height) / img.width
  if (flip) {
    ctx.save()
    ctx.translate(cx, 0)
    ctx.scale(-1, 1)
    ctx.drawImage(img, -width / 2, bottom - h, width, h)
    ctx.restore()
  } else {
    ctx.drawImage(img, cx - width / 2, bottom - h, width, h)
  }
}

// ---------------------------------------------------------------------------
// Capa estática del mapa (se dibuja una vez)
// ---------------------------------------------------------------------------

export function createStaticLayer(map: GameMapData, sp: Sprites): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = MAP_W * T2
  c.height = MAP_H * T2
  const g = c.getContext('2d')!
  g.imageSmoothingEnabled = false
  const rng = createRng(map.seed * 7 + 3)

  // Suelo
  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const i = y * MAP_W + x
      const gk = map.ground[i]
      const border = map.tiles[i] === Tile.BORDER
      let tex: SpriteName
      if (border) tex = 'ground-grass-dense'
      else if (gk === Ground.ROAD) tex = rng.pick(['ground-asphalt', 'ground-asphalt', 'ground-asphalt-cracked', 'ground-asphalt-grass'] as const)
      else if (gk === Ground.BASE) tex = (x + y) % 5 === 0 ? 'ground-pavers' : 'ground-tiles-dark'
      else if (gk === Ground.DIRT) tex = rng.pick(['ground-dirt', 'ground-mud'] as const)
      else if (gk === Ground.WATER) tex = 'ground-water'
      else tex = rng.next() < 0.75 ? 'ground-grass' : 'ground-grass-dense'
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

  // Marcas de las avenidas
  drawRoadMarks(g, map)

  // Agua: orilla oscura
  for (const o of map.objects.filter((o) => o.kind === 'water')) {
    g.strokeStyle = 'rgba(10, 30, 30, 0.8)'
    g.lineWidth = 6
    g.strokeRect(o.x * T2 + 3, o.y * T2 + 3, o.w * T2 - 6, o.h * T2 - 6)
  }

  // Marcas de aparición de zombis
  for (const s of map.spawns) {
    const grd = g.createRadialGradient((s.x + 0.5) * T2, (s.y + 0.5) * T2, 4, (s.x + 0.5) * T2, (s.y + 0.5) * T2, T2 * 1.6)
    grd.addColorStop(0, 'rgba(150, 10, 14, 0.75)')
    grd.addColorStop(1, 'rgba(150, 10, 14, 0)')
    g.fillStyle = grd
    g.fillRect((s.x - 1.5) * T2, (s.y - 1.5) * T2, T2 * 4, T2 * 4)
  }

  // Detalles sueltos en el pasto (no bloquean)
  for (let y = 1; y < MAP_H - 1; y++)
    for (let x = 1; x < MAP_W - 1; x++) {
      const i = y * MAP_W + x
      if (map.tiles[i] !== Tile.GRASS || map.ground[i] !== Ground.GRASS || rng.next() > 0.07) continue
      const img = sp[rng.pick(['grass-tuft', 'bush-dry', 'grass-tuft'] as const)]
      sprite(g, img, (x + 0.3 + rng.next() * 0.4) * T2, (y + 0.9) * T2, T2 * 0.55)
    }

  // Objetos y bosque del borde, ordenados por y para que se tapen bien
  type Item = { y: number; draw: () => void }
  const items: Item[] = map.objects.filter((o) => o.kind !== 'water').map((o) => ({ y: o.y + o.h, draw: () => drawObject(g, sp, o) }))
  for (let y = 0; y < MAP_H; y++)
    for (let x = 0; x < MAP_W; x++) {
      if (map.tiles[y * MAP_W + x] !== Tile.BORDER) continue
      const tree = sp[rng.pick(['tree', 'tree', 'tree', 'tree-autumn', 'bush'] as const)]
      const jx = (rng.next() - 0.5) * 0.3
      items.push({ y: y + 1, draw: () => sprite(g, tree, (x + 0.5 + jx) * T2, (y + 1.05) * T2, T2 * 1.55) })
    }
  items.sort((a, b) => a.y - b.y).forEach((i) => i.draw())

  return c
}

function drawRoadMarks(g: Ctx, map: GameMapData) {
  const [r0, r1] = map.roads.rows
  const [c0, c1] = map.roads.cols
  g.fillStyle = '#e0a526'
  // Línea central discontinua entre carriles (sin pasar por el cruce)
  for (let x = 1; x < MAP_W - 1; x++) {
    if (x >= c0 && x <= c1) continue
    g.fillRect(x * T2 + 12, r1 * T2 - 3, T2 - 24, 6)
  }
  for (let y = 1; y < MAP_H - 1; y++) {
    if (y >= r0 && y <= r1) continue
    g.fillRect(c1 * T2 - 3, y * T2 + 12, 6, T2 - 24)
  }
  // Orillas blancas
  g.fillStyle = 'rgba(220, 220, 210, 0.55)'
  for (let x = 1; x < MAP_W - 1; x++) {
    if (x >= c0 && x <= c1) continue
    if (map.ground[r0 * MAP_W + x] === Ground.ROAD) g.fillRect(x * T2, r0 * T2 + 2, T2, 3)
    if (map.ground[r1 * MAP_W + x] === Ground.ROAD) g.fillRect(x * T2, (r1 + 1) * T2 - 5, T2, 3)
  }
  for (let y = 1; y < MAP_H - 1; y++) {
    if (y >= r0 && y <= r1) continue
    if (map.ground[y * MAP_W + c0] === Ground.ROAD) g.fillRect(c0 * T2 + 2, y * T2, 3, T2)
    if (map.ground[y * MAP_W + c1] === Ground.ROAD) g.fillRect((c1 + 1) * T2 - 5, y * T2, 3, T2)
  }
}

function drawObject(g: Ctx, sp: Sprites, o: MapObject) {
  const cx = (o.x + o.w / 2) * T2
  const bottom = (o.y + o.h) * T2
  switch (o.kind) {
    case 'tree':
      sprite(g, sp[(['tree', 'tree-autumn', 'tree-dead'] as const)[o.variant % 3]], cx, bottom + 4, T2 * 1.6)
      break
    case 'rock':
      sprite(g, sp[o.variant ? 'rocks' : 'rock'], cx, bottom, T2 * 1.15)
      break
    case 'debris':
      sprite(g, sp[o.variant ? 'bricks' : 'debris'], cx, bottom, T2 * 1.15)
      break
    case 'barrel':
      sprite(g, sp.barrel, cx, bottom - 2, T2 * 0.62)
      break
    case 'tires':
      sprite(g, sp.tires, cx, bottom - 2, T2 * 0.9)
      break
    case 'container': {
      const color = o.variant ? 'blue' : 'red'
      const img = sp[o.w > o.h ? (`container-${color}-h` as const) : (`container-${color}-v` as const)]
      sprite(g, img, cx, bottom + 2, o.w * T2 + 6)
      break
    }
    case 'car': {
      const img = sp[(['car-red-v', 'car-wreck-v', 'van-v', 'truck-v'] as const)[o.variant % 4]]
      if (o.h >= o.w) {
        sprite(g, img, cx, bottom + 2, T2 * 0.95)
      } else {
        // Autos sobre la avenida horizontal: el sprite vertical rotado
        const len = T2 * 2.05
        const wid = (len * img.width) / img.height
        g.save()
        g.translate(cx, (o.y + 0.5) * T2)
        g.rotate(-Math.PI / 2)
        g.drawImage(img, -wid / 2, -len / 2, wid, len)
        g.restore()
      }
      g.drawImage(sp.cone, cx + T2 * (o.w > o.h ? 1.1 : 0.55), bottom - T2 * 0.5, T2 * 0.35, T2 * 0.4)
      break
    }
  }
}

// ---------------------------------------------------------------------------
// Efectos visuales (solo cliente)
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
  corpses: { x: number; y: number; life: number; flip: boolean }[]
  muzzle: { x: number; y: number; dx: number; dy: number; life: number }[]
  deadPlayers: Partial<Record<Slot, { x: number; y: number }>>
  coreFlash: Record<Slot, number>
  shake: number
}

export const createFx = (): Fx => ({ particles: [], decals: [], corpses: [], muzzle: [], deadPlayers: {}, coreFlash: { 1: 0, 2: 0 }, shake: 0 })

export function consumeEvents(fx: Fx, events: GameEvent[], meSlot: Slot) {
  for (const e of events) {
    if (e.type === 'hit') {
      for (let i = 0; i < 4; i++)
        fx.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 0.25, max: 0.25, color: '#ffd166', size: 2 })
    } else if (e.type === 'zombieDied') {
      fx.decals.push({ x: e.x, y: e.y, r: 0.3 + Math.random() * 0.25, a: 0.6 })
      fx.corpses.push({ x: e.x, y: e.y, life: 4, flip: Math.random() < 0.5 })
      for (let i = 0; i < 10; i++)
        fx.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 0.45, max: 0.45, color: '#8a0f12', size: 3 })
      if (fx.decals.length > 120) fx.decals.shift()
    } else if (e.type === 'shot') {
      fx.muzzle.push({ x: e.x + e.dirX * 0.6, y: e.y - 0.15 + e.dirY * 0.6, dx: e.dirX, dy: e.dirY, life: 0.06 })
    } else if (e.type === 'coreHit') {
      fx.coreFlash[e.slot] = 0.2
      if (e.slot === meSlot) fx.shake = Math.max(fx.shake, 0.15)
    } else if (e.type === 'playerDied') {
      fx.deadPlayers[e.slot] = { x: e.x, y: e.y }
      fx.decals.push({ x: e.x, y: e.y, r: 0.45, a: 0.7 })
      if (e.slot === meSlot) fx.shake = 0.35
    }
  }
}

function updateFx(fx: Fx, dt: number) {
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
  time: number
}

const ix = (prev: number, cur: number, a: number) => lerp(prev, cur, a)

export function drawFrame(ctx: Ctx, s: MatchState, o: FrameOptions): Camera {
  updateFx(o.fx, o.dt)
  const sp = o.sprites
  const me = s.players.find((p) => p.id === o.meId)
  const fx0 = me ? ix(me.px, me.x, o.alpha) : MAP_W / 2
  const fy0 = me ? ix(me.py, me.y, o.alpha) : MAP_H / 2
  const cam = computeCamera(o.width, o.height, fx0, fy0)
  const shake = o.fx.shake > 0 ? (Math.random() - 0.5) * 24 * o.fx.shake : 0

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#0b0f17'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const k = o.dpr * cam.scale
  ctx.setTransform(k, 0, 0, k, (-cam.x + shake) * k, (-cam.y + shake) * k)
  ctx.imageSmoothingEnabled = false

  ctx.drawImage(o.staticLayer, 0, 0, MAP_W * TILE, MAP_H * TILE)

  // Sangre en el suelo
  for (const d of o.fx.decals) {
    ctx.fillStyle = `rgba(110, 10, 14, ${d.a})`
    ctx.beginPath()
    ctx.ellipse(d.x * TILE, d.y * TILE + 6, d.r * TILE, d.r * TILE * 0.6, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Cuadrícula de construcción dentro de tu base
  if (me && o.preview) drawBuildGrid(ctx, s, me.slot)

  // Trampas (van al ras del suelo)
  for (const [key, st] of s.structures) {
    if (st.type !== 'trap') continue
    const x = (key % MAP_W) * TILE
    const y = Math.floor(key / MAP_W) * TILE
    sprite(ctx, sp.trap, x + TILE / 2, y + TILE - 1, TILE * 0.95)
  }

  // Cuerpos
  for (const c of o.fx.corpses) {
    ctx.globalAlpha = Math.min(1, c.life)
    sprite(ctx, sp['zombie-normal-dead'], c.x * TILE, c.y * TILE + 10, TILE * 1.2, c.flip)
  }
  ctx.globalAlpha = 1

  // Todo lo que tiene altura se ordena por y
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
    list.push({ y: c.y + 1, draw: () => sprite(ctx, sp[slot === 1 ? 'crate-blue' : 'crate-red'], (c.x + 0.5) * TILE, (c.y + 1) * TILE, TILE * 1.05) })
    const core = s.map.cores[slot]
    list.push({ y: core.y + 2, draw: () => drawCore(ctx, s, sp, slot, o.time, o.fx.coreFlash[slot]) })
  }
  for (const z of s.zombies) {
    const x = ix(z.px, z.x, o.alpha)
    const y = ix(z.py, z.y, o.alpha)
    list.push({ y, draw: () => drawZombie(ctx, sp, z, x, y, o.time) })
  }
  for (const p of s.players) {
    if (p.alive) {
      const x = ix(p.px, p.x, o.alpha)
      const y = ix(p.py, p.y, o.alpha)
      list.push({ y, draw: () => drawPlayer(ctx, sp, p, x, y, p.id === o.meId, o.time) })
    } else {
      const d = o.fx.deadPlayers[p.slot]
      if (d) list.push({ y: d.y, draw: () => sprite(ctx, sp[`${survivorSprite(p.survivor)}-dead`], d.x * TILE, d.y * TILE + 10, TILE * 1.3) })
    }
  }
  list.sort((a, b) => a.y - b.y).forEach((d) => d.draw())

  // Balas
  ctx.strokeStyle = '#ffe08a'
  ctx.lineWidth = 2
  for (const b of s.bullets) {
    const x = ix(b.px, b.x, o.alpha) * TILE
    const y = ix(b.py, b.y, o.alpha) * TILE - 5
    ctx.beginPath()
    ctx.moveTo(x - b.vx * 0.6, y - b.vy * 0.6)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  for (const m of o.fx.muzzle) {
    const grd = ctx.createRadialGradient(m.x * TILE, m.y * TILE, 0, m.x * TILE, m.y * TILE, 9)
    grd.addColorStop(0, '#fff6c2')
    grd.addColorStop(0.4, '#ffb52e')
    grd.addColorStop(1, 'rgba(255, 120, 0, 0)')
    ctx.fillStyle = grd
    ctx.fillRect(m.x * TILE - 9, m.y * TILE - 9, 18, 18)
  }
  for (const p of o.fx.particles) {
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
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5)
  ctx.fillStyle = color
  ctx.fillRect(x - w / 2, y, w * Math.max(0, pct), 3)
}

const isWallAt = (s: MatchState, x: number, y: number) => {
  const st = s.structures.get(y * MAP_W + x)
  return !!st && st.type !== 'trap'
}

function drawWall(ctx: Ctx, s: MatchState, sp: Sprites, tx: number, ty: number, type: 'wood' | 'reinforced', pct: number) {
  // Orientación según las paredes vecinas
  const vertical = (isWallAt(s, tx, ty - 1) || isWallAt(s, tx, ty + 1)) && !isWallAt(s, tx - 1, ty) && !isWallAt(s, tx + 1, ty)
  const mat = type === 'wood' ? 'wood' : 'metal'
  const img = pct < 0.5 && !vertical ? sp[`wall-${mat}-broken`] : sp[`wall-${mat}-${vertical ? 'v' : 'h'}`]
  const cx = (tx + 0.5) * TILE
  sprite(ctx, img, cx, (ty + 1) * TILE + 2, vertical ? TILE * 0.85 : TILE * 1.15)
  if (pct < 1) hpBar(ctx, cx, ty * TILE - 8, 24, pct, pct > 0.5 ? '#2ee86a' : '#ffb020')
}

function drawCore(ctx: Ctx, s: MatchState, sp: Sprites, slot: Slot, time: number, flash: number) {
  const c = s.map.cores[slot]
  const hp = s.cores[slot].hp
  const color = slot === 1 ? 'blue' : 'red'
  const state = hp <= 0 ? '-destroyed' : hp < CORE_HP / 2 ? '-damaged' : ''
  const cx = (c.x + 1) * TILE
  const cy = (c.y + 1) * TILE
  if (hp > 0) {
    const grd = ctx.createRadialGradient(cx, cy, 4, cx, cy, TILE * 1.8)
    grd.addColorStop(0, SLOT_COLOR[slot].light)
    grd.addColorStop(1, 'transparent')
    ctx.globalAlpha = 0.35 + Math.sin(time * 3) * 0.12 + flash * 2
    ctx.fillStyle = grd
    ctx.fillRect(cx - TILE * 2, cy - TILE * 2, TILE * 4, TILE * 4)
    ctx.globalAlpha = 1
  }
  sprite(ctx, sp[`core-${color}${state}` as SpriteName], cx, (c.y + 2) * TILE + 2, TILE * 2.2)
  if (flash > 0) {
    ctx.globalAlpha = flash * 3
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(c.x * TILE + 8, c.y * TILE + 4, TILE * 2 - 16, TILE * 2 - 8)
    ctx.globalAlpha = 1
  }
  if (hp > 0) hpBar(ctx, cx, c.y * TILE - 14, 54, hp / CORE_HP, SLOT_COLOR[slot].main)
}

function drawZombie(ctx: Ctx, sp: Sprites, z: Zombie, x: number, y: number, t: number) {
  const frame = Math.floor(t * 7 + z.id) % 4
  const img = sp[`zombie-${z.kind}-${frame}` as SpriteName]
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(x * TILE, y * TILE + 10, 9, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  sprite(ctx, img, x * TILE, y * TILE + 12, TILE * 0.95, z.x < z.px)
  if (z.hp < z.maxHp) hpBar(ctx, x * TILE, y * TILE - 26, 18, z.hp / z.maxHp)
}

function drawPlayer(ctx: Ctx, sp: Sprites, p: Player, cx: number, cy: number, isMe: boolean, t: number) {
  const x = cx * TILE
  const y = cy * TILE
  const col = SLOT_COLOR[p.slot]
  const prefix = survivorSprite(p.survivor)
  const moving = Math.abs(p.x - p.px) + Math.abs(p.y - p.py) > 0.001

  ctx.strokeStyle = col.main
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.85
  ctx.beginPath()
  ctx.ellipse(x, y + 11, 11, 5, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1

  const side = Math.abs(p.dirX) >= Math.abs(p.dirY) * 0.9
  let name: SpriteName
  if (side) name = (p.weapon === 'shotgun' ? `${prefix}-side-shotgun` : `${prefix}-side`) as SpriteName
  else name = (p.dirY < 0 ? `${prefix}-back` : `${prefix}-front`) as SpriteName
  const bob = moving ? Math.abs(Math.sin(t * 12)) * -2 : 0
  sprite(ctx, sp[name], x, y + 13 + bob, side ? TILE * 1.25 : TILE * 0.95, side && p.dirX < 0)

  // Etiqueta J1 / J2
  ctx.font = 'bold 9px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = col.dark
  ctx.fillRect(x - 9, y - 36, 18, 11)
  ctx.strokeStyle = isMe ? '#ffffff' : col.main
  ctx.lineWidth = 1
  ctx.strokeRect(x - 9, y - 36, 18, 11)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(`J${p.slot}`, x, y - 30)
  if (p.hp < 100) hpBar(ctx, x, y - 41, 22, p.hp / 100, '#2ee86a')
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
