import { useCallback, useState, type ReactNode } from 'react'
import { Flame, Home, LogOut, Minus, RotateCcw, Skull, TriangleAlert, Trophy, Wrench, X, type LucideIcon } from 'lucide-react'
import { GameLogo } from '../../../shared/components/GameLogo'
import { useAuth } from '../../Auth/context/authContext'
import type { MatchEndReason, MatchSlotStats, Slot } from '../../../shared/lib/contracts'
import { MAPS, getSurvivor } from '../../Lobby/data/catalog'
import { SPRITE_MASK } from '../../Lobby/data/slotTheme'
import { formatTime } from '../hud'
import { MatchXpReward } from './MatchXpReward'
import { ResultsDialog } from './ResultsDialog'

export interface ResultsSummary {
  /** null = draw. */
  winner: Slot | null
  reason: MatchEndReason
  durationS: number
  mapId: string
  mapName?: string
  stats: Record<Slot, MatchSlotStats>
}

export interface ResultsPlayer {
  name: string
  survivor: string
}

export interface MatchResultsScreenProps {
  mySlot: Slot
  roomCode: string
  players: Partial<Record<Slot, ResultsPlayer>>
  summary: ResultsSummary
  /** XP earned by the local player (signed-in players only). */
  xp?: number
  /** False when the rival left the room: a rematch is impossible. */
  rivalPresent: boolean
  /** Slots currently asking for a rematch. */
  rematchRequested: number[]
  onRematch: () => void
  onCancelRematch: () => void
  onBackToLobby: () => void | Promise<void>
  onLeave: () => void | Promise<void>
}

type Outcome = 'victory' | 'defeat' | 'draw'

const SLOTS: Slot[] = [1, 2]

// Player 1 = blue, player 2 = red (same as their bases on the map).
const TONE: Record<Slot, { text: string; border: string; glow: string; tint: string; badge: string; head: string }> = {
  1: {
    text: 'text-[#4d9bff]',
    border: 'border-[#2f6fd6]',
    glow: 'shadow-[0_0_24px_rgb(47_111_214/0.4),inset_0_0_0_2px_rgb(0_0_0/0.5)]',
    tint: 'from-[#1d4a96]/45',
    badge: 'border-[#4d9bff] bg-[#12305e]',
    head: 'bg-[#1d5fc4]/25',
  },
  2: {
    text: 'text-ug-red-hi',
    border: 'border-ug-red-hi',
    glow: 'shadow-[0_0_24px_rgb(255_42_47/0.35),inset_0_0_0_2px_rgb(0_0_0/0.5)]',
    tint: 'from-[#8c0d12]/45',
    badge: 'border-ug-red-hi bg-[#6e0b0f]',
    head: 'bg-[#b3141a]/25',
  },
}

const TITLE: Record<Outcome, { text: string; color: string; shadow: string }> = {
  victory: { text: 'VICTORIA', color: '#8fd3ff', shadow: '3px 3px 0 #0a2a55, 0 0 24px rgb(80 170 255 / 0.65)' },
  defeat: { text: 'DERROTA', color: '#ff2a2f', shadow: '3px 3px 0 #5b070a, 0 0 24px rgb(255 30 40 / 0.5)' },
  draw: { text: 'EMPATE', color: '#facc15', shadow: '3px 3px 0 #4a3a05, 0 0 24px rgb(250 204 21 / 0.35)' },
}

/** Subtitle + footer sentence for every outcome / reason combination. */
function resultCopy(outcome: Outcome, reason: MatchEndReason): { subtitle: string; footer: string } {
  if (outcome === 'draw') {
    return { subtitle: 'Tiempo agotado sin ganador', footer: 'Ningún núcleo cayó. La revancha decide quién manda.' }
  }
  if (outcome === 'victory') {
    if (reason === 'opponent_left') return { subtitle: 'El rival abandonó la partida', footer: 'Ganas por abandono. El resultado se conserva.' }
    if (reason === 'time_out') return { subtitle: 'Tiempo agotado: tu núcleo resistió más', footer: 'Tu núcleo terminó con más vida que el del rival.' }
    return { subtitle: 'Destruiste el núcleo enemigo', footer: 'Tu base resistió las oleadas y destruyó el núcleo rival.' }
  }
  if (reason === 'time_out') return { subtitle: 'Tiempo agotado: el rival resistió más', footer: 'Refuerza tu estrategia para la próxima partida.' }
  return { subtitle: 'Tu núcleo fue destruido', footer: 'El rival destruyó tu núcleo. Refuerza tu estrategia para la próxima partida.' }
}

