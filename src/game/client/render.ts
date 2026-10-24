import { MAP_H, MAP_W, TILE, type Slot } from '../constants'
import { lerp } from '../formulas'
import { Tile, type GameMapData } from '../mapgen'
import { createRng } from '../rng'
import type { BuildPreview, GameEvent, MatchState, Player } from '../engine'

// Dibujo con primitivas mientras llega la hoja de sprites del diseñador (casillas de 32 px).

const SLOT_COLOR: Record<Slot, { main: string; light: string; dark: string; floor: string; floorLine: string }> = {
  1: { main: '#3d8bff', light: '#8fc1ff', dark: '#173d78', floor: '#3a4458', floorLine: '#2d3546' },
  2: { main: '#ff2a2f', light: '#ff8a8d', dark: '#6e0b0f', floor: '#4f3a3c', floorLine: '#3e2d2f' },
}

const SURVIVOR_LOOK: Record<string, { shirt: string; hair: string; cap?: string }> = {
  explorador: { shirt: '#3a6fb0', hair: '#5a3a1e' },
  mecanica: { shirt: '#8c2f2f', hair: '#7a4a24', cap: '#d8262c' },
}

// ---------------------------------------------------------------------------
// Capa estática del mapa (se dibuja una vez)
// ---------------------------------------------------------------------------

export function createStaticLayer(map: GameMapData): HTMLCanvasElement {
  const c = document.createElement('canvas')
  c.width = MAP_W * TILE
  c.height = MAP_H * TILE
  const g = c.getContext('2d')!
  const rng = createRng(map.seed * 7 + 3)
  const grass = ['#3f5e2b', '#43642e', '#3a5728', '#476a31']

  for (let y = 0; y < MAP_H; y++) {
    for (let x = 0; x < MAP_W; x++) {
      const k = map.tiles[y * MAP_W + x]
      const px = x * TILE
      const py = y * TILE
      // Suelo
      g.fillStyle = rng.pick(grass)
      g.fillRect(px, py, TILE, TILE)
      for (let i = 0; i < 5; i++) {
        g.fillStyle = rng.next() < 0.5 ? '#557a38' : '#33502a'
        g.fillRect(px + rng.int(0, 29), py + rng.int(0, 29), 2, rng.int(2, 4))
      }
      if (k === Tile.BASE) {
        const slot: Slot = x < MAP_W / 2 ? 1 : 2
        g.fillStyle = SLOT_COLOR[slot].floor
        g.fillRect(px, py, TILE, TILE)
        g.fillStyle = SLOT_COLOR[slot].floorLine
        g.fillRect(px, py, TILE, 2)
        g.fillRect(px, py, 2, TILE)
        g.fillRect(px + 16, py + 2, 1, 14)
      } else if (k === Tile.BORDER) {
        drawTree(g, px, py, rng)
      } else if (k === Tile.ROCK) {
        drawRock(g, px, py)
      } else if (k === Tile.CAR) {
        drawCarTile(g, px, py, rng)
      } else if (k === Tile.DEBRIS) {
        drawDebris(g, px, py, rng)
      }
    }
  }

  // Marcas de aparición de zombis
  for (const sp of map.spawns) {
    const px = sp.x * TILE
    const py = sp.y * TILE
    g.fillStyle = 'rgba(120, 20, 20, 0.45)'
    g.fillRect(px - 8, py - 8, TILE + 16, TILE + 16)
    g.fillStyle = '#ff2a2f'
    g.font = 'bold 18px monospace'
    g.textAlign = 'center'
    g.textBaseline = 'middle'
    g.fillText('☠', px + 16, py + 16)
  }

  // Borde de las bases
  for (const slot of [1, 2] as Slot[]) {
    const b = map.bases[slot]
    g.strokeStyle = SLOT_COLOR[slot].main
    g.globalAlpha = 0.55
    g.lineWidth = 2
    g.setLineDash([6, 4])
    g.strokeRect(b.x * TILE + 1, b.y * TILE + 1, b.w * TILE - 2, b.h * TILE - 2)
    g.setLineDash([])
    g.globalAlpha = 1
  }
  return c
}

function drawTree(g: CanvasRenderingContext2D, px: number, py: number, rng: ReturnType<typeof createRng>) {
  g.fillStyle = '#1d2f1a'
  g.fillRect(px, py, TILE, TILE)
  g.fillStyle = rng.next() < 0.5 ? '#244a22' : '#2a5326'
  g.beginPath()
  g.arc(px + 16 + rng.int(-3, 3), py + 15 + rng.int(-3, 3), 14, 0, Math.PI * 2)
  g.fill()
  g.fillStyle = '#356b2e'
  g.fillRect(px + 9, py + 8, 6, 4)
}

