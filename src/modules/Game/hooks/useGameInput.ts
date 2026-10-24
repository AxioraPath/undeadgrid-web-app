import { useCallback, useEffect, useRef } from 'react'
import type { GameCommand as Command, PlayerInput } from '../../../shared/lib/contracts'

const KEYMAP: Record<string, keyof PlayerInput> = {
  KeyW: 'up',
  ArrowUp: 'up',
  KeyS: 'down',
  ArrowDown: 'down',
  KeyA: 'left',
  ArrowLeft: 'left',
  KeyD: 'right',
  ArrowRight: 'right',
  Space: 'action',
}

const HOTBAR_KEYS: Record<string, 1 | 2 | 3 | 4 | 5> = { Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5 }

// `tapped` guarda un toque de acción aunque keydown y keyup caigan entre dos ticks.
type InputState = { keyboard: PlayerInput; touch: PlayerInput; tapped: boolean; mouse: boolean; touchAim: { x: number; y: number } | null }

const TOUCH_DEAD_ZONE = 0.35
const TOUCH_AIM_DEAD_ZONE = 0.25

const empty = (): PlayerInput => ({ up: false, down: false, left: false, right: false, action: false })

/** Teclado (keydown/keyup) + estado táctil; el bucle del juego lee `read()` en cada tick. */
export function useGameInput(onCommand: (cmd: Command) => void) {
  const state = useRef<InputState>({ keyboard: empty(), touch: empty(), tapped: false, mouse: false, touchAim: null })
  const onCommandRef = useRef(onCommand)

  useEffect(() => {
    onCommandRef.current = onCommand
  }, [onCommand])

  useEffect(() => {
    const typing = (e: KeyboardEvent) => e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement
    const down = (e: KeyboardEvent) => {
      if (typing(e)) return
      const k = KEYMAP[e.code]
      if (k) {
        if (k === 'action' && !e.repeat) state.current.tapped = true
        state.current.keyboard[k] = true
        e.preventDefault()
      }
      const slot = HOTBAR_KEYS[e.code]
      if (slot && !e.repeat) onCommandRef.current({ type: 'hotbar', slot })
    }
    const up = (e: KeyboardEvent) => {
      const k = KEYMAP[e.code]
      if (k) state.current.keyboard[k] = false
    }
    const reset = () => {
      state.current.touchAim = null
      state.current.touch = empty()
      state.current.keyboard = empty()
      state.current.mouse = false
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', reset)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', reset)
    }
  }, [])

  const read = useCallback((): PlayerInput => {
    const { keyboard: k, touch: t, tapped, mouse } = state.current
    state.current.tapped = false
    return {
      up: k.up || t.up,
      down: k.down || t.down,
      left: k.left || t.left,
      right: k.right || t.right,
      action: k.action || t.action || tapped || mouse,
    }
  }, [])

  /** D-pad táctil: valores normalizados entre -1 y 1. */
  const setTouchDirection = useCallback((nx: number, ny: number) => {
    const t = state.current.touch
    t.left = nx < -TOUCH_DEAD_ZONE
    t.right = nx > TOUCH_DEAD_ZONE
    t.up = ny < -TOUCH_DEAD_ZONE
    t.down = ny > TOUCH_DEAD_ZONE
  }, [])

  /**
   * Right touch stick (vector in [-1, 1]). Beyond the dead zone it aims (unit vector) and holds the
   * action flag; inside it or released, the aim is cleared and the action drops.
   */
  const setTouchAim = useCallback((nx: number, ny: number) => {
    const s = state.current
    const len = Math.hypot(nx, ny)
    if (len < TOUCH_AIM_DEAD_ZONE) {
      s.touchAim = null
      s.touch.action = false
      return
    }
    if (!s.touch.action) s.tapped = true
    s.touchAim = { x: nx / len, y: ny / len }
    s.touch.action = true
  }, [])

  /** Current touch aim (unit vector) or null; read every frame by the game loop. */
  const readTouchAim = useCallback(() => state.current.touchAim, [])

  /** Left mouse button held (continuous fire). A press shorter than a tick still counts once. */
  const setMouseAction = useCallback((on: boolean) => {
    if (on && !state.current.mouse) state.current.tapped = true
    state.current.mouse = on
  }, [])

  return { read, setTouchDirection, setTouchAim, readTouchAim, setMouseAction }
}
