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
 * Which half (0 = left, 1 = right) of the 2-tile horizontal art the tile draws. Halves alternate along the run so any
 * run length/start looks continuous; an isolated tile (or run start) draws the left half consistently.
 * Vertical art is a single tall post (64 x 128, body in the lower part), so it never uses halves.
 */
export const wallHalf = (orient: WallOrient, tx: number, ty: number, lookup: WallLookup): 0 | 1 =>
  orient === 'v' ? 0 : ((wallRunIndex(orient, tx, ty, lookup) % 2) as 0 | 1)

/**
 * Source rectangle in the sprite and destination rectangle relative to the tile origin (in tiles).
 * Horizontal: one 64 x 64 half into the tile. Vertical: the whole 64 x 128 post anchored at the tile's bottom edge,
 * so its tips rise into the tile above (depth-sorted by the tile's bottom row like every tall object).
 */
export const wallPlacement = (orient: WallOrient, half: 0 | 1) =>
  orient === 'h'
    ? { sx: half * 64, sy: 0, sw: 64, sh: 64, dx: 0, dy: 0, dw: 1, dh: 1 }
    : { sx: 0, sy: 0, sw: 64, sh: 128, dx: 0, dy: -1, dw: 1, dh: 2 }

/** Sprite name for a wall; damaged/destroyed variants keep the orientation. */
export const wallSpriteName = (type: 'wood' | 'reinforced', orient: WallOrient, pct: number) =>
  `pared-${type === 'wood' ? 'madera' : 'metal'}-${orient}${pct <= 0.33 ? '-destruida' : pct <= 0.66 ? '-danada' : ''}`
