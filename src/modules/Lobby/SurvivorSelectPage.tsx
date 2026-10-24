import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Check } from 'lucide-react'
import { GameLogo } from '../../shared/components/GameLogo'
import { SurvivorSelector } from './components/SurvivorSelector'
import { SurvivorDetails } from './components/SurvivorDetails'
import { getSurvivor, UNLOCKED_SURVIVORS } from './data/catalog'
import { useRoom } from './context/roomContext'

export function SurvivorSelectPage() {
  const navigate = useNavigate()
  const room = useRoom()
  // Selección local: solo se envía a la sala al confirmar.
  const [selectedId, setSelectedId] = useState(room.me.survivor)
  const survivor = getSurvivor(selectedId)

  const backToRoom = () => navigate(`/sala/${room.code}`)

  const cycle = (dir: 1 | -1) => {
    const i = UNLOCKED_SURVIVORS.findIndex((s) => s.id === selectedId)
    setSelectedId(UNLOCKED_SURVIVORS[(i + dir + UNLOCKED_SURVIVORS.length) % UNLOCKED_SURVIVORS.length].id)
  }

  // En el lobby solo se cambia el personaje; en la fase de selección se confirma y se espera al rival.
  const selecting = room.status === 'selection'
  const confirmed = selecting && room.me.survivorConfirmed

  const confirm = async () => {
    if (selecting) {
      await room.confirmSurvivor(selectedId)
      return
    }
    await room.selectSurvivor(selectedId)
    backToRoom()
  }

  return (
    <div className="relative isolate flex min-h-dvh flex-col gap-3 px-4 py-3 phone:grid phone:grid-cols-[auto_1fr_auto] phone:grid-rows-[auto_1fr_auto] phone:gap-x-3 phone:gap-y-1 phone:px-3 phone:py-1.5 lg:px-8" data-testid="survivor-select">
      <div
        aria-hidden
        className="fixed inset-0 -z-10 bg-ug-bg bg-cover bg-center"
        style={{ backgroundImage: "linear-gradient(rgb(5 7 12 / 0.1), rgb(5 7 12 / 0.45)), url('/assets/survivors/background.jpg')" }}
      />

      <header className="flex flex-wrap items-start justify-between gap-4 phone:col-start-1 phone:row-start-1">
        <GameLogo size="sm" />
      </header>

      <div className="text-center phone:col-start-2 phone:row-start-1 phone:self-center">
        <h1 className="ug-title-shadow text-4xl phone:text-3xl leading-none">SELECCIONA TU SUPERVIVIENTE</h1>
        <p className="font-terminal text-xl phone:text-base phone:leading-none text-ug-muted">Cada superviviente tiene un estilo de juego diferente.</p>
      </div>

      <main className="mx-auto flex w-full max-w-4xl flex-col gap-4 px-5 phone:col-span-3 phone:row-start-2 phone:grid phone:max-w-none phone:grid-cols-[1.15fr_1fr] phone:items-center phone:gap-3 phone:px-4">
        <SurvivorSelector slot={room.me.slot} survivor={survivor} onSelect={setSelectedId} onCycle={cycle} />
        <SurvivorDetails slot={room.me.slot} survivor={survivor} />
      </main>

      <footer className="relative mt-auto flex flex-col items-center gap-3 pb-1 phone:col-span-3 phone:row-start-3 phone:gap-2 phone:pb-0 sm:flex-row sm:justify-center">
        {!selecting && (
          <button
            type="button"
            onClick={backToRoom}
            className="ug-panel flex items-center gap-3 px-6 py-2 phone:px-3 phone:py-1 phone:text-xl text-2xl hover:border-ug-border-hi sm:absolute sm:left-0"
          >
            <ArrowLeft size="1.375rem" /> VOLVER
          </button>
        )}
        <div className="flex flex-col items-center gap-1">
          <button
            type="button"
            onClick={confirm}
            disabled={confirmed}
            data-testid="confirm-survivor"
            className="flex disabled:opacity-60 disabled:saturate-50 items-center gap-4 border-2 border-ug-red-hi bg-gradient-to-b from-[#d0181f] to-[#8c0d12] px-6 py-2 phone:py-1 sm:px-10 shadow-[0_0_24px_rgb(255_30_40/0.35),inset_0_0_0_2px_rgb(0_0_0/0.35),0_4px_0_rgb(0_0_0/0.55)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5"
          >
            <Check size="1.875rem" strokeWidth={3} />
            <span className="ug-title-shadow text-3xl phone:text-2xl leading-none whitespace-nowrap">CONFIRMAR PERSONAJE</span>
          </button>
          <p className="font-terminal text-base phone:text-sm phone:leading-none text-ug-muted" data-testid="selection-hint">
            {confirmed
              ? 'Listo. Esperando a que el rival confirme…'
              : selecting
                ? 'Confirma tu superviviente: la partida empieza cuando ambos confirmen.'
                : 'Elige tu superviviente y confírmalo para volver a la sala.'}
          </p>
        </div>
      </footer>
    </div>
  )
}
