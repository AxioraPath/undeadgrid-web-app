import { ChevronsUp } from 'lucide-react'

/** "Subiste de nivel" banner. `floating` renders it as an auto-fading toast over the screen. */
export function LevelUpBanner({ level, floating }: { level: number; floating?: boolean }) {
  const body = (
    <div
      role="status"
      data-testid="level-up"
      className="ug-panel flex items-center justify-center gap-2 border-yellow-400 px-4 py-2 text-yellow-400"
    >
      <ChevronsUp size="1.625rem" />
      <span className="ug-title-shadow text-2xl leading-none">¡SUBISTE AL NIVEL {level}!</span>
    </div>
  )
  if (!floating) return body
  return (
    <div className="ug-level-pop pointer-events-none fixed inset-x-0 top-[max(1rem,env(safe-area-inset-top))] z-[60] flex justify-center px-4">
      {body}
    </div>
  )
}
