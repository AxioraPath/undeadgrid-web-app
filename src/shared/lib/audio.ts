import { getSettings, subscribeSettings } from './settings'

/**
 * Sonido del juego. Efectos retro generados con Web Audio (disparos, cuchillo, construir, caja, oleadas, interfaz)
 * y muestras CC0 de OpenGameArt para zombis y explosiones (ver public/assets/audio/CREDITOS.md).
 * Los navegadores no dejan sonar nada hasta el primer toque/tecla: `unlockAudio` se llama entonces.
 */

const BASE = '/assets/audio/'
const SAMPLES = ['zombi-1', 'zombi-2', 'zombi-3', 'zombi-rapido', 'explosion-1', 'explosion-2', 'explosion-3', 'explosion-4'] as const
type SampleName = (typeof SAMPLES)[number]

export type MusicTrack = 'menu' | 'partida'
const MUSIC: Record<MusicTrack, string> = { menu: 'musica-menu.wav', partida: 'musica-partida.ogg' }

let ctx: AudioContext | null = null
let sfxGain: GainNode | null = null
let noise: AudioBuffer | null = null
const buffers = new Map<SampleName, AudioBuffer>()
let samplesLoading = false
let unlocked = false

let music: HTMLAudioElement | null = null
let wantedTrack: MusicTrack | null = null
let currentTrack: MusicTrack | null = null

const volumes = () => {
  const s = getSettings()
  return { sfx: s.sfxVolume, music: s.musicVolume }
}

function context(): AudioContext | null {
  if (ctx) return ctx
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  sfxGain = ctx.createGain()
  sfxGain.gain.value = volumes().sfx
  sfxGain.connect(ctx.destination)
  // Ruido blanco reutilizable (explosiones sintéticas, cuchillo, golpes).
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  return ctx
}

async function loadSamples() {
  const c = context()
  if (!c || samplesLoading) return
  samplesLoading = true
  await Promise.all(
    SAMPLES.map(async (name) => {
      try {
        const res = await fetch(BASE + name + '.wav')
        buffers.set(name, await c.decodeAudioData(await res.arrayBuffer()))
      } catch {
        // Sin ese sonido: el juego sigue en silencio para ese efecto.
      }
    }),
  )
}

/** Primer toque o tecla: activa el audio (política de los navegadores) y arranca la música pendiente. */
export function unlockAudio() {
  if (unlocked) return
  const c = context()
  if (!c) return
  unlocked = true
  void c.resume()
  void loadSamples()
  if (wantedTrack) playMusic(wantedTrack)
}

subscribeSettings(() => {
  const v = volumes()
  if (sfxGain && ctx) sfxGain.gain.setTargetAtTime(v.sfx, ctx.currentTime, 0.05)
  if (music) music.volume = v.music
})

// ---------------------------------------------------------------------------
// Música
// ---------------------------------------------------------------------------

/** Pista de fondo (null = silencio). Cambia con un fundido corto; espera al primer toque si hace falta. */
export function playMusic(track: MusicTrack | null) {
  wantedTrack = track
  if (!unlocked || track === currentTrack) return
  const old = music
  if (old) fadeOut(old)
  currentTrack = track
  music = null
  if (!track) return
  const el = new Audio(BASE + MUSIC[track])
  el.loop = true
  el.volume = volumes().music
  music = el
  void el.play().catch(() => {
    // Formato no soportado (p. ej. OGG en algunos iPhone) o bloqueado: sin música.
    currentTrack = null
  })
}

function fadeOut(el: HTMLAudioElement) {
  const step = () => {
    el.volume = Math.max(0, el.volume - 0.08)
    if (el.volume <= 0.01) el.pause()
    else window.setTimeout(step, 40)
  }
  step()
}

// ---------------------------------------------------------------------------
// Efectos
// ---------------------------------------------------------------------------

const ready = () => (unlocked && ctx && sfxGain && ctx.state === 'running' ? { c: ctx, out: sfxGain } : null)

function playSample(name: SampleName, volume = 1, rate = 1) {
  const r = ready()
  const buf = buffers.get(name)
  if (!r || !buf || volume <= 0.01) return
  const src = r.c.createBufferSource()
  src.buffer = buf
  src.playbackRate.value = rate
  const g = r.c.createGain()
  g.gain.value = volume
  src.connect(g).connect(r.out)
  src.start()
}

