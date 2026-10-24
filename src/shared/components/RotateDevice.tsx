import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Smartphone } from 'lucide-react'

/** Shorter physical screen side under which a touch device counts as a phone (tablets are never blocked). */
const PHONE_MAX_SHORT_SIDE = 600

const isTouchDevice = () =>
  window.matchMedia('(pointer: coarse)').matches || window.matchMedia('(any-pointer: coarse)').matches || navigator.maxTouchPoints > 0

const isPhone = () => isTouchDevice() && Math.min(window.screen.width, window.screen.height) < PHONE_MAX_SHORT_SIDE

const isPortrait = () => {
  const type = window.screen.orientation?.type
  if (type) return type.startsWith('portrait')
  return window.matchMedia('(orientation: portrait)').matches
}

const shouldBlock = () => isPhone() && isPortrait()

/**
 * Covers the whole app with an opaque panel while a phone is held in portrait.
 * Routes stay mounted underneath (only made inert), so sockets and game state survive a rotation.
 */
export function RotateDevice() {
  const [blocked, setBlocked] = useState(shouldBlock)

  useEffect(() => {
    const update = () => setBlocked(shouldBlock())
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    window.screen.orientation?.addEventListener?.('change', update)
    const mq = window.matchMedia('(orientation: portrait)')
    mq.addEventListener?.('change', update)

    // Opportunistic landscape lock after the first user gesture; unsupported/denied is fine.
    const tryLock = () => {
      if (!isPhone()) return
      const orientation = window.screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> }
      orientation?.lock?.('landscape')?.catch(() => undefined)
    }
    window.addEventListener('pointerup', tryLock, { once: true })

    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
      window.screen.orientation?.removeEventListener?.('change', update)
      mq.removeEventListener?.('change', update)
      window.removeEventListener('pointerup', tryLock)
    }
  }, [])

  // Block interaction with the app underneath without unmounting it.
  useEffect(() => {
    const root = document.getElementById('root')
    if (!root) return
    if (blocked) {
      root.setAttribute('inert', '')
      root.setAttribute('aria-hidden', 'true')
    } else {
      root.removeAttribute('inert')
      root.removeAttribute('aria-hidden')
    }
    return () => {
      root.removeAttribute('inert')
      root.removeAttribute('aria-hidden')
    }
  }, [blocked])

  if (!blocked) return null

  return createPortal(
    <div
      role="alert"
      data-testid="rotate-device"
      className="fixed inset-0 z-[100] grid place-items-center bg-ug-bg p-6"
      style={{
        backgroundImage:
          'radial-gradient(ellipse 80% 50% at 50% 40%, rgb(168 52 28 / 0.45) 0%, rgb(21 16 24 / 0.9) 60%, transparent 100%)',
      }}
    >
      <div className="ug-panel flex w-full max-w-xs flex-col items-center gap-5 px-6 py-8 text-center">
        <div className="ug-rotate-phone grid size-24 place-items-center border-2 border-ug-border bg-black/40" aria-hidden>
          <Smartphone size={56} strokeWidth={1.75} className="ug-rotate-icon text-ug-accent" />
        </div>
        <div>
          <h2 className="ug-title-shadow text-4xl leading-none tracking-wide text-ug-text uppercase">Gira tu celular</h2>
          <p className="mt-2 font-terminal text-2xl leading-tight text-ug-muted">UndeadGrid se juega mejor en horizontal.</p>
        </div>
      </div>
    </div>,
    document.body,
  )
}
