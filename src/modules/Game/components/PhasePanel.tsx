import { Skull } from 'lucide-react'
import { CORE_HP, type Team } from '../../../shared/lib/contracts'
import { formatTime, TOTAL_WAVES, type HudSnapshot } from '../hud'

function CoreBar({ team, hp, mine }: { team: Team; hp: number; mine: boolean }) {
  const color = team === 1 ? 'bg-[#3d8bff]' : 'bg-ug-red-hi'
  return (
    <div className="flex items-center gap-2" data-testid={mine ? 'hud-core-mine' : 'hud-core-rival'} data-team={team} data-hp={hp}>
      <span className="w-16 text-left font-terminal text-xs leading-none text-ug-muted short:w-12 short:text-[0.625rem] lg:w-20 lg:text-sm">{mine ? 'Tu núcleo' : 'Núcleo rival'}</span>
      <div className="h-2.5 flex-1 short:h-2 border border-black/60 bg-black/60">
        <div className={`h-full ${color}`} style={{ width: `${(hp / CORE_HP) * 100}%` }} />
      </div>
      <span className="w-9 text-right text-base leading-none short:w-7 short:text-xs">{hp}</span>
    </div>
  )
}

export function PhasePanel({ hud }: { hud: HudSnapshot }) {
  const prep = hud.wave === 0

  return (
    <div className="ug-panel w-[min(15rem,60vw)] px-3 py-1.5 text-center sm:w-[clamp(15rem,32vw,22rem)] lg:px-4 lg:py-2 short:w-44 short:px-2 short:py-0.5" data-testid="hud-phase" data-phase={hud.phaseId}>
      {prep ? (
        <>
          <p className="ug-title-shadow text-lg leading-none short:text-sm lg:text-2xl">
            FASE DE <span className="text-yellow-400">PREPARACIÓN</span>
          </p>
          <p className="ug-title-shadow text-3xl leading-none short:text-xl lg:text-4xl" data-testid="hud-timer">{formatTime(hud.phaseLeft)}</p>
          <p className="font-terminal text-sm leading-none text-ug-muted short:hidden lg:text-base">Construye tu defensa</p>
        </>
      ) : (
        <>
          <div className="flex items-center justify-center gap-3">
            <Skull size={22} className="text-ug-red-hi short:hidden" />
            <p className="ug-title-shadow text-lg leading-none short:text-sm lg:text-2xl">
              {hud.phaseId === 'horde' ? 'HORDA FINAL' : `OLEADA ${hud.wave} / ${TOTAL_WAVES}`}
            </p>
            <span className="flex items-center gap-1 text-xl text-ug-red-hi" title="Zombis vivos" data-testid="hud-zombies">
              <Skull size={16} /> {hud.zombies}
            </span>
          </div>
          <div className="mx-auto mt-1 h-2 w-full bg-black/60 short:hidden">
            <div className="h-full bg-ug-red-hi" style={{ width: `${hud.phaseProgress * 100}%` }} />
          </div>
          <p className="ug-title-shadow mt-1 text-2xl leading-none short:mt-0 short:text-lg lg:text-3xl" data-testid="hud-timer">{formatTime(hud.matchLeft)}</p>
        </>
      )}
      <div className="mt-1.5 space-y-1 short:mt-1 short:space-y-0.5 lg:mt-2">
        <CoreBar team={hud.myTeam} hp={hud.cores[hud.myTeam]} mine />
        <CoreBar team={hud.rivalTeam} hp={hud.cores[hud.rivalTeam]} mine={false} />
      </div>
    </div>
  )
}