/** Tono con envolvente rápida (sonidos 8-bit). */
function tone(type: OscillatorType, from: number, to: number, dur: number, volume: number, delay = 0) {
  const r = ready()
  if (!r || volume <= 0.01) return
  const t = r.c.currentTime + delay
  const o = r.c.createOscillator()
  o.type = type
  o.frequency.setValueAtTime(from, t)
  o.frequency.exponentialRampToValueAtTime(Math.max(20, to), t + dur)
  const g = r.c.createGain()
  g.gain.setValueAtTime(volume, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  o.connect(g).connect(r.out)
  o.start(t)
  o.stop(t + dur + 0.02)
}

/** Ráfaga de ruido filtrado (disparos, golpes, cuchillo). */
function burst(dur: number, freq: number, volume: number, q = 1, delay = 0) {
  const r = ready()
  if (!r || !noise || volume <= 0.01) return
  const t = r.c.currentTime + delay
  const src = r.c.createBufferSource()
  src.buffer = noise
  const f = r.c.createBiquadFilter()
  f.type = 'bandpass'
  f.frequency.value = freq
  f.Q.value = q
  const g = r.c.createGain()
  g.gain.setValueAtTime(volume, t)
  g.gain.exponentialRampToValueAtTime(0.001, t + dur)
  src.connect(f).connect(g).connect(r.out)
  src.start(t, Math.random() * 0.5)
  src.stop(t + dur + 0.02)
}

export type ShotKind = 'pistol' | 'shotgun' | 'smg' | 'sniper' | 'rocket' | 'turret'

export const sfx = {
  shot(kind: ShotKind, volume = 1) {
    if (kind === 'pistol') {
      burst(0.09, 1800, 0.5 * volume, 0.8)
      tone('square', 520, 140, 0.08, 0.12 * volume)
    } else if (kind === 'shotgun') {
      burst(0.22, 900, 0.75 * volume, 0.6)
      tone('sawtooth', 200, 60, 0.18, 0.18 * volume)
    } else if (kind === 'smg') {
      burst(0.05, 2200, 0.35 * volume, 1)
      tone('square', 700, 300, 0.04, 0.08 * volume)
    } else if (kind === 'sniper') {
      burst(0.3, 1200, 0.7 * volume, 0.5)
      tone('sawtooth', 1400, 90, 0.35, 0.2 * volume)
    } else if (kind === 'rocket') {
      burst(0.45, 500, 0.5 * volume, 0.4)
      tone('triangle', 180, 520, 0.4, 0.15 * volume)
    } else {
      burst(0.06, 2600, 0.25 * volume, 1.2)
      tone('square', 900, 400, 0.05, 0.06 * volume)
    }
  },
  knife(volume = 1) {
    burst(0.12, 4200, 0.4 * volume, 2)
    tone('triangle', 900, 1800, 0.08, 0.08 * volume)
  },
  hit(volume = 1) {
    burst(0.06, 700, 0.25 * volume, 1.5)
  },
  explosion(big: boolean, volume = 1) {
    const n = (1 + Math.floor(Math.random() * 4)) as 1 | 2 | 3 | 4
    playSample(`explosion-${n}`, volume, big ? 0.75 : 1)
    if (big) burst(0.8, 140, 0.6 * volume, 0.3)
  },
  zombie(fast: boolean, volume = 1) {
    const name: SampleName = fast ? 'zombi-rapido' : (['zombi-1', 'zombi-2', 'zombi-3'] as const)[Math.floor(Math.random() * 3)]
    // Tono al azar para que no suenen todos iguales (lo recomienda el autor de las muestras).
    playSample(name, volume, 0.8 + Math.random() * 0.4)
  },
  zombieDied(volume = 1) {
    playSample('zombi-3', 0.6 * volume, 0.6 + Math.random() * 0.15)
  },
  build() {
    tone('square', 220, 330, 0.07, 0.12)
    tone('square', 330, 440, 0.07, 0.12, 0.07)
  },
  reject() {
    tone('square', 200, 110, 0.15, 0.12)
  },
  armoryReady() {
    ;[523, 659, 784].forEach((f, i) => tone('square', f, f, 0.12, 0.1, i * 0.11))
  },
  armoryOpened(mine: boolean) {
    const notes = mine ? [523, 659, 784, 1047] : [392, 330, 262]
    notes.forEach((f, i) => tone('square', f, f, 0.12, 0.12, i * 0.1))
  },
  wave() {
    tone('sawtooth', 110, 110, 0.5, 0.18)
    tone('sawtooth', 165, 165, 0.5, 0.12, 0.05)
  },
  coreHit(mine: boolean) {
    tone('sine', mine ? 90 : 140, 50, 0.25, mine ? 0.35 : 0.15)
  },
  playerDied(mine: boolean) {
    tone('triangle', 440, 60, mine ? 0.9 : 0.5, mine ? 0.25 : 0.12)
  },
  click() {
    tone('square', 880, 660, 0.04, 0.06)
  },
}

/** Volumen según la distancia (casillas) al jugador: a 16 casillas o más ya no se oye. */
export const byDistance = (d: number) => Math.max(0, 1 - d / 16)
