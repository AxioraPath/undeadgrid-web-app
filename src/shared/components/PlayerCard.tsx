import { XpBar } from './XpBar'

interface PlayerCardProps {
  name: string
  /** Omit while the profile is still loading: the XP bar is hidden instead of flashing defaults. */
  level?: number
  xp?: number
  xpToNext?: number
}

export function PlayerCard({ name, level, xp, xpToNext }: PlayerCardProps) {
  return (
    <div className="ug-panel flex items-center gap-3 p-2 pr-4 phone:gap-2 phone:p-1.5 phone:pr-3" data-testid="player-card">
      <img
        src="/assets/home/avatar.png"
        alt=""
        className="pixelated size-12 border-2 border-ug-border object-cover sm:size-16 phone:size-10"
      />
      <div className="min-w-0 flex-1">
        <p className="ug-title-shadow truncate text-2xl leading-none">{name}</p>
        {level !== undefined && xp !== undefined && xpToNext !== undefined && (
          <div className="mt-1 w-36 sm:w-52 phone:w-32">
            <XpBar level={level} xp={xp} xpToNext={xpToNext} compact testId="home-xp" />
          </div>
        )}
      </div>
    </div>
  )
}
