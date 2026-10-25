/** Pure helpers to pick which half of the 2-tile wall art a tile draws. No DOM/canvas dependencies. */

export type WallOrient = 'h' | 'v'

/** Returns the orientation of the wall at a tile, or null when there is no wall there. */
export type WallLookup = (x: number, y: number) => WallOrient | null

/**
 * Position of a wall tile in its run: how many contiguous same-orientation walls precede it along its axis
 * (left for 'h', up for 'v'). An isolated tile or a run start is 0.
 */
export function wallRunIndex(orient: WallOrient, tx: number, ty: number, lookup: WallLookup): number {
  const dx = orient === 'h' ? -1 : 0
  const dy = orient === 'v' ? -1 : 0
  let i = 0
  while (lookup(tx + dx * (i + 1), ty + dy * (i + 1)) === orient) i++
  return i
}

/**
 * Which part of the 2-tile art the tile draws. Horizontal: 0 = left half, 1 = right half, alternating along the run.
 * Vertical (valla 64 x 128, 2 tiles tall): 0 = top half, 1 = bottom half, paired down the run; a tile that would start
 * a pair but has no wall below (isolated tile or end of an odd run) draws the whole fence (2), rising into the tile above.
 */
export type WallPart = 0 | 1 | 2

export const wallHalf = (orient: WallOrient, tx: number, ty: number, lookup: WallLookup): WallPart => {
  const half = (wallRunIndex(orient, tx, ty, lookup) % 2) as 0 | 1
  if (orient === 'h' || half === 1) return half
  return lookup(tx, ty + 1) === 'v' ? 0 : 2
}

/** Source rectangle in the sprite and destination rectangle relative to the tile origin (in tiles). */
export const wallPlacement = (orient: WallOrient, part: WallPart) =>
  orient === 'h'
    ? { sx: (part % 2) * 64, sy: 0, sw: 64, sh: 64, dx: 0, dy: 0, dw: 1, dh: 1 }
    : part === 2
      ? { sx: 0, sy: 0, sw: 64, sh: 128, dx: 0, dy: -1, dw: 1, dh: 2 }
      : { sx: 0, sy: part * 64, sw: 64, sh: 64, dx: 0, dy: 0, dw: 1, dh: 1 }

/**
 * Sprite name for a wall. Horizontal: pared (sana / dañada / destruida). Vertical: valla estrecha del paquete nuevo
 * (sana / destruida, y `preview` para la vista previa al construir).
 */
export const wallSpriteName = (type: 'wood' | 'reinforced', orient: WallOrient, pct: number, preview = false) =>
  orient === 'v'
    ? `valla-${type === 'wood' ? 'madera' : 'metal'}-v-${preview ? 'preview' : pct <= 0.33 ? 'destruida' : 'sana'}`
    : `pared-${type === 'wood' ? 'madera' : 'metal'}-h${pct <= 0.33 ? '-destruida' : pct <= 0.66 ? '-danada' : ''}`
