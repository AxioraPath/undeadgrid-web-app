import { useEffect, useState } from 'react'
import { XpBar } from '../../../shared/components/XpBar'
import { LevelUpBanner } from '../../../shared/components/LevelUpBanner'
import { useAuth, type UserProfile } from '../../Auth/context/authContext'

/** "+N XP" with the bar going from the pre-match value to the refreshed profile, plus level-up banner. */
export function MatchXpReward({ gained }: { gained: number }) {
  const { user, refreshProfile } = useAuth()
  // Profile as it was when the screen opened (before the post-match refresh).
  const [before] = useState<UserProfile | null>(() => user?.profile ?? null)
  const [refreshed, setRefreshed] = useState(false)

  useEffect(() => {
    let cancelled = false
    refreshProfile().finally(() => !cancelled && setRefreshed(true))
    return () => {
      cancelled = true
    }
  }, [refreshProfile])

  const shown = refreshed ? (user?.profile ?? before) : before
  const leveledUp = Boolean(before && refreshed && user?.profile && user.profile.level > before.level)

  return (
    <div className="ug-panel flex items-center gap-3 px-3 py-1.5 text-left short:py-1" data-testid="match-xp">
      <p className="ug-title-shadow shrink-0 text-[clamp(1.5rem,5vmin,2rem)] leading-none text-yellow-400" data-testid="match-xp-gained">
        +{gained} XP
      </p>
      {shown && (
        <div className="min-w-0 flex-1">
          <XpBar level={shown.level} xp={shown.xp} xpToNext={shown.xpToNext} compact testId="match-xp-bar" />
        </div>
      )}
      {leveledUp && user?.profile && <LevelUpBanner level={user.profile.level} floating />}
    </div>
  )
}
