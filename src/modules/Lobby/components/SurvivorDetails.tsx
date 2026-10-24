import { useState } from 'react'
import { Backpack, Cog, Crosshair, Footprints, Package, Wrench, type LucideIcon } from 'lucide-react'
import { STARTING_WEAPONS, type Skill, type Survivor } from '../data/catalog'
import { SLOT_THEME } from '../data/slotTheme'
import type { Slot } from '../hooks/useLobbyRoom'

const SKILL_ICONS: Record<Skill['icon'], LucideIcon> = {
  run: Footprints,
  aim: Crosshair,
  pack: Backpack,
  wrench: Wrench,
  gear: Cog,
  box: Package,
}

const TABS = ['Habilidades', 'Armas iniciales', 'Estilo de juego'] as const

interface SurvivorDetailsProps {
  slot: Slot
  survivor: Survivor
}

export function SurvivorDetails({ slot, survivor }: SurvivorDetailsProps) {
  const t = SLOT_THEME[slot]
  const [tab, setTab] = useState<(typeof TABS)[number]>('Habilidades')

  return (
    <section className="ug-panel grid gap-3 p-3 phone:gap-1 phone:p-2 md:grid-cols-[1fr_auto]" aria-label="Detalles del superviviente">
      <div>
        <h2 className="ug-title-shadow text-2xl phone:text-xl tracking-wide">DETALLES DEL SUPERVIVIENTE</h2>
        <div className="mt-2 grid grid-cols-3 gap-1" role="tablist">
          {TABS.map((name) => (
            <button
              key={name}
              type="button"
              role="tab"
              aria-selected={tab === name}
              onClick={() => setTab(name)}
              className={`border-2 px-2 py-1 font-terminal text-sm uppercase sm:text-base ${
                tab === name ? t.tab : 'border-ug-border bg-black/30 text-ug-muted hover:text-ug-text'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        <div className="mt-2 min-h-24 phone:min-h-0 phone:mt-1" role="tabpanel">
          {tab === 'Habilidades' && (
            <ul className="grid grid-cols-3 gap-2">
              {survivor.skills?.map((s) => {
                const Icon = SKILL_ICONS[s.icon]
                return (
                  <li key={s.title} className="flex flex-col items-center border-2 border-ug-border bg-black/30 px-2 py-2 text-center">
                    <Icon size="1.875rem" className={slot === 2 ? 'text-ug-red-hi' : 'text-ug-text'} />
                    <span className="mt-1 text-lg leading-none">{s.title}</span>
                    <span className="font-terminal text-sm leading-tight text-ug-muted">{s.text}</span>
                  </li>
                )
              })}
            </ul>
          )}
          {tab === 'Armas iniciales' && (
            <ul className="space-y-2">
              {STARTING_WEAPONS.map((w) => (
                <li key={w.name} className="border-2 border-ug-border bg-black/30 px-3 py-2">
                  <span className="text-xl">{w.name}</span>
                  <span className="block font-terminal text-base text-ug-muted">{w.detail}</span>
                </li>
              ))}
            </ul>
          )}
          {tab === 'Estilo de juego' && <p className="font-terminal text-lg leading-snug text-ug-muted">{survivor.playstyle}</p>}
        </div>
      </div>

      {survivor.preview && (
        <img src={survivor.preview} alt="" className="pixelated hidden h-full max-h-40 w-60 border-2 border-ug-border object-cover md:block" />
      )}
    </section>
  )
}
