import { useState } from 'react'
import { Backpack, Cog, Crosshair, Footprints, Package, Wrench, type LucideIcon } from 'lucide-react'
import type { Skill, Survivor } from '../data/catalog'
import { SLOT_THEME } from '../data/slotTheme'
import type { Team } from '../hooks/useLobbyRoom'

const SKILL_ICONS: Record<Skill['icon'], LucideIcon> = {
  run: Footprints,
  aim: Crosshair,
  pack: Backpack,
  wrench: Wrench,
  gear: Cog,
  box: Package,
}

const TABS = ['Habilidades', 'Estilo de juego'] as const

interface SurvivorDetailsProps {
  team: Team
  survivor: Survivor
}

export function SurvivorDetails({ team, survivor }: SurvivorDetailsProps) {
  const t = SLOT_THEME[team]
  const [tab, setTab] = useState<(typeof TABS)[number]>('Habilidades')

  return (
    <section className="ug-panel p-3 phone:p-2" aria-label="Detalles del superviviente">
      <div>
        <h2 className="ug-title-shadow text-2xl phone:text-xl tracking-wide">DETALLES DEL SUPERVIVIENTE</h2>
        <div className="mt-2 grid grid-cols-2 gap-1" role="tablist">
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
                    <Icon size="1.875rem" className={team === 2 ? 'text-ug-red-hi' : 'text-ug-text'} />
                    <span className="mt-1 text-lg leading-none">{s.title}</span>
                    <span className="font-terminal text-sm leading-tight text-ug-muted">{s.text}</span>
                  </li>
                )
              })}
            </ul>
          )}
          {tab === 'Estilo de juego' && <p className="font-terminal text-lg leading-snug text-ug-muted">{survivor.playstyle}</p>}
        </div>
      </div>
    </section>
  )
}
