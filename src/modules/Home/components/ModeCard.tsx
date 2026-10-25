import { Clock, Skull, Users } from 'lucide-react'

const STATS = [
  { icon: Clock, value: 'HASTA 5', label: 'minutos' },
  { icon: Users, value: '2 A 4', label: 'jugadores' },
  { icon: Skull, value: 'ZOMBIS', label: 'por oleadas' },
]

export function ModeCard() {
  return (
    <div className="flex flex-col gap-3 phone:gap-1.5">
      <section className="ug-panel p-1.5 phone:p-1" data-testid="mode-card">
        <h2 className="ug-title-shadow px-2 py-1 text-3xl tracking-wide text-ug-accent phone:py-0 phone:text-2xl">MODOS DE JUEGO</h2>
        <img
          src="/assets/home/mode-preview.png"
          alt="Vista del mapa: dos bases enfrentadas con zombis en medio"
          className="pixelated aspect-[406/210] w-full phone:aspect-[406/130] border-2 border-ug-border object-cover"
        />
        <div className="px-3 pt-2 pb-3 phone:px-2 phone:pt-1 phone:pb-1.5">
          <h3 className="ug-title-shadow text-3xl phone:text-2xl">1 VS 1 · 2 VS 2 · TODOS VS TODOS</h3>
          <p className="mt-1 font-terminal text-xl leading-tight phone:text-lg phone:leading-[1.05] text-ug-muted">
            Defiende tu núcleo solo o en equipo, o sobrevive a todos con vidas limitadas en el todos contra todos.
          </p>
        </div>
      </section>

      <section className="ug-panel grid grid-cols-3 divide-x-2 divide-ug-border py-3 phone:py-1">
        {STATS.map(({ icon: Icon, value, label }) => (
          <div key={label} className="flex flex-col items-center text-center">
            <Icon size="2.125rem" />
            <span className="ug-title-shadow mt-1 text-2xl leading-none">{value}</span>
            <span className="font-terminal text-lg leading-tight text-ug-muted">{label}</span>
          </div>
        ))}
      </section>
    </div>
  )
}
