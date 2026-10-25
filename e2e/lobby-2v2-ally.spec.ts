import { expect, test } from '@playwright/test'
import { createRoom, joinAsBot, switchTo2v2 } from './helpers'

test.describe('Lobby 2v2', () => {
  test('se ve el personaje del compañero de equipo; el de los rivales sigue oculto', async ({ page }) => {
    const code = await createRoom(page)
    await switchTo2v2(page)
    // slot 2 = equipo rival, slot 3 = mi compañero (equipo 1).
    const bots = [await joinAsBot(code, true, 'Rojo'), await joinAsBot(code, true, 'Ana')]
    try {
      await expect(page.getByTestId('slot-3')).toContainText('Ana')
      await expect(page.getByTestId('slot-3')).not.toContainText('Eligiendo superviviente')
      await expect(page.getByTestId('slot-3').getByRole('img', { name: 'Superviviente sin revelar' })).toHaveCount(0)
      await expect(page.getByTestId('slot-2')).toContainText('Eligiendo superviviente')
    } finally {
      for (const b of bots) b.disconnect()
    }
  })
})
