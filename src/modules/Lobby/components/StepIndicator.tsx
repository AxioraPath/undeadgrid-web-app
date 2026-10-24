const STEPS = ['Sala', 'Personaje', 'Mapa', 'Listo']

interface StepIndicatorProps {
  current: number
  onStep?: (index: number) => void
}

export function StepIndicator({ current, onStep }: StepIndicatorProps) {
  return (
    <ol className="flex items-start" aria-label="Pasos">
      {STEPS.map((label, i) => {
        const active = i === current
        const clickable = onStep && i < current
        return (
          <li key={label} className="flex items-start">
            <button
              type="button"
              disabled={!clickable}
              onClick={() => onStep?.(i)}
              aria-current={active ? 'step' : undefined}
              className="flex w-16 flex-col items-center gap-1 enabled:hover:brightness-125 sm:w-20"
            >
              <span
                className={`grid size-9 place-items-center rounded-full border-2 text-xl sm:size-10 ${
                  active ? 'border-[#3d8bff] bg-[#3d8bff]/20 text-white shadow-[0_0_14px_rgb(61_139_255/0.6)]' : 'border-ug-muted/60 text-ug-muted'
                }`}
              >
                {i + 1}
              </span>
              <span className={`font-terminal text-sm uppercase sm:text-base ${active ? 'text-white' : 'text-ug-muted'}`}>{label}</span>
            </button>
            {i < STEPS.length - 1 && <span className="mt-4 h-0.5 w-6 bg-ug-muted/50 sm:mt-5 sm:w-12 lg:w-16" aria-hidden />}
          </li>
        )
      })}
    </ol>
  )
}
