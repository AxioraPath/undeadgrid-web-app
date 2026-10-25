// Recursos del paquete UndeadGrid_Texturas (Disenos/Export) copiados a public/assets/game.
import animations from './art/animaciones.json'
import combatAnimations from './art/animaciones-combate.json'
import heavyAnimations from './art/animaciones-armas-pesadas.json'
import { BUILDINGS } from '../../shared/lib/contracts'

const BASE = '/assets/game/'

export const FRAME = animations.frameWidth
export const COLUMNS = animations.columns
export const PIVOT = animations.pivot

export interface Animation {
  frames: number[]
  fps: number
  loop: boolean
}

/**
 * Hojas de animación: las principales (8 columnas) y las de combate (sniper/cuchillo) y armas pesadas
 * (ametralladora/lanzacohetes), de 4 columnas. Se nombran `explorador`, `explorador-combate`, `explorador-armas-pesadas`.
 */
interface SheetDef {
  file: string
  columns: number
  animations: Record<string, Animation>
}
const SHEETS: Record<string, SheetDef> = {}
for (const [name, sh] of Object.entries(animations.sheets)) SHEETS[name] = { file: sh.file, columns: animations.columns, animations: sh.animations as Record<string, Animation> }
for (const [name, sh] of Object.entries(combatAnimations.sheets))
  SHEETS[`${name}-combate`] = { file: sh.file, columns: combatAnimations.columns, animations: sh.animations as Record<string, Animation> }
for (const [name, sh] of Object.entries(heavyAnimations.sheets))
  SHEETS[`${name}-armas-pesadas`] = { file: sh.file, columns: heavyAnimations.columns, animations: sh.animations as Record<string, Animation> }

export type SheetName = string

export const sheetAnimations = (sheet: SheetName) => SHEETS[sheet].animations
export const sheetColumns = (sheet: SheetName) => SHEETS[sheet]?.columns ?? COLUMNS

const FLOOR_FAMILIES = [
  'pasto', 'tierra', 'grava', 'asfalto', 'metal', 'concreto', 'agua', 'barro', 'madera',
  // Paquete de mapas extra (distrito industrial)
  'mapa-cemento-bunker', 'mapa-hormigon-industrial', 'mapa-rejilla-oxidada', 'mapa-asfalto-claro', 'mapa-caucho-verde',
] as const
/** Calles urbanas: las 16 piezas según con qué lados conectan. */
const URBAN_ROADS = [
  'cruce', 'recta-h', 'recta-v', 'curva-es', 'curva-ne', 'curva-sw', 'curva-wn',
  't-esw', 't-nes', 't-new', 't-nsw', 'fin-e', 'fin-n', 'fin-s', 'fin-w', 'isla',
].map((p) => `via-urbana-${p}`)
const ROADS = [
  'camino-cruce', 'camino-recta-h', 'camino-recta-v',
  'camino-curva-es', 'camino-curva-ne', 'camino-curva-sw', 'camino-curva-wn',
  'camino-t-esw', 'camino-t-nes', 'camino-t-new', 'camino-t-nsw',
  'camino-fin-e', 'camino-fin-n', 'camino-fin-s', 'camino-fin-w',
]
const SHORES = ['agua-orilla-n', 'agua-orilla-e', 'agua-orilla-s', 'agua-orilla-w', 'agua-esquina-ne', 'agua-esquina-es', 'agua-esquina-sw', 'agua-esquina-wn']
const OBJECTS = [
  'arbol-1', 'arbol-2', 'arbol-seco', 'arbusto-1', 'arbusto-seco', 'hierba-alta', 'juncos',
  'roca-1', 'rocas-2', 'escombros-1', 'escombros-2', 'barril-explosivo', 'neumaticos', 'cono',
  'auto-rojo-h', 'auto-rojo-v', 'auto-destruido-h', 'auto-destruido-v', 'furgoneta-h', 'furgoneta-v',
  'contenedor-rojo-h', 'contenedor-rojo-v', 'contenedor-azul-h', 'contenedor-azul-v',
  'barrera-concreto', 'barrera-obra',
  'puente-madera-h', 'puente-madera-v', 'farol-poste',
  'caja-azul', 'caja-roja', 'caja-suministros', 'caja-suministros-abierta',
  'almacen', 'tienda', 'torre-vigilancia', 'torre-agua', 'generador', 'tanque-combustible', 'muro-piedra-h', 'valla-madera',
  'nucleo-azul', 'nucleo-azul-danado', 'nucleo-azul-destruido', 'nucleo-rojo', 'nucleo-rojo-danado', 'nucleo-rojo-destruido',
  'vagon-h', 'via-tren-h', 'hidrante', 'cohete',
  'torreta-abajo', 'torreta-arriba', 'torreta-izquierda', 'torreta-derecha',
  'torreta-abajo-disparo', 'torreta-arriba-disparo', 'torreta-izquierda-disparo', 'torreta-derecha-disparo',
]
const CONSTRUCTION = [
  'sacos-h',
  'pared-madera-h', 'pared-madera-h-danada', 'pared-madera-h-destruida', 'pared-madera-v', 'pared-madera-v-danada', 'pared-madera-v-destruida',
  'pared-metal-h', 'pared-metal-h-danada', 'pared-metal-h-destruida', 'pared-metal-v', 'pared-metal-v-danada', 'pared-metal-v-destruida',
  'trampa-puas', 'valla-metal',
  'valla-madera-v-sana', 'valla-madera-v-destruida', 'valla-madera-v-preview', 'valla-metal-v-sana', 'valla-metal-v-destruida',
]

