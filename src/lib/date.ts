/**
 * Utilidades para manejar fechas "date-only" (sin hora) de forma segura
 * respecto a zonas horarias.
 *
 * Problema: `new Date("2025-12-15")` se interpreta como medianoche UTC,
 * que en México (UTC-6) se muestra como 14 de diciembre.
 *
 * Solución: Normalizar todas las fechas "solo-fecha" a mediodía UTC (12:00:00Z),
 * que nunca cruza el límite de día sin importar la zona horaria.
 */

/**
 * Convierte un string YYYY-MM-DD o Date a un Date normalizado a mediodía UTC.
 * Esto evita que la fecha "salte" al día anterior/siguiente por diferencias de timezone.
 */
export function parseLocalDate(d: Date | string): Date {
  if (typeof d === "string") {
    // YYYY-MM-DD → mediodía UTC
    if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
      return new Date(d + "T12:00:00Z")
    }
    // ISO string u otro formato → extraer fecha y normalizar a mediodía UTC
    const parsed = new Date(d)
    return new Date(
      Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate(), 12, 0, 0),
    )
  }
  // Date → normalizar a mediodía UTC
  return new Date(
    Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0),
  )
}

/**
 * Formatea un Date como string YYYY-MM-DD usando métodos UTC.
 */
export function formatDateISO(d: Date): string {
  const y = d.getUTCFullYear()
  const m = String(d.getUTCMonth() + 1).padStart(2, "0")
  const day = String(d.getUTCDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}

/**
 * Retorna la fecha de hoy como YYYY-MM-DD en la zona horaria local del usuario.
 */
export function todayLocal(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  return `${y}-${m}-${day}`
}