const STAT_ROWS: { key: 'zombieKills' | 'structuresBuilt' | 'coreDamageDealt'; label: string; icon: LucideIcon; testId: string }[] = [
  { key: 'zombieKills', label: 'Zombis eliminados', icon: Skull, testId: 'zombies' },
  { key: 'structuresBuilt', label: 'Estructuras construidas', icon: Wrench, testId: 'structures' },
  { key: 'coreDamageDealt', label: 'Daño al núcleo', icon: Flame, testId: 'core-damage' },
]

function Spinner() {
  return <span className="size-6 shrink-0 animate-spin rounded-full border-4 border-ug-border border-t-ug-text motion-reduce:animate-none short:size-5" aria-hidden />
}

function TeamPanel({ slot, isMe, player, outcome }: { slot: Slot; isMe: boolean; player?: ResultsPlayer; outcome: Outcome }) {
  const t = TONE[slot]
  const survivor = getSurvivor(player?.survivor ?? '')
  const color = slot === 1 ? 'azul' : 'rojo'
  const myOutcome: Outcome = outcome === 'draw' ? 'draw' : (outcome === 'victory') === isMe ? 'victory' : 'defeat'
  const BadgeIcon = myOutcome === 'victory' ? Trophy : myOutcome === 'defeat' ? Skull : Minus
  const badgeText = myOutcome === 'victory' ? 'GANADOR' : myOutcome === 'defeat' ? 'DERROTA' : 'EMPATE'
  const core = myOutcome === 'defeat' ? `nucleo-${color}-destruido` : `nucleo-${color}`

  return (
    <section
      data-testid={`results-team-${slot}`}
      data-outcome={myOutcome}
      className={`relative flex min-h-0 flex-1 flex-col overflow-hidden border-2 ${t.border} ${t.glow} bg-gradient-to-b ${t.tint} via-[#0d1522]/85 to-[#0b0f17]/95 ${myOutcome === 'defeat' ? 'saturate-[0.7]' : ''}`}
    >
      <header className={`relative z-10 min-w-0 px-[clamp(0.5rem,1.8vmin,1rem)] py-[clamp(0.25rem,1vmin,0.625rem)] ${t.head}`}>
        <p className={`text-[clamp(0.9rem,2.2vmin,1.125rem)] leading-none tracking-wider ${t.text}`}>
          BASE {slot} · {isMe ? 'TÚ' : 'RIVAL'}
        </p>
        <div className="mt-1 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <p className="ug-title-shadow min-w-0 max-w-full truncate text-[clamp(1.25rem,3.6vmin,2rem)] leading-none" data-testid={`results-name-${slot}`}>
            {player?.name ?? `Jugador ${slot}`}
          </p>
          <span
            className={`flex shrink-0 items-center gap-1 border px-1.5 py-0.5 text-[clamp(0.85rem,2vmin,1.1rem)] leading-none text-white ${t.badge}`}
            data-testid={`results-badge-${slot}`}
          >
            <BadgeIcon size={14} aria-hidden /> {badgeText}
          </span>
        </div>
        <p className="mt-1 truncate font-terminal text-[clamp(0.85rem,2vmin,1.1rem)] leading-none text-ug-muted short:hidden">
          {survivor.name}: {survivor.tagline}
        </p>
      </header>
      <div className="relative min-h-0 flex-1">
        <img
          src={`/assets/game/objetos/${core}.png`}
          alt=""
          draggable={false}
          className="pixelated absolute right-[2%] bottom-[4%] h-[72%] max-h-full w-auto object-contain"
        />
        {survivor.sprite && (
          <img
            src={survivor.sprite}
            alt={survivor.name}
            draggable={false}
            className="pixelated absolute bottom-0 left-0 h-full max-h-full w-auto object-contain"
            style={{ maskImage: SPRITE_MASK, WebkitMaskImage: SPRITE_MASK }}
          />
        )}
      </div>
    </section>
  )
}

