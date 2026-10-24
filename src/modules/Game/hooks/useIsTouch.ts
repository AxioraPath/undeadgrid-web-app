import { useEffect, useState } from 'react'

const detect = () =>
  typeof window !== 'undefined' && (window.matchMedia('(pointer: coarse)').matches || navigator.maxTouchPoints > 0)

/** pointer: coarse o maxTouchPoints > 0 → controles táctiles. Ambas funcionan en el emulador móvil de Chrome. */
export function useIsTouch() {
  const [touch, setTouch] = useState(detect)

  useEffect(() => {
    const mq = window.matchMedia('(pointer: coarse)')
    const update = () => setTouch(detect())
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  return touch
}
