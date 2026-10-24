import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { PixelModal } from '../../../shared/components/PixelModal'
import { authApi, type MeDto } from '../../../shared/lib/authApi'
import { useAuth } from '../../Auth/context/authContext'

interface ProfileModalProps {
  open: boolean
  onClose: () => void
}

const pct = (n: number, total: number) => (total > 0 ? `${Math.round((n / total) * 100)}%` : '—')

function formatPlaytime(seconds: number) {
  const m = Math.floor(seconds / 60)
  if (m < 60) return `${m} min`
  return `${Math.floor(m / 60)} h ${m % 60} min`
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="border-2 border-ug-border bg-black/30 px-2 py-1.5 text-center">
      <p className="ug-title-shadow text-2xl leading-none">{value}</p>
      <p className="font-terminal text-sm leading-tight text-ug-muted">{label}</p>
    </div>
  )
}

/** Perfil del jugador con sesión: estadísticas guardadas en el servidor y cerrar sesión. */
export function ProfileModal({ open, onClose }: ProfileModalProps) {
  const { user, logout } = useAuth()
  const [me, setMe] = useState<MeDto | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    authApi
      .me()
      .then((data) => {
        if (cancelled) return
        setMe(data)
        setError(null)
      })
      .catch((e: Error) => !cancelled && setError(e.message))
    return () => {
      cancelled = true
    }
  }, [open])

  const s = me?.stats
  const kdr = s ? (s.playerKills / Math.max(s.deaths, 1)).toFixed(2) : '—'

  const signOut = () => {
    logout()
    onClose()
  }

  return (
    <PixelModal open={open} title="Perfil" onClose={onClose} testId="profile-modal">
      <div className="flex items-center gap-3">
        <img src="/assets/home/avatar.png" alt="" className="pixelated size-14 border-2 border-ug-border object-cover" />
        <div className="min-w-0">
          <p className="ug-title-shadow truncate text-3xl leading-none" data-testid="profile-name">
            {me?.displayName ?? user?.name}
          </p>
          <p className="truncate font-terminal text-base text-ug-muted">{me?.email ?? user?.email}</p>
          {me?.profile && <p className="font-terminal text-base text-ug-muted">Nivel {me.profile.level}</p>}
        </div>
      </div>

      <h3 className="ug-title-shadow mt-4 mb-2 text-xl tracking-wide">ESTADÍSTICAS</h3>
      {error && <p className="font-terminal text-lg text-ug-red-hi">{error}</p>}
      {!error && !me && <p className="font-terminal text-lg text-ug-muted">Cargando…</p>}
      {me && !s && <p className="font-terminal text-lg text-ug-muted">Aún no has jugado partidas.</p>}
      {s && (
        <div className="grid grid-cols-3 gap-2" data-testid="profile-stats">
          <Stat label="Partidas" value={s.matchesPlayed} />
          <Stat label="Victorias" value={s.wins} />
          <Stat label="Derrotas" value={s.losses} />
          <Stat label="% Victorias" value={pct(s.wins, s.matchesPlayed)} />
          <Stat label="Kills" value={s.playerKills} />
          <Stat label="KDR" value={kdr} />
          <Stat label="Zombis" value={s.zombiesKilled} />
          <Stat label="Núcleos" value={s.coresDestroyed} />
          <Stat label="Estructuras" value={s.structuresBuilt} />
          <Stat label="Muertes" value={s.deaths} />
          <Stat label="Mejor racha" value={s.bestStreak} />
          <Stat label="Tiempo" value={formatPlaytime(s.totalPlaytimeS)} />
        </div>
      )}

      <button
        type="button"
        onClick={signOut}
        data-testid="logout"
        className="mt-5 flex w-full items-center justify-center gap-2 border-2 border-ug-red-hi bg-ug-red-dark/60 py-2 text-2xl hover:bg-ug-red-dark"
      >
        <LogOut size={20} /> Cerrar sesión
      </button>
    </PixelModal>
  )
}
