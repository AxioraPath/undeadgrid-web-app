import { useState, type FormEvent } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Mail, Play } from 'lucide-react'
import { AuthLayout } from './components/AuthLayout'
import { AuthField } from './components/AuthField'
import { AuthButton } from './components/AuthButton'
import { useAuth } from './context/authContext'
import { focusFirstInvalid, validateEmail, validateLoginPassword, type FieldErrors } from '../../shared/lib/validation'

export function LoginPage() {
  const navigate = useNavigate()
  const returnTo = useLocation().state as { from?: string; fromState?: unknown } | null
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [touched, setTouched] = useState({ email: false, password: false })

  const errors: FieldErrors<'email' | 'password'> = {
    email: validateEmail(email) ?? undefined,
    password: validateLoginPassword(password) ?? undefined,
  }
  const shown = (k: 'email' | 'password') => (touched[k] ? errors[k] : undefined)
  const touch = (k: 'email' | 'password') => () => setTouched((t) => ({ ...t, [k]: true }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setTouched({ email: true, password: true })
    if (errors.email || errors.password) {
      focusFirstInvalid(['email', 'password'], errors)
      return
    }
    setLoading(true)
    try {
      await login(email.trim(), password)
      navigate(returnTo?.from ?? '/', { replace: true, state: returnTo?.fromState })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} noValidate className="flex flex-col gap-4 phone:grid phone:grid-cols-2 phone:gap-x-3 phone:gap-y-2" data-testid="login">
        <div className="phone:col-span-2">
          <h1 className="ug-title-shadow text-4xl phone:text-3xl leading-none tracking-wide">INICIAR SESIÓN</h1>
          <p className="mt-1 text-2xl phone:text-xl text-ug-accent">Vuelve a defender tu base.</p>
        </div>

        <AuthField id="email" label="Correo electrónico" type="email" icon={Mail} value={email} onChange={setEmail} placeholder="tu@correo.com" autoComplete="email" required error={shown('email')} onBlur={touch('email')} />
        <AuthField id="password" label="Contraseña" type="password" icon={Lock} value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" required error={shown('password')} onBlur={touch('password')} />

        <div className="flex items-center font-terminal text-lg phone:text-base">
          <label className="flex cursor-pointer items-center gap-2 text-ug-text">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-5 accent-ug-red-hi"
            />
            Recordarme
          </label>
        </div>

        {error && <p role="alert" className="font-terminal text-lg text-ug-red-hi phone:col-span-2">{error}</p>}

        <AuthButton icon={Play} loading={loading}>ENTRAR</AuthButton>

        <div className="mt-1 phone:mt-0 text-center font-terminal text-lg phone:text-base text-ug-muted">
          <div className="mb-2 phone:mb-0.5 flex items-center gap-3">
            <span className="h-0.5 flex-1 bg-ug-border" /> ¿Aún no tienes cuenta? <span className="h-0.5 flex-1 bg-ug-border" />
          </div>
          <Link to="/registro" className="text-2xl phone:text-xl text-ug-accent hover:underline" data-testid="go-register">CREAR CUENTA</Link>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="ug-panel mt-1 phone:mt-0 flex items-center justify-center gap-2 px-4 py-2 phone:py-1 text-xl hover:border-ug-border-hi"
        >
          <ArrowLeft size="1.25rem" /> VOLVER
        </button>
      </form>
    </AuthLayout>
  )
}
