import { APP_VERSION } from '../../../shared/lib/api'
import type { ServerStatus } from '../../../shared/hooks/useServerStatus'

const STATUS_TEXT: Record<ServerStatus, string> = {
  checking: 'Conectando…',
  online: 'Servidor en línea',
  offline: 'Servidor fuera de línea',
}

const DOT_COLOR: Record<ServerStatus, string> = {
  checking: 'bg-yellow-400',
  online: 'bg-ug-green',
  offline: 'bg-ug-red-hi',
}

function SignalBars({ latencyMs }: { latencyMs: number | null }) {
  const level = latencyMs === null ? 0 : latencyMs < 100 ? 4 : latencyMs < 200 ? 3 : latencyMs < 350 ? 2 : 1
  const color = latencyMs !== null && latencyMs < 100 ? 'bg-ug-green' : 'bg-yellow-400'
  return (
    <span className="flex h-4 items-end gap-0.5" aria-hidden>
      {[1, 2, 3, 4].map((b) => (
        <span key={b} className={`w-1 ${b <= level ? color : 'bg-ug-border'}`} style={{ height: `${b * 25}%` }} />
      ))}
    </span>
  )
}

interface StatusBarProps {
  status: ServerStatus
  latencyMs: number | null
}

export function StatusBar({ status, latencyMs }: StatusBarProps) {
  return (
    <footer className="flex flex-wrap items-center justify-between gap-2 font-terminal text-lg text-ug-muted">
      <span>
        {APP_VERSION} <span className="mx-2 opacity-50">|</span> CyberGrid: Breach &amp; Sync — Undead Grid
      </span>
      <span className="flex items-center gap-3" data-testid="server-status" data-status={status}>
        <span className="flex items-center gap-2">
          <span className={`size-3 rounded-full ${DOT_COLOR[status]}`} />
          {STATUS_TEXT[status]}
        </span>
        <SignalBars latencyMs={latencyMs} />
        <span className={latencyMs !== null && latencyMs < 100 ? 'text-ug-green' : ''} data-testid="server-latency">
          {latencyMs === null ? '-- ms' : `${latencyMs} ms`}
        </span>
      </span>
    </footer>
  )
}
