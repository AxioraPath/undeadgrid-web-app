import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { createPortal } from 'react-dom'
import { Crosshair, Move, RotateCcw, Repeat, X } from 'lucide-react'
import { RangeField } from './RangeField'
import { useIsTouch } from '../../modules/Game/hooks/useIsTouch'
import {
  CONTROL_OPACITY_MIN,
  HUD_OPACITY_MIN,
  resetHudItem,
  resetHudLayout,
  setHudItem,
  updateSettings,
  useSettings,
} from '../lib/settings'
import {
  clamp01,
  HUD_ELEMENTS,
  HUD_SCALE_MAX,
  HUD_SCALE_MIN,
  hudDefaultPosition,
  hudElementSize,
  hudGap,
  type HudElementId,
  type HudItem,
  type HudMetrics,
} from '../lib/hudLayout'

interface HudEditorProps {
  open: boolean
  onClose: () => void
}

/** Snap grid: this many columns across the safe area. */
const GRID_COLUMNS = 24
const FRAME_BORDER = 2
const NUDGE = 0.01
const NUDGE_BIG = 0.05

const useViewport = () => {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }))
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return vp
}

// ---------------------------------------------------------------------------
// Preview art: simplified stand-ins drawn at the element's real px size, then scaled to the frame.
// ---------------------------------------------------------------------------

const ICON = '/assets/game/iconos/'

function Art({ id, w, controlAlpha, hudAlpha }: { id: HudElementId; w: number; controlAlpha: number; hudAlpha: number }) {
  switch (id) {
    case 'moveStick':
      return (
        <div className="grid size-full place-items-center rounded-full border-2 border-white/35 bg-white/[0.09]" style={{ opacity: controlAlpha }}>
          <span className="grid size-[45%] place-items-center rounded-full border-2 border-white/70 bg-white/55">
            <Move className="size-[55%] text-black/60" />
          </span>
        </div>
      )
    case 'aimStick':
      return (
        <div className="grid size-full place-items-center rounded-full border-2 border-ug-red-hi/70 bg-white/[0.09]" style={{ opacity: controlAlpha }}>
          <span className="grid size-[45%] place-items-center rounded-full border-2 border-ug-red-hi bg-ug-red/55 text-white">
            <Crosshair className="size-[55%]" />
          </span>
        </div>
      )
    case 'quickWeapon':
      return (
        <div className="relative grid size-full place-items-center rounded-full border-2 border-[#3d8bff] bg-[#3d8bff]/25" style={{ opacity: controlAlpha }}>
          <img src={`${ICON}pistola.png`} alt="" className="pixelated h-[44%] w-[62%] object-contain" />
          <Repeat aria-hidden className="absolute -right-0.5 -bottom-0.5 size-[34%] rounded-full bg-ug-bg p-[3px] text-ug-accent" />
        </div>
      )
    case 'hotbar': {
      const slot = (w - 36) / 5
      const icons = [`${ICON}pistola.png`, `${ICON}escopeta.png`, `${ICON}botiquin.png`, '/assets/game/construccion/pared-madera-h.png', '/assets/game/construccion/trampa-puas.png']
      return (
        <div className="ug-panel flex size-full items-center gap-1.5 p-1" style={{ opacity: Math.max(0.5, controlAlpha) }}>
          {icons.map((src, i) => (
            <div
              key={src}
              className={`grid h-full place-items-center border-2 ${i === 0 ? 'border-[#3d8bff] bg-[#3d8bff]/25' : 'border-ug-border bg-black/40'}`}
              style={{ width: slot }}
            >
              <img src={src} alt="" className="pixelated h-3/5 w-4/5 object-contain" />
            </div>
          ))}
        </div>
      )
    }
    case 'minimap':
      return (
        <div
          className="ug-panel size-full bg-[length:12px_12px] bg-[linear-gradient(rgb(255_255_255/0.07)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.07)_1px,transparent_1px)]"
          style={{ opacity: Math.max(0.4, hudAlpha) }}
        >
          <div className="grid size-full place-items-center text-xl text-ug-muted">MAPA</div>
        </div>
      )
    case 'playerPanel':
      return (
        <div className="ug-panel flex size-full items-center gap-2 p-2">
          <div className="size-10 shrink-0 border-2 border-ug-border bg-ug-panel-2" />
          <div className="min-w-0 flex-1">
            <div className="h-4 border-2 border-black/60 bg-black/60">
              <div className="h-full w-4/5 bg-ug-red-hi" />
            </div>
            <div className="mt-1.5 flex gap-3 text-lg leading-none">
              <span>12</span>
              <span>8</span>
              <span>2</span>
            </div>
          </div>
        </div>
      )
    case 'phasePanel':
      return (
        <div className="ug-panel flex size-full flex-col items-center justify-center px-3 text-center">
          <p className="ug-title-shadow text-xl leading-none">OLEADA 1 / 3</p>
          <p className="ug-title-shadow text-2xl leading-none">03:45</p>
          <div className="mt-1.5 h-2 w-full border border-black/60 bg-black/60">
            <div className="h-full w-3/4 bg-[#3d8bff]" />
          </div>
          <div className="mt-1 h-2 w-full border border-black/60 bg-black/60">
            <div className="h-full w-2/3 bg-ug-red-hi" />
          </div>
        </div>
      )
  }
}

