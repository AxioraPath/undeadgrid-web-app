import { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

interface PixelModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  testId?: string
}

export function PixelModal({ open, title, onClose, children, testId }: PixelModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 phone:p-2 backdrop-blur-[2px] sm:items-center"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testId}
        className="ug-panel max-h-[85dvh] phone:max-h-[96dvh] w-full max-w-md phone:max-w-lg overflow-y-auto p-5 phone:p-3"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 phone:mb-2 flex items-center justify-between">
          <h2 className="ug-title-shadow text-2xl phone:text-xl tracking-wide text-ug-accent uppercase">{title}</h2>
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onClose}
            className="grid size-9 phone:size-7 place-items-center border-2 border-ug-border bg-ug-panel-2 text-ug-muted hover:border-ug-border-hi hover:text-ug-text"
          >
            <X size="1.125rem" />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
