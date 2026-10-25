import { useCallback, useEffect, useState } from 'react'

/** Celular o tablet (pantalla táctil sin mouse como puntero principal). */
export const isTouchDevice = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia('(pointer: coarse)').matches || (navigator.maxTouchPoints > 0 && !window.matchMedia('(pointer: fine)').matches))

/** El navegador permite pantalla completa en páginas (iPhone/Safari no: ahí se usa "Agregar a inicio"). */
export const fullscreenSupported = () => typeof document !== 'undefined' && !!document.documentElement.requestFullscreen

/** Entra a pantalla completa (necesita un toque del usuario) y, si se puede, gira a horizontal. */
export async function enterFullscreen() {
  if (!fullscreenSupported() || document.fullscreenElement) return
  try {
    await document.documentElement.requestFullscreen({ navigationUI: 'hide' })
    const orientation = window.screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
    await orientation?.lock?.('landscape')?.catch(() => undefined)
  } catch {
    // El navegador lo rechazó (sin gesto válido, ajustes del sistema...): se sigue sin pantalla completa.
  }
}

/** Estado de pantalla completa para mostrar el botón de volver a entrar. */
export function useFullscreen() {
  const [active, setActive] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement)
  useEffect(() => {
    const update = () => setActive(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [])
  const enter = useCallback(() => void enterFullscreen(), [])
  return { supported: fullscreenSupported() && isTouchDevice(), active, enter }
}