/** Landscape preview of the match screen where the HUD elements are dragged, resized and reset. */
export function HudEditor({ open, onClose }: HudEditorProps) {
  const s = useSettings()
  const detectedTouch = useIsTouch()
  const isTouch = s.touchControls === 'auto' ? detectedTouch : s.touchControls === 'on'
  const vp = useViewport()
  const [selected, setSelected] = useState<HudElementId>('hotbar')
  const [box, setBox] = useState({ w: 0, h: 0 })
  const stageRef = useRef<HTMLDivElement>(null)
  const drag = useRef<{ id: HudElementId; pointerId: number; sx: number; sy: number; x0: number; y0: number } | null>(null)

  // The match is always played in landscape: the preview mirrors the landscape version of this screen.
  const metrics = useMemo<HudMetrics>(
    () => ({ vw: Math.max(vp.w, vp.h), vh: Math.min(vp.w, vp.h), touch: isTouch, largeControls: s.touchSize === 'large' }),
    [vp, isTouch, s.touchSize],
  )
  const elements = HUD_ELEMENTS.filter((e) => !e.touchOnly || isTouch)
  const activeId = elements.some((e) => e.id === selected) ? selected : 'hotbar'

  useEffect(() => {
    if (!open) return
    const el = stageRef.current
    if (!el) return
    const measure = () => setBox({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(el)
    return () => ro.disconnect()
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  // Frame = largest rectangle with the screen's aspect ratio that fits the stage.
  const aspect = Math.min(2.4, Math.max(1.25, metrics.vw / metrics.vh))
  const frameW = Math.max(0, Math.min(box.w, box.h * aspect))
  const frameH = frameW / aspect
  const ratio = frameW / metrics.vw
  const gap = hudGap(metrics) * ratio
  // The frame has a 2px border on each side, so its drawable box is 4px smaller.
  const areaW = frameW - FRAME_BORDER * 2 - 2 * gap
  const areaH = frameH - FRAME_BORDER * 2 - 2 * gap
  const cell = areaW / GRID_COLUMNS

  const resolve = (id: HudElementId): HudItem => s.hudLayout.items[id] ?? { ...hudDefaultPosition(id, metrics), scale: 1 }
  const sizeOf = (id: HudElementId, scale: number) => {
    const base = hudElementSize(id, metrics)
    return { ...base, pw: base.w * ratio * scale, ph: base.h * ratio * scale, k: ratio * scale }
  }

  const snapAxis = (value: number, free: number) => {
    if (!s.hudSnap || free <= 0 || cell <= 0) return value
    if (Math.abs(value - free) < cell / 2) return free
    return Math.round(value / cell) * cell
  }

  const move = (id: HudElementId, x: number, y: number) => setHudItem(id, { ...resolve(id), x, y })

  const onPointerDown = (e: PointerEvent<HTMLDivElement>, id: HudElementId) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    setSelected(id)
    e.currentTarget.setPointerCapture(e.pointerId)
    const it = resolve(id)
    drag.current = { id, pointerId: e.pointerId, sx: e.clientX, sy: e.clientY, x0: it.x, y0: it.y }
  }

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    const d = drag.current
    if (!d || d.pointerId !== e.pointerId) return
    const { pw, ph } = sizeOf(d.id, resolve(d.id).scale)
    const freeW = areaW - pw
    const freeH = areaH - ph
    const left = snapAxis(Math.min(freeW, Math.max(0, d.x0 * freeW + (e.clientX - d.sx))), freeW)
    const top = snapAxis(Math.min(freeH, Math.max(0, d.y0 * freeH + (e.clientY - d.sy))), freeH)
    move(d.id, freeW > 0 ? clamp01(left / freeW) : d.x0, freeH > 0 ? clamp01(top / freeH) : d.y0)
  }

  const endDrag = (e: PointerEvent<HTMLDivElement>) => {
    if (drag.current?.pointerId === e.pointerId) drag.current = null
  }

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>, id: HudElementId) => {
    const step = e.shiftKey ? NUDGE_BIG : NUDGE
    const it = resolve(id)
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0
    if (!dx && !dy) return
    e.preventDefault()
    move(id, clamp01(it.x + dx), clamp01(it.y + dy))
  }

  const current = resolve(activeId)
  const customized = !!s.hudLayout.items[activeId]
  const activeInfo = HUD_ELEMENTS.find((e) => e.id === activeId)!
  const hasCustom = Object.keys(s.hudLayout.items).length > 0

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Personalizar HUD"
      data-testid="hud-editor"
      className="fixed inset-0 z-[60] flex touch-none flex-col gap-2 overscroll-none bg-ug-bg p-3 phone:gap-1 phone:p-2"
      style={{
        paddingTop: 'max(0.5rem, env(safe-area-inset-top))',
        paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))',
        paddingLeft: 'max(0.5rem, env(safe-area-inset-left))',
        paddingRight: 'max(0.5rem, env(safe-area-inset-right))',
      }}
    >
      <header className="flex shrink-0 items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 className="ug-title-shadow text-2xl leading-none tracking-wide text-ug-accent uppercase phone:text-xl">Personalizar HUD</h2>
          <p className="font-terminal text-base leading-tight text-ug-muted phone:hidden">Arrastra cada elemento. Con el teclado: flechas para mover, Mayús para saltos grandes.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          data-testid="hud-edit-close"
          className="flex shrink-0 items-center gap-1.5 border-2 border-ug-accent bg-ug-accent/15 px-3 py-1 text-xl leading-none hover:bg-ug-accent/25 phone:py-0.5 phone:text-lg"
        >
          <X size="1rem" /> Listo
        </button>
      </header>

      <div className="flex min-h-0 flex-1 gap-2 portrait:flex-col">
        <div ref={stageRef} className="grid min-h-0 min-w-0 flex-1 place-items-center">
          {frameW > 0 && (
            <div
              data-testid="hud-editor-frame"
              className="ug-hud-preview relative shrink-0 overflow-hidden border-2 border-ug-border-hi bg-[#101722]"
              style={{ width: frameW, height: frameH, ['--ug-hud-alpha' as string]: s.hudOpacity }}
            >
              {/* Stand-in for the map: a faint tile grid, plus the snap grid while it is on. */}
              <div
                aria-hidden
                className="absolute inset-0 bg-[length:32px_32px] bg-[linear-gradient(rgb(255_255_255/0.04)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255/0.04)_1px,transparent_1px)]"
              />
              <div aria-hidden className="absolute border border-dashed border-white/25" style={{ inset: gap }} />
              {s.hudSnap && (
                <div
                  aria-hidden
                  data-testid="hud-editor-grid"
                  className="absolute"
                  style={{
                    inset: gap,
                    backgroundImage: 'radial-gradient(circle, rgb(143 211 255 / 0.35) 1px, transparent 1.5px)',
                    backgroundSize: `${cell}px ${cell}px`,
                  }}
                />
              )}
              {/* Fixed in the match: FPS / ping and the exit button. Shown so nothing gets parked on top of it. */}
              <div
                aria-hidden
                className="absolute flex items-center justify-center border border-dashed border-white/20 bg-white/[0.04] font-terminal text-white/50"
                style={{ top: gap, right: gap, width: 150 * ratio, height: 36 * ratio, fontSize: Math.max(8, 14 * ratio) }}
              >
                FPS y salir
              </div>
              <div className="absolute" style={{ inset: gap }} data-testid="hud-editor-area">
                {elements.map((el) => {
                  const it = resolve(el.id)
                  const { w, h, pw, ph, k } = sizeOf(el.id, it.scale)
                  const left = it.x * (areaW - pw)
                  const top = it.y * (areaH - ph)
                  const isSel = el.id === activeId
                  return (
                    <div
                      key={el.id}
                      role="button"
                      tabIndex={0}
                      aria-label={`${el.label}. Arrastra o usa las flechas para mover`}
                      aria-pressed={isSel}
                      data-testid={`hud-edit-${el.id}`}
                      data-custom={!!s.hudLayout.items[el.id]}
                      onPointerDown={(e) => onPointerDown(e, el.id)}
                      onPointerMove={onPointerMove}
                      onPointerUp={endDrag}
                      onPointerCancel={endDrag}
                      onLostPointerCapture={endDrag}
                      onFocus={() => setSelected(el.id)}
                      onKeyDown={(e) => onKeyDown(e, el.id)}
                      className={`absolute cursor-grab touch-none select-none active:cursor-grabbing focus:outline-none ${
                        isSel ? 'z-10 outline-2 outline-offset-2 outline-ug-accent' : 'outline-1 outline-offset-2 outline-white/25 outline-dashed hover:outline-white/60'
                      }`}
                      style={{ left, top, width: pw, height: ph }}
                    >
                      <div className="pointer-events-none origin-top-left" style={{ width: w, height: h, transform: `scale(${k})` }}>
                        <Art id={el.id} w={w} controlAlpha={s.controlOpacity} hudAlpha={s.hudOpacity} />
                      </div>
                      {isSel && (
                        <span
                          className={`ug-title-shadow pointer-events-none absolute left-0 bg-ug-bg px-1 text-base leading-tight whitespace-nowrap text-ug-accent ${
                            top < 22 ? 'top-full mt-1' : 'bottom-full mb-1'
                          }`}
                        >
                          {el.label}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <aside
          className="ug-panel flex w-52 shrink-0 touch-pan-y flex-col gap-1 overflow-y-auto p-2 phone:w-48 portrait:max-h-[45%] portrait:w-full"
          aria-label="Opciones del elemento"
        >
          <section aria-label="Elementos" className="grid grid-cols-3 gap-1 portrait:grid-cols-7">
            {elements.map((el) => (
              <button
                key={el.id}
                type="button"
                data-testid={`hud-pick-${el.id}`}
                aria-pressed={el.id === activeId}
                onClick={() => setSelected(el.id)}
                title={el.label}
                className={`truncate border-2 px-1 py-0.5 text-center text-base leading-tight ${
                  el.id === activeId ? 'border-ug-accent bg-ug-accent/20 text-ug-text' : 'border-ug-border bg-black/30 text-ug-muted hover:text-ug-text'
                }`}
              >
                {el.short}
              </button>
            ))}
          </section>

          <section className="border-t border-ug-border pt-1" aria-label={activeInfo.label}>
            <RangeField
              compact
              label="Tamaño"
              value={Math.round(current.scale * 100)}
              min={HUD_SCALE_MIN * 100}
              max={HUD_SCALE_MAX * 100}
              step={5}
              testId="hud-edit-scale"
              onChange={(v) => setHudItem(activeId, { ...current, scale: v / 100 })}
            />
            <button
              type="button"
              disabled={!customized}
              onClick={() => resetHudItem(activeId)}
              data-testid="hud-edit-reset-item"
              className="flex w-full items-center justify-center gap-1.5 border-2 border-ug-border bg-black/30 px-2 py-0.5 text-base leading-tight text-ug-muted enabled:hover:border-ug-border-hi enabled:hover:text-ug-text disabled:opacity-40"
            >
              <RotateCcw size="0.875rem" /> Restablecer este
            </button>
          </section>

          <section className="border-t border-ug-border pt-1" aria-label="Transparencia">
            {isTouch && (
              <RangeField
                compact
                label="Controles"
                value={Math.round(s.controlOpacity * 100)}
                min={CONTROL_OPACITY_MIN * 100}
                max={100}
                testId="hud-edit-control-opacity"
                onChange={(v) => updateSettings({ controlOpacity: v / 100 })}
              />
            )}
            <RangeField
              compact
              label="Paneles y minimapa"
              value={Math.round(s.hudOpacity * 100)}
              min={HUD_OPACITY_MIN * 100}
              max={100}
              testId="hud-edit-hud-opacity"
              onChange={(v) => updateSettings({ hudOpacity: v / 100 })}
            />
          </section>

          <section className="mt-auto flex flex-col gap-1 border-t border-ug-border pt-1">
            <label className="flex cursor-pointer items-center justify-between gap-2 text-base leading-tight">
              Ajustar a cuadrícula
              <input
                type="checkbox"
                checked={s.hudSnap}
                onChange={(e) => updateSettings({ hudSnap: e.target.checked })}
                data-testid="hud-edit-snap"
                className="size-4 accent-ug-accent"
              />
            </label>
            <button
              type="button"
              disabled={!hasCustom}
              onClick={resetHudLayout}
              data-testid="hud-edit-reset-all"
              className="flex w-full items-center justify-center gap-1.5 border-2 border-ug-red bg-ug-red/15 px-2 py-0.5 text-base leading-tight enabled:hover:bg-ug-red/30 disabled:opacity-40"
            >
              <RotateCcw size="0.875rem" /> Restablecer todo
            </button>
            {!isTouch && <p className="font-terminal text-sm leading-tight text-ug-muted">Los joysticks aparecen con los controles táctiles.</p>}
          </section>
        </aside>
      </div>
    </div>,
    document.body,
  )
}
