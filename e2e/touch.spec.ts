import { expect, test, type Page } from '@playwright/test'
import { API, enterMatch, readPos, roomCodeFromUrl } from './helpers'

// Runs only in the "mobile" projects (landscape touch emulation, hasTouch).
type LastInput = { up: boolean; down: boolean; left: boolean; right: boolean; action: boolean; fire?: boolean; aim?: { x: number; y: number } } | null

const lastInput = async (page: Page): Promise<LastInput> =>
  ((await (await fetch(`${API}/__test/last-input?code=${roomCodeFromUrl(page)}`)).json()) as { input: LastInput }).input

async function centerOf(page: Page, testId: string) {
  // The visible base is the zone's first child; the zone and base share the same centre.
  const box = (await page.getByTestId(testId).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2, w: box.width }
}

type Pt = { x: number; y: number; id: number }
const touchSender = async (page: Page) => {
  const cdp = await page.context().newCDPSession(page)
  return (type: 'touchStart' | 'touchMove' | 'touchEnd', points: Pt[]) =>
    cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
}

test.describe('Flow 3 - Canvas (twin-stick touch controls)', () => {
  test('dragging the left stick with a real touch moves the player', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      await expect(page.getByTestId('move-stick')).toBeVisible()
      await expect(page.getByTestId('action-button')).toHaveCount(0)
      const c = await centerOf(page, 'move-stick')
      const start = await readPos(page)
      const touch = await touchSender(page)

      await touch('touchStart', [{ x: c.x, y: c.y, id: 1 }])
      await page.waitForTimeout(150)
      await touch('touchMove', [{ x: c.x + 50, y: c.y, id: 1 }])
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(start.x + 1)
      await touch('touchEnd', [])

      // Release stops movement.
      await page.waitForTimeout(300)
      const stopped = await readPos(page)
      await page.waitForTimeout(400)
      expect(await readPos(page)).toEqual(stopped)
    } finally {
      bot.disconnect()
    }
  })

  test('the right stick aims in any angle, fires while deflected and clears on release', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      const c = await centerOf(page, 'aim-stick')
      const touch = await touchSender(page)

      // Drag down-left (about 135 degrees on screen: x < 0, y > 0).
      await touch('touchStart', [{ x: c.x, y: c.y, id: 1 }])
      await page.waitForTimeout(150)
      await touch('touchMove', [{ x: c.x - 30, y: c.y + 30, id: 1 }])
      await expect.poll(async () => (await lastInput(page))?.fire).toBe(true)
      const held = (await lastInput(page))!
      expect(held.aim).toBeDefined()
      expect(held.aim!.x).toBeLessThan(-0.6)
      expect(held.aim!.y).toBeGreaterThan(0.6)
      expect(Math.hypot(held.aim!.x, held.aim!.y)).toBeCloseTo(1, 1)

      // Rotate to straight up.
      await touch('touchMove', [{ x: c.x, y: c.y - 40, id: 1 }])
      await expect.poll(async () => (await lastInput(page))?.aim?.y ?? 0).toBeLessThan(-0.9)
      expect((await lastInput(page))?.fire).toBe(true)

      // Release: no more fire and no aim. (The right stick sends `fire`, so it also shoots inside your base.)
      await touch('touchEnd', [])
      await expect.poll(async () => (await lastInput(page))?.fire).toBe(false)
      expect((await lastInput(page))?.aim).toBeUndefined()
    } finally {
      bot.disconnect()
    }
  })

  test('both sticks work at the same time (move right while aiming up)', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      const move = await centerOf(page, 'move-stick')
      const aim = await centerOf(page, 'aim-stick')
      const start = await readPos(page)
      const touch = await touchSender(page)

      await touch('touchStart', [
        { x: move.x, y: move.y, id: 1 },
        { x: aim.x, y: aim.y, id: 2 },
      ])
      await page.waitForTimeout(150)
      await touch('touchMove', [
        { x: move.x + 50, y: move.y, id: 1 },
        { x: aim.x, y: aim.y - 40, id: 2 },
      ])
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(start.x + 1)
      await expect.poll(async () => (await lastInput(page))?.fire).toBe(true)
      const both = (await lastInput(page))!
      expect(both.right).toBe(true)
      expect(both.aim!.y).toBeLessThan(-0.9)

      // Lift both fingers: everything stops and the aim is cleared.
      await touch('touchEnd', [])
      await expect.poll(async () => (await lastInput(page))?.fire).toBe(false)
      expect((await lastInput(page))?.right).toBe(false)
      expect((await lastInput(page))?.aim).toBeUndefined()
    } finally {
      bot.disconnect()
    }
  })
})
