import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { LogOut, Maximize, Settings } from 'lucide-react'
import { SettingsModal } from '../../shared/components/SettingsModal'
import { useFullscreen } from '../../shared/lib/fullscreen'
import { ARMORY_OPEN_S, BUILD_REACH, CORE_HP, HEAVY_WEAPONS, TILE, type GameCommand, type GameMap, type GameState, type GameSyncData, type MatchEndReason, type MatchXp, type PlayerInput, teamOf, type RoomStatus, type Slot, type Stock, type Team, type WeaponId } from '../../shared/lib/contracts'
import { emitAck, getSocket } from '../../shared/lib/socket'
import { SnapshotBuffer } from '../../game/client/interpolation'
import { consumeEvents, createFx, createStaticLayer, aimFromMouse, drawCrosshair, drawFrame, drawMinimap, screenToWorld, type Camera } from '../../game/client/render'
import { drawAimLine } from '../../game/client/aimLine'
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
import { HudSlot } from './components/HudSlot'
import { CrateMenu } from './components/CrateMenu'
import { MatchResultsScreen, type ResultsPlayer, type ResultsSummary } from './components/MatchResultsScreen'
import type { MatchSummary } from '../Lobby/hooks/useLobbyRoom'
import { isSoftwareRendering } from '../../shared/lib/gpu'

const HUD_MS = 100
/**
 * Resolución dinámica: si los FPS se quedan bajos, el canvas se dibuja a menos píxeles y el navegador lo estira
 * (pixel art, casi no se nota). Pasos sobre la densidad de la pantalla; 45 FPS durante 2 s baja un paso.
 */
const RENDER_SCALES = [1, 0.8, 0.65, 0.5]
const LOW_FPS = 45
const MINIMAP_MS = 200
const PING_MS = 2000
/** Latido del input: aunque no cambie, se reenvía para que el servidor no se quede con uno viejo. */
const INPUT_HEARTBEAT_MS = 66
/** Minimum gap between two mouse-wheel weapon switches. */
const WHEEL_THROTTLE_MS = 160

type Weapon = WeaponId

