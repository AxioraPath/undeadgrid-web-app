import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, Lock, Mail, User } from 'lucide-react'
import { AuthLayout } from './components/AuthLayout'
import { AuthField } from './components/AuthField'
import { AuthButton } from './components/AuthButton'
import { useAuth } from './context/authContext'

const MIN_PASSWORD = 12

export function RegisterPage() {
  const navigate = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (password.length < MIN_PASSWORD) {
      setError(`La contraseña debe tener al menos ${MIN_PASSWORD} caracteres.`)
      return
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await register(name, email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo crear la cuenta.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} className="flex flex-col gap-3.5" data-testid="register">
        <div>
          <h1 className="ug-title-shadow text-4xl leading-none tracking-wide">CREAR CUENTA</h1>
          <p className="mt-1 text-2xl text-ug-accent">Prepara tu superviviente.</p>
        </div>

        <AuthField id="name" label="Nombre del jugador" icon={User} value={name} onChange={setName} placeholder="Tu nombre" autoComplete="nickname" required />
        <AuthField id="email" label="Correo electrónico" type="email" icon={Mail} value={email} onChange={setEmail} placeholder="tu@correo.com" autoComplete="email" required />
        <AuthField id="password" label="Contraseña" type="password" icon={Lock} value={password} onChange={setPassword} placeholder="••••••••••••" autoComplete="new-password" required />
        <div>
          <AuthField id="confirm" label="Confirmar contraseña" type="password" icon={Lock} value={confirm} onChange={setConfirm} placeholder="••••••••••••" autoComplete="new-password" required />
          <p className="mt-1.5 font-terminal text-base text-ug-muted">Usa una contraseña de al menos {MIN_PASSWORD} caracteres.</p>
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
