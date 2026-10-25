import { expect, test, type Page } from '@playwright/test'
import { botCall, botEmit, createRoom, enterMatch2v2, forceMatchOver, joinAsBot, login, readPos, roomCodeFromUrl, switchTo2v2 } from './helpers'

const noPageScroll = async (page: Page) => {
  const overflow = await page.evaluate(() => ({
    h: document.documentElement.scrollHeight - window.innerHeight,
    w: document.documentElement.scrollWidth - window.innerWidth,
  }))
  expect(overflow.w).toBeLessThanOrEqual(0)
  expect(overflow.h).toBeLessThanOrEqual(0)
}

test.describe('2v2 - Lobby', () => {
  test('the host switches to 2v2, picks a team and the room fills up to 4 players', async ({ page }) => {
    const code = await createRoom(page)

    // Starts as 1v1.
    await expect(page.getByTestId('mode-1v1')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('team-board')).toHaveCount(0)
    await expect(page.getByTestId('player-count')).toHaveText('1 / 2')

    await switchTo2v2(page)
    await expect(page.getByTestId('mode-2v2')).toHaveAttribute('aria-pressed', 'true')
    await expect(page.getByTestId('room-mode')).toHaveText('2 vs 2')
    await expect(page.getByTestId('player-count')).toHaveText('1 / 4')
    await expect(page.getByTestId('team-1').getByTestId('slot-1')).toContainText('Tester')
    await expect(page.getByTestId('team-count-1')).toHaveText('1/2')
    await expect(page.getByTestId('team-count-2')).toHaveText('0/2')
    await expect(page.getByTestId('start-hint')).toHaveText('Faltan 3 jugadores para empezar')

    // Switch to team 2: the server re-derives the slot, the UI follows by player id.
    await page.getByTestId('join-team-2').click()
    await expect(page.getByTestId('team-2').getByTestId('slot-2')).toContainText('Tester')
    await expect(page.getByTestId('team-mine-2')).toBeVisible()
    await expect(page.getByTestId('team-count-1')).toHaveText('0/2')
    await expect(page.getByTestId('join-team-1')).toBeEnabled()

    // Three more players: slots 1, 3 (team 1) and 4 (team 2).
    const bots = [await joinAsBot(code, true, 'Ana'), await joinAsBot(code, true, 'Beto'), await joinAsBot(code, true, 'Cleo')]
    try {
      await expect(page.getByTestId('player-count')).toHaveText('4 / 4')
      await expect(page.getByTestId('team-count-1')).toHaveText('2/2')
      await expect(page.getByTestId('team-count-2')).toHaveText('2/2')
      await expect(page.getByTestId('join-team-1')).toBeDisabled()
      await expect(page.getByTestId('join-team-1')).toContainText('Completo')
      // The host is not ready yet.
      await expect(page.getByTestId('start-match')).toBeDisabled()
      await expect(page.getByTestId('start-hint')).toHaveText('Esperando a que todos estén listos')
      await page.getByTestId('ready-toggle').click()
      await expect(page.getByTestId('start-match')).toBeEnabled()
      await expect(page.getByTestId('start-hint')).toContainText('Todo listo')
      await noPageScroll(page)

      // A fifth player is rejected with a clear error.
      const extra = await joinAsBot(code, false, 'Extra').catch((e) => e)
      expect(extra?.code).toBe('ROOM_FULL')
    } finally {
      bots.forEach((b) => b.disconnect())
    }
  })

  test('inline Spanish errors: too many players for 1v1 and a full team', async ({ page }) => {
    const code = await createRoom(page)
    await switchTo2v2(page)
    const bots = [await joinAsBot(code, false, 'Ana'), await joinAsBot(code, false, 'Beto')]
    try {
      await expect(page.getByTestId('player-count')).toHaveText('3 / 4')
      await page.getByTestId('mode-1v1').click()
      await expect(page.getByTestId('lobby-error')).toContainText('Hay demasiados jugadores para 1v1: máximo 2')
      await expect(page.getByTestId('mode-2v2')).toHaveAttribute('aria-pressed', 'true')
      await page.getByTestId('lobby-error').getByRole('button', { name: 'Cerrar aviso' }).click()
      await expect(page.getByTestId('lobby-error')).toHaveCount(0)

      // Team 1 (host + Beto) is full: the server answers TEAM_FULL when the 4th player tries to join it.
      const late = await joinAsBot(code, false, 'Cleo')
      try {
        await expect(page.getByTestId('team-count-1')).toHaveText('2/2')
        const refused = await botCall(late, 'room:setTeam', { team: 1 })
        expect(refused.ok).toBe(false)
        expect(refused.error?.code).toBe('TEAM_FULL')
      } finally {
        late.disconnect()
      }

      // Not host: setMode is refused by the server.
      const notHost = await botCall(bots[1], 'lobby:setMode', { mode: '1v1' })
      expect(notHost.error?.code).toBe('NOT_HOST')
    } finally {
      bots.forEach((b) => b.disconnect())
    }
  })

  test('non-hosts see the mode read-only and pick their team; leaving updates the board', async ({ page }) => {
    const code = await createRoom(page)
    await switchTo2v2(page)

    const guest = await page.context().newPage()
    try {
      await login(guest)
      await guest.goto(`/sala/${code}`)
      await expect(guest.getByTestId('lobby')).toBeVisible()
      await expect(guest.getByTestId('team-board')).toBeVisible()
      await expect(guest.getByTestId('mode-1v1')).toBeDisabled()
      await expect(guest.getByTestId('mode-2v2')).toBeDisabled()
      await expect(guest.getByTestId('mode-2v2')).toHaveAttribute('aria-pressed', 'true')
      await expect(guest.getByTestId('mode-readonly')).toBeVisible()
      await expect(guest.getByTestId('player-count')).toHaveText('2 / 4')

      // The guest took slot 2 (team 2); moving to team 1 puts them in slot 3.
      await expect(guest.getByTestId('team-2').getByTestId('slot-2')).toBeVisible()
      await guest.getByTestId('join-team-1').click()
      await expect(guest.getByTestId('team-1').getByTestId('slot-3')).toBeVisible()
      await expect(page.getByTestId('team-1').getByTestId('slot-3')).toBeVisible()
      await expect(page.getByTestId('team-count-1')).toHaveText('2/2')

      // The guest leaves: the host sees the notice and the seat becomes free again.
      await guest.getByTestId('leave-room').click()
      await expect(guest.getByTestId('home')).toBeVisible()
    } finally {
      if (!guest.isClosed()) await guest.close()
    }
    await expect(page.getByTestId('rival-left')).toContainText('Un jugador salió de la sala')
    await expect(page.getByTestId('player-count')).toHaveText('1 / 4')
    await expect(page.getByTestId('team-count-1')).toHaveText('1/2')
  })
})

