import { MATCH_DURATION, type GamePlayer, type GameState, type Slot, type Stock } from '../../shared/lib/contracts'

export interface HudSnapshot {
  phaseId: string
  phaseLabel: string
  wave: number
  phaseLeft: number
  phaseProgress: number
  matchLeft: number
  zombies: number
  cores: Record<Slot, number>
  crate: Stock
  armory: GameState['armory'] | null
  me: GamePlayer
  result: GameState['result']
  stats: Record<Slot, { kills: number; zombieKills: number; deaths: number; core: number }>
}

/** Lo que React necesita del último estado del servidor; se toma ~10 veces por segundo. */
export function snapshotHud(s: GameState, meSlot: Slot): HudSnapshot | null {
  const me = s.players.find((p) => p.slot === meSlot)
  if (!me) return null
  const ph = s.phase
  const stats = {} as HudSnapshot['stats']
  for (const slot of [1, 2] as Slot[]) {
    const p = s.players.find((o) => o.slot === slot)
    stats[slot] = { kills: p?.kills ?? 0, zombieKills: p?.zombieKills ?? 0, deaths: p?.deaths ?? 0, core: s.cores[slot] }
  }
  return {
    phaseId: ph.id,
    phaseLabel: ph.label,
    wave: ph.wave,
    phaseLeft: Math.max(0, ph.end - s.time),
    phaseProgress: Math.min(1, (s.time - ph.start) / (ph.end - ph.start)),
    matchLeft: Math.max(0, MATCH_DURATION - s.time),
    zombies: s.zombies.length,
    cores: { ...s.cores },
    crate: { ...s.crates[meSlot] },
    armory: s.armory ?? null,
    me,
    result: s.result,
    stats,
  }
}

export const TOTAL_WAVES = 3

export const formatTime = (s: number) => {
  const t = Math.ceil(s)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
