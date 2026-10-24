import { useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, CircleCheck, Clock, Crown, Pencil, Shirt } from 'lucide-react'
import { SURVIVORS } from '../data/catalog'
import type { LobbyPlayer, Slot } from '../hooks/useLobbyRoom'

const THEME: Record<Slot, { border: string; glow: string; accent: string; button: string; pedestal: string }> = {
  1: {
    border: 'border-[#2f6fd6]',
    glow: 'shadow-[0_0_28px_rgb(47_111_214/0.35)]',
    accent: 'text-ug-text',
    button: 'border-[#2f6fd6] bg-[#12305e]/90 hover:bg-[#173d78]',
    pedestal: 'from-[#2f8bff]/60',
  },
  2: {
    border: 'border-[#c4161c]',
    glow: 'shadow-[0_0_28px_rgb(196_22_28/0.35)]',
    accent: 'text-ug-red-hi',
    button: 'border-ug-red-hi bg-[#6e0b0f]/90 hover:bg-[#8c0d12]',
    pedestal: 'from-[#ff2a2f]/60',
  },
}

// Funde los bordes del recorte hasta que llegue el sprite con transparencia.
const SPRITE_MASK = 'radial-gradient(ellipse 50% 55% at 50% 50%, #000 60%, transparent 100%)'

interface PlayerSlotProps {
  slot: Slot
  player: LobbyPlayer | undefined
  isMe: boolean
  onToggleReady: () => void
  onRename: (name: string) => void
  onCycleSurvivor: (dir: 1 | -1) => void
}

export function PlayerSlot({ slot, player, isMe, onToggleReady, onRename, onCycleSurvivor }: PlayerSlotProps) {
  const t = THEME[slot]
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')

  if (!player) {
    return (
      <div
        className={`flex min-h-[22rem] flex-col items-center justify-center gap-3 border-2 border-dashed ${t.border} bg-black/40 p-4 text-center`}
        data-testid={`slot-${slot}`}
      >
        <span className="size-10 animate-spin rounded-full border-4 border-ug-border border-t-ug-text" />
        <p className="ug-title-shadow text-2xl">Esperando rival…</p>
        <p className="font-terminal text-lg text-ug-muted">Comparte el código de la sala</p>
      </div>
    )
  }

  const survivor = SURVIVORS[player.survivor]

  const submitName = (e: FormEvent) => {
    e.preventDefault()
    onRename(draft)
    setEditing(false)
  }

  return (
    <div
      className={`relative flex flex-col items-center border-2 ${t.border} ${t.glow} bg-gradient-to-b from-[#0d1522]/95 via-[#0d1522]/70 to-transparent px-3 pt-3`}
      data-testid={`slot-${slot}`}
    >
      {/* Nombre */}
      <div className="flex w-full min-w-0 items-center justify-center gap-2">
        {player.isHost && <Crown size={20} className="text-yellow-400" fill="currentColor" aria-label="Anfitrión" />}
        {editing ? (
          <form onSubmit={submitName}>
            <input
              autoFocus
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onBlur={submitName}
              maxLength={16}
              aria-label="Tu nombre"
              className="w-36 border-2 border-ug-border bg-black/60 px-2 text-center text-2xl outline-none focus:border-ug-accent"
            />
          </form>
        ) : (
          <p className="ug-title-shadow truncate text-2xl leading-none sm:text-3xl">{player.name}</p>
        )}
        {isMe && !editing && (
          <button
            type="button"
            aria-label="Cambiar nombre"
            onClick={() => {
              setDraft(player.name)
              setEditing(true)
            }}
            className="grid size-7 place-items-center border-2 border-ug-border bg-ug-panel-2 hover:border-ug-border-hi"
          >
            <Pencil size={14} />
          </button>
        )}
      </div>

      {/* Estado listo */}
      <button
        type="button"
        disabled={!isMe}
        onClick={onToggleReady}
        data-testid={isMe ? 'ready-toggle' : undefined}
        data-ready={player.ready}
        className="mt-1 flex items-center gap-2 text-2xl enabled:cursor-pointer enabled:hover:brightness-125"
      >
        {player.ready ? (
          <CircleCheck size={22} className="text-ug-green" fill="currentColor" stroke="#0b0f17" />
        ) : (
          <Clock size={22} className="text-ug-muted" />
        )}
        <span className={player.ready ? '' : 'text-ug-muted'}>
          {player.ready ? 'Listo' : isMe ? 'Marcar listo' : 'No listo'}
        </span>
      </button>

      <p className={`mt-1 font-terminal text-lg leading-none ${t.accent}`}>{survivor.name}</p>
      <p className="font-terminal text-lg leading-tight text-ug-muted">{survivor.role}</p>

      {/* Sprite + flechas */}
      <div className="relative mt-2 flex w-full items-center justify-between">
        <button
          type="button"
          aria-label="Personaje anterior"
          disabled={!isMe}
          onClick={() => onCycleSurvivor(-1)}
          className="z-10 p-1 text-ug-text enabled:hover:scale-110 disabled:opacity-30"
        >
          <ChevronLeft size={34} strokeWidth={3} />
        </button>
        <div className="relative flex flex-1 justify-center">
          <div className={`absolute bottom-0 h-8 w-4/5 rounded-[50%] bg-radial ${t.pedestal} to-transparent blur-sm`} />
          <img src={survivor.sprite} alt={survivor.name} className="pixelated relative h-40 object-contain xl:h-48"
            style={{ maskImage: SPRITE_MASK, WebkitMaskImage: SPRITE_MASK }} />
        </div>
        <button
          type="button"
          aria-label="Personaje siguiente"
          disabled={!isMe}
          onClick={() => onCycleSurvivor(1)}
          className="z-10 p-1 text-ug-text enabled:hover:scale-110 disabled:opacity-30"
        >
          <ChevronRight size={34} strokeWidth={3} />
        </button>
      </div>

      <button
        type="button"
        disabled={!isMe}
        onClick={() => onCycleSurvivor(1)}
        className={`relative -mb-4 flex items-center gap-2 border-2 px-3 py-1.5 font-terminal text-lg whitespace-nowrap sm:px-5 sm:text-xl ${t.button} disabled:cursor-default`}
      >
        <Shirt size={20} fill="currentColor" /> Cambiar<span className="hidden sm:inline"> personaje</span>
      </button>
    </div>
  )
}
