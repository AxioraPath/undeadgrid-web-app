import type { Slot } from '../hooks/useLobbyRoom'

// Jugador 1 = azul, Jugador 2 = rojo (igual que sus bases en el mapa).
export const SLOT_THEME: Record<
  Slot,
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

// Funde los bordes de los recortes hasta que lleguen los sprites con transparencia.
export const SPRITE_MASK = 'radial-gradient(ellipse 50% 55% at 50% 50%, #000 60%, transparent 100%)'
