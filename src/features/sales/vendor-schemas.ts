import { z } from "zod"

export const vendedorSchema = z.object({
  nombre: z.string().min(2).max(150),
  telefono: z.string().max(20).optional().nullable(),
  email: z.string().email().optional().or(z.literal("")).nullable(),
  comisionPorcentaje: z.coerce.number().min(0).max(100),
  activo: z.coerce.boolean().default(true),
})
export type VendedorInput = z.infer<typeof vendedorSchema>
