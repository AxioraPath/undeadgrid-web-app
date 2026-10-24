import { useEffect, useState } from 'react'
import { API_URL } from '../lib/api'

export type ServerStatus = 'checking' | 'online' | 'offline'

const INTERVAL_MS = 5000

// Mide latencia contra /health mientras no hay socket. En la sala se reemplaza por ping/pong del socket.
export function useServerStatus() {
  const [status, setStatus] = useState<ServerStatus>('checking')
  const [latencyMs, setLatencyMs] = useState<number | null>(null)

  useEffect(() => {
    let cancelled = false

    const check = async () => {
      const start = performance.now()
      try {
        const res = await fetch(`${API_URL}/health`, { cache: 'no-store' })
        if (!res.ok) throw new Error(String(res.status))
        if (cancelled) return
        setLatencyMs(Math.round(performance.now() - start))
        setStatus('online')
      } catch {
        if (cancelled) return
        setLatencyMs(null)
        setStatus('offline')
      }
    }

    check()
    const id = window.setInterval(check, INTERVAL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  return { status, latencyMs }
}
