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
import { DesktopFit } from './shared/components/DesktopFit'
import { RotateDevice } from './shared/components/RotateDevice'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<DesktopFit><HomePage /></DesktopFit>} />
          <Route path="/login" element={<DesktopFit><LoginPage /></DesktopFit>} />
          <Route path="/registro" element={<DesktopFit><RegisterPage /></DesktopFit>} />
          <Route element={<RequireAuth />}>
            <Route path="/sala/:code" element={<RoomProvider />}>
              <Route index element={<DesktopFit><LobbyPage /></DesktopFit>} />
              <Route path="personaje" element={<DesktopFit><SurvivorSelectPage /></DesktopFit>} />
              <Route path="partida" element={<RoomGamePage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
      <RotateDevice />
    </BrowserRouter>
  )
}
