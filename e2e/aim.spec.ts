import { expect, test, type Page } from '@playwright/test'
import { API, enterMatch, roomCodeFromUrl } from './helpers'

type LastInput = { action: boolean; fire?: boolean; aim?: { x: number; y: number } } | null

const lastInput = async (page: Page): Promise<LastInput> =>
  ((await (await fetch(`${API}/__test/last-input?code=${roomCodeFromUrl(page)}`)).json()) as { input: LastInput }).input

async function canvasBox(page: Page) {
  const box = (await page.getByTestId('game-canvas').boundingBox())!
  return { ...box, cx: box.x + box.width / 2, cy: box.y + box.height / 2 }
}

test.describe('Flow 3 - Mouse aiming', () => {
  test('with the setting on, the mouse sets the aim and left click holds the fire flag', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ug:settings', JSON.stringify({ mouseAim: true })))
    const bot = await enterMatch(page)
    try {
      const c = await canvasBox(page)

      // Mouse far to the right of the screen: the aim points right.
      await page.mouse.move(c.x + c.width - 20, c.cy)
      await expect.poll(async () => (await lastInput(page))?.aim?.x ?? 0).toBeGreaterThan(50)
      expect((await lastInput(page))?.fire).toBe(false)

      // Hold the left button: fire stays true (heartbeat) and the aim follows the mouse.
      // (Left click sends `fire`, not `action`, so it also shoots inside your own base.)
      await page.mouse.down()
      await expect.poll(async () => (await lastInput(page))?.fire).toBe(true)
      await page.mouse.move(c.x + 20, c.cy)
      await expect.poll(async () => (await lastInput(page))?.aim?.x ?? 0).toBeLessThan(-50)
      expect((await lastInput(page))?.fire).toBe(true)

      // Release: the fire flag drops.
      await page.mouse.up()
      await expect.poll(async () => (await lastInput(page))?.fire).toBe(false)
    } finally {
      bot.disconnect()
    }
  })

  test('with the setting off, no aim is sent and clicking does not shoot', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ug:settings', JSON.stringify({ mouseAim: false })))
    const bot = await enterMatch(page)
    try {
      const c = await canvasBox(page)
      await page.mouse.move(c.x + c.width - 20, c.cy)
      await page.mouse.down()
      await page.waitForTimeout(400)
      const input = await lastInput(page)
      expect(input).not.toBeNull()
      expect(input).not.toHaveProperty('aim')
      expect(input?.action).toBe(false)
      expect(input?.fire ?? false).toBe(false)
      await page.mouse.up()
    } finally {
      bot.disconnect()
    }
  })
})
