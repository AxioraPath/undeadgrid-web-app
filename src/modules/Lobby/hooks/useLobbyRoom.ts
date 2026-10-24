import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { DIFFICULTIES, MAPS, UNLOCKED_SURVIVORS } from '../data/catalog'
import { emitAck, getSocket } from '../../../shared/lib/socket'
import type {
  ChatMessageSnapshot,
  JoinedData,
  PlayerSnapshot,
  RoomSnapshot,
  RoomStatus,
} from '../../../shared/lib/contracts'

export type Slot = 1 | 2

export interface LobbyPlayer {
  id: string
  name: string
  slot: Slot
  ready: boolean
  survivor: string
  // true cuando el jugador confirmó su superviviente en la pantalla de selección
  survivorConfirmed: boolean
  isHost: boolean
}

export interface ChatMessage {
  id: number
  slot: Slot
  author: string
  text: string
}

const cycle = (i: number, dir: 1 | -1, len: number) => (i + dir + len) % len

const sessionKey = (code: string) => `undeadgrid:session:${code}`

const toLobbyPlayer = (p: PlayerSnapshot): LobbyPlayer => ({
  id: p.id,
  name: p.name,
  slot: p.slot,
  ready: p.ready,
  survivor: p.survivor,
  survivorConfirmed: p.survivorConfirmed,
  isHost: p.isHost,
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
  const [mySlot, setMySlot] = useState<Slot>(isHost ? 1 : 2)

  // Nombre y superviviente por defecto (editables luego con rename / confirmSurvivor).
  const defaultName = `Jugador ${isHost ? 1 : 2}`
  const defaultSurvivor = UNLOCKED_SURVIVORS[isHost ? 0 : 1].id

  // Slot efectivo del cliente en una ref para que los listeners lean el valor vigente.
  const mySlotRef = useRef<Slot>(mySlot)
  mySlotRef.current = mySlot

  // Código de la sala en la que ya estamos: si la URL cambia a ese código no hay que volver a crear/unirse.
  const joinedCodeRef = useRef<string | null>(null)
  const joinRequestRef = useRef<{ code: string; request: Promise<JoinedData> } | null>(null)

  // Conexión + join/create al montar. Registra y limpia los listeners del servidor.
  useEffect(() => {
    const socket = getSocket()
    let cancelled = false

    const storedSessionId = (() => {
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
        if (joined.room.code !== code) {
          sessionStorage.setItem(sessionKey(code), joined.sessionId)
        }
      } catch {
        // sessionStorage puede no estar disponible; no es crítico.
      }
    }

        const applyJoined = (joined: JoinedData) => {
          if (cancelled) return
          setMySlot(joined.slot as Slot)
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
          const request =
            isHost && !storedSessionId
              ? emitAck<JoinedData>('lobby:create', { name: defaultName, survivor: defaultSurvivor })
              : emitAck<JoinedData>('lobby:join', { code, name: defaultName, survivor: defaultSurvivor, sessionId: storedSessionId })
          joinRequestRef.current = { code, request }
        }
        applyJoined(await joinRequestRef.current.request)
      } catch (err) {
        console.error('[useLobbyRoom] join/create falló', err)
      }
    }

    const onState = (snapshot: RoomSnapshot) => setRoom(snapshot)
    const onChat = (msg: ChatMessageSnapshot) =>
      setMessages((ms) => (ms.some((m) => m.id === msg.id) ? ms : [...ms, toChatMessage(msg)]))
    const onClosed = (d: { reason: string }) => {
      console.error('[useLobbyRoom] sala cerrada', d.reason)
      setRoom((r) => (r ? { ...r, status: 'results' } : r))
    }
    const onMatchOver = (snapshot: RoomSnapshot) => setRoom(snapshot)

    socket.on('lobby:state', onState)
    socket.on('chat:message', onChat)
    socket.on('lobby:closed', onClosed)
    socket.on('match:over', onMatchOver)

    if (joinedCodeRef.current !== code) void join()

    return () => {
      cancelled = true
      socket.off('lobby:state', onState)
      socket.off('chat:message', onChat)
      socket.off('lobby:closed', onClosed)
      socket.off('match:over', onMatchOver)
    }
    // Solo depende de la identidad de la sala y el rol; defaults derivan de isHost.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, isHost])

  const players = useMemo<LobbyPlayer[]>(
    () => (room ? room.players.map(toLobbyPlayer) : []),
    [room],
  )

  // "me" es el jugador con el slot asignado al cliente; rival es el otro.
  const me = useMemo<LobbyPlayer>(() => {
    const found = players.find((p) => p.slot === mySlot)
    if (found) return found
    // Fallback mientras llega el primer snapshot: jugador placeholder coherente.
    return {
      id: 'me',
      name: defaultName,
      slot: mySlot,
      ready: false,
      survivor: defaultSurvivor,
      survivorConfirmed: false,
      isHost,
    }
  }, [players, mySlot, defaultName, defaultSurvivor, isHost])

  const rival = useMemo(() => players.find((p) => p.slot !== mySlot), [players, mySlot])

  const bySlot = useMemo(
    () => ({
      1: players.find((p) => p.slot === 1),
      2: players.find((p) => p.slot === 2),
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
    const clean = name.trim().slice(0, 16)
    if (!clean) return
    emitAck('lobby:rename', { name: clean }).catch((err) =>
      console.error('[useLobbyRoom] lobby:rename falló', err),
    )
  }, [])

  /** En el lobby solo se elige; la confirmación existe solo en la fase de selección. */
  const selectSurvivor = useCallback(async (id: string) => {
    try {
      await emitAck('lobby:selectSurvivor', { survivor: id })
    } catch (err) {
      console.error('[useLobbyRoom] selectSurvivor falló', err)
    }
  }, [])

  /** El host inicia: lobby → selección (el servidor valida sala llena y ambos listos). */
  const start = useCallback(() => {
    emitAck('lobby:start').catch((err) => console.error('[useLobbyRoom] lobby:start falló', err))
  }, [])

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

  const confirmSurvivor = useCallback(async (id: string) => {
    try {
      await emitAck('lobby:selectSurvivor', { survivor: id })
      await emitAck('lobby:confirmSurvivor')
    } catch (err) {
      console.error('[useLobbyRoom] confirmSurvivor falló', err)
    }
  }, [])

  const cycleMap = useCallback(
    (dir: 1 | -1) => {
      if (!me.isHost) return
      const nextId = MAPS[cycle(mapIndex, dir, MAPS.length)].id
      emitAck('lobby:setMap', { mapId: nextId }).catch((err) =>
        console.error('[useLobbyRoom] lobby:setMap falló', err),
      )
    },
    [me.isHost, mapIndex],
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
  const status: RoomStatus = room?.status ?? 'lobby'
  const seed = room?.seed ?? 0

  return {
    // Fuente de verdad interna: el code real del snapshot (la URL puede mostrar un placeholder).
    code: room?.code ?? code,
    me,
    rival,
    bySlot,
    playerCount,
    messages,
    map: MAPS[mapIndex],
    mapIndex,
    difficulty: room?.difficulty ?? DIFFICULTIES[0],
    canStart: me.isHost && playerCount === 2 && players.every((p) => p.ready),
    toggleReady,
    rename,
    selectSurvivor,
    confirmSurvivor,
    start,
    leave,
    cycleMap,
    cycleDifficulty,
    sendMessage,
    // Aditivos (no rompen consumidores existentes):
    status,
    seed,
    result: room?.result ?? null,
  }
}

export type LobbyRoom = ReturnType<typeof useLobbyRoom>
