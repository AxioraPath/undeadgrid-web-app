import { PixelModal } from '../../../shared/components/PixelModal'

export type InfoModalKind = 'instructions' | 'settings' | 'stats' | 'credits' | 'friends'

const TITLES: Record<InfoModalKind, string> = {
  instructions: 'Instrucciones',
  settings: 'Ajustes',
  stats: 'Estadísticas',
  credits: 'Créditos',
  friends: 'Amigos',
}

const PHASES = [
  ['0:00 – 1:00', 'Preparación', 'Construye tu base 8 × 8. Sin zombis ni PvP.'],
  ['1:00 – 2:00', 'Oleada 1', 'Zombis normales. La caja se rellena.'],
  ['2:00 – 3:00', 'Oleada 2', 'Más zombis, con más vida y daño.'],
  ['3:00 – 4:00', 'Horda final', 'Oleada enorme para cerrar la partida.'],
]

const CONTROLS = [
  ['Moverse', 'WASD / flechas', 'D-pad'],
  ['Construir (en tu base)', 'Espacio', 'Botón de acción'],
  ['Disparar (fuera)', 'Espacio', 'Botón de acción'],
  ['Elegir arma / bloque', 'Teclas 1 – 4', 'Menú de la caja'],
]

function Instructions() {
  return (
    <div className="space-y-4 font-terminal text-xl leading-tight text-ug-muted">
      <p>
        Defiende tu <b className="text-ug-text">núcleo</b> (500 HP) y destruye el del rival. Mientras tu núcleo viva,
        reapareces a los 5 s.
      </p>
      <ul className="space-y-1">
        {PHASES.map(([time, name, desc]) => (
          <li key={name}>
            <span className="text-ug-accent">{time}</span> <b className="text-ug-text">{name}:</b> {desc}
          </li>
        ))}
      </ul>
      <table className="w-full text-left">
        <thead className="text-ug-text">
          <tr>
            <th className="font-normal">Acción</th>
            <th className="font-normal">PC</th>
            <th className="font-normal">Móvil</th>
          </tr>
        </thead>
        <tbody>
          {CONTROLS.map(([a, pc, mobile]) => (
            <tr key={a} className="border-t border-ug-border">
              <td className="py-1 pr-2">{a}</td>
              <td className="pr-2">{pc}</td>
              <td>{mobile}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p>Cada zombi eliminado da +1 de madera; cada 5, +1 de metal.</p>
    </div>
  )
}

function Credits() {
  return (
    <ul className="space-y-2 font-terminal text-xl text-ug-muted">
      <li><b className="text-ug-text">Programación servidor</b> — Programador 1</li>
      <li><b className="text-ug-text">Programación cliente</b> — Programador 2</li>
      <li><b className="text-ug-text">Arte y diseño</b> — Diseñador</li>
      <li className="pt-2 text-lg">Dirección de TI: Angel Gustavo Anaya Lopez</li>
    </ul>
  )
}

interface InfoModalsProps {
  kind: InfoModalKind | null
  onClose: () => void
}

export function InfoModals({ kind, onClose }: InfoModalsProps) {
  return (
    <PixelModal open={kind !== null} title={kind ? TITLES[kind] : ''} onClose={onClose} testId="info-modal">
      {kind === 'instructions' && <Instructions />}
      {kind === 'credits' && <Credits />}
      {(kind === 'settings' || kind === 'stats' || kind === 'friends') && (
        <p className="font-terminal text-xl text-ug-muted">Próximamente.</p>
      )}
    </PixelModal>
  )
}
