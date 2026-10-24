import { expect, test, type Page } from '@playwright/test'
import { enterMatch } from './helpers'

type Stored = { hudLayout?: { v: number; items: Record<string, { x: number; y: number; scale: number }> }; hudOpacity?: number; controlOpacity?: number }

const stored = (page: Page): Promise<Stored> => page.evaluate(() => JSON.parse(localStorage.getItem('ug:settings') ?? '{}'))

async function openEditor(page: Page) {
  await page.goto('/')
  await page.getByTestId('menu-settings').click()
  await page.getByTestId('setting-hud-editor').click()
  await expect(page.getByTestId('hud-editor')).toBeVisible()
  await expect(page.getByTestId('hud-editor-frame')).toBeVisible()
}

async function dragBy(page: Page, testId: string, dx: number, dy: number) {
  const box = (await page.getByTestId(testId).boundingBox())!
  const x = box.x + box.width / 2
  const y = box.y + box.height / 2
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + dx / 2, y + dy / 2, { steps: 4 })
  await page.mouse.move(x + dx, y + dy, { steps: 4 })
  await page.mouse.up()
}

test.describe('HUD editor (desktop)', () => {
  test('opens from Ajustes, dragging stores a position and the page does not scroll', async ({ page }) => {
    await openEditor(page)
    expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true)
    expect((await stored(page)).hudLayout?.items?.hotbar).toBeUndefined()

    await page.getByTestId('hud-edit-snap').uncheck()
    const frame = (await page.getByTestId('hud-editor-frame').boundingBox())!
    await dragBy(page, 'hud-edit-hotbar', -frame.width * 0.3, -frame.height * 0.4)

    const item = (await stored(page)).hudLayout!.items.hotbar
    expect(item.x).toBeLessThan(0.45)
    expect(item.y).toBeLessThan(0.7)
    expect(item.scale).toBe(1)
    expect((await stored(page)).hudLayout!.v).toBe(1)
  })

  test('elements are clamped inside the safe area when dragged far outside', async ({ page }) => {
    await openEditor(page)
    const frame = (await page.getByTestId('hud-editor-frame').boundingBox())!
    await dragBy(page, 'hud-edit-minimap', frame.width * 1.1, -frame.height * 1.1)
    const item = (await stored(page)).hudLayout!.items.minimap
    expect(item.x).toBe(1)
    expect(item.y).toBe(0)
    const area = (await page.getByTestId('hud-editor-area').boundingBox())!
    const el = (await page.getByTestId('hud-edit-minimap').boundingBox())!
    expect(el.x + el.width).toBeLessThanOrEqual(area.x + area.width + 1)
    expect(el.y).toBeGreaterThanOrEqual(area.y - 1)
  })

  test('arrow keys nudge and the size slider scales', async ({ page }) => {
    await openEditor(page)
    await page.getByTestId('hud-edit-playerPanel').focus()
    await page.keyboard.press('ArrowRight')
    const nudged = (await stored(page)).hudLayout!.items.playerPanel
    expect(nudged.x).toBeCloseTo(0.01, 2)
    await page.keyboard.press('Shift+ArrowDown')
    expect((await stored(page)).hudLayout!.items.playerPanel.y).toBeCloseTo(0.05, 2)

    await page.getByTestId('hud-edit-scale').fill('50')
    expect((await stored(page)).hudLayout!.items.playerPanel.scale).toBe(0.5)
    await page.getByTestId('hud-edit-scale').fill('150')
    expect((await stored(page)).hudLayout!.items.playerPanel.scale).toBe(1.5)
  })

  test('reset restores one element or everything to the built-in layout', async ({ page }) => {
    await openEditor(page)
    await page.getByTestId('hud-edit-snap').uncheck()
    const frame = (await page.getByTestId('hud-editor-frame').boundingBox())!
    await dragBy(page, 'hud-edit-hotbar', -frame.width * 0.3, 0)
    await dragBy(page, 'hud-edit-phasePanel', 0, frame.height * 0.3)
    expect(Object.keys((await stored(page)).hudLayout!.items).sort()).toEqual(['hotbar', 'phasePanel'])

    await page.getByTestId('hud-pick-hotbar').click()
    await page.getByTestId('hud-edit-reset-item').click()
    expect(Object.keys((await stored(page)).hudLayout!.items)).toEqual(['phasePanel'])

    await page.getByTestId('hud-edit-reset-all').click()
    expect(Object.keys((await stored(page)).hudLayout!.items)).toEqual([])
    await expect(page.getByTestId('hud-edit-reset-all')).toBeDisabled()

    // Back in Ajustes after closing the editor.
    await page.getByTestId('hud-edit-close').click()
    await expect(page.getByTestId('hud-editor')).toHaveCount(0)
    await expect(page.getByTestId('settings-modal')).toBeVisible()
  })

  test('invalid or old stored layouts fall back to safe defaults', async ({ page }) => {
    await page.addInitScript(() => {
      if (!localStorage.getItem('seeded')) {
        localStorage.setItem('seeded', '1')
        localStorage.setItem('ug:settings', JSON.stringify({ hudOpacity: 9, controlOpacity: -3, hudLayout: { v: 99, items: { hotbar: { x: 0.2, y: 0.2, scale: 1 } } } }))
      }
    })
    await page.goto('/')
    await page.getByTestId('menu-settings').click()
    await expect(page.getByTestId('setting-hud-opacity')).toHaveValue('100')
    await expect(page.getByTestId('setting-control-opacity')).toHaveValue('25')
    await page.getByTestId('setting-hud-editor').click()
    await expect(page.getByTestId('hud-edit-reset-all')).toBeDisabled()
  })

  test('saved positions and size are applied on the match screen', async ({ page }) => {
    await page.addInitScript(() =>
      localStorage.setItem(
        'ug:settings',
        JSON.stringify({
          hudLayout: {
            v: 1,
            items: {
              hotbar: { x: 0, y: 0, scale: 1 },
              minimap: { x: 1, y: 0.5, scale: 1 },
              playerPanel: { x: 1, y: 1, scale: 0.5 },
            },
          },
        }),
      ),
    )
    const bot = await enterMatch(page)
    try {
      const vp = page.viewportSize()!
      const hotbar = (await page.getByTestId('hotbar').boundingBox())!
      // Top-left corner of the safe area (viewport edge + the HUD gap).
      expect(hotbar.x).toBeGreaterThanOrEqual(0)
      expect(hotbar.x).toBeLessThan(24)
      expect(hotbar.y).toBeLessThan(24)

      const mini = (await page.locator('[data-hud-slot="minimap"]').boundingBox())!
      expect(vp.width - (mini.x + mini.width)).toBeLessThan(24)
      expect(mini.y).toBeGreaterThan(vp.height * 0.2)

      // Bottom-right, half size.
      const panel = (await page.getByTestId('hud-player').boundingBox())!
      expect(vp.width - (panel.x + panel.width)).toBeLessThan(24)
      expect(vp.height - (panel.y + panel.height)).toBeLessThan(24)
      expect(panel.width).toBeLessThan(200)
    } finally {
      bot.disconnect()
    }
  })

  test('HUD transparency lowers only the panel background, never the text', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('menu-settings').click()
    await page.getByTestId('setting-hud-opacity').fill('50')
    await expect(page.getByTestId('setting-hud-opacity-value')).toHaveText('50%')
    expect((await stored(page)).hudOpacity).toBe(0.5)
    await page.keyboard.press('Escape')

    const bot = await enterMatch(page)
    try {
      const panel = page.getByTestId('hud-phase')
      await expect.poll(() => panel.evaluate((el) => getComputedStyle(el).backgroundImage)).toContain('0.46')
      expect(await panel.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
      expect(await page.getByTestId('hud-timer').evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
    } finally {
      bot.disconnect()
    }
  })

  test('the hotbar keeps a readable minimum opacity', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('ug:settings', JSON.stringify({ controlOpacity: 0.25 })))
    const bot = await enterMatch(page)
    try {
      await expect.poll(() => page.getByTestId('hotbar').evaluate((el) => getComputedStyle(el).opacity)).toBe('0.5')
    } finally {
      bot.disconnect()
    }
  })
})
