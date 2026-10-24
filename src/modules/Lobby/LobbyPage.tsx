import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { LogOut, Settings, Users } from 'lucide-react'
import { GameLogo } from '../../shared/components/GameLogo'
import { MenuButton } from '../../shared/components/MenuButton'
import { PlayerCard } from '../../shared/components/PlayerCard'
import { SettingsModal } from '../../shared/components/SettingsModal'
import { RoomHeader } from './components/RoomHeader'
import { PlayerSlot } from './components/PlayerSlot'
import { MatchSettings } from './components/MatchSettings'
import { MapPanel } from './components/MapPanel'
import { RoomChat } from './components/RoomChat'
import { StartButton } from './components/StartButton'
import { useRoom } from './context/roomContext'

export function LobbyPage() {
  const navigate = useNavigate()
  const room = useRoom()
  const leaveRoom = async () => {
    await room.leave()
    navigate('/')
  }
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])

  const slotProps = (slot: 1 | 2) => ({
    slot,
    player: room.bySlot[slot],
    isMe: room.bySlot[slot]?.id === room.me.id,
    onToggleReady: room.toggleReady,
    onRename: room.rename,
    onChangeSurvivor: () => navigate('personaje'),
  })

  return (
    <div
      className="relative isolate min-h-dvh px-4 py-3 lg:grid lg:grid-cols-[250px_1fr_minmax(320px,24%)] lg:grid-rows-[auto_1fr] lg:gap-x-5 lg:gap-y-3"
      data-testid="lobby"
    >
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-ug-bg bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(rgb(5 7 12 / 0.1), rgb(5 7 12 / 0.4)), url('/assets/lobby/background.jpg')" }}
      />

      {/* Logo */}
      <header className="mb-3 flex items-start justify-between lg:col-start-1 lg:row-start-1 lg:mb-0 lg:w-max lg:whitespace-nowrap">
        <GameLogo size="sm" />
        <button
          type="button"
          onClick={leaveRoom}
          className="ug-panel flex items-center gap-2 px-3 py-2 font-terminal text-lg lg:hidden"
        >
          <LogOut size={18} /> Salir
        </button>
      </header>

      {/* Barra superior */}
      <div className="mb-4 flex flex-wrap items-start justify-center gap-3 lg:col-span-2 lg:col-start-2 lg:row-start-1 lg:mb-0 lg:justify-end">
        <RoomHeader code={room.code} playerCount={room.playerCount} />
        <div className="hidden xl:block">
          <PlayerCard name={room.me.name} level={1} xp={0} xpToNext={100} />
        </div>
      </div>

      {/* Menú lateral + chat */}
      <aside className="hidden flex-col gap-3 lg:col-start-1 lg:row-start-2 lg:flex lg:self-start">
        <nav className="flex flex-col gap-3" aria-label="Menú de sala">
          <MenuButton primary size="sm" icon={Users} title="Sala" subtitle="Multijugador 1v1" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} />
          <MenuButton size="sm" icon={Settings} title="Ajustes" subtitle="Controles y gráficos" onClick={() => setSettingsOpen(true)} />
          <MenuButton size="sm" icon={LogOut} title="Salir" subtitle="Volver al menú" onClick={leaveRoom} testId="leave-room" />
        </nav>
      </aside>

      {/* Centro: jugadores, configuración y comenzar */}
      <main className="flex flex-col gap-4 lg:col-start-2 lg:row-start-2">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-2 gap-4 sm:gap-10 lg:gap-24 lg:pt-2">
          <div><PlayerSlot {...slotProps(1)} /></div>
          <div><PlayerSlot {...slotProps(2)} /></div>
        </div>
        <div className="mt-2 lg:mt-auto">
          <MatchSettings
            map={room.map}
            mapIndex={room.mapIndex}
            difficulty={room.difficulty}
            canEdit={room.me.isHost}
            onCycleMap={room.cycleMap}
            onCycleDifficulty={room.cycleDifficulty}
          />
        </div>
        <StartButton canStart={room.canStart} isHost={room.me.isHost} onStart={room.start} />
      </main>

      {/* Panel del mapa */}
      <div className="mt-6 lg:col-start-3 lg:row-start-2 lg:mt-0">
        <MapPanel map={room.map} />
      </div>

      {/* Chat: al final en móvil, abajo del menú lateral en escritorio */}
      <div className="mt-6 lg:col-start-1 lg:row-start-2 lg:mt-0 lg:self-end">
        <RoomChat messages={room.messages} onSend={room.sendMessage} />
      </div>

      <SettingsModal open={settingsOpen} onClose={closeSettings} />
    </div>
  )
}
