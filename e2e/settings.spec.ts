import { expect, test } from '@playwright/test'

test('Ajustes: se abre desde el inicio y los cambios se guardan', async ({ page }) => {
  await page.goto('/')
  await page.getByTestId('menu-settings').click()
  const modal = page.getByTestId('settings-modal')
  await expect(modal).toBeVisible()

  await modal.getByTestId('setting-zoom').getByRole('radio', { name: 'Lejos' }).click()
  await modal.getByTestId('setting-fps').click()
  await expect(modal.getByTestId('setting-fps')).toHaveAttribute('aria-checked', 'false')

  // Al recargar, los ajustes siguen ahí (se guardan en este navegador).
  await page.reload()
  await page.getByTestId('menu-settings').click()
  await expect(page.getByTestId('setting-zoom').getByRole('radio', { name: 'Lejos' })).toHaveAttribute('aria-checked', 'true')
  await expect(page.getByTestId('setting-fps')).toHaveAttribute('aria-checked', 'false')

  await page.getByTestId('settings-reset').click()
  await expect(page.getByTestId('setting-fps')).toHaveAttribute('aria-checked', 'true')
})
