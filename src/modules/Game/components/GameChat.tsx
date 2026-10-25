import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SendHorizontal, X } from 'lucide-react'
import { teamOf, type Slot } from '../../../shared/lib/contracts'
import { CHAT_MAX, validateChatMessage } from '../../../shared/lib/validation'
import type { ChatMessage } from '../../Lobby/hooks/useLobbyRoom'

/** Segundos que un mensaje nuevo se queda visible con el chat cerrado. */
const VISIBLE_S = 8
const TEAM_COLOR = { 1: 'text-[#6aa8ff]', 2: 'text-ug-red-hi' } as const

interface GameChatProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
  open: boolean
  onClose: () => void
  mySlot: Slot
}

/**
 * Chat de la sala dentro de la partida. Cerrado: los últimos mensajes aparecen unos segundos y se desvanecen.
 * Abierto: historial reciente y campo para escribir (Enter envía, Esc cierra).
 */
export function GameChat({ messages, onSend, open, onClose, mySlot }: GameChatProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  // Con el chat cerrado se ocultan los mensajes con id <= hiddenUpTo (los que ya llevan VISIBLE_S en pantalla).
  const [hiddenUpTo, setHiddenUpTo] = useState(() => messages[messages.length - 1]?.id ?? 0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLUListElement>(null)
  // Momento en que llegó cada mensaje (solo se lee en efectos).
  const arrivedAt = useRef(new Map<number, number>())

  useEffect(() => {
    const now = Date.now()
    for (const m of messages) if (!arrivedAt.current.has(m.id)) arrivedAt.current.set(m.id, now)
  }, [messages])

  useEffect(() => {
    if (open) inputRef.current?.focus()
  }, [open])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages, open])

  // Reloj para ocultar los mensajes viejos con el chat cerrado.
  useEffect(() => {
    if (open) return
    const t = window.setInterval(() => {
      const now = Date.now()
      let oldest = 0
      for (const [id, at] of arrivedAt.current) if (now - at >= VISIBLE_S * 1000 && id > oldest) oldest = id
      setHiddenUpTo((h) => Math.max(h, oldest))
    }, 500)
    return () => window.clearInterval(t)
  }, [open])

  const visible = open ? messages.slice(-30) : messages.slice(-5).filter((m) => m.id > hiddenUpTo)

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!text.trim()) {
      onClose()
      return
    }
    const err = validateChatMessage(text)
    if (err) {
      setError(err)
      return
    }
    onSend(text.trim())
    setText('')
    setError(null)
    onClose()
  }

  if (!open && visible.length === 0) return null

  return (
    <div
      className={`pointer-events-auto absolute top-[22%] left-2 z-20 flex w-[min(20rem,46vw)] flex-col gap-1 short:top-[26%] ${open ? 'ug-panel p-2' : ''}`}
      data-testid="game-chat"
      onKeyDown={(e) => e.stopPropagation()}
    >
      {open && (
        <div className="flex items-center justify-between">
          <span className="font-terminal text-sm text-ug-muted">Chat de la sala</span>
          <button type="button" onClick={onClose} aria-label="Cerrar chat" className="grid size-6 place-items-center hover:text-ug-text">
            <X size={14} />
          </button>
        </div>
      )}
      <ul ref={listRef} className={`space-y-0.5 font-terminal text-sm leading-tight ${open ? 'max-h-36 overflow-y-auto short:max-h-24' : ''}`}>
        {open && visible.length === 0 && <li className="text-ug-muted">Aún no hay mensajes.</li>}
        {visible.map((m) => (
          <li key={m.id} className={open ? '' : 'w-fit bg-black/60 px-1.5 py-0.5'} data-testid="game-chat-message">
            <span className={TEAM_COLOR[teamOf(m.slot)]}>
              {m.author}
              {m.slot === mySlot ? ' (tú)' : ''}:
            </span>{' '}
            <span className="break-words">{m.text}</span>
          </li>
        ))}
      </ul>
      {open && (
        <form onSubmit={submit} noValidate className="flex gap-1">
          <input
            ref={inputRef}
            value={text}
            onChange={(e) => {
              setText(e.target.value.slice(0, CHAT_MAX))
              setError(null)
            }}
            onKeyDown={(e) => {
              if (e.key === 'Escape') onClose()
            }}
            maxLength={CHAT_MAX}
            placeholder="Escribe y pulsa Enter…"
            aria-label="Mensaje"
            data-testid="game-chat-input"
            className={`min-w-0 flex-1 border-2 ${error ? 'border-ug-red-hi' : 'border-ug-border'} bg-black/60 px-2 py-1 font-terminal text-sm outline-none focus:border-ug-accent`}
          />
          <button type="submit" aria-label="Enviar" className="grid w-9 place-items-center border-2 border-ug-border bg-ug-panel-2 hover:border-ug-border-hi">
            <SendHorizontal size={16} />
          </button>
        </form>
      )}
      {error && <p className="font-terminal text-xs text-ug-red-hi">{error}</p>}
    </div>
  )
}
