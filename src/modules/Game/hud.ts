import { MATCH_DURATION, teamOf, type GamePlayer, type GameState, type Slot, type Stock, type Team } from '../../shared/lib/contracts'

export interface HudSnapshot {
  phaseId: string
  phaseLabel: string
  wave: number
  phaseLeft: number
  phaseProgress: number
  matchLeft: number
  zombies: number
  /** Shared core HP keyed by team. */
  cores: Record<Team, number>
  myTeam: Team
  rivalTeam: Team
  /** Teammate (2v2 only). */
  mate: GamePlayer | null
  crate: Stock
  armory: GameState['armory'] | null
  me: GamePlayer
  result: GameState['result']
  /** Todos contra todos: vidas de cada jugador en lugar de núcleos. */
  ffa: boolean
  lives: { slot: Slot; name: string; lives: number; alive: boolean }[]
  /** Per-player counters keyed by slot (only the slots that exist in the match). */
  stats: Partial<Record<Slot, { kills: number; zombieKills: number; deaths: number }>>
}

/** Lo que React necesita del último estado del servidor; se toma ~10 veces por segundo. */
export function snapshotHud(s: GameState, meSlot: Slot): HudSnapshot | null {
  const me = s.players.find((p) => p.slot === meSlot)
  if (!me) return null
  const ph = s.phase
  const myTeam: Team = me.team ?? teamOf(meSlot)
  const stats: HudSnapshot['stats'] = {}
  for (const p of s.players) stats[p.slot] = { kills: p.kills, zombieKills: p.zombieKills, deaths: p.deaths }
  // Todos contra todos (jugadores con vidas): no hay compañero.
  const ffa = s.players.some((p) => p.lives != null)
  const mate = ffa ? null : (s.players.find((p) => p.slot !== meSlot && (p.team ?? teamOf(p.slot)) === myTeam) ?? null)
  return {
    phaseId: ph.id,
    phaseLabel: ph.label,
    wave: ph.wave,
    phaseLeft: Math.max(0, ph.end - s.time),
    phaseProgress: Math.min(1, (s.time - ph.start) / (ph.end - ph.start)),
    matchLeft: Math.max(0, MATCH_DURATION - s.time),
    zombies: s.zombies.length,
    cores: { ...s.cores },
    myTeam,
    rivalTeam: myTeam === 1 ? 2 : 1,
    mate,
    // The crate stock is shared by the team.
    crate: { ...s.crates[myTeam] },
    armory: s.armory ?? null,
    me,
    result: s.result,
    ffa,
    lives: s.players.map((p) => ({ slot: p.slot, name: p.name, lives: p.lives ?? 0, alive: p.alive })),
    stats,
  }
}

export const TOTAL_WAVES = 3

export const formatTime = (s: number) => {
  const t = Math.ceil(s)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
