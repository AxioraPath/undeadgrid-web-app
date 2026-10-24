// Fondo provisional: atardecer en CSS + escena central recortada del diseño.
// Cuando el diseñador entregue el fondo sin UI, reemplazar por /assets/home/background.png con bg-cover.
const SCENE_MASK =
  'linear-gradient(90deg, transparent 0%, #000 15%, #000 85%, transparent 100%), linear-gradient(180deg, transparent 0%, #000 12%, #000 85%, transparent 100%)'

export function HomeBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 60% 45% at 52% 32%, #e8642a 0%, #a8341c 25%, #4a1a1c 55%, #151018 80%, #0b0f17 100%)',
        }}
      />
      <img
        src="/assets/home/scene.png"
        alt=""
        className="pixelated absolute top-[8%] left-1/2 h-[80%] max-w-none -translate-x-1/2 opacity-90 lg:top-[22.3%] lg:left-[27%] lg:h-auto lg:w-[46%] lg:translate-x-0"
        style={{ maskImage: SCENE_MASK, WebkitMaskImage: SCENE_MASK, maskComposite: 'intersect', WebkitMaskComposite: 'source-in' }}
      />
      {/* viñeta y oscurecido inferior para legibilidad */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_40%,rgb(5_7_12/0.85)_100%)]" />
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-ug-bg/90 to-transparent" />
      <div className="absolute inset-0 bg-ug-bg/45 lg:bg-transparent" />
    </div>
  )
}
