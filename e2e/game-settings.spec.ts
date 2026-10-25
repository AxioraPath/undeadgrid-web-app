import { expect, test } from '@playwright/test'
import { enterMatch } from './helpers'

test.describe('Ajustes dentro de la partida', () => {
  test('el botón de ajustes abre el modal sin salir de la partida', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      await page.getByTestId('game-settings').click()
      await expect(page.getByTestId('settings-modal')).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(page.getByTestId('settings-modal')).toHaveCount(0)
      // Sigue en la partida.
      await expect(page.getByTestId('game-canvas')).toBeVisible()
      await expect(page.getByTestId('hud-phase')).toBeVisible()
    } finally {
      bot.disconnect()
    }
  })
})
