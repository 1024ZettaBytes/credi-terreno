import type { Decimal } from "decimal.js"

// Tipos serializables (Decimal -> string, Date -> string)
export type Serialized<T> = {
  [K in keyof T]: T[K] extends Decimal
    ? string
    : T[K] extends Decimal | null
      ? string | null
      : T[K] extends Date
        ? string
        : T[K] extends Date | null
          ? string | null
          : T[K] extends Array<infer U>
            ? Array<Serialized<U>>
            : T[K] extends object | null
              ? T[K] extends null
                ? Serialized<NonNullable<T[K]>> | null
                : Serialized<T[K]>
              : T[K]
}

export function serialize<T>(value: T): Serialized<T> {
  if (value === null || value === undefined) return value as Serialized<T>
  if (Array.isArray(value)) return value.map(serialize) as Serialized<T>
  if (value instanceof Date) return value.toISOString() as Serialized<T>
  if (typeof value === "object") {
    // Decimal-like (Prisma Decimal)
    const v = value as Record<string, unknown> & { toFixed?: (d: number) => string }
    if (typeof v.toFixed === "function" && "s" in v && "d" in v && "e" in v) {
      return v.toFixed(2) as Serialized<T>
    }
    const out: Record<string, unknown> = {}
    for (const k of Object.keys(value as Record<string, unknown>)) {
      out[k] = serialize((value as Record<string, unknown>)[k])
    }
    return out as Serialized<T>
  }
  return value as Serialized<T>
}
