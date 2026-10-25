import { expect, test } from '@playwright/test'
import { enterMatch } from './helpers'

test.describe('Sonido', () => {
  test('ajustes de volumen de música y efectos se guardan', async ({ page }) => {
    await page.goto('/')
    await page.getByTestId('menu-settings').click()
    await page.getByTestId('setting-music-volume').fill('0')
    await expect(page.getByTestId('setting-music-volume-value')).toHaveText('Apagada')
    await page.getByTestId('setting-sfx-volume').fill('40')
    await expect(page.getByTestId('setting-sfx-volume-value')).toHaveText('40%')
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('ug:settings') ?? '{}'))
    expect(stored.musicVolume).toBe(0)
    expect(stored.sfxVolume).toBe(0.4)
  })

  test('al tocar la pantalla se activan los sonidos y se cargan sin errores', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (e) => errors.push(e.message))
    const loaded: string[] = []
    page.on('response', (r) => {
      if (r.url().includes('/assets/audio/') && r.ok()) loaded.push(r.url().split('/').pop()!)
    })
    const bot = await enterMatch(page)
    try {
      await page.getByTestId('game-canvas').click({ position: { x: 300, y: 300 } })
      await expect.poll(() => loaded.filter((n) => n.startsWith('zombi-') || n.startsWith('explosion-')).length).toBe(8)
      await expect.poll(() => loaded.some((n) => n.startsWith('musica-partida'))).toBe(true)
      expect(errors).toEqual([])
    } finally {
      bot.disconnect()
    }
  })
})
