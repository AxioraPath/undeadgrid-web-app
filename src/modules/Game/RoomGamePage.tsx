import { useNavigate } from 'react-router-dom'
import { useRoom } from '../Lobby/context/roomContext'
import { getSurvivor } from '../Lobby/data/catalog'
import { GamePage } from './GamePage'

/** /sala/:code/partida: toma jugador, superviviente y rival de la sala. */
export function RoomGamePage() {
  const navigate = useNavigate()
  const room = useRoom()
  const rival = room.rival

  return (
    <GamePage
      mySlot={room.me.slot}
      myName={room.me.name}
      mySurvivor={room.me.survivor}
      rivalName={rival?.name ?? 'Rival'}
      rivalSurvivor={rival?.survivor ?? getSurvivor('mecanica').id}
      practice
      exitLabel="Sala"
      onExit={() => navigate(`/sala/${room.code}`)}
    />
  )
}
