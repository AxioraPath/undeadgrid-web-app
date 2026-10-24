import { useRef, useState, type PointerEvent } from 'react'
import { Crosshair, Hammer } from 'lucide-react'

const RADIUS = 56

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
        className="pointer-events-auto absolute bottom-6 left-6 grid size-36 touch-none place-items-center rounded-full border-2 border-white/25 bg-white/10 backdrop-blur-[1px] select-none"
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
            className="absolute text-sm text-white/50"
            style={[{ top: 6 }, { bottom: 6 }, { left: 8 }, { right: 8 }][i]}
          >
            {a}
          </span>
        ))}
        <span
          className="size-16 rounded-full border-2 border-white/60 bg-white/70 shadow-lg"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      <button
        type="button"
        data-testid="action-button"
        aria-label={inBase ? 'Construir' : 'Disparar'}
        className={`pointer-events-auto absolute right-6 bottom-6 grid size-28 touch-none place-items-center rounded-full border-4 select-none ${
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
        {inBase ? <Hammer size={44} /> : <Crosshair size={44} />}
        <span className="absolute -bottom-6 text-lg">{inBase ? 'Construir' : 'Disparar'}</span>
      </button>
    </>
  )
}
