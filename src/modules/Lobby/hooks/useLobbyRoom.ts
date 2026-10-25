import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DIFFICULTIES, MAPS, UNLOCKED_SURVIVORS } from '../data/catalog'
import { FFA_LIVES } from '../../../shared/lib/contracts'
import { useAuth } from '../../Auth/context/authContext'
import { emitAck, getSocket } from '../../../shared/lib/socket'
import type {
  ChatMessageSnapshot,
  JoinedData,
  MatchEndReason,
  MatchOverPayload,
  MatchSlotStats,
  MatchXp,
  RematchState,
  GameMode,
  PlayerSnapshot,
  RoomSnapshot,
  RoomStatus,
  Slot,
  Team,
} from '../../../shared/lib/contracts'
import { MODE_CAPACITY, TEAM_SIZE } from '../../../shared/lib/contracts'

export type { Slot, Team }

export interface LobbyPlayer {
  id: string
  name: string
  slot: Slot
  team: Team
  ready: boolean
  survivor: string
  // true cuando el jugador confirmó su superviviente en la pantalla de selección
  survivorConfirmed: boolean
  isHost: boolean
  connected: boolean
}

export interface ChatMessage {
  id: number
  slot: Slot
  author: string
  text: string
}

/** End-of-match data from `match:over` (everything except the room snapshot and XP). */
export interface MatchSummary {
  stats: { [slot: number]: MatchSlotStats }
  durationS: number
  /** Winning team (1v1: same number as the slot). */
  winner: Team | null
  /** Todos contra todos: slot ganador (null = empate). */
  winnerSlot?: Slot | null
  reason: MatchEndReason
  mapName?: string
}

export const MAX_PLAYER_NAME = 16

/** Account name trimmed and capped to the lobby name limit; falls back to "Jugador N" when empty. */
export const resolvePlayerName = (accountName: string | undefined, fallbackSlot: Slot) =>
  accountName?.trim().slice(0, MAX_PLAYER_NAME).trim() || `Jugador ${fallbackSlot}`

const cycle = (i: number, dir: 1 | -1, len: number) => (i + dir + len) % len

const sessionKey = (code: string) => `undeadgrid:session:${code}`

/** Código de la URL mientras el servidor crea la sala; luego se reemplaza por el real. */
export const NEW_ROOM_CODE = 'NUEVA-SALA'

/** Spanish text for the errors a lobby action can answer with. */
const ACTION_ERRORS: Record<string, string> = {
  TEAM_FULL: 'Ese equipo ya está completo',
  TOO_MANY_PLAYERS: 'Hay demasiados jugadores para 1v1: máximo 2',
  ROOM_FULL: 'La sala está llena',
  NOT_HOST: 'Solo el anfitrión puede hacer esto',
  BAD_STATE: 'No se puede hacer eso ahora',
  TIMEOUT: 'El servidor no respondió a tiempo',
}

const actionErrorText = (err: unknown) => {
  const e = err as { code?: string; message?: string }
  return (e.code && ACTION_ERRORS[e.code]) || e.message || 'No se pudo completar la acción'
}

const toLobbyPlayer = (p: PlayerSnapshot): LobbyPlayer => ({
  id: p.id,
  name: p.name,
  slot: p.slot,
  team: p.team ?? (p.slot % 2 === 1 ? 1 : 2),
  ready: p.ready,
  survivor: p.survivor,
  survivorConfirmed: p.survivorConfirmed,
  isHost: p.isHost,
  connected: p.connected,
})

const toChatMessage = (m: ChatMessageSnapshot): ChatMessage => ({
  id: m.id,
  slot: m.slot,
  author: m.author,
  text: m.text,
})

/**
 * Hook de sala conectado al backend real por Socket.IO. Mantiene el último
 * RoomSnapshot recibido y la lista de mensajes de chat en estado local, y
 * expone la misma interfaz que consumían las pantallas con el mock.
 */
