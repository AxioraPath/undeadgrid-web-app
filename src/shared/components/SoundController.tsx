import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { playMusic, sfx, unlockAudio } from '../lib/audio'

/**
 * Música según la pantalla (menús / partida), activa el audio con el primer toque o tecla
 * y hace un "clic" suave al pulsar botones.
 */
export function SoundController() {
  const { pathname } = useLocation()
  const inMatch = pathname.endsWith('/partida')

  useEffect(() => {
    playMusic(inMatch ? 'partida' : 'menu')
  }, [inMatch])

  useEffect(() => {
    const unlock = () => unlockAudio()
    const click = (e: Event) => {
      const el = e.target instanceof Element ? e.target.closest('button') : null
      if (el && !el.disabled) sfx.click()
    }
    window.addEventListener('pointerdown', unlock, { capture: true })
    window.addEventListener('keydown', unlock, { capture: true })
    document.addEventListener('click', click, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', unlock, { capture: true })
      window.removeEventListener('keydown', unlock, { capture: true })
      document.removeEventListener('click', click, { capture: true })
    }
  }, [])

  return null
}
