import type { ComponentType, ReactNode } from 'react'
import type { LucideProps } from 'lucide-react'

interface AuthButtonProps {
  children: ReactNode
  icon?: ComponentType<LucideProps>
  loading?: boolean
  disabled?: boolean
  type?: 'submit' | 'button'
  onClick?: () => void
}

/** Botón rojo principal del login (ENTRAR / CREAR CUENTA / ENVIAR ENLACE). */
export function AuthButton({ children, icon: Icon, loading, disabled, type = 'submit', onClick }: AuthButtonProps) {
  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-3 border-2 border-ug-red-hi bg-gradient-to-b from-[#d0181f] to-[#8c0d12] px-4 py-3 phone:py-1.5 text-2xl phone:text-xl tracking-wide shadow-[0_0_20px_rgb(255_30_40/0.3),inset_0_0_0_2px_rgb(0_0_0/0.3),0_4px_0_rgb(0_0_0/0.5)] transition hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0.5 disabled:opacity-60 disabled:hover:translate-y-0"
    >
      {Icon && <Icon size="1.5rem" />}
      {loading ? 'CARGANDO…' : children}
    </button>
  )
}
