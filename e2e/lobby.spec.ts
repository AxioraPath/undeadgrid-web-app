import { expect, test } from '@playwright/test'
import { createRoom, joinAsBot, serverState } from './helpers'

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
})
