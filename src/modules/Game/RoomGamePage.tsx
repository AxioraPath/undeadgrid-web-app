import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
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
    () => ({
      1: room.bySlot[1] && { name: room.bySlot[1].name, survivor: room.bySlot[1].survivor },
      2: room.bySlot[2] && { name: room.bySlot[2].name, survivor: room.bySlot[2].survivor },
    }),
    [room.bySlot],
  )

  const rivalPresent = Boolean(room.rival) && room.rival?.connected !== false

  return (
    <GamePage
      // Remount between rounds: a rematch starts from a clean map / HUD.
      key={room.matchRound}
      mySlot={room.me.slot}
      status={room.status}
      roomResult={room.result}
      xp={room.matchXp}
      onExit={exit}
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
