/** Custom form validation (replaces native browser validation). Each fn returns an error message or null. */

export const NAME_MAX = 16
export const PASSWORD_MIN = 12
export const PASSWORD_MAX = 100
export const CHAT_MAX = 120
export const ROOM_CODE_LENGTH = 5
// Mirrors the backend alphabet (no I, O, 0, 1).
const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export type FieldErrors<K extends string> = Partial<Record<K, string>>

export function validateEmail(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Escribe tu correo'
  if (!EMAIL_RE.test(v)) return 'Correo no válido'
  return null
}

export function validateLoginPassword(value: string): string | null {
  return value ? null : 'Escribe tu contraseña'
}

export function validateNewPassword(value: string): string | null {
  if (!value) return 'Escribe una contraseña'
  if (value.length < PASSWORD_MIN) return `La contraseña debe tener al menos ${PASSWORD_MIN} caracteres`
  if (value.length > PASSWORD_MAX) return `La contraseña no puede superar ${PASSWORD_MAX} caracteres`
  return null
}

export function validateConfirm(password: string, confirm: string): string | null {
  if (!confirm) return 'Confirma tu contraseña'
  return password === confirm ? null : 'Las contraseñas no coinciden'
}

export function validateDisplayName(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Escribe tu nombre'
  if (v.length > NAME_MAX) return `El nombre no puede superar ${NAME_MAX} caracteres`
  return null
}

export function validateRoomCode(value: string): string | null {
  const v = value.trim().toUpperCase()
  if (!v) return 'Escribe el código de la sala'
  if ([...v].some((c) => !ROOM_CODE_ALPHABET.includes(c))) return 'El código tiene caracteres no válidos'
  if (v.length !== ROOM_CODE_LENGTH) return `El código debe tener ${ROOM_CODE_LENGTH} caracteres`
  return null
}

export function validateChatMessage(value: string): string | null {
  const v = value.trim()
  if (!v) return 'Escribe un mensaje'
  if (v.length > CHAT_MAX) return `Máximo ${CHAT_MAX} caracteres`
  return null
}

/** Focuses the first field (by DOM id) that has an error, following the given order. */
export function focusFirstInvalid(order: string[], errors: Record<string, string | undefined>) {
  const id = order.find((k) => errors[k])
  if (id) document.getElementById(id)?.focus()
}
