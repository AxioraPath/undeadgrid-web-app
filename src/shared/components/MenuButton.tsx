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
  lg: { icon: '2.125rem', primaryIcon: '2.5rem', box: 'size-12 phone:size-9', primaryBox: 'size-14 phone:size-10', title: 'text-3xl phone:text-2xl', primaryTitle: 'text-4xl phone:text-3xl', sub: 'text-xl phone:text-lg', pad: 'py-2.5' },
  sm: { icon: '1.75rem', primaryIcon: '1.875rem', box: 'size-10', primaryBox: 'size-10', title: 'text-2xl', primaryTitle: 'text-2xl', sub: 'text-lg', pad: 'py-2' },
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
        className={`group relative flex w-full items-center gap-4 phone:col-span-2 phone:gap-3 border-2 border-ug-red-hi bg-gradient-to-b from-[#d0181f] to-[#8c0d12] px-4 ${size === 'lg' ? 'py-3 phone:py-2 lg:w-[108%]' : s.pad} text-left shadow-[0_0_24px_rgb(255_30_40/0.35),inset_0_0_0_2px_rgb(0_0_0/0.35),0_4px_0_rgb(0_0_0/0.55)] transition-transform hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5`}
      >
        <span className={`grid ${s.primaryBox} shrink-0 place-items-center ${size === 'lg' ? 'bg-black/25' : ''}`}>
          <Icon size={s.primaryIcon} fill={size === 'lg' ? 'currentColor' : 'none'} className="text-white" />
        </span>
        <span className="min-w-0">
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
      className={`ug-panel group flex w-full items-center gap-4 phone:gap-2.5 px-4 phone:px-2.5 ${s.pad} phone:py-1.5 text-left transition hover:-translate-y-0.5 hover:border-ug-border-hi active:translate-y-0.5`}
    >
      <span className={`grid ${s.box} shrink-0 place-items-center text-ug-text`}>
        <Icon size={s.icon} />
      </span>
      <span className="min-w-0">
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