function ResultButton({
  icon: Icon,
  label,
  onClick,
  primary,
  disabled,
  pulse,
  testId,
  id,
  className = '',
}: {
  icon: LucideIcon
  label: string
  onClick: () => void
  primary?: boolean
  disabled?: boolean
  pulse?: boolean
  testId: string
  id?: string
  className?: string
}) {
  const base =
    'flex min-w-0 items-center justify-center gap-2 px-3 py-[clamp(0.25rem,1.4vmin,0.625rem)] text-[clamp(1.1rem,3vmin,1.625rem)] leading-none tracking-wide uppercase transition enabled:hover:-translate-y-0.5 enabled:active:translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50'
  const style = primary
    ? 'border-2 border-ug-red-hi bg-gradient-to-b from-[#d0181f] to-[#8c0d12] text-white shadow-[inset_0_0_0_2px_rgb(0_0_0/0.35),0_4px_0_rgb(0_0_0/0.55)] enabled:hover:brightness-110'
    : 'ug-panel enabled:hover:border-ug-border-hi'
  return (
    <button id={id} type="button" onClick={onClick} disabled={disabled} data-testid={testId} className={`${base} ${style} ${pulse ? 'ug-pulse-ring' : ''} ${className}`}>
      <Icon size={20} aria-hidden className="shrink-0" />
      <span className="ug-title-shadow truncate">{label}</span>
    </button>
  )
}

function DialogButtons({ children }: { children: ReactNode }) {
  return <div className="mt-[clamp(0.5rem,2vmin,1rem)] grid grid-cols-2 gap-[clamp(0.375rem,1.5vmin,0.75rem)]">{children}</div>
}

