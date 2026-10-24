import { Link, useParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

// Placeholder de la sala de espera; se conecta a lobby:state en el siguiente paso.
export function RoomPage() {
  const { code } = useParams()

  return (
    <div className="grid min-h-dvh place-items-center p-4" data-testid="room">
      <div className="ug-panel w-full max-w-md p-6 text-center">
        <p className="font-terminal text-xl text-ug-muted">Sala</p>
        <p className="ug-title-shadow text-5xl tracking-[0.3em] text-ug-accent" data-testid="room-code">
          {code === 'nueva' ? '·····' : code}
        </p>
        <p className="mt-4 font-terminal text-xl text-ug-muted">Esperando al rival…</p>
        <Link to="/" className="mt-6 inline-flex items-center gap-2 font-terminal text-xl text-ug-text hover:text-ug-accent">
          <ArrowLeft size={18} /> Volver al menú
        </Link>
      </div>
    </div>
  )
}
