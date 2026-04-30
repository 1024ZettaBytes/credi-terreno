import { z } from "zod"

export const manzanaSchema = z.object({
  nombre: z.string().min(1, "Nombre requerido").max(50),
  descripcion: z.string().max(500).optional().nullable(),
})
export type ManzanaInput = z.infer<typeof manzanaSchema>

export const loteSchema = z.object({
  manzanaId: z.string().min(1, "Manzana requerida"),
  numLote: z.string().min(1, "Número de lote requerido").max(20),
  superficieM2: z.coerce.number().positive("Superficie debe ser > 0"),
  precioM2: z.coerce.number().positive("Precio por m² debe ser > 0"),
  notas: z.string().max(500).optional().nullable(),
})
export type LoteInput = z.infer<typeof loteSchema>
