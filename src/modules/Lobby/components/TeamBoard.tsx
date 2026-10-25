import { ArrowRightLeft, Users } from 'lucide-react'
import { TEAM_SIZE, slotFor } from '../../../shared/lib/contracts'
import { SLOT_THEME } from '../data/slotTheme'
import type { LobbyPlayer, Team } from '../hooks/useLobbyRoom'
import { PlayerSlot } from './PlayerSlot'

interface TeamBoardProps {
  byTeam: Record<Team, LobbyPlayer[]>
  myId: string
  myTeam: Team
  onSetTeam: (team: Team) => void
  onToggleReady: () => void
  onRename: (name: string) => void
  onChangeSurvivor: () => void
}

const TEAMS: Team[] = [1, 2]

/** 2v2 lobby: two team columns with two seats each, plus a button to switch teams. */
export function TeamBoard({ byTeam, myId, myTeam, onSetTeam, onToggleReady, onRename, onChangeSurvivor }: TeamBoardProps) {
  return (
    <div className="mx-auto grid w-full max-w-4xl grid-cols-2 gap-3 sm:gap-6 phone:gap-2" data-testid="team-board">
      {TEAMS.map((team) => {
        const t = SLOT_THEME[team]
        const members = byTeam[team]
        const full = members.length >= TEAM_SIZE
        const mine = team === myTeam
        const readyCount = members.filter((p) => p.ready).length
        return (
          <section key={team} className="flex min-w-0 flex-col gap-2 phone:gap-1" aria-label={`Equipo ${team}`} data-testid={`team-${team}`} data-mine={mine}>
            <header className={`flex items-center justify-between gap-2 border-2 ${t.border} bg-black/50 px-2 py-1 phone:py-0.5`}>
              <div className="flex min-w-0 items-center gap-2">
                <Users size="1.25rem" className={t.base} aria-hidden />
                <h3 className={`ug-title-shadow truncate text-2xl leading-none phone:text-xl ${t.base}`}>EQUIPO {team}</h3>
                <span className="font-terminal text-base leading-none text-ug-muted" data-testid={`team-count-${team}`}>
                  {members.length}/{TEAM_SIZE}
                </span>
              </div>
              {mine ? (
                <span className="font-terminal text-base leading-none text-ug-text" data-testid={`team-mine-${team}`}>
                  Tu equipo
                </span>
              ) : (
                <button
                  type="button"
                  disabled={full}
                  onClick={() => onSetTeam(team)}
                  data-testid={`join-team-${team}`}
                  title={full ? 'Equipo completo' : `Pasar al equipo ${team}`}
                  className={`flex shrink-0 items-center gap-1.5 border-2 px-2 py-0.5 font-terminal text-lg leading-none whitespace-nowrap ${t.button} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <ArrowRightLeft size="1rem" aria-hidden /> {full ? 'Completo' : 'Cambiar'}
                </button>
              )}
            </header>
            <p className="sr-only">
              {readyCount} de {TEAM_SIZE} listos
            </p>
            <div className="grid grid-cols-1 gap-2 phone:gap-1">
              {[0, 1].map((seat) => {
                // A seat is fixed by its slot (team + seat), so a lone player never shifts column.
                const slot = slotFor(team, seat as 0 | 1)
                const player = members.find((p) => p.slot === slot)
                return (
                  <PlayerSlot
                    key={slot}
                    slot={slot}
                    team={team}
                    compact
                    waitingText="Esperando jugador…"
                    player={player}
                    isMe={player?.id === myId}
                    ally={mine}
                    onToggleReady={onToggleReady}
                    onRename={onRename}
                    onChangeSurvivor={onChangeSurvivor}
                  />
                )
              })}
            </div>
          </section>
        )
      })}
    </div>
  )
}
