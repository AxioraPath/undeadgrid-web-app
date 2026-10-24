import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BookOpen, Play, Settings, Users } from 'lucide-react'
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
import { HomeBackground } from './components/HomeBackground'
import { useServerStatus } from '../../shared/hooks/useServerStatus'
import { randomRoomCode } from '../Lobby/data/catalog'
import { useAuth } from '../Auth/context/authContext'

export function HomePage() {
  const navigate = useNavigate()
  const { status, latencyMs } = useServerStatus()
  const { user } = useAuth()
  const [playOpen, setPlayOpen] = useState(false)
  const [info, setInfo] = useState<InfoModalKind | null>(null)
  const [profileOpen, setProfileOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)

  const closePlay = useCallback(() => setPlayOpen(false), [])
  const closeInfo = useCallback(() => setInfo(null), [])
  const closeProfile = useCallback(() => setProfileOpen(false), [])
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  // Con sesión, el perfil y las estadísticas se ven aquí mismo; sin sesión, se pide iniciarla.
  const openProfile = () => (user ? setProfileOpen(true) : navigate('/login'))

  // TODO: emitir lobby:create / lobby:join por socket cuando exista el servidor.
  const createRoom = () => navigate(`/sala/${randomRoomCode()}`, { state: { isHost: true } })
  const joinRoom = (code: string) => navigate(`/sala/${code}`)

  return (
    <div className="relative isolate flex min-h-dvh flex-col px-4 pt-4 pb-3 sm:px-6 lg:px-8 lg:pt-5" data-testid="home">
      <HomeBackground />

      <div className="flex flex-1 flex-col gap-6 lg:grid lg:grid-cols-[minmax(340px,27%)_1fr_minmax(340px,25%)] lg:grid-rows-[auto_1fr_auto] lg:gap-x-6 lg:gap-y-4">
        {/* Logo */}
        <header className="order-2 lg:order-none lg:col-span-2 lg:row-start-1">
          <GameLogo />
        </header>

        {/* Perfil + accesos rápidos */}
        <div className="order-1 flex items-start justify-between gap-3 lg:order-none lg:col-start-3 lg:row-start-1 lg:-ml-40 lg:justify-end">
          <button type="button" onClick={openProfile} className="text-left transition hover:brightness-110" aria-label={user ? 'Tu perfil' : 'Iniciar sesión'} data-testid="go-auth">
            <PlayerCard name={user?.name ?? 'Invitado'} level={1} xp={0} xpToNext={100} />
          </button>
          <div className="hidden gap-3 sm:flex">
            <IconButton icon={Settings} label="Ajustes" onClick={() => setSettingsOpen(true)} />
          </div>
        </div>

        {/* Menú principal */}
        <nav className="order-3 flex max-w-md flex-col gap-3 lg:order-none lg:col-start-1 lg:row-start-2 lg:max-w-none lg:self-center" aria-label="Menú principal">
          <MenuButton primary icon={Play} title="JUGAR" subtitle="Crear o unirse a una sala" onClick={() => setPlayOpen(true)} testId="menu-play" />
          <MenuButton icon={BookOpen} title="Instrucciones" subtitle="Aprende a jugar" onClick={() => setInfo('instructions')} testId="menu-instructions" />
          <MenuButton icon={Settings} title="Ajustes" subtitle="Controles y gráficos" onClick={() => setSettingsOpen(true)} testId="menu-settings" />
          <MenuButton icon={Users} title="Créditos" subtitle="Equipo del proyecto" onClick={() => setInfo('credits')} testId="menu-credits" />
        </nav>

        {/* Modo principal */}
        <aside className="order-4 lg:order-none lg:col-start-3 lg:row-start-2 lg:self-start">
          <ModeCard />
        </aside>

        {/* Tarjetas de mecánicas */}
        <section className="order-5 lg:order-none lg:col-span-2 lg:col-start-2 lg:row-start-3" aria-label="Cómo se juega">
          <FeatureCards />
        </section>
      </div>

      <div className="mt-6 lg:mt-3">
        <StatusBar status={status} latencyMs={latencyMs} />
      </div>

      <PlayModal open={playOpen} onClose={closePlay} onCreate={createRoom} onJoin={joinRoom} />
      <InfoModals kind={info} onClose={closeInfo} />
      <ProfileModal open={profileOpen} onClose={closeProfile} />
      <SettingsModal open={settingsOpen} onClose={closeSettings} />
    </div>
  )
}
