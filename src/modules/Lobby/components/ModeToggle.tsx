import { Skull, Swords, Users } from 'lucide-react'
import type { GameMode } from '../../../shared/lib/contracts'

interface ModeToggleProps {
  mode: GameMode
  /** Only the host can change the mode; everybody else sees it read-only. */
  canEdit: boolean
  onChange: (mode: GameMode) => void
}

const OPTIONS: { mode: GameMode; label: string; hint: string; icon: typeof Swords }[] = [
  { mode: '1v1', label: '1 VS 1', hint: 'Duelo', icon: Swords },
  { mode: '2v2', label: '2 VS 2', hint: 'Por equipos', icon: Users },
  { mode: 'ffa', label: 'TODOS', hint: 'Todos vs todos', icon: Skull },
]

export function ModeToggle({ mode, canEdit, onChange }: ModeToggleProps) {
  return (
    <section className="ug-panel flex items-center gap-3 px-3 py-2 phone:gap-2 phone:px-2 phone:py-1" aria-label="Modo de juego" data-testid="mode-toggle" data-mode={mode}>
      <h3 className="ug-title-shadow text-xl leading-none tracking-wide phone:hidden">MODO</h3>
      <div className="grid flex-1 grid-cols-3 gap-2 phone:gap-1" role="group" aria-label="Modo de juego">
        {OPTIONS.map(({ mode: m, label, hint, icon: Icon }) => {
          const active = m === mode
          return (
            <button
              key={m}
              type="button"
              disabled={!canEdit}
              aria-pressed={active}
              onClick={() => !active && onChange(m)}
              data-testid={`mode-${m}`}
              className={`flex items-center justify-center gap-2 border-2 px-3 py-1.5 phone:px-2 phone:py-0.5 text-2xl phone:text-xl leading-none transition ${
                active
                  ? 'border-ug-accent bg-ug-panel-2 shadow-[0_0_10px_rgb(143_211_255/0.4)]'
                  : 'border-ug-border bg-black/30 text-ug-muted'
              } ${canEdit && !active ? 'cursor-pointer hover:border-ug-border-hi hover:text-ug-text' : ''} ${!canEdit && !active ? 'opacity-60' : ''}`}
            >
              <Icon size="1.375rem" aria-hidden />
              <span>{label}</span>
              <span className="font-terminal text-base text-ug-muted max-sm:hidden">{hint}</span>
            </button>
          )
        })}
      </div>
      {!canEdit && (
        <p className="font-terminal text-base leading-none text-ug-muted phone:hidden" data-testid="mode-readonly">
          Lo elige el anfitrión
        </p>
      )}
    </section>
  )
}
