import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { GameLogo } from '../../shared/components/GameLogo'
import { StepIndicator } from './components/StepIndicator'
import { RoomSummaryCard } from './components/RoomSummaryCard'
import { SurvivorSelector } from './components/SurvivorSelector'
import { RivalStatusCard } from './components/RivalStatusCard'
import { SurvivorDetails } from './components/SurvivorDetails'
import { getSurvivor, UNLOCKED_SURVIVORS } from './data/catalog'
import { useRoom } from './context/roomContext'

export function SurvivorSelectPage() {
  const navigate = useNavigate()
  const room = useRoom()
  // Selección local: solo se envía a la sala al confirmar.
  const [selectedId, setSelectedId] = useState(room.me.survivor)
  const survivor = getSurvivor(selectedId)
  const rivalSlot = room.me.slot === 1 ? 2 : 1

  const backToRoom = () => navigate(`/sala/${room.code}`)

  const cycle = (dir: 1 | -1) => {
    const i = UNLOCKED_SURVIVORS.findIndex((s) => s.id === selectedId)
    setSelectedId(UNLOCKED_SURVIVORS[(i + dir + UNLOCKED_SURVIVORS.length) % UNLOCKED_SURVIVORS.length].id)
  }

  const confirm = () => {
    room.confirmSurvivor(selectedId)
    backToRoom()
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col gap-3 px-4 py-3 lg:px-8" data-testid="survivor-select">
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-ug-bg bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(rgb(5 7 12 / 0.1), rgb(5 7 12 / 0.45)), url('/assets/survivors/background.jpg')" }}
      />

      <header className="flex flex-wrap items-start justify-between gap-4">
        <GameLogo size="sm" />
        <StepIndicator current={1} onStep={(i) => i === 0 && backToRoom()} />
        <RoomSummaryCard code={room.code} map={room.map} />
      </header>

      <div className="text-center">
        <h1 className="ug-title-shadow text-4xl leading-none">SELECCIONA TU SUPERVIVIENTE</h1>
        <p className="font-terminal text-xl text-ug-muted">Cada superviviente tiene un estilo de juego diferente.</p>
      </div>

      <main className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[1.7fr_1fr]">
        <div className="flex flex-col gap-4 px-5 lg:px-0">
          <SurvivorSelector slot={room.me.slot} survivor={survivor} onSelect={setSelectedId} onCycle={cycle} />
          <SurvivorDetails slot={room.me.slot} survivor={survivor} />
        </div>
        <RivalStatusCard slot={rivalSlot} rival={room.rival} />
      </main>

      <footer className="relative mt-auto flex flex-col items-center gap-3 pb-1 sm:flex-row sm:justify-center">
        <button
          type="button"
          onClick={backToRoom}
          className="ug-panel flex items-center gap-3 px-6 py-2 text-2xl hover:border-ug-border-hi sm:absolute sm:left-0"
        >
          <ArrowLeft size={22} /> VOLVER
        </button>
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={confirm}
            data-testid="confirm-survivor"
            className="flex items-center gap-4 border-2 border-ug-red-hi bg-gradient-to-b from-[#d0181f] to-[#8c0d12] px-6 py-2 sm:px-10 shadow-[0_0_24px_rgb(255_30_40/0.35),inset_0_0_0_2px_rgb(0_0_0/0.35),0_4px_0_rgb(0_0_0/0.55)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5"
          >
            <Check size={30} strokeWidth={3} />
            <span className="ug-title-shadow text-3xl leading-none whitespace-nowrap">CONFIRMAR PERSONAJE</span>
          </button>
          <p className="font-terminal text-base text-ug-muted">Ambos jugadores deben seleccionar su superviviente.</p>
        </div>
      </footer>
    </div>
  )
}