test.describe('2v2 - Match', () => {
  test('renders the match and the HUD shows both team cores and the teammate', async ({ page }) => {
    const bots = await enterMatch2v2(page)
    try {
      await expect(page.getByTestId('game-canvas')).toBeVisible()
      const mine = page.getByTestId('hud-core-mine')
      const rival = page.getByTestId('hud-core-rival')
      await expect(mine).toHaveAttribute('data-team', '1')
      await expect(rival).toHaveAttribute('data-team', '2')
      await expect(mine).toContainText('Tu núcleo')
      await expect(mine).toContainText('500')
      await expect(rival).toContainText('Núcleo rival')
      await expect(rival).toContainText('500')
      // Teammate (slot 3) is listed in the player panel; the HUD still shows MY stats (slot 1).
      await expect(page.getByTestId('hud-mate')).toContainText('Ana')
      await expect(page.getByTestId('hud-player')).toContainText('J1')

      // The canvas draws something non-empty and my movement is still keyed on my own slot.
      const before = await readPos(page)
      await page.keyboard.down('KeyD')
      await expect.poll(async () => (await readPos(page)).x).toBeGreaterThan(before.x + 1)
      await page.keyboard.up('KeyD')
    } finally {
      bots.forEach((b) => b.disconnect())
    }
  })

  test('a guest in slot 3 plays on their own slot (movement, team cores, mate)', async ({ page }) => {
    const code = await createRoom(page)
    await switchTo2v2(page)
    const rojo = await joinAsBot(code, true, 'Rojo') // slot 2
    const guest = await page.context().newPage()
    let luz: Awaited<ReturnType<typeof joinAsBot>> | null = null
    try {
      await login(guest)
      await guest.goto(`/sala/${code}`)
      await expect(guest.getByTestId('lobby')).toBeVisible()
      await expect(guest.getByTestId('team-1').getByTestId('slot-3')).toBeVisible() // free seat of team 1 (slot 3)
      await guest.getByTestId('ready-toggle').click()
      luz = await joinAsBot(code, true, 'Luz') // slot 4
      await page.getByTestId('ready-toggle').click()
      await expect(page.getByTestId('start-match')).toBeEnabled()
      await page.getByTestId('start-match').click()

      await expect(guest.getByTestId('hud-phase')).toBeVisible()
      await expect(guest.getByTestId('hud-core-mine')).toHaveAttribute('data-team', '1')
      await expect(guest.getByTestId('hud-core-rival')).toHaveAttribute('data-team', '2')
      await expect(guest.getByTestId('hud-player')).toContainText('J3')
      await expect(guest.getByTestId('hud-mate')).toContainText('J1')

      const before = await readPos(guest)
      await guest.keyboard.down('KeyS')
      await expect.poll(async () => (await readPos(guest)).y).toBeGreaterThan(before.y + 1)
      await guest.keyboard.up('KeyS')
      // The server received the input as slot 3, not as the room's first player.
      const res = await fetch(`http://127.0.0.1:3100/__test/last-input?code=${roomCodeFromUrl(page)}&slot=3`)
      expect((await res.json()).input.down).toBeDefined()
    } finally {
      rojo.disconnect()
      luz?.disconnect()
      await guest.close()
    }
  })
})

