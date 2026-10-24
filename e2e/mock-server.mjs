// Minimal in-memory stand-in for service-undeadgrid used by the E2E suite.
// REST: /health, /api/auth/{login,register,refresh,logout}, /api/me, /api/me/missions(+/:key/claim), /__test/state
// Socket.IO: the lobby + game events the web app uses (see src/shared/lib/contracts.ts).
// Results flow: POST /__test/match-over?code=&winner=1|2|0&reason=&xp=1&left=1 ends the match deterministically
// (emits match:over); match:rematchRequest/Cancel, match:rematchState and lobby:backToLobby behave like the real server.
// Simplifications vs the real server: lobby:start jumps straight to "combat" and the
// simulation only moves players at constant speed according to game:input.
import { createServer } from 'node:http'
import { Server } from 'socket.io'

const PORT = Number(process.env.MOCK_PORT ?? 3100)
const TEST_USER = { id: 'u1', email: 'tester@undeadgrid.dev', displayName: 'Tester', password: 'correct-horse-battery' }

const TICK_HZ = 30
const SPEED = 6 // tiles per second
const MAP_W = 40
const MAP_H = 24

const rooms = new Map()
const sessions = new Map() // sessionId -> { code, slot }

const json = (res, status, body, headers = {}) => {
  res.writeHead(status, { 'Content-Type': 'application/json', ...headers })
  res.end(JSON.stringify(body))
}
const readBody = (req) =>
  new Promise((resolve) => {
    let raw = ''
    req.on('data', (c) => (raw += c))
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {})
      } catch {
        resolve({})
      }
    })
  })
const hasRefreshCookie = (req) => /(?:^|;\s*)refresh_token=ok/.test(req.headers.cookie ?? '')
const COOKIE = 'refresh_token=ok; HttpOnly; Path=/api/auth; SameSite=Lax'
const authOk = (u) => ({ user: { id: u.id, email: u.email, displayName: u.displayName }, accessToken: 'mock-access-token' })

// Deterministic profile + missions for the XP/missions flow. Level 3 needs 100 XP; the claimable mission gives 40.
const profile = { level: 3, xp: 30, xpToNext: 100, preferredSurvivor: 'explorador' }
const missions = [
  { key: 'daily_win_1', type: 'daily', title: 'Gana una partida', description: 'Gana 1 partida 1v1.', goal: 1, progress: 1, reward: 40, status: 'completed' },
  { key: 'daily_zombies_20', type: 'daily', title: 'Cazazombis', description: 'Elimina 20 zombis.', goal: 20, progress: 8, reward: 30, status: 'active' },
  { key: 'milestone_matches_10', type: 'milestone', title: 'Veterano', description: 'Juega 10 partidas.', goal: 10, progress: 4, reward: 100, status: 'active' },
]
const dailyResetsAt = () => new Date(Date.now() + 3 * 3600_000 + 25 * 60_000).toISOString()
const meBody = () => ({
  id: TEST_USER.id,
  email: TEST_USER.email,
  displayName: TEST_USER.displayName,
  createdAt: '2026-01-01T00:00:00.000Z',
  profile: { ...profile },
  stats: null,
})
const claimMission = (key) => {
  const m = missions.find((x) => x.key === key)
  if (!m) return [404, { message: 'Misión no encontrada' }]
  if (m.status !== 'completed') return [409, { message: 'La misión no se puede reclamar' }]
  m.status = 'claimed'
  profile.xp += m.reward
  let leveledUp = false
  while (profile.xp >= profile.xpToNext) {
    profile.xp -= profile.xpToNext
    profile.level++
    leveledUp = true
  }
  return [200, { reward: m.reward, leveledUp, newLevel: profile.level, profile: { level: profile.level, xp: profile.xp, xpToNext: profile.xpToNext } }]
}

