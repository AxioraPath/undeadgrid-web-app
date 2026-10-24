import { useState } from 'react'
import { Outlet, useLocation, useParams } from 'react-router-dom'
import { useLobbyRoom } from '../hooks/useLobbyRoom'
import { RoomContext } from './roomContext'

// Mantiene el estado de la sala vivo al pasar entre /sala/:code y sus subpantallas (personaje, etc.).
export function RoomProvider() {
  const { code = '' } = useParams()
  const location = useLocation()
  const [isHost] = useState(() => Boolean((location.state as { isHost?: boolean } | null)?.isHost))
  const room = useLobbyRoom(code.toUpperCase(), isHost)

  return (
    <RoomContext.Provider value={room}>
      <Outlet />
    </RoomContext.Provider>
  )
}
