import { ChartNoAxesColumn, ChevronLeft, ChevronRight, CircleCheck, Clock } from 'lucide-react'
import { MAPS, MATCH_DURATION_MIN, type GameMap } from '../data/catalog'

const CHECKS = ['Núcleos balanceados', 'Rutas válidas', 'Spawns verificados']

interface MatchSettingsProps {
  map: GameMap
  mapIndex: number
  difficulty: string
  canEdit: boolean
  onCycleMap: (dir: 1 | -1) => void
  onCycleDifficulty: () => void
}

function Label({ children }: { children: string }) {
  return <h3 className="ug-title-shadow mb-2 text-xl leading-none tracking-wide">{children}</h3>
}

export function MatchSettings({ map, mapIndex, difficulty, canEdit, onCycleMap, onCycleDifficulty }: MatchSettingsProps) {
  return (
    <section className="ug-panel grid gap-4 p-3 md:grid-cols-[1.15fr_2fr]" aria-label="Configuración de la partida">
      <div className="md:border-r-2 md:border-ug-border md:pr-3">
        <Label>MAPA</Label>
        <div className="flex items-center gap-1">
          <button type="button" aria-label="Mapa anterior" disabled={!canEdit} onClick={() => onCycleMap(-1)} className="p-1 disabled:opacity-30">
            <ChevronLeft size={26} strokeWidth={3} />
          </button>
          <div className="flex-1 text-center">
            <img src={map.preview} alt="" className="pixelated mx-auto aspect-[4/3] w-full max-w-36 object-cover" />
            <p className="mt-1 font-terminal text-lg leading-none">{map.name}</p>
            <div className="mt-1 flex justify-center gap-1">
              {MAPS.map((m, i) => (
                <span key={m.id} className={`size-1.5 rounded-full ${i === mapIndex ? 'bg-ug-accent' : 'bg-ug-border-hi'}`} />
              ))}
            </div>
          </div>
          <button type="button" aria-label="Mapa siguiente" disabled={!canEdit} onClick={() => onCycleMap(1)} className="p-1 disabled:opacity-30">
            <ChevronRight size={26} strokeWidth={3} />
          </button>
        </div>
      </div>

      <div className="flex flex-col">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label>DURACIÓN</Label>
            <div className="flex items-center gap-3 border-2 border-ug-border bg-black/30 px-3 py-3 font-terminal text-xl">
              <Clock size={24} /> <span className="flex-1">{MATCH_DURATION_MIN} minutos</span>
            </div>
          </div>
          <div>
            <Label>DIFICULTAD</Label>
            <button
              type="button"
              disabled={!canEdit}
              onClick={onCycleDifficulty}
              data-testid="difficulty"
              className="flex w-full items-center gap-3 border-2 border-ug-border bg-black/30 px-3 py-3 text-left font-terminal text-xl enabled:hover:border-ug-border-hi"
            >
              <ChartNoAxesColumn size={24} strokeWidth={3} /> <span className="flex-1">{difficulty}</span>
              {canEdit && <ChevronRight size={20} />}
            </button>
          </div>
        </div>
        <ul className="mt-auto flex flex-wrap pt-3 gap-x-4 gap-y-1 font-terminal text-base text-ug-muted">
          {CHECKS.map((c) => (
            <li key={c} className="flex items-center gap-1.5">
              <CircleCheck size={16} className="text-ug-green" fill="currentColor" stroke="#0b0f17" /> {c}
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
