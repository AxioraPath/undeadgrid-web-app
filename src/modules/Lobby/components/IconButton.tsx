import type { LucideIcon } from 'lucide-react'

interface IconButtonProps {
  icon: LucideIcon
  label: string
  onClick: () => void
}

export function IconButton({ icon: Icon, label, onClick }: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="ug-panel grid size-12 place-items-center text-ug-text transition hover:-translate-y-0.5 hover:border-ug-border-hi sm:size-14"
    >
      <Icon size={26} />
    </button>
  )
}
