import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'

/** Desde este ancho se considera PC/tablet horizontal: la pantalla se escala para caber sin scroll. */
const DESKTOP_MIN_WIDTH = 1024
/** Alto con el que las pantallas del menú caben completas (medido: a 1920 × 955 no desbordan). */
const DESIGN_HEIGHT = 960
/** Celular horizontal (igual que la variante `phone` del CSS): se mide el contenido y se reduce lo justo. */
const PHONE_MAX_HEIGHT = 520
/** Nunca se reduce más que esto (el texto seguiría legible). */
const MIN_PHONE_SCALE = 0.6

const readViewport = () => ({ w: window.innerWidth, h: window.innerHeight })

/**
 * Escala la pantalla completa para que quepa en la ventana sin hacer scroll, igual que un juego:
 * - En PC, con un alto de diseño fijo.
 * - En celular horizontal, midiendo lo que ocupa la pantalla: si no cabe (barra del navegador, pantallas
 *   bajitas), se reduce lo justo y se ensancha el área para aprovechar el ancho.
 * En celular vertical o tablet no hace nada.
 *
 * Dentro, `--ug-vw` / `--ug-vh` sustituyen a vw/dvh porque esas unidades miden la
 * ventana real, no el área escalada.
 */
export function DesktopFit({ children }: { children: ReactNode }) {
  const [vp, setVp] = useState(readViewport)
  const [phoneScale, setPhoneScale] = useState(1)
  const innerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const update = () => {
      setVp(readViewport())
      // Al cambiar la ventana se vuelve a medir desde tamaño real.
      setPhoneScale(1)
    }
    window.addEventListener('resize', update)
    window.visualViewport?.addEventListener('resize', update)
    return () => {
      window.removeEventListener('resize', update)
      window.visualViewport?.removeEventListener('resize', update)
    }
  }, [])

  const desktop = vp.w >= DESKTOP_MIN_WIDTH
  const phone = !desktop && vp.h <= PHONE_MAX_HEIGHT && vp.w > vp.h

  // Celular: si el contenido mide más que la ventana, se reduce. Solo baja (al ensanchar, el contenido
  // se acorta y queda en el alto de la ventana), así que no oscila.
  useLayoutEffect(() => {
    const el = innerRef.current
    if (!phone || !el) return
    const measure = () => {
      // Alto real del contenido (sin el mínimo de "una pantalla"), en píxeles sin escalar.
      const root = el.firstElementChild as HTMLElement | null
      if (!root) return
      el.classList.add('ug-measuring')
      const natural = root.offsetHeight
      el.classList.remove('ug-measuring')
      if (natural * phoneScale <= vp.h + 1) return
      const next = Math.max(MIN_PHONE_SCALE, (vp.h / natural) * 0.995)
      if (next < phoneScale - 0.005) setPhoneScale(next)
    }
    measure()
    const ro = new ResizeObserver(measure)
    for (const child of Array.from(el.children)) ro.observe(child)
    return () => ro.disconnect()
  }, [phone, vp.h, phoneScale])

  // Siempre la misma estructura (solo cambian estilos): al girar el celular no se recrea la pantalla
  // y no se pierde lo escrito.
  if (!desktop && !phone)
    return (
      <div className="contents" data-testid="desktop-fit" data-scale="1">
        <div ref={innerRef} className="contents">
          {children}
        </div>
      </div>
    )

  const scale = desktop ? Math.min(1, vp.h / DESIGN_HEIGHT) : phoneScale
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
      <div ref={innerRef} className="ug-fit relative origin-top-left overflow-hidden" style={style}>
        {children}
      </div>
    </div>
  )
}
