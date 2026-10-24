import type { GameMap } from '../data/catalog'

interface RoomSummaryCardProps {
  code: string
  map: GameMap
}

export function RoomSummaryCard({ code, map }: RoomSummaryCardProps) {
  return (
    <div className="ug-panel flex items-stretch gap-3 p-2 pl-4">
      <div className="py-1">
        <p className="ug-title-shadow text-3xl leading-none">SALA: {code}</p>
        <p className="mt-1 font-terminal text-base leading-tight text-ug-muted">Modo: 1 vs 1</p>
        <p className="font-terminal text-base leading-tight text-ug-muted">Mapa: {map.name}</p>
      </div>
      <img src={map.preview} alt="" className="pixelated hidden w-36 border-2 border-ug-border object-cover sm:block" />
    </div>
  )
}
