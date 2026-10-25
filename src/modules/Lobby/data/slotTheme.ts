import type { Team } from '../hooks/useLobbyRoom'

// Equipo 1 = azul, equipo 2 = rojo (igual que sus bases en el mapa).
export const SLOT_THEME: Record<
  Team,
  { border: string; glow: string; accent: string; button: string; pedestal: string; bar: string; tab: string; base: string }
> = {
  1: {
    border: 'border-[#2f6fd6]',
    glow: 'shadow-[0_0_28px_rgb(47_111_214/0.35)]',
    accent: 'text-ug-text',
    button: 'border-[#2f6fd6] bg-[#12305e]/90 hover:bg-[#173d78]',
    pedestal: 'from-[#2f8bff]/60',
    bar: 'bg-[#3d8bff]',
    tab: 'border-[#2f6fd6] bg-[#1d5fc4]',
    base: 'text-[#4d9bff]',
  },
  2: {
    border: 'border-[#c4161c]',
    glow: 'shadow-[0_0_28px_rgb(196_22_28/0.35)]',
    accent: 'text-ug-red-hi',
    button: 'border-ug-red-hi bg-[#6e0b0f]/90 hover:bg-[#8c0d12]',
    pedestal: 'from-[#ff2a2f]/60',
    bar: 'bg-ug-red-hi',
    tab: 'border-ug-red-hi bg-[#b3141a]',
    base: 'text-ug-red-hi',
  },
}

export type SlotTheme = (typeof SLOT_THEME)[1]

/** Todos contra todos: un color por jugador (azul, rojo, verde, amarillo), igual que en la partida. */
export const FFA_THEME: Record<1 | 2 | 3 | 4, SlotTheme> = {
  1: SLOT_THEME[1],
  2: SLOT_THEME[2],
  3: {
    border: 'border-[#2fa84f]',
    glow: 'shadow-[0_0_28px_rgb(47_168_79/0.35)]',
    accent: 'text-[#5fe07f]',
    button: 'border-[#2fa84f] bg-[#124a22]/90 hover:bg-[#175e2b]',
    pedestal: 'from-[#2ee86a]/60',
    bar: 'bg-[#2ee86a]',
    tab: 'border-[#2fa84f] bg-[#1d7a39]',
    base: 'text-[#5fe07f]',
  },
  4: {
    border: 'border-[#d6a12f]',
    glow: 'shadow-[0_0_28px_rgb(214_161_47/0.35)]',
    accent: 'text-[#ffd166]',
    button: 'border-[#d6a12f] bg-[#5e4212]/90 hover:bg-[#785517]',
    pedestal: 'from-[#ffd166]/60',
    bar: 'bg-[#ffd166]',
    tab: 'border-[#d6a12f] bg-[#9a6f14]',
    base: 'text-[#ffd166]',
  },
}

// Funde los bordes de los recortes hasta que lleguen los sprites con transparencia.
export const SPRITE_MASK = 'radial-gradient(ellipse 50% 55% at 50% 50%, #000 60%, transparent 100%)'
