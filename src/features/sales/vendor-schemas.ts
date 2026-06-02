import { z } from "zod"

export const vendedorSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido (mín. 2 caracteres)").max(150, "Máximo 150 caracteres"),
  telefono: z.string().max(20, "Máximo 20 caracteres").optional().nullable(),
  email: z.string().email("Email inválido").optional().or(z.literal("")).nullable(),
  comisionPorcentaje: z.coerce.number().min(0, "Comisión mínima es 0%").max(100, "Comisión máxima es 100%"),
  activo: z.coerce.boolean().default(true),
})
export type VendedorInput = z.infer<typeof vendedorSchema>

export const vendedorConstraints = {
  nombre: { min: 2, max: 150 },
  telefono: { max: 20 },
  comisionPorcentaje: { min: 0, max: 100 },
} as const
