import { expect, test } from '@playwright/test'
import { createRoom, forceMatchOver, joinAsBot } from './helpers'

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

  test('al terminar se ve solo al ganador y una tabla con todos los jugadores', async ({ page }) => {
    const code = await createRoom(page)
    await page.getByTestId('mode-ffa').click()
    await page.getByTestId('ready-toggle').click()
    const bots = [await joinAsBot(code, true, 'Rojo'), await joinAsBot(code, true, 'Verde')]
    try {
      await page.getByTestId('start-match').click()
      await expect(page.getByTestId('hud-lives')).toBeVisible()
      await forceMatchOver(page, { winnerSlot: 1, reason: 'last_standing' })
      const end = page.getByTestId('match-end')
      await expect(end).toHaveAttribute('data-mode', 'ffa')
      await expect(end).toHaveAttribute('data-outcome', 'victory')
      await expect(page.getByTestId('results-winner')).toHaveAttribute('data-slot', '1')
      await expect(page.getByTestId('results-winner-name')).toContainText('Tester')
      // Una fila por jugador, el ganador primero; sin paneles de equipo.
      await expect(page.locator('[data-testid^="results-row-"]')).toHaveCount(3)
      await expect(page.getByTestId('results-team-1')).toHaveCount(0)
      await expect(page.getByTestId('results-kills-1')).toHaveText('4')
    } finally {
      for (const b of bots) b.disconnect()
    }
  })
})
