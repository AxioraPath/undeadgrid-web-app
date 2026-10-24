import { expect, test } from '@playwright/test'
import { enterMatch, readPos } from './helpers'

test.describe('Flow 3 - Canvas (keyboard)', () => {
  test('holding movement keys changes the player coordinates exposed in the DOM', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(0)
      const start = await readPos(page)

      await page.keyboard.down('KeyD')
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(start.x + 1)
      await page.keyboard.up('KeyD')

      const mid = await readPos(page)
      await page.keyboard.down('KeyS')
      await expect.poll(async () => (await readPos(page)).y).toBeGreaterThan(mid.y + 1)
      await page.keyboard.up('KeyS')

      // Released keys: the player stops.
      await page.waitForTimeout(300)
      const stopped = await readPos(page)
      await page.waitForTimeout(400)
      expect(await readPos(page)).toEqual(stopped)
    } finally {
      bot.disconnect()
    }
  })
})
