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

  return (
    <GamePage
      mySlot={room.me.slot}
      status={room.status}
      roomResult={room.result}
      xp={room.matchXp}
      exitLabel="Inicio"
      onExit={exit}
    />
  )
}
