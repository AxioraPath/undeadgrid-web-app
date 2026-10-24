import { Play } from 'lucide-react'

interface StartButtonProps {
  canStart: boolean
  isHost: boolean
  onStart: () => void
}

export function StartButton({ canStart, isHost, onStart }: StartButtonProps) {
  const hint = canStart
    ? '¡Todo listo! Comienza cuando quieras'
    : isHost
      ? 'Espera a que ambos jugadores estén listos'
      : 'El anfitrión iniciará la partida'

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={!canStart}
        onClick={onStart}
        data-testid="start-match"
        className="flex items-center gap-5 border-2 border-ug-red-hi bg-gradient-to-b from-[#d0181f] to-[#8c0d12] px-6 py-2.5 sm:px-10 shadow-[0_0_24px_rgb(255_30_40/0.35),inset_0_0_0_2px_rgb(0_0_0/0.35),0_4px_0_rgb(0_0_0/0.55)] transition enabled:hover:-translate-y-0.5 enabled:hover:brightness-110 enabled:active:translate-y-0.5 disabled:opacity-60 disabled:saturate-50"
      >
        <Play size={32} fill="currentColor" className="shrink-0" />
        <span className="ug-title-shadow text-3xl leading-none tracking-wide whitespace-nowrap sm:text-4xl">COMENZAR PARTIDA</span>
      </button>
      <p className="font-terminal text-lg text-ug-muted">{hint}</p>
    </div>
  )
}
