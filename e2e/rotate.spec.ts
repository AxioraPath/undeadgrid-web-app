import { expect, test } from '@playwright/test'

// Runs in the "phone-orientation" project (touch phone emulation); desktop is checked with a plain context.
test.describe('Rotate-device overlay', () => {
  test('phone in portrait is covered, landscape is not, and rotating toggles it live', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/login')
    const overlay = page.getByTestId('rotate-device')
    await expect(overlay).toBeVisible()
    await expect(overlay).toContainText('Gira tu celular')
    await expect(overlay).toContainText('UndeadGrid se juega mejor en horizontal.')
    // The app underneath stays mounted but is inert.
    await expect(page.locator('#root')).toHaveAttribute('inert', '')
    await expect(page.locator('#email')).toHaveCount(1)

    await page.setViewportSize({ width: 844, height: 390 })
    await expect(overlay).toHaveCount(0)
    await expect(page.locator('#root')).not.toHaveAttribute('inert', '')
    await page.locator('#email').fill('keeps@state.dev') // same DOM node: state survived the rotation

    await page.setViewportSize({ width: 390, height: 844 })
    await expect(overlay).toBeVisible()
    await page.setViewportSize({ width: 844, height: 390 })
    await expect(overlay).toHaveCount(0)
    await expect(page.locator('#email')).toHaveValue('keeps@state.dev')
  })

  test('landscape phone loads without the overlay', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.getByTestId('rotate-device')).toHaveCount(0)
  })

  test('desktop and tablet are never blocked', async ({ browser }) => {
    for (const [width, height, touch] of [
      [1366, 768, false],
      [820, 1180, true],
    ] as const) {
      const ctx = await browser.newContext({ viewport: { width, height }, screen: { width, height }, hasTouch: touch, isMobile: touch })
      const page = await ctx.newPage()
      await page.goto('/login')
      await expect(page.locator('#email')).toBeVisible()
      await expect(page.getByTestId('rotate-device')).toHaveCount(0)
      await ctx.close()
    }
  })
})
