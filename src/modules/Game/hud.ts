import { MATCH_DURATION, PHASES, type BuildId, type Slot, type Stock, type WeaponId } from '../../game/constants'
import { phaseOf, playerInOwnBase, playerOnOwnCrate, previewBuild, type MatchResult, type MatchState } from '../../game/engine'

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
  me: {
    slot: Slot
    name: string
    survivor: string
    hp: number
    alive: boolean
    respawnIn: number | null
    weapon: WeaponId
    build: BuildId
    wood: number
    metal: number
    medkits: number
    shells: number
    inBase: boolean
    onCrate: boolean
    kills: number
    zombieKills: number
    deaths: number
    buildLabel: string | null
    buildOk: boolean
  }
  rival: { name: string; hp: number; alive: boolean; slot: Slot } | null
  result: MatchResult | null
  stats: Record<Slot, { kills: number; zombieKills: number; deaths: number; core: number }>
  maxWave: number
}

/** Lo que React necesita del estado; se toma ~10 veces por segundo, no en cada cuadro. */
export function snapshotHud(s: MatchState, meId: string): HudSnapshot {
  const me = s.players.find((p) => p.id === meId)!
  const rival = s.players.find((p) => p.id !== meId) ?? null
  const ph = phaseOf(s)
  const inBase = me.alive && playerInOwnBase(s, me)
  const pv = inBase ? previewBuild(s, me) : null
  const stats = {} as HudSnapshot['stats']
  for (const slot of [1, 2] as Slot[]) {
    const p = s.players.find((o) => o.slot === slot)
    stats[slot] = { kills: p?.kills ?? 0, zombieKills: p?.zombieKills ?? 0, deaths: p?.deaths ?? 0, core: s.cores[slot].hp }
  }
  return {
    phaseId: ph.id,
    phaseLabel: ph.label,
    wave: ph.wave,
    phaseLeft: Math.max(0, ph.end - s.time),
    phaseProgress: Math.min(1, (s.time - ph.start) / (ph.end - ph.start)),
    matchLeft: Math.max(0, MATCH_DURATION - s.time),
    zombies: s.zombies.length,
    cores: { 1: s.cores[1].hp, 2: s.cores[2].hp },
    crate: { ...s.crates[me.slot] },
    me: {
      slot: me.slot,
      name: me.name,
      survivor: me.survivor,
      hp: me.hp,
      alive: me.alive,
      respawnIn: me.respawnAt !== null ? Math.max(0, me.respawnAt - s.time) : null,
      weapon: me.weapon,
      build: me.build,
      wood: me.wood,
      metal: me.metal,
      medkits: me.medkits,
      shells: me.shells,
      inBase,
      onCrate: playerOnOwnCrate(s, me),
      kills: me.kills,
      zombieKills: me.zombieKills,
      deaths: me.deaths,
      buildLabel: pv?.label ?? null,
      buildOk: pv?.ok ?? false,
    },
    rival: rival ? { name: rival.name, hp: rival.hp, alive: rival.alive, slot: rival.slot } : null,
    result: s.result,
    stats,
    maxWave: s.maxWave,
  }
}

export const TOTAL_WAVES = PHASES.filter((p) => p.wave > 0).length

export const formatTime = (s: number) => {
  const t = Math.ceil(s)
  return `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(t % 60).padStart(2, '0')}`
}
