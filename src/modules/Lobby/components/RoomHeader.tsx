import { useState } from 'react'
import { Check, Copy, Swords, Users } from 'lucide-react'

interface RoomHeaderProps {
  code: string
  playerCount: number
}

export function RoomHeader({ code, playerCount }: RoomHeaderProps) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1500)
    } catch {
      /* el portapapeles puede no estar disponible (http sin localhost) */
    }
  }

  return (
    <div className="flex flex-wrap items-stretch justify-center gap-3">
      <div className="ug-panel flex items-center gap-4 px-5 py-2">
        <div className="text-center">
          <p className="ug-title-shadow text-4xl leading-none tracking-wide">
            SALA: <span data-testid="room-code">{code}</span>
          </p>
          <p className="font-terminal text-lg leading-tight text-ug-muted">Código para unirse</p>
        </div>
        <button
          type="button"
          onClick={copy}
          aria-label="Copiar código"
          title="Copiar código"
          className="grid size-10 place-items-center border-2 border-ug-border bg-ug-panel-2 text-ug-text hover:border-ug-border-hi"
        >
          {copied ? <Check size={20} className="text-ug-green" /> : <Copy size={20} />}
        </button>
      </div>

      <div className="ug-panel flex items-center gap-3 px-4 py-2">
        <Users size={30} />
        <div className="text-center">
          <p className="font-terminal text-lg leading-none text-ug-muted">Jugadores</p>
          <p className="ug-title-shadow text-3xl leading-none" data-testid="player-count">{playerCount} / 2</p>
        </div>
      </div>

      <div className="ug-panel flex items-center gap-3 px-4 py-2">
        <Swords size={30} />
        <div className="text-center">
          <p className="font-terminal text-lg leading-none text-ug-muted">Modo</p>
          <p className="ug-title-shadow text-3xl leading-none">1 vs 1</p>
        </div>
      </div>
    </div>
  )
}
