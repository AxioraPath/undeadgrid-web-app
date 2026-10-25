import { expect, test } from '@playwright/test'
import { botCall, enterMatch, readPos } from './helpers'

test.describe('Chat dentro de la partida', () => {
  test('Enter abre el chat, el mensaje llega y escribir no mueve al jugador; los del rival marcan no leídos', async ({ page }) => {
    const bot = await enterMatch(page)
    try {
      const start = await readPos(page)
      await page.keyboard.press('Enter')
      const input = page.getByTestId('game-chat-input')
      await expect(input).toBeFocused()
      // "dddd" se escribe en el chat: no debe mover al jugador a la derecha.
      await input.pressSequentially('hola dddd')
      await page.keyboard.press('Enter')
      await expect(input).toHaveCount(0)
      await expect(page.getByTestId('game-chat-message').last()).toContainText('hola dddd')
      expect((await readPos(page)).x).toBeCloseTo(start.x, 1)

      // Un mensaje del rival con el chat cerrado se ve unos segundos y suma un no leído.
      await botCall(bot, 'chat:send', { text: 'te voy a ganar' })
      await expect(page.getByTestId('game-chat-message').last()).toContainText('te voy a ganar')
      await expect(page.getByTestId('game-chat-unread')).toHaveText('1')
      await page.getByTestId('game-chat-button').click()
      await expect(page.getByTestId('game-chat-unread')).toHaveCount(0)
    } finally {
      bot.disconnect()
    }
  })
})