function drawRock(g: CanvasRenderingContext2D, px: number, py: number) {
  g.fillStyle = '#2b2f36'
  g.fillRect(px + 2, py + 6, 28, 24)
  g.fillStyle = '#6b707a'
  g.fillRect(px + 3, py + 3, 26, 23)
  g.fillStyle = '#8a909b'
  g.fillRect(px + 5, py + 5, 12, 6)
  g.fillStyle = '#545962'
  g.fillRect(px + 14, py + 16, 13, 8)
}

function drawCarTile(g: CanvasRenderingContext2D, px: number, py: number, rng: ReturnType<typeof createRng>) {
  const body = rng.pick(['#7a2a2a', '#2a4a7a', '#5a5d63', '#7a6a2a'])
  g.fillStyle = '#16181c'
  g.fillRect(px + 3, py + 4, 4, 6)
  g.fillRect(px + 25, py + 4, 4, 6)
  g.fillRect(px + 3, py + 22, 4, 6)
  g.fillRect(px + 25, py + 22, 4, 6)
  g.fillStyle = body
  g.fillRect(px + 5, py + 3, 22, 26)
  g.fillStyle = '#9ec3d6'
  g.fillRect(px + 8, py + 7, 16, 6)
  g.fillStyle = 'rgba(0,0,0,0.25)'
  g.fillRect(px + 5, py + 22, 22, 7)
}

