import { useRef, type PointerEvent, type ReactNode } from 'react'
import { Crosshair, Hammer } from 'lucide-react'

/** Knob travel as a fraction of the base diameter. */
const TRAVEL_RATIO = 0.3
/** Right stick: below this fraction of the travel nothing is aimed or fired. */
export const AIM_DEAD_ZONE = 0.25

interface StickProps {
  testId: string
  label: string
  /** Fires on every change. (0, 0) means released. */
  onChange: (nx: number, ny: number) => void
  className: string
  baseClassName?: string
  knobClassName?: string
  children?: ReactNode
}

/**
 * Fixed-position virtual joystick. Tracks a single pointer by id (pointer capture), so the
 * two sticks work at the same time with both thumbs. The knob moves through a ref (no re-render).
 */
function Stick({ testId, label, onChange, className, baseClassName = '', knobClassName = '', children }: StickProps) {
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
  }

  return (
    <div
      data-testid={testId}
      aria-label={label}
      role="presentation"
      // The zone is larger than the visible base so a thumb that drifts off it keeps control.
      className={`pointer-events-auto absolute grid size-[calc(var(--ug-ctl)*1.35)] touch-none place-items-center select-none [-webkit-touch-callout:none] ${className}`}
      onPointerDown={(e) => {
        if (activeId.current !== null) return
        activeId.current = e.pointerId
        e.currentTarget.setPointerCapture(e.pointerId)
        baseRef.current!.dataset.held = 'true'
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
        className={`grid size-(--ug-ctl) place-items-center rounded-full border-2 bg-white/[0.06] data-[held=true]:bg-white/[0.12] ${baseClassName}`}
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
  inBase: boolean
  onDirection: (nx: number, ny: number) => void
  /** Right stick vector in [-1, 1] (not normalised); (0, 0) = released. */
  onAim: (nx: number, ny: number) => void
}

/** Twin-stick touch controls: left stick moves, right stick aims in any angle and fires while held. */
export function MobileControls({ inBase, onDirection, onAim }: MobileControlsProps) {
  return (
    <>
      <Stick
        testId="move-stick"
        label="Mover"
        onChange={onDirection}
        className="bottom-[calc(var(--ug-safe-bottom)+var(--ug-gap)-var(--ug-ctl)*0.175)] left-[calc(var(--ug-safe-left)+var(--ug-gap)-var(--ug-ctl)*0.175)]"
        baseClassName="border-white/25"
        knobClassName="border-white/50 bg-white/40"
      />
      <Stick
        testId="aim-stick"
        label={inBase ? 'Construir' : 'Apuntar y disparar'}
        onChange={onAim}
        className="right-[calc(var(--ug-safe-right)+var(--ug-gap)-var(--ug-ctl)*0.175)] bottom-[calc(var(--ug-safe-bottom)+var(--ug-gap)-var(--ug-ctl)*0.175)]"
        baseClassName={inBase ? 'border-ug-green/50 data-[held=true]:border-ug-green' : 'border-ug-red-hi/50 data-[held=true]:border-ug-red-hi'}
        knobClassName={inBase ? 'border-ug-green/70 bg-ug-green/35 text-white' : 'border-ug-red-hi/70 bg-ug-red/40 text-white'}
      >
        {inBase ? <Hammer className="size-[50%]" /> : <Crosshair className="size-[50%]" />}
      </Stick>
    </>
  )
}
