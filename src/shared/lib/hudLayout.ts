import type { CSSProperties } from 'react'

/**
 * Custom HUD layout. Positions are fractions of the FREE space inside the safe area:
 * x = 0 is flush left, x = 1 flush right (same for y with top / bottom). Because the free space
 * is "area minus the element's own size", any stored value stays inside the screen on every
 * viewport size and after a rotation, and the element can never overflow.
 */
export const HUD_LAYOUT_VERSION = 1

export const HUD_SCALE_MIN = 0.5
export const HUD_SCALE_MAX = 1.5

export type HudElementId = 'moveStick' | 'aimStick' | 'quickWeapon' | 'hotbar' | 'minimap' | 'playerPanel' | 'phasePanel'

export interface HudElementInfo {
  id: HudElementId
  label: string
  /** Short name for compact lists. */
  short: string
  /** Only exists with touch controls. */
  touchOnly: boolean
}

export const HUD_ELEMENTS: readonly HudElementInfo[] = [
  { id: 'moveStick', label: 'Joystick izquierdo', short: 'Mover', touchOnly: true },
  { id: 'aimStick', label: 'Joystick derecho', short: 'Mira', touchOnly: true },
  { id: 'quickWeapon', label: 'Cambio de arma', short: 'Arma', touchOnly: true },
  { id: 'hotbar', label: 'Barra de objetos', short: 'Barra', touchOnly: false },
  { id: 'minimap', label: 'Minimapa', short: 'Mapa', touchOnly: false },
  { id: 'playerPanel', label: 'Panel de jugador', short: 'Vida', touchOnly: false },
  { id: 'phasePanel', label: 'Panel de fase', short: 'Fase', touchOnly: false },
]

export const HUD_ELEMENT_IDS = HUD_ELEMENTS.map((e) => e.id)

export interface HudItem {
  x: number
  y: number
  scale: number
}

export interface HudLayout {
  v: number
  /** Only customised elements are present; the rest keep the built-in responsive layout. */
  items: Partial<Record<HudElementId, HudItem>>
}

export const DEFAULT_HUD_LAYOUT: HudLayout = { v: HUD_LAYOUT_VERSION, items: {} }

const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
export const clamp01 = (n: number) => clamp(n, 0, 1)
export const clampScale = (n: number) => clamp(n, HUD_SCALE_MIN, HUD_SCALE_MAX)

const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n)

/** Anything read from storage is untrusted: unknown ids, wrong versions and bad numbers are dropped. */
export function sanitizeHudLayout(raw: unknown): HudLayout {
  if (!raw || typeof raw !== 'object') return DEFAULT_HUD_LAYOUT
  const { v, items } = raw as { v?: unknown; items?: unknown }
  if (v !== HUD_LAYOUT_VERSION || !items || typeof items !== 'object') return DEFAULT_HUD_LAYOUT
  const out: HudLayout['items'] = {}
  for (const id of HUD_ELEMENT_IDS) {
    const it = (items as Record<string, unknown>)[id] as Partial<HudItem> | undefined
    if (!it || !isNum(it.x) || !isNum(it.y)) continue
    out[id] = { x: clamp01(it.x), y: clamp01(it.y), scale: isNum(it.scale) ? clampScale(it.scale) : 1 }
  }
  return { v: HUD_LAYOUT_VERSION, items: out }
}

/**
 * Inline style for a customised element. The wrapper is placed at (x, y) of the area and shifted
 * back by the same fraction of its own size; scaling happens around that same anchor, so the
 * scaled box stays inside the area at every x / y.
 */
export function hudSlotStyle(item: HudItem, fit = true): CSSProperties {
  const px = `${(item.x * 100).toFixed(3)}%`
  const py = `${(item.y * 100).toFixed(3)}%`
  return {
    position: 'absolute',
    left: px,
    top: py,
    // Elements that size themselves (class-based) keep their own width.
    ...(fit ? { width: 'max-content' } : null),
    transformOrigin: `${px} ${py}`,
    transform: `translate(-${px}, -${py}) scale(${item.scale})`,
  }
}

// ---------------------------------------------------------------------------
// Size estimates (px) used by the editor preview. They mirror the CSS sizing of the real HUD
// closely enough for placing things; the real layout stays authoritative in the match.
// ---------------------------------------------------------------------------

export interface HudMetrics {
  /** Viewport (landscape orientation) in px. */
  vw: number
  vh: number
  touch: boolean
  largeControls: boolean
}

const rem = 16

export function hudGap({ vw, vh }: HudMetrics) {
  return clamp(0.016 * Math.min(vw, vh), 0.375 * rem, 0.75 * rem)
}

export function controlDiameter(m: HudMetrics) {
  const vmin = Math.min(m.vw, m.vh)
  if (m.largeControls) return clamp(0.27 * vmin, 6.5 * rem, 11 * rem)
  return m.vw >= 900 && m.vh >= 600 ? clamp(0.18 * vmin, 110, 150) : clamp(0.21 * vmin, 84, 120)
}

export function hudElementSize(id: HudElementId, m: HudMetrics): { w: number; h: number } {
  const vmin = Math.min(m.vw, m.vh)
  const short = m.vh <= 520
  const ctl = controlDiameter(m)
  switch (id) {
    case 'moveStick':
    case 'aimStick':
      return { w: ctl, h: ctl }
    case 'quickWeapon': {
      const q = Math.max(48, ctl * 0.55)
      return { w: q, h: q }
    }
    case 'hotbar': {
      const hb = short ? 2.5 * rem : clamp(0.09 * vmin, 2.5 * rem, 5 * rem)
      return { w: hb * 5 + 4 * 6 + 12, h: hb * 0.5 + (short ? 34 : 44) }
    }
    case 'minimap': {
      const w = m.touch ? (short ? 96 : clamp(0.2 * vmin, 5.5 * rem, 10 * rem)) : clamp(0.22 * vmin, 7 * rem, 14 * rem)
      return { w, h: w * 0.75 }
    }
    case 'playerPanel':
      return m.touch || short ? { w: 232, h: short ? 52 : 68 } : { w: 330, h: 90 }
    case 'phasePanel': {
      const w = short ? 176 : m.vw >= 640 ? clamp(0.32 * m.vw, 240, 352) : Math.min(240, 0.6 * m.vw)
      return { w, h: short ? 74 : 112 }
    }
  }
}

/** Where each element sits with the built-in layout, as free-space fractions (preview start point). */
export function hudDefaultPosition(id: HudElementId, m: HudMetrics): { x: number; y: number } {
  const gap = hudGap(m)
  const areaW = m.vw - 2 * gap
  const areaH = m.vh - 2 * gap
  const ctl = controlDiameter(m)
  const { w, h } = hudElementSize(id, m)
  const fx = (offset: number) => clamp01(offset / Math.max(1, areaW - w))
  const fy = (offset: number) => clamp01(offset / Math.max(1, areaH - h))
  switch (id) {
    case 'moveStick':
      return { x: 0, y: 1 }
    case 'aimStick':
      return { x: 1, y: 1 }
    case 'quickWeapon':
      return { x: 1 - fx(ctl * 1.2), y: 1 - fy(ctl * 0.1) }
    case 'hotbar':
      return { x: 0.5, y: 1 }
    case 'minimap':
      return m.touch ? { x: 1, y: fy(3 * rem) } : { x: 0, y: 1 }
    case 'playerPanel':
      return { x: 0, y: 0 }
    case 'phasePanel':
      return { x: 0.5, y: 0 }
  }
}
