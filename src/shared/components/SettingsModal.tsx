import { RotateCcw } from 'lucide-react'
import { PixelModal } from './PixelModal'
import { resetSettings, updateSettings, useSettings, type Settings } from '../lib/settings'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

function Row({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-ug-border py-2 last:border-b-0">
      <div className="min-w-0">
        <p className="text-xl leading-none">{label}</p>
        {hint && <p className="font-terminal text-sm leading-tight text-ug-muted">{hint}</p>}
      </div>
      {children}
    </div>
  )
}

function Toggle({ value, onChange, testId }: { value: boolean; onChange: (v: boolean) => void; testId: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      data-testid={testId}
      className={`relative h-7 w-14 shrink-0 border-2 transition ${value ? 'border-ug-green bg-ug-green/30' : 'border-ug-border bg-black/40'}`}
    >
      <span className={`absolute top-0.5 size-5 transition-[left] ${value ? 'left-7 bg-ug-green' : 'left-0.5 bg-ug-muted'}`} />
    </button>
  )
}

function Choice<T extends string>({
  value,
  options,
  onChange,
  testId,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  testId: string
}) {
  return (
    <div className="flex shrink-0" role="radiogroup" data-testid={testId}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={value === o.value}
          onClick={() => onChange(o.value)}
          className={`-ml-0.5 border-2 px-2 py-0.5 font-terminal text-base first:ml-0 ${
            value === o.value ? 'relative z-10 border-ug-accent bg-ug-accent/20 text-ug-text' : 'border-ug-border bg-black/30 text-ug-muted hover:text-ug-text'
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

/** Ajustes de gráficos y controles. Se guardan en este navegador y aplican al instante. */
export function SettingsModal({ open, onClose }: SettingsModalProps) {
  const s = useSettings()
  const set = <K extends keyof Settings>(key: K) => (value: Settings[K]) => updateSettings({ [key]: value } as Partial<Settings>)

  return (
    <PixelModal open={open} title="Ajustes" onClose={onClose} testId="settings-modal">
      <h3 className="ug-title-shadow mb-1 text-lg tracking-wide text-ug-accent">GRÁFICOS</h3>
      <Row label="Cámara" hint="Qué tan lejos se ve el mapa">
        <Choice
          value={s.zoom}
          onChange={set('zoom')}
          testId="setting-zoom"
          options={[
            { value: 'near', label: 'Cerca' },
            { value: 'normal', label: 'Normal' },
            { value: 'far', label: 'Lejos' },
          ]}
        />
      </Row>
      <Row label="Sacudida de pantalla" hint="Al recibir daño">
        <Toggle value={s.screenShake} onChange={set('screenShake')} testId="setting-shake" />
      </Row>
      <Row label="Sangre y partículas">
        <Toggle value={s.effects} onChange={set('effects')} testId="setting-effects" />
      </Row>
      <Row label="Mostrar FPS y ping">
        <Toggle value={s.showFps} onChange={set('showFps')} testId="setting-fps" />
      </Row>

      <h3 className="ug-title-shadow mt-4 mb-1 text-lg tracking-wide text-ug-accent">CONTROLES</h3>
      <Row label="Controles táctiles" hint="D-pad y botón de acción">
        <Choice
          value={s.touchControls}
          onChange={set('touchControls')}
          testId="setting-touch"
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'on', label: 'Siempre' },
            { value: 'off', label: 'Nunca' },
          ]}
        />
      </Row>
      <Row label="Tamaño táctil">
        <Choice
          value={s.touchSize}
          onChange={set('touchSize')}
          testId="setting-touch-size"
          options={[
            { value: 'normal', label: 'Normal' },
            { value: 'large', label: 'Grande' },
          ]}
        />
      </Row>
      <Row label="Apuntar con el mouse" hint="Clic izquierdo para disparar (solo PC)">
        <Toggle value={s.mouseAim} onChange={set('mouseAim')} testId="setting-mouse-aim" />
      </Row>
      <Row label="Ayuda de teclas" hint="Recuadro de controles en PC">
        <Toggle value={s.keyHelp} onChange={set('keyHelp')} testId="setting-keyhelp" />
      </Row>

      <button
        type="button"
        onClick={resetSettings}
        className="mt-4 flex items-center gap-2 font-terminal text-base text-ug-muted hover:text-ug-text"
        data-testid="settings-reset"
      >
        <RotateCcw size={16} /> Restablecer valores
      </button>
    </PixelModal>
  )
}
