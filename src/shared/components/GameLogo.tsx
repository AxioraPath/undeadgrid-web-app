// Logo en CSS mientras el diseñador exporta el PNG con transparencia (assets/logo.png).
const SIZES = {
  lg: { title: 'text-[clamp(3.5rem,calc(var(--ug-vw,1vw)*9),8.5rem)] phone:text-[3.25rem]', subtitle: 'mt-2 phone:mt-0.5 phone:text-base phone:tracking-[0.14em] text-[clamp(1.1rem,calc(var(--ug-vw,1vw)*2.1),2rem)] tracking-[0.18em]' },
  sm: { title: 'text-[clamp(2.5rem,calc(var(--ug-vw,1vw)*4.6),4.75rem)] phone:text-[2.5rem]', subtitle: 'mt-1 phone:mt-0 phone:text-xs text-[clamp(0.9rem,calc(var(--ug-vw,1vw)*1.3),1.3rem)] tracking-[0.14em]' },
}

interface GameLogoProps {
  size?: keyof typeof SIZES
}

export function GameLogo({ size = 'lg' }: GameLogoProps) {
  const s = SIZES[size]

  return (
    <div className="select-none" data-testid="game-logo">
      <h1 className="flex flex-wrap items-baseline gap-x-3 leading-[0.85] tracking-tight">
        <span
          className={`${s.title} text-[#ece3d2]`}
          style={{ textShadow: '3px 3px 0 #2a2420, 6px 6px 0 rgb(0 0 0 / 0.6), 0 0 18px rgb(0 0 0 / 0.7)' }}
        >
          UNDEAD
        </span>
        <span
          className={`${s.title} text-ug-red-hi`}
          style={{
            textShadow: '3px 3px 0 #5b070a, 6px 6px 0 rgb(0 0 0 / 0.6), 0 0 22px rgb(255 30 40 / 0.35)',
            animation: 'ug-flicker 4s steps(1) infinite',
          }}
        >
          GRID
        </span>
      </h1>
      <p className={`ug-title-shadow pl-1 text-[#e9e2d6] ${s.subtitle}`}>CYBERGRID: BREACH &amp; SYNC</p>
    </div>
  )
}
