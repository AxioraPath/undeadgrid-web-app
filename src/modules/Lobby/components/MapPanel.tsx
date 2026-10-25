import { Castle, Package, TreePine, Waves } from 'lucide-react'
import type { GameMap } from '../data/catalog'

const FEATURES = [
  { icon: Castle, label: '2 bases 8 × 8' },
  { icon: Package, label: 'Caja de armamento al centro' },
  { icon: TreePine, label: 'Zombis desde las 4 orillas' },
  { icon: Waves, label: 'Estanques no transitables' },
]

interface MapPanelProps {
  map: GameMap
}

export function MapPanel({ map }: MapPanelProps) {
  return (
    <section id="lobby-map" className="ug-panel flex flex-col p-4 phone:p-2" data-testid="map-panel">
      <h2 className="ug-title-shadow text-3xl phone:text-2xl leading-none tracking-wide uppercase">{map.name}</h2>
      <p className="font-terminal text-lg phone:text-base leading-tight text-ug-muted">Escenario {map.biome.toLowerCase()}</p>
      <img
        src={map.preview}
        alt={`Vista del mapa ${map.name}`}
        key={map.id}
        className="pixelated mt-2 phone:mt-1 aspect-[4/3] phone:aspect-[16/7] w-full border-2 border-ug-border object-cover"
      />
      <p className="mt-3 min-h-[3lh] font-terminal text-lg leading-tight text-ug-muted phone:hidden">{map.description}</p>

      <h3 className="ug-title-shadow mt-4 text-xl tracking-wide phone:hidden">CARACTERÍSTICAS</h3>
      <ul className="mt-2 grid grid-cols-4 gap-2 phone:hidden">
        {FEATURES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex flex-col items-center gap-1 border-2 border-ug-border bg-black/30 px-1 py-2 text-center">
            <Icon size="1.75rem" strokeWidth={1.75} />
            <span className="font-terminal text-sm leading-tight text-ug-muted">{label}</span>
          </li>
        ))}
      </ul>

    </section>
  )
}
