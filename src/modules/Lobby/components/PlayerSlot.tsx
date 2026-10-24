import { useState, type FormEvent } from 'react'
import { ChevronLeft, ChevronRight, CircleCheck, Clock, Crown, Pencil, Shirt } from 'lucide-react'
import { getSurvivor } from '../data/catalog'
import { SLOT_THEME, SPRITE_MASK } from '../data/slotTheme'
import type { LobbyPlayer, Slot } from '../hooks/useLobbyRoom'

interface PlayerSlotProps {
  slot: Slot
  player: LobbyPlayer | undefined
  isMe: boolean
  onToggleReady: () => void
  onRename: (name: string) => void
  onCycleSurvivor: (dir: 1 | -1) => void
  onChangeSurvivor: () => void
}

export function PlayerSlot({ slot, player, isMe, onToggleReady, onRename, onCycleSurvivor, onChangeSurvivor }: PlayerSlotProps) {
  const t = SLOT_THEME[slot]
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

  const survivor = getSurvivor(player.survivor)
  // El personaje del rival no se revela hasta que lo confirma.
  const hidden = !isMe && !player.survivorConfirmed

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

      <p className={`mt-1 font-terminal text-lg leading-none ${hidden ? 'text-ug-muted' : t.accent}`}>
        {hidden ? 'Eligiendo superviviente…' : survivor.name}
      </p>
      <p className="font-terminal text-lg leading-tight text-ug-muted">{hidden ? ' ' : survivor.tagline}</p>

      {/* Sprite; solo tu tarjeta tiene controles para cambiarlo */}
      <div className="relative mt-2 flex w-full items-center justify-between">
        {isMe ? (
          <button type="button" aria-label="Personaje anterior" onClick={() => onCycleSurvivor(-1)} className="z-10 p-1 text-ug-text hover:scale-110">
            <ChevronLeft size={34} strokeWidth={3} />
          </button>
        ) : (
          <span className="w-[42px]" />
        )}
        <div className="relative flex flex-1 justify-center">
          <div className={`absolute bottom-0 h-8 w-4/5 rounded-[50%] bg-radial ${t.pedestal} to-transparent blur-sm`} />
          <img
            src={survivor.sprite}
            alt={hidden ? 'Superviviente sin revelar' : survivor.name}
            className={`pixelated relative h-40 object-contain xl:h-48 ${hidden ? 'opacity-70 brightness-0' : ''}`}
            style={{ maskImage: SPRITE_MASK, WebkitMaskImage: SPRITE_MASK }}
          />
        </div>
        {isMe ? (
          <button type="button" aria-label="Personaje siguiente" onClick={() => onCycleSurvivor(1)} className="z-10 p-1 text-ug-text hover:scale-110">
            <ChevronRight size={34} strokeWidth={3} />
          </button>
        ) : (
          <span className="w-[42px]" />
        )}
      </div>

      {isMe ? (
        <button
          type="button"
          onClick={onChangeSurvivor}
          data-testid="change-survivor"
          className={`relative -mb-4 flex items-center gap-2 border-2 px-3 py-1.5 font-terminal text-lg whitespace-nowrap sm:px-5 sm:text-xl ${t.button}`}
        >
          <Shirt size={20} fill="currentColor" /> Cambiar<span className="hidden sm:inline"> personaje</span>
        </button>
      ) : (
        <div className="h-5" />
      )}
    </div>
  )
}