const http = createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x')
  if (url.pathname === '/health') return json(res, 200, { status: 'ok', rooms: rooms.size })
  if (url.pathname === '/__test/state') {
    return json(res, 200, {
      sockets: io.engine.clientsCount,
      rooms: [...rooms.values()].map((r) => ({ code: r.code, status: r.status, players: r.players.length })),
    })
  }
  if (req.method === 'POST' && url.pathname === '/__test/match-over') {
    const room = url.searchParams.get('code') ? rooms.get(url.searchParams.get('code')) : [...rooms.values()].at(-1)
    if (!room) return json(res, 404, { message: 'No room' })
    const winnerParam = Number(url.searchParams.get('winner') ?? 1)
    const reason = url.searchParams.get('reason') ?? 'core_destroyed'
    if (url.searchParams.get('left')) room.players = room.players.filter((p) => p.slot !== Number(url.searchParams.get('left')))
    room.status = 'results'
    room.rematch = new Set()
    const payload = {
      ...snapshot(room),
      stats: {
        1: { zombieKills: 47, structuresBuilt: 12, coreDamageDealt: 1000, coreHpPct: 100 },
        2: { zombieKills: 39, structuresBuilt: 10, coreDamageDealt: 640, coreHpPct: 68 },
      },
      durationS: 240,
      winner: winnerParam === 1 || winnerParam === 2 ? winnerParam : null,
      reason,
      mapName: 'Ciudad Abandonada',
      ...(url.searchParams.get('xp') ? { xp: { 1: 40, 2: 25 } } : {}),
    }
    io.to(room.code).emit('match:over', payload)
    return json(res, 200, { ok: true })
  }
  if (url.pathname === '/api/me') return json(res, 200, meBody())
  if (url.pathname === '/api/me/missions') return json(res, 200, { missions, dailyResetsAt: dailyResetsAt() })
  const claim = url.pathname.match(/^\/api\/me\/missions\/([^/]+)\/claim$/)
  if (req.method === 'POST' && claim) {
    const [status, body] = claimMission(decodeURIComponent(claim[1]))
    return json(res, status, body)
  }
  if (req.method === 'POST' && url.pathname.startsWith('/api/auth/')) {
    const body = await readBody(req)
    switch (url.pathname.slice('/api/auth/'.length)) {
      case 'login':
        if (body.email === TEST_USER.email && body.password === TEST_USER.password) {
          return json(res, 200, authOk(TEST_USER), { 'Set-Cookie': COOKIE })
        }
        return json(res, 401, { message: 'Credenciales inválidas' })
      case 'register':
        return json(res, 201, authOk({ ...TEST_USER, email: body.email, displayName: body.displayName }), { 'Set-Cookie': COOKIE })
      case 'refresh':
        return hasRefreshCookie(req) ? json(res, 200, { accessToken: 'mock-access-token' }) : json(res, 401, { message: 'Sin sesión' })
      case 'logout':
        return json(res, 200, { ok: true }, { 'Set-Cookie': 'refresh_token=; Path=/api/auth; Max-Age=0' })
    }
  }
  json(res, 404, { message: 'Not found' })
})

const io = new Server(http, { transports: ['websocket', 'polling'] })

