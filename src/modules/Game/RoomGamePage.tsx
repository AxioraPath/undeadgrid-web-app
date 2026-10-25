import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import type { Slot } from '../../shared/lib/contracts'
import { useRoom } from '../Lobby/context/roomContext'
import { GamePage } from './GamePage'

/** /sala/:code/partida: la partida de la sala, simulada en el servidor. */
export function RoomGamePage() {
  const navigate = useNavigate()
  const room = useRoom()

  const exit = async () => {
    await room.leave()
    navigate('/')
  }

  const players = useMemo(
    () => {
      const byPlayer: Partial<Record<Slot, { name: string; survivor: string }>> = {}
      for (const slot of [1, 2, 3, 4] as Slot[]) {
        const p = room.bySlot[slot]
        if (p) byPlayer[slot] = { name: p.name, survivor: p.survivor }
      }
      return byPlayer
    },
    [room.bySlot],
  )

  // A rematch needs every seat of the mode filled and connected (the server rejects it otherwise).
  const rivalPresent = room.playerCount === room.capacity && room.rivals.length > 0 && room.rivals.every((p) => p.connected) && (room.teammate?.connected ?? true)

  return (
    <GamePage
      // Remount between rounds: a rematch starts from a clean map / HUD.
      key={room.matchRound}
      mySlot={room.me.slot}
      status={room.status}
      roomResult={room.result}
      xp={room.matchXp}
      onExit={exit}
      chat={{ messages: room.messages, onSend: room.sendMessage }}
      results={{
        roomCode: room.code,
        mapId: room.map.id,
        mapName: room.map.name,
        players,
        summary: room.matchSummary,
        rivalPresent,
        rematchRequested: room.rematchRequested,
        onRematch: room.requestRematch,
        onCancelRematch: room.cancelRematch,
        onBackToLobby: room.backToLobby,
      }}
    />
  )
}
