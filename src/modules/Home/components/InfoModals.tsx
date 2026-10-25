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
  ['0:00 – 0:25', 'Preparación', 'Construye tu base 8 × 8. Sin zombis ni PvP. En todos contra todos dura solo 5 s.'],
  ['0:25 – 1:25', 'Oleada 1', 'Zombis normales. La caja se rellena.'],
  ['1:25 – 2:25', 'Oleada 2', 'Más zombis, con más vida y daño.'],
  ['2:25 – 5:00', 'Horda final', 'Oleada enorme hasta el final de la partida.'],
]

const CONTROLS = [
  ['Moverse', 'WASD / flechas', 'Joystick izquierdo'],
  ['Apuntar y disparar', 'Mouse + clic o Espacio', 'Joystick derecho (un toque = apuntado automático)'],
  ['Construir', 'Clic derecho o Espacio en tu base', 'Tocar la casilla'],
  ['Elegir arma / bloque', 'Teclas 1 – 7, Q o rueda', 'Barra de armas'],
  ['Chat', 'Enter', 'Botón de chat'],
]

function Instructions() {
  return (
    <div className="space-y-4 font-terminal text-xl leading-tight text-ug-muted">
      <p>
        <b className="text-ug-text">1v1 y 2v2:</b> defiende tu <b className="text-ug-text">núcleo</b> (500 HP) y destruye el del rival. En 2v2 el núcleo es compartido con tu compañero (sin fuego
        amigo). Mientras tu núcleo viva, reapareces a los 5 s. Gana el equipo que destruya el núcleo rival y elimine a sus jugadores.
      </p>
      <p>
        <b className="text-ug-text">Todos contra todos (2 a 4):</b> sin núcleos; cada quien tiene 3 o 5 vidas, construye donde quiera y recoge las armas del mapa. Gana el último en pie.
      </p>
      <p>
        Cada partida dura <b className="text-ug-text">hasta 5 minutos</b>. Si se acaba el tiempo gana el núcleo con más vida (o, en todos contra todos, quien tenga más vidas); si empatan, el de
        más bajas.
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
    <div className="space-y-3 font-terminal text-xl text-ug-muted">
      <p className="text-ug-text">Desarrolladores</p>
      <ul className="space-y-2">
        <li>Josseph Peralta</li>
        <li>Sylvanna Cisneros</li>
        <li>Angel Anaya</li>
      </ul>
    </div>
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
