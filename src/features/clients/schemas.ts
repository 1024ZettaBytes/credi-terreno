import { z } from "zod"

export const clienteSchema = z.object({
  nombre: z.string().min(2, "Nombre requerido (mín. 2 caracteres)").max(150, "Máximo 150 caracteres"),
  telefono: z.string().min(7, "Teléfono inválido (mín. 7 dígitos)").max(20, "Máximo 20 caracteres"),
  domicilio: z.string().min(3, "Domicilio requerido (mín. 3 caracteres)").max(300, "Máximo 300 caracteres"),
  email: z.string().email("Email inválido").optional().or(z.literal("")).nullable(),
  curp: z.string().length(18, "CURP debe tener exactamente 18 caracteres").optional().or(z.literal("")).nullable(),
  rfc: z.string().min(10, "RFC debe tener al menos 10 caracteres").max(13, "RFC no puede tener más de 13 caracteres").optional().or(z.literal("")).nullable(),
  notas: z.string().max(1000, "Máximo 1000 caracteres").optional().nullable(),
})
export type ClienteInput = z.infer<typeof clienteSchema>

/** Constraints for use in UI hints */
export const clienteConstraints = {
  nombre: { min: 2, max: 150 },
  telefono: { min: 7, max: 20 },
  domicilio: { min: 3, max: 300 },
  curp: { exact: 18 },
  rfc: { min: 10, max: 13 },
  notas: { max: 1000 },
} as const
