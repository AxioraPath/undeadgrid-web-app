import { io, type Socket } from 'socket.io-client'
import { API_URL } from './api'
import { getAccessToken } from './authApi'
import type { Ack, ClientToServerEvents, ServerToClientEvents } from './contracts'

export type AppSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let socket: AppSocket | null = null

/**
 * Devuelve el socket singleton. Se conecta al mismo origen (API_URL vacío) o al
 * dominio del backend si VITE_API_URL está definido. Prioriza WebSocket para
 * menor latencia (coincide con la config del servidor). Envía el JWT (si hay
 * sesión) en auth.token para que el servidor asocie la partida a la cuenta.
 */
export function getSocket(): AppSocket {
  if (socket) return socket
  socket = io(API_URL || '/', {
    transports: ['websocket', 'polling'],
    autoConnect: true,
    reconnection: true,
    reconnectionDelay: 500,
    reconnectionDelayMax: 4000,
    auth: (cb) => cb({ token: getAccessToken() ?? undefined }),
  })
  return socket
}

/**
 * Emite un evento con acknowledgement y devuelve una promesa que resuelve con
 * los datos o rechaza con el ApiError del servidor. Incluye timeout (patrón
 * socket.io v4: el callback recibe (err, respuesta)).
 */
export function emitAck<T>(
  event: keyof ClientToServerEvents,
  payload?: unknown,
  timeoutMs = 10000,
): Promise<T> {
  const s = getSocket()
  return new Promise<T>((resolve, reject) => {
    const handle = (err: Error | null, res: Ack<T>) => {
      if (err) {
        reject({ code: 'TIMEOUT', message: 'El servidor no respondió a tiempo' })
        return
      }
      if (res && res.ok) resolve(res.data)
      else reject(res?.error ?? { code: 'UNKNOWN', message: 'Sin respuesta del servidor' })
    }
    // Eventos sin payload (p. ej. lobby:start, lobby:confirmSurvivor, lobby:leave).
    const args: unknown[] = payload === undefined ? [] : [payload]
    // @ts-expect-error firma variádica validada por los contratos tipados
    s.timeout(timeoutMs).emit(event, ...args, handle)
  })
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}
