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
    await page.locator('#email').fill(USER.email)
    await page.locator('#password').fill('wrong-password-123')
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
    await page.locator('#email').fill(USER.email)
    await page.locator('#password').fill(USER.password)
    await page.getByRole('button', { name: 'ENTRAR' }).click()
    // Joining a non-existent room is rejected by the server, but we must land on the room route.
    await expect(page).toHaveURL(/\/sala\/ABCDE/)
  })
  test('login uses custom validation: empty submit shows inline errors and sends no request', async ({ page }) => {
    const requests: string[] = []
    page.on('request', (r) => r.url().includes('/api/auth/login') && requests.push(r.url()))
    await page.goto('/login')
    expect(await page.getByTestId('login').evaluate((f) => (f as HTMLFormElement).noValidate)).toBe(true)

    await page.getByRole('button', { name: 'ENTRAR' }).click()
    await expect(page.locator('#email-error')).toHaveText('Escribe tu correo')
    await expect(page.locator('#password-error')).toHaveText('Escribe tu contraseña')
    await expect(page.locator('#email')).toBeFocused()
    await expect(page.locator('#email')).toHaveAttribute('aria-invalid', 'true')
    expect(requests).toHaveLength(0)

    await page.locator('#email').fill('not-an-email')
    await expect(page.locator('#email-error')).toHaveText('Correo no válido')
    await page.getByRole('button', { name: 'ENTRAR' }).click()
    expect(requests).toHaveLength(0)

    await page.locator('#email').fill(USER.email)
    await expect(page.locator('#email-error')).toHaveCount(0)
  })

  test('register uses custom validation: short password and mismatched confirmation', async ({ page }) => {
    await page.goto('/registro')
    expect(await page.getByTestId('register').evaluate((f) => (f as HTMLFormElement).noValidate)).toBe(true)

    await page.getByRole('button', { name: 'CREAR CUENTA' }).click()
    await expect(page.locator('#name-error')).toHaveText('Escribe tu nombre')
    await expect(page.locator('#name')).toBeFocused()

    await page.locator('#name').fill('Tester')
    await page.locator('#email').fill(USER.email)
    await page.locator('#password').fill('short')
    await page.locator('#confirm').fill('short')
    await page.getByRole('button', { name: 'CREAR CUENTA' }).click()
    await expect(page.locator('#password-error')).toContainText('al menos 12 caracteres')

    await page.locator('#password').fill('correct-horse-battery')
    await page.locator('#confirm').fill('different-password-1')
    await page.getByRole('button', { name: 'CREAR CUENTA' }).click()
    await expect(page.locator('#confirm-error')).toHaveText('Las contraseñas no coinciden')
    await expect(page.locator('#confirm')).toBeFocused()
  })
})
