import { useRef, type PointerEvent, type ReactNode } from 'react'
import { Crosshair, Repeat } from 'lucide-react'
import type { HudLayout } from '../../../shared/lib/hudLayout'
import { HudSlot } from './HudSlot'
import { HEAVY_WEAPONS, type WeaponId } from '../../../shared/lib/contracts'

/** Knob travel as a fraction of the base diameter. */
const TRAVEL_RATIO = 0.3
/** Right stick: below this fraction of the travel nothing is aimed or fired. */
export const AIM_DEAD_ZONE = 0.45

interface StickProps {
  testId: string
  label: string
  /** Fires on every change. (0, 0) means released. */
  onChange: (nx: number, ny: number) => void
  /** Pressed / released (to tell a tap from a drag). */
  onPress?: (pressed: boolean) => void
  baseClassName?: string
  knobClassName?: string
  children?: ReactNode
}

/**
 * Fixed-position virtual joystick. Tracks a single pointer by id (pointer capture), so the
 * two sticks work at the same time with both thumbs. The knob moves through a ref (no re-render).
 */
function Stick({ testId, label, onChange, onPress, baseClassName = '', knobClassName = '', children }: StickProps) {
  const baseRef = useRef<HTMLDivElement>(null)
  const knobRef = useRef<HTMLSpanElement>(null)
  const activeId = useRef<number | null>(null)

  const track = (e: PointerEvent<HTMLDivElement>) => {
    const r = baseRef.current!.getBoundingClientRect()
    const travel = r.width * TRAVEL_RATIO
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > travel) {
      dx = (dx / len) * travel
      dy = (dy / len) * travel
    }
    knobRef.current!.style.transform = `translate(${dx}px, ${dy}px)`
    onChange(dx / travel, dy / travel)
  }

  const release = (e: PointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== activeId.current) return
    activeId.current = null
    knobRef.current!.style.transform = ''
    baseRef.current!.dataset.held = 'false'
    onChange(0, 0)
    onPress?.(false)
  }

  return (
    <div
      data-testid={testId}
      aria-label={label}
      role="presentation"
      // The zone is larger than the visible base so a thumb that drifts off it keeps control.
      className="pointer-events-auto absolute top-1/2 left-1/2 grid size-[calc(var(--ug-ctl)*1.35)] -translate-x-1/2 -translate-y-1/2 touch-none place-items-center select-none opacity-(--ug-ctl-alpha) [-webkit-touch-callout:none]"
      onPointerDown={(e) => {
        if (activeId.current !== null) return
        activeId.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        baseRef.current!.dataset.held = 'true'
        onPress?.(true)
        track(e)
      }}
      onPointerMove={(e) => e.pointerId === activeId.current && track(e)}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={release}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={baseRef}
        data-held="false"
        className={`grid size-(--ug-ctl) place-items-center rounded-full border-2 bg-white/[0.09] data-[held=true]:bg-white/[0.17] ${baseClassName}`}
      >
        <span
          ref={knobRef}
          className={`grid size-[45%] place-items-center rounded-full border-2 will-change-transform ${knobClassName}`}
        >
          {children}
        </span>
      </div>
    </div>
  )
}

interface MobileControlsProps {
  layout: HudLayout
  /** Weapon currently in hand, shown on the quick-switch button. */
  weapon: WeaponId
  onDirection: (nx: number, ny: number) => void
  /** Right stick vector in [-1, 1] (not normalised); (0, 0) = released. */
  onAim: (nx: number, ny: number) => void
  /** Right stick pressed / released: a tap without dragging fires auto-aimed. */
  onAimPress?: (pressed: boolean) => void
  /** Cycles pistol <-> shotgun. */
  onQuickWeapon: () => void
}

/**
 * Twin-stick touch controls: left stick moves, right stick aims in any angle and fires while held,
 * and a quick button swaps weapons. Every piece can be moved / resized from the HUD editor.
 */
export function MobileControls({ layout, weapon, onDirection, onAim, onAimPress, onQuickWeapon }: MobileControlsProps) {
  return (
    <>
      <HudSlot id="moveStick" layout={layout} className="size-(--ug-ctl)" defaultClassName="absolute bottom-0 left-0">
        <Stick
          testId="move-stick"
          label="Mover"
          onChange={onDirection}
          baseClassName="border-white/35"
          knobClassName="border-white/70 bg-white/55"
        />
      </HudSlot>
      <HudSlot id="aimStick" layout={layout} className="size-(--ug-ctl)" defaultClassName="absolute right-0 bottom-0">
        <Stick
          testId="aim-stick"
          // Siempre dispara (también en la base): construir es tocando la casilla con pared/trampa/torreta elegida.
          label="Apuntar y disparar"
          onChange={onAim}
          onPress={onAimPress}
          baseClassName="border-ug-red-hi/70 data-[held=true]:border-ug-red-hi"
          knobClassName="border-ug-red-hi bg-ug-red/55 text-white"
        >
          <Crosshair className="size-[50%]" />
        </Stick>
      </HudSlot>
      <HudSlot
        id="quickWeapon"
        layout={layout}
        className="size-[max(48px,calc(var(--ug-ctl)*0.55))]"
        defaultClassName="absolute right-[calc(var(--ug-ctl)*1.2)] bottom-[calc(var(--ug-ctl)*0.1)]"
      >
        <button
          type="button"
          data-testid="quick-weapon"
          aria-label={`Cambiar arma (${weapon === 'pistol' ? 'pistola' : weapon === 'shotgun' ? 'escopeta' : HEAVY_WEAPONS[weapon].name} en mano)`}
          // pointerdown, not click: it must answer instantly and while the other thumb is on a stick.
          onPointerDown={(e) => {
            e.preventDefault()
            onQuickWeapon()
          }}
          onClick={(e) => e.detail === 0 && onQuickWeapon()}
          onContextMenu={(e) => e.preventDefault()}
          className="pointer-events-auto relative grid size-full touch-none place-items-center rounded-full border-2 border-[#3d8bff] bg-[#3d8bff]/25 opacity-(--ug-ctl-alpha) select-none active:scale-95 active:bg-[#3d8bff]/45"
        >
          <img
            src={weapon === 'pistol' ? '/assets/game/iconos/pistola.png' : weapon === 'shotgun' ? '/assets/game/iconos/escopeta.png' : `/assets/game/iconos/${HEAVY_WEAPONS[weapon].icon}.png`}
            alt=""
            className="pixelated h-[44%] w-[62%] object-contain"
          />
          <Repeat aria-hidden className="absolute -right-0.5 -bottom-0.5 size-[34%] rounded-full bg-ug-bg p-[3px] text-ug-accent" />
        </button>
      </HudSlot>
    </>
  )
}
