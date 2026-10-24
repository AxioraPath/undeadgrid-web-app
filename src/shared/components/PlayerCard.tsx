interface PlayerCardProps {
  name: string
  level: number
  xp: number
  xpToNext: number
}

export function PlayerCard({ name, level, xp, xpToNext }: PlayerCardProps) {
  const pct = Math.min(100, Math.round((xp / xpToNext) * 100))

  return (
    <div className="ug-panel flex items-center gap-3 p-2 pr-4" data-testid="player-card">
      <img
        src="/assets/home/avatar.png"
        alt=""
        className="pixelated size-12 border-2 border-ug-border object-cover sm:size-16"
      />
      <div className="min-w-0 flex-1">
        <p className="ug-title-shadow truncate text-2xl leading-none">{name}</p>
        <p className="font-terminal text-lg leading-tight text-ug-muted">Nivel {level}</p>
        <div className="relative mt-1 h-5 w-36 border-2 border-ug-border bg-black/60 sm:w-56">
          <div className="h-full bg-ug-accent/80" style={{ width: `${pct}%` }} />
          <span className="absolute inset-0 flex items-center justify-end pr-2 font-terminal text-base leading-none">
            {xp} / {xpToNext} XP
          </span>
        </div>
      </div>
    </div>
  )
}
