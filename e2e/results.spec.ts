import { expect, test, type Page } from '@playwright/test'
import { botEmit, enterMatch, forceMatchOver } from './helpers'

const noPageScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight - window.innerHeight,
    w: document.documentElement.scrollWidth - window.innerWidth,
  }))
  expect(overflow.h).toBeLessThanOrEqual(0)
  expect(overflow.w).toBeLessThanOrEqual(0)
}

test.describe('Flow 5 - Match results', () => {
  test('victory shows the title, match info, both stat columns and the XP reward', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      await forceMatchOver(page, { winner: 1, xp: true })
      const end = page.getByTestId('match-end')
      await expect(end).toBeVisible()
      await expect(end).toHaveAttribute('data-outcome', 'victory')
      await expect(page.getByTestId('results-outcome')).toHaveText('VICTORIA')
      await expect(page.getByTestId('results-subtitle')).toHaveText('Destruiste el núcleo enemigo')
      await expect(page.getByTestId('results-room')).toHaveText(/^[A-Z0-9]{5}$/)
      await expect(page.getByTestId('results-map')).toHaveText('Ciudad Abandonada')
      await expect(page.getByTestId('results-duration')).toHaveText('03:25')
      await expect(page.getByTestId('results-badge-1')).toHaveText('GANADOR')
      await expect(page.getByTestId('results-badge-2')).toHaveText('DERROTA')
      await expect(page.getByTestId('stat-zombies-me')).toHaveText('47')
      await expect(page.getByTestId('stat-zombies-rival')).toHaveText('39')
      await expect(page.getByTestId('stat-structures-me')).toHaveText('12')
      await expect(page.getByTestId('stat-structures-rival')).toHaveText('10')
      await expect(page.getByTestId('stat-core-damage-me')).toHaveText('1000')
      await expect(page.getByTestId('stat-core-damage-rival')).toHaveText('640')
      await expect(page.getByTestId('match-xp-gained')).toHaveText('+40 XP')
      await expect(page.getByTestId('match-xp-bar')).toBeVisible()
      await noPageScroll(page)
    } finally {
      bot.disconnect()
    }
  })

  test('defeat, draw and opponent-left variants', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      await forceMatchOver(page, { winner: 2 })
      await expect(page.getByTestId('results-outcome')).toHaveText('DERROTA')
      await expect(page.getByTestId('results-subtitle')).toHaveText('Tu núcleo fue destruido')
      await expect(page.getByTestId('results-badge-1')).toHaveText('DERROTA')
      await expect(page.getByTestId('results-badge-2')).toHaveText('GANADOR')
      await expect(page.getByTestId('match-xp')).toHaveCount(0)
      await noPageScroll(page)

      await forceMatchOver(page, { winner: 0, reason: 'time_out' })
      await expect(page.getByTestId('results-outcome')).toHaveText('EMPATE')

      await forceMatchOver(page, { winner: 1, reason: 'opponent_left', left: 2 })
      await expect(page.getByTestId('results-outcome')).toHaveText('VICTORIA')
      await expect(page.getByTestId('results-subtitle')).toHaveText('El rival abandonó la partida')
      await expect(page.getByTestId('rematch-button')).toBeDisabled()
      await expect(page.getByTestId('rematch-hint')).toContainText('el rival salió')
    } finally {
      bot.disconnect()
    }
  })

  test('rematch: waiting modal, cancel, and both players requesting starts a new match', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      await forceMatchOver(page, { winner: 1 })
      const rematch = page.getByTestId('rematch-button')
      await expect(rematch).toBeEnabled()
      await rematch.click()

      const modal = page.getByTestId('rematch-modal')
      await expect(modal).toBeVisible()
      await expect(modal).toContainText('REVANCHA SOLICITADA')
      await expect(modal).toContainText('Esperando la respuesta del rival')
      await expect(page.getByTestId('rematch-me')).toContainText('Listo')
      await expect(page.getByTestId('rematch-rival')).toContainText('Esperando')
      await expect(rematch).toBeDisabled()
      await noPageScroll(page)

      await page.getByTestId('rematch-cancel').click()
      await expect(modal).toHaveCount(0)
      await expect(rematch).toBeEnabled()

      // Esc also cancels the request.
      await rematch.click()
      await expect(modal).toBeVisible()
      await page.keyboard.press('Escape')
      await expect(modal).toHaveCount(0)

      // The rival asks first: the button is highlighted; accepting starts the new match and leaves results.
      await botEmit(bot, 'match:rematchRequest')
      await expect(page.getByTestId('rematch-rival-asked')).toBeVisible()
      await rematch.click()
      await expect(page.getByTestId('match-end')).toHaveCount(0)
      await expect(page.getByTestId('game-canvas')).toBeVisible()
      await expect(page.getByTestId('hud-phase')).toBeVisible()
    } finally {
      bot.disconnect()
    }
  })

  test('VOLVER AL LOBBY asks for confirmation, then returns to the lobby', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      await forceMatchOver(page, { winner: 1 })
      await page.getByTestId('back-to-lobby').click()
      const dialog = page.getByTestId('confirm-lobby')
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText('¿VOLVER AL LOBBY?')
      await expect(dialog).toContainText('Dejarás esta pantalla de resultados para regresar a la sala.')
      await expect(dialog).toContainText(/Sala:\s*[A-Z0-9]{5}/)
      await expect(page.getByTestId('confirm-lobby-ok-btn')).toBeFocused()

      // Focus stays trapped inside the dialog.
      for (let i = 0; i < 4; i++) {
        await page.keyboard.press('Tab')
        expect(await page.evaluate(() => Boolean(document.activeElement?.closest('[role="dialog"]')))).toBe(true)
      }

      // Esc cancels and focus returns to the opener.
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(page.getByTestId('back-to-lobby')).toBeFocused()
      await expect(page.getByTestId('match-end')).toBeVisible()

      await page.getByTestId('back-to-lobby').click()
      await page.getByTestId('confirm-lobby-cancel').click()
      await expect(dialog).toHaveCount(0)

      await page.getByTestId('back-to-lobby').click()
      await page.getByTestId('confirm-lobby-ok-btn').click()
      await expect(page.getByTestId('lobby')).toBeVisible()
      await expect(page.getByTestId('match-end')).toHaveCount(0)
    } finally {
      bot.disconnect()
    }
  })

  test('SALIR asks for confirmation, then goes home', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      await forceMatchOver(page, { winner: 2 })
      await page.getByTestId('leave-room').click()
      const dialog = page.getByTestId('confirm-leave')
      await expect(dialog).toBeVisible()
      await expect(dialog).toContainText('¿SALIR DE LA SALA?')
      await expect(dialog).toContainText('El resultado de esta partida se conservará.')
      await expect(page.getByTestId('confirm-leave-cancel')).toBeFocused()

      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(page.getByTestId('match-end')).toBeVisible()

      await page.getByTestId('leave-room').click()
      await page.getByTestId('confirm-leave-ok-btn').click()
      await expect(page.getByTestId('home')).toBeVisible()
      await expect(page).toHaveURL(/\/$/)
    } finally {
      bot.disconnect()
    }
  })
})
