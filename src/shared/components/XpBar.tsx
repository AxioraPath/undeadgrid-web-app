import { useEffect, useRef, useState } from 'react'

interface XpBarProps {
  level: number
  /** Progress within the current level. */
  xp: number
  xpToNext: number
  /** Compact variant: fixed width, smaller text (Home profile card). */
  compact?: boolean
  testId?: string
}

const percent = (xp: number, xpToNext: number) =>
  xpToNext > 0 ? Math.max(0, Math.min(100, (xp / xpToNext) * 100)) : 0

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * "Nv. N" label + pixel XP bar. Fill changes animate; when the level goes up the
 * bar first fills to 100%, then restarts from 0 at the new level.
 */
export function XpBar({ level, xp, xpToNext, compact, testId }: XpBarProps) {
  const target = percent(xp, xpToNext)
  const [shown, setShown] = useState({ level, pct: target, instant: false })
  const shownLevel = useRef(level)

  useEffect(() => {
    const timers: number[] = []
    if (level > shownLevel.current && !prefersReducedMotion()) {
      // Fill up the old level, then restart at the new one.
      setShown((s) => ({ ...s, pct: 100, instant: false }))
      timers.push(
        window.setTimeout(() => {
          shownLevel.current = level
          setShown({ level, pct: 0, instant: true })
          timers.push(window.setTimeout(() => setShown({ level, pct: target, instant: false }), 50))
        }, 850),
      )
    } else {
      shownLevel.current = level
      setShown({ level, pct: target, instant: false })
    }
    return () => timers.forEach((t) => window.clearTimeout(t))
  }, [level, target])

  return (
    <div data-testid={testId} className="min-w-0">
      <div className="flex items-baseline justify-between gap-2 font-terminal leading-none">
        <span className={`ug-title-shadow ${compact ? 'text-lg' : 'text-xl'} text-ug-accent`} data-testid={testId && `${testId}-level`}>
          Nv. {shown.level}
        </span>
        <span className={`${compact ? 'text-base' : 'text-lg'} text-ug-muted`} data-testid={testId && `${testId}-text`}>
          {xp} / {xpToNext} XP
        </span>
      </div>
      <div
        className={`mt-1 border-2 border-ug-border bg-black/60 ${compact ? 'h-3' : 'h-4'}`}
        role="progressbar"
        aria-label="Experiencia"
        aria-valuemin={0}
        aria-valuemax={xpToNext}
        aria-valuenow={xp}
      >
        <div
          className={`h-full bg-ug-accent shadow-[inset_0_-3px_0_rgb(0_0_0/0.25)] ${shown.instant ? '' : 'ug-xp-fill'}`}
          style={{ width: `${shown.pct}%` }}
        />
      </div>
    </div>
  )
}
