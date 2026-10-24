import type { LucideIcon } from 'lucide-react'

interface MenuButtonProps {
  icon: LucideIcon
  title: string
  subtitle: string
  primary?: boolean
  size?: 'lg' | 'sm'
  onClick: () => void
  testId?: string
  /** Small count bubble (e.g. rewards ready to claim). Hidden when 0. */
  badge?: number
}

const SIZES = {
  lg: { icon: 34, primaryIcon: 40, box: 'size-12', primaryBox: 'size-14', title: 'text-3xl', primaryTitle: 'text-4xl', sub: 'text-xl', pad: 'py-2.5' },
  sm: { icon: 28, primaryIcon: 30, box: 'size-10', primaryBox: 'size-10', title: 'text-2xl', primaryTitle: 'text-2xl', sub: 'text-lg', pad: 'py-2' },
}

export function MenuButton({ icon: Icon, title, subtitle, primary, size = 'lg', onClick, testId, badge }: MenuButtonProps) {
  const s = SIZES[size]

  if (primary) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        aria-current={size === 'sm' ? 'page' : undefined}
        className={`group relative flex w-full items-center gap-4 border-2 border-ug-red-hi bg-gradient-to-b from-[#d0181f] to-[#8c0d12] px-4 ${size === 'lg' ? 'py-3 lg:w-[108%]' : s.pad} text-left shadow-[0_0_24px_rgb(255_30_40/0.35),inset_0_0_0_2px_rgb(0_0_0/0.35),0_4px_0_rgb(0_0_0/0.55)] transition-transform hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5`}
      >
        <span className={`grid ${s.primaryBox} shrink-0 place-items-center ${size === 'lg' ? 'bg-black/25' : ''}`}>
          <Icon size={s.primaryIcon} fill={size === 'lg' ? 'currentColor' : 'none'} className="text-white" />
        </span>
        <span>
          <span className={`ug-title-shadow block ${s.primaryTitle} leading-none tracking-wide text-white uppercase`}>{title}</span>
          <span className={`mt-1 block font-terminal ${s.sub} leading-none text-white/90`}>{subtitle}</span>
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`ug-panel group flex w-full items-center gap-4 px-4 ${s.pad} text-left transition hover:-translate-y-0.5 hover:border-ug-border-hi active:translate-y-0.5`}
    >
      <span className={`grid ${s.box} shrink-0 place-items-center text-ug-text`}>
        <Icon size={s.icon} />
      </span>
      <span>
        <span className={`ug-title-shadow block ${s.title} leading-none tracking-wide text-ug-text uppercase`}>
          {title}
        </span>
        <span className={`mt-1 block font-terminal ${s.sub} leading-none text-ug-muted`}>{subtitle}</span>
      </span>
      {badge ? (
        <span className="ml-auto grid min-w-7 place-items-center border-2 border-yellow-400 bg-yellow-400/20 px-1 font-terminal text-xl leading-none text-yellow-400" data-testid={testId && `${testId}-badge`}>
          {badge}
        </span>
      ) : null}
    </button>
  )
}
