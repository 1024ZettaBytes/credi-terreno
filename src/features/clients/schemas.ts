import { z } from "zod"

export const clienteSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido").max(150),
  telefono: z.string().min(7, "Teléfono inválido").max(20),
  domicilio: z.string().min(3, "Domicilio requerido").max(300),
  email: z.string().email("Email inválido").optional().or(z.literal("")).nullable(),
  curp: z.string().length(18, "CURP debe tener 18 caracteres").optional().or(z.literal("")).nullable(),
  rfc: z.string().min(10).max(13).optional().or(z.literal("")).nullable(),
  notas: z.string().max(1000).optional().nullable(),
})
export type ClienteInput = z.infer<typeof clienteSchema>
