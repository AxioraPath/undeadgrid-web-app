import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Play, ScrollText, Settings, Users } from 'lucide-react'
import { GameLogo } from '../../shared/components/GameLogo'
import { MenuButton } from '../../shared/components/MenuButton'
import { PlayerCard } from '../../shared/components/PlayerCard'
import { IconButton } from '../../shared/components/IconButton'
import { ModeCard } from './components/ModeCard'
import { FeatureCards } from './components/FeatureCards'
import { StatusBar } from './components/StatusBar'
import { PlayModal } from './components/PlayModal'
import { InfoModals, type InfoModalKind } from './components/InfoModals'
import { ProfileModal } from './components/ProfileModal'
import { SettingsModal } from '../../shared/components/SettingsModal'
import { MissionsModal } from './components/MissionsModal'
import { authApi } from '../../shared/lib/authApi'
import { HomeBackground } from './components/HomeBackground'
import { useServerStatus } from '../../shared/hooks/useServerStatus'
import { NEW_ROOM_CODE } from '../Lobby/hooks/useLobbyRoom'
import { useAuth } from '../Auth/context/authContext'

const GUEST_PROFILE = { level: 1, xp: 0, xpToNext: 100 }

export function HomePage() {
  const navigate = useNavigate()
  const { status, latencyMs } = useServerStatus()
  const { user, refreshProfile } = useAuth()
  const signedIn = Boolean(user)
  const [playOpen, setPlayOpen] = useState(false)
  const [info, setInfo] = useState<InfoModalKind | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [missionsOpen, setMissionsOpen] = useState(false)
  const [claimable, setClaimable] = useState(0)

  const closePlay = useCallback(() => setPlayOpen(false), [])
  const closeInfo = useCallback(() => setInfo(null), [])
  const closeProfile = useCallback(() => setProfileOpen(false), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const closeMissions = useCallback(() => setMissionsOpen(false), [])

  // Fresh level/xp (e.g. after a match) and the number of claimable missions for the badge.
  useEffect(() => {
    if (!signedIn) return
    void refreshProfile()
    authApi
      .getMissions()
      .then((r) => setClaimable(r.missions.filter((m) => m.status === 'completed').length))
      .catch(() => undefined)
  }, [signedIn, refreshProfile])

  // Con sesión, el perfil y las estadísticas se ven aquí mismo; sin sesión, se pide iniciarla.
  const openProfile = () => (user ? setProfileOpen(true) : navigate('/login'))
  const openMissions = () => (user ? setMissionsOpen(true) : navigate('/login'))

  // La sala la crea el servidor al entrar; la URL cambia al código real en cuanto responde.
  const createRoom = () => navigate(`/sala/${NEW_ROOM_CODE.toLowerCase()}`, { state: { isHost: true } })
  const joinRoom = (code: string) => navigate(`/sala/${code}`)

  return (
    <div className="relative isolate flex min-h-dvh flex-col px-4 pt-4 pb-3 sm:px-6 lg:px-8 lg:pt-5 phone:px-[max(1rem,env(safe-area-inset-left))] phone:pt-2 phone:pb-1.5" data-testid="home">
      <HomeBackground />

      <div className="flex flex-1 flex-col gap-6 phone:grid phone:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] phone:grid-rows-[auto_1fr_auto] phone:gap-x-4 phone:gap-y-1.5 lg:grid lg:grid-cols-[minmax(340px,27%)_1fr_minmax(340px,25%)] lg:grid-rows-[auto_1fr_auto] lg:gap-x-6 lg:gap-y-4">
        {/* Logo */}
        <header className="order-2 phone:order-none phone:col-start-1 phone:row-start-1 lg:order-none lg:col-span-2 lg:row-start-1">
          <GameLogo />
        </header>

        {/* Perfil + accesos rápidos */}
        <div className="order-1 flex items-start justify-between gap-3 phone:order-none phone:col-start-2 phone:row-start-1 phone:justify-end lg:order-none lg:col-start-3 lg:row-start-1 lg:-ml-40 lg:justify-end">
          <button type="button" onClick={openProfile} className="text-left transition hover:brightness-110" aria-label={user ? 'Tu perfil' : 'Iniciar sesión'} data-testid="go-auth">
            <PlayerCard name={user?.name ?? 'Invitado'} {...(user ? user.profile ?? {} : GUEST_PROFILE)} />
          </button>
          <div className="hidden gap-3 sm:flex phone:hidden">
            <IconButton icon={Settings} label="Ajustes" onClick={() => setSettingsOpen(true)} />
          </div>
        </div>

        {/* Menú principal */}
        <nav className="order-3 flex max-w-md flex-col gap-3 phone:order-none phone:col-start-1 phone:row-start-2 phone:max-w-none phone:grid phone:grid-cols-2 phone:gap-2 phone:self-center lg:order-none lg:col-start-1 lg:row-start-2 lg:max-w-none lg:self-center" aria-label="Menú principal">
          <MenuButton primary icon={Play} title="JUGAR" subtitle="Crear o unirse a una sala" onClick={() => setPlayOpen(true)} testId="menu-play" />
          <MenuButton icon={ScrollText} title="Misiones" subtitle="Gana XP y sube de nivel" onClick={openMissions} testId="menu-missions" badge={signedIn ? claimable : 0} />
          <MenuButton icon={BookOpen} title="Instrucciones" subtitle="Aprende a jugar" onClick={() => setInfo('instructions')} testId="menu-instructions" />
          <MenuButton icon={Settings} title="Ajustes" subtitle="Controles y gráficos" onClick={() => setSettingsOpen(true)} testId="menu-settings" />
          <MenuButton icon={Users} title="Créditos" subtitle="Equipo del proyecto" onClick={() => setInfo('credits')} testId="menu-credits" />
        </nav>

        {/* Modo principal */}
        <aside className="order-4 phone:order-none phone:col-start-2 phone:row-start-2 phone:self-center lg:order-none lg:col-start-3 lg:row-start-2 lg:self-start">
          <ModeCard />
        </aside>

        {/* Tarjetas de mecánicas */}
        <section className="order-5 phone:hidden lg:order-none lg:col-span-2 lg:col-start-2 lg:row-start-3" aria-label="Cómo se juega">
          <FeatureCards />
        </section>
      </div>

      <div className="mt-6 phone:mt-1 lg:mt-3">
        <StatusBar status={status} latencyMs={latencyMs} />
      </div>

      <PlayModal open={playOpen} onClose={closePlay} onCreate={createRoom} onJoin={joinRoom} />
      <InfoModals kind={info} onClose={closeInfo} />
      <ProfileModal open={profileOpen} onClose={closeProfile} />
      <SettingsModal open={settingsOpen} onClose={closeSettings} />
      <MissionsModal open={missionsOpen} onClose={closeMissions} onClaimableChange={setClaimable} />
    </div>
  )
}
