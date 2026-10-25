const ROWS = [
  ['WASD', 'Moverse'],
  ['Espacio', 'En tu base: construir enfrente · Fuera: disparar'],
  ['1 2 6', 'Pistola / Escopeta / Arma pesada'],
  ['3', 'Usar botiquín'],
  ['4 5 7', 'Pared / trampa / torreta'],
  ['Centro', 'Quédate 5 s junto a la caja de armamento'],
  ['Cuchillo', 'Automático con un zombi pegado al atacar'],
  ['Caja', 'Párate encima para tomar recursos'],
]

const MOUSE_ROWS = [
  ['Mouse', 'Apuntar'],
  ['Clic izq.', 'Disparar (también en tu base)'],
  ['Clic der.', 'Construir en la casilla'],
]

export function ControlsHelp({ mouseAim = false, touch = false }: { mouseAim?: boolean; touch?: boolean }) {
  if (touch) {
    return (
      <p className="ug-panel hidden px-2 py-1 text-center font-terminal text-sm leading-tight text-ug-muted [@media(min-height:600px)]:block" data-testid="controls-help">
        <span>Joystick izquierdo: mover</span>
        <span className="mx-2 text-ug-border-hi">|</span>
        <span>Joystick derecho: apuntar y disparar</span>
        <span className="mx-2 text-ug-border-hi">|</span>
        <span>Pared, trampa o torreta: toca tu base</span>
      </p>
    )
  }
  const rows = mouseAim ? [ROWS[0], ...MOUSE_ROWS, ...ROWS.slice(1)] : ROWS
  return (
    <div className="ug-panel hidden max-w-72 space-y-1 p-2 lg:block short:hidden" data-testid="controls-help">
      {rows.map(([key, text]) => (
        <p key={key} className="flex items-center gap-2 font-terminal text-sm leading-tight">
          <kbd className="min-w-14 border-2 border-ug-border bg-ug-panel-2 px-1 text-center font-pixel text-base leading-tight">{key}</kbd>
          <span className="text-ug-muted">{text}</span>
        </p>
      ))}
    </div>
  )
}
