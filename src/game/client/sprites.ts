// Sprites recortados de las hojas del diseñador con tools/extract_sprites.py.

export const SPRITE_NAMES = [
  'ground-grass', 'ground-grass-dense', 'ground-dirt', 'ground-mud', 'ground-gravel',
  'ground-asphalt', 'ground-asphalt-cracked', 'ground-asphalt-grass', 'ground-tiles-dark', 'ground-pavers', 'ground-water',
  'tree', 'tree-autumn', 'tree-dead', 'bush', 'bush-dry', 'grass-tuft', 'rock', 'rocks', 'debris', 'bricks',
  'car-red-v', 'car-wreck-v', 'van-v', 'truck-v',
  'container-red-h', 'container-red-v', 'container-blue-h', 'container-blue-v',
  'barrel', 'tires', 'cone',
  'wall-wood-h', 'wall-wood-v', 'wall-metal-h', 'wall-metal-v', 'wall-wood-broken', 'wall-metal-broken', 'trap',
  'crate-blue', 'crate-red',
  'core-blue', 'core-red', 'core-blue-damaged', 'core-red-damaged', 'core-blue-destroyed', 'core-red-destroyed',
  'p1-front', 'p1-back', 'p1-side', 'p1-side-shotgun', 'p1-dead',
  'p2-front', 'p2-back', 'p2-side', 'p2-side-shotgun', 'p2-dead',
  'zombie-normal-0', 'zombie-normal-1', 'zombie-normal-2', 'zombie-normal-3',
  'zombie-fast-0', 'zombie-fast-1', 'zombie-fast-2', 'zombie-fast-3',
  'zombie-normal-dead',
] as const

export type SpriteName = (typeof SPRITE_NAMES)[number]
export type Sprites = Record<SpriteName, HTMLImageElement>

let cache: Promise<Sprites> | null = null

/** Carga todas las imágenes una sola vez por sesión. */
export function loadSprites(): Promise<Sprites> {
  cache ??= Promise.all(
    SPRITE_NAMES.map(
      (name) =>
        new Promise<[SpriteName, HTMLImageElement]>((resolve, reject) => {
          const img = new Image()
          img.onload = () => resolve([name, img])
          img.onerror = () => reject(new Error(`No se pudo cargar el sprite ${name}`))
          img.src = `/assets/sprites/${name}.png`
        }),
    ),
  ).then((entries) => Object.fromEntries(entries) as Sprites)
  return cache
}

/** Superviviente → prefijo de sus sprites. */
export const survivorSprite = (survivor: string) => (survivor === 'mecanica' ? 'p2' : 'p1')
