import type { HudSnapshot } from '../hud'

type HotbarSlot = 1 | 2 | 3 | 4 | 5

interface HotbarProps {
  hud: HudSnapshot
  onSelect: (slot: HotbarSlot) => void
}

export function Hotbar({ hud, onSelect }: HotbarProps) {
  const { me } = hud
  const items: { slot: HotbarSlot; icon: string; label: string; value: string; active: boolean; kind: 'weapon' | 'use' | 'build' }[] = [
    { slot: 1, icon: '/assets/game/iconos/pistola.png', label: 'Pistola', value: '∞', active: me.weapon === 'pistol', kind: 'weapon' },
    { slot: 2, icon: '/assets/game/iconos/escopeta.png', label: 'Escopeta', value: String(me.shells), active: me.weapon === 'shotgun', kind: 'weapon' },
    { slot: 3, icon: '/assets/game/iconos/botiquin.png', label: 'Botiquín', value: String(me.medkits), active: false, kind: 'use' },
    { slot: 4, icon: '/assets/game/construccion/pared-madera-h.png', label: 'Pared', value: '', active: me.build === 'wall', kind: 'build' },
    { slot: 5, icon: '/assets/game/construccion/trampa-puas.png', label: 'Trampa', value: '', active: me.build === 'trap', kind: 'build' },
  ]

  return (
    <div className="ug-panel flex gap-1 p-1 sm:gap-1.5 sm:p-1.5" data-testid="hotbar">
      {items.map((it) => (
        <button
          key={it.slot}
          type="button"
          onClick={() => onSelect(it.slot)}
          title={`${it.slot} · ${it.label}`}
          aria-pressed={it.active}
          className={`relative flex w-14 flex-col items-center border-2 px-1 pt-1 pb-0.5 sm:w-20 ${
            it.active
              ? it.kind === 'build'
                ? 'border-ug-green bg-ug-green/10 shadow-[0_0_10px_rgb(46_232_106/0.4)]'
                : 'border-[#3d8bff] bg-[#3d8bff]/15 shadow-[0_0_10px_rgb(61_139_255/0.5)]'
              : 'border-ug-border bg-black/40 hover:border-ug-border-hi'
          }`}
        >
          <img src={it.icon} alt="" className="pixelated h-7 w-10 object-contain sm:h-9 sm:w-14" />
          <span className="flex w-full items-center justify-between text-sm leading-none sm:text-base">
            <span className="bg-ug-panel-2 px-1">{it.slot}</span>
            <span className="truncate">{it.kind === 'build' ? it.label : it.value}</span>
          </span>
        </button>
      ))}
    </div>
  )
}
