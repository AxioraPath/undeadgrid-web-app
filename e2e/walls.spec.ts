import { expect, test } from '@playwright/test'
import { wallHalf, wallRunIndex, wallPlacement, wallSpriteName, type WallLookup, type WallOrient } from '../src/game/client/wallSprite'

/** Builds a lookup from a "x,y" -> orientation list. */
const layout = (walls: [number, number, WallOrient][]): WallLookup => {
  const m = new Map(walls.map(([x, y, o]) => [`${x},${y}`, o]))
  return (x, y) => m.get(`${x},${y}`) ?? null
}

test.describe('Wall sprite halves (pure helper)', () => {
  test('an isolated tile draws the left half; an isolated vertical tile draws the whole fence', () => {
    const lookup = layout([[5, 5, 'h'], [9, 9, 'v']])
    expect(wallHalf('h', 5, 5, lookup)).toBe(0)
    expect(wallHalf('v', 9, 9, lookup)).toBe(2)
  })

  test('halves alternate along a run regardless of global parity', () => {
    const h = layout([[3, 2, 'h'], [4, 2, 'h'], [5, 2, 'h'], [6, 2, 'h']])
    expect([3, 4, 5, 6].map((x) => wallHalf('h', x, 2, h))).toEqual([0, 1, 0, 1])
    const v = layout([[7, 3, 'v'], [7, 4, 'v'], [7, 5, 'v']])
    // Vertical: top/bottom halves in pairs; the last tile of an odd run draws the whole fence.
    expect([3, 4, 5].map((y) => wallHalf('v', 7, y, v))).toEqual([0, 1, 2])
  })

  test('runs only count same-orientation neighbours (L and crossing)', () => {
    const l = layout([[2, 2, 'h'], [3, 2, 'h'], [3, 3, 'v'], [3, 4, 'v']])
    expect(wallRunIndex('v', 3, 3, l)).toBe(0)
    expect(wallRunIndex('v', 3, 4, l)).toBe(1)
    expect(wallRunIndex('h', 3, 2, l)).toBe(1)
    const cross = layout([[4, 4, 'h'], [5, 4, 'h'], [6, 4, 'h'], [5, 3, 'v'], [5, 5, 'v']])
    expect(wallHalf('h', 5, 4, cross)).toBe(1)
    expect(wallRunIndex('v', 5, 5, cross)).toBe(0)
  })

  test('source rect and sprite name keep the orientation in every damage state', () => {
    expect(wallPlacement('h', 1)).toEqual({ sx: 64, sy: 0, sw: 64, sh: 64, dx: 0, dy: 0, dw: 1, dh: 1 })
    // Vertical: top/bottom half of the 64 x 128 fence, or the whole fence anchored on the tile's bottom edge.
    expect(wallPlacement('v', 1)).toEqual({ sx: 0, sy: 64, sw: 64, sh: 64, dx: 0, dy: 0, dw: 1, dh: 1 })
    expect(wallPlacement('v', 2)).toEqual({ sx: 0, sy: 0, sw: 64, sh: 128, dx: 0, dy: -1, dw: 1, dh: 2 })
    expect(wallSpriteName('wood', 'v', 1)).toBe('valla-madera-v-sana')
    expect(wallSpriteName('reinforced', 'v', 0.2)).toBe('valla-metal-v-destruida')
    expect(wallSpriteName('wood', 'v', 1, true)).toBe('valla-madera-v-preview')
    expect(wallSpriteName('wood', 'h', 0.2)).toBe('pared-madera-h-destruida')
  })
})
