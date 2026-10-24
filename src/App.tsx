import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { HomePage } from './modules/Home/HomePage'
import { RoomProvider } from './modules/Lobby/context/RoomProvider'
import { LobbyPage } from './modules/Lobby/LobbyPage'
import { SurvivorSelectPage } from './modules/Lobby/SurvivorSelectPage'
import { RoomGamePage } from './modules/Game/RoomGamePage'
import { AuthProvider } from './modules/Auth/context/AuthProvider'
import { RequireAuth } from './modules/Auth/components/RequireAuth'
import { LoginPage } from './modules/Auth/LoginPage'
import { RegisterPage } from './modules/Auth/RegisterPage'
import { ForgotPasswordPage } from './modules/Auth/ForgotPasswordPage'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/registro" element={<RegisterPage />} />
          <Route path="/recuperar" element={<ForgotPasswordPage />} />
          <Route element={<RequireAuth />}>
            <Route path="/sala/:code" element={<RoomProvider />}>
              <Route index element={<LobbyPage />} />
              <Route path="personaje" element={<SurvivorSelectPage />} />
              <Route path="partida" element={<RoomGamePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
