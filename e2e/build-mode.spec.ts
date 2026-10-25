import { expect, test } from '@playwright/test'
import { enterMatch } from './helpers'

test.describe('Modo construir en la barra', () => {
  test('la pared solo se marca al elegirla y se suelta al tocarla otra vez o elegir un arma', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      const wall = page.getByTestId('hotbar-slot-4')
      await expect(wall).toHaveAttribute('aria-pressed', 'false')
      await wall.click()
      await expect(wall).toHaveAttribute('aria-pressed', 'true')
      await wall.click()
      await expect(wall).toHaveAttribute('aria-pressed', 'false')
      await page.keyboard.press('Digit4')
      await expect(wall).toHaveAttribute('aria-pressed', 'true')
      await page.keyboard.press('Digit2')
      await expect(wall).toHaveAttribute('aria-pressed', 'false')
      await expect(page.getByTestId('hotbar-slot-2')).toHaveAttribute('aria-pressed', 'true')
    } finally {
      bot.disconnect()
    }
  })
})
