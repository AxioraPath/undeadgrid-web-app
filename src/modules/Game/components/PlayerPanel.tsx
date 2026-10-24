import { getSurvivor } from '../../Lobby/data/catalog'
import type { HudSnapshot } from '../hud'

const SLOT_BADGE = { 1: 'bg-[#1d5fc4]', 2: 'bg-[#b3141a]' } as const

function Resource({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <span className="flex items-center gap-1.5" title={label}>
      <img src={icon} alt={label} className="pixelated h-5 w-6 object-contain" />
      <span className="text-xl leading-none">{value}</span>
    </span>
  )
}

export function PlayerPanel({ hud, compact }: { hud: HudSnapshot; compact?: boolean }) {
  const { me } = hud
  const survivor = getSurvivor(me.survivor)

  return (
    <div className="ug-panel flex gap-3 p-2 pr-3" data-testid="hud-player">
      <img src={survivor.portrait} alt="" className="pixelated size-12 border-2 border-ug-border object-cover lg:size-16" />
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 text-lg leading-tight ${SLOT_BADGE[me.slot]}`}>J{me.slot}</span>
          <div className="relative h-5 w-28 border-2 border-black/60 bg-black/60 lg:w-40">
            <div className="h-full bg-ug-red-hi transition-[width]" style={{ width: `${me.hp}%` }} />
            <span className="absolute inset-0 grid place-items-center text-base leading-none" data-testid="hud-hp">
              {me.hp}/100
            </span>
          </div>
        </div>
        <div className="mt-1.5 flex items-center gap-3 sm:gap-4">
          {!compact && (
            <span className="flex items-center gap-1.5" title="Arma">
              <img src={me.weapon === 'pistol' ? '/assets/game/iconos/pistola.png' : '/assets/game/iconos/escopeta.png'} alt="" className="pixelated h-5 w-7 object-contain" />
              <span className="text-xl leading-none">{me.weapon === 'pistol' ? '∞' : me.shells}</span>
            </span>
          )}
          <Resource icon="/assets/game/iconos/madera.png" value={me.wood} label="Madera" />
          <Resource icon="/assets/game/iconos/metal.png" value={me.metal} label="Metal" />
          <Resource icon="/assets/game/iconos/botiquin.png" value={me.medkits} label="Botiquines" />
        </div>
      </div>
    </div>
  )
}
