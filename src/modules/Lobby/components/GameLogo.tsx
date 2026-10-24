// Logo en CSS mientras el diseñador exporta el PNG con transparencia (assets/lobby/logo.png).
export function GameLogo() {
  return (
    <div className="select-none" data-testid="game-logo">
      <h1 className="flex flex-wrap items-baseline gap-x-3 leading-[0.85] tracking-tight">
        <span
          className="text-[clamp(3.5rem,9vw,8.5rem)] text-[#ece3d2]"
          style={{ textShadow: '3px 3px 0 #2a2420, 6px 6px 0 rgb(0 0 0 / 0.6), 0 0 18px rgb(0 0 0 / 0.7)' }}
        >
          UNDEAD
        </span>
        <span
          className="text-[clamp(3.5rem,9vw,8.5rem)] text-ug-red-hi"
          style={{
            textShadow: '3px 3px 0 #5b070a, 6px 6px 0 rgb(0 0 0 / 0.6), 0 0 22px rgb(255 30 40 / 0.35)',
            animation: 'ug-flicker 4s steps(1) infinite',
          }}
        >
          GRID
        </span>
      </h1>
      <p className="ug-title-shadow mt-2 pl-1 text-[clamp(1.1rem,2.1vw,2rem)] tracking-[0.18em] text-[#e9e2d6]">
        CYBERGRID: BREACH &amp; SYNC
      </p>
    </div>
  )
}
