import type { ReactNode } from 'react'
import { GameLogo } from '../../../shared/components/GameLogo'
import { APP_VERSION } from '../../../shared/lib/api'

/**
 * Layout de las pantallas de autenticación (login / registro).
 * Fondo con el arte de la escena + panel a la derecha con borde azul neón,
 * fiel al diseño. En móvil el panel ocupa el ancho; en escritorio va a la derecha.
 */
export function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate min-h-dvh overflow-hidden">
      {/* Fondo: atardecer + escena pixel art */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            'radial-gradient(ellipse 70% 55% at 32% 36%, #e8642a 0%, #a8341c 24%, #4a1a1c 52%, #151018 78%, #0b0f17 100%)',
        }}
      />
      <img
        aria-hidden
        src="/assets/home/scene.png"
        alt=""
        className="pixelated absolute left-0 top-0 -z-10 h-full w-full object-cover opacity-90 lg:w-[62%]"
      />
      <div aria-hidden className="absolute inset-0 -z-10 bg-ug-bg/55 lg:bg-gradient-to-r lg:from-transparent lg:via-ug-bg/30 lg:to-ug-bg/80" />

      {/* Logo */}
      <header className="absolute left-4 top-4 z-10 lg:left-8 lg:top-7">
        <GameLogo size="sm" />
      </header>

      {/* Panel de autenticación */}
      <main className="relative z-10 flex min-h-dvh items-center justify-center p-4 lg:justify-end lg:pr-[6%]">
        <section
          className="w-full max-w-md border-2 border-ug-accent/70 bg-gradient-to-b from-[#0e1726]/95 to-[#0a0f18]/95 p-6 sm:p-8"
          style={{
            boxShadow:
              '0 0 0 1px rgb(143 211 255 / 0.25), 0 0 24px rgb(143 211 255 / 0.22), inset 0 0 40px rgb(10 15 24 / 0.6)',
          }}
        >
          {children}
        </section>
      </main>

      <span className="absolute bottom-3 left-4 z-10 font-terminal text-sm text-ug-muted/80 lg:left-8">
        {APP_VERSION.replace('v1.0.0', 'v0.1.0')} &nbsp;|&nbsp; Undead Grid — CyberGrid: Breach &amp; Sync
      </span>
    </div>
  )
}
