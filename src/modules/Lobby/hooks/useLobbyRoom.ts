import { useCallback, useEffect, useMemo, useState } from 'react'
import { DIFFICULTIES, MAPS, UNLOCKED_SURVIVORS } from '../data/catalog'

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

const ME_ID = 'me'
const RIVAL_ID = 'rival'

const cycle = (i: number, dir: 1 | -1, len: number) => (i + dir + len) % len

// MOCK: estado local de la sala. Se reemplaza por lobby:state / lobby:ready del socket
// cuando el servidor esté listo; la interfaz que devuelve se mantiene igual.
export function useLobbyRoom(code: string, isHost: boolean) {
  const [players, setPlayers] = useState<LobbyPlayer[]>([
    {
      id: ME_ID,
      name: `Jugador ${isHost ? 1 : 2}`,
      slot: isHost ? 1 : 2,
      ready: false,
      survivor: UNLOCKED_SURVIVORS[isHost ? 0 : 1].id,
      survivorConfirmed: false,
      isHost,
    },
  ])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [mapIndex, setMapIndex] = useState(0)
  const [difficultyIndex, setDifficultyIndex] = useState(0)

  // MOCK: simula que el rival entra, elige superviviente y se marca listo.
  useEffect(() => {
    const rivalSlot: Slot = isHost ? 2 : 1
    const patchRival = (patch: Partial<LobbyPlayer>) =>
      setPlayers((ps) => ps.map((p) => (p.id === RIVAL_ID ? { ...p, ...patch } : p)))

    const timers = [
      window.setTimeout(() => {
        setPlayers((ps) => [
          ...ps,
          {
            id: RIVAL_ID,
            name: `Jugador ${rivalSlot}`,
            slot: rivalSlot,
            ready: false,
            survivor: UNLOCKED_SURVIVORS[isHost ? 1 : 0].id,
            survivorConfirmed: false,
            isHost: !isHost,
          },
        ])
      }, 1500),
      window.setTimeout(() => patchRival({ survivorConfirmed: true }), 5000),
      window.setTimeout(() => {
        patchRival({ ready: true })
        setMessages((ms) => [...ms, { id: Date.now(), slot: rivalSlot, author: `Jugador ${rivalSlot}`, text: 'Listo, vamos!' }])
      }, 6000),
    ]
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [isHost])

  const updateMe = useCallback((patch: Partial<LobbyPlayer>) => {
    setPlayers((ps) => ps.map((p) => (p.id === ME_ID ? { ...p, ...patch } : p)))
  }, [])

  const me = players.find((p) => p.id === ME_ID)!
  const rival = players.find((p) => p.id === RIVAL_ID)
  const bySlot = useMemo(
    () => ({ 1: players.find((p) => p.slot === 1), 2: players.find((p) => p.slot === 2) }),
    [players],
  )

  return {
    code,
    me,
    rival,
    bySlot,
    playerCount: players.length,
    messages,
    map: MAPS[mapIndex],
    mapIndex,
    difficulty: DIFFICULTIES[difficultyIndex],
    canStart: me.isHost && players.length === 2 && players.every((p) => p.ready),
    toggleReady: () => updateMe({ ready: !me.ready }),
    rename: (name: string) => updateMe({ name: name.trim().slice(0, 16) || me.name }),
    confirmSurvivor: (id: string) => updateMe({ survivor: id, survivorConfirmed: true }),
    cycleMap: (dir: 1 | -1) => setMapIndex((i) => cycle(i, dir, MAPS.length)),
    cycleDifficulty: () => setDifficultyIndex((i) => cycle(i, 1, DIFFICULTIES.length)),
    sendMessage: (text: string) => {
      const clean = text.trim().slice(0, 120)
      if (!clean) return
      setMessages((ms) => [...ms, { id: Date.now(), slot: me.slot, author: me.name, text: clean }])
    },
  }
}

export type LobbyRoom = ReturnType<typeof useLobbyRoom>
