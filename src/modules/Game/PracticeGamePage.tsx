import { useNavigate } from 'react-router-dom'
import { GamePage } from './GamePage'

/** /prueba: partida local para probar jugabilidad sin pasar por la sala. */
export function PracticeGamePage() {
  const navigate = useNavigate()
  return (
    <GamePage
      mySlot={1}
      myName="Jugador 1"
      mySurvivor="explorador"
      rivalName="Jugador 2"
      rivalSurvivor="mecanica"
      practice
      exitLabel="Inicio"
      onExit={() => navigate('/')}
    />
  )
}
