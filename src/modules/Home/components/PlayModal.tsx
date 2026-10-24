import { useState, type FormEvent } from 'react'
import { DoorOpen, Plus } from 'lucide-react'
import { PixelModal } from '../../../shared/components/PixelModal'
import { CODE_LENGTH } from '../../Lobby/data/catalog'
import { validateRoomCode } from '../../../shared/lib/validation'


interface PlayModalProps {
  open: boolean
  onClose: () => void
  onCreate: () => void
  onJoin: (roomCode: string) => void
}

export function PlayModal({ open, onClose, onCreate, onJoin }: PlayModalProps) {
  const [code, setCode] = useState('')
  const [touched, setTouched] = useState(false)
  const error = touched ? validateRoomCode(code) : null

  const submit = (e: FormEvent) => {
    e.preventDefault()
    setTouched(true)
    if (validateRoomCode(code)) {
      document.getElementById('room-code')?.focus()
      return
    }
    onJoin(code)
  }

  return (
    <PixelModal open={open} title="Jugar" onClose={onClose} testId="play-modal">
      <button
        type="button"
        onClick={onCreate}
        data-testid="create-room"
        className="flex w-full items-center gap-3 border-2 border-ug-red-hi bg-gradient-to-b from-[#d0181f] to-[#8c0d12] px-4 py-3 text-left transition hover:brightness-110 active:translate-y-0.5"
      >
        <Plus size={28} />
        <span>
          <span className="block text-2xl leading-none">CREAR SALA</span>
          <span className="font-terminal text-base leading-none text-white/85">Comparte el código con tu rival</span>
        </span>
      </button>

      <div className="my-4 flex items-center gap-3 font-terminal text-lg text-ug-muted">
        <span className="h-0.5 flex-1 bg-ug-border" /> o únete con un código <span className="h-0.5 flex-1 bg-ug-border" />
      </div>

      <form onSubmit={submit} noValidate className="flex gap-2">
        <input
          id="room-code"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, CODE_LENGTH))}
          placeholder="ABCDE"
          onBlur={() => code && setTouched(true)}
          aria-label="Código de sala"
          aria-required="true"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'room-code-error' : undefined}
          data-testid="room-code-input"
          autoCapitalize="characters"
          autoComplete="off"
          className={`min-w-0 flex-1 border-2 ${error ? 'border-ug-red-hi' : 'border-ug-border'} bg-black/50 px-3 py-2 text-center font-terminal text-3xl tracking-[0.4em] text-ug-text uppercase outline-none placeholder:text-ug-border focus:border-ug-accent`}
        />
        <button
          type="submit"
          data-testid="join-room"
          className="ug-panel flex items-center gap-2 px-4 text-xl hover:border-ug-border-hi"
        >
          <DoorOpen size={22} /> UNIRSE
        </button>
      </form>
      {error && (
        <p id="room-code-error" role="alert" className="mt-2 font-terminal text-lg leading-tight text-ug-red-hi">
          {error}
        </p>
      )}

    </PixelModal>
  )
}
