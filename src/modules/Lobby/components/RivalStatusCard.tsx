import { CircleCheck, House, Skull } from 'lucide-react'
import { SLOT_THEME } from '../data/slotTheme'
import type { LobbyPlayer, Slot } from '../hooks/useLobbyRoom'

interface RivalStatusCardProps {
  slot: Slot
  rival: LobbyPlayer | undefined
}

// Solo muestra el estado del rival: su elección no se ve ni se puede cambiar desde aquí.
export function RivalStatusCard({ slot, rival }: RivalStatusCardProps) {
  const t = SLOT_THEME[slot]
  const BaseIcon = slot === 1 ? House : Skull

  return (
    <aside
      className={`flex h-full flex-col items-center justify-center gap-3 border-2 ${t.border} bg-black/45 p-5 text-center`}
      aria-label="Estado del rival"
      data-testid="rival-status"
      data-confirmed={rival?.survivorConfirmed ?? false}
    >
      <BaseIcon size={56} className={`${t.base} opacity-80`} />
      <p className={`ug-title-shadow text-4xl leading-none ${t.base}`}>BASE {slot}</p>

      {!rival ? (
        <>
          <span className="size-10 animate-spin rounded-full border-4 border-ug-border border-t-ug-text" />
          <p className="ug-title-shadow text-2xl">Esperando rival…</p>
        </>
      ) : (
        <>
          <p className="ug-title-shadow text-3xl leading-none">{rival.name}</p>
          {rival.survivorConfirmed ? (
            <p className="flex items-center gap-2 text-2xl">
              <CircleCheck size={24} className="text-ug-green" fill="currentColor" stroke="#0b0f17" /> Superviviente elegido
            </p>
          ) : (
            <p className="flex items-center gap-3 text-2xl text-ug-muted">
              <span className="size-5 animate-spin rounded-full border-[3px] border-ug-border border-t-ug-text" />
              Eligiendo superviviente…
            </p>
          )}
          <p className="font-terminal text-lg text-ug-muted">Su personaje se revela en la sala.</p>
        </>
      )}
    </aside>
  )
}
