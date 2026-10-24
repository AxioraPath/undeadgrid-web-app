import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './modules/Home/HomePage'
import { RoomProvider } from './modules/Lobby/context/RoomProvider'
import { LobbyPage } from './modules/Lobby/LobbyPage'
import { SurvivorSelectPage } from './modules/Lobby/SurvivorSelectPage'
import { RoomGamePage } from './modules/Game/RoomGamePage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sala/:code" element={<RoomProvider />}>
          <Route index element={<LobbyPage />} />
          <Route path="personaje" element={<SurvivorSelectPage />} />
          <Route path="partida" element={<RoomGamePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
