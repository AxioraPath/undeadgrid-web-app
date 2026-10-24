import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Mail, User } from 'lucide-react'
import { AuthLayout } from './components/AuthLayout'
import { AuthField } from './components/AuthField'
import { AuthButton } from './components/AuthButton'
import { useAuth } from './context/authContext'
import {
  PASSWORD_MIN,
  focusFirstInvalid,
  validateConfirm,
  validateDisplayName,
  validateEmail,
  validateNewPassword,
  type FieldErrors,
} from '../../shared/lib/validation'

type Key = 'name' | 'email' | 'password' | 'confirm'
const ORDER: Key[] = ['name', 'email', 'password', 'confirm']

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const [touched, setTouched] = useState<Record<Key, boolean>>({ name: false, email: false, password: false, confirm: false })

  const errors: FieldErrors<Key> = {
    name: validateDisplayName(name) ?? undefined,
    email: validateEmail(email) ?? undefined,
    password: validateNewPassword(password) ?? undefined,
    confirm: validateConfirm(password, confirm) ?? undefined,
  }
  const shown = (k: Key) => (touched[k] ? errors[k] : undefined)
  const touch = (k: Key) => () => setTouched((t) => ({ ...t, [k]: true }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setTouched({ name: true, email: true, password: true, confirm: true })
    if (ORDER.some((k) => errors[k])) {
      focusFirstInvalid(ORDER, errors)
      return
    }
    setLoading(true)
    try {
      await register(name.trim(), email.trim(), password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} noValidate className="flex flex-col gap-3.5" data-testid="register">
        <div>
          <h1 className="ug-title-shadow text-4xl leading-none tracking-wide">CREAR CUENTA</h1>
          <p className="mt-1 text-2xl text-ug-accent">Prepara tu superviviente.</p>
        </div>

        <AuthField id="name" label="Nombre del jugador" icon={User} value={name} onChange={setName} placeholder="Tu nombre" autoComplete="nickname" required error={shown('name')} onBlur={touch('name')} />
        <AuthField id="email" label="Correo electrónico" type="email" icon={Mail} value={email} onChange={setEmail} placeholder="tu@correo.com" autoComplete="email" required error={shown('email')} onBlur={touch('email')} />
        <AuthField id="password" label="Contraseña" type="password" icon={Lock} value={password} onChange={setPassword} placeholder="••••••••••••" autoComplete="new-password" required error={shown('password')} onBlur={touch('password')} />
        <div>
          <AuthField id="confirm" label="Confirmar contraseña" type="password" icon={Lock} value={confirm} onChange={setConfirm} placeholder="••••••••••••" autoComplete="new-password" required error={shown('confirm')} onBlur={touch('confirm')} />
          <p className="mt-1.5 font-terminal text-base text-ug-muted">Usa una contraseña de al menos {PASSWORD_MIN} caracteres.</p>
        </div>

        {error && <p role="alert" className="font-terminal text-lg text-ug-red-hi">{error}</p>}

        <AuthButton loading={loading}>CREAR CUENTA</AuthButton>

        <p className="text-center font-terminal text-lg text-ug-muted">
          ¿Ya tienes cuenta? <Link to="/login" className="text-ug-accent hover:underline" data-testid="go-login">INICIAR SESIÓN</Link>
        </p>

        <button
          type="button"
          onClick={() => navigate('/login')}
          className="ug-panel flex items-center justify-center gap-2 px-4 py-2 text-xl hover:border-ug-border-hi"
        >
          <ArrowLeft size={20} /> VOLVER
        </button>
      </form>
    </AuthLayout>
  )
}
