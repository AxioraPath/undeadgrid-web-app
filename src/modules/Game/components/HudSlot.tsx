import type { ReactNode } from 'react'
import { hudSlotStyle, type HudElementId, type HudLayout } from '../../../shared/lib/hudLayout'

interface HudSlotProps {
  id: HudElementId
  layout: HudLayout
  /** Built-in position (used while the element is not customised, so nothing changes by default). */
  defaultClassName?: string
  /** Applied in both modes (sizing). */
  className?: string
  children: ReactNode
}

/**
 * Places one HUD element. Customised elements are anchored by fractions of the safe area
 * (see hudLayout.ts); the rest keep their built-in responsive position. Must be rendered
 * inside `.ug-hud-area`.
 */
export function HudSlot({ id, layout, defaultClassName = '', className = '', children }: HudSlotProps) {
  const item = layout.items[id]
  if (!item) {
    return (
      <div data-hud-slot={id} className={`pointer-events-none ${defaultClassName} ${className}`}>
        {children}
      </div>
    )
  }
  return (
    <div data-hud-slot={id} data-custom="true" className={`pointer-events-none ${className}`} style={hudSlotStyle(item, !className)}>
      {children}
    </div>
  )
}
