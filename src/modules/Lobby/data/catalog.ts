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
  biome: string
  description: string
  preview: string
  /** false = todavía no se puede jugar (se muestra en gris como "Próximamente"). */
  available: boolean
}

export const STAT_LABELS: Record<StatKey, string> = {
  vida: 'Vida',
  velocidad: 'Velocidad',
  dano: 'Daño',
  capacidad: 'Capacidad',
}

export const STAT_MAX = 6

const P = '/assets/survivors/'

// Las habilidades describen las ventajas reales del servidor (SURVIVOR_PERKS en service-undeadgrid).
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
      { icon: 'run', title: 'Movilidad', text: 'Camina 15 % más rápido.' },
      { icon: 'pack', title: 'Munición', text: 'Empieza con 8 cartuchos extra.' },
      { icon: 'aim', title: 'Versátil', text: 'Sirve para atacar y defender.' },
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
      { icon: 'wrench', title: 'Reparación', text: 'Sus reparaciones curan el doble.' },
      { icon: 'box', title: 'Madera', text: 'Empieza con 12 de madera extra.' },
      { icon: 'gear', title: 'Metal', text: 'Empieza con 4 de metal extra.' },
    ],
    playstyle: 'Fortifica tu base 8 × 8 con paredes reforzadas y trampas, y aguanta las oleadas.',
  },
  {
    id: 'militar',
    name: 'Militar',
    tagline: 'Potencia de fuego',
    description: 'Veterano entrenado para el combate. Cada disparo pega más fuerte.',
    portrait: `${P}militar.png`,
    sprite: `${P}militar-sprite.png`,
    preview: `${P}militar-preview.png`,
    locked: false,
    stats: { vida: 3, velocidad: 3, dano: 5, capacidad: 3 },
    skills: [
      { icon: 'aim', title: 'Daño', text: '15 % más daño con todas sus armas.' },
      { icon: 'pack', title: 'Cuchillo', text: 'Su cuchillo también pega 15 % más.' },
      { icon: 'run', title: 'Asalto', text: 'Ideal para disputar la caja del centro.' },
    ],
    playstyle: 'Ve por la caja de armamento y presiona al rival con el arma pesada.',
  },
  {
    id: 'medica',
    name: 'Médica',
    tagline: 'Aguanta más que nadie',
    description: 'Sabe mantenerse en pie. Empieza con más botiquines y los aprovecha mejor.',
    portrait: `${P}medica.png`,
    sprite: `${P}medica-sprite.png`,
    preview: `${P}medica-preview.png`,
    locked: false,
    stats: { vida: 5, velocidad: 3, dano: 3, capacidad: 3 },
    skills: [
      { icon: 'box', title: 'Botiquines', text: 'Empieza con 2 botiquines extra.' },
      { icon: 'gear', title: 'Curación', text: 'Cada botiquín cura 50 % más.' },
      { icon: 'run', title: 'Resistencia', text: 'Aguanta peleas largas fuera de la base.' },
    ],
    playstyle: 'Sal a pelear sin miedo: cúrate entre oleadas y vuelve al frente.',
  },
  {
    id: 'obrero',
    name: 'Obrero',
    tagline: 'Muros que no caen',
    description: 'Constructor de oficio. Sus paredes resisten mucho más.',
    portrait: `${P}obrero.png`,
    sprite: `${P}obrero-sprite.png`,
    preview: `${P}obrero-preview.png`,
    locked: false,
    stats: { vida: 4, velocidad: 3, dano: 2, capacidad: 4 },
    skills: [
      { icon: 'wrench', title: 'Paredes', text: 'Sus paredes aguantan 50 % más.' },
      { icon: 'box', title: 'Madera', text: 'Empieza con 8 de madera extra.' },
      { icon: 'gear', title: 'Refuerzo', text: 'Las paredes reforzadas también aguantan más.' },
    ],
    playstyle: 'Encierra tu núcleo con paredes reforzadas y deja que los zombis choquen.',
  },
]

export const UNLOCKED_SURVIVORS = SURVIVORS.filter((s) => !s.locked)

export const getSurvivor = (id: string) => SURVIVORS.find((s) => s.id === id) ?? UNLOCKED_SURVIVORS[0]

// Armas iniciales iguales para todos (sección 5 del documento).
export const STARTING_WEAPONS = [
  { name: 'Pistola', detail: '15 de daño · 3 disparos/s · munición infinita' },
  { name: 'Escopeta', detail: '10 × 5 perdigones · 1 disparo/s · 12 cartuchos en la caja' },
  { name: 'Cuchillo', detail: 'Automático con un zombi pegado · 25 de daño · no gasta munición' },
  { name: 'Caja del centro', detail: 'Ametralladora (oleada 1) · Sniper (oleada 2) · Lanzacohetes (horda)' },
]

export const MAPS: GameMap[] = [
  {
    id: 'ciudad-abandonada',
    name: 'Ciudad Abandonada',
    biome: 'Urbano',
    description: 'Una ciudad en ruinas con un estanque en el centro. Puentes estrechos y autos abandonados como cobertura.',
    preview: '/assets/maps/ciudad.jpg',
    available: true,
  },
  {
    id: 'desierto-ferroviario',
    name: 'Desierto Ferroviario',
    biome: 'Desierto',
    description: 'Una estación olvidada entre cañones y oasis. Las vías dividen el mapa y la torre central controla el paso.',
    preview: '/assets/maps/desierto.jpg',
    available: false,
  },
  {
    id: 'distrito-industrial',
    name: 'Distrito Industrial',
    biome: 'Industrial',
    description: 'Fábricas, canales y un tren detenido. Un helicóptero derribado y callejones para emboscar al rival.',
    preview: '/assets/maps/industrial.jpg',
    available: true,
  },
]

export const DIFFICULTIES = ['Estándar', 'Difícil'] as const

export const MATCH_DURATION_MIN = 4

export const CODE_LENGTH = 5

/** Qué cambia cada dificultad (igual que el servidor). */
export const DIFFICULTY_INFO: Record<(typeof DIFFICULTIES)[number], string> = {
  'Estándar': 'Oleadas normales de zombis.',
  'Difícil': '50 % más zombis, con más vida y daño.',
}
