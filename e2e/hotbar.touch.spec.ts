import { expect, test, type Page } from '@playwright/test'
import { API, enterMatch, readPos, roomCodeFromUrl } from './helpers'

// Runs only in the "mobile" projects (landscape touch emulation, hasTouch).
type Cmd = { type: string; slot?: number }
const commands = async (page: Page): Promise<Cmd[]> =>
  ((await (await fetch(`${API}/__test/commands?code=${roomCodeFromUrl(page)}`)).json()) as { commands: Cmd[] }).commands
const hotbarSlots = async (page: Page) => (await commands(page)).filter((c) => c.type === 'hotbar').map((c) => c.slot)

const center = async (page: Page, testId: string) => {
  const box = (await page.getByTestId(testId).boundingBox())!
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
}

type Pt = { x: number; y: number; id: number }
const touchSender = async (page: Page) => {
  const cdp = await page.context().newCDPSession(page)
  return (type: 'touchStart' | 'touchMove' | 'touchEnd', points: Pt[]) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: points })
}

test.describe('Weapon switching while moving (touch)', () => {
  test('tapping a hotbar slot with a second finger works while the move stick is held', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      const stick = await center(page, 'move-stick')
      const slot2 = await center(page, 'hotbar-slot-2')
      const start = await readPos(page)
      const touch = await touchSender(page)
      const held: Pt = { x: stick.x + 50, y: stick.y, id: 1 }

      await touch('touchStart', [{ x: stick.x, y: stick.y, id: 1 }])
      await page.waitForTimeout(100)
      await touch('touchMove', [held])
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(start.x + 0.5)

      // Second finger taps the shotgun slot while the first one keeps the stick deflected.
      const tap: Pt = { x: slot2.x, y: slot2.y, id: 2 }
      await touch('touchStart', [held, tap])
      await touch('touchEnd', [tap]) // releases only the tapping finger
      await expect.poll(() => hotbarSlots(page)).toEqual([2])
      await expect(page.getByTestId('hotbar-slot-2')).toHaveAttribute('aria-pressed', 'true')

      // The player kept moving the whole time.
      const before = await readPos(page)
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(before.x + 0.3)
      await touch('touchEnd', [])
    } finally {
      bot.disconnect()
    }
  })

  test('the quick weapon button cycles pistol and shotgun while moving', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      const stick = await center(page, 'move-stick')
      const quick = await center(page, 'quick-weapon')
      const touch = await touchSender(page)
      const held: Pt = { x: stick.x + 50, y: stick.y, id: 1 }

      await touch('touchStart', [{ x: stick.x, y: stick.y, id: 1 }])
      await page.waitForTimeout(100)
      await touch('touchMove', [held])

      const tap1: Pt = { x: quick.x, y: quick.y, id: 2 }
      await touch('touchStart', [held, tap1])
      await touch('touchEnd', [tap1])
      await expect.poll(() => hotbarSlots(page)).toEqual([2])
      await expect(page.getByTestId('hotbar-slot-2')).toHaveAttribute('aria-pressed', 'true')

      const tap2: Pt = { x: quick.x, y: quick.y, id: 3 }
      await touch('touchStart', [held, tap2])
      await touch('touchEnd', [tap2])
      await expect.poll(() => hotbarSlots(page)).toEqual([2, 1])
      await expect(page.getByTestId('hotbar-slot-1')).toHaveAttribute('aria-pressed', 'true')
      await touch('touchEnd', [])
    } finally {
      bot.disconnect()
    }
  })
})