function drawDebris(g: CanvasRenderingContext2D, px: number, py: number, rng: ReturnType<typeof createRng>) {
  for (let i = 0; i < 6; i++) {
    g.fillStyle = rng.pick(['#5b4a36', '#6d6f73', '#4a3b2a', '#7b6248'])
    g.fillRect(px + rng.int(2, 22), py + rng.int(2, 22), rng.int(5, 10), rng.int(4, 8))
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
  muzzle: { x: number; y: number; dx: number; dy: number; life: number }[]
  coreFlash: Record<Slot, number>
  shake: number
}

export const createFx = (): Fx => ({ particles: [], decals: [], muzzle: [], coreFlash: { 1: 0, 2: 0 }, shake: 0 })

export function consumeEvents(fx: Fx, events: GameEvent[], meSlot: Slot) {
  for (const e of events) {
    if (e.type === 'hit') {
      for (let i = 0; i < 4; i++)
        fx.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 4, vy: (Math.random() - 0.5) * 4, life: 0.25, max: 0.25, color: '#ffd166', size: 2 })
    } else if (e.type === 'zombieDied') {
      fx.decals.push({ x: e.x, y: e.y, r: 0.3 + Math.random() * 0.25, a: 0.7 })
      for (let i = 0; i < 10; i++)
        fx.particles.push({ x: e.x, y: e.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, life: 0.45, max: 0.45, color: '#8a0f12', size: 3 })
      if (fx.decals.length > 120) fx.decals.shift()
    } else if (e.type === 'shot') {
      fx.muzzle.push({ x: e.x + e.dirX * 0.55, y: e.y + e.dirY * 0.55, dx: e.dirX, dy: e.dirY, life: 0.06 })
    } else if (e.type === 'coreHit') {
      fx.coreFlash[e.slot] = 0.2
      if (e.slot === meSlot) fx.shake = Math.max(fx.shake, 0.15)
    } else if (e.type === 'playerDied' && e.slot === meSlot) {
      fx.shake = 0.35
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
  const tilesAcross = w > h ? 24 : 12
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
  fx: Fx
  preview: BuildPreview | null
  time: number
}

const ix = (prev: number, cur: number, a: number) => lerp(prev, cur, a)

export function drawFrame(ctx: CanvasRenderingContext2D, s: MatchState, o: FrameOptions): Camera {
  updateFx(o.fx, o.dt)
  const me = s.players.find((p) => p.id === o.meId)
  const fx0 = me ? ix(me.px, me.x, o.alpha) : MAP_W / 2
  const fy0 = me ? ix(me.py, me.y, o.alpha) : MAP_H / 2
  const cam = computeCamera(o.width, o.height, fx0, fy0)
  const shake = o.fx.shake > 0 ? (Math.random() - 0.5) * 6 * o.fx.shake * 4 : 0

  ctx.setTransform(1, 0, 0, 1, 0, 0)
  ctx.fillStyle = '#0b0f17'
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height)
  const k = o.dpr * cam.scale
  ctx.setTransform(k, 0, 0, k, (-cam.x + shake) * k, (-cam.y + shake) * k)
  ctx.imageSmoothingEnabled = false

  ctx.drawImage(o.staticLayer, 0, 0)

  // Sangre en el suelo
  for (const d of o.fx.decals) {
    ctx.fillStyle = `rgba(110, 10, 14, ${d.a})`
    ctx.beginPath()
    ctx.ellipse(d.x * TILE, d.y * TILE, d.r * TILE, d.r * TILE * 0.7, 0, 0, Math.PI * 2)
    ctx.fill()
  }

  // Cuadrícula de construcción dentro de tu base
  if (me && o.preview) {
    const b = s.map.bases[me.slot]
    ctx.fillStyle = 'rgba(46, 232, 106, 0.08)'
    ctx.fillRect(b.x * TILE, b.y * TILE, b.w * TILE, b.h * TILE)
    ctx.strokeStyle = 'rgba(46, 232, 106, 0.28)'
    ctx.lineWidth = 1
    for (let i = 0; i <= b.w; i++) {
      ctx.beginPath()
      ctx.moveTo((b.x + i) * TILE, b.y * TILE)
      ctx.lineTo((b.x + i) * TILE, (b.y + b.h) * TILE)
      ctx.stroke()
    }
    for (let i = 0; i <= b.h; i++) {
      ctx.beginPath()
      ctx.moveTo(b.x * TILE, (b.y + i) * TILE)
      ctx.lineTo((b.x + b.w) * TILE, (b.y + i) * TILE)
      ctx.stroke()
    }
  }

  // Estructuras
  for (const [key, st] of s.structures) {
    const x = (key % MAP_W) * TILE
    const y = Math.floor(key / MAP_W) * TILE
    if (st.type === 'trap') drawTrap(ctx, x, y, st.owner)
    else drawWall(ctx, x, y, st.type, st.hp / st.maxHp)
  }

  // Cajas y núcleos
  for (const slot of [1, 2] as Slot[]) {
    const c = s.map.crates[slot]
    drawCrate(ctx, c.x * TILE, c.y * TILE, slot)
    drawCore(ctx, s, slot, o.time, o.fx.coreFlash[slot])
  }

  // Entidades ordenadas por y
  type Drawable = { y: number; draw: () => void }
  const list: Drawable[] = []
  for (const z of s.zombies) {
    const x = ix(z.px, z.x, o.alpha)
    const y = ix(z.py, z.y, o.alpha)
    list.push({ y, draw: () => drawZombie(ctx, x, y, z.hp / z.maxHp, o.time + z.id) })
  }
  for (const p of s.players) {
    if (!p.alive) continue
    const x = ix(p.px, p.x, o.alpha)
    const y = ix(p.py, p.y, o.alpha)
    list.push({ y, draw: () => drawPlayer(ctx, p, x, y, p.id === o.meId) })
  }
  list.sort((a, b) => a.y - b.y).forEach((d) => d.draw())

  // Balas
  ctx.strokeStyle = '#ffe08a'
  ctx.lineWidth = 2
  for (const b of s.bullets) {
    const x = ix(b.px, b.x, o.alpha) * TILE
    const y = ix(b.py, b.y, o.alpha) * TILE
    ctx.beginPath()
    ctx.moveTo(x - b.vx * 0.6, y - b.vy * 0.6)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  for (const m of o.fx.muzzle) {
    ctx.fillStyle = '#ffd166'
    ctx.beginPath()
    ctx.arc(m.x * TILE, m.y * TILE, 5, 0, Math.PI * 2)
    ctx.fill()
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
    ctx.fillStyle = ok ? 'rgba(46, 232, 106, 0.45)' : 'rgba(255, 42, 47, 0.4)'
    ctx.fillRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2)
    ctx.strokeStyle = ok ? '#2ee86a' : '#ff2a2f'
    ctx.lineWidth = 2
    ctx.strokeRect(x * TILE + 1, y * TILE + 1, TILE - 2, TILE - 2)
  }

  return cam
}

function hpBar(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, pct: number, color = '#ff3b3b') {
  ctx.fillStyle = 'rgba(0,0,0,0.7)'
  ctx.fillRect(x - w / 2 - 1, y - 1, w + 2, 5)
  ctx.fillStyle = color
  ctx.fillRect(x - w / 2, y, w * Math.max(0, pct), 3)
}

