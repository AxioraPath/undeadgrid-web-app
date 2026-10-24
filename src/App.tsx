import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './modules/Home/HomePage'
import { LobbyPage } from './modules/Lobby/LobbyPage'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/sala/:code" element={<LobbyPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
