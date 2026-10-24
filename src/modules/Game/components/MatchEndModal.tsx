import { LogOut, Trophy, Skull } from 'lucide-react'
import type { Slot } from '../../../shared/lib/contracts'
import { formatTime, type HudSnapshot } from '../hud'

interface MatchEndModalProps {
  hud: HudSnapshot
  /** Motivo que da la sala cuando la partida no terminó en el motor (p. ej. el rival abandonó). */
  reasonOverride?: string
  winnerOverride?: Slot | 0
  onExit: () => void
  exitLabel: string
}

export function MatchEndModal({ hud, reasonOverride, winnerOverride, onExit, exitLabel }: MatchEndModalProps) {
  const winner = winnerOverride ?? hud.result?.winner ?? 0
  const reason = reasonOverride ?? hud.result?.reason ?? ''
  const duration = hud.result?.durationS ?? 0
  const won = winner === hud.me.slot
  const draw = winner === 0
  const title = draw ? 'EMPATE' : won ? 'VICTORIA' : 'DERROTA'
  const rows: { label: string; get: (slot: Slot) => number }[] = [
    { label: 'Vida del núcleo', get: (s) => hud.stats[s].core },
    { label: 'Zombis eliminados', get: (s) => hud.stats[s].zombieKills },
    { label: 'Kills al rival', get: (s) => hud.stats[s].kills },
    { label: 'Muertes', get: (s) => hud.stats[s].deaths },
  ]

  return (
    <div className="fixed inset-0 z-40 grid place-items-center overflow-hidden bg-black/75 p-[max(0.5rem,env(safe-area-inset-top))_max(0.5rem,env(safe-area-inset-right))_max(0.5rem,env(safe-area-inset-bottom))_max(0.5rem,env(safe-area-inset-left))]" data-testid="match-end" data-winner={winner}>
      <div className="ug-panel max-h-full w-full max-w-md overflow-y-auto overscroll-contain p-5 text-center short:p-2">
        {won ? <Trophy size={52} className="mx-auto text-yellow-400 short:hidden" /> : <Skull size={52} className="mx-auto text-ug-red-hi short:hidden" />}
        <h2 className={`ug-title-shadow mt-2 text-[clamp(2.5rem,12vmin,3.75rem)] leading-none short:mt-0 ${won ? 'text-yellow-400' : draw ? 'text-ug-text' : 'text-ug-red-hi'}`}>{title}</h2>
        <p className="font-terminal text-lg text-ug-muted">
          {reason}{duration ? ` · ${formatTime(duration)}` : ''}
        </p>
        <table className="mt-4 w-full text-left font-terminal text-lg short:mt-1 short:text-base">
          <thead>
            <tr className="text-ug-muted">
              <th className="font-normal" />
              <th className="text-center font-normal text-[#4d9bff]">J1</th>
              <th className="text-center font-normal text-ug-red-hi">J2</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className="border-t border-ug-border">
                <td className="py-1 short:py-0">{row.label}</td>
                <td className="text-center">{row.get(1)}</td>
                <td className="text-center">{row.get(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-5 flex justify-center gap-3 short:mt-2">
          <button type="button" onClick={onExit} className="ug-panel flex items-center gap-2 px-5 py-2 text-2xl short:py-1 short:text-xl hover:border-ug-border-hi">
            <LogOut size={20} /> {exitLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
