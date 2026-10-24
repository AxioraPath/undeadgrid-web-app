import { createContext, useContext } from 'react'
import type { LobbyRoom } from '../hooks/useLobbyRoom'

export const RoomContext = createContext<LobbyRoom | null>(null)

export function useRoom() {
  const room = useContext(RoomContext)
  if (!room) throw new Error('useRoom debe usarse dentro de RoomProvider')
  return room
}