test.describe('2v2 - Results', () => {
  test('winning team: victory, 4 names, my teammate and both rivals in the stats', async ({ page }) => {
    const bots = await enterMatch2v2(page)
    try {
      await forceMatchOver(page, { winner: 1, xp: true })
      const end = page.getByTestId('match-end')
      await expect(end).toBeVisible()
      await expect(end).toHaveAttribute('data-outcome', 'victory')
      await expect(end).toHaveAttribute('data-mode', '2v2')
      await expect(page.getByTestId('results-outcome')).toHaveText('VICTORIA')
      await expect(page.getByTestId('results-subtitle')).toHaveText('Tu equipo destruyó el núcleo enemigo')
      await expect(page.getByTestId('results-badge-1')).toHaveText('GANADOR')
      await expect(page.getByTestId('results-badge-2')).toHaveText('DERROTA')
      // Slots: host 1, Rojo 2, Ana 3, Luz 4.
      await expect(page.getByTestId('results-team-1')).toContainText('Tester')
      await expect(page.getByTestId('results-team-1')).toContainText('Ana')
      await expect(page.getByTestId('results-team-2')).toContainText('Rojo')
      await expect(page.getByTestId('results-team-2')).toContainText('Luz')

      await expect(page.getByTestId('results-col-me')).toContainText('TÚ')
      await expect(page.getByTestId('results-col-mate')).toContainText('Ana')
      await expect(page.getByTestId('results-col-rival')).toContainText('Rojo')
      await expect(page.getByTestId('results-col-rival2')).toContainText('Luz')
      await expect(page.getByTestId('stat-zombies-me')).toHaveText('47')
      await expect(page.getByTestId('stat-zombies-mate')).toHaveText('21')
      await expect(page.getByTestId('stat-zombies-rival')).toHaveText('39')
      await expect(page.getByTestId('stat-zombies-rival2')).toHaveText('15')
      await expect(page.getByTestId('stat-core-damage-mate')).toHaveText('300')
      await expect(page.getByTestId('match-xp-gained')).toHaveText('+40 XP')
      await noPageScroll(page)
    } finally {
      bots.forEach((b) => b.disconnect())
    }
  })

  test('losing team: defeat; a draw; a rival team that left; rematch needs all 4', async ({ page }) => {
    const bots = await enterMatch2v2(page)
    try {
      await forceMatchOver(page, { winner: 2 })
      await expect(page.getByTestId('results-outcome')).toHaveText('DERROTA')
      await expect(page.getByTestId('results-subtitle')).toHaveText('El núcleo de tu equipo fue destruido')
      await expect(page.getByTestId('results-badge-1')).toHaveText('DERROTA')
      await expect(page.getByTestId('results-badge-2')).toHaveText('GANADOR')
      await expect(page.getByTestId('match-xp')).toHaveCount(0)
      await noPageScroll(page)

      await forceMatchOver(page, { winner: 0, reason: 'time_out' })
      await expect(page.getByTestId('results-outcome')).toHaveText('EMPATE')

      // Rematch with everybody present: waiting modal lists the 4 players, the match restarts once all ask.
      await forceMatchOver(page, { winner: 1 })
      await page.getByTestId('rematch-button').click()
      const modal = page.getByTestId('rematch-modal')
      await expect(modal).toBeVisible()
      await expect(page.getByTestId('rematch-me')).toContainText('Listo')
      await expect(page.getByTestId('rematch-mate')).toContainText('Esperando')
      await expect(page.getByTestId('rematch-rival')).toContainText('Esperando')
      await expect(page.getByTestId('rematch-rival-2')).toContainText('Esperando')
      await botEmit(bots[0], 'match:rematchRequest')
      await expect(page.getByTestId('rematch-rival')).toContainText('Listo')
      await expect(page.getByTestId('match-end')).toBeVisible()
      await botEmit(bots[1], 'match:rematchRequest')
      await botEmit(bots[2], 'match:rematchRequest')
      await expect(page.getByTestId('match-end')).toHaveCount(0)
      await expect(page.getByTestId('hud-phase')).toBeVisible()

      // One player leaves right after the match: the whole team still wins, but no rematch is possible.
      await forceMatchOver(page, { winner: 1, reason: 'opponent_left', left: 4 })
      await expect(page.getByTestId('results-outcome')).toHaveText('VICTORIA')
      await expect(page.getByTestId('results-subtitle')).toHaveText('El equipo rival abandonó la partida')
      await expect(page.getByTestId('rematch-button')).toBeDisabled()
      await expect(page.getByTestId('rematch-hint')).toContainText('un jugador salió')
      // The player that left still has their stats column.
      await expect(page.getByTestId('stat-zombies-rival2')).toHaveText('15')
    } finally {
      bots.forEach((b) => b.disconnect())
    }
  })

  test('a host on team 2 that wins sees victory and goes back to the lobby with the 2v2 board', async ({ page }) => {
    const code = await createRoom(page)
    await switchTo2v2(page)
    await page.getByTestId('join-team-2').click()
    await expect(page.getByTestId('team-2').getByTestId('slot-2')).toContainText('Tester')
    const bots = [await joinAsBot(code, true, 'Ana'), await joinAsBot(code, true, 'Beto'), await joinAsBot(code, true, 'Cleo')]
    try {
      await page.getByTestId('ready-toggle').click()
      await page.getByTestId('start-match').click()
      await expect(page.getByTestId('hud-phase')).toBeVisible()
      await expect(page.getByTestId('hud-core-mine')).toHaveAttribute('data-team', '2')
      await expect(page.getByTestId('hud-core-rival')).toHaveAttribute('data-team', '1')

      await forceMatchOver(page, { winner: 2 })
      await expect(page.getByTestId('results-outcome')).toHaveText('VICTORIA')
      await expect(page.getByTestId('results-badge-2')).toHaveText('GANADOR')
      await expect(page.getByTestId('results-badge-1')).toHaveText('DERROTA')
      await expect(page.getByTestId('stat-zombies-me')).toHaveText('39') // slot 2

      await page.getByTestId('back-to-lobby').click()
      await page.getByTestId('confirm-lobby-ok-btn').click()
      await expect(page.getByTestId('lobby')).toBeVisible()
      await expect(page.getByTestId('team-board')).toBeVisible()
      await expect(page.getByTestId('player-count')).toHaveText('4 / 4')
      await expect(page.getByTestId('team-2').getByTestId('slot-2')).toContainText('Tester')
    } finally {
      bots.forEach((b) => b.disconnect())
    }
  })
})
