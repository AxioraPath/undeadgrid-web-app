import { ChevronLeft, ChevronRight, Lock } from 'lucide-react'
import { STAT_LABELS, STAT_MAX, SURVIVORS, type StatKey, type Survivor } from '../data/catalog'
import { SLOT_THEME, SPRITE_MASK } from '../data/slotTheme'
import type { Team } from '../hooks/useLobbyRoom'

interface SurvivorSelectorProps {
  team: Team
  survivor: Survivor
  onSelect: (id: string) => void
  onCycle: (dir: 1 | -1) => void
}

function StatBar({ value, color }: { value: number; color: string }) {
  return (
    <span className="flex flex-1 gap-0.5" aria-label={`${value} de ${STAT_MAX}`}>
      {Array.from({ length: STAT_MAX }, (_, i) => (
        <span key={i} className={`h-3.5 phone:h-3 flex-1 ${i < value ? color : 'bg-white/10'}`} />
      ))}
    </span>
  )
}

export function SurvivorSelector({ team, survivor, onSelect, onCycle }: SurvivorSelectorProps) {
  const t = SLOT_THEME[team]

  return (
    <section
      className={`relative border-2 ${t.border} ${t.glow} bg-gradient-to-br from-[#0d1522]/95 to-[#0d1522]/75 p-4 phone:p-2`}
      aria-label="Tu superviviente"
      data-testid="survivor-selector"
    >
      <button
        type="button"
        aria-label="Superviviente anterior"
        onClick={() => onCycle(-1)}
        className={`absolute top-1/3 -left-5 phone:-left-3 z-10 grid size-10 phone:size-7 place-items-center border-2 ${t.button}`}
      >
        <ChevronLeft size="1.625rem" strokeWidth={3} />
      </button>
      <button
        type="button"
        aria-label="Superviviente siguiente"
        onClick={() => onCycle(1)}
        className={`absolute top-1/3 -right-5 phone:-right-3 z-10 grid size-10 phone:size-7 place-items-center border-2 ${t.button}`}
      >
        <ChevronRight size="1.625rem" strokeWidth={3} />
      </button>

      <div className="grid items-center gap-4 phone:gap-2 sm:grid-cols-[0.9fr_1.1fr] phone:grid-cols-[0.8fr_1.2fr]">
        <div className="relative flex justify-center">
          <div className={`absolute bottom-1 h-10 w-4/5 rounded-[50%] bg-radial ${t.pedestal} to-transparent blur-sm`} />
          <img
            key={survivor.id}
            src={survivor.sprite}
            alt={survivor.name}
            className="pixelated relative h-48 phone:h-[9.5rem] object-contain xl:h-52"
            style={{ maskImage: SPRITE_MASK, WebkitMaskImage: SPRITE_MASK }}
          />
        </div>

        <div>
          <h2 className="ug-title-shadow text-4xl phone:text-3xl leading-none uppercase" data-testid="survivor-name">{survivor.name}</h2>
          <p className="font-terminal text-xl phone:text-base phone:leading-none text-ug-muted">{survivor.tagline}</p>
          <dl className="mt-3 phone:mt-1.5 space-y-1.5 phone:space-y-1.5">
            {survivor.stats &&
              (Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
                <div key={k} className="flex items-center gap-3">
                  <dt className="w-24 phone:w-20 font-terminal text-lg phone:text-base leading-none">{STAT_LABELS[k]}</dt>
                  <dd className="flex flex-1">
                    <StatBar value={survivor.stats![k]} color={t.bar} />
                  </dd>
                </div>
              ))}
          </dl>
          <p className="mt-3 font-terminal text-lg leading-tight text-ug-muted phone:hidden">{survivor.description}</p>
        </div>
      </div>

      <ul className="mt-4 phone:mt-2 flex flex-wrap justify-center gap-2 phone:gap-1" aria-label="Supervivientes">
        {SURVIVORS.map((s) => {
          const selected = s.id === survivor.id
          return (
            <li key={s.id}>
              <button
                type="button"
                disabled={s.locked}
                onClick={() => onSelect(s.id)}
                aria-pressed={selected}
                title={s.locked ? `${s.name} (bloqueado)` : s.name}
                className={`relative block size-14 border-2 bg-black/40 sm:size-16 phone:size-11 ${
                  selected ? `${t.border} ${t.glow}` : 'border-ug-border enabled:hover:border-ug-border-hi'
                } disabled:cursor-not-allowed`}
              >
                <img src={s.portrait} alt={s.name} className={`pixelated size-full object-cover ${s.locked ? 'opacity-60 grayscale-[40%]' : ''}`} />
                {s.locked && (
                  <span className="absolute right-0.5 bottom-0.5 grid size-5 place-items-center bg-black/80">
                    <Lock size="0.75rem" />
                  </span>
                )}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
