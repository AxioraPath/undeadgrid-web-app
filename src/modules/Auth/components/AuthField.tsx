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
}: AuthFieldProps) {
  const [show, setShow] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && show ? 'text' : type

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xl leading-none tracking-wide">
        {label}
      </label>
      <div className="flex items-center border-2 border-ug-border bg-black/40 focus-within:border-ug-accent">
        <span className="grid size-12 shrink-0 place-items-center text-ug-muted">
          <Icon size={22} />
        </span>
        <input
          id={id}
          type={inputType}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete={autoComplete}
          required={required}
          className="min-w-0 flex-1 bg-transparent py-3 pr-3 font-terminal text-xl text-ug-text outline-none placeholder:text-ug-muted/50"
        />
        {isPassword && (
          <button
            type="button"
            aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            onClick={() => setShow((s) => !s)}
            className="grid size-12 shrink-0 place-items-center text-ug-muted hover:text-ug-accent"
          >
            {show ? <EyeOff size={22} /> : <Eye size={22} />}
          </button>
        )}
      </div>
    </div>
  )
}
