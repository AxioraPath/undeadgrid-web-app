import { useCallback, useEffect, useMemo, useState } from 'react'
import { CODE_LENGTH, DIFFICULTIES, MAPS, SURVIVORS } from '../data/catalog'

export type Slot = 1 | 2

export interface LobbyPlayer {
  id: string
  name: string
  slot: Slot
  ready: boolean
  survivor: number
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

function randomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: CODE_LENGTH }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

const cycle = (i: number, dir: 1 | -1, len: number) => (i + dir + len) % len

// MOCK: estado local de la sala. Se reemplaza por lobby:state / lobby:ready del socket
// cuando el servidor esté listo; la interfaz que devuelve se mantiene igual.
export function useLobbyRoom(codeParam: string | undefined) {
  const [code] = useState(() => (!codeParam || codeParam === 'nueva' ? randomCode() : codeParam.toUpperCase()))
  const isHost = !codeParam || codeParam === 'nueva'

  const [players, setPlayers] = useState<LobbyPlayer[]>([
    { id: ME_ID, name: 'Jugador 1', slot: isHost ? 1 : 2, ready: false, survivor: isHost ? 0 : 1, isHost },
  ])
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [mapIndex, setMapIndex] = useState(0)
  const [difficultyIndex, setDifficultyIndex] = useState(0)

  // MOCK: simula que el rival entra y se marca listo.
  useEffect(() => {
    const rivalSlot: Slot = isHost ? 2 : 1
    const join = window.setTimeout(() => {
      setPlayers((ps) => [
        ...ps,
        { id: RIVAL_ID, name: 'Jugador 2', slot: rivalSlot, ready: false, survivor: isHost ? 1 : 0, isHost: !isHost },
      ])
    }, 1500)
    const ready = window.setTimeout(() => {
      setPlayers((ps) => ps.map((p) => (p.id === RIVAL_ID ? { ...p, ready: true } : p)))
      setMessages((ms) => [...ms, { id: Date.now(), slot: rivalSlot, author: 'Jugador 2', text: 'Listo, vamos!' }])
    }, 3500)
    return () => {
      window.clearTimeout(join)
      window.clearTimeout(ready)
    }
  }, [isHost])

  const updateMe = useCallback((patch: Partial<LobbyPlayer>) => {
    setPlayers((ps) => ps.map((p) => (p.id === ME_ID ? { ...p, ...patch } : p)))
  }, [])

  const me = players.find((p) => p.id === ME_ID)!
  const bySlot = useMemo(
    () => ({ 1: players.find((p) => p.slot === 1), 2: players.find((p) => p.slot === 2) }),
    [players],
  )

  return {
    code,
    me,
    bySlot,
    playerCount: players.length,
    messages,
    map: MAPS[mapIndex],
    mapIndex,
    difficulty: DIFFICULTIES[difficultyIndex],
    canStart: me.isHost && players.length === 2 && players.every((p) => p.ready),
    toggleReady: () => updateMe({ ready: !me.ready }),
    rename: (name: string) => updateMe({ name: name.trim().slice(0, 16) || me.name }),
    cycleSurvivor: (dir: 1 | -1) => updateMe({ survivor: cycle(me.survivor, dir, SURVIVORS.length) }),
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
