const ROWS = [
  ['WASD', 'Moverse'],
  ['Espacio', 'En tu base: construir · Fuera: disparar'],
  ['1 – 2', 'Pistola / Escopeta'],
  ['3', 'Usar botiquín'],
  ['4 – 5', 'Elegir pared / trampa'],
  ['Caja', 'Párate encima para tomar recursos'],
]

const MOUSE_ROWS = [
  ['Mouse', 'Apuntar'],
  ['Clic izq.', 'Disparar (mantén para ráfaga)'],
]

export function ControlsHelp({ mouseAim = false }: { mouseAim?: boolean }) {
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
