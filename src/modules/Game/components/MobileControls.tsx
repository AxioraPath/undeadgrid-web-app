import { useRef, useState, type PointerEvent } from 'react'
import { Crosshair, Hammer } from 'lucide-react'

/** Knob travel as a fraction of the pad width (the pad scales with the viewport). */
const RADIUS_RATIO = 0.36

interface MobileControlsProps {
  inBase: boolean
  onDirection: (nx: number, ny: number) => void
  onAction: (on: boolean) => void
}

/** D-pad abajo a la izquierda y un único botón de acción abajo a la derecha (lo que pide el PDF). */
export function MobileControls({ inBase, onDirection, onAction }: MobileControlsProps) {
  const padRef = useRef<HTMLDivElement>(null)
  const [knob, setKnob] = useState({ x: 0, y: 0 })
  const [pressed, setPressed] = useState(false)

  const movePad = (e: PointerEvent<HTMLDivElement>) => {
    const r = padRef.current!.getBoundingClientRect()
    const RADIUS = r.width * RADIUS_RATIO
    let dx = e.clientX - (r.left + r.width / 2)
    let dy = e.clientY - (r.top + r.height / 2)
    const len = Math.hypot(dx, dy)
    if (len > RADIUS) {
      dx = (dx / len) * RADIUS
      dy = (dy / len) * RADIUS
    }
    setKnob({ x: dx, y: dy })
    onDirection(dx / RADIUS, dy / RADIUS)
  }

  const releasePad = () => {
    setKnob({ x: 0, y: 0 })
    onDirection(0, 0)
  }

  const setAction = (on: boolean) => {
    onAction(on)
    setPressed(on)
  }

  return (
    <>
      <div
        ref={padRef}
        data-testid="dpad"
        className="pointer-events-auto absolute bottom-[calc(var(--ug-safe-bottom)+var(--ug-gap))] left-[calc(var(--ug-safe-left)+var(--ug-gap))] grid size-(--ug-ctl) touch-none place-items-center rounded-full border-2 border-white/25 bg-white/10 backdrop-blur-[1px] select-none [-webkit-touch-callout:none]"
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          movePad(e)
        }}
        onPointerMove={(e) => e.buttons > 0 && movePad(e)}
        onPointerUp={releasePad}
        onPointerCancel={releasePad}
      >
        {['▲', '▼', '◀', '▶'].map((a, i) => (
          <span
            key={a}
            className="absolute text-[clamp(0.625rem,2vmin,0.875rem)] text-white/50"
            style={[{ top: 6 }, { bottom: 6 }, { left: 8 }, { right: 8 }][i]}
          >
            {a}
          </span>
        ))}
        <span
          className="size-[44%] rounded-full border-2 border-white/60 bg-white/70 shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      <button
        type="button"
        data-testid="action-button"
        aria-label={inBase ? 'Construir' : 'Disparar'}
        className={`pointer-events-auto absolute right-[calc(var(--ug-safe-right)+var(--ug-gap))] bottom-[calc(var(--ug-safe-bottom)+var(--ug-gap))] flex size-[calc(var(--ug-ctl)*0.82)] touch-none flex-col items-center justify-center rounded-full border-4 select-none [-webkit-touch-callout:none] ${
          inBase ? 'border-ug-green/80 bg-ug-green/25' : 'border-ug-red-hi/80 bg-ug-red/35'
        } ${pressed ? 'scale-95 brightness-125' : ''}`}
        onPointerDown={(e) => {
          e.currentTarget.setPointerCapture(e.pointerId)
          setAction(true)
        }}
        onPointerUp={() => setAction(false)}
        onPointerCancel={() => setAction(false)}
        onContextMenu={(e) => e.preventDefault()}
      >
        {inBase ? <Hammer className="size-[38%]" /> : <Crosshair className="size-[38%]" />}
        <span className="text-[clamp(0.875rem,2.8vmin,1.125rem)] leading-none">{inBase ? 'Construir' : 'Disparar'}</span>
      </button>
    </>
  )
}
