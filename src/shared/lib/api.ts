// Vacío = mismo dominio. En producción cliente y servidor viven en el mismo Web Service de Render.
export const API_URL = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

export const APP_VERSION = 'v1.0.0'
