import { z } from "zod"

export const manzanaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(50, "Máximo 50 caracteres"),
  descripcion: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
})
export type ManzanaInput = z.infer<typeof manzanaSchema>

export const loteSchema = z.object({
  manzanaId: z.string().min(1, "Manzana requerida"),
  numLote: z.string().min(1, "Número de lote requerido").max(20, "Máximo 20 caracteres"),
  superficieM2: z.coerce.number().positive("Superficie debe ser mayor a 0"),
  precioM2: z.coerce.number().positive("Precio por m² debe ser mayor a 0"),
  notas: z.string().max(500, "Máximo 500 caracteres").optional().nullable(),
})
export type LoteInput = z.infer<typeof loteSchema>

export const manzanaConstraints = {
  nombre: { min: 1, max: 50 },
  descripcion: { max: 500 },
} as const

export const loteConstraints = {
  numLote: { min: 1, max: 20 },
  notas: { max: 500 },
} as const
