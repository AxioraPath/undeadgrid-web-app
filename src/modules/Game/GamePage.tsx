import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LogOut } from 'lucide-react'
import { CORE_HP, type GameCommand, type GameMap, type GameState, type GameSyncData, type MatchEndReason, type MatchXp, type PlayerInput, type RoomStatus, type Slot, type Stock } from '../../shared/lib/contracts'
import { emitAck, getSocket } from '../../shared/lib/socket'
import { SnapshotBuffer } from '../../game/client/interpolation'
import { consumeEvents, createFx, createStaticLayer, aimFromMouse, drawCrosshair, drawFrame, drawMinimap, type Camera } from '../../game/client/render'
import { loadSprites, type Sprites } from '../../game/client/sprites'
import { useGameInput } from './hooks/useGameInput'
import { useIsTouch } from './hooks/useIsTouch'
import { getSettings, useSettings, ZOOM_TILES } from '../../shared/lib/settings'
import { snapshotHud, type HudSnapshot } from './hud'
import { PlayerPanel } from './components/PlayerPanel'
import { PhasePanel } from './components/PhasePanel'
import { Hotbar } from './components/Hotbar'
import { ControlsHelp } from './components/ControlsHelp'
import { MobileControls } from './components/MobileControls'
import { CrateMenu } from './components/CrateMenu'
import { MatchResultsScreen, type ResultsPlayer, type ResultsSummary } from './components/MatchResultsScreen'
import type { MatchSummary } from '../Lobby/hooks/useLobbyRoom'

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
  /** Leaves the room (HUD button and the results screen's SALIR). */
  onExit: () => void | Promise<void>
  /** XP gained per slot, when the server reports it. */
  xp?: MatchXp | null
  /** Everything the end-of-match screen needs besides what the game itself knows. */
  results: {
    roomCode: string
    mapId: string
    mapName?: string
    players: Partial<Record<Slot, ResultsPlayer>>
    /** `match:over` payload data (null until it arrives). */
    summary: MatchSummary | null
    rivalPresent: boolean
    rematchRequested: number[]
    onRematch: () => void
    onCancelRematch: () => void
    onBackToLobby: () => void | Promise<void>
  }
}

interface Toast {
  id: number
  text: string
}

const sameInput = (a: PlayerInput, b: PlayerInput) =>
  a.up === b.up && a.down === b.down && a.left === b.left && a.right === b.right && a.action === b.action

/** Aim changes smaller than this (radians, ~2.3 degrees) are not worth a new game:input. */
const AIM_EPSILON = 0.04
type Aim = { x: number; y: number }
const sameAim = (a: Aim | null, b: Aim | null) => {
  if (!a || !b) return a === b
  const diff = Math.abs(Math.atan2(a.x * b.y - a.y * b.x, a.x * b.x + a.y * b.y))
  return diff < AIM_EPSILON
}

const asReason = (r: string | undefined): MatchEndReason =>
  r === 'opponent_left' || r === 'time_out' ? r : 'core_destroyed'

/**
 * Partida: el servidor simula todo a 30 ticks/s. Aquí solo se mandan los controles
 * (game:input / game:command) y se dibuja lo que llega en game:state, interpolado.
 */
