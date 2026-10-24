import { ChartNoAxesColumn, ChevronRight, CircleCheck, Clock, Lock } from 'lucide-react'
import { MAPS, MATCH_DURATION_MIN, type GameMap } from '../data/catalog'

const CHECKS = ['Núcleos balanceados', 'Rutas válidas', 'Spawns verificados']

interface MatchSettingsProps {
  map: GameMap
  difficulty: string
  canEdit: boolean
  /** Solo los mapas disponibles se pueden elegir. */
  onSelectMap: (mapId: string) => void
  onCycleDifficulty: () => void
}

function Label({ children }: { children: string }) {
  return <h3 className="ug-title-shadow mb-2 phone:mb-1 text-xl phone:text-lg leading-none tracking-wide">{children}</h3>
}

export function MatchSettings({ map, difficulty, canEdit, onSelectMap, onCycleDifficulty }: MatchSettingsProps) {
  return (
    <section className="ug-panel grid gap-4 p-3 phone:gap-2 phone:p-2 phone:grid-cols-[1.15fr_2fr] md:grid-cols-[1.15fr_2fr]" aria-label="Configuración de la partida">
      <div className="md:border-r-2 md:border-ug-border md:pr-3 phone:border-r-2 phone:border-ug-border phone:pr-2">
        <Label>MAPA</Label>
        <ul className="grid grid-cols-3 gap-2" data-testid="map-options">
          {MAPS.map((m) => {
            const active = m.id === map.id
            return (
              <li key={m.id}>
                <button
                  type="button"
                  disabled={!m.available || !canEdit || active}
                  onClick={() => onSelectMap(m.id)}
                  aria-pressed={active}
                  title={m.available ? m.name : `${m.name} (próximamente)`}
                  data-testid={`map-option-${m.id}`}
                  data-available={m.available}
                  className={`relative block w-full border-2 text-center ${
                    active ? 'border-ug-accent shadow-[0_0_10px_rgb(143_211_255/0.4)]' : 'border-ug-border'
                  } ${m.available ? 'enabled:hover:border-ug-border-hi' : 'cursor-not-allowed'}`}
                >
                  <img src={m.preview} alt="" className={`pixelated aspect-[4/3] w-full object-cover ${m.available ? '' : 'opacity-40 grayscale'}`} />
                  {!m.available && (
                    <span className="absolute inset-x-0 top-1/3 flex flex-col items-center text-ug-muted">
                      <Lock size="1.125rem" />
                      <span className="font-terminal text-xs leading-none">Próximamente</span>
                    </span>
                  )}
                  <span className={`block truncate px-0.5 py-0.5 font-terminal text-xs leading-tight ${m.available ? 'text-ug-text' : 'text-ug-muted'}`}>
                    {m.name}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      <div className="flex flex-col">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>DURACIÓN</Label>
            <div className="flex items-center gap-3 border-2 border-ug-border bg-black/30 px-3 py-3 phone:px-2 phone:py-1.5 font-terminal text-xl phone:text-lg">
              <Clock size="1.5rem" /> <span className="flex-1">{MATCH_DURATION_MIN} minutos</span>
            </div>
          </div>
          <div>
            <Label>DIFICULTAD</Label>
            <button
              type="button"
              disabled={!canEdit}
              onClick={onCycleDifficulty}
              data-testid="difficulty"
              className="flex w-full items-center gap-3 border-2 border-ug-border bg-black/30 px-3 py-3 phone:px-2 phone:py-1.5 text-left font-terminal text-xl phone:text-lg enabled:hover:border-ug-border-hi"
            >
              <ChartNoAxesColumn size="1.5rem" strokeWidth={3} /> <span className="flex-1">{difficulty}</span>
              {canEdit && <ChevronRight size="1.25rem" />}
            </button>
          </div>
        </div>
        <ul className="mt-auto flex flex-wrap pt-3 phone:hidden gap-x-4 gap-y-1 font-terminal text-base text-ug-muted">
          {CHECKS.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <CircleCheck size="1rem" className="text-ug-green" fill="currentColor" stroke="#0b0f17" /> {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
