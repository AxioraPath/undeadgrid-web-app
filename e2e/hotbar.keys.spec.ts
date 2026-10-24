import { expect, test, type Page } from '@playwright/test'
import { API, enterMatch, readPos, roomCodeFromUrl } from './helpers'

type Cmd = { type: string; slot?: number }
const hotbarSlots = async (page: Page) =>
  (((await (await fetch(`${API}/__test/commands?code=${roomCodeFromUrl(page)}`)).json()) as { commands: Cmd[] }).commands)
    .filter((c) => c.type === 'hotbar')
    .map((c) => c.slot)

test.describe('Weapon switching while moving (desktop)', () => {
  test('number keys, Q and the mouse wheel switch weapons while a movement key is held', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ug:settings', JSON.stringify({ mouseAim: true })))
    const bot = await enterMatch(page)
    try {
      const start = await readPos(page)
      await page.keyboard.down('KeyD')
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(start.x + 0.5)

      await page.keyboard.press('Digit2')
      await expect.poll(() => hotbarSlots(page)).toEqual([2])
      await expect(page.getByTestId('hotbar-slot-2')).toHaveAttribute('aria-pressed', 'true')

      // Q returns to the previous weapon (pistol).
      await page.keyboard.press('KeyQ')
      await expect.poll(() => hotbarSlots(page)).toEqual([2, 1])
      await expect(page.getByTestId('hotbar-slot-1')).toHaveAttribute('aria-pressed', 'true')

      // Wheel cycles pistol <-> shotgun (mouse aim is on).
      await page.mouse.move(400, 300)
      await page.mouse.wheel(0, 100)
      await expect.poll(() => hotbarSlots(page)).toEqual([2, 1, 2])
      await page.waitForTimeout(300) // wheel switches are throttled
      await page.mouse.wheel(0, -100)
      await expect.poll(() => hotbarSlots(page)).toEqual([2, 1, 2, 1])

      // Still moving after all the switches.
      const before = await readPos(page)
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(before.x + 0.3)
      await page.keyboard.up('KeyD')
    } finally {
      bot.disconnect()
    }
  })
})