function drawWall(ctx: CanvasRenderingContext2D, x: number, y: number, type: 'wood' | 'reinforced', pct: number) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(x + 2, y + 6, TILE, TILE - 4)
  if (type === 'wood') {
    ctx.fillStyle = '#8a5a2b'
    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2)
    ctx.fillStyle = '#6b4220'
    for (let i = 0; i < 4; i++) ctx.fillRect(x + 1 + i * 8, y + 1, 1, TILE - 2)
    ctx.fillStyle = '#a8743c'
    ctx.fillRect(x + 1, y + 5, TILE - 2, 3)
    ctx.fillRect(x + 1, y + 22, TILE - 2, 3)
  } else {
    ctx.fillStyle = '#6d737d'
    ctx.fillRect(x + 1, y + 1, TILE - 2, TILE - 2)
    ctx.fillStyle = '#8c939e'
    ctx.fillRect(x + 1, y + 1, TILE - 2, 4)
    ctx.fillStyle = '#3d4249'
    for (const [bx, by] of [[5, 9], [24, 9], [5, 24], [24, 24]]) ctx.fillRect(x + bx, y + by, 3, 3)
  }
  if (pct < 0.6) {
    ctx.strokeStyle = 'rgba(0,0,0,0.6)'
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(x + 8, y + 4)
    ctx.lineTo(x + 15, y + 15)
    ctx.lineTo(x + 11, y + 26)
    ctx.stroke()
  }
  if (pct < 1) hpBar(ctx, x + TILE / 2, y - 5, 24, pct, pct > 0.5 ? '#2ee86a' : '#ffb020')
}

function drawTrap(ctx: CanvasRenderingContext2D, x: number, y: number, owner: Slot) {
  ctx.fillStyle = 'rgba(40, 30, 25, 0.85)'
  ctx.fillRect(x + 3, y + 3, TILE - 6, TILE - 6)
  ctx.fillStyle = '#c9ced6'
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const sx = x + 7 + i * 8
      const sy = y + 7 + j * 8
      ctx.beginPath()
      ctx.moveTo(sx, sy + 6)
      ctx.lineTo(sx + 3, sy)
      ctx.lineTo(sx + 6, sy + 6)
      ctx.fill()
    }
  ctx.strokeStyle = SLOT_COLOR[owner].main
  ctx.globalAlpha = 0.6
  ctx.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6)
  ctx.globalAlpha = 1
}

function drawCrate(ctx: CanvasRenderingContext2D, x: number, y: number, slot: Slot) {
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.fillRect(x + 5, y + 8, 24, 22)
  ctx.fillStyle = '#9a6a35'
  ctx.fillRect(x + 4, y + 5, 24, 22)
  ctx.strokeStyle = '#5e3c18'
  ctx.lineWidth = 2
  ctx.strokeRect(x + 4, y + 5, 24, 22)
  ctx.beginPath()
  ctx.moveTo(x + 4, y + 5)
  ctx.lineTo(x + 28, y + 27)
  ctx.moveTo(x + 28, y + 5)
  ctx.lineTo(x + 4, y + 27)
  ctx.stroke()
  ctx.fillStyle = SLOT_COLOR[slot].main
  ctx.fillRect(x + 13, y + 2, 6, 4)
}

function drawCore(ctx: CanvasRenderingContext2D, s: MatchState, slot: Slot, time: number, flash: number) {
  const c = s.map.cores[slot]
  const x = c.x * TILE
  const y = c.y * TILE
  const col = SLOT_COLOR[slot]
  const alive = s.cores[slot].hp > 0
  ctx.fillStyle = '#20252e'
  ctx.fillRect(x + 2, y + 2, TILE * 2 - 4, TILE * 2 - 4)
  ctx.fillStyle = col.dark
  ctx.fillRect(x + 6, y + 6, TILE * 2 - 12, TILE * 2 - 12)
  if (alive) {
    const pulse = 0.55 + Math.sin(time * 3) * 0.2
    const grd = ctx.createRadialGradient(x + TILE, y + TILE, 2, x + TILE, y + TILE, TILE * 1.6)
    grd.addColorStop(0, col.light)
    grd.addColorStop(1, 'transparent')
    ctx.globalAlpha = pulse
    ctx.fillStyle = grd
    ctx.fillRect(x - TILE / 2, y - TILE / 2, TILE * 3, TILE * 3)
    ctx.globalAlpha = 1
    ctx.fillStyle = flash > 0 ? '#ffffff' : col.main
    ctx.beginPath()
    ctx.moveTo(x + TILE, y + 12)
    ctx.lineTo(x + TILE + 12, y + TILE)
    ctx.lineTo(x + TILE, y + TILE * 2 - 12)
    ctx.lineTo(x + TILE - 12, y + TILE)
    ctx.closePath()
    ctx.fill()
    hpBar(ctx, x + TILE, y - 8, 52, s.cores[slot].hp / 500, col.main)
  } else {
    ctx.fillStyle = '#111'
    ctx.fillRect(x + 14, y + 14, TILE * 2 - 28, TILE * 2 - 28)
  }
}

