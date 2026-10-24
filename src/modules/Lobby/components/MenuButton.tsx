import type { LucideIcon } from 'lucide-react'

interface MenuButtonProps {
  icon: LucideIcon
  title: string
  subtitle: string
  primary?: boolean
  onClick: () => void
  testId?: string
}

export function MenuButton({ icon: Icon, title, subtitle, primary, onClick, testId }: MenuButtonProps) {
  if (primary) {
    return (
      <button
        type="button"
        onClick={onClick}
        data-testid={testId}
        className="group relative flex w-full items-center gap-4 border-2 border-ug-red-hi bg-gradient-to-b from-[#d0181f] to-[#8c0d12] px-4 py-3 text-left shadow-[0_0_24px_rgb(255_30_40/0.35),inset_0_0_0_2px_rgb(0_0_0/0.35),0_4px_0_rgb(0_0_0/0.55)] transition-transform hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 lg:w-[108%]"
      >
        <span className="grid size-14 shrink-0 place-items-center bg-black/25">
          <Icon size={40} fill="currentColor" className="text-white" />
        </span>
        <span>
          <span className="ug-title-shadow block text-4xl leading-none tracking-wide text-white">{title}</span>
          <span className="mt-1 block font-terminal text-xl leading-none text-white/90">{subtitle}</span>
        </span>
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className="ug-panel group flex w-full items-center gap-4 px-4 py-2.5 text-left transition hover:-translate-y-0.5 hover:border-ug-border-hi active:translate-y-0.5"
    >
      <span className="grid size-12 shrink-0 place-items-center text-ug-text">
        <Icon size={34} />
      </span>
      <span>
        <span className="ug-title-shadow block text-3xl leading-none tracking-wide text-ug-text uppercase">
          {title}
        </span>
        <span className="mt-1 block font-terminal text-xl leading-none text-ug-muted">{subtitle}</span>
      </span>
    </button>
  )
}
