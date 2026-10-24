import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { KeyRound, Mail, Send } from 'lucide-react'
import { AuthLayout } from './components/AuthLayout'
import { AuthField } from './components/AuthField'
import { AuthButton } from './components/AuthButton'
import { useAuth } from './context/authContext'

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { requestReset } = useAuth()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await requestReset(email)
      setSent(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo enviar el enlace.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <AuthLayout>
      <form onSubmit={submit} className="flex flex-col gap-4 text-center" data-testid="forgot">
        {/* Escudo con llave (icono del diseño) */}
        <div className="mx-auto grid size-20 place-items-center text-ug-accent" style={{ filter: 'drop-shadow(0 0 12px rgb(143 211 255 / 0.5))' }}>
          <div className="relative grid size-20 place-items-center">
            <span aria-hidden className="absolute left-0 top-1/2 h-0.5 w-5 -translate-x-full bg-ug-accent/60" />
            <span aria-hidden className="absolute right-0 top-1/2 h-0.5 w-5 translate-x-full bg-ug-accent/60" />
            <div className="grid size-20 place-items-center border-2 border-ug-accent/70 bg-ug-accent/10" style={{ clipPath: 'polygon(50% 0, 100% 18%, 100% 62%, 50% 100%, 0 62%, 0 18%)' }}>
              <KeyRound size={34} />
            </div>
          </div>
        </div>

        <div>
          <h1 className="ug-title-shadow text-4xl leading-none tracking-wide">RECUPERAR CONTRASEÑA</h1>
          <p className="mx-auto mt-2 max-w-sm font-terminal text-xl text-ug-muted">
            Introduce tu correo y te enviaremos un enlace para restablecer tu contraseña.
          </p>
        </div>

        {sent ? (
          <p role="status" className="font-terminal text-xl text-ug-green">
            Si el correo existe, te enviamos un enlace. Revisa tu bandeja de entrada.
          </p>
        ) : (
          <>
            <div className="text-left">
              <AuthField id="email" label="Correo electrónico" type="email" icon={Mail} value={email} onChange={setEmail} placeholder="tu@correo.com" autoComplete="email" required />
            </div>
            {error && <p role="alert" className="font-terminal text-lg text-ug-red-hi">{error}</p>}
            <AuthButton icon={Send} loading={loading}>ENVIAR ENLACE</AuthButton>
          </>
        )}

        <div className="mt-1 flex items-center gap-3">
          <span className="h-0.5 flex-1 bg-ug-border" />
          <Link to="/login" className="text-xl text-ug-accent hover:underline" data-testid="back-to-login">VOLVER A INICIAR SESIÓN</Link>
          <span className="h-0.5 flex-1 bg-ug-border" />
        </div>

        <button type="button" onClick={() => navigate('/login')} className="sr-only">volver</button>
      </form>
    </AuthLayout>
  )
}
