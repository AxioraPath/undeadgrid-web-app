export interface Survivor {
  name: string
  role: string
  sprite: string
}

export interface GameMap {
  id: string
  name: string
  description: string
  preview: string
}

export const SURVIVORS: Survivor[] = [
  { name: 'Superviviente 1', role: 'Explorador', sprite: '/assets/lobby/survivor-1.png' },
  { name: 'Superviviente 2', role: 'Mecánica', sprite: '/assets/lobby/survivor-2.png' },
]

export const MAPS: GameMap[] = [
  {
    id: 'ciudad-abandonada',
    name: 'Ciudad Abandonada',
    description: 'Una ciudad en ruinas dividida por una avenida. Recursos limitados y muchas rutas de ataque.',
    preview: '/assets/lobby/map-ciudad.png',
  },
]

export const DIFFICULTIES = ['Estándar', 'Difícil'] as const

export const MATCH_DURATION_MIN = 4

export const CODE_LENGTH = 5
