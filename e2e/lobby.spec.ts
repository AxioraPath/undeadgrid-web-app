import { expect, test } from '@playwright/test'
import { createRoom, joinAsBot, login, serverState } from './helpers'

test.describe('Flow 2 - Lobbies', () => {
  test('create a room, connect the socket, mark ready and see the rival join', async ({ page }) => {
    const code = await createRoom(page)

    // Socket connection: the room only exists because lobby:create round-tripped over Socket.IO.
    await expect(page.getByTestId('player-count')).toHaveText('1 / 2')
    // The local player slot shows the logged-in account's display name.
    await expect(page.getByTestId('slot-1')).toContainText('Tester')
    const state = await serverState()
    expect(state.sockets).toBeGreaterThanOrEqual(1)
    expect(state.rooms.find((r) => r.code === code)?.players).toBe(1)

    // "Listo" state is confirmed by the server snapshot (lobby:state), not just local UI.
    const ready = page.getByTestId('ready-toggle')
    await expect(ready).toHaveAttribute('data-ready', 'false')
    await expect(page.getByTestId('start-match')).toBeDisabled()
    await ready.click()
    await expect(ready).toHaveAttribute('data-ready', 'true')
    await expect(ready).toContainText('Listo')

    // A rival joins through the same socket protocol and gets pushed to our UI in real time.
    const bot = await joinAsBot(code)
    try {
      await expect(page.getByTestId('player-count')).toHaveText('2 / 2')
      await expect(page.getByTestId('slot-2')).toBeVisible()
      await expect(page.getByTestId('start-match')).toBeEnabled()
      expect((await serverState()).sockets).toBeGreaterThanOrEqual(2)
    } finally {
      bot.disconnect()
    }
  })
  test('forms use custom validation (no native bubbles): room code, rename and chat', async ({ page }) => {
    await login(page)
    await page.getByTestId('menu-play').click()
    const joinForm = page.getByTestId('room-code-input').locator('xpath=ancestor::form')
    expect(await joinForm.evaluate((f) => (f as HTMLFormElement).noValidate)).toBe(true)
    await page.getByTestId('join-room').click()
    await expect(page.locator('#room-code-error')).toHaveText('Escribe el código de la sala')
    await page.getByTestId('room-code-input').fill('ABC')
    await page.getByTestId('join-room').click()
    await expect(page.locator('#room-code-error')).toHaveText('El código debe tener 5 caracteres')
    await page.getByTestId('room-code-input').fill('ABCDE')
    await expect(page.locator('#room-code-error')).toHaveCount(0)

    await page.getByTestId('create-room').click()
    await expect(page.getByTestId('lobby')).toBeVisible()

    const chat = page.getByLabel('Mensaje')
    expect(await chat.evaluate((i) => (i as HTMLInputElement).form!.noValidate)).toBe(true)
    await page.getByRole('button', { name: 'Enviar' }).click()
    await expect(page.locator('#chat-error')).toHaveText('Escribe un mensaje')
    await chat.fill('hola')
    await expect(page.locator('#chat-error')).toHaveCount(0)

    await page.getByRole('button', { name: 'Cambiar nombre' }).click()
    const name = page.getByLabel('Tu nombre')
    expect(await name.evaluate((i) => (i as HTMLInputElement).form!.noValidate)).toBe(true)
    await name.fill('   ')
    await name.press('Enter')
    await expect(page.locator('#rename-error')).toHaveText('Escribe tu nombre')
    await name.fill('Nuevo')
    await name.press('Enter')
    // The mock server has no lobby:rename; we only assert the editor closes without errors.
    await expect(page.getByLabel('Tu nombre')).toHaveCount(0)
  })
})