export function useLobbyRoom(code: string, isHost: boolean) {
  const [room, setRoom] = useState<RoomSnapshot | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [matchXp, setMatchXp] = useState<MatchXp | null>(null)
  const [matchSummary, setMatchSummary] = useState<MatchSummary | null>(null)
  const [rematchRequested, setRematchRequested] = useState<number[]>([])
  // Bumped each time the room leaves `results`, so the match screen remounts clean for a rematch.
  const [matchRound, setMatchRound] = useState(0)
  // Stable player id of this client: slot and team can change in the lobby, so `me` is looked up by id.
  const [myId, setMyId] = useState<string | null>(null)
  const [fallbackSlot, setFallbackSlot] = useState<Slot>(isHost ? 1 : 2)
  // Last failed lobby action (setMode, setTeam, start), shown inline.
  const [actionError, setActionError] = useState<string | null>(null)
  // Mensaje si no se pudo crear/unirse (sala inexistente, llena, sin conexión…).
  const [joinError, setJoinError] = useState<string | null>(null)

  // Nombre y superviviente por defecto (editables luego con rename / selectSurvivor).
  const { user } = useAuth()
  const defaultName = resolvePlayerName(user?.name, isHost ? 1 : 2)
  const defaultSurvivor = UNLOCKED_SURVIVORS[isHost ? 0 : 1].id

  // Código de la sala en la que ya estamos: si la URL cambia a ese código no hay que volver a crear/unirse.
  const joinedCodeRef = useRef<string | null>(null)
  const joinRequestRef = useRef<{ code: string; request: Promise<JoinedData> } | null>(null)

  // Conexión + join/create al montar. Registra y limpia los listeners del servidor.
  useEffect(() => {
    const socket = getSocket()
    let cancelled = false
    const creating = code === NEW_ROOM_CODE

    const storedSessionId = (() => {
      if (creating) return undefined
      try {
        return sessionStorage.getItem(sessionKey(code)) ?? undefined
      } catch {
        return undefined
      }
    })()

    const persist = (joined: JoinedData) => {
      try {
        // Clave por el code real que devuelve el servidor para permitir reconexión.
        sessionStorage.setItem(sessionKey(joined.room.code), joined.sessionId)
      } catch {
        // sessionStorage puede no estar disponible; no es crítico.
      }
    }

        const applyJoined = (joined: JoinedData) => {
          if (cancelled) return
          setFallbackSlot(joined.slot)
          setMyId(joined.room.players.find((p) => p.slot === joined.slot)?.id ?? null)
          setRoom(joined.room)
          persist(joined)
          // Al crear sala, el servidor asigna el código real; RoomProvider lo pone en la URL.
          joinedCodeRef.current = joined.room.code
        }

    const join = async () => {
      try {
        // Si ya hay una petición en vuelo para esta sala (StrictMode monta dos veces en desarrollo),
        // se reutiliza en lugar de crear/unirse otra vez.
        if (joinRequestRef.current?.code !== code) {
          // Al recargar con una sesión guardada se recupera el asiento en lugar de crear otra sala.
          const request = creating
              ? emitAck<JoinedData>('lobby:create', { name: defaultName, survivor: defaultSurvivor })
              : emitAck<JoinedData>('lobby:join', { code, name: defaultName, survivor: defaultSurvivor, sessionId: storedSessionId })
          joinRequestRef.current = { code, request }
        }
        applyJoined(await joinRequestRef.current.request)
      } catch (err) {
        console.error('[useLobbyRoom] join/create falló', err)
        joinRequestRef.current = null
        if (cancelled) return
        const e = err as { code?: string; message?: string }
        setJoinError(
          e.code === 'ROOM_NOT_FOUND'
            ? 'La sala no existe. Revisa el código.'
            : e.code === 'ROOM_FULL'
              ? 'La sala está llena (máximo 4 jugadores en 2v2).'
              : (e.message ?? 'No se pudo entrar a la sala.'),
        )
      }
    }

    // Results state only lives while the room is in `results`; any other phase clears it.
    const applySnapshot = (snapshot: RoomSnapshot) => {
      setRoom(snapshot)
      if (snapshot.status !== 'results') {
        setMatchSummary(null)
        setMatchXp(null)
        setRematchRequested([])
      }
    }
    const onState = (snapshot: RoomSnapshot) => applySnapshot(snapshot)
    const onRematchState = (d: RematchState) => setRematchRequested(d.requested ?? [])
    const onChat = (msg: ChatMessageSnapshot) =>
      setMessages((ms) => (ms.some((m) => m.id === msg.id) ? ms : [...ms, toChatMessage(msg)]))
    const onClosed = (d: { reason: string }) => {
      console.error('[useLobbyRoom] sala cerrada', d.reason)
      setRoom((r) => (r ? { ...r, status: 'results' } : r))
    }
    const onMatchOver = (payload: MatchOverPayload) => {
      const { xp, stats, durationS, winner, winnerSlot, reason, mapName, ...snapshot } = payload
      setRoom(snapshot)
      setMatchXp(xp ?? null)
      setMatchSummary({ stats: stats ?? {}, durationS, winner, winnerSlot, reason, mapName })
      setRematchRequested([])
    }

    socket.on('lobby:state', onState)
    socket.on('chat:message', onChat)
    socket.on('lobby:closed', onClosed)
    socket.on('match:over', onMatchOver)
    socket.on('match:rematchState', onRematchState)

    if (joinedCodeRef.current !== code) void join()

    return () => {
      cancelled = true
      socket.off('lobby:state', onState)
      socket.off('chat:message', onChat)
      socket.off('lobby:closed', onClosed)
      socket.off('match:over', onMatchOver)
      socket.off('match:rematchState', onRematchState)
    }
    // Solo depende de la identidad de la sala y el rol; defaults derivan de isHost.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isHost])

  const roomStatus = room?.status
  const prevStatusRef = useRef<RoomStatus | undefined>(undefined)
  useEffect(() => {
    if (prevStatusRef.current === 'results' && roomStatus !== 'results') setMatchRound((n) => n + 1)
    prevStatusRef.current = roomStatus
  }, [roomStatus])

  const players = useMemo<LobbyPlayer[]>(
    () => (room ? room.players.map(toLobbyPlayer).sort((a, b) => a.slot - b.slot) : []),
    [room],
  )
  const mode: GameMode = room?.mode ?? '1v1'
  const capacity = room?.capacity ?? MODE_CAPACITY[mode]

  // "me" is looked up by player id (slot / team can change after setMode / setTeam).
  const me = useMemo<LobbyPlayer>(() => {
    const found = players.find((p) => p.id === myId)
    if (found) return found
    // Fallback mientras llega el primer snapshot: jugador placeholder coherente.
    return {
      id: 'me',
      name: defaultName,
      slot: fallbackSlot,
      team: fallbackSlot % 2 === 1 ? 1 : 2,
      ready: false,
      survivor: defaultSurvivor,
      survivorConfirmed: false,
      isHost,
      connected: true,
    }
  }, [players, myId, fallbackSlot, defaultName, defaultSurvivor, isHost])

  // Opponents (1 in 1v1, 2 in 2v2) and my teammate (2v2 only).
  const rivals = useMemo(() => players.filter((p) => p.team !== me.team), [players, me.team])
  const rival = rivals[0]
  const teammate = useMemo(() => players.find((p) => p.team === me.team && p.id !== me.id), [players, me.team, me.id])

  const bySlot = useMemo(
    () => ({
      1: players.find((p) => p.slot === 1),
      2: players.find((p) => p.slot === 2),
      3: players.find((p) => p.slot === 3),
      4: players.find((p) => p.slot === 4),
    }),
    [players],
  )
  const byTeam = useMemo(
    () => ({
      1: players.filter((p) => p.team === 1),
      2: players.filter((p) => p.team === 2),
    }),
    [players],
  )

  const mapId = room?.mapId
  const mapIndex = useMemo(() => {
    const idx = MAPS.findIndex((m) => m.id === mapId)
    return idx >= 0 ? idx : 0
  }, [mapId])

  const toggleReady = useCallback(() => {
    emitAck('lobby:ready', { ready: !me.ready }).catch((err) =>
      console.error('[useLobbyRoom] lobby:ready falló', err),
    )
  }, [me.ready])

  const rename = useCallback((name: string) => {
    const clean = name.trim().slice(0, MAX_PLAYER_NAME)
    if (!clean) return
    emitAck('lobby:rename', { name: clean }).catch((err) =>
      console.error('[useLobbyRoom] lobby:rename falló', err),
    )
  }, [])

  /** El personaje se elige en el lobby; al iniciar, el servidor usa el elegido. */
  const selectSurvivor = useCallback(async (id: string) => {
    try {
      await emitAck('lobby:selectSurvivor', { survivor: id })
    } catch (err) {
      console.error('[useLobbyRoom] selectSurvivor falló', err)
    }
  }, [])

  /** Runs a lobby action whose ack is a RoomSnapshot; failures show up inline in Spanish. */
  const lobbyAction = useCallback(async (event: 'lobby:setMode' | 'lobby:setLives' | 'room:setTeam' | 'lobby:start', payload?: unknown) => {
    setActionError(null)
    try {
      const snapshot = await emitAck<RoomSnapshot>(event, payload)
      // Keep the freshest snapshot (the lobby:state broadcast may already have arrived).
      if (snapshot) setRoom((cur) => (cur && cur.version > snapshot.version ? cur : snapshot))
    } catch (err) {
      console.error(`[useLobbyRoom] ${event} falló`, err)
      setActionError(actionErrorText(err))
    }
  }, [])

  /** El host inicia: lobby → preparación (el servidor valida sala llena, equipos de 2 y todos listos). */
  const start = useCallback(() => {
    void lobbyAction('lobby:start')
  }, [lobbyAction])

  /** Host only: switch between 1v1 and 2v2 (slots can be remapped by the server). */
  const setMode = useCallback(
    (next: GameMode) => {
      if (!me.isHost || next === mode) return
      void lobbyAction('lobby:setMode', { mode: next })
    },
    [me.isHost, mode, lobbyAction],
  )

  /** Todos contra todos (anfitrión): alterna entre 3 y 5 vidas. */
  const lives = room?.lives ?? FFA_LIVES[0]
  const cycleLives = useCallback(() => {
    if (!me.isHost) return
    void lobbyAction('lobby:setLives', { lives: lives === FFA_LIVES[0] ? FFA_LIVES[1] : FFA_LIVES[0] })
  }, [me.isHost, lives, lobbyAction])

  /** 2v2: move to a team. */
  const setTeam = useCallback(
    (team: Team) => {
      if (mode !== '2v2' || team === me.team) return
      void lobbyAction('room:setTeam', { team })
    },
    [mode, me.team, lobbyAction],
  )
  const clearActionError = useCallback(() => setActionError(null), [])

  const leave = useCallback(async () => {
    try {
      sessionStorage.removeItem(sessionKey(room?.code ?? code))
    } catch {
      // sessionStorage puede no estar disponible; no es crítico.
    }
    try {
      await emitAck('lobby:leave')
    } catch {
      // Si ya no estaba en la sala, no importa.
    }
  }, [room?.code, code])

  const requestRematch = useCallback(() => {
    emitAck('match:rematchRequest').catch((err) => console.error('[useLobbyRoom] rematchRequest falló', err))
  }, [])

  const cancelRematch = useCallback(() => {
    emitAck('match:rematchCancel').catch((err) => console.error('[useLobbyRoom] rematchCancel falló', err))
  }, [])

  /** Results -> lobby for both players; the resulting lobby:state clears the results state. */
  const backToLobby = useCallback(async () => {
    try {
      const snapshot = await emitAck<RoomSnapshot>('lobby:backToLobby')
      if (snapshot) {
        setRoom(snapshot)
        if (snapshot.status !== 'results') {
          setMatchSummary(null)
          setMatchXp(null)
          setRematchRequested([])
        }
      }
    } catch (err) {
      console.error('[useLobbyRoom] backToLobby falló', err)
    }
  }, [])

  /** El host elige un mapa concreto; los que aún no están disponibles se ignoran. */
  const selectMap = useCallback(
    (mapId: string) => {
      if (!me.isHost || !MAPS.some((m) => m.id === mapId && m.available)) return
      emitAck('lobby:setMap', { mapId }).catch((err) => console.error('[useLobbyRoom] lobby:setMap falló', err))
    },
    [me.isHost],
  )

  const cycleDifficulty = useCallback(() => {
    if (!me.isHost) return
    const current = room?.difficulty ?? DIFFICULTIES[0]
    const idx = DIFFICULTIES.indexOf(current as (typeof DIFFICULTIES)[number])
    const next = DIFFICULTIES[cycle(idx >= 0 ? idx : 0, 1, DIFFICULTIES.length)]
    emitAck('lobby:setDifficulty', { difficulty: next }).catch((err) =>
      console.error('[useLobbyRoom] lobby:setDifficulty falló', err),
    )
  }, [me.isHost, room?.difficulty])

  const sendMessage = useCallback((text: string) => {
    const clean = text.trim().slice(0, 120)
    if (!clean) return
    emitAck('chat:send', { text: clean }).catch((err) =>
      console.error('[useLobbyRoom] chat:send falló', err),
    )
  }, [])

  const playerCount = players.length
  const teamsBalanced = mode !== '2v2' || (byTeam[1].length === TEAM_SIZE && byTeam[2].length === TEAM_SIZE)
  /** Spanish reason why the host cannot start yet (null when everything is in place). */
  const missing = capacity - playerCount
  const startBlocker =
    mode === 'ffa'
      ? playerCount < 2
        ? 'Se necesitan al menos 2 jugadores'
        : !players.every((p) => p.ready)
          ? 'Esperando a que todos estén listos'
          : null
      : missing > 0
      ? mode === '2v2'
        ? `Faltan ${missing} jugador${missing === 1 ? '' : 'es'} para empezar`
        : 'Falta un rival para empezar'
      : !teamsBalanced
        ? 'Cada equipo debe tener 2 jugadores'
        : !players.every((p) => p.ready)
          ? mode === '2v2'
            ? 'Esperando a que todos estén listos'
            : 'Espera a que ambos jugadores estén listos'
          : null
  const status: RoomStatus = room?.status ?? 'lobby'
  const seed = room?.seed ?? 0

  return {
    // Fuente de verdad interna: el code real del snapshot (la URL puede mostrar un placeholder).
    code: room?.code ?? code,
    /** true en cuanto el servidor confirmó la sala (ya hay código real). */
    joined: room !== null,
    joinError,
    me,
    rival,
    rivals,
    teammate,
    bySlot,
    byTeam,
    mode,
    capacity,
    setMode,
    lives,
    cycleLives,
    setTeam,
    actionError,
    clearActionError,
    startBlocker,
    playerCount,
    messages,
    map: MAPS[mapIndex],
    mapIndex,
    difficulty: room?.difficulty ?? DIFFICULTIES[0],
    canStart: me.isHost && startBlocker === null,
    toggleReady,
    rename,
    selectSurvivor,
    start,
    leave,
    selectMap,
    cycleDifficulty,
    sendMessage,
    // Aditivos (no rompen consumidores existentes):
    status,
    seed,
    result: room?.result ?? null,
    /** XP gained per slot in the finished match (undefined when the server did not send it). */
    matchXp,
    /** Stats / winner / duration of the finished match (null until `match:over` arrives). */
    matchSummary,
    /** Slots that currently request a rematch. */
    rematchRequested,
    /** Changes every time the room leaves `results`; use as a React key for the match screen. */
    matchRound,
    requestRematch,
    cancelRematch,
    backToLobby,
    /** Display name of the room map from the catalog. */
    mapName: MAPS[mapIndex].name,
  }
}

export type LobbyRoom = ReturnType<typeof useLobbyRoom>
