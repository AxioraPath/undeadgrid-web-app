import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { LobbyPage } from './modules/Lobby/LobbyPage'
import { RoomPage } from './modules/Room/RoomPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/sala/:code" element={<RoomPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
