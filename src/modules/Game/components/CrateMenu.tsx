import type { Stock } from '../../../shared/lib/contracts'

const ITEMS: { key: keyof Stock; label: string; icon: string }[] = [
  { key: 'wood', label: 'Madera', icon: '/assets/game/iconos/madera.png' },
  { key: 'metal', label: 'Metal', icon: '/assets/game/iconos/metal.png' },
  { key: 'medkits', label: 'Botiquines', icon: '/assets/game/iconos/botiquin.png' },
  { key: 'shells', label: 'Cartuchos', icon: '/assets/game/iconos/municion.png' },
]

interface CrateMenuProps {
  stock: Stock
  onTake: (item: keyof Stock) => void
}

/** Menú de la caja encima del Canvas: botones grandes que sirven igual con mouse y con el dedo. */
export function CrateMenu({ stock, onTake }: CrateMenuProps) {
  const total = ITEMS.reduce((n, i) => n + stock[i.key], 0)

  return (
    <div className="ug-panel pointer-events-auto max-h-full w-[min(26rem,94vw)] p-3 short:p-1.5" data-testid="crate-menu">
      <div className="flex items-center justify-between">
        <h2 className="ug-title-shadow text-[clamp(1.125rem,4vmin,1.5rem)] leading-none">CAJA DE SUMINISTROS</h2>
        {total > 0 && (
          <button
            type="button"
            onClick={() => ITEMS.forEach((i) => stock[i.key] > 0 && onTake(i.key))}
            className="border-2 border-ug-green bg-ug-green/15 px-3 py-0.5 text-[clamp(1rem,3vmin,1.125rem)] hover:bg-ug-green/25"
          >
            Tomar todo
          </button>
        )}
      </div>
      <div className="mt-2 grid grid-cols-4 gap-2 short:mt-1 short:gap-1">
        {ITEMS.map((i) => (
          <button
            key={i.key}
            type="button"
            disabled={stock[i.key] === 0}
            onClick={() => onTake(i.key)}
            data-testid={`crate-take-${i.key}`}
            className="flex flex-col items-center border-2 border-ug-border bg-black/40 py-2 short:flex-row short:justify-center short:gap-1 short:py-0.5 enabled:hover:border-ug-border-hi disabled:opacity-40"
          >
            <img src={i.icon} alt="" className="pixelated h-9 w-12 object-contain short:h-5 short:w-7" />
            <span className="text-[clamp(1.125rem,3.5vmin,1.25rem)] leading-none">{stock[i.key]}</span>
            <span className="font-terminal text-xs text-ug-muted short:hidden">{i.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-2 font-terminal text-sm text-ug-muted short:hidden">Se rellena un poco al empezar cada oleada.</p>
    </div>
  )
}
