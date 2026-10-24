import { expect, test, type Page } from '@playwright/test'
import { enterMatch } from './helpers'

// Runs only in the "mobile" projects (landscape touch emulation, hasTouch).
type Stored = { hudLayout?: { items: Record<string, { x: number; y: number; scale: number }> } }
const stored = (page: Page): Promise<Stored> => page.evaluate(() => JSON.parse(localStorage.getItem('ug:settings') ?? '{}'))

test.describe('HUD editor (touch)', () => {
  test('a finger drag moves a joystick, the editor fits the screen, and the match uses the layout', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('menu-settings').click()
    await page.getByTestId('setting-hud-editor').click()
    const editor = page.getByTestId('hud-editor')
    await expect(editor).toBeVisible()

    // Everything fits the landscape phone viewport.
    const vp = page.viewportSize()!
    const eb = (await editor.boundingBox())!
    expect(eb.width).toBeLessThanOrEqual(vp.width + 1)
    expect(eb.height).toBeLessThanOrEqual(vp.height + 1)
    for (const id of ['moveStick', 'aimStick', 'quickWeapon', 'hotbar', 'minimap', 'playerPanel', 'phasePanel']) {
      await expect(page.getByTestId(`hud-edit-${id}`)).toBeVisible()
    }

    await page.getByTestId('hud-edit-snap').uncheck()
    const frame = (await page.getByTestId('hud-editor-frame').boundingBox())!
    const stick = (await page.getByTestId('hud-edit-moveStick').boundingBox())!
    const cdp = await page.context().newCDPSession(page)
    const x = stick.x + stick.width / 2
    const y = stick.y + stick.height / 2
    // Move the left stick towards the top-right of the preview with a real touch.
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + frame.width * 0.2, y: y - frame.height * 0.3, id: 1 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + frame.width * 0.4, y: y - frame.height * 0.45, id: 1 }] })
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] })

    const item = (await stored(page)).hudLayout!.items.moveStick
    expect(item.x).toBeGreaterThan(0.25)
    expect(item.y).toBeLessThan(0.8)

    // Control transparency from the editor sidebar.
    await page.getByTestId('hud-edit-control-opacity').fill('40')
    await page.getByTestId('hud-edit-close').click()

    const bot = await enterMatch(page)
    try {
      const slot = (await page.locator('[data-hud-slot="moveStick"]').boundingBox())!
      // The default is flush bottom-left; the saved position is clearly away from that corner.
      expect(slot.x).toBeGreaterThan(vp.width * 0.1)
      expect(slot.y + slot.height).toBeLessThan(vp.height - 8)
      expect(slot.x + slot.width).toBeLessThanOrEqual(vp.width)
      expect(slot.y).toBeGreaterThanOrEqual(0)
      await expect(page.getByTestId('move-stick')).toBeVisible()
      expect(await page.getByTestId('move-stick').evaluate((el) => getComputedStyle(el).opacity)).toBe('0.4')
      expect(await page.getByTestId('aim-stick').evaluate((el) => getComputedStyle(el).opacity)).toBe('0.4')
      expect(await page.getByTestId('quick-weapon').evaluate((el) => getComputedStyle(el).opacity)).toBe('0.4')
    } finally {
      bot.disconnect()
    }
  })

  test('the Ajustes slider changes the controls opacity', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('menu-settings').click()
    await page.getByTestId('setting-control-opacity').fill('100')
    await page.keyboard.press('Escape')
    const bot = await enterMatch(page)
    try {
      expect(await page.getByTestId('move-stick').evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    } finally {
      bot.disconnect()
    }
  })
})
