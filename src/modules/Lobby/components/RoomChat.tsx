import { useEffect, useRef, useState, type FormEvent } from 'react'
import { SendHorizontal } from 'lucide-react'
import type { ChatMessage } from '../hooks/useLobbyRoom'
import { teamOf } from '../../../shared/lib/contracts'
import { CHAT_MAX, validateChatMessage } from '../../../shared/lib/validation'

const AUTHOR_COLOR = { 1: 'text-[#4d9bff]', 2: 'text-ug-red-hi' } as const

interface RoomChatProps {
  messages: ChatMessage[]
  onSend: (text: string) => void
}

export function RoomChat({ messages, onSend }: RoomChatProps) {
  const [text, setText] = useState('')
  const [error, setError] = useState<string | null>(null)
  const listRef = useRef<HTMLUListElement>(null)

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [messages])

  const submit = (e: FormEvent) => {
    e.preventDefault()
    const err = validateChatMessage(text)
    if (err) {
      setError(err)
      document.getElementById('chat-input')?.focus()
      return
    }
    onSend(text.trim())
    setText('')
    setError(null)
  }

  return (
    <section className="ug-panel flex flex-col p-3 phone:p-2" aria-label="Chat de sala" data-testid="room-chat">
      <h2 className="ug-title-shadow border-b-2 border-ug-border pb-2 phone:pb-0.5 text-xl phone:text-lg tracking-wide">CHAT DE SALA</h2>
      <ul ref={listRef} className="my-2 h-28 phone:my-1 phone:h-14 space-y-1 overflow-y-auto font-terminal text-lg leading-tight">
        {messages.length === 0 && <li className="text-ug-muted">Aún no hay mensajes.</li>}
        {messages.map((m) => (
          <li key={m.id}>
            <span className={AUTHOR_COLOR[teamOf(m.slot)]}>{m.author}:</span> {m.text}
          </li>
        ))}
      </ul>
      <form onSubmit={submit} noValidate className="flex gap-2">
        <input
          id="chat-input"
          value={text}
          onChange={(e) => {
            setText(e.target.value.slice(0, CHAT_MAX))
            setError(null)
          }}
          maxLength={CHAT_MAX}
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'chat-error' : undefined}
          placeholder="Escribe un mensaje..."
          aria-label="Mensaje"
          className={`min-w-0 flex-1 border-2 ${error ? 'border-ug-red-hi' : 'border-ug-border'} bg-black/50 px-3 py-1.5 phone:px-2 phone:py-0.5 font-terminal text-lg outline-none placeholder:text-ug-muted/60 focus:border-ug-accent`}
        />
        <button
          type="submit"
          aria-label="Enviar"
          className="grid w-11 place-items-center border-2 border-ug-border bg-ug-panel-2 hover:border-ug-border-hi"
        >
          <SendHorizontal size="1.25rem" />
        </button>
      </form>
      {error && (
        <p id="chat-error" role="alert" className="mt-1 font-terminal text-base leading-tight text-ug-red-hi">
          {error}
        </p>
      )}
    </section>
  )
}
