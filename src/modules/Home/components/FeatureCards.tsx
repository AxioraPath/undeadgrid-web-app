const FEATURES = [
  {
    img: '/assets/home/card-build.png',
    title: 'CONSTRUYE',
    text: 'Usa los recursos de tu caja para crear y mejorar tu base.',
  },
  {
    img: '/assets/home/card-survive.png',
    title: 'SOBREVIVE',
    text: 'Enfrenta oleadas de zombis cada vez más fuertes.',
  },
  {
    img: '/assets/home/card-destroy.png',
    title: 'DESTRUYE',
    text: 'Elimina al enemigo y destruye su núcleo para ganar.',
  },
]

export function FeatureCards() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 phone:gap-2">
      {FEATURES.map((f) => (
        <article key={f.title} className="ug-panel flex items-center gap-3 p-3 phone:gap-2 phone:p-1.5">
          <img src={f.img} alt="" className="pixelated h-20 w-24 shrink-0 object-contain phone:h-10 phone:w-12 xl:w-32" />
          <div className="min-w-0">
            <h3 className="ug-title-shadow text-2xl leading-none">{f.title}</h3>
            <p className="mt-1 font-terminal text-lg leading-tight phone:mt-0.5 phone:text-base phone:leading-[1.05] text-ug-muted">{f.text}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
