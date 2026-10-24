import { expect, test } from '@playwright/test'
import { enterMatch, readPos } from './helpers'

// Runs only in the "mobile" project (Pixel 5 emulation, hasTouch).
test.describe('Flow 3 - Canvas (touch D-pad)', () => {
  test('dragging the D-pad with a real touch moves the player', async ({ page, context }) => {
    const bot = await enterMatch(page)
    try {
      const dpad = page.getByTestId('dpad')
      await expect(dpad).toBeVisible()
      const box = (await dpad.boundingBox())!
      const cx = box.x + box.width / 2
      const cy = box.y + box.height / 2

      const start = await readPos(page)
      const cdp = await context.newCDPSession(page)
      const touch = (type: string, x: number, y: number) =>
        cdp.send('Input.dispatchTouchEvent', { type, touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1 }] })

      // Push the knob to the right edge of the pad and hold.
      await touch('touchStart', cx, cy)
      await touch('touchMove', cx + 50, cy)
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(start.x + 1)
      await touch('touchEnd', 0, 0)

      // Release stops movement.
      await page.waitForTimeout(300)
      const stopped = await readPos(page)
      await page.waitForTimeout(400)
      expect(await readPos(page)).toEqual(stopped)
    } finally {
      bot.disconnect()
    }
  })
})
