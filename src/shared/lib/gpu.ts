/**
 * ¿El navegador dibuja sin la tarjeta gráfica? Pasa cuando la aceleración por hardware está apagada
 * (WebGL no existe o usa un renderizador por software). En ese caso el juego va lento en cualquier equipo.
 */
export function isSoftwareRendering(): boolean {
  try {
    const gl = document.createElement('canvas').getContext('webgl')
    if (!gl) return true
    const info = gl.getExtension('WEBGL_debug_renderer_info')
    const renderer = info ? String(gl.getParameter(info.UNMASKED_RENDERER_WEBGL)) : ''
    gl.getExtension('WEBGL_lose_context')?.loseContext()
    return /swiftshader|basic render|llvmpipe|software/i.test(renderer)
  } catch {
    return false
  }
}
