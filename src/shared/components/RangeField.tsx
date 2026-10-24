interface RangeFieldProps {
  label: string
  /** Current value in `min`..`max` units. */
  value: number
  min: number
  max: number
  step?: number
  /** Text shown at the right of the label (defaults to "value%"). */
  display?: string
  onChange: (value: number) => void
  testId: string
  /** Compact layout for dense side panels. */
  compact?: boolean
}

/** Labelled slider in the pixel style. The visible value is also announced as the input's text. */
export function RangeField({ label, value, min, max, step = 5, display, onChange, testId, compact }: RangeFieldProps) {
  const shown = display ?? `${Math.round(value)}%`
  return (
    <label className={`block ${compact ? 'py-1' : 'py-1.5'}`}>
      <span className="flex items-baseline justify-between gap-2">
        <span className={compact ? 'text-base leading-none' : 'text-xl leading-none phone:text-lg'}>{label}</span>
        <span className="font-terminal text-base leading-none text-ug-accent" data-testid={`${testId}-value`}>
          {shown}
        </span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        data-testid={testId}
        aria-valuetext={shown}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1 block h-5 w-full cursor-pointer accent-ug-accent"
      />
    </label>
  )
}
