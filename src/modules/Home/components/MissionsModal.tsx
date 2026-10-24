import { useCallback, useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { PixelModal } from '../../../shared/components/PixelModal'
import { XpBar } from '../../../shared/components/XpBar'
import { LevelUpBanner } from '../../../shared/components/LevelUpBanner'
import { authApi, type MissionDto, type MissionsResponse } from '../../../shared/lib/authApi'
import { useAuth } from '../../Auth/context/authContext'

interface MissionsModalProps {
  open: boolean
  onClose: () => void
  /** Reports how many missions are ready to claim (Home badge). */
  onClaimableChange?: (count: number) => void
}

/** "HH:MM" until the given ISO date (00:00 when already past). */
function formatCountdown(iso: string, now: number) {
  const ms = Math.max(0, new Date(iso).getTime() - now)
  const totalMin = Math.ceil(ms / 60000)
  const h = String(Math.floor(totalMin / 60)).padStart(2, '0')
  const m = String(totalMin % 60).padStart(2, '0')
  return `${h}:${m}`
}

function MissionRow({ mission, busy, onClaim }: { mission: MissionDto; busy: boolean; onClaim: () => void }) {
  const goal = Math.max(mission.goal, 1)
  const pct = Math.min(100, (mission.progress / goal) * 100)
  const claimed = mission.status === 'claimed'
  const claimable = mission.status === 'completed'

  return (
    <li
      className={`border-2 bg-black/30 p-2 ${claimable ? 'border-yellow-400' : 'border-ug-border'} ${claimed ? 'opacity-60' : ''}`}
      data-testid={`mission-${mission.key}`}
      data-status={mission.status}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="ug-title-shadow text-xl leading-none">{mission.title}</p>
          <p className="mt-0.5 font-terminal text-base leading-tight text-ug-muted">{mission.description}</p>
        </div>
        <span className="ug-title-shadow shrink-0 text-xl leading-none text-yellow-400">+{mission.reward} XP</span>
      </div>
      <div className="mt-2 flex items-center gap-2">
        <div className="relative h-4 flex-1 border-2 border-ug-border bg-black/60">
          <div className="h-full bg-ug-green/80" style={{ width: `${pct}%` }} />
          <span className="absolute inset-0 grid place-items-center font-terminal text-sm leading-none">
            {Math.min(mission.progress, mission.goal)} / {mission.goal}
          </span>
        </div>
        {claimed ? (
          <span
            className="flex w-24 shrink-0 items-center justify-center gap-1 font-terminal text-lg text-ug-green"
            data-testid={`mission-${mission.key}-done`}
          >
            <Check size="1rem" /> Hecha
          </span>
        ) : (
          <button
            type="button"
            disabled={!claimable || busy}
            onClick={onClaim}
            data-testid={`claim-${mission.key}`}
            className="w-24 shrink-0 border-2 border-yellow-400 bg-yellow-400/20 py-0.5 text-lg leading-none enabled:hover:bg-yellow-400/35 disabled:border-ug-border disabled:bg-transparent disabled:text-ug-muted"
          >
            Reclamar
          </button>
        )}
      </div>
    </li>
  )
}

/** Daily + permanent missions; claiming one grants XP and may level the player up. */
export function MissionsModal({ open, onClose, onClaimableChange }: MissionsModalProps) {
  const { user, applyProfile, refreshProfile } = useAuth()
  const [data, setData] = useState<MissionsResponse | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busyKey, setBusyKey] = useState<string | null>(null)
  const [levelUp, setLevelUp] = useState<{ level: number; id: number } | null>(null)
  const [now, setNow] = useState(() => Date.now())

  // Bumping this refetches the missions (after a claim or once the daily reset passes).
  const [reloadKey, setReloadKey] = useState(0)
  const reload = useCallback(() => setReloadKey((k) => k + 1), [])
  const resetsAtRef = useRef<string | null>(null)
  const levelUpId = useRef(0)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    authApi
      .getMissions()
      .then((res) => {
        if (cancelled) return
        resetsAtRef.current = res.dailyResetsAt
        setData(res)
        setError(null)
        onClaimableChange?.(res.missions.filter((m) => m.status === 'completed').length)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [open, reloadKey, onClaimableChange])

  useEffect(() => {
    if (open) void refreshProfile()
  }, [open, refreshProfile])

  // Countdown tick (minute resolution is enough); also reloads once the daily reset passes.
  useEffect(() => {
    if (!open) return
    const t = window.setInterval(() => {
      setNow(Date.now())
      const at = resetsAtRef.current
      if (at && new Date(at).getTime() <= Date.now()) reload()
    }, 15_000)
    return () => window.clearInterval(t)
  }, [open, reload])

  // Auto-hide the level-up toast.
  useEffect(() => {
    if (!levelUp) return
    const t = window.setTimeout(() => setLevelUp(null), 3300)
    return () => window.clearTimeout(t)
  }, [levelUp])

  const claim = async (key: string) => {
    setBusyKey(key)
    try {
      const res = await authApi.claimMission(key)
      applyProfile(res.profile)
      if (res.leveledUp) setLevelUp({ level: res.newLevel, id: ++levelUpId.current })
      reload()
    } catch (e) {
      setError((e as Error).message)
      reload()
    } finally {
      setBusyKey(null)
    }
  }

  const daily = data?.missions.filter((m) => m.type === 'daily') ?? []
  const milestones = data?.missions.filter((m) => m.type === 'milestone') ?? []

  return (
    <>
      <PixelModal open={open} title="Misiones" onClose={onClose} testId="missions-modal">
        {user?.profile && (
          <div className="mb-3">
            <XpBar level={user.profile.level} xp={user.profile.xp} xpToNext={user.profile.xpToNext} testId="missions-xp" />
          </div>
        )}
        {error && <p className="mb-2 font-terminal text-lg text-ug-red-hi">{error}</p>}
        {!data && !error && <p className="font-terminal text-lg text-ug-muted">Cargando…</p>}
        {data && (
          <>
            <div className="mb-2 flex items-baseline justify-between gap-2">
              <h3 className="ug-title-shadow text-xl tracking-wide">DIARIAS</h3>
              <span className="font-terminal text-base text-ug-muted" data-testid="missions-reset">
                Se reinician en {formatCountdown(data.dailyResetsAt, now)}
              </span>
            </div>
            <ul className="flex flex-col gap-2">
              {daily.map((m) => (
                <MissionRow key={m.key} mission={m} busy={busyKey !== null} onClaim={() => claim(m.key)} />
              ))}
            </ul>
            {milestones.length > 0 && (
              <>
                <h3 className="ug-title-shadow mt-4 mb-2 text-xl tracking-wide">PERMANENTES</h3>
                <ul className="flex flex-col gap-2">
                  {milestones.map((m) => (
                    <MissionRow key={m.key} mission={m} busy={busyKey !== null} onClaim={() => claim(m.key)} />
                  ))}
                </ul>
              </>
            )}
          </>
        )}
      </PixelModal>
      {levelUp && <LevelUpBanner key={levelUp.id} level={levelUp.level} floating />}
    </>
  )
}