const FILES: Record<string, string> = {}
for (const f of FLOOR_FAMILIES) for (let i = 1; i <= 4; i++) FILES[`${f}-${i}`] = `suelos/${f}-${i}.png`
for (const n of [...ROADS, ...SHORES, ...URBAN_ROADS]) FILES[n] = `suelos/${n}.png`
for (const n of OBJECTS) FILES[n] = `objetos/${n}.png`
for (const n of CONSTRUCTION) FILES[n] = `construccion/${n}.png`
// Estructuras del mapa: casi todas están en objetos/; las vallas y sacos, en construccion/.
for (const { name } of BUILDINGS) FILES[name] ??= `${name.startsWith('valla-metal-v') || name.startsWith('sacos') ? 'construccion' : 'objetos'}/${name}.png`
for (const [name, sheet] of Object.entries(SHEETS)) FILES[`sheet-${name}`] = sheet.file

export type Sprites = Record<string, HTMLImageElement>

let cache: Promise<Sprites> | null = null

/** Carga todas las imágenes una sola vez por sesión. */
export function loadSprites(): Promise<Sprites> {
  cache ??= Promise.all(
    Object.entries(FILES).map(
      ([name, file]) =>
        new Promise<[string, HTMLImageElement]>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve([name, img])
          img.onerror = () => reject(new Error(`No se pudo cargar ${file}`))
          img.src = BASE + file
        }),
    ),
  ).then((entries) => Object.fromEntries(entries))
  return cache
}

/** Supervivientes con hojas propias; cualquier otro usa las del explorador. */
const SURVIVOR_SHEETS = new Set(['explorador', 'mecanica', 'militar', 'medica', 'obrero'])

/** Superviviente → hoja principal (las de combate y armas pesadas llevan el sufijo `-combate` / `-armas-pesadas`). */
export const survivorSheet = (survivor: string): SheetName => (SURVIVOR_SHEETS.has(survivor) ? survivor : 'explorador')

/** Índice de cuadro para una animación según el tiempo transcurrido (s). */
export function frameAt(anim: Animation, elapsed: number) {
  const tick = Math.floor(Math.max(0, elapsed) * anim.fps)
  return anim.frames[anim.loop ? tick % anim.frames.length : Math.min(tick, anim.frames.length - 1)]
}

/** Dibuja un cuadro de una hoja con el punto de apoyo (pivote) en (feetX, feetY). */
export function drawFrame(ctx: CanvasRenderingContext2D, sheet: HTMLImageElement, frame: number, feetX: number, feetY: number, scale: number, columns = COLUMNS) {
  const sx = (frame % columns) * FRAME
  const sy = Math.floor(frame / columns) * FRAME
  ctx.drawImage(sheet, sx, sy, FRAME, FRAME, feetX - PIVOT.x * scale, feetY - PIVOT.y * scale, FRAME * scale, FRAME * scale)
}
