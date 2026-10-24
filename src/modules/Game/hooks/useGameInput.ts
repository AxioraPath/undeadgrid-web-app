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
type InputState = { keyboard: PlayerInput; touch: PlayerInput; tapped: boolean }

const TOUCH_DEAD_ZONE = 0.35

const empty = (): PlayerInput => ({ up: false, down: false, left: false, right: false, action: false })

/** Teclado (keydown/keyup) + estado táctil; el bucle del juego lee `read()` en cada tick. */
export function useGameInput(onCommand: (cmd: Command) => void) {
  const state = useRef<InputState>({ keyboard: empty(), touch: empty(), tapped: false })
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
      state.current.keyboard = empty()
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
    const { keyboard: k, touch: t, tapped } = state.current
    state.current.tapped = false
    return {
      up: k.up || t.up,
      down: k.down || t.down,
      left: k.left || t.left,
      right: k.right || t.right,
      action: k.action || t.action || tapped,
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

  const setTouchAction = useCallback((on: boolean) => {
    if (on) state.current.tapped = true
    state.current.touch.action = on
  }, [])

  return { read, setTouchDirection, setTouchAction }
}
