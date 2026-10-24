import { expect, test } from '@playwright/test'
import { login } from './helpers'

test.describe('Flow - XP and missions', () => {
  test('claiming a completed mission raises the XP bar', async ({ page }) => {
    await login(page)

    // Home profile card shows the level and XP from /me.
    const homeXp = page.getByTestId('home-xp-text')
    await expect(homeXp).toHaveText('30 / 100 XP')
    await expect(page.getByTestId('menu-missions-badge')).toHaveText('1')

    await page.getByTestId('menu-missions').click()
    const modal = page.getByTestId('missions-modal')
    await expect(modal).toBeVisible()
    await expect(page.getByTestId('missions-reset')).toContainText(/Se reinician en \d\d:\d\d/)
    await expect(page.getByTestId('claim-daily_zombies_20')).toBeDisabled()

    const xpText = page.getByTestId('missions-xp-text')
    await expect(xpText).toHaveText('30 / 100 XP')
    await page.getByTestId('claim-daily_win_1').click()

    await expect(xpText).toHaveText('70 / 100 XP')
    await expect(page.getByTestId('mission-daily_win_1-done')).toBeVisible()
    await expect(page.getByTestId('claim-daily_win_1')).toHaveCount(0)
    await expect(homeXp).toHaveText('70 / 100 XP')
  })
})
