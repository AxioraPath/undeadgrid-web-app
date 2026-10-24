import { useEffect, useState } from 'react'
import { Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useLobbyRoom } from '../hooks/useLobbyRoom'
import { RoomContext } from './roomContext'

// Mantiene el estado de la sala vivo al pasar entre /sala/:code y sus subpantallas (personaje, etc.).
export function RoomProvider() {
  const { code = '' } = useParams()
  const location = useLocation()
  const [isHost] = useState(() => Boolean((location.state as { isHost?: boolean } | null)?.isHost))
  const room = useLobbyRoom(code.toUpperCase(), isHost)
  const navigate = useNavigate()
  const { status } = room
  const roomCode = room.code

  // El servidor decide el estado de la sala; cada estado tiene su pantalla.
  // En el lobby también se puede abrir la selección de personaje.
  useEffect(() => {
    // Al crear la sala, la URL pasa al código real que asignó el servidor (compartible con el rival).
    if (roomCode !== code.toUpperCase() && status) {
      const sub = location.pathname.split('/').slice(3).join('/')
      navigate(`/sala/${roomCode}${sub ? `/${sub}` : ''}`, { replace: true, state: location.state })
      return
    }
    const base = `/sala/${roomCode}`
    const screen = status === 'selection' ? `${base}/personaje` : status === 'lobby' ? null : `${base}/partida`
    const path = location.pathname.replace(/\/$/, '')
    if (screen && path !== screen) navigate(screen, { replace: true })
    if (!screen && path.endsWith('/partida')) navigate(base, { replace: true })
  }, [status, roomCode, code, location.pathname, location.state, navigate])

  return (
    <RoomContext.Provider value={room}>
      <Outlet />
    </RoomContext.Provider>
  )
}
