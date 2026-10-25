import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { Maximize } from 'lucide-react'
import { enterFullscreen, fullscreenSupported, isTouchDevice, useFullscreen } from '../lib/fullscreen'

/**
 * En celular, la primera vez que se toca la pantalla el juego entra a pantalla completa y se gira a horizontal
 * (como xCloud: el navegador solo lo permite tras un toque). Si luego se sale, queda un botón para volver.
 * En la partida el botón está en la barra de arriba (ver GamePage), así que aquí solo se muestra en los menús.
 */
export function AutoFullscreen() {
  const { supported, active, enter } = useFullscreen()
  const { pathname } = useLocation()

  useEffect(() => {
    // En pruebas automatizadas no se cambia el tamaño de la ventana.
    if (navigator.webdriver || !isTouchDevice() || !fullscreenSupported()) return
    const first = () => void enterFullscreen()
    window.addEventListener('pointerup', first, { once: true, capture: true })
    return () => window.removeEventListener('pointerup', first, { capture: true })
  }, [])

  if (!supported || active || pathname.endsWith('/partida')) return null
  return (
    <button
      type="button"
      onClick={enter}
      aria-label="Pantalla completa"
      title="Pantalla completa"
      data-testid="fullscreen-button"
      className="ug-panel fixed top-[26%] left-0 z-40 grid size-9 place-items-center border-l-0 opacity-80 hover:border-ug-border-hi hover:opacity-100"
    >
      <Maximize size={18} />
    </button>
  )
}
