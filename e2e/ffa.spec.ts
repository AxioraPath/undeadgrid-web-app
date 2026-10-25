import { expect, test } from '@playwright/test'
import { createRoom, joinAsBot } from './helpers'

test.describe('Todos contra todos', () => {
  test('el anfitrión elige el modo y las vidas; con 2 jugadores listos empieza y el HUD muestra las vidas', async ({ page }) => {
    const code = await createRoom(page)
    await page.getByTestId('mode-ffa').click()
    await expect(page.getByTestId('ffa-board')).toBeVisible()
    await expect(page.getByTestId('room-mode')).toHaveText('Todos')
    // 4 asientos, uno ocupado.
    for (const slot of [1, 2, 3, 4]) await expect(page.getByTestId(`slot-${slot}`)).toBeVisible()
    await expect(page.getByTestId('ffa-lives')).toContainText('3')
    await page.getByTestId('ffa-lives').click()
    await expect(page.getByTestId('ffa-lives')).toContainText('5')
    await expect(page.getByTestId('start-match')).toBeDisabled()

    await page.getByTestId('ready-toggle').click()
    const bot = await joinAsBot(code, true)
    try {
      await expect(page.getByTestId('start-match')).toBeEnabled()
      await page.getByTestId('start-match').click()
      await expect(page.getByTestId('game-canvas')).toBeVisible()
      const lives = page.getByTestId('hud-lives')
      await expect(lives).toBeVisible()
      await expect(page.getByTestId('hud-lives-1')).toHaveAttribute('data-lives', '5')
      // Sin núcleos en todos contra todos.
      await expect(page.getByTestId('hud-core-mine')).toHaveCount(0)
    } finally {
      bot.disconnect()
    }
  })
})
