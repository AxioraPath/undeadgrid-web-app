import { useCallback, useEffect, useRef, useState } from 'react'
import { FastForward, LogOut } from 'lucide-react'
import { TICK_DT, type Slot, type Stock } from '../../game/constants'
import { createMatch, playerInOwnBase, previewBuild, step, type Command, type MatchState } from '../../game/engine'
import { consumeEvents, createFx, createStaticLayer, drawFrame, drawMinimap, type Camera } from '../../game/client/render'
import { loadSprites, type Sprites } from '../../game/client/sprites'
import { useGameInput } from './hooks/useGameInput'
import { useIsTouch } from './hooks/useIsTouch'
import { snapshotHud, type HudSnapshot } from './hud'
import { PlayerPanel } from './components/PlayerPanel'
import { PhasePanel } from './components/PhasePanel'
import { Hotbar } from './components/Hotbar'
import { ControlsHelp } from './components/ControlsHelp'
import { MobileControls } from './components/MobileControls'
import { CrateMenu } from './components/CrateMenu'
import { MatchEndModal } from './components/MatchEndModal'

const FRAME_MS = 1000 / 60
const HUD_MS = 100
const MINIMAP_MS = 200
const ME = 'me'
const RIVAL = 'rival'

export interface GamePageProps {
  mySlot: Slot
  myName: string
  mySurvivor: string
  rivalName: string
  rivalSurvivor: string
  practice: boolean
  exitLabel: string
  onExit: () => void
}

interface Toast {
  id: number
  text: string
}

