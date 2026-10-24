import { useSyncExternalStore } from 'react'

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
}

export const DEFAULT_SETTINGS: Settings = {
  zoom: 'normal',
  screenShake: true,
  effects: true,
  showFps: true,
  touchControls: 'auto',
  touchSize: 'normal',
  keyHelp: true,
  mouseAim: true,
}

/** Casillas que caben a lo ancho según la distancia de cámara (horizontal / vertical). */
export const ZOOM_TILES: Record<Settings['zoom'], { landscape: number; portrait: number }> = {
  near: { landscape: 16, portrait: 8 },
  normal: { landscape: 22, portrait: 11 },
  far: { landscape: 28, portrait: 14 },
}

const KEY = 'ug:settings'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? { ...DEFAULT_SETTINGS, ...(JSON.parse(raw) as Partial<Settings>) } : DEFAULT_SETTINGS
  } catch {
    return DEFAULT_SETTINGS
  }
}

let current = load()
const listeners = new Set<() => void>()

export const getSettings = () => current

export function updateSettings(patch: Partial<Settings>) {
  current = { ...current, ...patch }
  try {
    localStorage.setItem(KEY, JSON.stringify(current))
  } catch {
    // Sin almacenamiento (modo privado): los ajustes duran solo esta sesión.
  }
  listeners.forEach((l) => l())
}

export const resetSettings = () => updateSettings(DEFAULT_SETTINGS)

const subscribe = (l: () => void) => {
  listeners.add(l)
  return () => listeners.delete(l)
}

/** Ajustes actuales; el componente se vuelve a dibujar cuando cambian. */
export const useSettings = () => useSyncExternalStore(subscribe, getSettings, getSettings)
