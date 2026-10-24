import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Mail, Play } from 'lucide-react'
import { AuthLayout } from './components/AuthLayout'
import { AuthField } from './components/AuthField'
import { AuthButton } from './components/AuthButton'
import { useAuth } from './context/authContext'

export function LoginPage() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await login(email, password, remember)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} className="flex flex-col gap-4" data-testid="login">
        <div>
          <h1 className="ug-title-shadow text-4xl leading-none tracking-wide">INICIAR SESIÓN</h1>
          <p className="mt-1 text-2xl text-ug-accent">Vuelve a defender tu base.</p>
        </div>

        <AuthField id="email" label="Correo electrónico" type="email" icon={Mail} value={email} onChange={setEmail} placeholder="tu@correo.com" autoComplete="email" required />
        <AuthField id="password" label="Contraseña" type="password" icon={Lock} value={password} onChange={setPassword} placeholder="••••••••" autoComplete="current-password" required />

        <div className="flex items-center justify-between font-terminal text-lg">
          <label className="flex cursor-pointer items-center gap-2 text-ug-text">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-5 accent-ug-red-hi"
            />
            Recordarme
          </label>
          <Link to="/recuperar" className="text-ug-accent hover:underline">¿Olvidaste tu contraseña?</Link>
        </div>

        {error && <p role="alert" className="font-terminal text-lg text-ug-red-hi">{error}</p>}

        <AuthButton icon={Play} loading={loading}>ENTRAR</AuthButton>

        <div className="mt-1 text-center font-terminal text-lg text-ug-muted">
          <div className="mb-2 flex items-center gap-3">
            <span className="h-0.5 flex-1 bg-ug-border" /> ¿Aún no tienes cuenta? <span className="h-0.5 flex-1 bg-ug-border" />
          </div>
          <Link to="/registro" className="text-2xl text-ug-accent hover:underline" data-testid="go-register">CREAR CUENTA</Link>
        </div>

        <button
          type="button"
          onClick={() => navigate('/')}
          className="ug-panel mt-1 flex items-center justify-center gap-2 px-4 py-2 text-xl hover:border-ug-border-hi"
        >
          <ArrowLeft size={20} /> VOLVER
        </button>
      </form>
    </AuthLayout>
  )
}
