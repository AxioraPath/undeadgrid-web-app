import { describe, expect, it } from 'vitest'
import type { GameMap, GamePlayer, GameState } from '../../shared/lib/contracts'
import { SnapshotBuffer, clamp, lerp } from './interpolation'

/** Pruebas unitarias de la interpolación de posiciones del cliente (matriz del PDF: "interpolación de posiciones"). */

const MAP = { seed: 1, w: 44, h: 32, tiles: [], ground: [], objects: [], bases: {}, cores: {}, crates: {}, spawns: [] } as unknown as GameMap

const player = (x: number, y: number, extra: Partial<GamePlayer> = {}): GamePlayer =>
  ({
    id: 'a',
    slot: 1,
    team: 1,
    name: 'A',
    survivor: 'explorador',
    x,
    y,
    dirX: 1,
    dirY: 0,
    hp: 100,
    alive: true,
    respawnIn: null,
    weapon: 'pistol',
    build: 'wall',
    shotAt: -1,
    hurtAt: -1,
    ...extra,
  }) as GamePlayer

const state = (tick: number, time: number, players: GamePlayer[], extra: Partial<GameState> = {}): GameState =>
  ({
    tick,
    time,
    phase: { id: 'prep', label: 'Preparación', start: 0, end: 25, wave: 0 },
    maxWave: 0,
    players,
    zombies: [],
    bullets: [],
    structures: [],
    cores: { 1: 500, 2: 500 },
    crates: {},
    events: [],
    result: null,
    ...extra,
  }) as unknown as GameState

describe('lerp y clamp', () => {
  it('lerp con t = 0.5 da el punto medio y t se limita entre 0 y 1', () => {
    expect(lerp(2, 6, 0.5)).toBe(4)
    expect(lerp(2, 6, -1)).toBe(2)
    expect(lerp(2, 6, 3)).toBe(6)
    expect(clamp(5, 0, 3)).toBe(3)
  })
})

describe('SnapshotBuffer: interpolación de posiciones de jugadores', () => {
  // Estados a t = 1.0 s y 1.1 s del servidor, recibidos a 0 ms y 100 ms locales.
  // Se dibuja 100 ms en el pasado: a los 150 ms locales toca t = 1.05 s, justo a la mitad.
  const buffered = () => {
    const buf = new SnapshotBuffer()
    buf.push(state(30, 1.0, [player(0, 0)]), 0)
    buf.push(state(33, 1.1, [player(1, 2)]), 100)
    return buf
  }

  it('dibuja al jugador a mitad de camino entre los dos últimos estados', () => {
    const view = buffered().sample(MAP, 150)!
    expect(view.players[0].x).toBeCloseTo(0.5)
    expect(view.players[0].y).toBeCloseTo(1)
    expect(view.players[0].moving).toBe(true)
  })

  it('al avanzar el tiempo local, la posición avanza y nunca pasa del último estado', () => {
    const buf = buffered()
    const xs = [110, 150, 190, 400].map((now) => buf.sample(MAP, now)!.players[0].x)
    expect(xs[0]).toBeLessThan(xs[1])
    expect(xs[1]).toBeLessThan(xs[2])
    expect(xs[3]).toBe(1)
  })

  it('ignora estados viejos o repetidos que llegan tarde (no retrocede)', () => {
    const buf = buffered()
    buf.push(state(31, 1.033, [player(-5, -5)]), 120)
    buf.push(state(33, 1.1, [player(-5, -5)]), 130)
    expect(buf.latest?.tick).toBe(33)
    expect(buf.sample(MAP, 400)!.players[0].x).toBe(1)
  })

  it('un jugador que aparece en el último estado se dibuja en su posición, sin moverse', () => {
    const buf = new SnapshotBuffer()
    buf.push(state(1, 0.0, []), 0)
    buf.push(state(4, 0.1, [player(3, 4)]), 100)
    const p = buf.sample(MAP, 150)!.players[0]
    expect([p.x, p.y]).toEqual([3, 4])
    expect(p.moving).toBe(false)
  })

  it('también interpola zombis y balas, y conserva el tipo de proyectil', () => {
    const buf = new SnapshotBuffer()
    buf.push(state(1, 0.0, [], { zombies: [[7, 10, 10, 40, 40, 0, -1, -1]], bullets: [[9, 0, 0, 16, 0, 2]] }), 0)
    buf.push(state(4, 0.1, [], { zombies: [[7, 12, 10, 40, 40, 0, -1, -1]], bullets: [[9, 1.6, 0, 16, 0, 2]] }), 100)
    const v = buf.sample(MAP, 150)!
    expect(v.zombies[0].x).toBeCloseTo(11)
    expect(v.bullets[0].x).toBeCloseTo(0.8)
    expect(v.bullets[0].kind).toBe('rocket')
  })

  it('sin estados no hay nada que dibujar', () => {
    expect(new SnapshotBuffer().sample(MAP, 0)).toBeNull()
  })
})
