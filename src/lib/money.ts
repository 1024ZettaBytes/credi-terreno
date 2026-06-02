import { Decimal } from "decimal.js"

Decimal.set({ precision: 20, rounding: Decimal.ROUND_HALF_UP })

export { Decimal }

export function toDecimal(v: string | number | Decimal | null | undefined): Decimal {
  if (v === null || v === undefined || v === "") return new Decimal(0)
  return new Decimal(v.toString())
}

export function decToString(v: Decimal | string | number | null | undefined): string {
  if (v === null || v === undefined) return "0"
  return new Decimal(v.toString()).toFixed(2)
}

export function formatearMoneda(v: Decimal | string | number | null | undefined): string {
  const num = toDecimal(v).toNumber()
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num)
}

export function formatearFecha(d: Date | string | null | undefined): string {
  if (!d) return "—"
  let date: Date
  if (typeof d === "string") {
    // YYYY-MM-DD → mediodía UTC para evitar salto de día por timezone
    date = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00Z") : new Date(d)
  } else {
    date = d
  }
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}

export function formatearFechaCorta(d: Date | string | null | undefined): string {
  if (!d) return "—"
  let date: Date
  if (typeof d === "string") {
    date = /^\d{4}-\d{2}-\d{2}$/.test(d) ? new Date(d + "T12:00:00Z") : new Date(d)
  } else {
    date = d
  }
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  }).format(date)
}
