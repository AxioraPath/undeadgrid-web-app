import { useState, type ComponentType } from 'react'
import { Eye, EyeOff, type LucideProps } from 'lucide-react'

interface AuthFieldProps {
  id: string
  label: string
  type?: 'text' | 'email' | 'password'
  value: string
  onChange: (v: string) => void
  placeholder?: string
  icon: ComponentType<LucideProps>
  autoComplete?: string
  required?: boolean
  error?: string | null
  onBlur?: () => void
}

/**
 * Campo de formulario del login: etiqueta arriba, icono a la izquierda y, para
 * contraseñas, botón de mostrar/ocultar. Estilo pixel/cyber del diseño.
 */
export function AuthField({
  id,
  label,
  type = 'text',
  value,
  onChange,
  placeholder,
  icon: Icon,
  autoComplete,
  required,
  error,
  onBlur,
}: AuthFieldProps) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && show ? 'text' : type

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 phone:mb-1 block text-xl phone:text-lg leading-none tracking-wide">
        {label}
      </label>
      <div className={`flex items-center border-2 bg-black/40 focus-within:border-ug-accent ${error ? 'border-ug-red-hi' : 'border-ug-border'}`}>
        <span className="grid size-12 phone:size-9 shrink-0 place-items-center text-ug-muted">
          <Icon size="1.375rem" />
        </span>
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          onBlur={onBlur}
          aria-required={required || undefined}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="min-w-0 flex-1 bg-transparent py-3 phone:py-1.5 pr-3 font-terminal text-xl phone:text-lg text-ug-text outline-none placeholder:text-ug-muted/50"
        />
        {isPassword && (
          <button
            type="button"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setShow((s) => !s)}
            className="grid size-12 phone:size-9 shrink-0 place-items-center text-ug-muted hover:text-ug-accent"
          >
            {show ? <EyeOff size="1.375rem" /> : <Eye size="1.375rem" />}
          </button>
        )}
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 font-terminal text-lg phone:text-base leading-tight text-ug-red-hi">
          {error}
        </p>
      )}
    </div>
  )
}