export function GamePage({ mySlot, status, roomResult, onExit, xp, results }: GamePageProps) {
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
  const settings = useSettings()
  const detectedTouch = useIsTouch()
  const isTouch = settings.touchControls === 'auto' ? detectedTouch : settings.touchControls === 'on'

  const sendCommand = useCallback((cmd: GameCommand) => {
    getSocket().emit('game:command', cmd)
  }, [])
  const { read: readInput, setTouchDirection, setTouchAction, setMouseAction } = useGameInput(sendCommand)
  const finished = status === 'results'
  const aimEnabled = settings.mouseAim && !isTouch
  const aimEnabledRef = useRef(aimEnabled)
  const finishedRef = useRef(finished)
  const mouseRef = useRef<{ x: number; y: number; known: boolean; over: boolean }>({ x: 0, y: 0, known: false, over: false })
  useEffect(() => {
    aimEnabledRef.current = aimEnabled
    finishedRef.current = finished
    if (!aimEnabled || finished) setMouseAction(false)
  }, [aimEnabled, finished, setMouseAction])

  // Mouse aiming: pointer position (client coords) + left button as the fire flag. Mouse pointers only.
  useEffect(() => {
    if (!aimEnabled) return
    const canvas = canvasRef.current
    if (!canvas) return
    const m = mouseRef.current
    const track = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return
      m.x = e.clientX
      m.y = e.clientY
      m.known = true
      m.over = e.target === canvas
    }
    const down = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse' || e.button !== 0 || finishedRef.current) return
      track(e)
      setMouseAction(true)
    }
    const release = () => setMouseAction(false)
    const up = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      release()
    }
    const leave = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') m.over = false
    }
    const noMenu = (e: Event) => e.preventDefault()
    const hidden = () => {
      if (document.hidden) release()
    }
    window.addEventListener('pointermove', track)
    canvas.addEventListener('pointerdown', down)
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', release)
    canvas.addEventListener('pointerleave', leave)
    canvas.addEventListener('contextmenu', noMenu)
    window.addEventListener('blur', release)
    document.addEventListener('visibilitychange', hidden)
    return () => {
      window.removeEventListener('pointermove', track)
      canvas.removeEventListener('pointerdown', down)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', release)
      canvas.removeEventListener('pointerleave', leave)
      canvas.removeEventListener('contextmenu', noMenu)
      window.removeEventListener('blur', release)
      document.removeEventListener('visibilitychange', hidden)
      m.over = false
      release()
    }
  }, [aimEnabled, setMouseAction])

  const pushToast = useCallback((text: string) => {
    const id = Date.now() + Math.random()
    setToasts((ts) => [...ts.filter((t) => t.text !== text), { id, text }].slice(-3))
    window.setTimeout(() => setToasts((ts) => ts.filter((t) => t.id !== id)), 1800)
  }, [])

  // The match screen never scrolls: lock <html>/<body> for as long as it is mounted.
  useEffect(() => {
    const root = document.documentElement
    root.classList.add('ug-no-scroll')
    return () => root.classList.remove('ug-no-scroll')
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
    let lastSentAim: Aim | null = null
    let lastSentAt = 0
    // Interpolated local player position from the last drawn frame (tiles), for the aim vector.
    let mePos: { x: number; y: number } | null = null

    // The canvas fills the fixed container; the camera scales the map to cover it (see computeCamera).
    // Re-fit on any size change: window resize, fullscreen toggle, rotation, mobile toolbar show/hide.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const w = canvas.clientWidth
      const h = canvas.clientHeight
      const pw = Math.round(w * dpr)
      const ph = Math.round(h * dpr)
      if (canvas.width !== pw) canvas.width = pw
      if (canvas.height !== ph) canvas.height = ph
      size = { w, h, dpr }
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)
    const vv = window.visualViewport
    window.addEventListener('resize', resize)
    window.addEventListener('orientationchange', resize)
    document.addEventListener('fullscreenchange', resize)
    vv?.addEventListener('resize', resize)

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame)
      // Controles: se mandan al cambiar y como latido, sin depender de los FPS.
      const input = readInput()
      // Aim = mouse (world) - player (interpolated), recomputed every frame so it follows the camera.
      let aim: Aim | null = null
      const mouse = mouseRef.current
      if (aimEnabledRef.current && mouse.known && cam && mePos) {
        const rect = canvas.getBoundingClientRect()
        if (rect.width > 0 && rect.height > 0) {
          // Undo any CSS scale between layout size (what the camera uses) and the on-screen rect.
          const cx = (mouse.x - rect.left) * (size.w / rect.width)
          const cy = (mouse.y - rect.top) * (size.h / rect.height)
          aim = aimFromMouse(cam, cx, cy, mePos.x, mePos.y)
        }
      }
      if (!lastSent || !sameInput(input, lastSent) || !sameAim(aim, lastSentAim) || now - lastSentAt >= INPUT_HEARTBEAT_MS) {
        const payload = aim ? { seq: seq++, ...input, aim: { x: +aim.x.toFixed(2), y: +aim.y.toFixed(2) } } : { seq: seq++, ...input }
        socket.emit('game:input', payload)
        lastSent = input
        lastSentAim = aim
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

      const prefs = getSettings()
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
        zoom: ZOOM_TILES[prefs.zoom],
        screenShake: prefs.screenShake,
        effects: prefs.effects,
        aim,
      })
      const meView = view.players.find((p) => p.slot === mySlot)
      mePos = meView ? { x: meView.x, y: meView.y } : null
      if (aim && mouse.over && !finishedRef.current) {
        const rect = canvas.getBoundingClientRect()
        drawCrosshair(ctx, (mouse.x - rect.left) * (size.w / rect.width), (mouse.y - rect.top) * (size.h / rect.height), size.dpr)
      }

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
      observer.disconnect()
      window.removeEventListener('resize', resize)
      window.removeEventListener('orientationchange', resize)
      document.removeEventListener('fullscreenchange', resize)
      vv?.removeEventListener('resize', resize)
    }
  }, [sprites, map, mySlot, readInput])

  const takeFromCrate = (item: keyof Stock) => sendCommand({ type: 'crateTake', item })

  // Prefer the server's `match:over` data; until it arrives, fall back to what the game state knows.
  const { summary: serverSummary, mapId, mapName } = results
  const summary = useMemo<ResultsSummary | null>(() => {
    if (serverSummary) {
      const zero = { zombieKills: 0, structuresBuilt: 0, coreDamageDealt: 0, coreHpPct: 0 }
      return {
        winner: serverSummary.winner,
        reason: serverSummary.reason,
        durationS: serverSummary.durationS,
        mapId,
        mapName: serverSummary.mapName ?? mapName,
        stats: { 1: serverSummary.stats[1] ?? zero, 2: serverSummary.stats[2] ?? zero },
      }
    }
    if (!hud) return null
    const side = (slot: Slot) => {
      const other: Slot = slot === 1 ? 2 : 1
      return {
        zombieKills: hud.stats[slot].zombieKills,
        structuresBuilt: 0,
        coreDamageDealt: Math.max(0, CORE_HP - hud.cores[other]),
        coreHpPct: Math.round((hud.cores[slot] / CORE_HP) * 100),
      }
    }
    const winner = hud.result ? hud.result.winner : (roomResult?.winner ?? 0)
    return {
      winner: winner === 1 || winner === 2 ? winner : null,
      reason: asReason(hud.result?.reason ?? roomResult?.reason),
      durationS: hud.result?.durationS ?? 0,
      mapId,
      mapName,
      stats: { 1: side(1), 2: side(2) },
    }
  }, [serverSummary, hud, roomResult, mapId, mapName])

  return (
    <div
      className="ug-game bg-ug-bg"
      data-testid="game"
      data-touch={isTouch}
      style={settings.touchSize === 'large' ? ({ '--ug-ctl': 'clamp(8rem, 30vmin, 13.5rem)' } as React.CSSProperties) : undefined}
    >
      <canvas ref={canvasRef} className={`absolute inset-0 size-full ${aimEnabled ? 'cursor-none' : ''}`} data-testid="game-canvas" />
      <div ref={posRef} data-testid="player-pos" data-x="0" data-y="0" className="sr-only" />

      {(!sprites || !map) && (
        <div className="absolute inset-0 grid place-items-center p-4 text-center">
          <p className="ug-title-shadow text-[clamp(1.25rem,5vmin,1.875rem)] text-ug-muted" data-testid="game-loading">
            {loadError ?? (status === 'preparation' ? 'La partida comienza en unos segundos…' : 'Cargando mapa…')}
          </p>
        </div>
      )}

      {hud && (
        <div className="ug-hud pointer-events-none absolute inset-0 overflow-hidden">
          {/* Arriba */}
          <div className="flex items-start justify-between gap-2">
            <div className="pointer-events-auto min-w-0">
              <PlayerPanel hud={hud} compact={isTouch} />
            </div>
            <div className="absolute left-1/2 -translate-x-1/2 max-sm:top-[calc(var(--ug-safe-top)+4.75rem)]">
              <PhasePanel hud={hud} />
            </div>
            <div className="pointer-events-auto flex shrink-0 items-center gap-2">
              {settings.showFps && (
                <span className="ug-panel px-2 py-1 font-terminal text-sm short:px-1 short:text-xs" data-testid="hud-fps">
                  {fps} FPS ·{' '}
                  <span className={pingMs !== null && pingMs < 100 ? 'text-ug-green' : 'text-yellow-400'} data-testid="hud-ping">
                    {pingMs === null ? '-- ms' : `${pingMs} ms`}
                  </span>
                </span>
              )}
              <button type="button" onClick={onExit} aria-label="Salir" className="ug-panel grid size-9 place-items-center hover:border-ug-border-hi short:size-8">
                <LogOut size={16} />
              </button>
            </div>
          </div>
          {isTouch && (
            <canvas
              ref={minimapRef}
              width={192}
              height={144}
              className="ug-panel pointer-events-auto absolute right-[calc(var(--ug-safe-right)+var(--ug-gap))] top-[calc(var(--ug-safe-top)+var(--ug-gap)+3rem)] h-auto w-[clamp(6rem,20vmin,10rem)] max-sm:portrait:top-[calc(var(--ug-safe-top)+13rem)]"
            />
          )}

          {/* Toasts */}
          <div className="absolute top-1/3 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
            {toasts.map((t) => (
              <p key={t.id} className="ug-title-shadow bg-black/60 px-3 py-1 text-[clamp(1rem,3.5vmin,1.25rem)]" data-testid="toast">
                {t.text}
              </p>
            ))}
          </div>

          {/* Muerto / reapareciendo */}
          {!hud.me.alive && !finished && (
            <div className="absolute inset-x-0 top-[42%] px-2 text-center">
              <p className="ug-title-shadow text-[clamp(2rem,9vmin,3rem)] leading-none text-ug-red-hi">HAS MUERTO</p>
              <p className="ug-title-shadow text-[clamp(1.125rem,4vmin,1.5rem)]">
                {hud.me.respawnIn !== null ? `Reapareces en ${Math.ceil(hud.me.respawnIn)}…` : 'Tu núcleo fue destruido: ya no reapareces'}
              </p>
            </div>
          )}

          {/* Abajo: caja + pista de construcción + hotbar, apilados al centro */}
          <div className="ug-dock pointer-events-none absolute inset-x-0 flex flex-col items-center gap-1 px-2">
            {hud.me.onCrate && !finished && <CrateMenu stock={hud.crate} onTake={takeFromCrate} />}
            {hud.me.inBase && hud.me.buildHint && (
              <p className={`text-center text-[clamp(1rem,3vmin,1.125rem)] leading-none ${hud.me.buildHint.ok ? 'text-ug-green' : 'text-ug-red-hi'}`} data-testid="build-hint">
                {isTouch ? 'Botón' : 'Espacio'}: {hud.me.buildHint.label}
              </p>
            )}
            <div className="pointer-events-auto">
              <Hotbar hud={hud} onSelect={(slot) => sendCommand({ type: 'hotbar', slot })} />
            </div>
          </div>
          {!isTouch && (
            <div className="pointer-events-auto absolute bottom-[calc(var(--ug-safe-bottom)+var(--ug-gap))] left-[calc(var(--ug-safe-left)+var(--ug-gap))]">
              <canvas ref={minimapRef} width={256} height={192} className="ug-panel hidden h-auto w-[clamp(7rem,22vmin,14rem)] md:block" />
            </div>
          )}
          {!isTouch && settings.keyHelp && (
            <div className="absolute right-[calc(var(--ug-safe-right)+var(--ug-gap))] bottom-[calc(var(--ug-safe-bottom)+var(--ug-gap))]">
              <ControlsHelp mouseAim={aimEnabled} />
            </div>
          )}
          {isTouch && <MobileControls inBase={hud.me.inBase} onDirection={setTouchDirection} onAction={setTouchAction} />}
        </div>
      )}

      {finished && summary && (
        <MatchResultsScreen
          mySlot={mySlot}
          roomCode={results.roomCode}
          players={results.players}
          summary={summary}
          xp={xp?.[mySlot]}
          rivalPresent={results.rivalPresent}
          rematchRequested={results.rematchRequested}
          onRematch={results.onRematch}
          onCancelRematch={results.onCancelRematch}
          onBackToLobby={results.onBackToLobby}
          onLeave={onExit}
        />
      )}
    </div>
  )
}