export function MatchResultsScreen({
  mySlot,
  roomCode,
  players,
  summary,
  xp,
  rivalPresent,
  rematchRequested,
  onRematch,
  onCancelRematch,
  onBackToLobby,
  onLeave,
}: MatchResultsScreenProps) {
  const { user } = useAuth()
  const [dialog, setDialog] = useState<'lobby' | 'leave' | null>(null)
  const [busy, setBusy] = useState(false)
  const closeDialog = useCallback(() => setDialog(null), [])

  const rivalSlot: Slot = mySlot === 1 ? 2 : 1
  const outcome: Outcome = summary.winner === null ? 'draw' : summary.winner === mySlot ? 'victory' : 'defeat'
  const title = TITLE[outcome]
  const copy = resultCopy(outcome, summary.reason)
  const mapName = summary.mapName ?? MAPS.find((m) => m.id === summary.mapId)?.name ?? MAPS[0].name
  const mapPreview = (MAPS.find((m) => m.id === summary.mapId) ?? MAPS[0]).preview

  const iAsked = rematchRequested.includes(mySlot)
  const rivalAsked = rematchRequested.includes(rivalSlot)
  const canRematch = rivalPresent && summary.reason !== 'opponent_left'
  const waiting = iAsked && canRematch
  const mySurvivor = getSurvivor(players[mySlot]?.survivor ?? '')
  const rivalSurvivor = getSurvivor(players[rivalSlot]?.survivor ?? '')

  const confirm = async (fn: () => void | Promise<void>) => {
    if (busy) return
    setBusy(true)
    try {
      await fn()
    } finally {
      setBusy(false)
      setDialog(null)
    }
  }

  const footerText = !canRematch ? 'Revancha no disponible: el rival salió de la sala.' : rivalAsked && !iAsked ? 'El rival quiere la revancha.' : copy.footer
  const footerTestId = !canRematch ? 'rematch-hint' : rivalAsked && !iAsked ? 'rematch-rival-asked' : 'results-footer'

  return (
    <div
      className="ug-results fixed inset-0 z-40 overflow-hidden bg-ug-bg"
      data-testid="match-end"
      data-winner={summary.winner ?? 0}
      data-outcome={outcome}
    >
      <div
        aria-hidden
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            outcome === 'victory'
              ? "linear-gradient(rgb(5 12 28 / 0.5), rgb(5 7 12 / 0.82)), url('/assets/lobby/background.jpg')"
              : outcome === 'defeat'
                ? "linear-gradient(rgb(40 6 8 / 0.5), rgb(5 7 12 / 0.82)), url('/assets/lobby/background.jpg')"
                : "linear-gradient(rgb(5 7 12 / 0.55), rgb(5 7 12 / 0.82)), url('/assets/lobby/background.jpg')",
        }}
      />

      <div
        // The dialogs live outside this tree; while one is open nothing behind it is reachable.
        inert={dialog !== null || waiting}
        className="ug-results-in relative mx-auto flex h-full w-full max-w-[1500px] min-h-0 flex-col gap-[var(--ug-r-gap)] p-[max(0.5rem,env(safe-area-inset-top))_max(0.5rem,env(safe-area-inset-right))_max(0.5rem,env(safe-area-inset-bottom))_max(0.5rem,env(safe-area-inset-left))] lg:px-6"
      >
        {/* Header: logo, room info, map preview */}
        <header className="relative flex justify-center">
          <div className="absolute top-0 left-0 hidden lg:block short:hidden">
            <GameLogo size="sm" />
          </div>
          <div className="min-w-0">
            <p className="ug-title-shadow text-center text-[clamp(1.25rem,3.2vmin,1.875rem)] leading-none tracking-widest">RESULTADO FINAL</p>
            <dl className="ug-panel mt-1 flex items-center divide-x divide-ug-border font-terminal text-[clamp(0.95rem,2.2vmin,1.25rem)] leading-none">
              <div className="px-[clamp(0.5rem,2vmin,1rem)] py-1 text-center">
                <dt className="inline text-ug-muted">Sala: </dt>
                <dd className="inline" data-testid="results-room">{roomCode}</dd>
              </div>
              <div className="min-w-0 px-[clamp(0.5rem,2vmin,1rem)] py-1 text-center">
                <dt className="inline text-ug-muted">Mapa: </dt>
                <dd className="inline" data-testid="results-map">{mapName}</dd>
              </div>
              <div className="px-[clamp(0.5rem,2vmin,1rem)] py-1 text-center">
                <dt className="inline text-ug-muted">Duración: </dt>
                <dd className="inline" data-testid="results-duration">{formatTime(summary.durationS)}</dd>
              </div>
            </dl>
          </div>
          <img
            src={mapPreview}
            alt=""
            draggable={false}
            className="pixelated ug-panel absolute top-0 right-0 hidden h-[clamp(4rem,12vh,7rem)] w-auto border-ug-border-hi object-cover lg:block short:hidden"
          />
        </header>

        {/* Result title */}
        <div className="text-center" data-testid="results-title" role="status">
          <h2
            className="text-[clamp(2.25rem,min(14vw,12vh),5rem)] leading-[0.95] tracking-wide"
            style={{ color: title.color, textShadow: title.shadow }}
            data-testid="results-outcome"
          >
            {title.text}
          </h2>
          <p className="ug-title-shadow mt-0.5 text-[clamp(1.1rem,2.8vmin,1.75rem)] leading-none" data-testid="results-subtitle">
            {copy.subtitle}
          </p>
        </div>

        {/* Team panels + stats */}
        <main className="ug-results-main">
          <div className="ug-results-p1 flex min-h-0 flex-col">
            <TeamPanelSlot slot={1} mySlot={mySlot} players={players} outcome={outcome} />
          </div>
          <div className="ug-results-p2 flex min-h-0 flex-col">
            <TeamPanelSlot slot={2} mySlot={mySlot} players={players} outcome={outcome} />
          </div>
          <div className="ug-results-stats flex flex-col gap-[var(--ug-r-gap)]">
            <table className="ug-panel w-full table-fixed border-separate border-spacing-0 text-left" data-testid="results-stats">
              <caption className="sr-only">Estadísticas de la partida</caption>
              <thead>
                <tr className="text-[clamp(0.95rem,2.2vmin,1.25rem)] leading-none">
                  <th scope="col" className="bg-black/30 px-2 py-1.5 font-normal tracking-wide">ESTADÍSTICA</th>
                  {SLOTS.map((slot) => (
                    <th
                      key={slot}
                      scope="col"
                      className={`w-[22%] px-1 py-1.5 text-center font-normal ${slot === mySlot ? 'bg-[#1d5fc4]/30 text-[#4d9bff]' : 'bg-ug-red-dark/50 text-ug-red-hi'}`}
                      data-testid={`results-col-${slot === mySlot ? 'me' : 'rival'}`}
                    >
                      {slot === mySlot ? 'TÚ' : 'RIVAL'}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {STAT_ROWS.map((row) => (
                  <tr key={row.key} data-testid={`stat-${row.testId}`}>
                    <th scope="row" className="border-t border-ug-border px-2 py-[clamp(0.125rem,0.8vmin,0.375rem)] text-left font-terminal text-[clamp(0.95rem,2.3vmin,1.25rem)] leading-[1.05] font-normal">
                      <span className="flex items-center gap-2">
                        <row.icon size={18} className="shrink-0 text-ug-muted max-sm:hidden" aria-hidden />
                        <span className="min-w-0">{row.label}</span>
                      </span>
                    </th>
                    {SLOTS.map((slot) => (
                      <td
                        key={slot}
                        className={`border-t border-ug-border px-1 text-center text-[clamp(1.4rem,4.2vmin,2.25rem)] leading-none ${TONE[slot].text}`}
                        data-testid={`stat-${row.testId}-${slot === mySlot ? 'me' : 'rival'}`}
                      >
                        {Math.round(summary.stats[slot]?.[row.key] ?? 0)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {user && typeof xp === 'number' && xp > 0 && <MatchXpReward gained={xp} />}
          </div>
        </main>

        {/* Footer: sentence + actions */}
        <footer className="mx-auto flex w-full max-w-[46rem] flex-col gap-[var(--ug-r-gap)]">
          <p
            className={`ug-panel px-3 py-1 text-center font-terminal text-[clamp(0.95rem,2.2vmin,1.25rem)] leading-tight short:hidden ${!canRematch ? 'text-yellow-400' : rivalAsked && !iAsked ? 'text-ug-green' : ''}`}
            data-testid={footerTestId}
          >
            {footerText}
          </p>
          <div className="grid grid-cols-2 gap-[var(--ug-r-gap)] sm:grid-cols-[1.1fr_1fr_0.8fr]">
            <ResultButton
              primary
              icon={RotateCcw}
              label="Revancha"
              testId="rematch-button"
              disabled={!canRematch || iAsked}
              pulse={canRematch && rivalAsked && !iAsked}
              onClick={onRematch}
              className="max-sm:col-span-2"
            />
            <ResultButton icon={Home} label="Volver al lobby" testId="back-to-lobby" onClick={() => setDialog('lobby')} />
            <ResultButton icon={LogOut} label="Salir" testId="leave-room" onClick={() => setDialog('leave')} />
          </div>
        </footer>
      </div>

      {waiting && (
        <ResultsDialog title="Revancha solicitada" onCancel={onCancelRematch} testId="rematch-modal" initialFocusId="rematch-cancel" describedBy="rematch-desc" dismissOnBackdrop={false}>
          <h3 className="ug-title-shadow text-center text-[clamp(1.5rem,4.5vmin,2.25rem)] leading-none tracking-wide">REVANCHA SOLICITADA</h3>
          <p id="rematch-desc" className="mt-1 text-center font-terminal text-[clamp(1rem,2.6vmin,1.25rem)] leading-tight text-ug-muted">
            Esperando la respuesta del rival...
          </p>
          <ul className="mt-[clamp(0.5rem,2vmin,1rem)] flex flex-col gap-2">
            {[
              { slot: mySlot, name: players[mySlot]?.name ?? 'Tú', portrait: mySurvivor.portrait, ready: true, testId: 'rematch-me' },
              { slot: rivalSlot, name: players[rivalSlot]?.name ?? 'Rival', portrait: rivalSurvivor.portrait, ready: rivalAsked, testId: 'rematch-rival' },
            ].map((row) => (
              <li
                key={row.slot}
                data-testid={row.testId}
                data-ready={row.ready}
                className={`flex items-center gap-3 border-2 bg-black/40 p-1.5 ${TONE[row.slot].border}`}
              >
                <img src={row.portrait} alt="" draggable={false} className="pixelated size-[clamp(2.5rem,8vmin,3.5rem)] shrink-0 border border-ug-border" />
                <div className="min-w-0 flex-1">
                  <p className="ug-title-shadow truncate text-[clamp(1.1rem,3vmin,1.5rem)] leading-none">{row.name}</p>
                  <p className={`mt-0.5 flex items-center gap-1.5 font-terminal text-[clamp(0.95rem,2.4vmin,1.2rem)] leading-none ${row.ready ? 'text-ug-green' : 'text-ug-muted'}`}>
                    <span className={`size-2.5 shrink-0 rounded-full ${row.ready ? 'bg-ug-green' : 'border-2 border-ug-muted'}`} aria-hidden />
                    {row.ready ? 'Listo' : 'Esperando'}
                  </p>
                </div>
                {!row.ready && <Spinner />}
              </li>
            ))}
          </ul>
          <div className="mt-[clamp(0.5rem,2vmin,1rem)] flex justify-center">
            <button
              id="rematch-cancel"
              type="button"
              onClick={onCancelRematch}
              data-testid="rematch-cancel"
              className="ug-panel px-4 py-1.5 text-[clamp(1.1rem,2.8vmin,1.5rem)] leading-none tracking-wide hover:border-ug-border-hi"
            >
              CANCELAR SOLICITUD
            </button>
          </div>
        </ResultsDialog>
      )}

      {dialog === 'lobby' && (
        <ResultsDialog title="¿Volver al lobby?" onCancel={closeDialog} testId="confirm-lobby" initialFocusId="confirm-lobby-ok" describedBy="confirm-lobby-desc">
          <div className="flex items-center gap-3">
            <TriangleAlert className="size-[clamp(2.5rem,9vmin,4rem)] shrink-0 text-ug-red-hi" aria-hidden />
            <div className="min-w-0">
              <h3 className="ug-title-shadow text-[clamp(1.5rem,4.5vmin,2.25rem)] leading-none tracking-wide">¿VOLVER AL LOBBY?</h3>
              <p id="confirm-lobby-desc" className="mt-1 font-terminal text-[clamp(1rem,2.6vmin,1.25rem)] leading-tight text-ug-muted">
                Dejarás esta pantalla de resultados para regresar a la sala.
              </p>
            </div>
          </div>
          <p className="mt-[clamp(0.5rem,2vmin,1rem)] border-t border-ug-border pt-2 text-center font-terminal text-[clamp(1rem,2.6vmin,1.25rem)] leading-none">
            <span className="text-ug-muted">Sala: </span>
            {roomCode}
          </p>
          <DialogButtons>
            <ResultButton primary icon={Home} label="Volver al lobby" id="confirm-lobby-ok" testId="confirm-lobby-ok-btn" disabled={busy} onClick={() => void confirm(onBackToLobby)} className="[&]:text-[clamp(1rem,2.6vmin,1.375rem)]" />
            <ResultButton icon={X} label="Cancelar" testId="confirm-lobby-cancel" onClick={closeDialog} className="[&]:text-[clamp(1rem,2.6vmin,1.375rem)]" />
          </DialogButtons>
        </ResultsDialog>
      )}

      {dialog === 'leave' && (
        <ResultsDialog title="¿Salir de la sala?" onCancel={closeDialog} testId="confirm-leave" initialFocusId="confirm-leave-cancel" describedBy="confirm-leave-desc">
          <h3 className="ug-title-shadow text-center text-[clamp(1.5rem,4.5vmin,2.25rem)] leading-none tracking-wide">¿SALIR DE LA SALA?</h3>
          <p id="confirm-leave-desc" className="mt-1 text-center font-terminal text-[clamp(1rem,2.6vmin,1.25rem)] leading-tight text-ug-muted">
            Volverás al menú principal.
            <br />
            El resultado de esta partida se conservará.
          </p>
          <DialogButtons>
            <ResultButton icon={X} label="Cancelar" id="confirm-leave-cancel" testId="confirm-leave-cancel" onClick={closeDialog} className="[&]:text-[clamp(1rem,2.6vmin,1.375rem)]" />
            <ResultButton primary icon={LogOut} label="Salir" testId="confirm-leave-ok-btn" disabled={busy} onClick={() => void confirm(onLeave)} className="[&]:text-[clamp(1rem,2.6vmin,1.375rem)]" />
          </DialogButtons>
        </ResultsDialog>
      )}
    </div>
  )
}

function TeamPanelSlot({ slot, mySlot, players, outcome }: { slot: Slot; mySlot: Slot; players: Partial<Record<Slot, ResultsPlayer>>; outcome: Outcome }) {
  return <TeamPanel slot={slot} isMe={slot === mySlot} player={players[slot]} outcome={outcome} />
}
