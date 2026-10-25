import { byDistance, sfx, type ShotKind } from '../../shared/lib/audio'
import { teamOf, type GameState, type Slot } from '../../shared/lib/contracts'

/** Último momento (ms) en que sonó cada efecto que llega en ráfagas, para no saturar. */
const lastAt: Record<string, number> = {}
const throttled = (key: string, ms: number) => {
  const now = performance.now()
  if (now - (lastAt[key] ?? 0) < ms) return true
  lastAt[key] = now
  return false
}

/** Sonidos de los eventos de un estado del servidor; el volumen baja con la distancia al jugador. */
export function playGameSounds(state: GameState, mySlot: Slot) {
  const me = state.players.find((p) => p.slot === mySlot)
  const near = (x: number, y: number) => (me ? byDistance(Math.hypot(x - me.x, y - me.y)) : 1)
  const myTeam = teamOf(mySlot)

  for (const e of state.events) {
    switch (e.type) {
      case 'shot': {
        const shooter = state.players.find((p) => p.slot === e.slot)
        // Las torretas también disparan con el slot del dueño, pero desde su casilla.
        const turret = !shooter || Math.hypot(shooter.x - e.x, shooter.y - e.y) > 0.6
        const kind: ShotKind = turret ? 'turret' : shooter.weapon
        if (kind === 'smg' && throttled(`smg${e.slot}`, 70)) break
        sfx.shot(kind, near(e.x, e.y) * (e.slot === mySlot ? 1 : 0.8))
        break
      }
      case 'explosion':
        sfx.explosion(!!e.big, near(e.x, e.y))
        break
      case 'knife':
        sfx.knife(near(e.x, e.y))
        break
      case 'hit':
        if (!throttled('hit', 60)) sfx.hit(near(e.x, e.y) * 0.7)
        break
      case 'zombieDied':
        if (!throttled('zdie', 120)) sfx.zombieDied(near(e.x, e.y))
        break
      case 'playerDied':
        sfx.playerDied(e.slot === mySlot)
        break
      case 'built':
        if (near(e.x, e.y) > 0.6) sfx.build()
        break
      case 'rejected':
        if (e.slot === mySlot && !throttled('reject', 250)) sfx.reject()
        break
      case 'phase':
        sfx.wave()
        break
      case 'coreHit': {
        const team = e.team ?? e.slot
        if (!throttled(`core${team}`, 300)) sfx.coreHit(team === myTeam)
        break
      }
      case 'armoryReady':
        sfx.armoryReady()
        break
      case 'pickup':
        if (e.slot === mySlot) sfx.pickup()
        break
      case 'eliminated':
        sfx.playerDied(e.slot === mySlot)
        break
      case 'armoryOpened':
        sfx.armoryOpened(teamOf(e.slot) === myTeam)
        break
    }
  }
}

let nextGroanAt = 0

/** Quejidos de zombis cercanos de vez en cuando (el más cercano a menos de 9 casillas). */
export function zombieAmbience(state: GameState, mySlot: Slot) {
  const now = performance.now()
  if (now < nextGroanAt) return
  const me = state.players.find((p) => p.slot === mySlot)
  if (!me || !me.alive) return
  let best: { d: number; fast: boolean } | null = null
  for (const [, x, y, hp, , kind] of state.zombies) {
    if (hp <= 0) continue
    const d = Math.hypot(x - me.x, y - me.y)
    if (d < 9 && (!best || d < best.d)) best = { d, fast: kind === 1 }
  }
  if (!best) return
  nextGroanAt = now + 1800 + Math.random() * 1700
  sfx.zombie(best.fast, byDistance(best.d) * 0.8)
}
