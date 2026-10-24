import { Castle, Mountain, Shuffle, TreePine, Waves } from 'lucide-react'
import type { GameMap } from '../data/catalog'

const FEATURES = [
  { icon: Castle, label: '2 bases 8 × 8' },
  { icon: Mountain, label: 'Obstáculos dinámicos' },
  { icon: TreePine, label: 'Spawns en las 4 orillas' },
  { icon: Waves, label: 'Agua no transitable' },
]

interface MapPanelProps {
  map: GameMap
  canEdit: boolean
  onChangeMap: () => void
}

export function MapPanel({ map, canEdit, onChangeMap }: MapPanelProps) {
  return (
    <section id="lobby-map" className="ug-panel flex flex-col p-4" data-testid="map-panel">
      <h2 className="ug-title-shadow text-3xl leading-none tracking-wide uppercase">{map.name}</h2>
      <p className="font-terminal text-lg leading-tight text-ug-muted">Escenario {map.biome.toLowerCase()}</p>
      <img
        src={map.preview}
        alt={`Vista del mapa ${map.name}`}
        key={map.id}
        className="pixelated mt-2 aspect-[4/3] w-full border-2 border-ug-border object-cover"
      />
      <p className="mt-3 min-h-[3lh] font-terminal text-lg leading-tight text-ug-muted">{map.description}</p>

      <h3 className="ug-title-shadow mt-4 text-xl tracking-wide">CARACTERÍSTICAS</h3>
      <ul className="mt-2 grid grid-cols-4 gap-2">
        {FEATURES.map(({ icon: Icon, label }) => (
          <li key={label} className="flex flex-col items-center gap-1 border-2 border-ug-border bg-black/30 px-1 py-2 text-center">
            <Icon size={28} strokeWidth={1.75} />
            <span className="font-terminal text-sm leading-tight text-ug-muted">{label}</span>
          </li>
        ))}
      </ul>

      <button
        type="button"
        disabled={!canEdit}
        onClick={onChangeMap}
        className="mt-3 flex items-center justify-center gap-3 border-2 border-ug-border bg-ug-panel-2 py-2 font-terminal text-xl enabled:hover:border-ug-border-hi disabled:opacity-50"
      >
        <Shuffle size={20} /> Cambiar mapa
      </button>
    </section>
  )
}
