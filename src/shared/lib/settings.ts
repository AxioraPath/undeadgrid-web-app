import { useSyncExternalStore } from 'react'
import { clamp01, clampScale, DEFAULT_HUD_LAYOUT, sanitizeHudLayout, type HudElementId, type HudItem, type HudLayout } from './hudLayout'

/** Preferencias del jugador. Solo visuales/de control: el servidor no las conoce. */
export interface Settings {
  /** Distancia de la cámara. */
  zoom: 'near' | 'normal' | 'far'
  screenShake: boolean
  /** Sangre, chispas y partículas. */
  effects: boolean
  showFps: boolean
  /** Controles táctiles: según el dispositivo, siempre o nunca. */
  touchControls: 'auto' | 'on' | 'off'
  touchSize: 'normal' | 'large'
  /** Ayuda de teclas en pantalla (PC). */
  keyHelp: boolean
  /** Apuntar con el mouse y disparar con clic (solo PC; se ignora en táctil). */
  mouseAim: boolean
  /** Opacity of joysticks, quick weapon button and hotbar (0.25 - 1). */
  controlOpacity: number
  /** Opacity of the panel backgrounds and the minimap (0.4 - 1); text always stays opaque. */
  hudOpacity: number
  /** Custom HUD positions / sizes (versioned; empty = built-in layout). */
  hudLayout: HudLayout
  /** Snap dragged HUD elements to a grid in the editor. */
  hudSnap: boolean
  /** Volumen de la música y de los efectos (0 - 1). */
  musicVolume: number
  sfxVolume: number
}

export const CONTROL_OPACITY_MIN = 0.25
export const HUD_OPACITY_MIN = 0.4

export const DEFAULT_SETTINGS: Settings = {
  zoom: 'normal',
  screenShake: true,
  effects: true,
  showFps: true,
  touchControls: 'auto',
  touchSize: 'normal',
  keyHelp: true,
  mouseAim: true,
  controlOpacity: 0.7,
  hudOpacity: 1,
  hudLayout: DEFAULT_HUD_LAYOUT,
  hudSnap: true,
  musicVolume: 0.35,
  sfxVolume: 0.7,
}

/** Casillas que caben a lo ancho según la distancia de cámara (horizontal / vertical). */
export const ZOOM_TILES: Record<Settings['zoom'], { landscape: number; portrait: number }> = {
  near: { landscape: 16, portrait: 8 },
  normal: { landscape: 22, portrait: 11 },
  far: { landscape: 28, portrait: 14 },
}

const KEY = 'ug:settings'

const num = (v: unknown, lo: number, hi: number, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback

/** Stored values are untrusted: numbers are clamped, the HUD layout is validated and versioned. */
function normalize(s: Settings): Settings {
  return {
    ...s,
    controlOpacity: num(s.controlOpacity, CONTROL_OPACITY_MIN, 1, DEFAULT_SETTINGS.controlOpacity),
    hudOpacity: num(s.hudOpacity, HUD_OPACITY_MIN, 1, DEFAULT_SETTINGS.hudOpacity),
    hudLayout: sanitizeHudLayout(s.hudLayout),
    hudSnap: typeof s.hudSnap === 'boolean' ? s.hudSnap : DEFAULT_SETTINGS.hudSnap,
    musicVolume: num(s.musicVolume, 0, 1, DEFAULT_SETTINGS.musicVolume),
    sfxVolume: num(s.sfxVolume, 0, 1, DEFAULT_SETTINGS.sfxVolume),
  }
}

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? normalize({ ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) }) : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

let current = load()
const listeners = new Set<() => void>()

export const getSettings = () => current

export function updateSettings(patch: Partial<Settings>) {
  current = normalize({ ...current, ...patch })
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Sin almacenamiento (modo privado): los ajustes duran solo esta sesión.
  }
  listeners.forEach((l) => l())
}

export const resetSettings = () => updateSettings(DEFAULT_SETTINGS)

/** Creates or edits one customised HUD element (values are clamped). */
export function setHudItem(id: HudElementId, item: HudItem) {
  const next: HudItem = { x: clamp01(item.x), y: clamp01(item.y), scale: clampScale(item.scale) }
  updateSettings({ hudLayout: { ...current.hudLayout, items: { ...current.hudLayout.items, [id]: next } } })
}

/** Puts one element back on the built-in layout. */
export function resetHudItem(id: HudElementId) {
  const items = { ...current.hudLayout.items }
  delete items[id]
  updateSettings({ hudLayout: { ...current.hudLayout, items } })
}

export const resetHudLayout = () => updateSettings({ hudLayout: DEFAULT_HUD_LAYOUT })

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Aviso cuando cambian los ajustes (fuera de React, p. ej. el volumen del audio). */
export const subscribeSettings = (l: () => void): (() => void) => {
  listeners.add(l)
  return () => {
    listeners.delete(l)
  }
}

/** Ajustes actuales; el componente se vuelve a dibujar cuando cambian. */
export const useSettings = () => useSyncExternalStore(subscribe, getSettings, getSettings)
