export type StatKey = 'vida' | 'velocidad' | 'dano' | 'capacidad'

export interface Skill {
  icon: 'run' | 'aim' | 'pack' | 'wrench' | 'gear' | 'box'
  title: string
  text: string
}

export interface Survivor {
  id: string
  name: string
  tagline: string
  description: string
  portrait: string
  locked: boolean
  // Solo los desbloqueados tienen sprite, stats y detalles.
  sprite?: string
  preview?: string
  stats?: Record<StatKey, number>
  skills?: Skill[]
  playstyle?: string
}

export interface GameMap {
  id: string
  name: string
  description: string
  preview: string
}

export const STAT_LABELS: Record<StatKey, string> = {
  vida: 'Vida',
  velocidad: 'Velocidad',
  dano: 'Daño',
  capacidad: 'Capacidad',
}

export const STAT_MAX = 6

const P = '/assets/survivors/'

// Valores de stats provisionales (solo visuales) hasta que el equipo defina diferencias por personaje.
export const SURVIVORS: Survivor[] = [
  {
    id: 'explorador',
    name: 'Explorador',
    tagline: 'Equilibrado y versátil',
    description: 'Un superviviente preparado para cualquier situación. Buena movilidad y daño estable.',
    portrait: `${P}explorador.png`,
    sprite: `${P}explorador-sprite.png`,
    preview: `${P}explorador-preview.png`,
    locked: false,
    stats: { vida: 3, velocidad: 4, dano: 3, capacidad: 3 },
    skills: [
      { icon: 'run', title: 'Movilidad', text: 'Se mueve rápido en el mapa.' },
      { icon: 'aim', title: 'Precisión', text: 'Mayor precisión con armas.' },
      { icon: 'pack', title: 'Capacidad', text: 'Puede llevar más munición.' },
    ],
    playstyle: 'Sal de la base a cazar zombis para juntar madera y metal, y presiona el núcleo rival.',
  },
  {
    id: 'mecanica',
    name: 'Mecánica',
    tagline: 'Construye, repara, sobrevive',
    description: 'Especialista en construcción y reparación. Aprovecha mejor los recursos de la caja.',
    portrait: `${P}mecanica.png`,
    sprite: `${P}mecanica-sprite.png`,
    preview: `${P}mecanica-preview.png`,
    locked: false,
    stats: { vida: 3, velocidad: 3, dano: 2, capacidad: 5 },
    skills: [
      { icon: 'wrench', title: 'Construcción', text: 'Construye y repara más rápido.' },
      { icon: 'gear', title: 'Eficiencia', text: 'Usa menos recursos en reparaciones.' },
      { icon: 'box', title: 'Gestión', text: 'Mayor capacidad de materiales.' },
    ],
    playstyle: 'Fortifica tu base 8 × 8 con paredes reforzadas y trampas, y aguanta las oleadas.',
  },
  { id: 'soldado', name: 'Soldado', tagline: 'Próximamente', description: '', portrait: `${P}soldado.png`, locked: true },
  { id: 'ingeniero', name: 'Ingeniero', tagline: 'Próximamente', description: '', portrait: `${P}ingeniero.png`, locked: true },
  { id: 'encapuchada', name: 'Encapuchada', tagline: 'Próximamente', description: '', portrait: `${P}encapuchada.png`, locked: true },
  { id: 'rubia', name: 'Rubia', tagline: 'Próximamente', description: '', portrait: `${P}rubia.png`, locked: true },
  { id: 'punk', name: 'Punk', tagline: 'Próximamente', description: '', portrait: `${P}punk.png`, locked: true },
  { id: 'sombra', name: 'Sombra', tagline: 'Próximamente', description: '', portrait: `${P}sombra.png`, locked: true },
]

export const UNLOCKED_SURVIVORS = SURVIVORS.filter((s) => !s.locked)

export const getSurvivor = (id: string) => SURVIVORS.find((s) => s.id === id) ?? UNLOCKED_SURVIVORS[0]

// Armas iniciales iguales para todos (sección 5 del documento).
export const STARTING_WEAPONS = [
  { name: 'Pistola', detail: '15 de daño · 3 disparos/s · munición infinita' },
  { name: 'Escopeta', detail: '10 × 5 perdigones · 1 disparo/s · 12 cartuchos en la caja' },
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

export function randomRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: CODE_LENGTH }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}