export interface GamePageProps {
  mySlot: Slot
  /** Estado de la sala (lo decide el servidor). */
  status: RoomStatus
  /** Resultado de la sala cuando la partida terminó fuera del motor (p. ej. abandono). */
  roomResult: { winner: Team | null; reason: string } | null
  /** Leaves the room (HUD button and the results screen's SALIR). */
  onExit: () => void | Promise<void>
  /** XP gained per slot, when the server reports it (only players still in the room). */
  xp?: MatchXp | null
  /** Everything the end-of-match screen needs besides what the game itself knows. */
  results: {
    roomCode: string
    mapId: string
    mapName?: string
    players: Partial<Record<Slot, ResultsPlayer>>
    /** `match:over` payload data (null until it arrives). */
    summary: MatchSummary | null
    /** True while at least one opponent is still in the room (a rematch needs everybody). */
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
  // Ajustes dentro de la partida (zoom, controles, HUD...) y botón para volver a pantalla completa en celular.
  const [settingsOpen, setSettingsOpen] = useState(false)
  const closeSettings = useCallback(() => setSettingsOpen(false), [])
  const fullscreen = useFullscreen()
  // Aviso si el navegador no usa la tarjeta gráfica (aceleración por hardware apagada).
  const [gpuWarning, setGpuWarning] = useState(() => {
    try {
      // En pruebas automatizadas (webdriver) el navegador siempre va sin GPU: no se avisa.
      return !navigator.webdriver && !sessionStorage.getItem('ug:gpu-warning-closed') && isSoftwareRendering()
    } catch {
      return false
    }
  })
  const closeGpuWarning = () => {
    setGpuWarning(false)
    try {
      sessionStorage.setItem('ug:gpu-warning-closed', '1')
    } catch {
      // sin almacenamiento: solo se cierra en esta vista
    }
  }
  const [pingMs, setPingMs] = useState<number | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [sprites, setSprites] = useState<Sprites | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const bufferRef = useRef(new SnapshotBuffer())
  const fxRef = useRef(createFx())
  const settings = useSettings()
  const detectedTouch = useIsTouch()
  const isTouch = settings.touchControls === 'auto' ? detectedTouch : settings.touchControls === 'on'

  // Modo construir: la última selección de la barra fue pared, trampa o torreta (4, 5, 7).
  // En celular, tocar una casilla de tu base construye ahí (como en Minecraft).
  const [buildMode, setBuildMode] = useState(false)
  const buildModeRef = useRef(false)
  const sendCommand = useCallback((cmd: GameCommand) => {
    if (cmd.type === 'hotbar' && cmd.slot !== 3) {
      const building = cmd.slot === 4 || cmd.slot === 5 || cmd.slot === 7
      buildModeRef.current = building
      setBuildMode(building)
    }
    getSocket().emit('game:command', cmd)
  }, [])
  /** Cámara y posición del jugador del último cuadro: para convertir un clic/toque en casilla. */
  const viewRef = useRef<{ cam: Camera | null; w: number; h: number; mePos: { x: number; y: number } | null }>({ cam: null, w: 0, h: 0, mePos: null })

  // Weapon switching: every path (hotbar tap, number keys, Q, wheel, quick button) goes through here.
  // The chosen weapon is shown at once (optimistic) and replaced by the server's value on the next snapshot.
  const [localWeapon, setLocalWeapon] = useState<{ weapon: Weapon; base: Weapon | undefined } | null>(null)
  const serverWeaponRef = useRef<Weapon | undefined>(undefined)
  const weaponRef = useRef<Weapon>('pistol')
  const previousWeaponRef = useRef<Weapon | null>(null)
  const selectWeapon = useCallback(
    (w: Weapon) => {
      if (weaponRef.current !== w) previousWeaponRef.current = weaponRef.current
      weaponRef.current = w
      setLocalWeapon({ weapon: w, base: serverWeaponRef.current })
      sendCommand({ type: 'hotbar', slot: w === 'pistol' ? 1 : w === 'shotgun' ? 2 : 6 })
    },
    [sendCommand],
  )
  const cycleWeapon = useCallback(() => selectWeapon(weaponRef.current === 'pistol' ? 'shotgun' : 'pistol'), [selectWeapon])
  const swapToPreviousWeapon = useCallback(
    () => selectWeapon(previousWeaponRef.current ?? (weaponRef.current === 'pistol' ? 'shotgun' : 'pistol')),
    [selectWeapon],
  )
  const onCommand = useCallback(
    (cmd: GameCommand) => {
      if (cmd.type === 'hotbar' && (cmd.slot === 1 || cmd.slot === 2)) {
        selectWeapon(cmd.slot === 1 ? 'pistol' : 'shotgun')
        return
      }
      sendCommand(cmd)
    },
    [sendCommand, selectWeapon],
  )
  const { read: readInput, setTouchDirection, setTouchAim, setAimPressed, readTouchAim, setMouseAction } = useGameInput(onCommand, swapToPreviousWeapon)
  const finished = status === 'results'
  const aimEnabled = settings.mouseAim && !isTouch
  const aimEnabledRef = useRef(aimEnabled)
  const touchRef = useRef(isTouch)
  const finishedRef = useRef(finished)
  const mouseRef = useRef<{ x: number; y: number; known: boolean; over: boolean }>({ x: 0, y: 0, known: false, over: false })
  useEffect(() => {
    aimEnabledRef.current = aimEnabled
    touchRef.current = isTouch
    finishedRef.current = finished
    if (!aimEnabled || finished) setMouseAction(false)
  }, [aimEnabled, isTouch, finished, setMouseAction])

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

  // Construir en una casilla: clic derecho con el mouse, o tocarla en celular con pared/trampa/torreta elegida.
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !map) return
    const down = (e: PointerEvent) => {
      if (finishedRef.current) return
      const rightClick = e.pointerType === 'mouse' && e.button === 2
      const tap = e.pointerType !== 'mouse' && buildModeRef.current
      if (!rightClick && !tap) return
      const v = viewRef.current
      if (!v.cam) return
      const rect = canvas.getBoundingClientRect()
      const w = screenToWorld(v.cam, (e.clientX - rect.left) * (v.w / rect.width), (e.clientY - rect.top) * (v.h / rect.height))
      sendCommand({ type: 'build', x: Math.floor(w.x / TILE), y: Math.floor(w.y / TILE) })
    }
    const noMenu = (e: Event) => e.preventDefault()
    canvas.addEventListener('pointerdown', down)
    canvas.addEventListener('contextmenu', noMenu)
    return () => {
      canvas.removeEventListener('pointerdown', down)
      canvas.removeEventListener('contextmenu', noMenu)
    }
  }, [map, sendCommand])

  // Mouse wheel cycles the weapons (only with mouse aim; throttled so a touchpad does not flip it back and forth).
  useEffect(() => {
    if (!aimEnabled || finished) return
    let last = 0
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaY) < 4) return
      const now = performance.now()
      if (now - last < WHEEL_THROTTLE_MS) return
      last = now
      cycleWeapon()
    }
    window.addEventListener('wheel', onWheel, { passive: true })
    return () => window.removeEventListener('wheel', onWheel)
  }, [aimEnabled, finished, cycleWeapon])

  const serverWeapon = hud?.me.weapon
  useEffect(() => {
    // Server value changed: remember what was in hand before (for Q) and keep the refs in sync.
    serverWeaponRef.current = serverWeapon
    if (!serverWeapon) return
    if (weaponRef.current !== serverWeapon) previousWeaponRef.current = weaponRef.current
    weaponRef.current = serverWeapon
  }, [serverWeapon])
  // The optimistic choice is valid until the server reports a different weapon than the one it had then.
  const weapon: Weapon = localWeapon && localWeapon.base === serverWeapon ? localWeapon.weapon : (serverWeapon ?? 'pistol')

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
        if (e.type === 'armoryReady')
          pushToast(e.weapon ? `¡CAJA EN EL CENTRO: ${HEAVY_WEAPONS[e.weapon].name.toUpperCase()}!` : '¡CAJA DE ARMAMENTO EN EL CENTRO!')
        if (e.type === 'armoryOpened')
          pushToast(
            e.slot === mySlot
              ? `¡${e.weapon ? HEAVY_WEAPONS[e.weapon].name : 'Arma pesada'}, torreta y botiquín conseguidos!`
              : teamOf(e.slot) === teamOf(mySlot)
                ? 'Tu compañero abrió la caja de armamento'
                : 'El rival abrió la caja de armamento',
          )
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
    // Mediana de las últimas muestras: una sola lectura atrasada por un tirón del hilo no dispara el número.
    const samples: number[] = []
    const measure = () => {
      const t0 = performance.now()
      emitAck('ping', { t: Date.now() })
        .then(() => {
          samples.push(performance.now() - t0)
          if (samples.length > 5) samples.shift()
          const sorted = [...samples].sort((a, b) => a - b)
          setPingMs(Math.round(sorted[Math.floor(sorted.length / 2)]))
        })
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
    let frames = 0
    let fpsAt = last
    let hudAt = 0
    let miniAt = 0
    let cam: Camera | null = null
    let size = { w: 0, h: 0, dpr: 1 }
    let scaleStep = 0
    let lowFpsWindows = 0
    let seq = 0
    let lastSent: PlayerInput | null = null
    let lastSentAim: Aim | null = null
    let lastSentAt = 0
    // Interpolated local player position from the last drawn frame (tiles), for the aim vector.
    let mePos: { x: number; y: number } | null = null

    // The canvas fills the fixed container; the camera scales the map to cover it (see computeCamera).
    // Re-fit on any size change: window resize, fullscreen toggle, rotation, mobile toolbar show/hide.
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2) * RENDER_SCALES[scaleStep]
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
      const touchAim = touchRef.current ? readTouchAim() : null
      if (touchAim) aim = touchAim
      else if (aimEnabledRef.current && mouse.known && cam && mePos) {
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

      // Sin tope fijo: en monitores de 75/100/144 Hz un tope de 60 FPS saltaba cuadros alternos (37-50 FPS).
      // Se dibuja en cada refresco; el movimiento usa delta time, así que la velocidad no depende de los FPS.
      const dt = Math.min((now - last) / 1000, 0.25)
      last = now

      const view = bufferRef.current.sample(map, now)
      const latest = bufferRef.current.latest
      if (!view || !latest) return
      const meNow = latest.players.find((p) => p.slot === mySlot)

      const prefs = getSettings()
      // Casilla de tu base bajo el mouse: ahí construye el clic derecho.
      let ghost: { x: number; y: number; inReach: boolean } | null = null
      if (aimEnabledRef.current && mouse.over && cam && mePos && !finishedRef.current) {
        const rect = canvas.getBoundingClientRect()
        const w = screenToWorld(cam, (mouse.x - rect.left) * (size.w / rect.width), (mouse.y - rect.top) * (size.h / rect.height))
        const gx = Math.floor(w.x / TILE)
        const gy = Math.floor(w.y / TILE)
        const b = map.bases[teamOf(mySlot)]
        if (gx >= b.x && gx < b.x + b.w && gy >= b.y && gy < b.y + b.h)
          ghost = { x: gx, y: gy, inReach: Math.hypot(gx + 0.5 - mePos.x, gy + 0.5 - mePos.y) <= BUILD_REACH }
      }
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
        ghost,
      })
      const meView = view.players.find((p) => p.slot === mySlot)
      mePos = meView ? { x: meView.x, y: meView.y } : null
      viewRef.current = { cam, w: size.w, h: size.h, mePos }
      if (touchAim && cam && mePos && !finishedRef.current) {
        drawAimLine(ctx, cam, mePos.x, mePos.y, touchAim, size.dpr)
      } else if (aim && mouse.over && !finishedRef.current) {
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
        const current = Math.round((frames * 1000) / (now - fpsAt))
        setFps(current)
        frames = 0
        fpsAt = now
        // 4 mediciones seguidas (2 s) por debajo de LOW_FPS: se baja un paso de resolución.
        lowFpsWindows = current < LOW_FPS && !document.hidden ? lowFpsWindows + 1 : 0
        if (lowFpsWindows >= 4 && scaleStep < RENDER_SCALES.length - 1) {
          scaleStep++
          lowFpsWindows = 0
          resize()
        }
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
  }, [sprites, map, mySlot, readInput, readTouchAim])

  const armoryProgress = hud?.armory?.available ? hud.armory.progress[mySlot] : undefined
  const layout = settings.hudLayout
  const renderHotbar = (h: HudSnapshot) => (
    <div className="pointer-events-auto">
      <Hotbar hud={h} weapon={weapon} onSelect={(slot) => (slot === 1 || slot === 2 ? selectWeapon(slot === 1 ? 'pistol' : 'shotgun') : sendCommand({ type: 'hotbar', slot }))} />
    </div>
  )

  const takeFromCrate = (item: keyof Stock) => sendCommand({ type: 'crateTake', item })

  // Prefer the server's `match:over` data; until it arrives, fall back to what the game state knows.
  const { summary: serverSummary, mapId, mapName } = results
  const summary = useMemo<ResultsSummary | null>(() => {
    if (serverSummary) {
      // Keyed by slot (1-2 in 1v1, 1-4 in 2v2); only players that took part have an entry.
      const stats: ResultsSummary['stats'] = {}
      for (const [key, s] of Object.entries(serverSummary.stats)) stats[Number(key) as Slot] = { ...s, team: s.team ?? teamOf(Number(key) as Slot) }
      return {
        winner: serverSummary.winner,
        reason: serverSummary.reason,
        durationS: serverSummary.durationS,
        mapId,
        mapName: serverSummary.mapName ?? mapName,
        stats,
      }
    }
    if (!hud) return null
    // Until match:over arrives: per-player zombie kills, core numbers per team.
    const stats: ResultsSummary['stats'] = {}
    for (const [key, s] of Object.entries(hud.stats)) {
      const slot = Number(key) as Slot
      const team = teamOf(slot)
      const other: Team = team === 1 ? 2 : 1
      stats[slot] = {
        team,
        zombieKills: s.zombieKills,
        structuresBuilt: 0,
        coreDamageDealt: Math.max(0, CORE_HP - hud.cores[other]),
        coreHpPct: Math.round((hud.cores[team] / CORE_HP) * 100),
      }
    }
    const winner = hud.result ? hud.result.winner : (roomResult?.winner ?? 0)
    return {
      winner: winner === 1 || winner === 2 ? winner : null,
      reason: asReason(hud.result?.reason ?? roomResult?.reason),
      durationS: hud.result?.durationS ?? 0,
      mapId,
      mapName,
      stats,
    }
  }, [serverSummary, hud, roomResult, mapId, mapName])

  return (
    <div
      className="ug-game bg-ug-bg"
      data-testid="game"
      data-touch={isTouch}
      style={
        {
          ...(settings.touchSize === 'large' ? { '--ug-ctl': 'clamp(6.5rem, 27vmin, 11rem)' } : null),
          '--ug-ctl-alpha': settings.controlOpacity,
          '--ug-hud-alpha': settings.hudOpacity,
        } as React.CSSProperties
      }
    >
      <canvas ref={canvasRef} className={`absolute inset-0 size-full [image-rendering:pixelated] ${aimEnabled ? 'cursor-none' : ''}`} data-testid="game-canvas" />
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
          {/* Arriba: lo que no se mueve del sitio por defecto */}
          <div className="relative z-10 flex items-start justify-end gap-2">
            <div className="pointer-events-auto flex shrink-0 items-center gap-2">
              {settings.showFps && (
                <span className="ug-panel px-2 py-1 font-terminal text-sm short:px-1 short:text-xs" data-testid="hud-fps">
                  {fps} FPS ·{' '}
                  <span className={pingMs !== null && pingMs < 100 ? 'text-ug-green' : 'text-yellow-400'} data-testid="hud-ping">
                    {pingMs === null ? '-- ms' : `${pingMs} ms`}
                  </span>
                </span>
              )}
              {fullscreen.supported && !fullscreen.active && (
                <button type="button" onClick={fullscreen.enter} aria-label="Pantalla completa" className="ug-panel grid size-9 place-items-center hover:border-ug-border-hi short:size-8" data-testid="game-fullscreen">
                  <Maximize size={16} />
                </button>
              )}
              <button type="button" onClick={() => setSettingsOpen(true)} aria-label="Ajustes" className="ug-panel grid size-9 place-items-center hover:border-ug-border-hi short:size-8" data-testid="game-settings">
                <Settings size={16} />
              </button>
              <button type="button" onClick={onExit} aria-label="Salir" className="ug-panel grid size-9 place-items-center hover:border-ug-border-hi short:size-8">
                <LogOut size={16} />
              </button>
            </div>
          </div>

          {gpuWarning && (
            <div className="pointer-events-auto absolute top-12 left-1/2 z-20 flex w-[min(36rem,92vw)] -translate-x-1/2 items-start gap-2 border-2 border-yellow-500/70 bg-black/85 p-2 font-terminal text-sm leading-tight text-yellow-200" role="status" data-testid="gpu-warning">
              <p>
                Tu navegador está dibujando sin la tarjeta gráfica, por eso van pocos FPS. En Chrome: Configuración → Sistema → activa
                “Usar aceleración de gráficos cuando esté disponible” y reinicia el navegador.
              </p>
              <button type="button" onClick={closeGpuWarning} aria-label="Cerrar aviso" className="shrink-0 border-2 border-yellow-500/70 px-2 hover:bg-yellow-500/20">
                ✕
              </button>
            </div>
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
            {isTouch && settings.keyHelp && <ControlsHelp touch />}
            {armoryProgress !== undefined && !finished && (
              <p className="ug-title-shadow text-center text-[clamp(1rem,3vmin,1.25rem)] leading-none text-yellow-300" data-testid="armory-progress">
                Abriendo caja de armamento… {Math.min(armoryProgress, ARMORY_OPEN_S).toFixed(1)} / {ARMORY_OPEN_S} s (no recibas daño)
              </p>
            )}
            {isTouch && buildMode && !finished ? (
              <p className="text-center text-[clamp(1rem,3vmin,1.125rem)] leading-none text-ug-green" data-testid="build-hint">
                Toca una casilla de tu base para construir
              </p>
            ) : (
              !isTouch &&
              hud.me.inBase &&
              hud.me.buildHint && (
                <p className={`text-center text-[clamp(1rem,3vmin,1.125rem)] leading-none ${hud.me.buildHint.ok ? 'text-ug-green' : 'text-ug-red-hi'}`} data-testid="build-hint">
                  Espacio o clic derecho: {hud.me.buildHint.label}
                </p>
              )
            )}
            {!layout.items.hotbar && renderHotbar(hud)}
          </div>
          {!isTouch && settings.keyHelp && (
            <div className="absolute right-[calc(var(--ug-safe-right)+var(--ug-gap))] bottom-[calc(var(--ug-safe-bottom)+var(--ug-gap))]">
              <ControlsHelp mouseAim={aimEnabled} />
            </div>
          )}

          {/* Elementos movibles (HUD editable): se anclan al área segura; sin personalizar, su sitio de siempre */}
          <div className="ug-hud-area pointer-events-none absolute" data-testid="hud-area">
            <HudSlot id="playerPanel" layout={layout} defaultClassName="absolute top-0 left-0">
              <div className="pointer-events-auto min-w-0">
                <PlayerPanel hud={hud} compact={isTouch} />
              </div>
            </HudSlot>
            <HudSlot id="phasePanel" layout={layout} defaultClassName="absolute top-0 left-1/2 -translate-x-1/2 max-sm:top-[calc(4.75rem-var(--ug-gap))]">
              <PhasePanel hud={hud} />
            </HudSlot>
            <HudSlot
              id="minimap"
              layout={layout}
              defaultClassName={
                isTouch ? 'absolute top-12 right-0 max-sm:portrait:top-[calc(13rem-var(--ug-gap))]' : 'absolute bottom-0 left-0'
              }
            >
              <div className="pointer-events-auto">
                {isTouch ? (
                  <canvas ref={minimapRef} width={192} height={144} className="ug-panel h-auto w-[clamp(5.5rem,20vmin,10rem)] opacity-[max(0.4,var(--ug-hud-alpha,1))] short:w-24" />
                ) : (
                  <canvas ref={minimapRef} width={256} height={192} className="ug-panel hidden h-auto w-[clamp(7rem,22vmin,14rem)] opacity-[max(0.4,var(--ug-hud-alpha,1))] md:block" />
                )}
              </div>
            </HudSlot>
            {layout.items.hotbar && (
              <HudSlot id="hotbar" layout={layout}>
                {renderHotbar(hud)}
              </HudSlot>
            )}
            {isTouch && (
              <MobileControls
                inBase={hud.me.inBase}
                layout={layout}
                weapon={weapon}
                onDirection={setTouchDirection}
                onAim={(x, y) => setTouchAim(x, y)}
                onAimPress={setAimPressed}
                onQuickWeapon={cycleWeapon}
              />
            )}
          </div>
        </div>
      )}

      <SettingsModal open={settingsOpen} onClose={closeSettings} />

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
