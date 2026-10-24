import { useCallback, useEffect, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import type { GameCommand, GameMap, GameState, GameSyncData, PlayerInput, RoomStatus, Slot, Stock } from '../../shared/lib/contracts'
import { emitAck, getSocket } from '../../shared/lib/socket'
import { SnapshotBuffer } from '../../game/client/interpolation'
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
const PING_MS = 2000
/** Latido del input: aunque no cambie, se reenvía para que el servidor no se quede con uno viejo. */
const INPUT_HEARTBEAT_MS = 66

export interface GamePageProps {
  mySlot: Slot
  /** Estado de la sala (lo decide el servidor). */
  status: RoomStatus
  /** Resultado de la sala cuando la partida terminó fuera del motor (p. ej. abandono). */
  roomResult: { winner: Slot | null; reason: string } | null
  exitLabel: string
  onExit: () => void
}

interface Toast {
  id: number
  text: string
}

const sameInput = (a: PlayerInput, b: PlayerInput) =>
  a.up === b.up && a.down === b.down && a.left === b.left && a.right === b.right && a.action === b.action

const ROOM_REASON: Record<string, string> = {
  opponent_left: 'El rival abandonó la partida',
  core_destroyed: 'Núcleo rival destruido y enemigo eliminado',
  time_out: 'Tiempo agotado',
}

/**
 * Partida: el servidor simula todo a 30 ticks/s. Aquí solo se mandan los controles
 * (game:input / game:command) y se dibuja lo que llega en game:state, interpolado.
 */
export function GamePage({ mySlot, status, roomResult, exitLabel, onExit }: GamePageProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const minimapRef = useRef<HTMLCanvasElement>(null)
  const posRef = useRef<HTMLDivElement>(null)
  const [map, setMap] = useState<GameMap | null>(null)
  const [hud, setHud] = useState<HudSnapshot | null>(null)
  const [fps, setFps] = useState(0)
  const [pingMs, setPingMs] = useState<number | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [sprites, setSprites] = useState<Sprites | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const bufferRef = useRef(new SnapshotBuffer())
  const fxRef = useRef(createFx())
  const isTouch = useIsTouch()

  const sendCommand = useCallback((cmd: GameCommand) => {
    getSocket().emit('game:command', cmd)
  }, [])
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

  // Estados del servidor → buffer de interpolación + efectos visuales.
  const onState = useCallback(
    (state: GameState) => {
      bufferRef.current.push(state, performance.now())
      consumeEvents(fxRef.current, state.events, mySlot)
      for (const e of state.events) {
        if (e.type === 'rejected' && e.slot === mySlot) pushToast(e.reason)
        if (e.type === 'phase') pushToast(e.label.toUpperCase())
      }
    },
    [mySlot, pushToast],
  )

  useEffect(() => {
    const socket = getSocket()
    socket.on('game:state', onState)
    return () => {
      socket.off('game:state', onState)
    }
  }, [onState])

  // Pide el mapa y el estado completo al entrar (y cuando empieza el combate).
  useEffect(() => {
    if (map || (status !== 'combat' && status !== 'results')) return
    let cancelled = false
    const sync = () =>
      emitAck<GameSyncData>('game:sync')
        .then((data) => {
          if (cancelled) return
          bufferRef.current.push(data.state, performance.now())
          setMap(data.map)
        })
        .catch(() => {
          if (!cancelled) window.setTimeout(sync, 1000)
        })
    void sync()
    return () => {
      cancelled = true
    }
  }, [map, status])

  // Latencia con el evento ping cada 2 s (se muestra en el HUD).
  useEffect(() => {
    const measure = () => {
      const t0 = performance.now()
      emitAck('ping', { t: Date.now() })
        .then(() => setPingMs(Math.round(performance.now() - t0)))
        .catch(() => setPingMs(null))
    }
    measure()
    const id = window.setInterval(measure, PING_MS)
    return () => window.clearInterval(id)
  }, [])

  // Bucle de dibujo (requestAnimationFrame con tope de 60 FPS) + envío de controles.
  useEffect(() => {
    if (!sprites || !map) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const staticLayer = createStaticLayer(map, sprites)
    const fx = fxRef.current
    const socket = getSocket()

    let raf = 0
    let last = performance.now()
    let lastFrame = 0
    let frames = 0
    let fpsAt = last
    let hudAt = 0
    let miniAt = 0
    let cam: Camera | null = null
    let size = { w: 0, h: 0, dpr: 1 }
    let seq = 0
    let lastSent: PlayerInput | null = null
    let lastSentAt = 0

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
      // Controles: se mandan al cambiar y como latido, sin depender de los FPS.
      const input = readInput()
      if (!lastSent || !sameInput(input, lastSent) || now - lastSentAt >= INPUT_HEARTBEAT_MS) {
        socket.emit('game:input', { seq: seq++, ...input })
        lastSent = input
        lastSentAt = now
      }

      // Tope de 60 FPS: si pasaron menos de 16.6 ms, no se dibuja.
      if (now - lastFrame < FRAME_MS - 1) return
      lastFrame = now
      const dt = Math.min((now - last) / 1000, 0.25)
      last = now

      const view = bufferRef.current.sample(map, now)
      const latest = bufferRef.current.latest
      if (!view || !latest) return
      const meNow = latest.players.find((p) => p.slot === mySlot)

      cam = drawFrame(ctx, view, {
        width: size.w,
        height: size.h,
        dpr: size.dpr,
        dt,
        meSlot: mySlot,
        staticLayer,
        sprites,
        fx,
        hint: meNow?.buildHint ?? null,
      })

      // Posición para el E2E de Canvas (en casillas, según el servidor).
      if (meNow) {
        posRef.current?.setAttribute('data-x', meNow.x.toFixed(2))
        posRef.current?.setAttribute('data-y', meNow.y.toFixed(2))
      }

      frames++
      if (now - fpsAt >= 500) {
        setFps(Math.round((frames * 1000) / (now - fpsAt)))
        frames = 0
        fpsAt = now
      }
      if (now - hudAt >= HUD_MS) {
        hudAt = now
        setHud(snapshotHud(latest, mySlot))
      }
      const mini = minimapRef.current
      if (mini && now - miniAt >= MINIMAP_MS) {
        miniAt = now
        drawMinimap(mini.getContext('2d')!, view, staticLayer, mySlot, cam, size.w, size.h)
      }
    }
    raf = requestAnimationFrame(frame)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', resize)
    }
  }, [sprites, map, mySlot, readInput])

  const takeFromCrate = (item: keyof Stock) => sendCommand({ type: 'crateTake', item })
  const finished = status === 'results'

  return (
    <div className="fixed inset-0 overflow-hidden bg-ug-bg select-none" data-testid="game">
      <canvas ref={canvasRef} className="absolute inset-0 size-full" data-testid="game-canvas" />
      <div ref={posRef} data-testid="player-pos" data-x="0" data-y="0" className="sr-only" />

      {(!sprites || !map) && (
        <div className="absolute inset-0 grid place-items-center">
          <p className="ug-title-shadow text-3xl text-ug-muted" data-testid="game-loading">
            {loadError ?? (status === 'preparation' ? 'La partida comienza en unos segundos…' : 'Cargando mapa…')}
          </p>
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
                  {fps} FPS ·{' '}
                  <span className={pingMs !== null && pingMs < 100 ? 'text-ug-green' : 'text-yellow-400'} data-testid="hud-ping">
                    {pingMs === null ? '-- ms' : `${pingMs} ms`}
                  </span>
                </span>
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
          {!hud.me.alive && !finished && (
            <div className="absolute inset-x-0 top-[42%] text-center">
              <p className="ug-title-shadow text-5xl text-ug-red-hi">HAS MUERTO</p>
              <p className="ug-title-shadow text-2xl">
                {hud.me.respawnIn !== null ? `Reapareces en ${Math.ceil(hud.me.respawnIn)}…` : 'Tu núcleo fue destruido: ya no reapareces'}
              </p>
            </div>
          )}

          {/* Caja */}
          {hud.me.onCrate && !finished && (
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
            {hud.me.inBase && hud.me.buildHint && (
              <p className={`mb-1 text-center text-lg ${hud.me.buildHint.ok ? 'text-ug-green' : 'text-ug-red-hi'}`} data-testid="build-hint">
                {isTouch ? 'Botón' : 'Espacio'}: {hud.me.buildHint.label}
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

      {hud && finished && (
        <MatchEndModal
          hud={hud}
          reasonOverride={hud.result ? undefined : roomResult ? ROOM_REASON[roomResult.reason] : undefined}
          winnerOverride={hud.result ? undefined : (roomResult?.winner ?? 0)}
          onExit={onExit}
          exitLabel={exitLabel}
        />
      )}
    </div>
  )
}
