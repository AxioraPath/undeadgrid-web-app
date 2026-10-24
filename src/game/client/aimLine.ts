import { TILE } from '../../shared/lib/contracts'
import { AIM_Y_OFFSET, type Camera } from './render'

/**
 * Touch aim indicator: a pixel-style dotted line from the player plus a small ring at its end.
 * Call after drawFrame (screen space). `aim` is a direction vector, `meX/meY` are in tiles.
 */
export function drawAimLine(ctx: CanvasRenderingContext2D, cam: Camera, meX: number, meY: number, aim: { x: number; y: number }, dpr: number) {
  const len = Math.hypot(aim.x, aim.y)
  if (len < 1e-6) return
  const dx = aim.x / len
  const dy = aim.y / len
  const px = Math.round((meX * TILE - cam.x) * cam.scale * dpr)
  const py = Math.round((meY * TILE - AIM_Y_OFFSET - cam.y) * cam.scale * dpr)
  const s = Math.max(3, Math.round(dpr * 3))
  const dot = (x: number, y: number, size: number, alpha: number) => {
    ctx.globalAlpha = alpha
    ctx.fillStyle = '#000'
    ctx.fillRect(Math.round(x - size / 2 - 1), Math.round(y - size / 2 - 1), size + 2, size + 2)
    ctx.fillStyle = '#ffd24a'
    ctx.fillRect(Math.round(x - size / 2), Math.round(y - size / 2), size, size)
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  const step = 9 * s
  const start = 8 * s
  const count = 7
  for (let i = 0; i < count; i++) {
    const d = start + i * step
    dot(px + dx * d, py + dy * d, s * (1.4 - (i / count) * 0.5), 0.95 - (i / count) * 0.45)
  }
  // End ring (square-ish pixel ring).
  const ex = px + dx * (start + count * step)
  const ey = py + dy * (start + count * step)
  const r = 4 * s
  for (const [ox, oy] of [[-r, 0], [r, 0], [0, -r], [0, r]]) dot(ex + ox, ey + oy, s * 1.5, 0.7)
  ctx.globalAlpha = 1
}
