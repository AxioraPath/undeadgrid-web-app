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

const HOTBAR_KEYS: Record<string, 1 | 2 | 3 | 4 | 5 | 6 | 7> = {
  Digit1: 1, Digit2: 2, Digit3: 3, Digit4: 4, Digit5: 5, Digit6: 6, Digit7: 7,
  Numpad1: 1, Numpad2: 2, Numpad3: 3, Numpad4: 4, Numpad5: 5, Numpad6: 6, Numpad7: 7,
}

// `tapped` guarda un toque de acción aunque keydown y keyup caigan entre dos ticks.
// `fireTapped` hace lo mismo para el disparo (clic o stick de apuntar).
type InputState = {
  keyboard: PlayerInput
  touch: PlayerInput
  tapped: boolean
  fireTapped: boolean
  touchFire: boolean
  mouse: boolean
  touchAim: { x: number; y: number } | null
  /** Botón de apuntar: cuándo se presionó, si se arrastró en este toque y si hay un toque de autoapuntado pendiente. */
  aimPressAt: number | null
  aimDragged: boolean
  autoTap: boolean
}

const TOUCH_DEAD_ZONE = 0.35
// Arrastre mínimo para apuntar a mano: con menos, el temblor del dedo no anula el autoapuntado.
const TOUCH_AIM_DEAD_ZONE = 0.45
/** Toque corto (ms) en el botón de apuntar = un disparo autoapuntado; mantenerlo sin arrastrar = ráfaga autoapuntada. */
const AUTO_TAP_MS = 250

const empty = (): PlayerInput => ({ up: false, down: false, left: false, right: false, action: false })

/** Teclado (keydown/keyup) + estado táctil; el bucle del juego lee `read()` en cada tick. */
export function useGameInput(onCommand: (cmd: Command) => void, onSwapWeapon?: () => void) {
  const state = useRef<InputState>({ keyboard: empty(), touch: empty(), tapped: false, fireTapped: false, touchFire: false, mouse: false, touchAim: null, aimPressAt: null, aimDragged: false, autoTap: false })
  const onCommandRef = useRef(onCommand)
  const onSwapRef = useRef(onSwapWeapon)

  useEffect(() => {
    onCommandRef.current = onCommand
    onSwapRef.current = onSwapWeapon
  }, [onCommand, onSwapWeapon])

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
      // Hotbar keys never touch the movement state, so they work while WASD / arrows are held.
      if (slot && !e.repeat) onCommandRef.current({ type: 'hotbar', slot })
      if (e.code === 'KeyQ' && !e.repeat && !e.ctrlKey && !e.metaKey && !e.altKey) onSwapRef.current?.()
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
      state.current.touchFire = false
      state.current.aimPressAt = null
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
    const { keyboard: k, touch: t, tapped, fireTapped, mouse, touchFire, aimPressAt, aimDragged, autoTap } = state.current
    state.current.tapped = false
    state.current.fireTapped = false
    state.current.autoTap = false
    // Mantener el botón sin arrastrar: dispara seguido, autoapuntado.
    const autoHold = aimPressAt !== null && !aimDragged && performance.now() - aimPressAt >= AUTO_TAP_MS
    const auto = (autoTap || autoHold) && !touchFire && !mouse
    return {
      up: k.up || t.up,
      down: k.down || t.down,
      left: k.left || t.left,
      right: k.right || t.right,
      // Espacio: acción según el lugar (en tu base construye, fuera dispara).
      action: k.action || t.action || tapped,
      // Clic izquierdo / stick derecho: siempre dispara, también dentro de tu base.
      fire: mouse || touchFire || fireTapped || auto,
      // Toque o mantener sin arrastrar: el servidor apunta al objetivo más cercano (con un poco de desfase).
      ...(auto ? { autoAim: true } : {}),
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
      s.touchFire = false
      return
    }
    if (!s.touchFire) s.fireTapped = true
    s.aimDragged = true
    s.touchAim = { x: nx / len, y: ny / len }
    s.touchFire = true
  }, [])

  /**
   * Botón de apuntar presionado / soltado. Un toque corto sin arrastrar es un disparo autoapuntado (como Brawl Stars);
   * arrastrar apunta a mano.
   */
  const setAimPressed = useCallback((pressed: boolean) => {
    const s = state.current
    if (pressed) {
      s.aimPressAt = performance.now()
      s.aimDragged = false
      return
    }
    if (s.aimPressAt !== null && !s.aimDragged && performance.now() - s.aimPressAt < AUTO_TAP_MS) s.autoTap = true
    s.aimPressAt = null
  }, [])

  /** Botón de apuntar mantenido sin arrastrar (disparo autoapuntado en curso): para marcar el objetivo. */
  const readAutoHold = useCallback(() => state.current.aimPressAt !== null && !state.current.aimDragged, [])

  /** Current touch aim (unit vector) or null; read every frame by the game loop. */
  const readTouchAim = useCallback(() => state.current.touchAim, [])

  /** Left mouse button held (continuous fire). A press shorter than a tick still counts once. */
  const setMouseAction = useCallback((on: boolean) => {
    if (on && !state.current.mouse) state.current.fireTapped = true
    state.current.mouse = on
  }, [])

  return { read, setTouchDirection, setTouchAim, setAimPressed, readTouchAim, readAutoHold, setMouseAction }
}