function drawZombie(ctx: CanvasRenderingContext2D, cx: number, cy: number, pct: number, t: number) {
  const x = cx * TILE
  const y = cy * TILE
  const bob = Math.sin(t * 8) * 1.2
  ctx.fillStyle = 'rgba(0,0,0,0.35)'
  ctx.beginPath()
  ctx.ellipse(x, y + 11, 9, 4, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#3c3350'
  ctx.fillRect(x - 6, y + 3 + bob, 5, 8)
  ctx.fillRect(x + 1, y + 3 - bob, 5, 8)
  ctx.fillStyle = '#5b4d6e'
  ctx.fillRect(x - 7, y - 5, 14, 10)
  ctx.fillStyle = '#6f9a52'
  ctx.fillRect(x - 11, y - 3, 4, 3)
  ctx.fillRect(x + 7, y - 3, 4, 3)
  ctx.fillRect(x - 6, y - 15, 12, 11)
  ctx.fillStyle = '#ff2a2f'
  ctx.fillRect(x - 4, y - 11, 2, 2)
  ctx.fillRect(x + 2, y - 11, 2, 2)
  if (pct < 1) hpBar(ctx, x, y - 20, 18, pct)
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player, cx: number, cy: number, isMe: boolean) {
  const x = cx * TILE
  const y = cy * TILE
  const col = SLOT_COLOR[p.slot]
  const look = SURVIVOR_LOOK[p.survivor] ?? SURVIVOR_LOOK.explorador

  ctx.strokeStyle = col.main
  ctx.lineWidth = 2
  ctx.globalAlpha = 0.8
  ctx.beginPath()
  ctx.ellipse(x, y + 11, 11, 5, 0, 0, Math.PI * 2)
  ctx.stroke()
  ctx.globalAlpha = 1

  // Arma apuntando hacia donde mira
  const len = Math.hypot(p.dirX, p.dirY) || 1
  const dx = p.dirX / len
  const dy = p.dirY / len
  ctx.strokeStyle = '#2a2d33'
  ctx.lineWidth = 4
  ctx.beginPath()
  ctx.moveTo(x + dx * 3, y - 2 + dy * 3)
  ctx.lineTo(x + dx * 15, y - 2 + dy * 15)
  ctx.stroke()

  ctx.fillStyle = '#2b3a55'
  ctx.fillRect(x - 6, y + 3, 5, 8)
  ctx.fillRect(x + 1, y + 3, 5, 8)
  ctx.fillStyle = look.shirt
  ctx.fillRect(x - 7, y - 6, 14, 10)
  ctx.fillStyle = '#f1c27d'
  ctx.fillRect(x - 6, y - 16, 12, 11)
  ctx.fillStyle = look.cap ?? look.hair
  ctx.fillRect(x - 7, y - 18, 14, 5)
  if (look.cap) {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(x - 1, y - 17, 3, 3)
    ctx.fillStyle = look.hair
    ctx.fillRect(x + 5, y - 13, 3, 8)
  }
  ctx.fillStyle = '#1a1a1a'
  ctx.fillRect(x - 3 + dx * 2, y - 11, 2, 2)
  ctx.fillRect(x + 2 + dx * 2, y - 11, 2, 2)

  // Etiqueta J1 / J2
  const label = `J${p.slot}`
  ctx.font = 'bold 9px monospace'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = col.dark
  ctx.fillRect(x - 9, y - 31, 18, 11)
  ctx.strokeStyle = isMe ? '#ffffff' : col.main
  ctx.lineWidth = 1
  ctx.strokeRect(x - 9, y - 31, 18, 11)
  ctx.fillStyle = '#ffffff'
  ctx.fillText(label, x, y - 25)
  if (p.hp < 100) hpBar(ctx, x, y - 36, 22, p.hp / 100, '#2ee86a')
}

// ---------------------------------------------------------------------------
// Minimapa
// ---------------------------------------------------------------------------

export function drawMinimap(ctx: CanvasRenderingContext2D, s: MatchState, staticLayer: HTMLCanvasElement, meId: string, cam: Camera | null, viewW: number, viewH: number) {
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
