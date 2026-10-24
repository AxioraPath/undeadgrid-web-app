import { expect, test } from '@playwright/test'
import { USER, login } from './helpers'

test.describe('Flow 1 - Authentication', () => {
  test('logged-out access to a room is redirected to login (room protection)', async ({ page }) => {
    await page.goto('/sala/ABCDE')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('login')).toBeVisible()
    await expect(page.getByTestId('lobby')).toHaveCount(0)

    await page.goto('/sala/ABCDE/partida')
    await expect(page).toHaveURL(/\/login$/)
    await expect(page.getByTestId('game')).toHaveCount(0)
  })

  test('invalid credentials show an error and keep the user logged out', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Correo electrónico').fill(USER.email)
    await page.getByLabel('Contraseña').fill('wrong-password-123')
    await page.getByRole('button', { name: 'ENTRAR' }).click()
    await expect(page.getByRole('alert')).toContainText('Credenciales inválidas')
    await expect(page).toHaveURL(/\/login$/)

    await page.goto('/sala/ABCDE')
    await expect(page).toHaveURL(/\/login$/)
  })

  test('valid credentials log in and unlock the protected room route', async ({ page }) => {
    await login(page)
    await expect(page).toHaveURL(/\/$/)
    await expect(page.getByTestId('go-auth')).toContainText('Tester')

    // Client-side navigation keeps the in-memory session.
    await page.getByTestId('menu-play').click()
    await page.getByTestId('create-room').click()
    await expect(page.getByTestId('lobby')).toBeVisible()
  })

  test('after logging in from a protected URL the user returns to it', async ({ page }) => {
    await page.goto('/sala/ABCDE')
    await expect(page).toHaveURL(/\/login$/)
    await page.getByLabel('Correo electrónico').fill(USER.email)
    await page.getByLabel('Contraseña').fill(USER.password)
    await page.getByRole('button', { name: 'ENTRAR' }).click()
    // Joining a non-existent room is rejected by the server, but we must land on the room route.
    await expect(page).toHaveURL(/\/sala\/ABCDE/)
  })
})