const ok = (data) => ({ ok: true, data })
const fail = (code, message) => ({ ok: false, error: { code, message } })
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const code5 = () => Array.from({ length: 5 }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('')

const snapshot = (room) => ({
  code: room.code,
  status: room.status,
  seed: 7,
  mapId: 'ciudad-abandonada',
  difficulty: 'Estándar',
  hostSlot: 1,
  players: room.players.map(({ socketId: _s, input: _i, pos: _p, ...pub }) => pub),
  combat: null,
  result: null,
  version: ++room.version,
  at: Date.now(),
})
const broadcast = (room) => io.to(room.code).emit('lobby:state', snapshot(room))

function addPlayer(room, socket, { name, survivor }, slot) {
  const sessionId = `${room.code}-${slot}-${Math.random().toString(36).slice(2)}`
  room.players.push({
    id: `p${slot}-${room.code}`,
    name,
    slot,
    isHost: slot === 1,
    ready: false,
    survivor: survivor ?? 'explorador',
    survivorConfirmed: false,
    connected: true,
    socketId: socket.id,
    input: { up: false, down: false, left: false, right: false, action: false },
    pos: { x: slot === 1 ? 8 : 32, y: 12 },
  })
  sessions.set(sessionId, { code: room.code, slot })
  socket.data = { code: room.code, slot }
  socket.join(room.code)
  return { sessionId, slot, isHost: slot === 1, room: snapshot(room) }
}

const buildMap = () => ({
  seed: 7,
  w: MAP_W,
  h: MAP_H,
  tiles: Array.from({ length: MAP_W * MAP_H }, (_, i) => {
    const x = i % MAP_W
    const y = Math.floor(i / MAP_W)
    return x === 0 || y === 0 || x === MAP_W - 1 || y === MAP_H - 1 ? 1 : 0
  }),
  ground: new Array(MAP_W * MAP_H).fill(0),
  objects: [],
  bases: { 1: { x: 3, y: 8, w: 6, h: 8 }, 2: { x: 31, y: 8, w: 6, h: 8 } },
  cores: { 1: { x: 5, y: 12 }, 2: { x: 34, y: 12 } },
  crates: { 1: { x: 4, y: 9 }, 2: { x: 35, y: 9 } },
  spawns: [],
})

// MOCK_WALLS=1 places sample walls near slot 1 (horizontal/vertical runs, L, cross, isolated, damaged) for visual checks.
// Tuple: [tile, type(0 wood|1 reinforced), hp, maxHp, owner, orient]
const sampleWalls = () => {
  const at = (x, y, orient, type = 0, hp = 100) => [y * MAP_W + x, type, hp, 100, 1, orient]
  return [
    ...[4, 5, 6].map((x) => at(x, 9, 'h')),
    ...[9, 10, 11].map((y) => at(10, y, 'v')),
    ...[4, 5, 6].map((x) => at(x, 13, 'h', 1)),
    ...[14, 15].map((y) => at(6, y, 'v', 1)),
    ...[10, 11, 12].map((y) => at(13, y, 'v', 0, y === 12 ? 30 : y === 11 ? 60 : 100)),
    at(12, 11, 'h'), at(14, 11, 'h'),
    at(4, 16, 'h'), at(11, 15, 'v'),
  ]
}
const emptyStock = () => ({ wood: 0, metal: 0, medkits: 0, shells: 0 })
const gameState = (room) => ({
  tick: room.tick,
  time: room.tick / TICK_HZ,
  phase: { id: 'wave1', label: 'Oleada 1', start: 0, end: 600, wave: 1 },
  maxWave: 3,
  players: room.players.map((p) => ({
    id: p.id, slot: p.slot, name: p.name, survivor: p.survivor, x: p.pos.x, y: p.pos.y, dirX: 0, dirY: 1,
    hp: 100, alive: true, respawnIn: null, weapon: 'pistol', build: 'wall', ...emptyStock(),
    kills: 0, zombieKills: 0, deaths: 0, shotAt: -1, hurtAt: -1, inBase: !!process.env.MOCK_WALLS, onCrate: false,
    buildHint: process.env.MOCK_WALLS ? { x: 8, y: 9, ok: true, label: 'Pared de madera', orient: 'v' } : null,
  })),
  zombies: [],
  bullets: [],
  structures: process.env.MOCK_WALLS ? sampleWalls() : [],
  cores: { 1: 500, 2: 500 },
  crates: { 1: emptyStock(), 2: emptyStock() },
  events: [],
  result: null,
})

setInterval(() => {
  for (const room of rooms.values()) {
    if (room.status !== 'combat') continue
    room.tick++
    for (const p of room.players) {
      const dx = (p.input.right ? 1 : 0) - (p.input.left ? 1 : 0)
      const dy = (p.input.down ? 1 : 0) - (p.input.up ? 1 : 0)
      const len = Math.hypot(dx, dy) || 1
      p.pos.x = Math.min(MAP_W - 2, Math.max(1, p.pos.x + (dx / len) * (SPEED / TICK_HZ)))
      p.pos.y = Math.min(MAP_H - 2, Math.max(1, p.pos.y + (dy / len) * (SPEED / TICK_HZ)))
    }
    io.to(room.code).emit('game:state', gameState(room))
  }
}, 1000 / TICK_HZ)

io.on('connection', (socket) => {
  const roomOf = () => rooms.get(socket.data?.code)
  const me = () => roomOf()?.players.find((p) => p.socketId === socket.id)
  const handle = (event, fn) =>
    socket.on(event, (...args) => {
      const ack = typeof args[args.length - 1] === 'function' ? args.pop() : () => {}
      try {
        ack(fn(args[0]))
      } catch (e) {
        ack(fail('INTERNAL', String(e)))
      }
    })

  handle('lobby:create', (p) => {
    const room = { code: code5(), status: 'lobby', players: [], version: 0, tick: 0 }
    rooms.set(room.code, room)
    return ok(addPlayer(room, socket, p, 1))
  })
  handle('lobby:join', (p) => {
    const room = rooms.get(String(p.code).toUpperCase())
    if (!room) return fail('ROOM_NOT_FOUND', 'La sala no existe')
    const known = p.sessionId && sessions.get(p.sessionId)
    const existing = known && room.players.find((x) => x.slot === known.slot)
    if (existing) {
      existing.socketId = socket.id
      socket.data = { code: room.code, slot: existing.slot }
      socket.join(room.code)
      return ok({ sessionId: p.sessionId, slot: existing.slot, isHost: existing.isHost, room: snapshot(room) })
    }
    if (room.players.length >= 2) return fail('ROOM_FULL', 'La sala está llena')
    const joined = addPlayer(room, socket, p, 2)
    broadcast(room)
    return ok(joined)
  })
  handle('lobby:ready', (p) => {
    const player = me()
    if (!player) return fail('NOT_IN_ROOM', 'No estás en una sala')
    player.ready = Boolean(p.ready)
    broadcast(roomOf())
    return ok(snapshot(roomOf()))
  })
  handle('lobby:start', () => {
    const room = roomOf()
    if (!room || room.players.length < 2 || !room.players.every((p) => p.ready)) return fail('NOT_READY', 'Faltan jugadores listos')
    room.status = 'combat'
    broadcast(room)
    return ok(snapshot(room))
  })
  handle('match:rematchRequest', () => {
    const room = roomOf()
    const player = me()
    if (!room || !player || room.status !== 'results') return fail('INVALID_STATE', 'No hay resultados')
    room.rematch ??= new Set()
    room.rematch.add(player.slot)
    io.to(room.code).emit('match:rematchState', { requested: [...room.rematch] })
    if (room.players.length === 2 && room.players.every((p) => room.rematch.has(p.slot))) {
      room.rematch.clear()
      room.tick = 0
      room.status = 'combat'
      broadcast(room)
    }
    return ok(undefined)
  })
  handle('match:rematchCancel', () => {
    const room = roomOf()
    const player = me()
    if (!room || !player) return fail('NOT_IN_ROOM', 'No estás en una sala')
    room.rematch?.delete(player.slot)
    io.to(room.code).emit('match:rematchState', { requested: [...(room.rematch ?? [])] })
    return ok(undefined)
  })
  handle('lobby:backToLobby', () => {
    const room = roomOf()
    if (!room || room.status !== 'results') return fail('INVALID_STATE', 'No hay resultados')
    room.status = 'lobby'
    room.rematch = new Set()
    for (const p of room.players) p.ready = false
    io.to(room.code).emit('match:rematchState', { requested: [] })
    broadcast(room)
    return ok(snapshot(room))
  })
  handle('lobby:leave', () => {
    const room = roomOf()
    if (room) {
      room.players = room.players.filter((p) => p.socketId !== socket.id)
      socket.leave(room.code)
      broadcast(room)
    }
    return ok(undefined)
  })
  for (const ev of ['lobby:rename', 'lobby:selectSurvivor', 'lobby:confirmSurvivor', 'lobby:setMap', 'lobby:setDifficulty', 'chat:send']) {
    handle(ev, () => ok(roomOf() ? snapshot(roomOf()) : undefined))
  }
  handle('ping', (p) => ok({ t: p?.t ?? Date.now() }))
  handle('game:sync', () => {
    const room = roomOf()
    return room ? ok({ map: buildMap(), state: gameState(room) }) : fail('NOT_IN_ROOM', 'No estás en una sala')
  })
  socket.on('game:input', (p) => {
    const player = me()
    if (player) player.input = { up: !!p.up, down: !!p.down, left: !!p.left, right: !!p.right, action: !!p.action }
  })
  socket.on('game:command', () => {})
})

http.listen(PORT, '127.0.0.1', () => console.log(`[mock-server] listening on ${PORT}`))