// MOCK: la simulación corre en el navegador con un rival pasivo. Cuando exista el servidor,
// `step` corre allá a 30 ticks y aquí solo llegan estados por socket (la interfaz no cambia).
export function GamePage(props: GamePageProps) {
  const { mySlot, myName, mySurvivor, rivalName, rivalSurvivor, practice, exitLabel, onExit } = props
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const posRef = useRef<HTMLDivElement>(null)
  const matchRef = useRef<MatchState | null>(null)
  const commandsRef = useRef<Command[]>([])
  const [round, setRound] = useState(0)
  const [hud, setHud] = useState<HudSnapshot | null>(null)
  const [fps, setFps] = useState(0)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [sprites, setSprites] = useState<Sprites | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const isTouch = useIsTouch()

  const sendCommand = useCallback((cmd: Command) => commandsRef.current.push(cmd), [])
  const { read: readInput, setTouchDirection, setTouchAction } = useGameInput(sendCommand)

  const pushToast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts.filter((t) => t.text !== text), { id, text }].slice(-3))
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 1800)
  }, [])

  useEffect(() => {
    loadSprites()
      .then(setSprites)
      .catch((e: Error) => setLoadError(e.message))
  }, [])

  useEffect(() => {
    if (!sprites) return
    const seed = Math.floor(Math.random() * 1_000_000)
    const rivalSlot: Slot = mySlot === 1 ? 2 : 1
    const s = createMatch({
      seed,
      players: [
        { id: ME, slot: mySlot, name: myName, survivor: mySurvivor },
        { id: RIVAL, slot: rivalSlot, name: rivalName, survivor: rivalSurvivor },
      ],
    })
    matchRef.current = s
    commandsRef.current = []
    const staticLayer = createStaticLayer(s.map, sprites)
    const fx = createFx()
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!

    let raf = 0
    let last = performance.now()
    let lastFrame = 0
    let acc = 0
    let frames = 0
    let fpsAt = last
    let hudAt = 0
    let miniAt = 0
    let cam: Camera | null = null
    let size = { w: 0, h: 0, dpr: 1 }

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      canvas.width = Math.round(w * dpr)
      canvas.height = Math.round(h * dpr)
      size = { w, h, dpr }
    }
    resize()
    window.addEventListener('resize', resize)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // Tope de 60 FPS: si pasaron menos de 16.6 ms, no se dibuja.
      if (now - lastFrame < FRAME_MS - 1) return
      lastFrame = now
      const dt = Math.min((now - last) / 1000, 0.25)
      last = now

      // Simulación a paso fijo: la velocidad no depende de la tasa de refresco (60 o 144 Hz).
      acc += dt
      while (acc >= TICK_DT) {
        const cmds = commandsRef.current.splice(0).map((cmd) => ({ playerId: ME, cmd }))
        step(s, { [ME]: readInput() }, cmds, TICK_DT)
        acc -= TICK_DT
      }
      const meP = s.players.find((p) => p.id === ME)!
      consumeEvents(fx, s.events, mySlot)
      for (const e of s.events) {
        if (e.type === 'rejected' && e.slot === mySlot) pushToast(e.reason)
        if (e.type === 'phase') pushToast(e.label.toUpperCase())
      }
      s.events.length = 0

      const preview = meP.alive && playerInOwnBase(s, meP) ? previewBuild(s, meP) : null
      cam = drawFrame(ctx, s, {
        width: size.w,
        height: size.h,
        dpr: size.dpr,
        alpha: acc / TICK_DT,
        dt,
        meId: ME,
        staticLayer,
        sprites,
        fx,
        preview,
      })

      // Posición para el E2E de Canvas (en casillas).
      posRef.current?.setAttribute('data-x', meP.x.toFixed(2))
      posRef.current?.setAttribute('data-y', meP.y.toFixed(2))

      frames++
      if (now - fpsAt >= 500) {
        setFps(Math.round((frames * 1000) / (now - fpsAt)))
        frames = 0
        fpsAt = now
      }
      if (now - hudAt >= HUD_MS || s.result) {
        hudAt = now
        setHud(snapshotHud(s, ME))
      }
      const mini = minimapRef.current
      if (mini && now - miniAt >= MINIMAP_MS) {
        miniAt = now
        drawMinimap(mini.getContext('2d')!, s, staticLayer, ME, cam, size.w, size.h)
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [sprites, round, mySlot, myName, mySurvivor, rivalName, rivalSurvivor, pushToast, readInput])

  const takeFromCrate = (item: keyof Stock) => sendCommand({ type: 'crateTake', item })

  return (
    <div className="fixed inset-0 overflow-hidden bg-ug-bg select-none" data-testid="game">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" data-testid="game-canvas" />
      <div ref={posRef} data-testid="player-pos" data-x="0" data-y="0" className="sr-only" />

      {!sprites && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="ug-title-shadow text-3xl text-ug-muted">{loadError ?? 'Cargando mapa…'}</p>
        </div>
      )}

      {hud && (
        <div className="pointer-events-none absolute inset-0 p-2 sm:p-3">
          {/* Arriba */}
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto">
              <PlayerPanel hud={hud} compact={isTouch} />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 max-sm:top-24">
              <PhasePanel hud={hud} />
            </div>
            <div className="pointer-events-auto flex flex-col items-end gap-2">
              <div className="flex items-center gap-2">
                <span className="ug-panel px-2 py-1 font-terminal text-sm" data-testid="hud-fps">
                  {fps} FPS · <span className="text-ug-green">Local</span>
                </span>
                {practice && (
                  <button
                    type="button"
                    onClick={() => sendCommand({ type: 'skipPhase' })}
                    title="Saltar a la siguiente fase (solo prueba)"
                    className="ug-panel flex items-center gap-1 px-2 py-1 font-terminal text-sm hover:border-ug-border-hi"
                    data-testid="skip-phase"
                  >
                    <FastForward size={14} /> Fase
                  </button>
                )}
                <button type="button" onClick={onExit} aria-label="Salir" className="ug-panel grid size-8 place-items-center hover:border-ug-border-hi">
                  <LogOut size={16} />
                </button>
              </div>
              {isTouch && <canvas ref={minimapRef} width={192} height={144} className="ug-panel size-auto w-40" />}
            </div>
          </div>

          {/* Toasts */}
          <div className="absolute top-1/3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
            {toasts.map((t) => (
              <p key={t.id} className="ug-title-shadow bg-black/60 px-3 py-1 text-xl" data-testid="toast">
                {t.text}
              </p>
            ))}
          </div>

          {/* Muerto / reapareciendo */}
          {!hud.me.alive && !hud.result && (
            <div className="absolute inset-x-0 top-[42%] text-center">
              <p className="ug-title-shadow text-5xl text-ug-red-hi">HAS MUERTO</p>
              <p className="ug-title-shadow text-2xl">
                {hud.me.respawnIn !== null ? `Reapareces en ${Math.ceil(hud.me.respawnIn)}…` : 'Tu núcleo fue destruido: ya no reapareces'}
              </p>
            </div>
          )}

          {/* Caja */}
          {hud.me.onCrate && !hud.result && (
            <div className="absolute inset-x-0 bottom-28 flex justify-center sm:bottom-32">
              <CrateMenu stock={hud.crate} onTake={takeFromCrate} />
            </div>
          )}

          {/* Abajo */}
          {!isTouch && (
            <div className="pointer-events-auto absolute bottom-3 left-3">
              <canvas ref={minimapRef} width={256} height={192} className="ug-panel hidden w-56 md:block" />
            </div>
          )}
          <div className="pointer-events-auto absolute bottom-2 left-1/2 -translate-x-1/2 sm:bottom-3">
            {hud.me.inBase && hud.me.buildLabel && (
              <p className={`mb-1 text-center text-lg ${hud.me.buildOk ? 'text-ug-green' : 'text-ug-red-hi'}`} data-testid="build-hint">
                {isTouch ? 'Botón' : 'Espacio'}: {hud.me.buildLabel}
              </p>
            )}
            <Hotbar hud={hud} onSelect={(slot) => sendCommand({ type: 'hotbar', slot })} />
          </div>
          {!isTouch && (
            <div className="absolute right-3 bottom-3">
              <ControlsHelp />
            </div>
          )}
          {isTouch && <MobileControls inBase={hud.me.inBase} onDirection={setTouchDirection} onAction={setTouchAction} />}
        </div>
      )}

      {hud?.result && (
        <MatchEndModal hud={hud} onRestart={() => setRound((r) => r + 1)} onExit={onExit} exitLabel={exitLabel} />
      )}
    </div>
  )
}
