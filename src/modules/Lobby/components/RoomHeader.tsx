import { useState } from 'react'
import { Check, Copy, Swords, Users } from 'lucide-react'
import type { GameMode } from '../../../shared/lib/contracts'

interface RoomHeaderProps {
  /** null mientras el servidor crea/confirma la sala. */
  code: string | null
  playerCount: number
  capacity?: number
  mode?: GameMode
}

export function RoomHeader({ code, playerCount, capacity = 2, mode = '1v1' }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    if (!code) return
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* el portapapeles puede no estar disponible (http sin localhost) */
    }
  }

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-3 phone:flex-nowrap phone:gap-1.5">
      <div className="ug-panel flex items-center gap-4 px-5 py-2 phone:gap-2 phone:px-2.5 phone:py-1">
        <div className="text-center">
          <p className="ug-title-shadow text-4xl phone:text-3xl leading-none tracking-wide whitespace-nowrap">
            SALA: <span data-testid="room-code">{code ?? '·····'}</span>
          </p>
          <p className="font-terminal text-lg leading-tight text-ug-muted phone:hidden">{mode === '1v1' ? 'Código para unirse' : 'Código para unirse (hasta 4)'}</p>
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={!code}
          aria-label="Copiar código"
          title="Copiar código"
          className="grid size-10 phone:size-8 place-items-center border-2 border-ug-border bg-ug-panel-2 text-ug-text hover:border-ug-border-hi"
        >
          {copied ? <Check size="1.25rem" className="text-ug-green" /> : <Copy size="1.25rem" />}
        </button>
      </div>

      <div className="ug-panel flex items-center gap-3 px-4 py-2 phone:gap-1.5 phone:px-2 phone:py-1">
        <Users size="1.875rem" />
        <div className="text-center">
          <p className="font-terminal text-lg phone:hidden leading-none text-ug-muted">Jugadores</p>
          <p className="ug-title-shadow text-3xl phone:text-2xl leading-none whitespace-nowrap" data-testid="player-count">{playerCount} / {capacity}</p>
        </div>
      </div>

      <div className="ug-panel flex items-center gap-3 px-4 py-2 phone:hidden">
        <Swords size="1.875rem" />
        <div className="text-center">
          <p className="font-terminal text-lg leading-none text-ug-muted">Modo</p>
          <p className="ug-title-shadow text-3xl leading-none" data-testid="room-mode">{mode === 'ffa' ? 'Todos' : mode === '2v2' ? '2 vs 2' : '1 vs 1'}</p>
        </div>
      </div>
    </div>
  )
}
