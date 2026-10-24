import { expect, type Page } from '@playwright/test'
import { io } from 'socket.io-client'

export const USER = { email: 'tester@undeadgrid.dev', password: 'correct-horse-battery' }
export const API = 'http://127.0.0.1:3100'

export async function login(page: Page) {
  await page.goto('/login')
  await page.getByLabel('Correo electrónico').fill(USER.email)
  await page.getByLabel('Contraseña').fill(USER.password)
  await page.getByRole('button', { name: 'ENTRAR' }).click()
  await expect(page.getByTestId('home')).toBeVisible()
}

/** Logs in, creates a room from the home modal and returns its server-assigned code. */
export async function createRoom(page: Page): Promise<string> {
  await login(page)
  await page.getByTestId('menu-play').click()
  await page.getByTestId('create-room').click()
  await expect(page.getByTestId('lobby')).toBeVisible()
  const code = page.getByTestId('room-code')
  await expect(page).toHaveURL(/\/sala\/[A-Z0-9]{5}$/)
  // The URL first shows a client placeholder; wait until it matches the code the server assigned.
  await expect.poll(async () => page.url().endsWith(`/sala/${(await code.textContent())?.trim()}`)).toBe(true)
  return (await code.textContent())!.trim()
}

/** Second player: a plain socket.io client that joins the room and marks itself ready. */
export async function joinAsBot(code: string, ready = true) {
  const socket = io(API, { transports: ['websocket'] })
  await new Promise<void>((resolve, reject) => {
    socket.on('connect', () => resolve())
    socket.on('connect_error', reject)
  })
  const emit = <T>(event: string, payload?: unknown) =>
    new Promise<T>((resolve, reject) => {
      socket.emit(event, ...(payload === undefined ? [] : [payload]), (res: { ok: boolean; data: T; error?: unknown }) =>
        res.ok ? resolve(res.data) : reject(res.error),
      )
    })
  await emit('lobby:join', { code, name: 'Bot', survivor: 'mecanica' })
  if (ready) await emit('lobby:ready', { ready: true })
  return socket
}

export async function serverState(): Promise<{ sockets: number; rooms: { code: string; status: string; players: number }[] }> {
  return (await fetch(`${API}/__test/state`)).json()
}

export async function enterMatch(page: Page) {
  const code = await createRoom(page)
  await page.getByTestId('ready-toggle').click()
  const bot = await joinAsBot(code)
  await expect(page.getByTestId('start-match')).toBeEnabled()
  await page.getByTestId('start-match').click()
  await expect(page.getByTestId('game-canvas')).toBeVisible()
  await expect(page.getByTestId('hud-phase')).toBeVisible() // HUD renders once map + first state arrived
  return bot
}

export const readPos = async (page: Page) => {
  const el = page.getByTestId('player-pos')
  return { x: Number(await el.getAttribute('data-x')), y: Number(await el.getAttribute('data-y')) }
}
