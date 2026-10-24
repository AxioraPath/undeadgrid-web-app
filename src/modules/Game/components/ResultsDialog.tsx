import { useEffect, useRef, useState, type ReactNode } from 'react'

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])'

interface ResultsDialogProps {
  title: string
  /** Esc, backdrop click and the cancel button all end up here. */
  onCancel: () => void
  children: ReactNode
  testId?: string
  /** Id of the element (inside the dialog) that gets focus first. Defaults to the first focusable. */
  initialFocusId?: string
  /** Id of the element describing the dialog for assistive tech. */
  describedBy?: string
  /** Accent used for the frame glow. */
  tone?: 'blue' | 'red'
  /** Clicking the dimmed backdrop cancels (default true). */
  dismissOnBackdrop?: boolean
}

/** Modal shell for the results screen: Esc cancels, Tab is trapped, focus returns to the opener on close. */
export function ResultsDialog({ title, onCancel, children, testId, initialFocusId, describedBy, tone = 'blue', dismissOnBackdrop = true }: ResultsDialogProps) {
  const ref = useRef<HTMLDivElement>(null)
  // Captured during the first render: once the screen behind turns inert the browser drops its focus.
  const [opener] = useState(() => document.activeElement as HTMLElement | null)
  const onCancelRef = useRef(onCancel)
  useEffect(() => {
    onCancelRef.current = onCancel
  }, [onCancel])

  useEffect(() => {
    const root = ref.current
    const focusables = () => Array.from(root?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
    const initial = (initialFocusId && root?.querySelector<HTMLElement>(`#${initialFocusId}`)) || focusables()[0]
    initial?.focus()

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        e.stopPropagation()
        onCancelRef.current()
        return
      }
      if (e.key !== 'Tab') return
      const items = focusables()
      if (items.length === 0) {
        e.preventDefault()
        return
      }
      const first = items[0]
      const last = items[items.length - 1]
      const active = document.activeElement
      if (!root?.contains(active)) {
        e.preventDefault()
        first.focus()
      } else if (e.shiftKey && active === first) {
        e.preventDefault()
        last.focus()
      } else if (!e.shiftKey && active === last) {
        e.preventDefault()
        first.focus()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => {
      window.removeEventListener('keydown', onKey, true)
      if (opener?.isConnected) opener.focus()
    }
  }, [initialFocusId, opener])

  const glow = tone === 'red' ? 'border-ug-red-hi shadow-[0_0_28px_rgb(255_42_47/0.3)]' : 'border-[#2f6fd6] shadow-[0_0_28px_rgb(47_111_214/0.4)]'

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-hidden bg-black/70 p-[max(0.5rem,env(safe-area-inset-top))_max(0.5rem,env(safe-area-inset-right))_max(0.5rem,env(safe-area-inset-bottom))_max(0.5rem,env(safe-area-inset-left))] backdrop-blur-[2px]"
      onClick={dismissOnBackdrop ? onCancel : undefined}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        aria-describedby={describedBy}
        data-testid={testId}
        onClick={(e) => e.stopPropagation()}
        className={`ug-panel max-h-full w-full max-w-[min(30rem,100%)] overflow-y-auto overscroll-contain border-2 p-[clamp(0.75rem,3vmin,1.5rem)] ${glow}`}
      >
        {children}
      </div>
    </div>
  )
}
