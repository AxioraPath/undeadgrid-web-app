import { useEffect, useState, type CSSProperties, type ReactNode } from 'react'

/** Desde este ancho se considera PC/tablet horizontal: la pantalla se escala para caber sin scroll. */
const DESKTOP_MIN_WIDTH = 1024
/** Alto con el que las pantallas del menú caben completas (medido: a 1920 × 955 no desbordan). */
const DESIGN_HEIGHT = 960

const readViewport = () => ({ w: window.innerWidth, h: window.innerHeight })

/**
 * En PC, escala la pantalla completa para que quepa en la ventana sin hacer scroll
 * (con o sin pantalla completa), igual que un juego. En celular no hace nada: ahí la
 * pantalla se acomoda en una columna y sí se desplaza.
 *
 * Dentro, `--ug-vw` / `--ug-vh` sustituyen a vw/dvh porque esas unidades miden la
 * ventana real, no el área escalada.
 */
export function DesktopFit({ children }: { children: ReactNode }) {
  const [vp, setVp] = useState(readViewport)

  useEffect(() => {
    const update = () => setVp(readViewport())
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  if (vp.w < DESKTOP_MIN_WIDTH) return <>{children}</>

  const scale = Math.min(1, vp.h / DESIGN_HEIGHT)
  const w = vp.w / scale
  const h = vp.h / scale
  const style = {
    width: w,
    height: h,
    transform: scale < 1 ? `scale(${scale})` : undefined,
    '--ug-vw': `${w / 100}px`,
    '--ug-vh': `${h / 100}px`,
  } as CSSProperties

  return (
    <div className="fixed inset-0 overflow-hidden" data-testid="desktop-fit" data-scale={scale.toFixed(3)}>
      <div className="ug-fit relative origin-top-left overflow-hidden" style={style}>
        {children}
      </div>
    </div>
  )
}
